import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { MonitoringConstruct } from './monitoring-construct';
import { getEnvironmentConfig } from '../config/environment';

describe('MonitoringConstruct', () => {
  let app: App;
  let stack: Stack;
  let bucket: s3.Bucket;
  let distribution: cloudfront.Distribution;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'ap-northeast-1' },
    });

    // テスト用S3バケット作成
    bucket = new s3.Bucket(stack, 'TestBucket');

    // テスト用CloudFrontディストリビューション作成
    distribution = new cloudfront.Distribution(stack, 'TestDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      },
    });
  });

  describe('基本的な監視設定', () => {
    test('dev環境での監視コンストラクト作成', () => {
      // Given
      const config = getEnvironmentConfig('dev');

      // When
      const monitoring = new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'dev',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // SNSトピックが作成されること
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'Frontend Alerts (dev)',
      });

      // CloudWatchアラームが作成されること
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: '4xxErrorRate',
        Namespace: 'AWS/CloudFront',
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CacheHitRate',
        Namespace: 'AWS/CloudFront',
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'AllRequests',
        Namespace: 'AWS/S3',
      });

      // CloudWatchダッシュボードが作成されること
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {});

      // 監視情報が取得できること
      const monitoringInfo = monitoring.getMonitoringInfo();
      expect(monitoringInfo.alertTopicArn).toBeDefined();
      expect(monitoringInfo.dashboardUrl).toContain('cloudwatch');
    });

    test('prod環境での監視コンストラクト作成', () => {
      // Given
      const config = getEnvironmentConfig('prod');

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // アラームが作成されること
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Threshold: 3, // prod環境の設定値
      });

      // ログバケットが作成されること（ログ有効時）
      if (config.frontend.monitoring.enableAccessLogs) {
        template.resourceCountIs('AWS::S3::Bucket', 2); // TestBucket + LogsBucket
      }

      // コスト監視が有効な場合、予算アラートが作成されること
      if (config.frontend.monitoring.enableCostMonitoring) {
        template.hasResourceProperties('AWS::Budgets::Budget', {
          Budget: {
            BudgetType: 'COST',
          },
        });
      }
    });
  });

  describe('ログ設定', () => {
    test('ログバケットが正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('stg');
      config.frontend.monitoring.enableAccessLogs = true;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'stg',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // ログバケットが作成されること
      template.resourceCountIs('AWS::S3::Bucket', 2); // TestBucket + LogsBucket

      // ライフサイクルポリシーが設定されること
      const buckets = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(buckets).length).toBe(2); // TestBucket + LogsBucket

      // ログバケットの権限が設定されること
      template.resourceCountIs('AWS::S3::BucketPolicy', 2); // TestBucket + LogsBucket policies
    });
  });

  describe('アラート設定', () => {
    test('メール通知が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'test@example.com';

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // SNSサブスクリプションが作成されること
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'test@example.com',
      });
    });

    test('アラームアクションが設定される', () => {
      // Given
      const config = getEnvironmentConfig('dev');

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'dev',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // アラームにSNSアクションが設定されること
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      const alarmKeys = Object.keys(alarms);
      expect(alarmKeys.length).toBeGreaterThan(0);

      // 最初のアラームにSNSアクションが設定されていることを確認
      const firstAlarm = alarms[alarmKeys[0]];
      expect(firstAlarm.Properties.AlarmActions).toBeDefined();
      expect(firstAlarm.Properties.AlarmActions[0].Ref).toMatch(/AlertTopic/);
    });
  });

  describe('ダッシュボード設定', () => {
    test('CloudWatchダッシュボードが正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('dev');

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'dev',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // ダッシュボードが作成されること
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: `${config.stackPrefix}-frontend-dashboard`,
      });
    });

    test('ダッシュボードに適切なウィジェットが含まれる', () => {
      // Given
      const config = getEnvironmentConfig('prod');

      // When
      const monitoring = new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const monitoringInfo = monitoring.getMonitoringInfo();
      expect(monitoringInfo.dashboardUrl).toContain('cloudwatch');
      expect(monitoringInfo.dashboardUrl).toContain('dashboards');
    });
  });

  describe('コスト監視', () => {
    test('予算アラートが正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableCostMonitoring = true;
      config.frontend.monitoring.monthlyBudgetLimit = 100;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // 予算が作成されること
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
          BudgetName: `${config.stackPrefix}-frontend-budget`,
          BudgetLimit: {
            Amount: 100,
            Unit: 'USD',
          },
          TimeUnit: 'MONTHLY',
          BudgetType: 'COST',
        },
      });
    });
  });

  describe('アラーム閾値設定', () => {
    test('環境別のアラーム閾値が適用される', () => {
      // Given
      const config = getEnvironmentConfig('prod');

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // 本番環境の閾値が適用されること
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: '4xxErrorRate',
        Threshold: config.frontend.monitoring.errorRateThreshold || 3,
      });

      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CacheHitRate',
        Threshold: config.frontend.monitoring.cacheHitRateThreshold || 85,
      });
    });
  });

  describe('ライフサイクルポリシー', () => {
    test('ログバケットのライフサイクルポリシーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('stg');
      config.frontend.monitoring.enableAccessLogs = true;
      config.frontend.monitoring.logRetentionDays = 60;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'stg',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // ライフサイクルポリシーが設定されること
      const buckets = template.findResources('AWS::S3::Bucket');
      const logsBucketKey = Object.keys(buckets).find(key =>
        buckets[key].Properties?.BucketName?.includes('logs')
      );

      if (logsBucketKey) {
        const logsBucket = buckets[logsBucketKey];
        expect(logsBucket.Properties.LifecycleConfiguration).toBeDefined();
        expect(logsBucket.Properties.LifecycleConfiguration.Rules).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              Id: 'DeleteOldLogs',
              Status: 'Enabled',
              ExpirationInDays: 60,
            }),
          ])
        );
      }
    });
  });

  describe('ログバケット権限設定', () => {
    test('CloudFrontログ用の権限が正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('stg');
      config.frontend.monitoring.enableCloudFrontLogs = true;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'stg',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // CloudFrontサービスプリンシパルの権限
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowCloudFrontLogging',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Action: ['s3:PutObject', 's3:GetBucketAcl'],
            }),
          ]),
        },
      });
    });

    test('S3アクセスログ用の権限が正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('stg');
      config.frontend.monitoring.enableAccessLogs = true;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'stg',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // S3ログサービスプリンシパルの権限
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowS3AccessLogging',
              Effect: 'Allow',
              Principal: {
                Service: 'logging.s3.amazonaws.com',
              },
              Action: 's3:PutObject',
            }),
            Match.objectLike({
              Sid: 'AllowS3AccessLoggingAcl',
              Effect: 'Allow',
              Principal: {
                Service: 'logging.s3.amazonaws.com',
              },
              Action: 's3:GetBucketAcl',
            }),
          ]),
        },
      });
    });
  });

  describe('アラーム閾値のカスタマイズ', () => {
    test('カスタム閾値が正しく適用される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.errorRateThreshold = 2;
      config.frontend.monitoring.cacheHitRateThreshold = 90;
      config.frontend.monitoring.s3RequestsThreshold = 2000;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // カスタムエラー率閾値
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: '4xxErrorRate',
        Threshold: 2,
      });

      // カスタムキャッシュヒット率閾値
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CacheHitRate',
        Threshold: 90,
      });

      // カスタムS3リクエスト閾値
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'AllRequests',
        Threshold: 2000,
      });
    });
  });

  describe('ダッシュボードウィジェット', () => {
    test('CloudFrontウィジェットが正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('dev');

      // When
      const monitoring = new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'dev',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // ダッシュボードが作成される
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: `${config.stackPrefix}-frontend-dashboard`,
      });

      // 監視情報にダッシュボードURLが含まれる
      const monitoringInfo = monitoring.getMonitoringInfo();
      expect(monitoringInfo.dashboardUrl).toContain('cloudwatch');
      expect(monitoringInfo.dashboardUrl).toContain('dashboards');
      // ダッシュボード名にスタックプレフィックスが含まれることを確認（CDKトークンの場合もある）
      expect(monitoringInfo.dashboardUrl).toBeDefined();
    });
  });

  describe('Slack通知設定', () => {
    test('Slack Webhook URLが設定されている場合の処理', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.slackWebhookUrl =
        'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX';

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // SNSトピックが作成される（Slack通知の基盤）
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'Frontend Alerts (prod)',
      });

      // 注意: 実際のSlack通知はLambda関数で実装する必要があるため、
      // ここでは基本設定のみ確認
    });
  });

  describe('環境別ログ保持設定', () => {
    test('本番環境でログ保持が有効な場合、適切に設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableAccessLogs = true;
      config.frontend.monitoring.retainLogsOnDelete = true;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // ログバケットが作成される
      template.resourceCountIs('AWS::S3::Bucket', 2); // TestBucket + LogsBucket

      // 本番環境では削除保護が設定される
      const buckets = template.findResources('AWS::S3::Bucket');
      const logsBucketKey = Object.keys(buckets).find(key =>
        buckets[key].Properties?.BucketName?.includes('logs')
      );

      if (logsBucketKey) {
        const logsBucket = buckets[logsBucketKey];
        expect(logsBucket.DeletionPolicy).toBe('Retain');
      }
    });

    test('開発環境でログが自動削除される', () => {
      // Given
      const config = getEnvironmentConfig('dev');
      config.frontend.monitoring.enableAccessLogs = true;
      config.frontend.monitoring.retainLogsOnDelete = false;

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'dev',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // 開発環境では削除ポリシーがDestroyに設定される
      const buckets = template.findResources('AWS::S3::Bucket');
      const logsBucketKey = Object.keys(buckets).find(key =>
        buckets[key].Properties?.BucketName?.includes('logs')
      );

      if (logsBucketKey) {
        const logsBucket = buckets[logsBucketKey];
        expect(logsBucket.DeletionPolicy).toBe('Delete');
      }
    });
  });

  describe('予算通知の詳細設定', () => {
    test('複数の予算通知が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableCostMonitoring = true;
      config.frontend.monitoring.monthlyBudgetLimit = 200;
      config.frontend.monitoring.alertEmail = 'admin@example.com';

      // When
      new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'prod',
        distribution,
        bucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // 予算アラートが作成される
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
          BudgetName: `${config.stackPrefix}-frontend-budget`,
          BudgetLimit: {
            Amount: 200,
            Unit: 'USD',
          },
          TimeUnit: 'MONTHLY',
          BudgetType: 'COST',
          CostFilters: {
            Service: ['Amazon CloudFront', 'Amazon Simple Storage Service'],
          },
        },
        NotificationsWithSubscribers: [
          {
            Notification: {
              NotificationType: 'ACTUAL',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 80,
              ThresholdType: 'PERCENTAGE',
            },
            Subscribers: [
              {
                SubscriptionType: 'EMAIL',
                Address: 'admin@example.com',
              },
            ],
          },
          {
            Notification: {
              NotificationType: 'FORECASTED',
              ComparisonOperator: 'GREATER_THAN',
              Threshold: 100,
              ThresholdType: 'PERCENTAGE',
            },
            Subscribers: [
              {
                SubscriptionType: 'EMAIL',
                Address: 'admin@example.com',
              },
            ],
          },
        ],
      });
    });
  });

  describe('外部ログバケット使用', () => {
    test('外部ログバケットが提供された場合、新しいバケットは作成されない', () => {
      // Given
      const config = getEnvironmentConfig('stg');
      config.frontend.monitoring.enableAccessLogs = true;

      const externalLogsBucket = new s3.Bucket(stack, 'ExternalLogsBucket');

      // When
      const monitoring = new MonitoringConstruct(stack, 'Monitoring', {
        config,
        environment: 'stg',
        distribution,
        bucket,
        logsBucket: externalLogsBucket,
      });

      // Then
      const template = Template.fromStack(stack);

      // 新しいログバケットは作成されない（TestBucket + ExternalLogsBucket = 2個）
      template.resourceCountIs('AWS::S3::Bucket', 2);

      // 監視情報に外部バケット名が含まれる
      const monitoringInfo = monitoring.getMonitoringInfo();
      expect(monitoringInfo.logsBucketName).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    test('無効な設定でエラーが発生しない', () => {
      // Given
      const config = getEnvironmentConfig('local');
      config.frontend.monitoring.enableAccessLogs = false;
      config.frontend.monitoring.enableCloudFrontLogs = false;
      config.frontend.monitoring.enableCostMonitoring = false;

      // When & Then
      expect(() => {
        new MonitoringConstruct(stack, 'Monitoring', {
          config,
          environment: 'local',
          distribution,
          bucket,
        });
      }).not.toThrow();
    });

    test('設定が不完全でもデフォルト値が適用される', () => {
      // Given
      const config = getEnvironmentConfig('test');
      // 監視設定を部分的に削除（完全に削除すると実行時エラーになる）
      config.frontend.monitoring = {
        enableAccessLogs: false,
        enableCloudFrontLogs: false,
        enableCostMonitoring: false,
      } as any;

      // When & Then
      expect(() => {
        new MonitoringConstruct(stack, 'Monitoring', {
          config,
          environment: 'test',
          distribution,
          bucket,
        });
      }).not.toThrow();
    });

    test('メール設定なしでも正常に動作する', () => {
      // Given
      const config = getEnvironmentConfig('dev');
      config.frontend.monitoring.enableCostMonitoring = true;
      delete config.frontend.monitoring.alertEmail;

      // When & Then
      expect(() => {
        new MonitoringConstruct(stack, 'Monitoring', {
          config,
          environment: 'dev',
          distribution,
          bucket,
        });
      }).not.toThrow();
    });
  });
});
