import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface DatabaseConstructProps {
  vpc: ec2.IVpc;
  config: EnvironmentConfig;
}

export class DatabaseConstruct extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly secret: secretsmanager.ISecret;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    const { vpc, config } = props;

    // データベース用セキュリティグループ
    this.securityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for Aurora PostgreSQL database',
      allowAllOutbound: false,
    });

    // Lambda関数からのアクセスを許可するセキュリティグループ
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions accessing database',
    });

    // データベースセキュリティグループにLambdaからのアクセスを許可
    this.securityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda access to PostgreSQL'
    );

    // データベース認証情報のシークレット
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      description: 'Aurora PostgreSQL database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // サブネットグループ
    const subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description: 'Subnet group for Aurora PostgreSQL database',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });

    // パラメータグループ
    const parameterGroup = new rds.ParameterGroup(this, 'DatabaseParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      description: 'Parameter group for Aurora PostgreSQL 15.4',
      parameters: {
        // 接続とメモリ設定
        shared_preload_libraries: 'pg_stat_statements',
        log_statement: 'all',
        log_min_duration_statement: '1000', // 1秒以上のクエリをログ出力
        log_connections: '1',
        log_disconnections: '1',
        // パフォーマンス設定
        effective_cache_size: '1GB',
        maintenance_work_mem: '256MB',
        checkpoint_completion_target: '0.9',
        wal_buffers: '16MB',
        default_statistics_target: '100',
      },
    });

    // CloudWatch Logs グループ
    const logGroup = new logs.LogGroup(this, 'DatabaseLogGroup', {
      logGroupName: `/aws/rds/cluster/${config.stackPrefix}-aurora-postgresql/postgresql`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Aurora Serverless V2 クラスター
    this.cluster = new rds.DatabaseCluster(this, 'DatabaseCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      writer: rds.ClusterInstance.serverlessV2('writer', {
        scaleWithWriter: true,
      }),
      readers: [], // 開発環境では読み取り専用インスタンスは不要
      serverlessV2MinCapacity: config.database.minCapacity,
      serverlessV2MaxCapacity: config.database.maxCapacity,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.securityGroup],
      subnetGroup,
      parameterGroup,
      defaultDatabaseName: config.database.databaseName,

      // バックアップ設定
      backup: {
        retention: cdk.Duration.days(config.database.backupRetentionDays || 7),
        preferredWindow: '03:00-04:00', // JST 12:00-13:00
      },

      // メンテナンス設定
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00', // JST 日曜 13:00-14:00

      // 監視設定
      monitoringInterval: cdk.Duration.seconds(60),
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,

      // ログ設定
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,

      // セキュリティ設定
      storageEncrypted: true,
      deletionProtection: config.database.deletionProtection ?? false,

      // 削除設定（開発環境用）
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.cluster).add(key, value);
        cdk.Tags.of(this.secret).add(key, value);
        cdk.Tags.of(this.securityGroup).add(key, value);
      });
    }

    // 出力
    new cdk.CfnOutput(this, 'DatabaseClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      description: 'Aurora PostgreSQL cluster endpoint',
      exportName: `${config.stackPrefix}-database-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.secret.secretArn,
      description: 'Database credentials secret ARN',
      exportName: `${config.stackPrefix}-database-secret-arn`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: lambdaSecurityGroup.securityGroupId,
      description: 'Security group ID for Lambda functions',
      exportName: `${config.stackPrefix}-lambda-security-group-id`,
    });
  }
}
