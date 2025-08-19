/**
 * DatabaseIamConstructのユニットテスト
 * 要件6.2, 6.3対応：IAMロールとポリシー設定のテスト
 */

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseIamConstruct } from './database-iam-construct';
import { EnvironmentConfig } from '../config/environment';

describe('DatabaseIamConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let cluster: rds.DatabaseCluster;
  let secret: secretsmanager.Secret;
  let encryptionKey: kms.Key;
  let config: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    // テスト用の設定
    config = {
      environment: 'test',
      region: 'ap-northeast-1',
      stackPrefix: 'goal-mandala-test',
      database: {
        minCapacity: 0.5,
        maxCapacity: 1.0,
        multiAz: false,
        backupRetentionDays: 1,
        deletionProtection: false,
        performanceInsights: false,
        monitoringInterval: 0,
        enableIamDatabaseAuthentication: true,
        enableEncryption: true,
        enableSslConnection: true,
        enableAuditLog: true,
        enableSlowQueryLog: true,
        slowQueryLogThreshold: 1000,
        databaseName: 'goalmandalamain',
      },
      tags: {
        Environment: 'test',
        Project: 'goal-mandala',
      },
    };

    // テスト用のVPC
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
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // テスト用の暗号化キー
    encryptionKey = new kms.Key(stack, 'TestKey');

    // テスト用のシークレット
    secret = new secretsmanager.Secret(stack, 'TestSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'postgres',
          engine: 'postgres',
          port: 5432,
          dbname: 'goalmandalamain',
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'`',
      },
      encryptionKey,
    });

    // テスト用のデータベースクラスター
    cluster = new rds.DatabaseCluster(stack, 'TestCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(secret),
      writer: rds.ClusterInstance.serverlessV2('writer'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      iamAuthentication: true,
    });
  });

  describe('IAMロール作成テスト（要件6.2対応）', () => {
    test('Lambda実行用IAMロールが正しく作成される', () => {
      // DatabaseIamConstructを作成
      const databaseIam = new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // Lambda実行用IAMロールが作成されることを確認
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-lambda-execution-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
      });

      // Lambda実行ロールが正しく設定されていることを確認
      expect(databaseIam.lambdaExecutionRole).toBeDefined();
      expect(databaseIam.lambdaExecutionRole.roleName).toBe(
        'goal-mandala-test-lambda-execution-role'
      );
    });

    test('読み取り専用IAMロールが正しく作成される', () => {
      // DatabaseIamConstructを作成
      const databaseIam = new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // 読み取り専用IAMロールが作成されることを確認
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-database-readonly-role',
      });

      // 読み取り専用ロールが正しく設定されていることを確認
      expect(databaseIam.readOnlyRole).toBeDefined();
      expect(databaseIam.readOnlyRole.roleName).toBe('goal-mandala-test-database-readonly-role');
    });

    test('管理者用IAMロールが正しく作成される', () => {
      // DatabaseIamConstructを作成
      const databaseIam = new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // 管理者用IAMロールが作成されることを確認
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-database-admin-role',
      });

      // 管理者ロールが正しく設定されていることを確認
      expect(databaseIam.adminRole).toBeDefined();
      expect(databaseIam.adminRole.roleName).toBe('goal-mandala-test-database-admin-role');
    });
  });

  describe('IAMポリシー作成テスト（要件6.2, 6.3対応）', () => {
    test('データベースアクセス用ポリシーが正しく作成される', () => {
      // DatabaseIamConstructを作成
      const databaseIam = new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // データベースアクセス用ポリシーが作成されることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-test-database-access-policy',
      });

      // ポリシーが正しく設定されていることを確認
      expect(databaseIam.databaseAccessPolicy).toBeDefined();
      expect(databaseIam.databaseAccessPolicy.policyName).toBe(
        'goal-mandala-test-database-access-policy'
      );
    });

    test('RDS接続権限が正しく設定される', () => {
      // DatabaseIamConstructを作成
      new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // RDS接続権限が含まれることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: ['rds-db:connect'],
              Resource: [
                {
                  'Fn::Sub': [
                    'arn:aws:rds-db:${AWS::Region}:${AWS::AccountId}:dbuser:${ClusterIdentifier}/lambda_user',
                    {
                      ClusterIdentifier: {
                        Ref: expect.any(String),
                      },
                    },
                  ],
                },
                expect.any(Object),
                expect.any(Object),
                expect.any(Object),
              ],
            },
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
          ],
        },
      });
    });

    test('Secrets Manager権限が正しく設定される', () => {
      // DatabaseIamConstructを作成
      new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // Secrets Manager権限が含まれることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            {
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              Resource: [
                {
                  Ref: expect.any(String),
                },
                expect.any(String),
              ],
            },
          ]),
        },
      });
    });

    test('KMS復号化権限が正しく設定される', () => {
      // DatabaseIamConstructを作成
      new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // KMS復号化権限が含まれることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            {
              Effect: 'Allow',
              Action: ['kms:Decrypt', 'kms:DescribeKey', 'kms:GenerateDataKey'],
              Resource: [
                {
                  'Fn::GetAtt': [expect.any(String), 'Arn'],
                },
              ],
              Condition: {
                StringEquals: {
                  'kms:ViaService': [
                    'secretsmanager.ap-northeast-1.amazonaws.com',
                    'rds.ap-northeast-1.amazonaws.com',
                  ],
                },
              },
            },
          ]),
        },
      });
    });
  });

  describe('IAMデータベース認証設定テスト（要件6.3対応）', () => {
    test('IAMデータベース認証が有効な場合の追加設定', () => {
      // DatabaseIamConstructを作成
      new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // IAMデータベース認証用の追加ポリシーが作成されることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-test-iam-database-auth-policy',
      });
    });

    test('IAMデータベース認証が無効な場合は追加設定されない', () => {
      // IAM認証を無効にした設定
      const configWithoutIam = {
        ...config,
        database: {
          ...config.database,
          enableIamDatabaseAuthentication: false,
        },
      };

      // DatabaseIamConstructを作成
      new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config: configWithoutIam,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // IAMデータベース認証用の追加ポリシーが作成されないことを確認
      template.resourceCountIs('AWS::IAM::Policy', 4); // 基本ポリシーのみ
    });
  });

  describe('ヘルパーメソッドテスト', () => {
    test('getDatabaseConnectionInfo が正しい情報を返す', () => {
      // DatabaseIamConstructを作成
      const databaseIam = new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // 接続情報を取得
      const connectionInfo = databaseIam.getDatabaseConnectionInfo(cluster);

      // 必要な情報が含まれていることを確認
      expect(connectionInfo).toEqual({
        roleArn: databaseIam.lambdaExecutionRole.roleArn,
        policyName: databaseIam.databaseAccessPolicy.policyName,
        dbClusterArn: cluster.clusterArn,
        dbClusterIdentifier: cluster.clusterIdentifier,
        userManagementRoleArn: databaseIam.databaseUserManagementRole.roleArn,
        readOnlyRoleArn: databaseIam.readOnlyRole.roleArn,
        adminRoleArn: databaseIam.adminRole.roleArn,
        iamDatabaseUsers: ['lambda_user', 'app_user', 'readonly_user', 'admin_user'],
        iamAuthenticationEnabled: true,
        encryptionEnabled: true,
        sslRequired: true,
      });
    });

    test('generateIamUserCreationSql が正しいSQL文を生成する', () => {
      // DatabaseIamConstructを作成
      const databaseIam = new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // SQL文を生成
      const sqlStatements = databaseIam.generateIamUserCreationSql();

      // 必要なSQL文が含まれていることを確認
      expect(sqlStatements).toContain('CREATE USER lambda_user;');
      expect(sqlStatements).toContain('CREATE USER app_user;');
      expect(sqlStatements).toContain('CREATE USER readonly_user;');
      expect(sqlStatements).toContain('CREATE USER admin_user;');
      expect(sqlStatements).toContain('GRANT rds_iam TO lambda_user;');
      expect(sqlStatements).toContain('GRANT rds_iam TO app_user;');
      expect(sqlStatements).toContain('GRANT rds_iam TO readonly_user;');
      expect(sqlStatements).toContain('GRANT rds_iam TO admin_user;');
    });

    test('validateIamConfiguration が正しく検証する', () => {
      // DatabaseIamConstructを作成
      const databaseIam = new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // 設定を検証
      const validation = databaseIam.validateIamConfiguration();

      // 検証が成功することを確認
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });
  });

  describe('CloudFormation出力テスト', () => {
    test('必要なCloudFormation出力が作成される', () => {
      // DatabaseIamConstructを作成
      new DatabaseIamConstruct(stack, 'DatabaseIam', {
        cluster,
        config,
        databaseSecret: secret,
        encryptionKey,
      });

      // CloudFormationテンプレートを取得
      const template = Template.fromStack(stack);

      // 必要な出力が作成されることを確認
      template.hasOutput('DatabaseIamLambdaExecutionRoleArn', {});
      template.hasOutput('DatabaseIamDatabaseUserManagementRoleArn', {});
      template.hasOutput('DatabaseIamDatabaseReadOnlyRoleArn', {});
      template.hasOutput('DatabaseIamDatabaseAdminRoleArn', {});
      template.hasOutput('DatabaseIamDatabaseAccessPolicyName', {});
      template.hasOutput('DatabaseIamIamDatabaseAuthenticationStatus', {
        Value: 'Enabled',
      });
    });
  });
});
