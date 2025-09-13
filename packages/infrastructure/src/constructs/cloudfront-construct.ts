import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';

import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../config/environment';
import { constants } from '../config/constants';

export interface CloudFrontConstructProps {
  config: EnvironmentConfig;
  environment: string;
  bucket: s3.IBucket;
  alertTopic?: sns.ITopic;
}

/**
 * CloudFrontディストリビューションコンストラクト
 *
 * 機能:
 * - S3オリジン設定とOAC（Origin Access Control）
 * - デフォルトルートオブジェクトとエラーページ設定
 * - 環境別ドメイン設定
 * - SSL証明書の作成と管理
 * - セキュリティヘッダー設定（Response Headers Policy）
 * - 基本的なキャッシュ設定
 * - 監視・アラート設定
 */
export class CloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly originAccessControl: cloudfront.CfnOriginAccessControl;
  public readonly certificate?: acm.Certificate;
  public readonly responseHeadersPolicy: cloudfront.ResponseHeadersPolicy;
  public readonly staticAssetsCachePolicy: cloudfront.CachePolicy;
  public readonly htmlCachePolicy: cloudfront.CachePolicy;
  public readonly domainName: string;

  constructor(scope: Construct, id: string, props: CloudFrontConstructProps) {
    super(scope, id);

    const { config, environment, bucket, alertTopic } = props;

    // Origin Access Control (OAC) の作成
    this.originAccessControl = this.createOriginAccessControl();

    // SSL証明書の作成または取得
    this.certificate = this.createOrGetCertificate(config, environment);

    // Response Headers Policy の作成
    this.responseHeadersPolicy = this.createResponseHeadersPolicy(config, environment);

    // カスタムキャッシュポリシーの作成
    this.staticAssetsCachePolicy = this.createStaticAssetsCachePolicy(config, environment);
    this.htmlCachePolicy = this.createHtmlCachePolicy(config, environment);

    // CloudFrontディストリビューションの作成
    this.distribution = this.createDistribution(
      config,
      environment,
      bucket,
      this.certificate,
      this.responseHeadersPolicy
    );

    // ドメイン名の設定
    this.domainName = this.distribution.distributionDomainName;

    // CloudWatchアラームの設定
    if (alertTopic) {
      this.setupCloudWatchAlarms(alertTopic);
    }

    // セキュリティ要件の検証
    this.validateSecurityRequirements(config);

    // タグ設定
    this.addTags(config, environment);
  }

  /**
   * Origin Access Control (OAC) の作成
   */
  private createOriginAccessControl(): cloudfront.CfnOriginAccessControl {
    return new cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
        description: 'OAC for S3 frontend bucket access',
        name: `${this.node.id}-oac`,
        originAccessControlOriginType: 'S3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });
  }

  /**
   * SSL証明書の作成または取得（環境別）
   */
  private createOrGetCertificate(
    config: EnvironmentConfig,
    environment: string
  ): acm.Certificate | undefined {
    // 既存の証明書ARNが指定されている場合は、それを使用
    if (config.frontend.certificateArn) {
      return acm.Certificate.fromCertificateArn(
        this,
        'ExistingCertificate',
        config.frontend.certificateArn
      ) as acm.Certificate;
    }

    // ドメイン名が指定されている場合は、新しい証明書を作成
    if (config.frontend.domainName) {
      return this.createAcmCertificate(config, environment);
    }

    // ドメイン名も証明書ARNも指定されていない場合は、証明書なし
    return undefined;
  }

  /**
   * ACM証明書の作成
   */
  private createAcmCertificate(config: EnvironmentConfig, environment: string): acm.Certificate {
    const domainName = config.frontend.domainName!;

    // サブドメインも含める場合のドメイン名リスト
    const domainNames = [domainName];

    // www サブドメインも追加（本番環境の場合）
    if (environment === constants.ENVIRONMENTS.PROD && !domainName.startsWith('www.')) {
      domainNames.push(`www.${domainName}`);
    }

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      subjectAlternativeNames: domainNames.length > 1 ? domainNames.slice(1) : undefined,
      validation: acm.CertificateValidation.fromDns(),
      certificateName: `${config.stackPrefix}-${environment}-certificate`,
    });

    // 証明書の有効期限監視アラーム
    this.createCertificateExpirationAlarm(certificate);

    return certificate;
  }

  /**
   * 証明書有効期限監視アラームの作成
   */
  private createCertificateExpirationAlarm(certificate: acm.Certificate): void {
    // ACM証明書の有効期限メトリクス
    const daysToExpiryMetric = new cloudwatch.Metric({
      namespace: 'AWS/CertificateManager',
      metricName: 'DaysToExpiry',
      dimensionsMap: {
        CertificateArn: certificate.certificateArn,
      },
      period: Duration.hours(12),
      statistic: 'Minimum',
    });

    new cloudwatch.Alarm(this, 'CertificateExpirationAlarm', {
      alarmName: `${this.node.id}-certificate-expiration`,
      alarmDescription: 'SSL certificate is approaching expiration',
      metric: daysToExpiryMetric,
      threshold: 30, // 30日前にアラート
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });
  }

  /**
   * Response Headers Policy の作成
   */
  private createResponseHeadersPolicy(
    config: EnvironmentConfig,
    environment: string
  ): cloudfront.ResponseHeadersPolicy {
    const securityConfig = config.frontend.security || {
      enableHsts: false,
      enableContentTypeOptions: true,
      enableFrameOptions: true,
      frameOptionsValue: 'DENY',
      enableReferrerPolicy: true,
      referrerPolicyValue: 'strict-origin-when-cross-origin',
      enableCsp: false,
    };

    // セキュリティヘッダーの設定
    const securityHeadersBehavior: cloudfront.ResponseSecurityHeadersBehavior = {};

    // HSTS (HTTP Strict Transport Security)
    if (securityConfig.enableHsts) {
      (securityHeadersBehavior as Record<string, unknown>).strictTransportSecurity = {
        accessControlMaxAge: Duration.seconds(securityConfig.hstsMaxAge || 31536000),
        includeSubdomains: securityConfig.hstsIncludeSubdomains || false,
        preload: securityConfig.hstsPreload || false,
        override: true,
      };
    }

    // X-Content-Type-Options
    if (securityConfig.enableContentTypeOptions) {
      (securityHeadersBehavior as Record<string, unknown>).contentTypeOptions = {
        override: true,
      };
    }

    // X-Frame-Options
    if (securityConfig.enableFrameOptions) {
      (securityHeadersBehavior as Record<string, unknown>).frameOptions = {
        frameOption:
          securityConfig.frameOptionsValue === 'DENY'
            ? cloudfront.HeadersFrameOption.DENY
            : cloudfront.HeadersFrameOption.SAMEORIGIN,
        override: true,
      };
    }

    // Referrer-Policy
    if (securityConfig.enableReferrerPolicy) {
      (securityHeadersBehavior as Record<string, unknown>).referrerPolicy = {
        referrerPolicy: this.mapReferrerPolicy(
          securityConfig.referrerPolicyValue || 'strict-origin-when-cross-origin'
        ),
        override: true,
      };
    }

    // カスタムヘッダーの設定
    const customHeaders: cloudfront.ResponseCustomHeader[] = [];

    // CSP (Content Security Policy)
    if (securityConfig.enableCsp && securityConfig.cspDirectives) {
      const cspValue = this.buildCspValue(securityConfig.cspDirectives);
      customHeaders.push({
        header: 'Content-Security-Policy',
        value: cspValue,
        override: true,
      });
    }

    // その他のカスタムヘッダー
    if (securityConfig.customHeaders) {
      Object.entries(securityConfig.customHeaders).forEach(([header, value]) => {
        customHeaders.push({
          header,
          value,
          override: true,
        });
      });
    }

    // Response Headers Policy の作成
    return new cloudfront.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
      responseHeadersPolicyName: `${config.stackPrefix}-${environment}-security-headers`,
      comment: `Security headers policy for ${config.stackPrefix} ${environment} environment`,
      securityHeadersBehavior,
      customHeadersBehavior:
        customHeaders.length > 0
          ? {
              customHeaders,
            }
          : undefined,
    });
  }

  /**
   * Referrer Policy の値をマッピング
   */
  private mapReferrerPolicy(value: string): cloudfront.HeadersReferrerPolicy {
    const mapping: Record<string, cloudfront.HeadersReferrerPolicy> = {
      'no-referrer': cloudfront.HeadersReferrerPolicy.NO_REFERRER,
      'no-referrer-when-downgrade': cloudfront.HeadersReferrerPolicy.NO_REFERRER_WHEN_DOWNGRADE,
      origin: cloudfront.HeadersReferrerPolicy.ORIGIN,
      'origin-when-cross-origin': cloudfront.HeadersReferrerPolicy.ORIGIN_WHEN_CROSS_ORIGIN,
      'same-origin': cloudfront.HeadersReferrerPolicy.SAME_ORIGIN,
      'strict-origin': cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN,
      'strict-origin-when-cross-origin':
        cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
      'unsafe-url': cloudfront.HeadersReferrerPolicy.UNSAFE_URL,
    };

    return mapping[value] || cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN;
  }

  /**
   * CSP ディレクティブから CSP 値を構築
   */
  private buildCspValue(directives: Record<string, string[]>): string {
    return Object.entries(directives)
      .map(([directive, values]) => `${directive} ${values.join(' ')}`)
      .join('; ');
  }

  /**
   * 静的アセット用の長期キャッシュポリシーを作成
   */
  private createStaticAssetsCachePolicy(
    config: EnvironmentConfig,
    environment: string
  ): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
      cachePolicyName: `${config.stackPrefix}-${environment}-static-assets-cache`,
      comment: `Long-term cache policy for static assets (${environment})`,
      defaultTtl: Duration.days(30), // 30日
      maxTtl: Duration.days(365), // 1年
      minTtl: Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });
  }

  /**
   * HTML・API用の短期キャッシュポリシーを作成
   */
  private createHtmlCachePolicy(
    config: EnvironmentConfig,
    environment: string
  ): cloudfront.CachePolicy {
    return new cloudfront.CachePolicy(this, 'HtmlCachePolicy', {
      cachePolicyName: `${config.stackPrefix}-${environment}-html-cache`,
      comment: `Short-term cache policy for HTML and API responses (${environment})`,
      defaultTtl: Duration.minutes(5), // 5分
      maxTtl: Duration.hours(1), // 1時間
      minTtl: Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Accept',
        'Accept-Language',
        'Authorization'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });
  }

  /**
   * 追加ビヘイビアの作成（パフォーマンス最適化）
   */
  private createAdditionalBehaviors(
    s3Origin: cloudfront.IOrigin,
    responseHeadersPolicy: cloudfront.ResponseHeadersPolicy
  ): Record<string, cloudfront.BehaviorOptions> {
    return {
      // 静的アセットディレクトリ用の長期キャッシュ
      '/assets/*': {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: this.staticAssetsCachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: responseHeadersPolicy,
      },
      // JavaScript ファイル用の長期キャッシュ
      '*.js': {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: this.staticAssetsCachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: responseHeadersPolicy,
      },
      // CSS ファイル用の長期キャッシュ
      '*.css': {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        cachePolicy: this.staticAssetsCachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: responseHeadersPolicy,
      },
    };
  }

  /**
   * CloudFrontディストリビューションの作成
   */
  private createDistribution(
    config: EnvironmentConfig,
    environment: string,
    bucket: s3.IBucket,
    certificate?: acm.Certificate,
    responseHeadersPolicy?: cloudfront.ResponseHeadersPolicy
  ): cloudfront.Distribution {
    // S3オリジンの設定
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(bucket);

    // ディストリビューション設定
    const distributionProps: cloudfront.DistributionProps = {
      comment: `CloudFront distribution for ${config.stackPrefix} frontend (${environment})`,
      defaultRootObject: 'index.html',
      priceClass: this.getPriceClass(environment),
      geoRestriction: cloudfront.GeoRestriction.allowlist('JP', 'US'),
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableIpv6: true,
      enableLogging: config.frontend.monitoring?.enableCloudFrontLogs || false,
      logFilePrefix: 'cloudfront-logs/',
      logIncludesCookies: false,
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true,
        cachePolicy: this.htmlCachePolicy,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: responseHeadersPolicy,
      },
      additionalBehaviors: responseHeadersPolicy
        ? this.createAdditionalBehaviors(s3Origin, responseHeadersPolicy)
        : {},
      errorResponses: config.frontend.customErrorResponses
        ? [
            {
              httpStatus: 404,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: Duration.minutes(5),
            },
            {
              httpStatus: 403,
              responseHttpStatus: 200,
              responsePagePath: '/index.html',
              ttl: Duration.minutes(5),
            },
          ]
        : [],
      domainNames: config.frontend.domainName ? [config.frontend.domainName] : undefined,
      certificate: certificate,
    };

    return new cloudfront.Distribution(this, 'Distribution', distributionProps);
  }

  /**
   * 環境別の価格クラスを取得
   */
  private getPriceClass(environment: string): cloudfront.PriceClass {
    switch (environment) {
      case constants.ENVIRONMENTS.PROD:
        return cloudfront.PriceClass.PRICE_CLASS_ALL;
      case constants.ENVIRONMENTS.STG:
        return cloudfront.PriceClass.PRICE_CLASS_200;
      default:
        return cloudfront.PriceClass.PRICE_CLASS_100;
    }
  }

  /**
   * CloudWatchアラームの設定
   */
  private setupCloudWatchAlarms(alertTopic: sns.ITopic): void {
    // エラー率アラーム
    const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
      alarmName: `${this.node.id}-error-rate`,
      alarmDescription: 'CloudFront distribution error rate is high',
      metric: this.distribution.metric4xxErrorRate({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 5, // 5%
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));

    // オリジンレイテンシーアラーム（publishAdditionalMetricsが有効な場合のみ）
    // CloudFrontのオリジンレイテンシーメトリクスは追加メトリクスが有効な場合のみ利用可能
    // 現在は基本メトリクスのみを使用するため、このアラームはコメントアウト
    /*
    const latencyAlarm = new cloudwatch.Alarm(this, 'LatencyAlarm', {
      alarmName: `${this.node.id}-origin-latency`,
      alarmDescription: 'CloudFront origin latency is high',
      metric: this.distribution.metricOriginLatency({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 30000, // 30秒
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    latencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    */

    // キャッシュヒット率アラーム（低い場合）
    // CloudFrontのキャッシュヒット率メトリクスは追加メトリクスが有効な場合のみ利用可能
    // 現在は基本メトリクスのみを使用するため、このアラームはコメントアウト
    /*
    const cacheHitRateAlarm = new cloudwatch.Alarm(this, 'CacheHitRateAlarm', {
      alarmName: `${this.node.id}-cache-hit-rate`,
      alarmDescription: 'CloudFront cache hit rate is low',
      metric: this.distribution.metricCacheHitRate({
        period: Duration.minutes(15),
        statistic: 'Average',
      }),
      threshold: 80, // 80%
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    cacheHitRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alertTopic));
    */
  }

  /**
   * セキュリティ要件の検証
   */
  private validateSecurityRequirements(config: EnvironmentConfig): void {
    const securityConfig = config.frontend.security || {
      enableHsts: false,
      enableContentTypeOptions: true,
      enableFrameOptions: true,
      frameOptionsValue: 'DENY',
      enableReferrerPolicy: true,
      referrerPolicyValue: 'strict-origin-when-cross-origin',
      enableCsp: false,
    };
    const warnings: string[] = [];
    const errors: string[] = [];

    // HTTPS強制の確認
    if (!this.certificate && config.frontend.domainName) {
      warnings.push(
        'Custom domain is configured but no SSL certificate is provided. HTTPS will not be enforced for custom domain.'
      );
    }

    // 本番環境での追加チェック
    if (config.environment === constants.ENVIRONMENTS.PROD) {
      if (!this.certificate) {
        errors.push('SSL certificate is required for production environment.');
      }

      if (!securityConfig.enableHsts) {
        errors.push('HSTS must be enabled for production environment.');
      }
    }

    // 警告とエラーの出力
    if (warnings.length > 0) {
      console.warn('Security Configuration Warnings:');
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    if (errors.length > 0) {
      console.error('Security Configuration Errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      throw new Error(`Security validation failed: ${errors.join('; ')}`);
    }
  }

  /**
   * タグの追加
   */
  private addTags(config: EnvironmentConfig, environment: string): void {
    const tags = {
      Environment: environment,
      Component: 'CloudFront',
      Service: config.stackPrefix,
      ManagedBy: 'CDK',
      ...config.tags,
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  /**
   * キャッシュ無効化のヘルパーメソッド
   */
  public getCacheInvalidationCommand(paths: string[] = ['/*']): string {
    return `aws cloudfront create-invalidation --distribution-id ${this.distribution.distributionId} --paths "${paths.join('" "')}"`;
  }

  /**
   * ディストリビューション情報の取得
   */
  public getDistributionInfo(): {
    distributionId: string;
    domainName: string;
    distributionArn: string;
  } {
    return {
      distributionId: this.distribution.distributionId,
      domainName: this.distribution.distributionDomainName,
      distributionArn: this.distribution.distributionArn,
    };
  }

  /**
   * セキュリティ設定の取得
   */
  public getSecurityConfiguration(): {
    responseHeadersPolicyId: string;
    certificateArn?: string;
    httpsRedirect: boolean;
  } {
    return {
      responseHeadersPolicyId: this.responseHeadersPolicy.responseHeadersPolicyId,
      certificateArn: this.certificate?.certificateArn,
      httpsRedirect: true,
    };
  }

  /**
   * キャッシュ設定の取得
   */
  public getCacheConfiguration(): {
    staticAssetsCachePolicyId: string;
    htmlCachePolicyId: string;
    defaultCacheBehavior: string;
  } {
    return {
      staticAssetsCachePolicyId: this.staticAssetsCachePolicy.cachePolicyId,
      htmlCachePolicyId: this.htmlCachePolicy.cachePolicyId,
      defaultCacheBehavior: 'HTML/API (short-term cache)',
    };
  }

  /**
   * 監視設定の取得
   */
  public getMonitoringConfiguration(): {
    errorRateThreshold: number;
    latencyThreshold: number;
    cacheHitRateThreshold: number;
  } {
    return {
      errorRateThreshold: 5, // 5%
      latencyThreshold: 30000, // 30秒
      cacheHitRateThreshold: 80, // 80%
    };
  }
}
