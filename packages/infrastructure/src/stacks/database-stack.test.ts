import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from './database-stack';
import { EnvironmentConfig } from '../config/environment';

describe('DatabaseStack', () => {
  let app: cdk.App;
  let databaseStack: DatabaseStack;
  let template: Template;
  let config: EnvironmentConfig;
  let vpc: ec2.Vpc;
  let databaseSecurityGroup: ec2.SecurityGroup;

  beforeEach(() => {
    app = new cdk.App();

    // テスト用設定
    config = {
      stackPrefix: 'goal-mandala-test',
      region: 'ap-northeast-1',
      network: {
        natGateways: 1,
        enableVpcEndpoints: false,
      },
      database: {
        instanceClass: 'serverless',
        minCapacity: 0.5,
        maxCapacity: 2.0,
        multiAz: false,
        databaseName: 'goalmandalamain',
        backupRetentionDays: 7,
        deletionProtection: false,
        enableEncryption: true,
        enableIamDatabaseAuthentication: true, // IAM認証を有効にしてテスト
        enableSslConnection: true,
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

    // VPCスタックをシミュレート
    const vpcStack = new cdk.Stack(app, 'TestVpcStack');
    vpc = new ec2.Vpc(vpcStack, 'TestVpc', {
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
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    databaseSecurityGroup = new ec2.SecurityGroup(vpcStack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    // DatabaseStackを作成（VpcStackとの統合をテスト）
    databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
      config,
      vpc,
      databaseSecurityGroup,
    });

    template = Template.fromStack(databaseStack);
  });

  test('DatabaseStackが正しく作成される', () => {
    // DatabaseStackのプロパティが正しく設定されていることを確認
    expect(databaseStack.database).toBeDefined();
    expect(databaseStack.cluster).toBeDefined();
    expect(databaseStack.secret).toBeDefined();
    expect(databaseStack.securityGroup).toBeDefined();
  });

  test('VpcStackとの統合が正しく動作する', () => {
    // VPCとセキュリティグループが正しく統合されていることを確認
    expect(databaseStack.database.cluster.vpc).toBe(vpc);
    expect(databaseStack.securityGroup).toBe(databaseSecurityGroup);
  });

  test('Aurora Serverless V2クラスターが作成される', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      EngineVersion: '15.4',
      ServerlessV2ScalingConfiguration: {
        MinCapacity: 0.5,
        MaxCapacity: 2.0,
      },
      StorageEncrypted: true,
      EnableIAMDatabaseAuthentication: true,
      DeletionProtection: false,
    });
  });

  test('データベースシークレットが暗号化されて作成される', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Description: 'Aurora PostgreSQL database credentials',
    });

    // KMSキーが作成されることを確認
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: 'KMS key for Aurora PostgreSQL encryption',
      EnableKeyRotation: true,
    });
  });

  test('セキュリティ強化されたパラメータグループが作成される', () => {
    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Description:
        'Cluster parameter group for Aurora PostgreSQL 15.4 - Security and audit optimized',
      Parameters: {
        ssl: '1',
        ssl_min_protocol_version: 'TLSv1.2',
        ssl_max_protocol_version: 'TLSv1.3',
        password_encryption: 'scram-sha-256',
        row_security: '1',
        shared_preload_libraries: 'pg_stat_statements,auto_explain,pg_audit',
      },
    });
  });

  test('分離サブネットが使用される', () => {
    template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
      DBSubnetGroupDescription:
        'DB subnet group for Aurora PostgreSQL - private isolated subnets only (Requirement 2.1)',
    });
  });

  test('CloudFormation出力が正しく設定される', () => {
    // 主要な出力が設定されていることを確認
    template.hasOutput('DatabaseStackClusterEndpoint', {});
    template.hasOutput('DatabaseStackClusterReadEndpoint', {});
    template.hasOutput('DatabaseStackSecretArn', {});
    template.hasOutput('DatabaseStackSecurityGroupId', {});
    template.hasOutput('DatabaseStackConfiguration', {});
    template.hasOutput('DatabaseStackVpcIntegration', {});
    template.hasOutput('DatabaseStackSecurityConfiguration', {});
  });

  test('適切なタグが設定される', () => {
    // 共通タグが設定されていることを確認（順序は問わない）
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Tags: [
        { Key: 'Component', Value: 'Aurora-PostgreSQL' },
        { Key: 'Environment', Value: 'test' },
        { Key: 'Project', Value: 'GoalMandala' },
        { Key: 'ServerlessV2', Value: 'true' },
        { Key: 'StackType', Value: 'Database' },
      ],
    });
  });

  test('セキュリティ設定が正しく適用される', () => {
    // 暗号化が有効になっていることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true,
    });

    // SSL設定が有効になっていることを確認
    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Parameters: {
        ssl: '1',
      },
    });
  });
});
