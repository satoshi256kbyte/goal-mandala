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

    // VPCを作成（分離サブネット付き）
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
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // テスト用設定（IAM認証無効）
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
        maxCapacity: 1,
        multiAz: false,
        databaseName: 'test_db',
        backupRetentionDays: 7,
        deletionProtection: false,
        enableEncryption: true,
        enableIamDatabaseAuthentication: true, // IAM認証を有効にしてテスト
        enableSslConnection: true,
        enableAutomaticSnapshots: true,
        snapshotRetentionDays: 7,
        preferredBackupWindow: '03:00-04:00',
        preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
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
    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    // DatabaseConstructを作成
    const databaseConstruct = new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
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
      EnableIAMDatabaseAuthentication: true,
      DeletionProtection: false,
    });

    // プロパティが正しく設定されることを確認
    expect(databaseConstruct.cluster).toBeDefined();
    expect(databaseConstruct.secret).toBeDefined();
    expect(databaseConstruct.securityGroup).toBeDefined();
    expect(databaseConstruct.encryptionKey).toBeDefined();
  });

  it('暗号化設定が正しく適用される', () => {
    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config,
    });

    const template = Template.fromStack(stack);

    // KMSキーが作成されることを確認
    template.hasResourceProperties('AWS::KMS::Key', {
      Description: 'KMS key for Aurora PostgreSQL encryption',
      EnableKeyRotation: true,
    });

    // データベースクラスターで暗号化が有効になることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      StorageEncrypted: true,
    });
  });

  it('SSL/TLS設定が正しく適用される', () => {
    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Parameters: {
        ssl: '1',
        ssl_min_protocol_version: 'TLSv1.2',
        ssl_max_protocol_version: 'TLSv1.3',
        password_encryption: 'scram-sha-256',
        row_security: '1',
      },
    });
  });

  it('分離サブネットが使用される', () => {
    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config,
    });

    const template = Template.fromStack(stack);

    // サブネットグループが分離サブネット用に作成されることを確認
    template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
      DBSubnetGroupDescription:
        'DB subnet group for Aurora PostgreSQL - private isolated subnets only (Requirement 2.1)',
    });
  });

  it('Prisma最適化パラメータグループが正しく設定される', () => {
    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config,
    });

    const template = Template.fromStack(stack);

    // インスタンスパラメータグループ（Prisma最適化）が作成されることを確認
    template.hasResourceProperties('AWS::RDS::DBParameterGroup', {
      Description: 'Instance parameter group for Aurora PostgreSQL 15.4 - Prisma optimized',
      Parameters: {
        work_mem: '8MB',
        effective_cache_size: '{DBInstanceClassMemory*3/4}',
        random_page_cost: '1.1',
        effective_io_concurrency: '200',
        autovacuum: '1',
        autovacuum_max_workers: '3',
        timezone: 'Asia/Tokyo',
      },
    });

    // クラスターパラメータグループ（セキュリティ・監査最適化）が作成されることを確認
    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Description:
        'Cluster parameter group for Aurora PostgreSQL 15.4 - Security and audit optimized',
      Parameters: {
        shared_preload_libraries: 'pg_stat_statements,auto_explain,pg_audit',
        password_encryption: 'scram-sha-256',
        row_security: '1',
        ssl_min_protocol_version: 'TLSv1.2',
        ssl_max_protocol_version: 'TLSv1.3',
        timezone: 'Asia/Tokyo',
      },
    });
  });

  it('セキュリティ関連の出力が作成される', () => {
    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config,
    });

    const template = Template.fromStack(stack);

    // セキュリティ関連の出力が作成されることを確認
    const outputs = template.findOutputs('*');
    const outputKeys = Object.keys(outputs);

    // 暗号化キー関連の出力があることを確認
    expect(outputKeys.some(key => key.includes('EncryptionKey'))).toBe(true);

    // IAM認証設定の出力があることを確認
    expect(outputKeys.some(key => key.includes('IamAuthentication'))).toBe(true);

    // SSL接続設定の出力があることを確認
    expect(outputKeys.some(key => key.includes('SslConnection'))).toBe(true);
  });

  it('監視・アラート設定が正しく適用される（アラート有効時）', () => {
    // アラート有効な設定
    const configWithAlerts = {
      ...config,
      monitoring: {
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        enableAlerts: true,
        alertEmail: 'admin@example.com',
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    const databaseConstruct = new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAlerts,
    });

    const template = Template.fromStack(stack);

    // SNSトピックが作成されることを確認
    template.hasResourceProperties('AWS::SNS::Topic', {
      DisplayName: 'goal-mandala-test Database Alerts',
      TopicName: 'goal-mandala-test-database-alerts',
    });

    // メール購読が作成されることを確認
    template.hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'email',
      Endpoint: 'admin@example.com',
    });

    // CloudWatchアラームが作成されることを確認
    template.resourceCountIs('AWS::CloudWatch::Alarm', 10); // 10つのアラーム

    // アラームの種類を確認
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'goal-mandala-test-database-high-cpu',
      AlarmDescription: 'Database CPU utilization is critically high (>90%)',
      Threshold: 90,
    });

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'goal-mandala-test-database-high-read-latency',
      AlarmDescription: 'Database read latency is high (>1000ms)',
      Threshold: 1.0,
    });

    // DatabaseConstructのプロパティを確認
    expect(databaseConstruct.alertTopic).toBeDefined();
    expect(databaseConstruct.alarms.length).toBe(10);
  });

  it('監視・アラート設定が無効な場合はアラームが作成されない', () => {
    // アラート無効な設定
    const configWithoutAlerts = {
      ...config,
      monitoring: {
        logRetentionDays: 7,
        enableDetailedMonitoring: false,
        enableAlerts: false,
        alertEmail: null,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    const databaseConstruct = new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithoutAlerts,
    });

    const template = Template.fromStack(stack);

    // SNSトピックが作成されないことを確認
    template.resourceCountIs('AWS::SNS::Topic', 0);

    // CloudWatchアラームが作成されないことを確認
    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);

    // DatabaseConstructのプロパティを確認
    expect(databaseConstruct.alertTopic).toBeUndefined();
    expect(databaseConstruct.alarms.length).toBe(0);
  });

  it('Performance Insightsが正しく設定される', () => {
    // Performance Insights有効な設定
    const configWithPI = {
      ...config,
      database: {
        ...config.database,
        performanceInsights: true,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithPI,
    });

    const template = Template.fromStack(stack);

    // Performance Insightsが有効になることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      PerformanceInsightsEnabled: true,
    });
  });

  it('バックアップ設定が正しく適用される', () => {
    // バックアップ設定
    const configWithBackup = {
      ...config,
      database: {
        ...config.database,
        backupRetentionDays: 14,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithBackup,
    });

    const template = Template.fromStack(stack);

    // バックアップ設定が正しく適用されることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 14,
      PreferredBackupWindow: '03:00-04:00',
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00',
    });
  });

  it('監視関連の出力が作成される', () => {
    // アラート有効な設定
    const configWithAlerts = {
      ...config,
      monitoring: {
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        enableAlerts: true,
        alertEmail: 'admin@example.com',
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAlerts,
    });

    const template = Template.fromStack(stack);

    // 監視関連の出力が作成されることを確認
    const outputs = template.findOutputs('*');
    const outputKeys = Object.keys(outputs);

    // アラートトピック関連の出力があることを確認
    expect(outputKeys.some(key => key.includes('AlertTopic'))).toBe(true);

    // アラーム数の出力があることを確認
    expect(outputKeys.some(key => key.includes('AlarmsCount'))).toBe(true);

    // 監視有効フラグの出力があることを確認
    expect(outputKeys.some(key => key.includes('MonitoringEnabled'))).toBe(true);

    // Performance Insightsフラグの出力があることを確認
    expect(outputKeys.some(key => key.includes('PerformanceInsights'))).toBe(true);

    // バックアップ保持期間の出力があることを確認
    expect(outputKeys.some(key => key.includes('BackupRetention'))).toBe(true);
  });

  it('getConnectionInfoメソッドが監視情報を含む', () => {
    // アラート有効な設定
    const configWithAlerts = {
      ...config,
      monitoring: {
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        enableAlerts: true,
        alertEmail: 'admin@example.com',
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    const databaseConstruct = new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAlerts,
    });

    const connectionInfo = databaseConstruct.getConnectionInfo();

    // 監視情報が含まれることを確認
    expect(connectionInfo.performanceInsightsEnabled).toBe(true);
    expect(connectionInfo.backupRetentionDays).toBe(7);
    expect(connectionInfo.monitoringEnabled).toBe(true);
    expect(connectionInfo.alertTopicArn).toBeDefined();
    expect(connectionInfo.alarmsCount).toBe(10);
    expect(connectionInfo.backupWindow).toBe('03:00-04:00');
    expect(connectionInfo.maintenanceWindow).toBe('sun:04:00-sun:05:00');
    expect(connectionInfo.automaticSnapshotsEnabled).toBe(true);
    expect(connectionInfo.auditLogEnabled).toBe(true);
    expect(connectionInfo.slowQueryLogEnabled).toBe(true);
  });

  it('CloudWatchダッシュボードが作成される（アラート有効時）', () => {
    // アラート有効な設定
    const configWithAlerts = {
      ...config,
      monitoring: {
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        enableAlerts: true,
        alertEmail: 'admin@example.com',
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAlerts,
    });

    const template = Template.fromStack(stack);

    // CloudWatchダッシュボードが作成されることを確認
    template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
      DashboardName: 'goal-mandala-test-database-monitoring',
    });
  });

  it('バックアップ失敗アラームが設定される（アラート有効時）', () => {
    // アラート有効な設定
    const configWithAlerts = {
      ...config,
      monitoring: {
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        enableAlerts: true,
        alertEmail: 'admin@example.com',
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAlerts,
    });

    const template = Template.fromStack(stack);

    // バックアップ失敗アラームが作成されることを確認
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'goal-mandala-test-database-backup-failure',
      AlarmDescription: 'Database backup may have failed (no backup storage usage detected)',
      Threshold: 0,
      ComparisonOperator: 'LessThanOrEqualToThreshold',
    });

    // データベース可用性アラームが作成されることを確認
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'goal-mandala-test-database-unavailable',
      AlarmDescription: 'Database is completely unavailable (no connections detected)',
      Threshold: 0,
      ComparisonOperator: 'LessThanOrEqualToThreshold',
    });
  });

  it('ログエラーアラームが設定される（監査ログ有効時）', () => {
    // 監査ログとアラート有効な設定
    const configWithAuditLog = {
      ...config,
      database: {
        ...config.database,
        enableAuditLog: true,
      },
      monitoring: {
        logRetentionDays: 30,
        enableDetailedMonitoring: true,
        enableAlerts: true,
        alertEmail: 'admin@example.com',
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAuditLog,
    });

    const template = Template.fromStack(stack);

    // ログエラーアラームが作成されることを確認
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'goal-mandala-test-database-log-errors',
      AlarmDescription: 'High number of database errors detected in logs',
      Threshold: 10,
      ComparisonOperator: 'GreaterThanThreshold',
    });
  });

  it('環境別バックアップ設定が正しく適用される', () => {
    // 本番環境設定
    const prodConfig = {
      ...config,
      environment: 'production',
      database: {
        ...config.database,
        backupRetentionDays: 30,
        preferredBackupWindow: '02:00-03:00',
        preferredMaintenanceWindow: 'sat:03:00-sat:04:00',
        enableAutomaticSnapshots: true,
        snapshotRetentionDays: 30,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: prodConfig,
    });

    const template = Template.fromStack(stack);

    // バックアップ設定が正しく適用されることを確認
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      BackupRetentionPeriod: 30,
      PreferredBackupWindow: '02:00-03:00',
      PreferredMaintenanceWindow: 'sat:03:00-sat:04:00',
    });

    // バックアップ関連の出力が作成されることを確認
    const outputs = template.findOutputs('*');
    const outputKeys = Object.keys(outputs);

    expect(outputKeys.some(key => key.includes('BackupWindow'))).toBe(true);
    expect(outputKeys.some(key => key.includes('MaintenanceWindow'))).toBe(true);
    expect(outputKeys.some(key => key.includes('AutomaticSnapshots'))).toBe(true);
  });

  it('監査ログ設定が強化される（要件6.3対応）', () => {
    // 監査ログ有効な設定
    const configWithAuditLog = {
      ...config,
      database: {
        ...config.database,
        enableAuditLog: true,
        enableSlowQueryLog: true,
        slowQueryLogThreshold: 500,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAuditLog,
    });

    const template = Template.fromStack(stack);

    // 強化された監査ログ設定が適用されることを確認
    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Parameters: {
        log_statement: 'all',
        log_connections: '1',
        log_disconnections: '1',
        log_duration: '1',
        log_error_verbosity: 'verbose',
        log_min_error_statement: 'error',
        log_min_messages: 'info',
        log_replication_commands: '1',
        log_temp_files: '0',
        log_autovacuum_min_duration: '0',
        log_parser_stats: '1',
        log_planner_stats: '1',
        log_executor_stats: '1',
        log_statement_stats: '1',
        shared_preload_libraries: 'pg_stat_statements,auto_explain,pg_audit',
        'pg_audit.log': 'all',
        'pg_audit.log_catalog': '1',
        'pg_audit.log_client': '1',
        'pg_audit.log_parameter': '1',
        'pg_audit.log_relation': '1',
        'pg_audit.log_statement_once': '1',
      },
    });
  });

  it('ネットワークアクセス制御が強化される（要件6.4対応）', () => {
    // VPCエンドポイント有効な設定
    const configWithVpcEndpoints = {
      ...config,
      network: {
        ...config.network,
        enableVpcEndpoints: true,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithVpcEndpoints,
    });

    const template = Template.fromStack(stack);

    // VPCエンドポイントが作成されることを確認（4つのエンドポイント）
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 4);

    // RDS VPCエンドポイント
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.rds']],
      },
    });

    // Secrets Manager VPCエンドポイント
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.secretsmanager']],
      },
    });

    // KMS VPCエンドポイント
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.kms']],
      },
    });

    // CloudWatch Logs VPCエンドポイント
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: {
        'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.logs']],
      },
    });

    // ネットワークACLが作成されることを確認
    template.hasResourceProperties('AWS::EC2::NetworkAcl', {
      Tags: [
        {
          Key: 'Name',
          Value: 'goal-mandala-test-database-nacl',
        },
      ],
    });

    // NACLエントリが作成されることを確認
    template.resourceCountIs('AWS::EC2::NetworkAclEntry', 6); // 3つのインバウンド + 3つのアウトバウンド
  });

  it('SSL接続強制設定が適用される（要件6.1対応）', () => {
    // SSL接続有効な設定
    const configWithSsl = {
      ...config,
      database: {
        ...config.database,
        enableSslConnection: true,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithSsl,
    });

    const template = Template.fromStack(stack);

    // SSL強制設定用Lambda関数が作成されることを確認
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.11',
      Handler: 'index.handler',
      Timeout: 300,
    });

    // カスタムリソースが作成されることを確認（SSL強制設定用 + IAMセットアップ用）
    template.resourceCountIs('AWS::CloudFormation::CustomResource', 2);

    // カスタムリソースのプロパティを確認
    const customResources = template.findResources('AWS::CloudFormation::CustomResource');
    const customResourceKeys = Object.keys(customResources);
    expect(customResourceKeys.length).toBe(2); // SSL強制設定用 + IAMセットアップ用

    // SSL強制設定用のカスタムリソースを特定（ClusterIdプロパティを持つもの）
    const sslCustomResource = Object.values(customResources).find(
      (resource: any) => resource.Properties.ClusterId !== undefined
    );
    expect(sslCustomResource).toBeDefined();
    expect(sslCustomResource.Properties.ServiceToken).toBeDefined();
    expect(sslCustomResource.Properties.ClusterId).toBeDefined();

    // SSL設定が強化されることを確認
    template.hasResourceProperties('AWS::RDS::DBClusterParameterGroup', {
      Parameters: {
        ssl: '1',
        ssl_min_protocol_version: 'TLSv1.2',
        ssl_max_protocol_version: 'TLSv1.3',
        ssl_prefer_server_ciphers: '1',
        ssl_ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
      },
    });
  });

  it('セキュリティ強化関連の出力が作成される', () => {
    // 全セキュリティ機能有効な設定
    const configWithAllSecurity = {
      ...config,
      database: {
        ...config.database,
        enableAuditLog: true,
        enableSlowQueryLog: true,
        slowQueryLogThreshold: 1000,
        enableSslConnection: true,
        enableEncryption: true,
      },
      network: {
        ...config.network,
        enableVpcEndpoints: true,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAllSecurity,
    });

    const template = Template.fromStack(stack);

    // セキュリティ強化関連の出力が作成されることを確認
    const outputs = template.findOutputs('*');
    const outputKeys = Object.keys(outputs);

    // 監査ログ関連の出力
    expect(outputKeys.some(key => key.includes('AuditLog'))).toBe(true);
    expect(outputKeys.some(key => key.includes('SlowQueryLog'))).toBe(true);

    // ネットワークアクセス制御関連の出力
    expect(outputKeys.some(key => key.includes('NetworkAccessControl'))).toBe(true);

    // SSL/暗号化関連の出力
    expect(outputKeys.some(key => key.includes('SslEnforcement'))).toBe(true);
    expect(outputKeys.some(key => key.includes('EncryptionAtRest'))).toBe(true);
    expect(outputKeys.some(key => key.includes('EncryptionInTransit'))).toBe(true);
  });

  it('getConnectionInfoメソッドにセキュリティ情報が含まれる', () => {
    // 全セキュリティ機能有効な設定
    const configWithAllSecurity = {
      ...config,
      database: {
        ...config.database,
        enableAuditLog: true,
        enableSlowQueryLog: true,
        slowQueryLogThreshold: 500,
        enableSslConnection: true,
        enableEncryption: true,
      },
      network: {
        ...config.network,
        enableVpcEndpoints: true,
      },
    };

    // セキュリティグループを作成
    const databaseSecurityGroup = new ec2.SecurityGroup(stack, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    const databaseConstruct = new DatabaseConstruct(stack, 'Database', {
      vpc,
      databaseSecurityGroup,
      config: configWithAllSecurity,
    });

    const connectionInfo = databaseConstruct.getConnectionInfo();

    // セキュリティ情報が含まれることを確認
    expect(connectionInfo.auditLogEnabled).toBe(true);
    expect(connectionInfo.slowQueryLogEnabled).toBe(true);
    expect(connectionInfo.slowQueryLogThreshold).toBe(500);
    expect(connectionInfo.networkAccessControlEnabled).toBe(true);
    expect(connectionInfo.sslEnforcementEnabled).toBe(true);
    expect(connectionInfo.encryptionAtRestEnabled).toBe(true);
    expect(connectionInfo.encryptionInTransitEnabled).toBe(true);
  });
});
