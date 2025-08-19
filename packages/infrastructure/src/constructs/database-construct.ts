import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
import { DatabaseIamConstruct } from './database-iam-construct';
import { DatabaseIamSetupConstruct } from './database-iam-setup-construct';

export interface DatabaseConstructProps {
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
  config: EnvironmentConfig;
}

export interface DatabaseConfig {
  minCapacity: number;
  maxCapacity: number;
  multiAz: boolean;
  backupRetention: number;
  deletionProtection: boolean;
  performanceInsights: boolean;
  monitoringInterval: number;
  enableAuditLog: boolean;
  enableSlowQueryLog: boolean;
  slowQueryLogThreshold: number;
  enableAutomaticSnapshots: boolean;
  snapshotRetentionDays: number;
  preferredBackupWindow: string;
  preferredMaintenanceWindow: string;
}

export class DatabaseConstruct extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly secret: secretsmanager.ISecret;
  public readonly securityGroup: ec2.ISecurityGroup;
  public readonly subnetGroup: rds.SubnetGroup;
  public readonly parameterGroup: rds.ParameterGroup;
  public readonly clusterParameterGroup: rds.ParameterGroup;
  public readonly monitoringRole?: iam.Role;
  public readonly databaseIam?: DatabaseIamConstruct;
  public readonly databaseIamSetup?: DatabaseIamSetupConstruct;
  public readonly encryptionKey: kms.Key;
  public alertTopic?: sns.Topic;
  public readonly alarms: cloudwatch.Alarm[] = [];
  private readonly config: EnvironmentConfig;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const { vpc, databaseSecurityGroup, config } = props;
    this.config = config;

    // VpcStackから提供されたセキュリティグループを使用
    this.securityGroup = databaseSecurityGroup;

    // KMS キー（暗号化用）
    this.encryptionKey = new kms.Key(this, 'DatabaseKey', {
      description: 'KMS key for Aurora PostgreSQL encryption',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      policy: new iam.PolicyDocument({
        statements: [
          // ルートアカウントに完全な権限を付与
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
          // RDSサービスにキー使用権限を付与
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('rds.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:CreateGrant', 'kms:DescribeKey'],
            resources: ['*'],
          }),
          // Secrets Managerサービスにキー使用権限を付与
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('secretsmanager.amazonaws.com')],
            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:CreateGrant', 'kms:DescribeKey'],
            resources: ['*'],
          }),
        ],
      }),
    });

    // データベース認証情報のシークレット
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      description: 'Aurora PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'postgres',
          engine: 'postgres',
          port: 5432,
          dbname: config.database.databaseName || 'goalmandalamain',
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'`',
        includeSpace: false,
        passwordLength: 32,
      },
      encryptionKey: this.encryptionKey,
    });

    // DBサブネットグループ（要件2.1対応：プライベートサブネット配置）
    this.subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description:
        'DB subnet group for Aurora PostgreSQL - private isolated subnets only (Requirement 2.1)',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // 最もセキュアなプライベートサブネット（分離）
      },
    });

    // クラスターパラメータグループ（セキュリティ・監査最適化）
    this.clusterParameterGroup = new rds.ParameterGroup(this, 'DatabaseClusterParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      description:
        'Cluster parameter group for Aurora PostgreSQL 15.4 - Security and audit optimized',
      parameters: {
        // 監査ログ設定（要件6.3対応）- 強化版
        log_statement: config.database.enableAuditLog ? 'all' : 'none',
        log_min_duration_statement: config.database.enableSlowQueryLog
          ? config.database.slowQueryLogThreshold?.toString() || '1000'
          : '-1',
        log_connections: config.database.enableAuditLog ? '1' : '0',
        log_disconnections: config.database.enableAuditLog ? '1' : '0',
        log_checkpoints: '1',
        log_lock_waits: '1',
        log_hostname: config.database.enableAuditLog ? '1' : '0',
        log_line_prefix: '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ',

        // 追加監査ログ設定（要件6.3強化）
        log_duration: config.database.enableAuditLog ? '1' : '0', // クエリ実行時間をログ
        log_error_verbosity: 'verbose', // エラーログの詳細度を最大に
        log_min_error_statement: 'error', // エラーレベル以上のステートメントをログ
        log_min_messages: config.database.enableAuditLog ? 'info' : 'warning', // ログレベル設定
        log_replication_commands: config.database.enableAuditLog ? '1' : '0', // レプリケーションコマンドをログ
        log_temp_files: '0', // 一時ファイル作成をログ（0=全て）
        log_autovacuum_min_duration: '0', // 自動バキュームをログ

        // セキュリティ監査強化（要件6.3対応）
        log_parser_stats: config.database.enableAuditLog ? '1' : '0', // パーサー統計をログ
        log_planner_stats: config.database.enableAuditLog ? '1' : '0', // プランナー統計をログ
        log_executor_stats: config.database.enableAuditLog ? '1' : '0', // エグゼキューター統計をログ
        log_statement_stats: config.database.enableAuditLog ? '1' : '0', // ステートメント統計をログ

        // 共有ライブラリ（パフォーマンス監視用）
        shared_preload_libraries: 'pg_stat_statements,auto_explain,pg_audit',

        // SSL/TLS設定（要件2.4, 6.1対応）- 強化版
        ssl: config.database.enableSslConnection ? '1' : '0',
        ssl_cert_file: 'server.crt',
        ssl_key_file: 'server.key',
        ssl_ca_file: 'root.crt',
        ssl_crl_file: '',
        ssl_min_protocol_version: 'TLSv1.2', // 最小TLSバージョンを1.2に設定
        ssl_max_protocol_version: 'TLSv1.3', // 最大TLSバージョンを1.3に設定
        ssl_ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
        ssl_prefer_server_ciphers: '1', // サーバー側の暗号化設定を優先

        // SSL接続強制設定（要件6.1対応）
        ssl_renegotiation_limit: '0', // SSL再ネゴシエーション制限
        ssl_dh_params_file: '', // DHパラメータファイル

        // セキュリティ強化設定（要件6.1, 6.2対応）
        password_encryption: 'scram-sha-256', // パスワード暗号化方式を強化
        row_security: '1', // 行レベルセキュリティを有効化

        // 追加セキュリティ設定（要件6.1強化）
        krb_server_keyfile: '', // Kerberos認証設定
        db_user_namespace: '0', // ユーザー名前空間分離
        bonjour: '0', // Bonjourサービス無効化（セキュリティ）

        // 接続セキュリティ強化（要件6.4対応）
        authentication_timeout: '60s', // 認証タイムアウト
        tcp_keepalives_idle: '600', // TCP keepalive設定
        tcp_keepalives_interval: '30',
        tcp_keepalives_count: '3',

        // 接続・セッション管理
        max_connections: 'LEAST({DBInstanceClassMemory/9531392},5000)',
        superuser_reserved_connections: '3', // スーパーユーザー予約接続数

        // Prisma接続プール最適化
        max_prepared_transactions: '100',

        // 自動EXPLAIN設定（パフォーマンス分析用）
        'auto_explain.log_min_duration': '1000', // 1秒以上のクエリを自動EXPLAIN
        'auto_explain.log_analyze': '1',
        'auto_explain.log_buffers': '1',
        'auto_explain.log_timing': '1',
        'auto_explain.log_triggers': '1',
        'auto_explain.log_verbose': '1',
        'auto_explain.log_nested_statements': '1', // ネストしたステートメントもログ

        // pg_stat_statements設定（クエリ統計用）
        'pg_stat_statements.max': '10000',
        'pg_stat_statements.track': 'all',
        'pg_stat_statements.track_utility': '1',
        'pg_stat_statements.save': '1',
        'pg_stat_statements.track_planning': '1', // プランニング時間も追跡

        // pg_audit設定（監査ログ強化）
        'pg_audit.log': config.database.enableAuditLog ? 'all' : 'none',
        'pg_audit.log_catalog': config.database.enableAuditLog ? '1' : '0',
        'pg_audit.log_client': config.database.enableAuditLog ? '1' : '0',
        'pg_audit.log_level': 'log',
        'pg_audit.log_parameter': config.database.enableAuditLog ? '1' : '0',
        'pg_audit.log_relation': config.database.enableAuditLog ? '1' : '0',
        'pg_audit.log_statement_once': config.database.enableAuditLog ? '1' : '0',

        // タイムゾーン設定
        timezone: 'Asia/Tokyo', // 日本時間設定
        log_timezone: 'Asia/Tokyo',
      },
    });

    // インスタンスパラメータグループ（Prisma最適化）
    this.parameterGroup = new rds.ParameterGroup(this, 'DatabaseParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      description: 'Instance parameter group for Aurora PostgreSQL 15.4 - Prisma optimized',
      parameters: {
        // Prisma最適化設定 - メモリ関連
        effective_cache_size: '{DBInstanceClassMemory*3/4}', // 利用可能メモリの75%をキャッシュに
        maintenance_work_mem: '{DBInstanceClassMemory/16}', // メンテナンス作業用メモリ
        work_mem: '8MB', // Prismaクエリ用ワークメモリを増加
        shared_buffers: '{DBInstanceClassMemory/4}', // 共有バッファを25%に設定

        // Prisma最適化設定 - チェックポイント・WAL
        checkpoint_completion_target: '0.9', // チェックポイント完了目標
        checkpoint_timeout: '15min', // チェックポイント間隔
        wal_buffers: '16MB', // WALバッファサイズ
        wal_writer_delay: '200ms', // WALライター遅延

        // Prisma最適化設定 - 統計・プランナー
        default_statistics_target: '100', // 統計情報の詳細度
        random_page_cost: '1.1', // SSD用の低いランダムアクセスコスト
        seq_page_cost: '1.0', // シーケンシャルアクセスコスト
        effective_io_concurrency: '200', // SSD用の高い並行I/O

        // Prisma最適化設定 - 接続・プリペアドステートメント
        max_prepared_transactions: '100', // プリペアドトランザクション数
        max_connections: 'LEAST({DBInstanceClassMemory/9531392},5000)', // 接続数制限

        // Prisma最適化設定 - 自動バキューム（重要）
        autovacuum: '1', // 自動バキューム有効
        autovacuum_max_workers: '3', // バキュームワーカー数
        autovacuum_naptime: '20s', // バキューム間隔
        autovacuum_vacuum_threshold: '50', // バキューム閾値
        autovacuum_analyze_threshold: '50', // 分析閾値
        autovacuum_vacuum_scale_factor: '0.1', // バキューム比率
        autovacuum_analyze_scale_factor: '0.05', // 分析比率

        // Prisma最適化設定 - ロック・タイムアウト
        lock_timeout: '30s', // ロックタイムアウト
        statement_timeout: '60s', // ステートメントタイムアウト
        idle_in_transaction_session_timeout: '300s', // アイドルトランザクションタイムアウト

        // Prisma最適化設定 - ログ設定
        log_min_duration_statement: config.database.enableSlowQueryLog
          ? config.database.slowQueryLogThreshold?.toString() || '1000'
          : '-1',
        log_checkpoints: '1',
        log_connections: config.database.enableAuditLog ? '1' : '0',
        log_disconnections: config.database.enableAuditLog ? '1' : '0',
        log_lock_waits: '1',

        // Prisma最適化設定 - 文字エンコーディング（UTF-8）
        default_text_search_config: 'pg_catalog.english',
        timezone: 'Asia/Tokyo', // 日本時間設定
      },
    });

    // 監視用IAMロール（Enhanced Monitoring用）
    if (config.database.monitoringInterval && config.database.monitoringInterval > 0) {
      this.monitoringRole = new iam.Role(this, 'DatabaseMonitoringRole', {
        assumedBy: new iam.ServicePrincipal('monitoring.rds.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AmazonRDSEnhancedMonitoringRole'
          ),
        ],
        description: 'IAM role for RDS Enhanced Monitoring',
      });
    }

    // CloudWatch Logs グループ
    const logGroup = new logs.LogGroup(this, 'DatabaseLogGroup', {
      logGroupName: `/aws/rds/cluster/${config.stackPrefix}-aurora-postgresql/postgresql`,
      retention: this.getLogRetentionDays(config.monitoring?.logRetentionDays),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ネットワークアクセス制御強化（要件6.4対応）
    this.setupNetworkAccessControl(vpc);

    // Aurora Serverless V2 クラスター
    const clusterInstances: rds.IClusterInstance[] = [
      rds.ClusterInstance.serverlessV2('writer', {
        scaleWithWriter: true,
        parameterGroup: this.parameterGroup,
      }),
    ];

    // Multi-AZ設定の場合、リーダーインスタンスを追加
    if (config.database.multiAz) {
      clusterInstances.push(
        rds.ClusterInstance.serverlessV2('reader', {
          scaleWithWriter: false,
          parameterGroup: this.parameterGroup,
        })
      );
    }

    this.cluster = new rds.DatabaseCluster(this, 'DatabaseCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      writer: clusterInstances[0],
      readers: clusterInstances.slice(1),
      serverlessV2MinCapacity: config.database.minCapacity,
      serverlessV2MaxCapacity: config.database.maxCapacity,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // データベースサブネット（分離）を使用
      },
      securityGroups: [this.securityGroup],
      subnetGroup: this.subnetGroup,
      parameterGroup: this.clusterParameterGroup,
      defaultDatabaseName: config.database.databaseName,

      // バックアップ設定（要件3.1対応）
      backup: {
        retention: cdk.Duration.days(config.database.backupRetentionDays || 7),
        preferredWindow: config.database.preferredBackupWindow || '03:00-04:00', // JST 12:00-13:00
      },

      // メンテナンス設定
      preferredMaintenanceWindow:
        config.database.preferredMaintenanceWindow || 'sun:04:00-sun:05:00', // JST 日曜 13:00-14:00

      // 監視設定
      monitoringInterval: config.database.monitoringInterval
        ? cdk.Duration.seconds(config.database.monitoringInterval)
        : undefined,
      monitoringRole: this.monitoringRole,
      // Performance Insights設定（要件3.3対応）
      enablePerformanceInsights: config.database.performanceInsights ?? true,
      performanceInsightRetention: config.database.performanceInsights
        ? config.environment === 'production' || config.environment === 'staging'
          ? rds.PerformanceInsightRetention.LONG_TERM // 731日（2年）
          : rds.PerformanceInsightRetention.DEFAULT // 7日
        : undefined,
      performanceInsightEncryptionKey: config.database.performanceInsights
        ? this.encryptionKey
        : undefined,

      // ログ設定
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: this.getLogRetentionDays(config.monitoring?.logRetentionDays),

      // セキュリティ設定（要件6.1対応）
      storageEncrypted: config.database.enableEncryption ?? true,
      storageEncryptionKey: this.encryptionKey,
      iamAuthentication: config.database.enableIamDatabaseAuthentication ?? true,
      deletionProtection: config.database.deletionProtection ?? false,

      // 削除設定
      removalPolicy: config.database.deletionProtection
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // IAMデータベース認証が有効な場合、IAM関連リソースを作成（要件6.2, 6.3対応）
    if (config.database.enableIamDatabaseAuthentication) {
      this.databaseIam = new DatabaseIamConstruct(this, 'DatabaseIam', {
        cluster: this.cluster,
        config,
        databaseSecret: this.secret,
        encryptionKey: this.encryptionKey,
      });

      // IAM設定の検証
      const validation = this.databaseIam.validateIamConfiguration();
      if (!validation.isValid) {
        console.warn('⚠️  IAM設定に問題があります:');
        validation.issues.forEach(issue => console.warn(`   - ${issue}`));
      } else {
        console.log('✅ IAM設定の検証が完了しました');
      }

      // IAMデータベース認証セットアップ用Lambda関数を作成（要件6.3対応）
      this.databaseIamSetup = new DatabaseIamSetupConstruct(this, 'DatabaseIamSetup', {
        vpc,
        databaseSecurityGroup: this.securityGroup,
        cluster: this.cluster,
        databaseSecret: this.secret,
        encryptionKey: this.encryptionKey,
        config,
      });

      console.log('✅ IAMデータベース認証セットアップ機能が作成されました');
    }

    // SSL接続強制設定（要件6.1対応）
    this.setupSslEnforcement();

    // 監視・アラート設定（要件3.2, 3.3対応）
    this.setupMonitoringAndAlerts();

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.cluster).add(key, value);
        cdk.Tags.of(this.secret).add(key, value);
        cdk.Tags.of(this.securityGroup).add(key, value);
        cdk.Tags.of(this.encryptionKey).add(key, value);
        cdk.Tags.of(this.subnetGroup).add(key, value);
        cdk.Tags.of(this.parameterGroup).add(key, value);
        cdk.Tags.of(this.clusterParameterGroup).add(key, value);
        if (this.monitoringRole) {
          cdk.Tags.of(this.monitoringRole).add(key, value);
        }
        if (this.alertTopic) {
          cdk.Tags.of(this.alertTopic).add(key, value);
        }
      });
    }

    // データベース固有のタグ設定
    if (config.database.tags) {
      Object.entries(config.database.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.cluster).add(key, value);
        cdk.Tags.of(this.secret).add(key, value);
        cdk.Tags.of(this.encryptionKey).add(key, value);
        cdk.Tags.of(this.subnetGroup).add(key, value);
        cdk.Tags.of(this.parameterGroup).add(key, value);
        cdk.Tags.of(this.clusterParameterGroup).add(key, value);
      });
    }

    // 出力
    new cdk.CfnOutput(this, 'DatabaseClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      description: 'Aurora PostgreSQL cluster endpoint',
      exportName: `${config.stackPrefix}-database-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseClusterReadEndpoint', {
      value: this.cluster.clusterReadEndpoint.hostname,
      description: 'Aurora PostgreSQL cluster read endpoint',
      exportName: `${config.stackPrefix}-database-read-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.secret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: `${config.stackPrefix}-database-secret-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.securityGroup.securityGroupId,
      description: 'Security group ID for database',
      exportName: `${config.stackPrefix}-database-security-group-id`,
    });

    new cdk.CfnOutput(this, 'DatabaseClusterIdentifier', {
      value: this.cluster.clusterIdentifier,
      description: 'Aurora PostgreSQL cluster identifier',
      exportName: `${config.stackPrefix}-database-cluster-id`,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: this.cluster.clusterEndpoint.port.toString(),
      description: 'Database port',
      exportName: `${config.stackPrefix}-database-port`,
    });

    new cdk.CfnOutput(this, 'DatabaseEncryptionKeyId', {
      value: this.encryptionKey.keyId,
      description: 'Database encryption key ID',
      exportName: `${config.stackPrefix}-database-encryption-key-id`,
    });

    new cdk.CfnOutput(this, 'DatabaseEncryptionKeyArn', {
      value: this.encryptionKey.keyArn,
      description: 'Database encryption key ARN',
      exportName: `${config.stackPrefix}-database-encryption-key-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseIamAuthenticationEnabled', {
      value: (config.database.enableIamDatabaseAuthentication ?? true).toString(),
      description: 'Whether IAM database authentication is enabled',
      exportName: `${config.stackPrefix}-database-iam-auth-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabaseSslConnectionEnabled', {
      value: (config.database.enableSslConnection ?? true).toString(),
      description: 'Whether SSL connection is enabled',
      exportName: `${config.stackPrefix}-database-ssl-enabled`,
    });

    // 監視・アラート関連の出力
    if (this.alertTopic) {
      new cdk.CfnOutput(this, 'DatabaseAlertTopicArn', {
        value: this.alertTopic.topicArn,
        description: 'SNS topic ARN for database alerts',
        exportName: `${config.stackPrefix}-database-alert-topic-arn`,
      });

      new cdk.CfnOutput(this, 'DatabaseAlarmsCount', {
        value: this.alarms.length.toString(),
        description: 'Number of CloudWatch alarms configured for database monitoring',
        exportName: `${config.stackPrefix}-database-alarms-count`,
      });
    }

    new cdk.CfnOutput(this, 'DatabaseMonitoringEnabled', {
      value: (config.monitoring?.enableAlerts ?? false).toString(),
      description: 'Whether database monitoring and alerts are enabled',
      exportName: `${config.stackPrefix}-database-monitoring-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabasePerformanceInsightsEnabled', {
      value: (config.database.performanceInsights ?? true).toString(),
      description: 'Whether Performance Insights is enabled',
      exportName: `${config.stackPrefix}-database-performance-insights-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabaseBackupRetentionDays', {
      value: (config.database.backupRetentionDays || 7).toString(),
      description: 'Database backup retention period in days',
      exportName: `${config.stackPrefix}-database-backup-retention-days`,
    });

    new cdk.CfnOutput(this, 'DatabaseBackupWindow', {
      value: config.database.preferredBackupWindow || '03:00-04:00',
      description: 'Database preferred backup window',
      exportName: `${config.stackPrefix}-database-backup-window`,
    });

    new cdk.CfnOutput(this, 'DatabaseMaintenanceWindow', {
      value: config.database.preferredMaintenanceWindow || 'sun:04:00-sun:05:00',
      description: 'Database preferred maintenance window',
      exportName: `${config.stackPrefix}-database-maintenance-window`,
    });

    new cdk.CfnOutput(this, 'DatabaseAutomaticSnapshotsEnabled', {
      value: (config.database.enableAutomaticSnapshots ?? true).toString(),
      description: 'Whether automatic snapshots are enabled',
      exportName: `${config.stackPrefix}-database-automatic-snapshots-enabled`,
    });

    // 監査ログとセキュリティ強化関連の出力（要件6.1, 6.3, 6.4対応）
    new cdk.CfnOutput(this, 'DatabaseAuditLogEnabled', {
      value: (config.database.enableAuditLog ?? true).toString(),
      description: 'Whether database audit logging is enabled',
      exportName: `${config.stackPrefix}-database-audit-log-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabaseSlowQueryLogEnabled', {
      value: (config.database.enableSlowQueryLog ?? true).toString(),
      description: 'Whether slow query logging is enabled',
      exportName: `${config.stackPrefix}-database-slow-query-log-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabaseSlowQueryLogThreshold', {
      value: (config.database.slowQueryLogThreshold || 1000).toString(),
      description: 'Slow query log threshold in milliseconds',
      exportName: `${config.stackPrefix}-database-slow-query-log-threshold`,
    });

    new cdk.CfnOutput(this, 'DatabaseNetworkAccessControlEnabled', {
      value: config.network.enableVpcEndpoints.toString(),
      description: 'Whether VPC endpoints are enabled for network access control',
      exportName: `${config.stackPrefix}-database-network-access-control-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabaseSslEnforcementEnabled', {
      value: (config.database.enableSslConnection ?? true).toString(),
      description: 'Whether SSL connection enforcement is enabled',
      exportName: `${config.stackPrefix}-database-ssl-enforcement-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabaseEncryptionAtRestEnabled', {
      value: (config.database.enableEncryption ?? true).toString(),
      description: 'Whether encryption at rest is enabled',
      exportName: `${config.stackPrefix}-database-encryption-at-rest-enabled`,
    });

    new cdk.CfnOutput(this, 'DatabaseEncryptionInTransitEnabled', {
      value: (config.database.enableSslConnection ?? true).toString(),
      description: 'Whether encryption in transit (SSL/TLS) is enabled',
      exportName: `${config.stackPrefix}-database-encryption-in-transit-enabled`,
    });

    // IAM認証が有効な場合の追加出力
    if (this.databaseIam) {
      new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
        value: this.databaseIam.lambdaExecutionRole.roleArn,
        description: 'Lambda execution role ARN with database access',
        exportName: `${config.stackPrefix}-lambda-execution-role-arn`,
      });

      // IAMセットアップ関連の出力
      if (this.databaseIamSetup) {
        new cdk.CfnOutput(this, 'DatabaseIamSetupFunctionName', {
          value: this.databaseIamSetup.setupFunction.functionName,
          description: 'IAM database authentication setup Lambda function name',
          exportName: `${config.stackPrefix}-database-iam-setup-function-name`,
        });

        // 手動実行用のコマンド例を出力
        const manualCommand = this.databaseIamSetup.createManualInvokeCommand(
          this.secret.secretArn,
          this.cluster.clusterIdentifier,
          config.region
        );

        new cdk.CfnOutput(this, 'DatabaseIamSetupManualCommand', {
          value: manualCommand,
          description: 'Command to manually invoke IAM database setup (for troubleshooting)',
          exportName: `${config.stackPrefix}-database-iam-setup-manual-command`,
        });
      }
    }
  }

  /**
   * 環境設定からDatabaseConfigを生成するヘルパーメソッド
   */
  public static createDatabaseConfig(config: EnvironmentConfig): DatabaseConfig {
    return {
      minCapacity: config.database.minCapacity,
      maxCapacity: config.database.maxCapacity,
      multiAz: config.database.multiAz,
      backupRetention: config.database.backupRetentionDays || 7,
      deletionProtection: config.database.deletionProtection ?? false,
      performanceInsights: config.database.performanceInsights ?? true,
      monitoringInterval: config.database.monitoringInterval ?? 60,
      enableAuditLog: config.database.enableAuditLog ?? true,
      enableSlowQueryLog: config.database.enableSlowQueryLog ?? true,
      slowQueryLogThreshold: config.database.slowQueryLogThreshold ?? 1000,
      enableAutomaticSnapshots: config.database.enableAutomaticSnapshots ?? true,
      snapshotRetentionDays: config.database.snapshotRetentionDays || 7,
      preferredBackupWindow: config.database.preferredBackupWindow || '03:00-04:00',
      preferredMaintenanceWindow:
        config.database.preferredMaintenanceWindow || 'sun:04:00-sun:05:00',
    };
  }

  /**
   * データベース接続情報を取得するヘルパーメソッド
   */
  public getConnectionInfo() {
    return {
      endpoint: this.cluster.clusterEndpoint.hostname,
      readEndpoint: this.cluster.clusterReadEndpoint.hostname,
      port: this.cluster.clusterEndpoint.port,
      secretArn: this.secret.secretArn,
      securityGroupId: this.securityGroup.securityGroupId,
      clusterId: this.cluster.clusterIdentifier,
      encryptionKeyId: this.encryptionKey.keyId,
      encryptionKeyArn: this.encryptionKey.keyArn,
      iamAuthenticationEnabled: this.config.database.enableIamDatabaseAuthentication ?? true,
      lambdaExecutionRoleArn: this.databaseIam?.lambdaExecutionRole.roleArn,
      iamSetupFunctionArn: this.databaseIamSetup?.setupFunction.functionArn,
      iamSetupStatus: this.databaseIamSetup ? 'Configured' : 'Not Configured',
      // 監視・バックアップ情報
      performanceInsightsEnabled: this.config.database.performanceInsights ?? true,
      backupRetentionDays: this.config.database.backupRetentionDays || 7,
      backupWindow: this.config.database.preferredBackupWindow || '03:00-04:00',
      maintenanceWindow: this.config.database.preferredMaintenanceWindow || 'sun:04:00-sun:05:00',
      automaticSnapshotsEnabled: this.config.database.enableAutomaticSnapshots ?? true,
      snapshotRetentionDays: this.config.database.snapshotRetentionDays,
      monitoringEnabled: this.config.monitoring?.enableAlerts ?? false,
      alertTopicArn: this.alertTopic?.topicArn,
      alarmsCount: this.alarms.length,
      auditLogEnabled: this.config.database.enableAuditLog ?? true,
      slowQueryLogEnabled: this.config.database.enableSlowQueryLog ?? true,
      slowQueryLogThreshold: this.config.database.slowQueryLogThreshold || 1000,
      networkAccessControlEnabled: this.config.network.enableVpcEndpoints,
      sslEnforcementEnabled: this.config.database.enableSslConnection ?? true,
      encryptionAtRestEnabled: this.config.database.enableEncryption ?? true,
      encryptionInTransitEnabled: this.config.database.enableSslConnection ?? true,
    };
  }

  /**
   * ログ保持期間を適切なRetentionDays値に変換するヘルパーメソッド
   */
  private getLogRetentionDays(days?: number): logs.RetentionDays {
    if (!days) return logs.RetentionDays.ONE_MONTH;

    // 利用可能なRetentionDays値にマッピング
    const retentionMapping: { [key: number]: logs.RetentionDays } = {
      1: logs.RetentionDays.ONE_DAY,
      3: logs.RetentionDays.THREE_DAYS,
      5: logs.RetentionDays.FIVE_DAYS,
      7: logs.RetentionDays.ONE_WEEK,
      14: logs.RetentionDays.TWO_WEEKS,
      30: logs.RetentionDays.ONE_MONTH,
      60: logs.RetentionDays.TWO_MONTHS,
      90: logs.RetentionDays.THREE_MONTHS,
      120: logs.RetentionDays.FOUR_MONTHS,
      150: logs.RetentionDays.FIVE_MONTHS,
      180: logs.RetentionDays.SIX_MONTHS,
      365: logs.RetentionDays.ONE_YEAR,
      400: logs.RetentionDays.THIRTEEN_MONTHS,
      545: logs.RetentionDays.EIGHTEEN_MONTHS,
      731: logs.RetentionDays.TWO_YEARS,
      1827: logs.RetentionDays.FIVE_YEARS,
      3653: logs.RetentionDays.TEN_YEARS,
    };

    return retentionMapping[days] || logs.RetentionDays.ONE_MONTH;
  }

  /**
   * ネットワークアクセス制御強化（要件6.4対応）
   */
  private setupNetworkAccessControl(vpc: ec2.IVpc): void {
    // VPCエンドポイント設定（本番・ステージング環境のみ）
    if (this.config.network.enableVpcEndpoints) {
      // RDS VPCエンドポイント
      const rdsVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'RdsVpcEndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.RDS,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        securityGroups: [this.securityGroup],
      });

      // Secrets Manager VPCエンドポイント
      const secretsVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerVpcEndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        securityGroups: [this.securityGroup],
      });

      // KMS VPCエンドポイント
      const kmsVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'KmsVpcEndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.KMS,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        securityGroups: [this.securityGroup],
      });

      // CloudWatch Logs VPCエンドポイント
      const logsVpcEndpoint = new ec2.InterfaceVpcEndpoint(this, 'CloudWatchLogsVpcEndpoint', {
        vpc,
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: {
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        securityGroups: [this.securityGroup],
      });

      console.log('✅ VPCエンドポイントが設定されました（ネットワークアクセス制御強化）');
    }

    // ネットワークACL強化（プライベートサブネット用）
    const privateSubnets = vpc.privateSubnets;
    if (privateSubnets.length > 0) {
      const databaseNacl = new ec2.NetworkAcl(this, 'DatabaseNetworkAcl', {
        vpc,
        networkAclName: `${this.config.stackPrefix}-database-nacl`,
      });

      // インバウンドルール - PostgreSQLポート（5432）のみ許可
      databaseNacl.addEntry('DatabaseInboundPostgreSQL', {
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(this.config.network.vpcCidr || '10.0.0.0/16'),
        traffic: ec2.AclTraffic.tcpPort(5432),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });

      // インバウンドルール - HTTPS（443）許可（VPCエンドポイント用）
      databaseNacl.addEntry('DatabaseInboundHTTPS', {
        ruleNumber: 110,
        cidr: ec2.AclCidr.ipv4(this.config.network.vpcCidr || '10.0.0.0/16'),
        traffic: ec2.AclTraffic.tcpPort(443),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });

      // インバウンドルール - エフェメラルポート許可（レスポンス用）
      databaseNacl.addEntry('DatabaseInboundEphemeral', {
        ruleNumber: 120,
        cidr: ec2.AclCidr.ipv4(this.config.network.vpcCidr || '10.0.0.0/16'),
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
        direction: ec2.TrafficDirection.INGRESS,
        ruleAction: ec2.Action.ALLOW,
      });

      // アウトバウンドルール - PostgreSQLポート（5432）許可
      databaseNacl.addEntry('DatabaseOutboundPostgreSQL', {
        ruleNumber: 100,
        cidr: ec2.AclCidr.ipv4(this.config.network.vpcCidr || '10.0.0.0/16'),
        traffic: ec2.AclTraffic.tcpPort(5432),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
      });

      // アウトバウンドルール - HTTPS（443）許可（VPCエンドポイント用）
      databaseNacl.addEntry('DatabaseOutboundHTTPS', {
        ruleNumber: 110,
        cidr: ec2.AclCidr.ipv4(this.config.network.vpcCidr || '10.0.0.0/16'),
        traffic: ec2.AclTraffic.tcpPort(443),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
      });

      // アウトバウンドルール - エフェメラルポート許可（レスポンス用）
      databaseNacl.addEntry('DatabaseOutboundEphemeral', {
        ruleNumber: 120,
        cidr: ec2.AclCidr.ipv4(this.config.network.vpcCidr || '10.0.0.0/16'),
        traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
        direction: ec2.TrafficDirection.EGRESS,
        ruleAction: ec2.Action.ALLOW,
      });

      // プライベートサブネットにNACLを関連付け
      privateSubnets.forEach((subnet, index) => {
        new ec2.SubnetNetworkAclAssociation(this, `DatabaseNaclAssociation${index}`, {
          subnet,
          networkAcl: databaseNacl,
        });
      });

      console.log('✅ ネットワークACLが設定されました（データベースアクセス制御強化）');
    }
  }

  /**
   * SSL接続強制設定（要件6.1対応）
   */
  private setupSslEnforcement(): void {
    if (!this.config.database.enableSslConnection) {
      return;
    }

    // SSL接続強制のためのカスタムリソース
    const sslEnforcementRole = new iam.Role(this, 'SslEnforcementRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        RdsModifyPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'rds:ModifyDBCluster',
                'rds:DescribeDBClusters',
                'rds:ModifyDBClusterParameterGroup',
                'rds:DescribeDBClusterParameterGroups',
                'rds:DescribeDBClusterParameters',
              ],
              resources: [
                this.cluster.clusterArn,
                `arn:aws:rds:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:cluster-pg:*`,
              ],
            }),
          ],
        }),
      },
    });

    // SSL強制設定用Lambda関数
    const sslEnforcementFunction = new lambda.Function(this, 'SslEnforcementFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      role: sslEnforcementRole,
      timeout: cdk.Duration.minutes(5),
      code: lambda.Code.fromInline(`
import boto3
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """
    SSL接続を強制するためのカスタムリソース
    要件6.1: 転送時暗号化の強制
    """
    try:
        rds_client = boto3.client('rds')

        cluster_id = event['ResourceProperties']['ClusterId']

        if event['RequestType'] == 'Create' or event['RequestType'] == 'Update':
            logger.info(f"SSL接続強制設定を適用中: {cluster_id}")

            # クラスターの詳細を取得
            response = rds_client.describe_db_clusters(
                DBClusterIdentifier=cluster_id
            )

            if response['DBClusters']:
                cluster = response['DBClusters'][0]
                parameter_group_name = cluster.get('DBClusterParameterGroup')

                if parameter_group_name:
                    # パラメータグループでSSL強制設定
                    rds_client.modify_db_cluster_parameter_group(
                        DBClusterParameterGroupName=parameter_group_name,
                        Parameters=[
                            {
                                'ParameterName': 'rds.force_ssl',
                                'ParameterValue': '1',
                                'ApplyMethod': 'immediate'
                            }
                        ]
                    )
                    logger.info(f"SSL強制設定をパラメータグループ {parameter_group_name} に適用しました")
                else:
                    logger.warning("パラメータグループが見つかりませんでした")

            logger.info("SSL接続強制設定が完了しました")

        return {
            'Status': 'SUCCESS',
            'PhysicalResourceId': f'ssl-enforcement-{cluster_id}',
            'Data': {
                'SslEnforced': 'true'
            }
        }

    except Exception as e:
        logger.error(f"SSL接続強制設定でエラーが発生: {str(e)}")
        return {
            'Status': 'FAILED',
            'Reason': str(e),
            'PhysicalResourceId': f'ssl-enforcement-{cluster_id}'
        }
`),
    });

    // カスタムリソース
    const sslEnforcementCustomResource = new cdk.CustomResource(
      this,
      'SslEnforcementCustomResource',
      {
        serviceToken: sslEnforcementFunction.functionArn,
        properties: {
          ClusterId: this.cluster.clusterIdentifier,
        },
      }
    );

    // 依存関係を設定
    sslEnforcementCustomResource.node.addDependency(this.cluster);
    sslEnforcementCustomResource.node.addDependency(this.clusterParameterGroup);

    console.log('✅ SSL接続強制設定が適用されました（要件6.1対応）');
  }

  /**
   * CloudWatch監視とアラート設定（要件3.2, 3.3対応）
   */
  private setupMonitoringAndAlerts(): void {
    // 本番環境またはステージング環境でのみアラートを設定
    if (!this.config.monitoring?.enableAlerts) {
      return;
    }

    // SNSトピック作成（アラート通知用）
    this.alertTopic = new sns.Topic(this, 'DatabaseAlertTopic', {
      displayName: `${this.config.stackPrefix} Database Alerts`,
      topicName: `${this.config.stackPrefix}-database-alerts`,
    });

    // メール通知設定（設定されている場合）
    if (this.config.monitoring.alertEmail) {
      this.alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(this.config.monitoring.alertEmail)
      );
    }

    // 重要度: Critical - データベース接続不可
    const connectionFailureAlarm = new cloudwatch.Alarm(this, 'DatabaseConnectionFailure', {
      alarmName: `${this.config.stackPrefix}-database-connection-failure`,
      alarmDescription: 'Database connection failures detected',
      metric: this.cluster.metricDatabaseConnections({
        statistic: 'Average',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 0,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    connectionFailureAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(connectionFailureAlarm);

    // 重要度: Critical - CPU使用率 > 90%
    const highCpuAlarm = new cloudwatch.Alarm(this, 'DatabaseHighCpu', {
      alarmName: `${this.config.stackPrefix}-database-high-cpu`,
      alarmDescription: 'Database CPU utilization is critically high (>90%)',
      metric: this.cluster.metricCPUUtilization({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 90,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    highCpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(highCpuAlarm);

    // 重要度: Critical - 接続数 > 最大値の90%
    const maxConnections = this.getMaxConnectionsForCapacity(this.config.database.maxCapacity);
    const highConnectionsAlarm = new cloudwatch.Alarm(this, 'DatabaseHighConnections', {
      alarmName: `${this.config.stackPrefix}-database-high-connections`,
      alarmDescription: `Database connections exceed 90% of maximum (>${Math.floor(maxConnections * 0.9)})`,
      metric: this.cluster.metricDatabaseConnections({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: Math.floor(maxConnections * 0.9),
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    highConnectionsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(highConnectionsAlarm);

    // 重要度: Warning - CPU使用率 > 80%
    const warningCpuAlarm = new cloudwatch.Alarm(this, 'DatabaseWarningCpu', {
      alarmName: `${this.config.stackPrefix}-database-warning-cpu`,
      alarmDescription: 'Database CPU utilization is high (>80%)',
      metric: this.cluster.metricCPUUtilization({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    warningCpuAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(warningCpuAlarm);

    // 重要度: Warning - 読み取りレイテンシ > 1秒
    const readLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'ReadLatency',
      dimensionsMap: {
        DBClusterIdentifier: this.cluster.clusterIdentifier,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const highReadLatencyAlarm = new cloudwatch.Alarm(this, 'DatabaseHighReadLatency', {
      alarmName: `${this.config.stackPrefix}-database-high-read-latency`,
      alarmDescription: 'Database read latency is high (>1000ms)',
      metric: readLatencyMetric,
      threshold: 1.0, // 1秒
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    highReadLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(highReadLatencyAlarm);

    // 重要度: Warning - 書き込みレイテンシ > 1秒
    const writeLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'WriteLatency',
      dimensionsMap: {
        DBClusterIdentifier: this.cluster.clusterIdentifier,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const highWriteLatencyAlarm = new cloudwatch.Alarm(this, 'DatabaseHighWriteLatency', {
      alarmName: `${this.config.stackPrefix}-database-high-write-latency`,
      alarmDescription: 'Database write latency is high (>1000ms)',
      metric: writeLatencyMetric,
      threshold: 1.0, // 1秒
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    highWriteLatencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(highWriteLatencyAlarm);

    // 重要度: Warning - 接続数 > 最大値の70%
    const warningConnectionsAlarm = new cloudwatch.Alarm(this, 'DatabaseWarningConnections', {
      alarmName: `${this.config.stackPrefix}-database-warning-connections`,
      alarmDescription: `Database connections exceed 70% of maximum (>${Math.floor(maxConnections * 0.7)})`,
      metric: this.cluster.metricDatabaseConnections({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: Math.floor(maxConnections * 0.7),
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    warningConnectionsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(warningConnectionsAlarm);

    // Serverless V2 ACU使用量監視（要件3.2対応）
    const serverlessCapacityMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'ServerlessDatabaseCapacity',
      dimensionsMap: {
        DBClusterIdentifier: this.cluster.clusterIdentifier,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const highCapacityAlarm = new cloudwatch.Alarm(this, 'DatabaseHighCapacity', {
      alarmName: `${this.config.stackPrefix}-database-high-capacity`,
      alarmDescription: `Database capacity usage is high (>${this.config.database.maxCapacity * 0.8} ACU)`,
      metric: serverlessCapacityMetric,
      threshold: this.config.database.maxCapacity * 0.8,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    highCapacityAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(highCapacityAlarm);

    // バックアップ失敗監視（要件3.1対応）
    const backupFailureMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'BackupRetentionPeriodStorageUsed',
      dimensionsMap: {
        DBClusterIdentifier: this.cluster.clusterIdentifier,
      },
      statistic: 'Average',
      period: cdk.Duration.hours(1),
    });

    // バックアップストレージ使用量が0の場合はバックアップが失敗している可能性
    const backupFailureAlarm = new cloudwatch.Alarm(this, 'DatabaseBackupFailure', {
      alarmName: `${this.config.stackPrefix}-database-backup-failure`,
      alarmDescription: 'Database backup may have failed (no backup storage usage detected)',
      metric: backupFailureMetric,
      threshold: 0,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    backupFailureAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(backupFailureAlarm);

    // データベース可用性監視（要件3.2対応）
    const databaseAvailabilityMetric = new cloudwatch.Metric({
      namespace: 'AWS/RDS',
      metricName: 'DatabaseConnections',
      dimensionsMap: {
        DBClusterIdentifier: this.cluster.clusterIdentifier,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    // データベース接続が完全に失われた場合のアラーム
    const databaseUnavailableAlarm = new cloudwatch.Alarm(this, 'DatabaseUnavailable', {
      alarmName: `${this.config.stackPrefix}-database-unavailable`,
      alarmDescription: 'Database is completely unavailable (no connections detected)',
      metric: databaseAvailabilityMetric,
      threshold: 0,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    databaseUnavailableAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    this.alarms.push(databaseUnavailableAlarm);

    // ログエラー監視（要件3.2対応）
    if (this.config.database.enableAuditLog) {
      const logErrorMetric = new cloudwatch.Metric({
        namespace: 'AWS/Logs',
        metricName: 'ErrorCount',
        dimensionsMap: {
          LogGroupName: `/aws/rds/cluster/${this.config.stackPrefix}-aurora-postgresql/postgresql`,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      });

      const logErrorAlarm = new cloudwatch.Alarm(this, 'DatabaseLogErrors', {
        alarmName: `${this.config.stackPrefix}-database-log-errors`,
        alarmDescription: 'High number of database errors detected in logs',
        metric: logErrorMetric,
        threshold: 10, // 5分間で10個以上のエラー
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      logErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
      this.alarms.push(logErrorAlarm);
    }

    // CloudWatchダッシュボード作成（要件3.2対応）
    this.createDashboard();
  }

  /**
   * CloudWatchダッシュボード作成（要件3.2対応）
   */
  private createDashboard(): void {
    const dashboard = new cloudwatch.Dashboard(this, 'DatabaseDashboard', {
      dashboardName: `${this.config.stackPrefix}-database-monitoring`,
    });

    // データベース接続数ウィジェット
    const connectionsWidget = new cloudwatch.GraphWidget({
      title: 'Database Connections',
      left: [
        this.cluster.metricDatabaseConnections({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
      ],
      width: 12,
      height: 6,
    });

    // CPU使用率ウィジェット
    const cpuWidget = new cloudwatch.GraphWidget({
      title: 'CPU Utilization',
      left: [
        this.cluster.metricCPUUtilization({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
      ],
      width: 12,
      height: 6,
    });

    // Serverless V2 ACU使用量ウィジェット
    const capacityWidget = new cloudwatch.GraphWidget({
      title: 'Serverless Database Capacity (ACU)',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'ServerlessDatabaseCapacity',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
      ],
      width: 12,
      height: 6,
    });

    // レイテンシウィジェット
    const latencyWidget = new cloudwatch.GraphWidget({
      title: 'Database Latency',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'ReadLatency',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          label: 'Read Latency',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'WriteLatency',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          label: 'Write Latency',
        }),
      ],
      width: 12,
      height: 6,
    });

    // IOPS ウィジェット
    const iopsWidget = new cloudwatch.GraphWidget({
      title: 'Database IOPS',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'ReadIOPS',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          label: 'Read IOPS',
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'WriteIOPS',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
          label: 'Write IOPS',
        }),
      ],
      width: 12,
      height: 6,
    });

    // バックアップストレージ使用量ウィジェット
    const backupWidget = new cloudwatch.GraphWidget({
      title: 'Backup Storage Usage',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/RDS',
          metricName: 'BackupRetentionPeriodStorageUsed',
          dimensionsMap: {
            DBClusterIdentifier: this.cluster.clusterIdentifier,
          },
          statistic: 'Average',
          period: cdk.Duration.hours(1),
        }),
      ],
      width: 12,
      height: 6,
    });

    // アラーム状態ウィジェット
    const alarmsWidget = new cloudwatch.AlarmStatusWidget({
      title: 'Database Alarms',
      alarms: this.alarms,
      width: 24,
      height: 6,
    });

    // ダッシュボードにウィジェットを追加
    dashboard.addWidgets(
      connectionsWidget,
      cpuWidget,
      capacityWidget,
      latencyWidget,
      iopsWidget,
      backupWidget,
      alarmsWidget
    );
  }

  /**
   * ACU容量に基づく最大接続数を計算
   */
  private getMaxConnectionsForCapacity(maxCapacity: number): number {
    // Aurora Serverless V2の接続数計算式（概算）
    // 1 ACU ≈ 2GB RAM, PostgreSQLの接続数 ≈ RAM(MB) / 9.5
    const ramMB = maxCapacity * 2 * 1024; // ACU * 2GB * 1024MB
    return Math.min(Math.floor(ramMB / 9.5), 5000); // 最大5000接続
  }
}
