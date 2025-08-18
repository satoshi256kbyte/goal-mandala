import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface FrontendStackProps extends cdk.StackProps {
  api: apigateway.RestApi;
  config: EnvironmentConfig;
}

export class FrontendStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly oac: cloudfront.S3OriginAccessControl;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const { api, config } = props;

    // S3バケット（フロントエンド用）
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${config.stackPrefix}-frontend-${this.account}`,

      // セキュリティ設定
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,

      // バージョニング設定
      versioned: false, // 開発環境では無効

      // ライフサイクル設定
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],

      // 削除設定
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Origin Access Control (OAC) 作成
    this.oac = new cloudfront.S3OriginAccessControl(this, 'OriginAccessControl', {
      description: `OAC for ${config.stackPrefix} frontend`,
    });

    // セキュリティヘッダー設定
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      responseHeadersPolicyName: `${config.stackPrefix}-security-headers`,
      comment: 'Security headers for Goal Mandala application',

      // セキュリティヘッダー
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000), // 1年
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React開発用
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            `connect-src 'self' ${api.url}`,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
          override: true,
        },
      },
    });

    // CloudFront Distribution 作成
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `CloudFront distribution for ${config.stackPrefix}`,

      // デフォルトビヘイビア（フロントエンド）
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket, {
          originAccessControl: this.oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy,
        compress: true,
      },

      // 追加ビヘイビア（API）
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.RestApiOrigin(api),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // APIはキャッシュしない
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          responseHeadersPolicy,
        },
      },

      // デフォルトルートオブジェクト
      defaultRootObject: 'index.html',

      // エラーレスポンス設定（SPA用）
      errorResponses: config.frontend.customErrorResponses
        ? [
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: cdk.Duration.minutes(5),
            },
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: cdk.Duration.minutes(5),
            },
          ]
        : undefined,

      // 価格クラス設定（コスト最適化）
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // 北米・ヨーロッパのみ

      // ログ設定
      enableLogging: true,
      logBucket: new s3.Bucket(this, 'CloudFrontLogsBucket', {
        bucketName: `${config.stackPrefix}-cloudfront-logs-${this.account}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        lifecycleRules: [
          {
            id: 'DeleteOldLogs',
            expiration: cdk.Duration.days(90), // 90日後に削除
          },
        ],
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }),
      logFilePrefix: 'access-logs/',

      // 地理的制限（必要に応じて）
      geoRestriction: cloudfront.GeoRestriction.allowlist('JP', 'US'), // 日本とアメリカのみ許可

      // HTTP バージョン
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,

      // IPv6 サポート
      enableIpv6: true,
    });

    // S3バケットポリシー（CloudFrontからのアクセスのみ許可）
    this.websiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontServicePrincipal',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [`${this.websiteBucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    // フロントエンドデプロイ（開発時のみ）
    if (config.stackPrefix.includes('dev') || config.stackPrefix.includes('local')) {
      new s3deploy.BucketDeployment(this, 'DeployWebsite', {
        sources: [s3deploy.Source.asset('../frontend/dist')], // フロントエンドのビルド成果物
        destinationBucket: this.websiteBucket,
        distribution: this.distribution,
        distributionPaths: ['/*'], // 全てのパスを無効化

        // メタデータ設定
        metadata: {
          'Cache-Control': 'max-age=31536000', // 1年間キャッシュ
        },

        // 除外ファイル設定
        exclude: ['*.map'], // ソースマップは除外

        // 削除設定
        prune: true, // 古いファイルを削除
      });
    }

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.websiteBucket).add(key, value);
        cdk.Tags.of(this.distribution).add(key, value);
      });
    }

    // 出力
    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: this.websiteBucket.bucketName,
      description: 'S3 bucket name for frontend',
      exportName: `${config.stackPrefix}-website-bucket-name`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${config.stackPrefix}-distribution-id`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${config.stackPrefix}-distribution-domain-name`,
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL',
      exportName: `${config.stackPrefix}-website-url`,
    });

    // カスタムドメインが設定されている場合
    if (config.frontend.domainName) {
      new cdk.CfnOutput(this, 'CustomDomainUrl', {
        value: `https://${config.frontend.domainName}`,
        description: 'Custom domain URL',
        exportName: `${config.stackPrefix}-custom-domain-url`,
      });
    }
  }
}
