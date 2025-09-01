import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as budgets from 'aws-cdk-lib/aws-budgets';
// import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Duration, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../config/environment';
import { constants } from '../config/constants';

export interface MonitoringConstructProps {
  config: EnvironmentConfig;
  environment: string;
  distribution: cloudfront.Distribution;
  bucket: s3.IBucket;
  logsBucket?: s3.IBucket;
}

/**
 * 監視・ログ設定コンストラクト
 *
 * 機能:
 * - CloudWatchメトリクスとアラーム設定
 * - S3アクセスログとCloudFrontログ設定
 * - ダッシュボード作成とログ管理
 * - コスト監視とライフサイクルポリシー
 */
export class MonitoringConstruct extends Construct {
  public readonly alertTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly logsBucket?: s3.Bucket;
  public readonly budget?: budgets.CfnBudget;

  // アラーム
  public readonly cloudFrontErrorRateAlarm: cloudwatch.Alarm;
  public readonly cloudFrontCacheHitRateAlarm: cloudwatch.Alarm;
  public readonly s3RequestsAlarm: cloudwatch.Alarm;
  public readonly costAlarm?: budgets.CfnBudget;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const { config, environment, distribution, bucket, logsBucket } = props;

    // SNSトピック作成（アラート通知用）
    this.alertTopic = this.createAlertTopic(config, environment);

    // ログ用S3バケット作成（提供されていない場合）
    if (!logsBucket && config.frontend.monitoring.enableAccessLogs) {
      this.logsBucket = this.createLogsBucket(config, environment);
    } else {
      this.logsBucket = logsBucket as s3.Bucket;
    }

    // CloudFrontログ設定
    if (config.frontend.monitoring.enableCloudFrontLogs && this.logsBucket) {
      this.setupCloudFrontLogging(distribution, this.logsBucket);
    }

    // S3アクセスログ設定
    if (config.frontend.monitoring.enableAccessLogs && this.logsBucket) {
      this.setupS3AccessLogging(bucket, this.logsBucket);
    }

    // CloudWatchアラーム設定
    this.cloudFrontErrorRateAlarm = this.createCloudFrontErrorRateAlarm(distribution, config);
    this.cloudFrontCacheHitRateAlarm = this.createCloudFrontCacheHitRateAlarm(distribution, config);
    this.s3RequestsAlarm = this.createS3RequestsAlarm(bucket, config);

    // コスト監視設定
    if (config.frontend.monitoring.enableCostMonitoring) {
      this.budget = this.createBudgetAlert(config);
    }

    // CloudWatchダッシュボード作成
    this.dashboard = this.createDashboard(config, environment, distribution, bucket);

    // ライフサイクルポリシー設定
    if (this.logsBucket) {
      this.setupLogLifecyclePolicy();
    }

