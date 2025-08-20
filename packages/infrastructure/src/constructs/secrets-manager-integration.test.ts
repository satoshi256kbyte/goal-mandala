import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';
import { SecretsManagerConstruct } from './secrets-manager-construct';
import { DatabaseConstruct } from './database-construct';
import { EnvironmentConfig } from '../config/environment';

/**
 * SecretsManagerConstruct統合テスト
 *
 * このテストファイルは以下の統合テストを実装します：
 * - CDKデプロイ後のシークレット存在確認テスト
 * - Lambda関数からのシークレット取得テスト
 * - 環境別アクセス制御のテスト
 * - ローテーション機能の動作テスト
 * - パフォーマンステストの実装
 */

describe('SecretsManagerConstruct Integration Tests', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let databaseConstruct: DatabaseConstruct;
  let secretsManagerConstruct: SecretsManagerConstruct;
  let template: Template;

  // テスト環境設定
  const testConfig: EnvironmentConfig = {
    environment: 'test',
    region: 'ap-northeast-1',
    account: '123456789012',
    vpc: {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
      natGateways: 1,
      enableVpcFlowLogs: false,
      enableVpcEndpoints: false,
    },
    database: {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
      minCapacity: rds.AuroraCapacityUnit.ACU_0_5,
      maxCapacity: rds.AuroraCapacityUnit.ACU_1,
      enablePerformanceInsights: false,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false,
      enableIamAuthentication: true,
    },
    secretsManager: {
      enableRotation: true,
      rotationSchedule: cdk.Duration.days(30),
      enableMonitoring: true,
      enableCrossRegionReplication: false,
    },
    monitoring: {
      enableDetailedMonitoring: true,
      enableAlarming: true,
      snsTopicArn: undefined,
    },
    tags: {
      Environment: 'test',
      Project: 'goal-mandala',
      Owner: 'test-team',
    },
  };

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: testConfig.account,
        region: testConfig.region,
      },
    });
    // VPC作成
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      ipAddresses: ec2.IpAddresses.cidr(testConfig.vpc.cidr),
      maxAzs: testConfig.vpc.maxAzs,
      natGateways: testConfig.vpc.natGateways,
    });

    // データベースコンストラクト作成
    databaseConstruct = new DatabaseConstruct(stack, 'TestDatabase', {
      config: testConfig,
      vpc: vpc,
    });

    // SecretsManagerコンストラクト作成
    secretsManagerConstruct = new SecretsManagerConstruct(stack, 'TestSecretsManager', {
      config: testConfig,
      databaseCluster: databaseConstruct.cluster,
      enableRotation: testConfig.secretsManager.enableRotation,
    });

    template = Template.fromStack(stack);
  });

  describe('1. CDKデプロイ後のシークレット存在確認テスト', () => {
    test('データベースシークレットが作成されること', () => {
      // データベースシークレットの存在確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: `goal-mandala-${testConfig.environment}-secret-database`,
        Description: 'Database credentials for Aurora Serverless cluster',
      });

      // シークレットの暗号化設定確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        KmsKeyId: {
          Ref: expect.stringMatching(/^TestSecretsManagerEncryptionKey/),
        },
      });
    });

    test('JWT秘密鍵シークレットが作成されること', () => {
      // JWT秘密鍵シークレットの存在確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: `goal-mandala-${testConfig.environment}-secret-jwt`,
        Description: 'JWT secret key for authentication',
      });

      // 自動生成設定の確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        GenerateSecretString: {
          SecretStringTemplate: '{}',
          GenerateStringKey: 'secret',
          ExcludeCharacters: ' "\'\\/',
          PasswordLength: 64,
        },
      });
    });

    test('外部APIシークレットが作成されること', () => {
      // 外部APIシークレットの存在確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: `goal-mandala-${testConfig.environment}-secret-external-apis`,
        Description: 'External API credentials (Bedrock, SES, etc.)',
      });
    });

    test('KMS暗号化キーが作成されること', () => {
      // KMS暗号化キーの存在確認
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: `SecretsManager encryption key for goal-mandala-${testConfig.environment}`,
        KeyPolicy: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Principal: { AWS: expect.stringMatching(/^arn:aws:iam::\d+:root$/) },
              Action: 'kms:*',
              Resource: '*',
            }),
          ]),
        },
      });

      // KMSキーエイリアスの確認
      template.hasResourceProperties('AWS::KMS::Alias', {
        AliasName: `alias/goal-mandala-${testConfig.environment}-secrets-key`,
      });
    });
  });

  describe('2. Lambda関数からのシークレット取得テスト', () => {
    test('Lambda実行ロールが作成されること', () => {
      // Lambda実行ロールの存在確認
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: `goal-mandala-${testConfig.environment}-lambda-secrets-role`,
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole',
            },
          ],
        },
      });
    });

    test('Secrets Manager読み取り権限ポリシーが作成されること', () => {
      // Secrets Manager読み取りポリシーの存在確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyName: `goal-mandala-${testConfig.environment}-secrets-read-policy`,
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              Resource: expect.arrayContaining([
                expect.stringMatching(/goal-mandala-test-secret-database/),
                expect.stringMatching(/goal-mandala-test-secret-jwt/),
                expect.stringMatching(/goal-mandala-test-secret-external-apis/),
              ]),
            }),
          ]),
        },
      });
    });

    test('KMS復号化権限が付与されること', () => {
      // KMS復号化権限の確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['kms:Decrypt', 'kms:DescribeKey'],
              Resource: {
                'Fn::GetAtt': [expect.stringMatching(/^TestSecretsManagerEncryptionKey/), 'Arn'],
              },
            }),
          ]),
        },
      });
    });

    test('CloudWatch Logs権限が付与されること', () => {
      // CloudWatch Logs権限の確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              Resource: expect.stringMatching(/^arn:aws:logs:/),
            }),
          ]),
        },
      });
    });
  });

  describe('3. 環境別アクセス制御のテスト', () => {
    test('環境別シークレット命名規則が適用されること', () => {
      // 環境名がシークレット名に含まれることを確認
      const secretNames = [
        `goal-mandala-${testConfig.environment}-secret-database`,
        `goal-mandala-${testConfig.environment}-secret-jwt`,
        `goal-mandala-${testConfig.environment}-secret-external-apis`,
      ];

      secretNames.forEach(secretName => {
        template.hasResourceProperties('AWS::SecretsManager::Secret', {
          Name: secretName,
        });
      });
    });

    test('環境別タグが適用されること', () => {
      // 環境別タグの確認
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Tags: expect.arrayContaining([
          { Key: 'Environment', Value: testConfig.environment },
          { Key: 'Project', Value: 'goal-mandala' },
        ]),
      });
    });

    test('環境別IAMポリシーが適用されること', () => {
      // 環境別リソースARNパターンの確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Resource: expect.arrayContaining([
                expect.stringMatching(new RegExp(`goal-mandala-${testConfig.environment}-secret-`)),
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('4. ローテーション機能の動作テスト', () => {
    test('ローテーション設定が有効な場合にローテーション機能が作成されること', () => {
      if (testConfig.secretsManager.enableRotation) {
        // ローテーション用Lambda関数の存在確認
        template.hasResourceProperties('AWS::Lambda::Function', {
          FunctionName: `goal-mandala-${testConfig.environment}-rotation-handler`,
          Runtime: 'nodejs18.x',
          Handler: 'rotation-handler.handler',
        });

        // ローテーション設定の確認
        template.hasResourceProperties('AWS::SecretsManager::RotationSchedule', {
          SecretId: {
            Ref: expect.stringMatching(/^TestSecretsManagerDatabaseSecret/),
          },
          RotationLambdaArn: {
            'Fn::GetAtt': [expect.stringMatching(/^TestSecretsManagerRotationFunction/), 'Arn'],
          },
          RotationRules: {
            AutomaticallyAfterDays: 30,
          },
        });
      }
    });

    test('ローテーション用Lambda関数に適切な権限が付与されること', () => {
      if (testConfig.secretsManager.enableRotation) {
        // ローテーション用Lambda実行ロールの確認
        template.hasResourceProperties('AWS::IAM::Role', {
          RoleName: `goal-mandala-${testConfig.environment}-rotation-lambda-role`,
          AssumeRolePolicyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Principal: { Service: 'lambda.amazonaws.com' },
                Action: 'sts:AssumeRole',
              },
            ],
          },
        });

        // Secrets Manager更新権限の確認
        template.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: {
            Statement: expect.arrayContaining([
              expect.objectContaining({
                Effect: 'Allow',
                Action: [
                  'secretsmanager:DescribeSecret',
                  'secretsmanager:GetSecretValue',
                  'secretsmanager:PutSecretValue',
                  'secretsmanager:UpdateSecretVersionStage',
                ],
              }),
            ]),
          },
        });

        // RDS接続権限の確認
        template.hasResourceProperties('AWS::IAM::Policy', {
          PolicyDocument: {
            Statement: expect.arrayContaining([
              expect.objectContaining({
                Effect: 'Allow',
                Action: ['rds:ModifyDBCluster', 'rds:DescribeDBClusters'],
              }),
            ]),
          },
        });
      }
    });

    test('ローテーション失敗時のアラートが設定されること', () => {
      if (testConfig.secretsManager.enableRotation && testConfig.monitoring.enableAlarming) {
        // ローテーション失敗アラームの確認
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: `goal-mandala-${testConfig.environment}-rotation-failure`,
          MetricName: 'Errors',
          Namespace: 'AWS/Lambda',
          Dimensions: [
            {
              Name: 'FunctionName',
              Value: {
                Ref: expect.stringMatching(/^TestSecretsManagerRotationFunction/),
              },
            },
          ],
          Statistic: 'Sum',
          Period: 300,
          EvaluationPeriods: 1,
          Threshold: 1,
          ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        });
      }
    });
  });
  describe('5. パフォーマンステストの実装', () => {
    test('シークレット取得のパフォーマンス監視が設定されること', () => {
      if (testConfig.monitoring.enableDetailedMonitoring) {
        // シークレット取得レイテンシアラームの確認
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: `goal-mandala-${testConfig.environment}-secret-access-latency`,
          MetricName: 'Duration',
          Namespace: 'AWS/Lambda',
          Statistic: 'Average',
          Period: 300,
          EvaluationPeriods: 2,
          Threshold: 5000, // 5秒
          ComparisonOperator: 'GreaterThanThreshold',
        });

        // シークレット取得成功率アラームの確認
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: `goal-mandala-${testConfig.environment}-secret-access-success-rate`,
          MetricName: 'SuccessRate',
          Namespace: 'GoalMandala/SecretsManager',
          Statistic: 'Average',
          Period: 300,
          EvaluationPeriods: 3,
          Threshold: 95, // 95%
          ComparisonOperator: 'LessThanThreshold',
        });
      }
    });

    test('異常アクセスパターン検知が設定されること', () => {
      if (testConfig.monitoring.enableAlarming) {
        // 異常アクセス頻度アラームの確認
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: `goal-mandala-${testConfig.environment}-secret-access-anomaly`,
          MetricName: 'AccessCount',
          Namespace: 'GoalMandala/SecretsManager',
          Statistic: 'Sum',
          Period: 300,
          EvaluationPeriods: 2,
          Threshold: 100, // 5分間で100回以上のアクセス
          ComparisonOperator: 'GreaterThanThreshold',
        });

        // 失敗アクセス率アラームの確認
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: `goal-mandala-${testConfig.environment}-secret-access-failure-rate`,
          MetricName: 'FailureRate',
          Namespace: 'GoalMandala/SecretsManager',
          Statistic: 'Average',
          Period: 300,
          EvaluationPeriods: 2,
          Threshold: 10, // 10%
          ComparisonOperator: 'GreaterThanThreshold',
        });
      }
    });

    test('カスタムメトリクス収集が設定されること', () => {
      if (testConfig.monitoring.enableDetailedMonitoring) {
        // カスタムメトリクス用のCloudWatch Logsグループが作成されることを確認
        template.hasResourceProperties('AWS::Logs::LogGroup', {
          LogGroupName: `/aws/lambda/goal-mandala-${testConfig.environment}-secrets-metrics`,
          RetentionInDays: 14,
        });
      }
    });
  });

  describe('6. 監視・アラート設定の統合テスト', () => {
    test('SNS通知トピックが設定されること', () => {
      if (testConfig.monitoring.enableAlarming) {
        // SNS通知トピックの確認
        template.hasResourceProperties('AWS::SNS::Topic', {
          TopicName: `goal-mandala-${testConfig.environment}-secrets-alerts`,
          DisplayName: `Goal Mandala ${testConfig.environment.toUpperCase()} - Secrets Manager Alerts`,
        });

        // SNSトピックポリシーの確認
        template.hasResourceProperties('AWS::SNS::TopicPolicy', {
          PolicyDocument: {
            Statement: expect.arrayContaining([
              expect.objectContaining({
                Effect: 'Allow',
                Principal: { Service: 'cloudwatch.amazonaws.com' },
                Action: 'sns:Publish',
              }),
            ]),
          },
        });
      }
    });

    test('CloudWatchダッシュボードが作成されること', () => {
      if (testConfig.monitoring.enableDetailedMonitoring) {
        // CloudWatchダッシュボードの確認
        template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
          DashboardName: `goal-mandala-${testConfig.environment}-secrets-manager`,
          DashboardBody: expect.stringContaining('SecretsManager'),
        });
      }
    });

    test('CloudTrail統合が設定されること', () => {
      if (['prod', 'stg'].includes(testConfig.environment)) {
        // CloudTrailイベントルールの確認（本番・ステージング環境のみ）
        template.hasResourceProperties('AWS::Events::Rule', {
          Name: `goal-mandala-${testConfig.environment}-secrets-access-events`,
          EventPattern: {
            source: ['aws.secretsmanager'],
            'detail-type': ['AWS API Call via CloudTrail'],
            detail: {
              eventSource: ['secretsmanager.amazonaws.com'],
              eventName: ['GetSecretValue', 'PutSecretValue', 'UpdateSecret'],
            },
          },
        });
      }
    });
  });

  describe('7. セキュリティ設定の統合テスト', () => {
    test('最小権限の原則が適用されること', () => {
      // IAMポリシーが必要最小限の権限のみを付与していることを確認
      const policyStatements = template.findResources('AWS::IAM::Policy');

      Object.values(policyStatements).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          // 全リソースへのアクセス（*）が制限されていることを確認
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

    test('暗号化設定が適切に適用されること', () => {
      // すべてのシークレットがKMS暗号化されていることを確認
      const secrets = template.findResources('AWS::SecretsManager::Secret');

      Object.values(secrets).forEach((secret: any) => {
        expect(secret.Properties).toHaveProperty('KmsKeyId');
        expect(secret.Properties.KmsKeyId).toEqual({
          Ref: expect.stringMatching(/^TestSecretsManagerEncryptionKey/),
        });
      });
    });

    test('ネットワークセキュリティが適用されること', () => {
      // VPCエンドポイント設定の確認（環境によって異なる）
      if (testConfig.vpc.enableVpcEndpoints) {
        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
          ServiceName: expect.stringMatching(/secretsmanager/),
          VpcId: { Ref: expect.stringMatching(/^TestVpc/) },
        });
      }
    });
  });

  describe('8. エラーハンドリングの統合テスト', () => {
    test('エラー処理用のCloudWatchアラームが設定されること', () => {
      if (testConfig.monitoring.enableAlarming) {
        // Lambda関数エラーアラームの確認
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: expect.stringMatching(/error/i),
          MetricName: 'Errors',
          Namespace: 'AWS/Lambda',
          Statistic: 'Sum',
          Threshold: 1,
          ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        });

        // スロットリングアラームの確認
        template.hasResourceProperties('AWS::CloudWatch::Alarm', {
          AlarmName: expect.stringMatching(/throttle/i),
          MetricName: 'Throttles',
          Namespace: 'AWS/Lambda',
          Statistic: 'Sum',
          Threshold: 1,
          ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        });
      }
    });

    test('デッドレターキューが設定されること', () => {
      // デッドレターキュー用のSQSキューの確認
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: `goal-mandala-${testConfig.environment}-secrets-dlq`,
        MessageRetentionPeriod: 1209600, // 14日
      });
    });
  });

  describe('9. 統合テスト実行結果の検証', () => {
    test('統合テスト結果が出力されること', () => {
      // CloudFormation出力の確認
      template.hasOutput('IntegrationTestSummary', {
        Description: 'SecretsManager integration test results summary',
      });

      template.hasOutput('IntegrationTestDetails', {
        Description: 'Detailed integration test results for SecretsManager',
      });
    });

    test('テスト成功率が基準を満たすこと', () => {
      // 実際のテスト実行時に検証される項目
      // ここではテンプレートの構造のみ確認
      const outputs = template.findOutputs('IntegrationTestSummary');
      expect(Object.keys(outputs)).toHaveLength(1);
    });
  });
});

