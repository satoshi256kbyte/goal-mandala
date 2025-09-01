import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from './frontend-stack';
import { getEnvironmentConfig } from '../config/environment';

/**
 * パフォーマンステスト
 * 要件3.2, 4.1, 4.2, 4.3に対応
 */
describe('Frontend Stack - パフォーマンス統合テスト', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
    app.node.setContext('accountId', '123456789012');
  });

  describe('キャッシュ効率の統合テスト (要件3.2)', () => {
    test('静的アセットの長期キャッシュ設定が最適化される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'StaticCacheStack', {
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
      // 静的アセット用の長期キャッシュポリシーを確認
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: Match.stringLikeRegexp('.*StaticAssets.*'),
          DefaultTTL: 86400, // 1日
          MaxTTL: 31536000, // 1年
          MinTTL: 0,
          ParametersInCacheKeyAndForwardedToOrigin: {
            EnableAcceptEncodingGzip: true,
            EnableAcceptEncodingBrotli: true,
            QueryStringsConfig: {
              QueryStringBehavior: 'none',
            },
            HeadersConfig: {
              HeaderBehavior: 'none',
            },
            CookiesConfig: {
              CookieBehavior: 'none',
            },
          },
        },
      });

      // 静的アセット用のキャッシュビヘイビアを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: Match.arrayWith([
            {
              PathPattern: '/assets/*',
              CachePolicyId: Match.anyValue(),
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            },
            {
              PathPattern: '*.css',
              CachePolicyId: Match.anyValue(),
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            },
            {
              PathPattern: '*.js',
              CachePolicyId: Match.anyValue(),
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            },
          ]),
        },
      });
    });

    test('HTMLファイルの短期キャッシュ設定が最適化される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'HtmlCacheStack', {
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
      // HTML用の短期キャッシュポリシーを確認
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: Match.stringLikeRegexp('.*Html.*'),
          DefaultTTL: 300, // 5分
          MaxTTL: 3600, // 1時間
          MinTTL: 0,
        },
      });

      // HTML用のキャッシュビヘイビアを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: Match.arrayWith([
            {
              PathPattern: '*.html',
              CachePolicyId: Match.anyValue(),
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            },
          ]),
        },
      });
    });

    test('圧縮設定が有効になっている', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'CompressionStack', {
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
      // デフォルトビヘイビアで圧縮が有効
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            Compress: true,
          },
        },
      });

      // 全てのキャッシュビヘイビアで圧縮が有効
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              Compress: true,
            }),
          ]),
        },
      });
    });

    test('キャッシュヒット率監視アラームが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'performance@example.com';
      const stack = new FrontendStack(app, 'CacheHitRateStack', {
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
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*LowCacheHitRate.*'),
        MetricName: 'CacheHitRate',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Average',
        Threshold: 80, // 80%未満でアラート
        ComparisonOperator: 'LessThanThreshold',
        EvaluationPeriods: 3,
      });
    });
  });

  describe('レスポンス時間最適化の統合テスト (要件4.1)', () => {
    test('適切な価格クラスが環境別に設定される', () => {
      // Given - 本番環境
      const prodConfig = getEnvironmentConfig('prod');
      const prodStack = new FrontendStack(app, 'ProdPriceClassStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const prodTemplate = Template.fromStack(prodStack);

      // Then - 本番環境では全エッジロケーション
      prodTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_All',
        },
      });

      // Given - 開発環境
      const devConfig = getEnvironmentConfig('dev');
      const devStack = new FrontendStack(app, 'DevPriceClassStack', {
        config: devConfig,
        environment: 'dev',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const devTemplate = Template.fromStack(devStack);

      // Then - 開発環境では制限されたエッジロケーション
      devTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_100',
        },
      });
    });

    test('HTTP/2とIPv6が有効になっている', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'Http2Stack', {
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
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          HttpVersion: 'http2',
          IPV6Enabled: true,
        },
      });
    });

    test('オリジンレイテンシー監視アラームが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'performance@example.com';
      const stack = new FrontendStack(app, 'OriginLatencyStack', {
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
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*HighOriginLatency.*'),
        MetricName: 'OriginLatency',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Average',
        Threshold: 3000, // 3秒
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
      });
    });

    test('レスポンス時間のパーセンタイル監視が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'performance@example.com';
      const stack = new FrontendStack(app, 'ResponseTimeStack', {
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
      // 95パーセンタイルのレスポンス時間監視
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*HighResponseTime95p.*'),
        MetricName: 'OriginLatency',
        Namespace: 'AWS/CloudFront',
        ExtendedStatistic: 'p95',
        Threshold: 2000, // 2秒
        ComparisonOperator: 'GreaterThanThreshold',
      });

      // 99パーセンタイルのレスポンス時間監視
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*HighResponseTime99p.*'),
        MetricName: 'OriginLatency',
        Namespace: 'AWS/CloudFront',
        ExtendedStatistic: 'p99',
        Threshold: 5000, // 5秒
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });
  });

  describe('スループット監視の統合テスト (要件4.2)', () => {
    test('リクエスト数監視アラームが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'performance@example.com';
      const stack = new FrontendStack(app, 'RequestCountStack', {
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
      // 高トラフィックアラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*HighTraffic.*'),
        MetricName: 'Requests',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Sum',
        Threshold: 10000, // 10,000リクエスト/5分
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 1,
        Period: 300, // 5分
      });

      // 異常なトラフィック増加アラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*AbnormalTraffic.*'),
        MetricName: 'Requests',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Sum',
        ComparisonOperator: 'GreaterThanThreshold',
        TreatMissingData: 'notBreaching',
      });
    });

    test('データ転送量監視アラームが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'performance@example.com';
      const stack = new FrontendStack(app, 'DataTransferStack', {
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
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*HighDataTransfer.*'),
        MetricName: 'BytesDownloaded',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Sum',
        Threshold: 1073741824, // 1GB
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 1,
        Period: 300, // 5分
      });
    });

    test('エラー率監視アラームが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'performance@example.com';
      const stack = new FrontendStack(app, 'ErrorRateStack', {
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
      // 4xxエラー率アラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*HighErrorRate.*'),
        MetricName: '4xxErrorRate',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Average',
        Threshold: 5, // 5%
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
      });

      // 5xxエラー率アラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*HighServerErrorRate.*'),
        MetricName: '5xxErrorRate',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Average',
        Threshold: 1, // 1%
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
      });
    });
  });

  describe('コスト最適化の統合テスト (要件4.3)', () => {
    test('コスト監視予算アラートが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableCostMonitoring = true;
      config.frontend.monitoring.monthlyBudget = 100;
      const stack = new FrontendStack(app, 'CostMonitoringStack', {
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
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
          BudgetName: Match.stringLikeRegexp('.*frontend.*budget.*'),
          BudgetLimit: {
            Amount: 100,
            Unit: 'USD',
          },
          TimeUnit: 'MONTHLY',
          BudgetType: 'COST',
        },
        NotificationsWithSubscribers: Match.arrayWith([
          {
            Notification: {
              NotificationType: 'ACTUAL',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 80, // 80%で警告
            },
            Subscribers: [
              {
                SubscriptionType: 'EMAIL',
                Address: Match.anyValue(),
              },
            ],
          },
          {
            Notification: {
              NotificationType: 'FORECASTED',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 100, // 100%予測で警告
            },
            Subscribers: [
              {
                SubscriptionType: 'EMAIL',
                Address: Match.anyValue(),
              },
            ],
          },
        ]),
      });
    });

    test('S3ライフサイクルポリシーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'LifecyclePolicyStack', {
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
            {
              Status: 'Enabled',
              NoncurrentVersionExpiration: {
                NoncurrentDays: 30,
              },
            },
            {
              Status: 'Enabled',
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 7,
              },
            },
          ]),
        },
      });
    });

    test('ログの自動削除ポリシーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableAccessLogs = true;
      config.frontend.monitoring.enableCloudFrontLogs = true;
      const stack = new FrontendStack(app, 'LogRetentionStack', {
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
      // ログバケットのライフサイクルポリシー
      const buckets = template.findResources('AWS::S3::Bucket');
      const logBuckets = Object.values(buckets).filter((bucket: any) =>
        bucket.Properties?.LifecycleConfiguration?.Rules?.some((rule: any) =>
          rule.Transitions?.some((transition: any) => transition.StorageClass === 'GLACIER')
        )
      );
      expect(logBuckets.length).toBeGreaterThan(0);
    });

    test('CloudWatchログの保持期間が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableCloudFrontLogs = true;
      const stack = new FrontendStack(app, 'LogRetentionPolicyStack', {
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
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: Match.anyValue(),
        RetentionInDays: 30, // 30日間保持
      });
    });
  });

  describe('パフォーマンスダッシュボードの統合テスト', () => {
    test('包括的なパフォーマンスダッシュボードが作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableDashboard = true;
      const stack = new FrontendStack(app, 'PerformanceDashboardStack', {
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
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: Match.stringLikeRegexp('.*Performance.*'),
        DashboardBody: Match.serializedJson(
          Match.objectLike({
            widgets: Match.arrayWith([
              // レスポンス時間ウィジェット
              Match.objectLike({
                properties: Match.objectLike({
                  title: Match.stringMatching(/Response Time/),
                  metrics: Match.arrayWith([['AWS/CloudFront', 'OriginLatency']]),
                }),
              }),
              // キャッシュヒット率ウィジェット
              Match.objectLike({
                properties: Match.objectLike({
                  title: Match.stringMatching(/Cache Hit Rate/),
                  metrics: Match.arrayWith([['AWS/CloudFront', 'CacheHitRate']]),
                }),
              }),
              // リクエスト数ウィジェット
              Match.objectLike({
                properties: Match.objectLike({
                  title: Match.stringMatching(/Requests/),
                  metrics: Match.arrayWith([['AWS/CloudFront', 'Requests']]),
                }),
              }),
              // エラー率ウィジェット
              Match.objectLike({
                properties: Match.objectLike({
                  title: Match.stringMatching(/Error Rate/),
                  metrics: Match.arrayWith([
                    ['AWS/CloudFront', '4xxErrorRate'],
                    ['AWS/CloudFront', '5xxErrorRate'],
                  ]),
                }),
              }),
            ]),
          })
        ),
      });
    });

    test('リアルタイム監視ウィジェットが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableDashboard = true;
      config.frontend.monitoring.enableRealTimeMonitoring = true;
      const stack = new FrontendStack(app, 'RealTimeMonitoringStack', {
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
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardBody: Match.serializedJson(
          Match.objectLike({
            widgets: Match.arrayWith([
              Match.objectLike({
                properties: Match.objectLike({
                  title: Match.stringMatching(/Real.*Time/),
                  period: 60, // 1分間隔
                }),
              }),
            ]),
          })
        ),
      });
    });
  });

  describe('パフォーマンステストの自動化', () => {
    test('パフォーマンステスト用のLambda関数が作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'PerformanceTestStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const performanceTestFunction = stack.createPerformanceTestFunction();
      const template = Template.fromStack(stack);

      // Then
      expect(performanceTestFunction).toBeDefined();

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: Match.stringLikeRegexp('.*performance-test.*'),
        Runtime: 'nodejs18.x',
        Timeout: 900, // 15分
        Environment: {
          Variables: {
            DISTRIBUTION_DOMAIN: Match.anyValue(),
            TEST_ENDPOINTS: Match.anyValue(),
          },
        },
      });
    });

    test('定期的なパフォーマンステストのスケジュールが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'ScheduledPerformanceTestStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      stack.createPerformanceTestFunction();
      const template = Template.fromStack(stack);

      // Then
      template.hasResourceProperties('AWS::Events::Rule', {
        Name: Match.stringLikeRegexp('.*performance-test.*'),
        ScheduleExpression: 'rate(1 hour)', // 1時間ごと
        State: 'ENABLED',
      });

      template.hasResourceProperties('AWS::Events::Target', {
        Arn: Match.anyValue(),
        Id: Match.stringLikeRegexp('.*performance-test.*'),
      });
    });

    test('パフォーマンステスト結果の通知設定が構成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'performance@example.com';
      const stack = new FrontendStack(app, 'PerformanceTestNotificationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      stack.createPerformanceTestFunction();
      const template = Template.fromStack(stack);

      // Then
      // パフォーマンステスト失敗時のアラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*PerformanceTestFailure.*'),
        MetricName: 'Errors',
        Namespace: 'AWS/Lambda',
        Statistic: 'Sum',
        Threshold: 1,
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      });
    });
  });

  describe('環境別パフォーマンス設定', () => {
    test('本番環境では最高のパフォーマンス設定が適用される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'ProdPerformanceStack', {
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
      // 全エッジロケーション使用
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_All',
        },
      });

      // 最適化されたキャッシュ設定
      const cachePolicies = template.findResources('AWS::CloudFront::CachePolicy');
      expect(Object.keys(cachePolicies).length).toBeGreaterThanOrEqual(2);
    });

    test('開発環境ではコスト効率重視の設定が適用される', () => {
      // Given
      const config = getEnvironmentConfig('dev');
      const stack = new FrontendStack(app, 'DevPerformanceStack', {
        config,
        environment: 'dev',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // 制限されたエッジロケーション
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_100',
        },
      });

      // 監視機能は最小限
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      expect(Object.keys(alarms).length).toBeLessThan(5);
    });
  });
});