    // タグ設定は各リソース作成時に個別に設定
  }

  /**
   * アラート通知用SNSトピック作成
   */
  private createAlertTopic(config: EnvironmentConfig, environment: string): sns.Topic {
    const topic = new sns.Topic(this, 'AlertTopic', {
      topicName: `${config.stackPrefix}-frontend-alerts`,
      displayName: `Frontend Alerts (${environment})`,
    });

    // メール通知設定
    if (config.frontend.monitoring?.alertEmail) {
      topic.addSubscription(
        new snsSubscriptions.EmailSubscription(config.frontend.monitoring.alertEmail)
      );
    }

    // Slack通知設定（Webhook URLが設定されている場合）
    if (config.frontend.monitoring?.slackWebhookUrl) {
      // Lambda関数を使用してSlack通知を実装する場合
      // 現在は基本設定のみ
    }

    return topic;
  }

  /**
   * ログ用S3バケット作成
   */
  private createLogsBucket(config: EnvironmentConfig, environment: string): s3.Bucket {
    const bucket = new s3.Bucket(this, 'LogsBucket', {
      bucketName: `${config.stackPrefix}-logs`.toLowerCase(),

      // セキュリティ設定
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,

      // ライフサイクル設定
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          enabled: true,
          expiration: Duration.days(config.frontend.monitoring.logRetentionDays || 90),
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90),
            },
          ],
        },
      ],

      // 削除ポリシー
      removalPolicy:
        environment === constants.ENVIRONMENTS.PROD
          ? config.frontend.monitoring.retainLogsOnDelete
            ? RemovalPolicy.RETAIN
            : RemovalPolicy.DESTROY
          : RemovalPolicy.DESTROY,
    });

    return bucket;
  }

  /**
   * CloudFrontログ設定
   */
  private setupCloudFrontLogging(
    distribution: cloudfront.Distribution,
    logsBucket: s3.Bucket
  ): void {
    // CloudFrontの標準ログ設定は、ディストリビューション作成時に設定する必要があるため、
    // ここでは設定の確認とログバケットの権限設定を行う

    // CloudFrontサービスプリンシパルにログバケットへの書き込み権限を付与
    logsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontLogging',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:PutObject', 's3:GetBucketAcl'],
        resources: [logsBucket.bucketArn, `${logsBucket.bucketArn}/cloudfront-logs/*`],
      })
    );
  }

  /**
   * S3アクセスログ設定
   */
  private setupS3AccessLogging(bucket: s3.IBucket, logsBucket: s3.Bucket): void {
    // S3アクセスログの設定
    // 注意: CDKでは既存バケットのアクセスログ設定は制限があるため、
    // 新規バケット作成時に設定することを推奨

    // ログ配信用の権限設定
    logsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowS3AccessLogging',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('logging.s3.amazonaws.com')],
        actions: ['s3:PutObject'],
        resources: [`${logsBucket.bucketArn}/s3-access-logs/*`],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control',
          },
        },
      })
    );

    logsBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowS3AccessLoggingAcl',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('logging.s3.amazonaws.com')],
        actions: ['s3:GetBucketAcl'],
        resources: [logsBucket.bucketArn],
      })
    );
  }

  /**
   * CloudFrontエラー率アラーム作成
   */
  private createCloudFrontErrorRateAlarm(
    distribution: cloudfront.Distribution,
    config: EnvironmentConfig
  ): cloudwatch.Alarm {
    const metric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: '4xxErrorRate',
      dimensionsMap: {
        DistributionId: distribution.distributionId,
      },
      period: Duration.minutes(5),
      statistic: 'Average',
    });

    const alarm = new cloudwatch.Alarm(this, 'CloudFrontErrorRateAlarm', {
      alarmName: `${config.stackPrefix}-cloudfront-error-rate`,
      alarmDescription: 'CloudFront distribution has high 4xx error rate',
      metric,
      threshold: config.frontend.monitoring.errorRateThreshold || 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    alarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    return alarm;
  }

  /**
   * CloudFrontキャッシュヒット率アラーム作成
   */
  private createCloudFrontCacheHitRateAlarm(
    distribution: cloudfront.Distribution,
    config: EnvironmentConfig
  ): cloudwatch.Alarm {
    const metric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'CacheHitRate',
      dimensionsMap: {
        DistributionId: distribution.distributionId,
      },
      period: Duration.minutes(15),
      statistic: 'Average',
    });

    const alarm = new cloudwatch.Alarm(this, 'CloudFrontCacheHitRateAlarm', {
      alarmName: `${config.stackPrefix}-cloudfront-cache-hit-rate`,
      alarmDescription: 'CloudFront distribution has low cache hit rate',
      metric,
      threshold: config.frontend.monitoring.cacheHitRateThreshold || 80,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    alarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    return alarm;
  }

  /**
   * S3リクエスト数アラーム作成
   */
  private createS3RequestsAlarm(bucket: s3.IBucket, config: EnvironmentConfig): cloudwatch.Alarm {
    const metric = new cloudwatch.Metric({
      namespace: 'AWS/S3',
      metricName: 'AllRequests',
      dimensionsMap: {
        BucketName: bucket.bucketName,
      },
      period: Duration.minutes(5),
      statistic: 'Sum',
    });

    const alarm = new cloudwatch.Alarm(this, 'S3RequestsAlarm', {
      alarmName: `${config.stackPrefix}-s3-high-requests`,
      alarmDescription: 'S3 bucket has unusually high request volume',
      metric,
      threshold: config.frontend.monitoring.s3RequestsThreshold || 1000,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    alarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));

    return alarm;
  }

  /**
   * コスト監視アラート作成
   */
  private createBudgetAlert(config: EnvironmentConfig): budgets.CfnBudget {
    const budgetAmount = config.frontend.monitoring.monthlyBudgetLimit || 50;

    const budget = new budgets.CfnBudget(this, 'FrontendBudget', {
      budget: {
        budgetName: `${config.stackPrefix}-frontend-budget`,
        budgetLimit: {
          amount: budgetAmount,
          unit: 'USD',
        },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
        costFilters: {
          Service: ['Amazon CloudFront', 'Amazon Simple Storage Service'],
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: config.frontend.monitoring.alertEmail
            ? [
                {
                  subscriptionType: 'EMAIL',
                  address: config.frontend.monitoring.alertEmail,
                },
              ]
            : [],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: config.frontend.monitoring.alertEmail
            ? [
                {
                  subscriptionType: 'EMAIL',
                  address: config.frontend.monitoring.alertEmail,
                },
              ]
            : [],
        },
      ],
    });

    return budget;
  }

  /**
   * CloudWatchダッシュボード作成
   */
  private createDashboard(
    config: EnvironmentConfig,
    environment: string,
    distribution: cloudfront.Distribution,
    bucket: s3.IBucket
  ): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, 'FrontendDashboard', {
      dashboardName: `${config.stackPrefix}-frontend-dashboard`,
    });

    // CloudFrontメトリクス
    const cloudFrontWidgets = this.createCloudFrontWidgets(distribution);

    // S3メトリクス
    const s3Widgets = this.createS3Widgets(bucket);

    // ダッシュボードにウィジェットを追加
    dashboard.addWidgets(...cloudFrontWidgets, ...s3Widgets);

    return dashboard;
  }

  /**
   * CloudFrontウィジェット作成
   */
  private createCloudFrontWidgets(distribution: cloudfront.Distribution): cloudwatch.IWidget[] {
    const distributionId = distribution.distributionId;

    return [
      // リクエスト数
      new cloudwatch.GraphWidget({
        title: 'CloudFront Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'Requests',
            dimensionsMap: { DistributionId: distributionId },
            period: Duration.minutes(5),
            statistic: 'Sum',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // エラー率
      new cloudwatch.GraphWidget({
        title: 'CloudFront Error Rates',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '4xxErrorRate',
            dimensionsMap: { DistributionId: distributionId },
            period: Duration.minutes(5),
            statistic: 'Average',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '5xxErrorRate',
            dimensionsMap: { DistributionId: distributionId },
            period: Duration.minutes(5),
            statistic: 'Average',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // キャッシュヒット率
      new cloudwatch.GraphWidget({
        title: 'CloudFront Cache Hit Rate',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'CacheHitRate',
            dimensionsMap: { DistributionId: distributionId },
            period: Duration.minutes(15),
            statistic: 'Average',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // データ転送量
      new cloudwatch.GraphWidget({
        title: 'CloudFront Data Transfer',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'BytesDownloaded',
            dimensionsMap: { DistributionId: distributionId },
            period: Duration.minutes(5),
            statistic: 'Sum',
          }),
        ],
        width: 12,
        height: 6,
      }),
    ];
  }

  /**
   * S3ウィジェット作成
   */
  private createS3Widgets(bucket: s3.IBucket): cloudwatch.IWidget[] {
    const bucketName = bucket.bucketName;

    return [
      // S3リクエスト数
      new cloudwatch.GraphWidget({
        title: 'S3 Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'AllRequests',
            dimensionsMap: { BucketName: bucketName },
            period: Duration.minutes(5),
            statistic: 'Sum',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // バケットサイズ
      new cloudwatch.GraphWidget({
        title: 'S3 Bucket Size',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'BucketSizeBytes',
            dimensionsMap: {
              BucketName: bucketName,
              StorageType: 'StandardStorage',
            },
            period: Duration.days(1),
            statistic: 'Average',
          }),
        ],
        width: 12,
        height: 6,
      }),

      // オブジェクト数
      new cloudwatch.GraphWidget({
        title: 'S3 Object Count',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'NumberOfObjects',
            dimensionsMap: {
              BucketName: bucketName,
              StorageType: 'AllStorageTypes',
            },
            period: Duration.days(1),
            statistic: 'Average',
          }),
        ],
        width: 12,
        height: 6,
      }),
    ];
  }

  /**
   * ログライフサイクルポリシー設定
   */
  private setupLogLifecyclePolicy(): void {
    // ライフサイクルポリシーは既にバケット作成時に設定済み
    // 追加の設定が必要な場合はここで実装
  }

  /**
   * タグ設定（各リソースに個別適用）
   */
  private getResourceTags(config: EnvironmentConfig, environment: string): Record<string, string> {
    return {
      ...config.tags,
      Component: 'monitoring',
      Purpose: 'frontend-monitoring',
      Environment: environment,
      ManagedBy: 'cdk',
    };
  }

  /**
   * 監視設定情報の取得
   */
  public getMonitoringInfo() {
    return {
      alertTopicArn: this.alertTopic.topicArn,
      dashboardUrl: `https://console.aws.amazon.com/cloudwatch/home?region=${Stack.of(this).region}#dashboards:name=${this.dashboard.dashboardName}`,
      logsBucketName: this.logsBucket?.bucketName,
      alarms: {
        errorRate: this.cloudFrontErrorRateAlarm.alarmName,
        cacheHitRate: this.cloudFrontCacheHitRateAlarm.alarmName,
        s3Requests: this.s3RequestsAlarm.alarmName,
      },
      budgetName: this.budget?.ref,
    };
  }
}
