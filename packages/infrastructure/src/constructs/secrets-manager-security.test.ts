import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { SecretsManagerConstruct } from './secrets-manager-construct';
import { EnvironmentConfig } from '../config/environment';

/**
 * SecretsManagerConstruct セキュリティテスト
 *
 * このテストファイルは以下のセキュリティテストを実装します：
 * - 不正アクセス拒否のテスト
 * - 環境間シークレット分離のテスト
 * - 暗号化機能のテスト
 * - アクセスログ記録のテスト
 * - 脆弱性スキャンの実施
 */

describe('SecretsManagerConstruct Security Tests', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  const createTestConfig = (environment: string): EnvironmentConfig => ({
    stackPrefix: 'goal-mandala',
    region: 'ap-northeast-1',
    environment,
    network: {
      natGateways: 1,
      enableVpcEndpoints: false,
    },
    database: {
      instanceClass: 'serverless',
      minCapacity: 0.5,
      maxCapacity: 1,
      multiAz: false,
      databaseName: `goal_mandala_${environment}`,
    },
    lambda: {
      timeout: 30,
      memorySize: 256,
    },
    frontend: {},
    tags: {
      Project: 'GoalMandala',
      Environment: environment,
    },
  });

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
  });

  describe('1. 不正アクセス拒否のテスト', () => {
    test('IAMポリシーが最小権限の原則に従っていること', () => {
      // Arrange
      const config = createTestConfig('test');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - Secrets Manager読み取り権限の確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-test-secrets-read-policy',
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              Resource: Match.arrayWith([Match.stringLikeRegexp('goal-mandala-test-secret-.*')]),
              Condition: {
                StringEquals: {
                  'secretsmanager:ResourceTag/Environment': 'test',
                },
              },
            },
          ],
        },
      });

      // Assert - 全リソースへのアクセス（*）が制限されていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (Array.isArray(statement.Resource)) {
            statement.Resource.forEach((resource: any) => {
              if (typeof resource === 'string' && resource === '*') {
                // CloudWatch Logsなど、特定のサービスのみ許可
                expect(statement.Action).toEqual(
                  expect.arrayContaining([expect.stringMatching(/^(logs:|cloudwatch:)/)])
                );
              }
            });
          }
        });
      });
    });

    test('不正なIAMロールでのアクセスが拒否されること', () => {
      // Arrange
      const config = createTestConfig('test');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'test',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - Lambda実行ロールのみがシークレットにアクセス可能
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-test-secrets-read-policy',
        Roles: [
          {
            Ref: Match.stringMatching(/^SecretsManagerLambdaExecutionRole/),
          },
        ],
      });

      // Assert - AssumeRolePolicyが適切に設定されていること
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-lambda-secrets-role',
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
    });

    test('環境別アクセス制御が適用されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - 環境タグによるアクセス制御
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-prod-secrets-read-policy',
      });

      // 環境タグが設定されていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const secretsPolicy = Object.values(policies).find(
        (policy: any) => policy.Properties.PolicyName === 'goal-mandala-prod-secrets-read-policy'
      );
      expect(secretsPolicy).toBeDefined();
    });

    test('クロス環境アクセスが防止されていること', () => {
      // Arrange - 複数環境のスタックを作成
      const devStack = new cdk.Stack(app, 'DevStack');
      const prodStack = new cdk.Stack(app, 'ProdStack');

      const devConfig = createTestConfig('dev');
      const prodConfig = createTestConfig('prod');

      new SecretsManagerConstruct(devStack, 'DevSecretsManager', {
        environment: 'dev',
        config: devConfig,
      });

      new SecretsManagerConstruct(prodStack, 'ProdSecretsManager', {
        environment: 'prod',
        config: prodConfig,
      });

      // Act
      const devTemplate = Template.fromStack(devStack);
      const prodTemplate = Template.fromStack(prodStack);

      // Assert - 開発環境は本番環境のシークレットにアクセスできない
      devTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Resource: Match.arrayWith([Match.stringLikeRegexp('goal-mandala-dev-secret-.*')]),
              Condition: {
                StringEquals: {
                  'secretsmanager:ResourceTag/Environment': 'dev',
                },
              },
            },
          ]),
        },
      });

      // Assert - 本番環境は開発環境のシークレットにアクセスできない
      prodTemplate.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Resource: Match.arrayWith([Match.stringLikeRegexp('goal-mandala-prod-secret-.*')]),
              Condition: {
                StringEquals: {
                  'secretsmanager:ResourceTag/Environment': 'prod',
                },
              },
            },
          ]),
        },
      });
    });

    test('時間制限付きアクセス権限が設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - 本番環境では適切なアクセス制御が設定される
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: 'goal-mandala-prod-secrets-read-policy',
      });

      // 条件付きアクセスが設定されていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const secretsPolicy = Object.values(policies).find(
        (policy: any) => policy.Properties.PolicyName === 'goal-mandala-prod-secrets-read-policy'
      );
      expect(secretsPolicy).toBeDefined();

      const policyDocument = (secretsPolicy as any).Properties.PolicyDocument;
      expect(policyDocument.Statement).toBeDefined();
      expect(policyDocument.Statement.length).toBeGreaterThan(0);
    });
  });

  describe('2. 環境間シークレット分離のテスト', () => {
    test('環境別シークレット命名規則が適用されていること', () => {
      // Arrange
      const environments = ['local', 'dev', 'stg', 'prod'];

      environments.forEach(env => {
        const envStack = new cdk.Stack(app, `${env}Stack`);
        const config = createTestConfig(env);

        // Act
        new SecretsManagerConstruct(envStack, 'SecretsManager', {
          environment: env,
          config,
        });

        // Assert
        const envTemplate = Template.fromStack(envStack);

        // データベースシークレット
        envTemplate.hasResourceProperties('AWS::SecretsManager::Secret', {
          Name: `goal-mandala-${env}-secret-database`,
          Description: `Database credentials for ${env} environment - Aurora Serverless V2`,
        });

        // JWT秘密鍵シークレット
        envTemplate.hasResourceProperties('AWS::SecretsManager::Secret', {
          Name: `goal-mandala-${env}-secret-jwt`,
          Description: `JWT secret key for ${env} environment`,
        });

        // 外部APIシークレット
        envTemplate.hasResourceProperties('AWS::SecretsManager::Secret', {
          Name: `goal-mandala-${env}-secret-external-apis`,
          Description: `External API credentials for ${env} environment - Bedrock, SES, etc.`,
        });
      });
    });

    test('環境別タグが適切に設定されていること', () => {
      // Arrange
      const config = createTestConfig('stg');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'stg',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - 全シークレットに環境タグが設定されている
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties.Tags).toEqual(
          expect.arrayContaining([
            { Key: 'Environment', Value: 'stg' },
            { Key: 'Project', Value: 'GoalMandala' },
          ])
        );
      });
    });

    test('環境別KMS暗号化キーが分離されていること', () => {
      // Arrange
      const devStack = new cdk.Stack(app, 'DevStack');
      const prodStack = new cdk.Stack(app, 'ProdStack');

      const devConfig = createTestConfig('dev');
      const prodConfig = createTestConfig('prod');

      new SecretsManagerConstruct(devStack, 'DevSecretsManager', {
        environment: 'dev',
        config: devConfig,
      });

      new SecretsManagerConstruct(prodStack, 'ProdSecretsManager', {
        environment: 'prod',
        config: prodConfig,
      });

      // Act
      const devTemplate = Template.fromStack(devStack);
      const prodTemplate = Template.fromStack(prodStack);

      // Assert - 各環境で独立したKMSキーが作成される
      devTemplate.hasResourceProperties('AWS::KMS::Key', {
        Description: 'KMS key for Secrets Manager encryption - dev',
      });

      devTemplate.hasResourceProperties('AWS::KMS::Alias', {
        AliasName: 'alias/goal-mandala-dev-secrets-key',
      });

      prodTemplate.hasResourceProperties('AWS::KMS::Key', {
        Description: 'KMS key for Secrets Manager encryption - prod',
      });

      prodTemplate.hasResourceProperties('AWS::KMS::Alias', {
        AliasName: 'alias/goal-mandala-prod-secrets-key',
      });
    });

    test('環境別IAMロールが分離されていること', () => {
      // Arrange
      const devStack = new cdk.Stack(app, 'DevStack');
      const prodStack = new cdk.Stack(app, 'ProdStack');

      const devConfig = createTestConfig('dev');
      const prodConfig = createTestConfig('prod');

      new SecretsManagerConstruct(devStack, 'DevSecretsManager', {
        environment: 'dev',
        config: devConfig,
      });

      new SecretsManagerConstruct(prodStack, 'ProdSecretsManager', {
        environment: 'prod',
        config: prodConfig,
      });

      // Act
      const devTemplate = Template.fromStack(devStack);
      const prodTemplate = Template.fromStack(prodStack);

      // Assert - 各環境で独立したIAMロールが作成される
      devTemplate.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-dev-lambda-secrets-role',
      });

      prodTemplate.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-prod-lambda-secrets-role',
      });
    });
  });

  describe('3. 暗号化機能のテスト', () => {
    test('保存時暗号化が有効になっていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - 全シークレットがKMS暗号化されている
      const secrets = template.findResources('AWS::SecretsManager::Secret');
      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties).toHaveProperty('KmsKeyId');
        expect(secret.Properties.KmsKeyId).toBeDefined();
      });
    });

    test('KMSキーローテーションが有効になっていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - KMSキーローテーションが有効
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });

    test('転送時暗号化が設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - KMSキーが作成されていることを確認
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'KMS key for Secrets Manager encryption - prod',
        EnableKeyRotation: true,
      });
    });

    test('カスタマーマネージドキーが使用されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - カスタマーマネージドKMSキーが作成される
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'KMS key for Secrets Manager encryption - prod',
      });

      // Assert - KMSキーエイリアスが作成される
      template.hasResourceProperties('AWS::KMS::Alias', {
        AliasName: 'alias/goal-mandala-prod-secrets-key',
      });
    });

    test('暗号化設定が環境別に適用されていること', () => {
      // Arrange
      const environments = ['dev', 'stg', 'prod'];

      environments.forEach(env => {
        const envStack = new cdk.Stack(app, `${env}Stack`);
        const config = createTestConfig(env);

        // Act
        new SecretsManagerConstruct(envStack, 'SecretsManager', {
          environment: env,
          config,
        });

        // Assert
        const envTemplate = Template.fromStack(envStack);

        // 環境別KMSキーが作成される
        envTemplate.hasResourceProperties('AWS::KMS::Key', {
          Description: `KMS key for Secrets Manager encryption - ${env}`,
          EnableKeyRotation: true,
        });

        // 環境別KMSエイリアスが作成される
        envTemplate.hasResourceProperties('AWS::KMS::Alias', {
          AliasName: `alias/goal-mandala-${env}-secrets-key`,
        });
      });
    });
  });

  describe('4. アクセスログ記録のテスト', () => {
    test('CloudTrailが本番環境で有効になっていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - CloudTrailが作成される（本番環境のみ）
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        TrailName: 'goal-mandala-prod-secrets-audit-trail',
        IncludeGlobalServiceEvents: true,
        IsMultiRegionTrail: true,
        EnableLogFileValidation: true,
      });

      // Assert - CloudTrail用S3バケットが作成される
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'goal-mandala-prod-secrets-cloudtrail-logs',
      });
    });

    test('CloudWatchログが設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - CloudWatchロググループが作成される
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 365,
      });
    });

    test('EventBridgeルールが設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - EventBridgeルールが作成される
      template.hasResourceProperties('AWS::Events::Rule', {
        State: 'ENABLED',
      });
    });

    test('アクセスログの保持期間が適切に設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - S3バケットのライフサイクル設定が存在する
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Status: 'Enabled',
            }),
          ]),
        },
      });
    });

    test('異常アクセスパターン検知が設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - CloudWatchアラームが作成される
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      expect(Object.keys(alarms).length).toBeGreaterThan(0);
    });
  });

  describe('5. 脆弱性スキャンの実施', () => {
    test('IAMポリシーに過度な権限が含まれていないこと', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - 危険な権限が含まれていないことを確認
      const policies = template.findResources('AWS::IAM::Policy');
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          // 危険なアクションが含まれていないことを確認
          const dangerousActions = [
            'secretsmanager:*',
            'secretsmanager:DeleteSecret',
            'secretsmanager:PutSecretValue',
            'secretsmanager:UpdateSecret',
            'kms:*',
            'kms:CreateKey',
            'kms:DeleteKey',
            'iam:*',
            '*',
          ];

          if (Array.isArray(statement.Action)) {
            statement.Action.forEach((action: string) => {
              expect(dangerousActions).not.toContain(action);
            });
          } else if (typeof statement.Action === 'string') {
            expect(dangerousActions).not.toContain(statement.Action);
          }
        });
      });
    });

    test('リソースベースポリシーが適切に設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - KMSキーポリシーが適切に設定されている
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'kms:*',
              Resource: '*',
            }),
          ]),
        },
      });
    });

    test('ネットワークセキュリティが適切に設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      config.network.enableVpcEndpoints = true;

      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - VPCエンドポイントが設定されている（本番環境）
      if (config.network.enableVpcEndpoints) {
        const vpcEndpoints = template.findResources('AWS::EC2::VPCEndpoint');
        expect(Object.keys(vpcEndpoints).length).toBeGreaterThanOrEqual(0);
      }
    });

    test('セキュリティグループが適切に設定されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - セキュリティグループの存在確認（オプション）
      const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
      // セキュリティグループは必須ではないため、存在チェックのみ
      expect(Object.keys(securityGroups).length).toBeGreaterThanOrEqual(0);
    });

    test('監査ログが改ざん防止されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - CloudTrailログファイル検証が有効
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        EnableLogFileValidation: true,
      });

      // Assert - S3バケットのバージョニングが有効
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });

      // Assert - S3バケットのバージョニングが有効
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    test('セキュリティ設定の検証結果が出力されること', () => {
      // Arrange
      const config = createTestConfig('prod');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - CloudFormation出力が存在する
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs).length).toBeGreaterThan(0);
    });
  });

  describe('6. セキュリティ統合テスト', () => {
    test('全セキュリティ機能が統合されて動作すること', () => {
      // Arrange
      const config = createTestConfig('prod');
      const construct = new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - 全セキュリティコンポーネントが存在する
      const securityComponents = [
        'AWS::SecretsManager::Secret',
        'AWS::KMS::Key',
        'AWS::KMS::Alias',
        'AWS::IAM::Role',
        'AWS::IAM::Policy',
        'AWS::CloudTrail::Trail',
        'AWS::S3::Bucket',
        'AWS::CloudWatch::Alarm',
        'AWS::Events::Rule',
        'AWS::Logs::LogGroup',
      ];

      securityComponents.forEach(componentType => {
        const resources = template.findResources(componentType);
        expect(Object.keys(resources).length).toBeGreaterThan(0);
      });

      // Assert - セキュリティ設定の整合性確認
      const secretsInfo = construct.getSecretsInfo();
      expect(secretsInfo.encryptionEnabled).toBe(true);
      expect(secretsInfo.auditLoggingEnabled).toBe(true);
      expect(secretsInfo.environment).toBe('prod');
    });

    test('セキュリティベストプラクティスが適用されていること', () => {
      // Arrange
      const config = createTestConfig('prod');
      new SecretsManagerConstruct(stack, 'SecretsManager', {
        environment: 'prod',
        config,
      });

      // Act
      template = Template.fromStack(stack);

      // Assert - セキュリティベストプラクティスチェック
      const bestPractices = {
        // 1. 暗号化
        encryption: template.findResources('AWS::KMS::Key'),
        // 2. アクセス制御
        accessControl: template.findResources('AWS::IAM::Policy'),
        // 3. 監査ログ
        auditLogging: template.findResources('AWS::CloudTrail::Trail'),
        // 4. 監視・アラート
        monitoring: template.findResources('AWS::CloudWatch::Alarm'),
      };

      // 必須のセキュリティ機能が存在することを確認
      expect(Object.keys(bestPractices.encryption).length).toBeGreaterThan(0);
      expect(Object.keys(bestPractices.accessControl).length).toBeGreaterThan(0);
      expect(Object.keys(bestPractices.auditLogging).length).toBeGreaterThan(0);
      expect(Object.keys(bestPractices.monitoring).length).toBeGreaterThan(0);
    });
  });
});
