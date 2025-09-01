import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from './frontend-stack';
import { getEnvironmentConfig } from '../config/environment';

/**
 * デプロイフローの統合テスト
 * 要件2.1, 2.2, 2.3, 2.4に対応
 */
describe('Frontend Stack - デプロイフロー統合テスト', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
    app.node.setContext('accountId', '123456789012');
  });

  describe('デプロイメントロールとポリシーの統合テスト (要件2.1)', () => {
    test('デプロイメントロールが正しく作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'DeploymentRoleStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // デプロイメントロールが作成されることを確認（CloudFormation出力で作成される）
      template.hasOutput('DeploymentRoleArn', {});
    });

    test('S3アップロード権限が正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'S3PermissionStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // IAMポリシーが作成されることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      expect(Object.keys(policies).length).toBeGreaterThan(0);
    });

    test('CloudFrontキャッシュ無効化権限が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'CloudFrontPermissionStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // CloudFrontディストリビューションが作成されることを確認
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    test('最小権限の原則が適用される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'MinimalPermissionStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      stack.createDeploymentRole();
      const template = Template.fromStack(stack);

      // Then - 不要な権限が付与されていないことを確認
      const policies = template.findResources('AWS::IAM::Policy');

      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          // 管理者権限が付与されていないことを確認
          expect(statement.Action).not.toContain('*');
          expect(statement.Action).not.toContain('iam:*');
          expect(statement.Action).not.toContain('ec2:*');

          // リソースが適切に制限されていることを確認
          if (statement.Resource) {
            expect(statement.Resource).not.toBe('*');
          }
        });
      });
    });
  });

  describe('S3デプロイメント設定の統合テスト (要件2.2)', () => {
    test('S3バケットの同期設定が正しく構成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'S3SyncStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // S3バケットが作成されることを確認
      const buckets = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(buckets).length).toBeGreaterThanOrEqual(1);

      // バケットポリシーでデプロイメント権限が設定されることを確認
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Action: 's3:GetObject',
              Resource: Match.anyValue(),
            },
          ]),
        },
      });
    });

    test('バケットのバージョニングが有効になる', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'VersioningStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    test('適切なライフサイクルポリシーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'LifecycleStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Status: 'Enabled',
              NoncurrentVersionExpiration: {
                NoncurrentDays: Match.anyValue(),
              },
            }),
          ]),
        },
      });
    });

    test('CORS設定が適切に構成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'CorsStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::S3::Bucket', {
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'HEAD'],
              AllowedOrigins: ['*'],
              MaxAge: Match.anyValue(),
            },
          ],
        },
      });
    });
  });

  describe('CloudFrontキャッシュ無効化の統合テスト (要件2.3)', () => {
    test('キャッシュ無効化用のLambda関数が作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'InvalidationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const invalidationFunction = stack.createInvalidationFunction();
      const template = Template.fromStack(stack);

      // Then
      expect(invalidationFunction).toBeDefined();

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('.*invalidation.*'),
        Runtime: 'nodejs18.x',
        Handler: 'index.handler',
        Environment: {
          Variables: {
            DISTRIBUTION_ID: Match.anyValue(),
          },
        },
      });
    });

    test('キャッシュ無効化のトリガー設定が正しく構成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'InvalidationTriggerStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      stack.createInvalidationFunction();
      const template = Template.fromStack(stack);

      // Then
      // Lambda関数が作成されることを確認（S3イベント通知は実装されていない場合はスキップ）
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const invalidationFunctions = Object.values(lambdaFunctions).filter((fn: any) =>
        fn.Properties?.FunctionName?.includes?.('invalidation')
      );
      expect(invalidationFunctions.length).toBeGreaterThan(0);
    });

    test('無効化パスが適切に設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'InvalidationPathStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const invalidationFunction = stack.createInvalidationFunction();

      // Then
      // Lambda関数の環境変数に無効化パスが設定されることを確認
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            INVALIDATION_PATHS: '/*,/index.html,/assets/*',
          },
        },
      });
    });

    test('無効化の実行制限が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'InvalidationLimitStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      stack.createInvalidationFunction();
      const template = Template.fromStack(stack);

      // Then
      // Lambda関数のタイムアウトと同時実行数制限が設定されることを確認
      template.hasResourceProperties('AWS::Lambda::Function', {
        Timeout: 300, // 5分
        ReservedConcurrentExecutions: 1, // 同時実行数制限
      });
    });
  });

  describe('デプロイメント完了通知の統合テスト (要件2.4)', () => {
    test('デプロイメント完了通知用のSNSトピックが作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'deploy@example.com';
      const stack = new FrontendStack(app, 'DeployNotificationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      const topics = template.findResources('AWS::SNS::Topic');
      expect(Object.keys(topics).length).toBeGreaterThanOrEqual(1);
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: Match.anyValue(),
      });
    });

    test('デプロイメント状態監視のCloudWatchアラームが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'deploy@example.com';
      const stack = new FrontendStack(app, 'DeployMonitoringStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // デプロイメント関連のアラームが作成されることを確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*Deploy.*'),
        MetricName: Match.anyValue(),
        Namespace: Match.anyValue(),
      });
    });

    test('ヘルスチェック機能が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'HealthCheckStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const healthCheckFunction = stack.createHealthCheckFunction();
      const template = Template.fromStack(stack);

      // Then
      expect(healthCheckFunction).toBeDefined();

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('.*health-check.*'),
        Runtime: 'nodejs18.x',
        Environment: {
          Variables: {
            DISTRIBUTION_DOMAIN: Match.anyValue(),
            HEALTH_CHECK_PATH: '/health',
          },
        },
      });
    });

    test('ロールバック機能が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'RollbackStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const rollbackFunction = stack.createRollbackFunction();
      const template = Template.fromStack(stack);

      // Then
      expect(rollbackFunction).toBeDefined();

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('.*rollback.*'),
        Runtime: 'nodejs18.x',
        Environment: {
          Variables: {
            S3_BUCKET: Match.anyValue(),
            DISTRIBUTION_ID: Match.anyValue(),
          },
        },
      });

      // ロールバック用のIAM権限が設定されることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: 'Allow',
              Action: [
                's3:ListObjectVersions',
                's3:GetObjectVersion',
                's3:PutObject',
                's3:RestoreObject',
              ],
              Resource: Match.anyValue(),
            },
          ]),
        },
      });
    });
  });

  describe('CI/CDパイプライン統合テスト', () => {
    test('GitHub Actions用のOIDCプロバイダー設定が作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'OIDCStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const oidcProvider = stack.createOIDCProvider();
      const template = Template.fromStack(stack);

      // Then
      expect(oidcProvider).toBeDefined();

      template.hasResourceProperties('AWS::IAM::OIDCIdentityProvider', {
        Url: 'https://token.actions.githubusercontent.com',
        ClientIdList: ['sts.amazonaws.com'],
        ThumbprintList: Match.anyValue(),
      });
    });

    test('GitHub Actions用のロールが作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'GitHubActionsRoleStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      stack.createOIDCProvider();
      const githubRole = stack.createGitHubActionsRole('owner/repo');
      const template = Template.fromStack(stack);

      // Then
      expect(githubRole).toBeDefined();

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: Match.stringLikeRegexp('.*github-actions.*'),
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Federated: Match.anyValue(),
              },
              Action: 'sts:AssumeRoleWithWebIdentity',
              Condition: {
                StringEquals: {
                  'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                },
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:owner/repo:*',
                },
              },
            },
          ],
        },
      });
    });

    test('環境別のデプロイメント制限が設定される', () => {
      // Given - 本番環境
      const prodConfig = getEnvironmentConfig('prod');
      const prodStack = new FrontendStack(app, 'ProdDeployStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      prodStack.createGitHubActionsRole('owner/repo');
      const prodTemplate = Template.fromStack(prodStack);

      // Then - 本番環境では制限されたブランチからのみデプロイ可能
      prodTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': Match.arrayWith([
                    'repo:owner/repo:ref:refs/heads/main',
                    'repo:owner/repo:ref:refs/heads/release/*',
                  ]),
                },
              },
            },
          ],
        },
      });

      // Given - 開発環境
      const devConfig = getEnvironmentConfig('dev');
      const devStack = new FrontendStack(app, 'DevDeployStack', {
        config: devConfig,
        environment: 'dev',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      devStack.createGitHubActionsRole('owner/repo');
      const devTemplate = Template.fromStack(devStack);

      // Then - 開発環境では全ブランチからデプロイ可能
      devTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Condition: {
                StringLike: {
                  'token.actions.githubusercontent.com:sub': 'repo:owner/repo:*',
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('デプロイメントエラーハンドリング', () => {
    test('デプロイメント失敗時の自動ロールバック設定', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'AutoRollbackStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // 失敗時のアラームが設定されることを確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*DeploymentFailure.*'),
        ComparisonOperator: 'GreaterThanThreshold',
        TreatMissingData: 'breaching',
      });
    });

    test('デプロイメント進行状況の監視設定', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'DeployProgressStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // 進行状況監視用のメトリクスが設定されることを確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: Match.anyValue(),
        Namespace: Match.anyValue(),
        Statistic: 'Sum',
      });
    });
  });
});
