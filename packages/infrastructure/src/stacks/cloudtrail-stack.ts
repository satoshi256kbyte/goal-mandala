import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { ProjectConfig } from '../config/project-config';

/**
 * CloudTrailスタック
 *
 * 全AWSサービスのAPI呼び出しを記録し、監査証跡を提供します。
 *
 * 機能:
 * - 管理イベントの記録（全AWSサービス）
 * - データイベントの記録（S3、Lambda、DynamoDB）
 * - CloudWatch Logs統合
 * - ログファイル検証
 * - 暗号化（KMS）
 * - SNS通知
 */
export class CloudTrailStack extends cdk.Stack {
  public readonly trail: cloudtrail.Trail;
  public readonly logBucket: s3.Bucket;
  public readonly logGroup: logs.LogGroup;
  public readonly kmsKey: kms.Key;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, config: ProjectConfig, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = config.environment;
    const stackPrefix = config.stackPrefix;

    // KMSキーの作成（ログ暗号化用）
    this.kmsKey = new kms.Key(this, 'CloudTrailKey', {
      alias: `${stackPrefix}-${environment}-cloudtrail-key`,
      description: 'KMS key for CloudTrail log encryption',
      enableKeyRotation: true,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // CloudTrail用S3バケットの作成
    this.logBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `${stackPrefix}-${environment}-cloudtrail-logs`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          enabled: true,
          expiration: cdk.Duration.days(environment === 'prod' ? 2555 : 90), // 本番: 7年、その他: 90日
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
    });

    // CloudWatch Logsロググループの作成
    this.logGroup = new logs.LogGroup(this, 'CloudTrailLogGroup', {
      logGroupName: `/aws/cloudtrail/${stackPrefix}-${environment}`,
      retention:
        environment === 'prod' ? logs.RetentionDays.ONE_YEAR : logs.RetentionDays.ONE_MONTH,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // SNSトピックの作成（アラート用）
    this.alertTopic = new sns.Topic(this, 'CloudTrailAlertTopic', {
      topicName: `${stackPrefix}-${environment}-cloudtrail-alerts`,
      displayName: 'CloudTrail Security Alerts',
    });

    // メール通知の設定（本番環境のみ）
    if (environment === 'prod' && config.alertEmail) {
      this.alertTopic.addSubscription(new subscriptions.EmailSubscription(config.alertEmail));
    }

    // CloudTrailの作成
    this.trail = new cloudtrail.Trail(this, 'Trail', {
      trailName: `${stackPrefix}-${environment}-audit-trail`,
      bucket: this.logBucket,
      cloudWatchLogGroup: this.logGroup,
      encryptionKey: this.kmsKey,
      enableFileValidation: true,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      managementEvents: cloudtrail.ReadWriteType.ALL,
      sendToCloudWatchLogs: true,
      snsTopic: this.alertTopic,
    });

    // データイベントの記録（S3）
    // 注意: 全S3バケットを対象とすると大量のログが生成されるため、
    // 重要なバケットのみを対象とする
    // this.trail.addS3EventSelector([
    //   {
    //     bucket: importantBucket,
    //     objectPrefix: 'sensitive-data/',
    //   },
    // ]);

    // データイベントの記録（Lambda）
    // 注意: 全Lambda関数を対象とすると大量のログが生成されるため、
    // 重要な関数のみを対象とする
    // this.trail.addLambdaEventSelector([importantFunction]);

    // タグの適用
    cdk.Tags.of(this).add('Project', config.projectName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Stack', 'CloudTrail');

    // スタック出力
    new cdk.CfnOutput(this, 'TrailArn', {
      value: this.trail.trailArn,
      description: 'CloudTrail ARN',
      exportName: `${stackPrefix}-${environment}-cloudtrail-arn`,
    });

    new cdk.CfnOutput(this, 'LogBucketName', {
      value: this.logBucket.bucketName,
      description: 'CloudTrail log bucket name',
      exportName: `${stackPrefix}-${environment}-cloudtrail-bucket`,
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'CloudTrail log group name',
      exportName: `${stackPrefix}-${environment}-cloudtrail-loggroup`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'CloudTrail alert topic ARN',
      exportName: `${stackPrefix}-${environment}-cloudtrail-alert-topic`,
    });
  }
}
