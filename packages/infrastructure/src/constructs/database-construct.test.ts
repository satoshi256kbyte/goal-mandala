import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseConstruct } from './database-construct';
import { EnvironmentConfig } from '../config/environment';

describe('DatabaseConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let config: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    // VPCを作成
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // テスト用設定
    config = {
      stackPrefix: 'goal-mandala-test',
      region: 'ap-northeast-1',
      database: {
        instanceClass: 'serverless',
        minCapacity: 0.5,
        maxCapacity: 1,
        databaseName: 'test_db',
        backupRetentionDays: 7,
        deletionProtection: false,
      },
      lambda: {
        timeout: 30,
        memorySize: 256,
      },
      frontend: {},
      tags: {
        Environment: 'test',
        Project: 'GoalMandala',
      },
    };
  });

  it('DatabaseConstructが正しく作成される', () => {
    // DatabaseConstructを作成
    const databaseConstruct = new DatabaseConstruct(stack, 'Database', {
      vpc,
      config,
    });

    // テンプレートを生成
    const template = Template.fromStack(stack);

    // Aurora PostgreSQLクラスターが作成されることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      EngineVersion: '15.4',
      DatabaseName: 'test_db',
      ServerlessV2ScalingConfiguration: {
        MinCapacity: 0.5,
        MaxCapacity: 1,
      },
      StorageEncrypted: true,
      DeletionProtection: false,
    });

    // Secrets Managerシークレットが作成されることを確認
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Description: 'Aurora PostgreSQL database credentials',
    });

    // セキュリティグループが作成されることを確認
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Aurora PostgreSQL database',
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Lambda functions accessing database',
    });

    // サブネットグループが作成されることを確認
    template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
      DBSubnetGroupDescription: 'Subnet group for Aurora PostgreSQL database',
    });

    // パラメータグループが作成されることを確認
    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Description: 'Parameter group for Aurora PostgreSQL 15.4',
      Family: 'aurora-postgresql15',
    });

    // CloudWatch Logsグループが作成されることを確認
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/rds/cluster/goal-mandala-test-aurora-postgresql/postgresql',
      RetentionInDays: 30,
    });

    // 出力が作成されることを確認
    template.hasOutput('DatabaseDatabaseClusterEndpoint', {});
    template.hasOutput('DatabaseDatabaseSecretArn', {});
    template.hasOutput('DatabaseLambdaSecurityGroupId', {});

    // プロパティが正しく設定されることを確認
    expect(databaseConstruct.cluster).toBeDefined();
    expect(databaseConstruct.secret).toBeDefined();
    expect(databaseConstruct.securityGroup).toBeDefined();
  });

  it('本番環境設定でDatabaseConstructが作成される', () => {
    const prodConfig: EnvironmentConfig = {
      ...config,
      stackPrefix: 'goal-mandala-prod',
      database: {
        ...config.database,
        minCapacity: 2,
        maxCapacity: 16,
        backupRetentionDays: 30,
        deletionProtection: true,
      },
    };

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      config: prodConfig,
    });

    const template = Template.fromStack(stack);

    // 本番環境用の設定が適用されることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      ServerlessV2ScalingConfiguration: {
        MinCapacity: 2,
        MaxCapacity: 16,
      },
      DeletionProtection: true,
      BackupRetentionPeriod: 30,
    });
  });

  it('カスタムデータベース名が設定される', () => {
    const customConfig: EnvironmentConfig = {
      ...config,
      database: {
        ...config.database,
        databaseName: 'custom_database',
      },
    };

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      config: customConfig,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::RDS::DBCluster', {
      DatabaseName: 'custom_database',
    });
  });

  it('タグが正しく適用される', () => {
    new DatabaseConstruct(stack, 'Database', {
      vpc,
      config,
    });

    const template = Template.fromStack(stack);

    // RDSクラスターにタグが適用されることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Tags: [
        {
          Key: 'Environment',
          Value: 'test',
        },
        {
          Key: 'Project',
          Value: 'GoalMandala',
        },
      ],
    });
  });

  it('セキュリティグループのルールが正しく設定される', () => {
    new DatabaseConstruct(stack, 'Database', {
      vpc,
      config,
    });

    const template = Template.fromStack(stack);

    // Lambda用セキュリティグループからデータベース用セキュリティグループへのアクセスルールが作成される
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 5432,
      ToPort: 5432,
      Description: 'Allow Lambda access to PostgreSQL',
    });
  });

  it('監視設定が正しく適用される', () => {
    new DatabaseConstruct(stack, 'Database', {
      vpc,
      config,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::RDS::DBCluster', {
      PerformanceInsightsEnabled: true,
      EnableCloudwatchLogsExports: ['postgresql'],
    });
  });

  it('バックアップ設定が正しく適用される', () => {
    new DatabaseConstruct(stack, 'Database', {
      vpc,
      config,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 7,
      PreferredBackupWindow: '03:00-04:00',
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00',
    });
  });

  it('パラメータグループの設定が正しく適用される', () => {
    new DatabaseConstruct(stack, 'Database', {
      vpc,
      config,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Parameters: {
        shared_preload_libraries: 'pg_stat_statements',
        log_statement: 'all',
        log_min_duration_statement: '1000',
        log_connections: '1',
        log_disconnections: '1',
        effective_cache_size: '1GB',
        maintenance_work_mem: '256MB',
        checkpoint_completion_target: '0.9',
        wal_buffers: '16MB',
        default_statistics_target: '100',
      },
    });
  });
});
