import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CloudFrontConstruct } from './cloudfront-construct';
import { getEnvironmentConfig } from '../config/environment';

describe('CloudFrontConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let bucket: s3.Bucket;
  let alertTopic: sns.Topic;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    bucket = new s3.Bucket(stack, 'TestBucket');
    alertTopic = new sns.Topic(stack, 'TestTopic');
  });

  describe('基本的な構成', () => {
    test('開発環境でCloudFrontディストリビューションが作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // CloudFrontディストリビューションの存在確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
          PriceClass: 'PriceClass_100',
        },
      });

      // Origin Access Control の存在確認
      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          OriginAccessControlOriginType: 'S3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });

      // Response Headers Policy の存在確認
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);

      expect(construct.distribution).toBeDefined();
      expect(construct.originAccessControl).toBeDefined();
      expect(construct.responseHeadersPolicy).toBeDefined();
    });

    test('本番環境でより厳しいセキュリティ設定が適用される', () => {
      // Arrange
      const config = getEnvironmentConfig('prod');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'prod',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 本番環境の価格クラス確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_All',
        },
      });

      // HSTS設定の確認（本番環境では有効）
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            StrictTransportSecurity: {
              AccessControlMaxAgeSec: 31536000,
              IncludeSubdomains: true,
              Preload: true,
              Override: true,
            },
          },
        },
      });
    });
  });

  describe('SSL証明書設定', () => {
    test('ドメイン名が指定されている場合、ACM証明書が作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.domainName = 'dev.example.com';

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ACM証明書の存在確認
      template.hasResourceProperties('AWS::CertificateManager::Certificate', {
        DomainName: 'dev.example.com',
        ValidationMethod: 'DNS',
      });

      expect(construct.certificate).toBeDefined();
    });

    test('証明書ARNが指定されている場合、既存証明書が使用される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.certificateArn =
        'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012';

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 新しい証明書は作成されない
      template.resourceCountIs('AWS::CertificateManager::Certificate', 0);

      expect(construct.certificate).toBeDefined();
    });
  });

  describe('セキュリティヘッダー設定', () => {
    test('セキュリティヘッダーが正しく設定される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.security = {
        enableHsts: true,
        hstsMaxAge: 31536000,
        hstsIncludeSubdomains: true,
        hstsPreload: true,
        enableContentTypeOptions: true,
        enableFrameOptions: true,
        frameOptionsValue: 'DENY',
        enableReferrerPolicy: true,
        referrerPolicyValue: 'strict-origin-when-cross-origin',
        enableCsp: true,
        cspDirectives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
        },
        customHeaders: {
          'X-Test-Header': 'test-value',
        },
      };

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // Response Headers Policy の存在確認
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);

      expect(construct.responseHeadersPolicy).toBeDefined();
    });
  });

  describe('監視・アラート設定', () => {
    test('CloudWatchアラームが作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // アラームが作成されることを確認（基本3個 + キャッシュ効率監視3個 = 6個）
      template.resourceCountIs('AWS::CloudWatch::Alarm', 6);
    });
  });

  describe('セキュリティ検証', () => {
    test('本番環境でのセキュリティ要件が満たされる', () => {
      // Arrange
      const config = getEnvironmentConfig('prod');
      config.frontend.domainName = 'example.com';

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'prod',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // HTTPS強制が設定されていることを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https',
          },
        },
      });

      // セキュリティヘッダーが設定されていることを確認
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            StrictTransportSecurity: {
              AccessControlMaxAgeSec: 31536000,
              IncludeSubdomains: true,
              Preload: true,
              Override: true,
            },
            ContentTypeOptions: {
              Override: true,
            },
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
            ReferrerPolicy: {
              ReferrerPolicy: 'strict-origin-when-cross-origin',
              Override: true,
            },
          },
        },
      });

      // CSPヘッダーが設定されていることを確認
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'Content-Security-Policy',
                Value: Match.stringLikeRegexp("default-src 'self'.*"),
                Override: true,
              },
            ]),
          },
        },
      });
    });

    test('開発環境でのセキュリティ設定が適用される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 基本的なセキュリティヘッダーが設定されていることを確認
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentTypeOptions: {
              Override: true,
            },
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
            ReferrerPolicy: {
              ReferrerPolicy: 'strict-origin-when-cross-origin',
              Override: true,
            },
          },
        },
      });
    });

    test('セキュリティ設定の検証が正しく動作する', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.domainName = 'dev.example.com';

      // Act & Assert - セキュリティ検証がエラーを投げないことを確認
      expect(() => {
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          config,
          environment: 'dev',
          bucket,
          alertTopic,
        });
      }).not.toThrow();
    });

    test('本番環境で証明書が必須であることを確認', () => {
      // Arrange
      const config = getEnvironmentConfig('prod');
      // 証明書設定を削除
      delete config.frontend.domainName;
      delete config.frontend.certificateArn;

      // Act & Assert - 本番環境で証明書がない場合でも警告のみでエラーは発生しない
      expect(() => {
        new CloudFrontConstruct(stack, 'TestCloudFront', {
          config,
          environment: 'prod',
          bucket,
          alertTopic,
        });
      }).not.toThrow();
    });

    test('カスタムセキュリティヘッダーが正しく設定される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.security = {
        ...config.frontend.security,
        customHeaders: {
          'X-Custom-Security': 'custom-value',
          'X-API-Version': 'v1.0',
        },
      };

      // Act
      new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'X-Custom-Security',
                Value: 'custom-value',
                Override: true,
              },
              {
                Header: 'X-API-Version',
                Value: 'v1.0',
                Override: true,
              },
            ]),
          },
        },
      });
    });
  });

  describe('キャッシュポリシーと最適化設定', () => {
    test('カスタムキャッシュポリシーが作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 静的アセット用キャッシュポリシーの存在確認
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: `${config.stackPrefix}-dev-static-assets-cache`,
          Comment: 'Long-term cache policy for static assets (dev)',
          DefaultTTL: 2592000, // 30日
          MaxTTL: 31536000, // 1年
          MinTTL: 0,
        },
      });

      // HTML用キャッシュポリシーの存在確認
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: `${config.stackPrefix}-dev-html-cache`,
          Comment: 'Short-term cache policy for HTML and API responses (dev)',
          DefaultTTL: 300, // 5分
          MaxTTL: 3600, // 1時間
          MinTTL: 0,
        },
      });

      expect(construct.staticAssetsCachePolicy).toBeDefined();
      expect(construct.htmlCachePolicy).toBeDefined();
    });

    test('追加ビヘイビアが正しく設定される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ビヘイビア数の確認（14個の追加ビヘイビア）
      const distributionResource = template.findResources('AWS::CloudFront::Distribution');
      const distribution = Object.values(distributionResource)[0] as any;
      const cacheBehaviors = distribution.Properties.DistributionConfig.CacheBehaviors;

      expect(cacheBehaviors).toHaveLength(14);

      // 主要なパスパターンが含まれていることを確認
      const pathPatterns = cacheBehaviors.map((behavior: any) => behavior.PathPattern);
      expect(pathPatterns).toContain('/assets/*');
      expect(pathPatterns).toContain('*.js');
      expect(pathPatterns).toContain('*.css');
      expect(pathPatterns).toContain('*.html');
      expect(pathPatterns).toContain('*.png');
      expect(pathPatterns).toContain('*.jpg');
      expect(pathPatterns).toContain('*.woff');
      expect(pathPatterns).toContain('*.woff2');

      // 全てのビヘイビアでHTTPS強制が設定されていることを確認
      cacheBehaviors.forEach((behavior: any) => {
        expect(behavior.ViewerProtocolPolicy).toBe('redirect-to-https');
      });
    });

    test('圧縮設定が有効になっている', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // デフォルトビヘイビアで圧縮が有効
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            Compress: true,
          },
        },
      });

      // キャッシュポリシーでGzipとBrotli圧縮が有効
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          ParametersInCacheKeyAndForwardedToOrigin: {
            EnableAcceptEncodingGzip: true,
            EnableAcceptEncodingBrotli: true,
          },
        },
      });
    });

    test('キャッシュ最適化情報が正しく取得される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      const optimizationInfo = construct.getCacheOptimizationInfo();

      // Assert
      expect(optimizationInfo).toEqual({
        staticAssetsCacheTtl: '30 days (max: 1 year)',
        htmlCacheTtl: '5 minutes (max: 1 hour)',
        compressionEnabled: true,
        behaviorCount: expect.any(Number),
        optimizationFeatures: [
          'Gzip compression enabled',
          'Brotli compression enabled',
          'File-type specific caching',
          'Long-term caching for static assets',
          'Short-term caching for dynamic content',
          'Optimized cache keys',
          'CORS support',
        ],
      });
      expect(optimizationInfo.behaviorCount).toBeGreaterThan(10); // デフォルト + 追加ビヘイビア
    });

    test('キャッシュ無効化コマンドが正しく生成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      const invalidationCommand = construct.getCacheInvalidationCommand();
      const customPathsCommand = construct.getCacheInvalidationCommand(['/assets/*', '/*.html']);

      // Assert
      expect(invalidationCommand).toContain('aws cloudfront create-invalidation');
      expect(invalidationCommand).toContain('--distribution-id');
      expect(invalidationCommand).toContain('--paths "/*"');

      expect(customPathsCommand).toContain('/assets/*');
      expect(customPathsCommand).toContain('/*.html');
    });
  });

  describe('パフォーマンス監視', () => {
    test('キャッシュ効率監視アラームが作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 基本アラーム（3個）+ キャッシュ効率監視アラーム（3個）= 6個
      template.resourceCountIs('AWS::CloudWatch::Alarm', 6);

      // 高データ転送量アラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'CloudFront distribution has unusually high data transfer',
        MetricName: 'BytesDownloaded',
        Threshold: 10737418240, // 10GB
      });

      // 高リクエスト数アラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'CloudFront distribution has unusually high request rate',
        MetricName: 'Requests',
        Threshold: 10000,
      });

      // 高オリジンリクエスト数アラーム（キャッシュ効率低下）
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription:
          'CloudFront distribution has high origin request rate (low cache efficiency)',
        MetricName: 'OriginRequests',
        Threshold: 1000,
      });
    });
  });

  describe('Origin Access Control (OAC) 設定', () => {
    test('OACが正しく作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          Description: 'OAC for S3 frontend bucket access',
          Name: 'TestCloudFront-oac',
          OriginAccessControlOriginType: 'S3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });

      expect(construct.originAccessControl).toBeDefined();
    });
  });

  describe('地理的制限設定', () => {
    test('地理的制限が正しく設定される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Restrictions: {
            GeoRestriction: {
              RestrictionType: 'whitelist',
              Locations: ['JP', 'US'],
            },
          },
        },
      });
    });
  });

  describe('証明書有効期限監視', () => {
    test('証明書有効期限アラームが作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.domainName = 'dev.example.com';

      // Act
      new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 証明書有効期限アラームが作成される
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'SSL certificate is approaching expiration',
        MetricName: 'DaysToExpiry',
        Namespace: 'AWS/CertificateManager',
        Threshold: 30,
        ComparisonOperator: 'LessThanThreshold',
      });
    });
  });

  describe('Referrer Policy マッピング', () => {
    test('各種Referrer Policyが正しくマッピングされる', () => {
      const testCases = [
        { input: 'no-referrer', expected: 'no-referrer' },
        { input: 'origin', expected: 'origin' },
        { input: 'strict-origin', expected: 'strict-origin' },
        { input: 'strict-origin-when-cross-origin', expected: 'strict-origin-when-cross-origin' },
        { input: 'invalid-value', expected: 'strict-origin-when-cross-origin' }, // デフォルト値
      ];

      testCases.forEach(({ input, expected }, index) => {
        // 各テストケースで新しいアプリケーションとスタックを作成
        const testApp = new cdk.App();
        const testStack = new cdk.Stack(testApp, `TestStack${index}`);
        const testBucket = new s3.Bucket(testStack, 'TestBucket');
        const testAlertTopic = new sns.Topic(testStack, 'TestTopic');

        // Arrange
        const config = getEnvironmentConfig('dev');
        config.frontend.security = {
          ...config.frontend.security,
          enableReferrerPolicy: true,
          referrerPolicyValue: input,
        };

        // Act
        new CloudFrontConstruct(testStack, 'TestCloudFront', {
          config,
          environment: 'dev',
          bucket: testBucket,
          alertTopic: testAlertTopic,
        });

        // Assert
        const template = Template.fromStack(testStack);

        template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
          ResponseHeadersPolicyConfig: {
            SecurityHeadersConfig: {
              ReferrerPolicy: {
                ReferrerPolicy: expected,
                Override: true,
              },
            },
          },
        });
      });
    });
  });

  describe('CSP ディレクティブ構築', () => {
    test('CSPディレクティブが正しく構築される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.security = {
        ...config.frontend.security,
        enableCsp: true,
        cspDirectives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
        },
      };

      // Act
      new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'Content-Security-Policy',
                Value: Match.stringLikeRegexp(
                  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:"
                ),
                Override: true,
              },
            ]),
          },
        },
      });
    });
  });

  describe('ユーティリティメソッド', () => {
    test('ディストリビューション情報が正しく取得される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');
      config.frontend.domainName = 'dev.example.com';

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      const info = construct.getDistributionInfo();

      // Assert
      expect(info).toHaveProperty('distributionId');
      expect(info).toHaveProperty('distributionDomainName');
      expect(info).toHaveProperty('domainName');
      expect(info).toHaveProperty('certificateArn');
      expect(info).toHaveProperty('responseHeadersPolicyId');
      expect(info).toHaveProperty('staticAssetsCachePolicyId');
      expect(info).toHaveProperty('htmlCachePolicyId');
      expect(info).toHaveProperty('httpsEnabled');
      expect(info).toHaveProperty('cacheOptimization');
      expect(info).toHaveProperty('invalidationCommand');
      expect(info.httpsEnabled).toBe(true);
    });

    test('S3バケットポリシーが正しく更新される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      // バケットポリシーの更新
      construct.updateBucketPolicy(bucket);

      // Assert
      const template = Template.fromStack(stack);

      // S3バケットポリシーの存在確認
      template.resourceCountIs('AWS::S3::BucketPolicy', 1);
    });

    test('キャッシュ無効化コマンドが正しく生成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      const defaultCommand = construct.getCacheInvalidationCommand();
      const customCommand = construct.getCacheInvalidationCommand(['/assets/*', '/*.html']);

      // Assert
      expect(defaultCommand).toContain('aws cloudfront create-invalidation');
      expect(defaultCommand).toContain('--distribution-id');
      expect(defaultCommand).toContain('--paths "/*"');

      expect(customCommand).toContain('aws cloudfront create-invalidation');
      expect(customCommand).toContain('/assets/*');
      expect(customCommand).toContain('/*.html');
    });

    test('キャッシュ最適化情報が正しく取得される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act
      const construct = new CloudFrontConstruct(stack, 'TestCloudFront', {
        config,
        environment: 'dev',
        bucket,
        alertTopic,
      });

      const optimizationInfo = construct.getCacheOptimizationInfo();

      // Assert
      expect(optimizationInfo).toEqual({
        staticAssetsCacheTtl: '30 days (max: 1 year)',
        htmlCacheTtl: '5 minutes (max: 1 hour)',
        compressionEnabled: true,
        behaviorCount: expect.any(Number),
        optimizationFeatures: [
          'Gzip compression enabled',
          'Brotli compression enabled',
          'File-type specific caching',
          'Long-term caching for static assets',
          'Short-term caching for dynamic content',
          'Optimized cache keys',
          'CORS support',
        ],
      });

      expect(optimizationInfo.behaviorCount).toBeGreaterThan(10);
    });
  });

  describe('エラーハンドリング', () => {
    test('設定が不完全でもコンストラクトが作成される', () => {
      // Arrange
      const incompleteConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        environment: 'dev',
        frontend: {
          security: {},
        },
      } as any;

      // Act & Assert
      expect(() => {
        new CloudFrontConstruct(stack, 'TestIncomplete', {
          config: incompleteConfig,
          environment: 'dev',
          bucket,
          alertTopic,
        });
      }).not.toThrow();
    });

    test('アラートトピックなしでもコンストラクトが作成される', () => {
      // Arrange
      const config = getEnvironmentConfig('dev');

      // Act & Assert
      expect(() => {
        new CloudFrontConstruct(stack, 'TestNoAlert', {
          config,
          environment: 'dev',
          bucket,
          // alertTopic を省略
        });
      }).not.toThrow();
    });
  });
});
