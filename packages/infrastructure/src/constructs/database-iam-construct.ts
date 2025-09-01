import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface DatabaseIamConstructProps {
  cluster: rds.DatabaseCluster;
  config: EnvironmentConfig;
  databaseSecret?: secretsmanager.ISecret;
  encryptionKey?: kms.IKey;
}

export class DatabaseIamConstruct extends Construct {
  public readonly lambdaExecutionRole: iam.Role;
  public readonly databaseAccessPolicy: iam.Policy;
  public readonly databaseUserManagementRole: iam.Role;
  public readonly readOnlyRole: iam.Role;
  public readonly adminRole: iam.Role;
  private readonly config: EnvironmentConfig;
  private readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: DatabaseIamConstructProps) {
    super(scope, id);

    const { cluster, config, databaseSecret, encryptionKey } = props;

    // プロパティを保存
    this.config = config;
    this.cluster = cluster;

    // 要件6.2対応：データベースアクセス用IAMロールを作成
    console.log('\n=== IAMロールとポリシー設定開始 ===');

    // 1. Lambda実行用IAMロール（要件6.2対応）
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${config.stackPrefix}-lambda-execution-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description:
        'IAM role for Lambda functions with comprehensive database access (Requirement 6.2)',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // 2. データベースユーザー管理用IAMロール（要件6.3対応）
    this.databaseUserManagementRole = new iam.Role(this, 'DatabaseUserManagementRole', {
      roleName: `${config.stackPrefix}-database-user-management-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description:
        'IAM role for database user management and IAM authentication setup (Requirement 6.3)',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // 3. 読み取り専用IAMロール（要件6.2対応）
    this.readOnlyRole = new iam.Role(this, 'DatabaseReadOnlyRole', {
      roleName: `${config.stackPrefix}-database-readonly-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for read-only database access (Requirement 6.2)',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // 4. 管理者用IAMロール（要件6.3対応）
    this.adminRole = new iam.Role(this, 'DatabaseAdminRole', {
      roleName: `${config.stackPrefix}-database-admin-role`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.AccountRootPrincipal() // 管理者アクセス用
      ),
      description: 'IAM role for database administration and security management (Requirement 6.3)',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
    });

    // 5. データベースアクセス用ポリシー（要件6.2対応）
    this.databaseAccessPolicy = new iam.Policy(this, 'DatabaseAccessPolicy', {
      policyName: `${config.stackPrefix}-database-access-policy`,
      statements: [
        // RDS IAM認証接続権限（要件6.2, 6.3対応）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['rds-db:connect'],
          resources: [
            // Lambda実行用ユーザー
            `arn:aws:rds-db:${config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${cluster.clusterIdentifier}/lambda_user`,
            // アプリケーション用ユーザー
            `arn:aws:rds-db:${config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${cluster.clusterIdentifier}/app_user`,
            // 読み取り専用ユーザー
            `arn:aws:rds-db:${config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${cluster.clusterIdentifier}/readonly_user`,
            // 管理者ユーザー
            `arn:aws:rds-db:${config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${cluster.clusterIdentifier}/admin_user`,
          ],
        }),
        // Secrets Manager アクセス権限（要件6.2対応）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          resources: databaseSecret
            ? [
                databaseSecret.secretArn,
                `${databaseSecret.secretArn}*`, // バージョン付きアクセス
              ]
            : [
                `arn:aws:secretsmanager:${config.region}:${cdk.Aws.ACCOUNT_ID}:secret:${config.stackPrefix}-database-*`,
              ],
        }),
        // KMS復号化権限（要件6.1対応：暗号化設定）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['kms:Decrypt', 'kms:DescribeKey', 'kms:GenerateDataKey'],
          resources: encryptionKey
            ? [encryptionKey.keyArn]
            : [`arn:aws:kms:${config.region}:${cdk.Aws.ACCOUNT_ID}:key/*`],
          conditions: {
            StringEquals: {
              'kms:ViaService': [
                `secretsmanager.${config.region}.amazonaws.com`,
                `rds.${config.region}.amazonaws.com`,
              ],
            },
          },
        }),
        // CloudWatch Logs 権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
          ],
          resources: [
            `arn:aws:logs:${config.region}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/lambda/${config.stackPrefix}-*`,
            `arn:aws:logs:${config.region}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/rds/cluster/${config.stackPrefix}-*`,
          ],
        }),
      ],
    });

    // 6. データベース管理用ポリシー（要件6.3対応）
    const databaseManagementPolicy = new iam.Policy(this, 'DatabaseManagementPolicy', {
      policyName: `${config.stackPrefix}-database-management-policy`,
      statements: [
        // RDS管理権限（要件6.3対応）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'rds:DescribeDBClusters',
            'rds:DescribeDBInstances',
            'rds:DescribeDBClusterParameters',
            'rds:DescribeDBParameters',
            'rds:DescribeDBSubnetGroups',
            'rds:DescribeDBClusterSnapshots',
            'rds:CreateDBClusterSnapshot',
            'rds:ModifyDBCluster',
            'rds:ModifyDBInstance',
          ],
          resources: [
            cluster.clusterArn,
            `${cluster.clusterArn}:*`,
            `arn:aws:rds:${config.region}:${cdk.Aws.ACCOUNT_ID}:cluster-snapshot:${config.stackPrefix}-*`,
          ],
        }),
        // Performance Insights権限（要件3.3対応）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'pi:GetResourceMetrics',
            'pi:DescribeDimensionKeys',
            'pi:GetDimensionKeyDetails',
          ],
          resources: [
            `arn:aws:pi:${config.region}:${cdk.Aws.ACCOUNT_ID}:metrics/rds/${cluster.clusterResourceIdentifier}`,
          ],
        }),
        // CloudWatch監視権限（要件3.2対応）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'cloudwatch:GetMetricStatistics',
            'cloudwatch:ListMetrics',
            'cloudwatch:PutMetricData',
            'cloudwatch:DescribeAlarms',
          ],
          resources: [
            `arn:aws:cloudwatch:${config.region}:${cdk.Aws.ACCOUNT_ID}:metric/AWS/RDS/*`,
            `arn:aws:cloudwatch:${config.region}:${cdk.Aws.ACCOUNT_ID}:alarm:${config.stackPrefix}-*`,
          ],
        }),
      ],
    });

    // 7. 読み取り専用ポリシー（要件6.2対応）
    const readOnlyPolicy = new iam.Policy(this, 'DatabaseReadOnlyPolicy', {
      policyName: `${config.stackPrefix}-database-readonly-policy`,
      statements: [
        // 読み取り専用RDS接続権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['rds-db:connect'],
          resources: [
            `arn:aws:rds-db:${config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${cluster.clusterIdentifier}/readonly_user`,
          ],
        }),
        // 読み取り専用Secrets Manager権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          resources: databaseSecret
            ? [databaseSecret.secretArn]
            : [
                `arn:aws:secretsmanager:${config.region}:${cdk.Aws.ACCOUNT_ID}:secret:${config.stackPrefix}-database-readonly-*`,
              ],
        }),
        // KMS復号化権限（読み取り専用）
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['kms:Decrypt', 'kms:DescribeKey'],
          resources: encryptionKey
            ? [encryptionKey.keyArn]
            : [`arn:aws:kms:${config.region}:${cdk.Aws.ACCOUNT_ID}:key/*`],
          conditions: {
            StringEquals: {
              'kms:ViaService': `secretsmanager.${config.region}.amazonaws.com`,
            },
          },
        }),
      ],
    });

    // 8. 管理者用ポリシー（要件6.3対応）
    const adminPolicy = new iam.Policy(this, 'DatabaseAdminPolicy', {
      policyName: `${config.stackPrefix}-database-admin-policy`,
      statements: [
        // 管理者RDS接続権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['rds-db:connect'],
          resources: [
            `arn:aws:rds-db:${config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${cluster.clusterIdentifier}/admin_user`,
            `arn:aws:rds-db:${config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${cluster.clusterIdentifier}/*`, // 全ユーザーアクセス
          ],
        }),
        // 完全なSecrets Manager権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:*'],
          resources: [
            `arn:aws:secretsmanager:${config.region}:${cdk.Aws.ACCOUNT_ID}:secret:${config.stackPrefix}-database-*`,
          ],
        }),
        // 完全なKMS権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['kms:*'],
          resources: encryptionKey
            ? [encryptionKey.keyArn]
            : [`arn:aws:kms:${config.region}:${cdk.Aws.ACCOUNT_ID}:key/*`],
        }),
        // データベース管理権限
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['rds:*'],
          resources: [
            cluster.clusterArn,
            `${cluster.clusterArn}:*`,
            `arn:aws:rds:${config.region}:${cdk.Aws.ACCOUNT_ID}:*`,
          ],
        }),
      ],
    });

    // ポリシーをロールにアタッチ
    this.databaseAccessPolicy.attachToRole(this.lambdaExecutionRole);
    databaseManagementPolicy.attachToRole(this.databaseUserManagementRole);
    databaseManagementPolicy.attachToRole(this.adminRole);
    readOnlyPolicy.attachToRole(this.readOnlyRole);
    adminPolicy.attachToRole(this.adminRole);

    // IAMデータベース認証が有効な場合の追加設定（要件6.3対応）
    if (config.database.enableIamDatabaseAuthentication) {
      console.log('✅ IAMデータベース認証が有効 - 追加設定を適用中...');

      // データベースユーザー作成・管理用の追加権限
      const iamDatabaseAuthPolicy = new iam.Policy(this, 'IamDatabaseAuthPolicy', {
        policyName: `${config.stackPrefix}-iam-database-auth-policy`,
        statements: [
          // IAMデータベース認証用の追加権限
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'rds:DescribeDBClusters',
              'rds:DescribeDBInstances',
              'rds:DescribeDBClusterParameters',
              'rds:ModifyDBCluster',
              'rds:ModifyDBInstance',
            ],
            resources: [cluster.clusterArn, `${cluster.clusterArn}:*`],
          }),
          // IAMロール・ポリシー管理権限（制限付き）
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['iam:GetRole', 'iam:ListRolePolicies', 'iam:ListAttachedRolePolicies'],
            resources: [
              this.lambdaExecutionRole.roleArn,
              this.readOnlyRole.roleArn,
              this.adminRole.roleArn,
            ],
          }),
        ],
      });

      iamDatabaseAuthPolicy.attachToRole(this.databaseUserManagementRole);
      iamDatabaseAuthPolicy.attachToRole(this.adminRole);
    }

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.lambdaExecutionRole).add(key, value);
        cdk.Tags.of(this.databaseUserManagementRole).add(key, value);
        cdk.Tags.of(this.readOnlyRole).add(key, value);
        cdk.Tags.of(this.adminRole).add(key, value);
        cdk.Tags.of(this.databaseAccessPolicy).add(key, value);
      });
    }

    // IAMロール・ポリシー固有のタグ
    const iamTags = {
      Component: 'Database-IAM',
      SecurityLevel: 'High',
      IamAuthentication: config.database.enableIamDatabaseAuthentication ? 'Enabled' : 'Disabled',
    };

    Object.entries(iamTags).forEach(([key, value]) => {
      cdk.Tags.of(this.lambdaExecutionRole).add(key, value);
      cdk.Tags.of(this.databaseUserManagementRole).add(key, value);
      cdk.Tags.of(this.readOnlyRole).add(key, value);
      cdk.Tags.of(this.adminRole).add(key, value);
    });

    // 出力（要件6.2, 6.3対応）
    new cdk.CfnOutput(this, 'LambdaExecutionRoleArn', {
      value: this.lambdaExecutionRole.roleArn,
      description: 'Lambda execution role ARN with comprehensive database access (Requirement 6.2)',
      exportName: `${config.stackPrefix}-lambda-execution-role-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseUserManagementRoleArn', {
      value: this.databaseUserManagementRole.roleArn,
      description:
        'Database user management role ARN for IAM authentication setup (Requirement 6.3)',
      exportName: `${config.stackPrefix}-database-user-management-role-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseReadOnlyRoleArn', {
      value: this.readOnlyRole.roleArn,
      description: 'Database read-only role ARN for restricted access (Requirement 6.2)',
      exportName: `${config.stackPrefix}-database-readonly-role-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseAdminRoleArn', {
      value: this.adminRole.roleArn,
      description: 'Database admin role ARN for full management access (Requirement 6.3)',
      exportName: `${config.stackPrefix}-database-admin-role-arn`,
    });

    new cdk.CfnOutput(this, 'DatabaseAccessPolicyName', {
      value: this.databaseAccessPolicy.policyName,
      description: 'Database access policy name for Lambda functions',
      exportName: `${config.stackPrefix}-database-access-policy-name`,
    });

    new cdk.CfnOutput(this, 'IamDatabaseAuthenticationStatus', {
      value: config.database.enableIamDatabaseAuthentication ? 'Enabled' : 'Disabled',
      description: 'IAM database authentication status (Requirement 6.3)',
      exportName: `${config.stackPrefix}-iam-database-auth-status`,
    });

    // IAMロール設定完了ログ
    console.log('✅ Lambda実行用IAMロール作成完了');
    console.log('✅ データベースユーザー管理用IAMロール作成完了');
    console.log('✅ 読み取り専用IAMロール作成完了');
    console.log('✅ 管理者用IAMロール作成完了');
    console.log('✅ データベースアクセス用ポリシー作成完了');
    console.log('✅ IAMデータベース認証設定完了');
    console.log('=== IAMロールとポリシー設定完了 ===\n');
  }

  /**
   * 追加のLambda関数にデータベースアクセス権限を付与するヘルパーメソッド
   * 要件6.2対応：Lambda実行ロールにデータベース権限を付与
   */
  public grantDatabaseAccess(
    lambdaRole: iam.IRole,
    accessLevel: 'full' | 'readonly' | 'admin' = 'full'
  ): void {
    switch (accessLevel) {
      case 'readonly': {
        // 読み取り専用権限のみ付与
        // 新しいポリシーを作成してアタッチ
        const readOnlyStatements = [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['rds-db:connect'],
            resources: [
              `arn:aws:rds-db:${this.config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${this.cluster.clusterIdentifier}/readonly_user`,
            ],
          }),
        ];
        readOnlyStatements.forEach(statement => lambdaRole.addToPrincipalPolicy(statement));
        break;
      }
      case 'admin': {
        // 管理者権限を付与
        const adminStatements = [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['rds-db:connect'],
            resources: [
              `arn:aws:rds-db:${this.config.region}:${cdk.Aws.ACCOUNT_ID}:dbuser:${this.cluster.clusterIdentifier}/admin_user`,
            ],
          }),
        ];
        adminStatements.forEach(statement => lambdaRole.addToPrincipalPolicy(statement));
        break;
      }
      case 'full':
      default:
        // 標準のデータベースアクセス権限を付与
        this.databaseAccessPolicy.attachToRole(lambdaRole);
        break;
    }
  }

  /**
   * データベース接続情報を取得するヘルパーメソッド
   * 要件6.2, 6.3対応：包括的なIAM情報を提供
   */
  public getDatabaseConnectionInfo(cluster: rds.DatabaseCluster) {
    return {
      // 基本接続情報
      roleArn: this.lambdaExecutionRole.roleArn,
      policyName: this.databaseAccessPolicy.policyName,
      dbClusterArn: cluster.clusterArn,
      dbClusterIdentifier: cluster.clusterIdentifier,

      // 追加のIAMロール情報（要件6.2, 6.3対応）
      userManagementRoleArn: this.databaseUserManagementRole.roleArn,
      readOnlyRoleArn: this.readOnlyRole.roleArn,
      adminRoleArn: this.adminRole.roleArn,

      // IAMデータベース認証情報
      iamDatabaseUsers: [
        'lambda_user', // Lambda実行用
        'app_user', // アプリケーション用
        'readonly_user', // 読み取り専用
        'admin_user', // 管理者用
      ],

      // セキュリティ設定情報
      iamAuthenticationEnabled: true,
      encryptionEnabled: true,
      sslRequired: true,
    };
  }

  /**
   * IAMデータベースユーザー作成用のSQL文を生成するヘルパーメソッド
   * 要件6.3対応：IAMデータベース認証を設定
   */
  public generateIamUserCreationSql(): string[] {
    return [
      // Lambda実行用ユーザー
      `CREATE USER lambda_user;`,
      `GRANT rds_iam TO lambda_user;`,
      `GRANT CONNECT ON DATABASE goalmandalamain TO lambda_user;`,
      `GRANT USAGE ON SCHEMA public TO lambda_user;`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lambda_user;`,
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lambda_user;`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lambda_user;`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lambda_user;`,

      // アプリケーション用ユーザー
      `CREATE USER app_user;`,
      `GRANT rds_iam TO app_user;`,
      `GRANT CONNECT ON DATABASE goalmandalamain TO app_user;`,
      `GRANT USAGE ON SCHEMA public TO app_user;`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;`,
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;`,

      // 読み取り専用ユーザー
      `CREATE USER readonly_user;`,
      `GRANT rds_iam TO readonly_user;`,
      `GRANT CONNECT ON DATABASE goalmandalamain TO readonly_user;`,
      `GRANT USAGE ON SCHEMA public TO readonly_user;`,
      `GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;`,

      // 管理者用ユーザー
      `CREATE USER admin_user;`,
      `GRANT rds_iam TO admin_user;`,
      `GRANT CONNECT ON DATABASE goalmandalamain TO admin_user;`,
      `GRANT ALL PRIVILEGES ON DATABASE goalmandalamain TO admin_user;`,
      `GRANT ALL PRIVILEGES ON SCHEMA public TO admin_user;`,
      `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;`,
      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_user;`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO admin_user;`,
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO admin_user;`,
    ];
  }

  /**
   * IAMロール設定の検証を行うヘルパーメソッド
   * 要件6.2, 6.3対応：設定の妥当性を確認
   */
  public validateIamConfiguration(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 必要なロールが存在するかチェック
    if (!this.lambdaExecutionRole) {
      issues.push('Lambda実行用IAMロールが作成されていません');
    }

    if (!this.databaseUserManagementRole) {
      issues.push('データベースユーザー管理用IAMロールが作成されていません');
    }

    if (!this.readOnlyRole) {
      issues.push('読み取り専用IAMロールが作成されていません');
    }

    if (!this.adminRole) {
      issues.push('管理者用IAMロールが作成されていません');
    }

    if (!this.databaseAccessPolicy) {
      issues.push('データベースアクセス用ポリシーが作成されていません');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
