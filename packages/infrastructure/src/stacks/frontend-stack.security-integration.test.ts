import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from './frontend-stack';
import { getEnvironmentConfig } from '../config/environment';

/**
 * セキュリティ要件の統合テスト
 * 要件5.1, 5.2, 5.3に対応
 */
describe('Frontend Stack - セキュリティ統合テスト', () => {
  let app: cdk.App;

  beforeEach(() => {
    app = new cdk.App();
    app.node.setContext('accountId', '123456789012');
  });

  describe('XSS・CSRF攻撃防止の統合テスト (要件5.1)', () => {
    test('Content Security Policy (CSP) が適切に設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'CSPStack', {
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
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'Content-Security-Policy',
                Value: Match.stringMatching(/default-src 'self'/),
                Override: true,
              },
            ]),
          },
        },
      });
    });

    test('X-Content-Type-Options ヘッダーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'ContentTypeStack', {
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
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentTypeOptions: {
              Override: true,
            },
          },
        },
      });
    });

    test('X-Frame-Options ヘッダーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'FrameOptionsStack', {
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
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            FrameOptions: {
              FrameOption: 'DENY',
              Override: true,
            },
          },
        },
      });
    });

    test('X-XSS-Protection ヘッダーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'XSSProtectionStack', {
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
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'X-XSS-Protection',
                Value: '1; mode=block',
                Override: true,
              },
            ]),
          },
        },
      });
    });

    test('Referrer-Policy ヘッダーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'ReferrerPolicyStack', {
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
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ReferrerPolicy: {
              ReferrerPolicy: 'strict-origin-when-cross-origin',
              Override: true,
            },
          },
        },
      });
    });

    test('Permissions-Policy ヘッダーが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'PermissionsPolicyStack', {
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
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'Permissions-Policy',
                Value: Match.stringMatching(/camera=\(\), microphone=\(\), geolocation=\(\)/),
                Override: true,
              },
            ]),
          },
        },
      });
    });
  });

  describe('不正アクセス制限の統合テスト (要件5.2)', () => {
    test('S3バケットへの直接アクセスが完全に制限される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'S3AccessRestrictionStack', {
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
      // パブリックアクセスブロック設定を確認
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });

      // バケットポリシーでCloudFrontからのアクセスのみ許可されることを確認
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Action: 's3:GetObject',
              Resource: Match.anyValue(),
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': Match.anyValue(),
                },
              },
            },
          ],
        },
      });
    });

    test('Origin Access Control (OAC) が正しく設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'OACStack', {
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
      template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);

      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          Name: Match.anyValue(),
          OriginAccessControlOriginType: 's3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });

      // CloudFrontディストリビューションでOACが使用されることを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: [
            {
              OriginAccessControlId: Match.anyValue(),
              S3OriginConfig: {
                OriginAccessIdentity: '', // OACを使用する場合は空文字
              },
            },
          ],
        },
      });
    });

    test('WAF (Web Application Firewall) が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.security.enableWAF = true;
      const stack = new FrontendStack(app, 'WAFStack', {
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
      template.resourceCountIs('AWS::WAFv2::WebACL', 1);

      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'CLOUDFRONT',
        DefaultAction: {
          Allow: {},
        },
        Rules: Match.arrayWith([
          // AWS Managed Rules - Core Rule Set
          {
            Name: 'AWSManagedRulesCommonRuleSet',
            Priority: 1,
            OverrideAction: {
              None: {},
            },
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesCommonRuleSet',
              },
            },
            VisibilityConfig: {
              SampledRequestsEnabled: true,
              CloudWatchMetricsEnabled: true,
              MetricName: 'CommonRuleSetMetric',
            },
          },
          // Rate limiting rule
          {
            Name: 'RateLimitRule',
            Priority: 2,
            Action: {
              Block: {},
            },
            Statement: {
              RateBasedStatement: {
                Limit: 2000,
                AggregateKeyType: 'IP',
              },
            },
          },
        ]),
      });

      // CloudFrontディストリビューションにWAFが関連付けられることを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          WebACLId: Match.anyValue(),
        },
      });
    });

    test('地理的制限が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.security.geoRestriction = {
        restrictionType: 'whitelist',
        locations: ['JP', 'US'],
      };
      const stack = new FrontendStack(app, 'GeoRestrictionStack', {
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
          Restrictions: {
            GeoRestriction: {
              RestrictionType: 'whitelist',
              Locations: ['JP', 'US'],
            },
          },
        },
      });
    });

    test('カスタムエラーページが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'CustomErrorStack', {
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
          CustomErrorResponses: Match.arrayWith([
            {
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
              ErrorCachingMinTTL: 300,
            },
            {
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
              ErrorCachingMinTTL: 300,
            },
          ]),
        },
      });
    });
  });

  describe('暗号化設定の統合テスト (要件5.3)', () => {
    test('転送時暗号化 (HTTPS) が強制される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'HTTPSStack', {
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
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https',
          },
          CacheBehaviors: Match.arrayWith([
            Match.objectLike({
              ViewerProtocolPolicy: 'redirect-to-https',
            }),
          ]),
        },
      });
    });

    test('S3保存時暗号化が有効になる', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'S3EncryptionStack', {
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
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'AES256',
              },
              BucketKeyEnabled: true,
            },
          ],
        },
      });
    });

    test('SSL/TLS設定が適切に構成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.domainName = 'example.com';
      const stack = new FrontendStack(app, 'TLSStack', {
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
          ViewerCertificate: {
            AcmCertificateArn: Match.anyValue(),
            SslSupportMethod: 'sni-only',
            MinimumProtocolVersion: 'TLSv1.2_2021',
          },
        },
      });
    });

    test('HSTS (HTTP Strict Transport Security) が設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'HSTSStack', {
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
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            StrictTransportSecurity: {
              AccessControlMaxAgeSec: 31536000, // 1年
              IncludeSubdomains: true,
              Preload: true,
              Override: true,
            },
          },
        },
      });
    });

    test('ACM証明書が適切に設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.domainName = 'example.com';
      const stack = new FrontendStack(app, 'ACMStack', {
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
      template.hasResourceProperties('AWS::CertificateManager::Certificate', {
        DomainName: 'example.com',
        ValidationMethod: 'DNS',
        DomainValidationOptions: [
          {
            DomainName: 'example.com',
            HostedZoneId: Match.anyValue(),
          },
        ],
      });
    });
  });

  describe('セキュリティ監視とログの統合テスト', () => {
    test('セキュリティ関連のCloudWatchアラームが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.alertEmail = 'security@example.com';
      config.frontend.security.enableWAF = true;
      const stack = new FrontendStack(app, 'SecurityMonitoringStack', {
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
      // WAF関連のアラームが作成されることを確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*WAF.*'),
        MetricName: Match.anyValue(),
        Namespace: 'AWS/WAFV2',
      });

      // 異常なトラフィックパターンのアラーム
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*AbnormalTraffic.*'),
        MetricName: 'Requests',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Sum',
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    test('セキュリティログが適切に設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableCloudFrontLogs = true;
      config.frontend.security.enableWAF = true;
      const stack = new FrontendStack(app, 'SecurityLoggingStack', {
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
      // CloudFrontログが設定されることを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Logging: {
            Bucket: Match.anyValue(),
            Prefix: 'cloudfront-logs/',
            IncludeCookies: false,
          },
        },
      });

      // WAFログが設定されることを確認
      template.hasResourceProperties('AWS::WAFv2::LoggingConfiguration', {
        ResourceArn: Match.anyValue(),
        LogDestinationConfigs: Match.arrayWith([Match.stringLikeRegexp('arn:aws:logs:.*')]),
      });
    });

    test('セキュリティメトリクスのダッシュボードが作成される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableDashboard = true;
      config.frontend.security.enableWAF = true;
      const stack = new FrontendStack(app, 'SecurityDashboardStack', {
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
        DashboardName: Match.stringLikeRegexp('.*Security.*'),
        DashboardBody: Match.serializedJson(
          Match.objectLike({
            widgets: Match.arrayWith([
              Match.objectLike({
                properties: Match.objectLike({
                  title: Match.stringMatching(/Security/),
                }),
              }),
            ]),
          })
        ),
      });
    });
  });

  describe('環境別セキュリティ設定', () => {
    test('本番環境では最高レベルのセキュリティ設定が適用される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'ProdSecurityStack', {
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
      // 厳格なCSPが設定されることを確認
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'Content-Security-Policy',
                Value: Match.stringMatching(/default-src 'self'; script-src 'self'/),
                Override: true,
              },
            ]),
          },
        },
      });

      // 最新のTLSバージョンが使用されることを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          ViewerCertificate: {
            MinimumProtocolVersion: 'TLSv1.2_2021',
          },
        },
      });
    });

    test('開発環境では緩和されたセキュリティ設定が適用される', () => {
      // Given
      const config = getEnvironmentConfig('dev');
      const stack = new FrontendStack(app, 'DevSecurityStack', {
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
      // 開発用の緩和されたCSPが設定されることを確認
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'Content-Security-Policy',
                Value: Match.stringMatching(/default-src 'self' 'unsafe-inline' 'unsafe-eval'/),
                Override: true,
              },
            ]),
          },
        },
      });
    });

    test('ローカル環境では最小限のセキュリティ設定が適用される', () => {
      // Given
      const config = getEnvironmentConfig('local');
      const stack = new FrontendStack(app, 'LocalSecurityStack', {
        config,
        environment: 'local',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // When
      const template = Template.fromStack(stack);

      // Then
      // WAFは無効であることを確認
      template.resourceCountIs('AWS::WAFv2::WebACL', 0);

      // 基本的なセキュリティヘッダーのみ設定されることを確認
      template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
        ResponseHeadersPolicyConfig: {
          SecurityHeadersConfig: {
            ContentTypeOptions: {
              Override: true,
            },
          },
        },
      });
    });
  });

  describe('セキュリティコンプライアンス', () => {
    test('OWASP Top 10対策が実装される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.security.enableWAF = true;
      const stack = new FrontendStack(app, 'OWASPStack', {
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
      // OWASP対策のWAFルールが設定されることを確認
      template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Rules: Match.arrayWith([
          // SQL Injection対策
          {
            Name: 'AWSManagedRulesSQLiRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesSQLiRuleSet',
              },
            },
          },
          // XSS対策
          {
            Name: 'AWSManagedRulesKnownBadInputsRuleSet',
            Statement: {
              ManagedRuleGroupStatement: {
                VendorName: 'AWS',
                Name: 'AWSManagedRulesKnownBadInputsRuleSet',
              },
            },
          },
        ]),
      });
    });

    test('セキュリティ監査ログが設定される', () => {
      // Given
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableAuditLogs = true;
      const stack = new FrontendStack(app, 'AuditLogStack', {
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
      // CloudTrailが設定されることを確認
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        TrailName: Match.stringLikeRegexp('.*audit.*'),
        IncludeGlobalServiceEvents: true,
        IsMultiRegionTrail: true,
        EnableLogFileValidation: true,
      });
    });
  });
});
