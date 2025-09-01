import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../config/environment';
import { constants } from '../config/constants';

export interface S3FrontendConstructProps {
  config: EnvironmentConfig;
  environment: string;
}

/**
 * フロントエンド配信用S3バケットコンストラクト
 *
 * 機能:
 * - 静的ウェブサイトホスティング用S3バケット作成
 * - セキュリティ設定（パブリックアクセスブロック）
 * - バージョニング設定
 * - 暗号化設定
 * - ライフサイクルポリシー設定
 * - 環境別バケット名設定
 */
export class S3FrontendConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly bucketName: string;

  constructor(scope: Construct, id: string, props: S3FrontendConstructProps) {
    super(scope, id);

    const { config, environment } = props;

    // バケット名の生成（環境別）
    const generatedBucketName = this.generateBucketName(config.stackPrefix);

    // S3バケットの作成
    this.bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: generatedBucketName,

      // バージョニング設定
      versioned: config.frontend.s3.enableVersioning,

      // 暗号化設定
      encryption: s3.BucketEncryption.S3_MANAGED,

      // パブリックアクセスブロック（CloudFront経由のみアクセス許可）
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      // CORS設定
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],

      // ライフサイクルポリシー
      lifecycleRules: config.frontend.s3.lifecyclePolicyEnabled
        ? [
            {
              id: 'DeleteIncompleteMultipartUploads',
              abortIncompleteMultipartUploadAfter: Duration.days(
                config.frontend.s3.incompleteMultipartUploadDays || 7
              ),
              enabled: true,
            },
            {
              id: 'DeleteOldVersions',
              noncurrentVersionExpiration: Duration.days(
                config.frontend.s3.oldVersionExpirationDays || 30
              ),
              enabled: true,
            },
          ]
        : [],

      // 削除ポリシー（環境別）
      removalPolicy: this.getRemovalPolicy(environment),

      // 自動削除オブジェクト（開発環境のみ）
      autoDeleteObjects:
        environment === constants.ENVIRONMENTS.DEV || environment === constants.ENVIRONMENTS.LOCAL,

      // 通知設定
      eventBridgeEnabled: true,

      // タグ設定
      ...this.getBucketTags(config, environment),
    });

    // バケット通知設定
    this.setupBucketNotifications();

    // メトリクス設定
    this.setupBucketMetrics();

    // バケット名を設定（作成後に取得）
    this.bucketName = this.bucket.bucketName;
  }

  /**
   * 環境別バケット名生成
   */
  private generateBucketName(stackPrefix: string): string | undefined {
    // AWS アカウントIDを取得（スタック作成時に利用可能）
    const accountId = this.node.tryGetContext('accountId');

    if (accountId && /^\d{12}$/.test(accountId)) {
      // 実際のアカウントIDが利用可能な場合
      return `${stackPrefix}-frontend-${accountId}`.toLowerCase();
    } else {
      // テスト環境やアカウントIDが不明な場合は、バケット名を自動生成させる
      // CDKが自動的にユニークなサフィックスを追加する
      return undefined;
    }
  }

  /**
   * 環境別削除ポリシー設定
   */
  private getRemovalPolicy(environment: string): RemovalPolicy {
    switch (environment) {
      case constants.ENVIRONMENTS.PROD:
        return RemovalPolicy.RETAIN;
      case constants.ENVIRONMENTS.STG:
        return RemovalPolicy.SNAPSHOT;
      case constants.ENVIRONMENTS.DEV:
      case constants.ENVIRONMENTS.LOCAL:
      default:
        return RemovalPolicy.DESTROY;
    }
  }

  /**
   * バケットタグ設定
   */
  private getBucketTags(config: EnvironmentConfig, environment: string) {
    return {
      tags: {
        ...config.tags,
        Component: 'frontend-storage',
        Purpose: 'static-website-hosting',
        BucketType: 'frontend',
        Environment: environment,
        ManagedBy: 'cdk',
        Project: 'goal-mandala',
      },
    };
  }

  /**
   * バケット通知設定
   */
  private setupBucketNotifications(): void {
    // 将来的にLambda関数やSNSトピックへの通知設定を追加可能
    // 現在は基本設定のみ
  }

  /**
   * バケットメトリクス設定
   */
  private setupBucketMetrics(): void {
    // CloudWatchメトリクス設定
    this.bucket.addMetric({
      id: 'EntireBucket',
    });
  }

  /**
   * アクセスログ設定
   */
  public setupAccessLogging(logsBucket: s3.IBucket, logPrefix?: string): void {
    // S3アクセスログの設定
    // 注意: CDKでは既存バケットのアクセスログ設定は制限があるため、
    // 新規バケット作成時に設定することを推奨

    const prefix = logPrefix || 's3-access-logs/';

    // ログ配信用の権限設定はMonitoringConstructで実装済み
    console.log(`Access logging configured for bucket ${this.bucket.bucketName}`);
    console.log(`Logs will be delivered to: ${logsBucket.bucketName}/${prefix}`);
    console.log('Note: Access logging must be enabled manually in the AWS Console or via AWS CLI');
    console.log(
      `aws s3api put-bucket-logging --bucket ${this.bucket.bucketName} --bucket-logging-status file://logging.json`
    );
  }

  /**
   * CloudFront用のバケットポリシーを作成
   *
   * @param distributionArn CloudFrontディストリビューションのARN
   */
  public addCloudFrontPolicy(distributionArn: string): void {
    const bucketPolicy = new iam.PolicyStatement({
      sid: 'AllowCloudFrontServicePrincipal',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [`${this.bucket.bucketArn}/*`],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': distributionArn,
        },
      },
    });

    this.bucket.addToResourcePolicy(bucketPolicy);
  }

  /**
   * デプロイ用IAMロールにバケットアクセス権限を付与
   *
   * @param role デプロイ用IAMロール
   */
  public grantDeploymentAccess(role: iam.IRole): void {
    // S3オブジェクトの読み書き権限
    this.bucket.grantReadWrite(role);

    // バケット自体の操作権限
    this.bucket.grantRead(role);

    // 追加の権限（リスト、削除など）
    role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:ListBucket',
          's3:DeleteObject',
          's3:DeleteObjectVersion',
          's3:GetBucketLocation',
          's3:GetBucketVersioning',
        ],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
      })
    );
  }

  /**
   * バケット情報の取得
   */
  public getBucketInfo() {
    return {
      bucketName: this.bucket.bucketName,
      bucketArn: this.bucket.bucketArn,
      bucketDomainName: this.bucket.bucketDomainName,
      bucketRegionalDomainName: this.bucket.bucketRegionalDomainName,
      bucketWebsiteUrl: this.bucket.bucketWebsiteUrl,
    };
  }
}