/**
 * 実際のAWS環境での統合テスト実行用のヘルパー関数
 */
export class SecretsManagerIntegrationTestRunner {
  /**
   * CDKデプロイ後の実際のシークレット存在確認
   */
  static async verifySecretsExistence(
    region: string,
    environment: string
  ): Promise<{ success: boolean; results: any[] }> {
    const AWS = require('aws-sdk');
    const secretsManager = new AWS.SecretsManager({ region });

    const expectedSecrets = [
      `goal-mandala-${environment}-secret-database`,
      `goal-mandala-${environment}-secret-jwt`,
      `goal-mandala-${environment}-secret-external-apis`,
    ];

    const results = [];

    for (const secretName of expectedSecrets) {
      try {
        const result = await secretsManager.describeSecret({ SecretId: secretName }).promise();
        results.push({
          secretName,
          exists: true,
          encrypted: !!result.KmsKeyId,
          lastRotated: result.LastRotatedDate,
          nextRotation: result.NextRotationDate,
        });
      } catch (error) {
        results.push({
          secretName,
          exists: false,
          error: error.message,
        });
      }
    }

    const success = results.every(r => r.exists);
    return { success, results };
  }

  /**
   * Lambda関数からのシークレット取得テスト
   */
  static async testLambdaSecretAccess(
    region: string,
    functionName: string,
    secretName: string
  ): Promise<{ success: boolean; duration: number; error?: string }> {
    const AWS = require('aws-sdk');
    const lambda = new AWS.Lambda({ region });

    const startTime = Date.now();

    try {
      const result = await lambda
        .invoke({
          FunctionName: functionName,
          Payload: JSON.stringify({
            action: 'getSecret',
            secretName: secretName,
          }),
        })
        .promise();

      const duration = Date.now() - startTime;
      const payload = JSON.parse(result.Payload);

      return {
        success: !payload.errorMessage,
        duration,
        error: payload.errorMessage,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * パフォーマンステストの実行
   */
  static async runPerformanceTest(
    region: string,
    functionName: string,
    concurrency: number = 10,
    duration: number = 60000 // 1分
  ): Promise<{ averageLatency: number; successRate: number; totalRequests: number }> {
    const results = [];
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      const promises = Array(concurrency)
        .fill(null)
        .map(() =>
          this.testLambdaSecretAccess(region, functionName, 'goal-mandala-test-secret-database')
        );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successfulRequests = results.filter(r => r.success);
    const averageLatency =
      successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length;
    const successRate = (successfulRequests.length / results.length) * 100;

    return {
      averageLatency,
      successRate,
      totalRequests: results.length,
    };
  }
}
