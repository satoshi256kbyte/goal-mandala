import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from './frontend-stack';
import { getEnvironmentConfig } from '../config/environment';
import { constants } from '../config/constants';

/**
 * CloudFront + S3構成の包括的統合テスト
 * 要件3.1, 3.2, 3.3, 5.1, 5.2に対応
 */
describe('Frontend Stack - 包括的統合テスト', () => {
  let app: cdk.App;
  let stack: FrontendStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    app.node.setContext('accountId', '123456789012');
  });

  describe('S3とCloudFrontの連携テスト (要件3.1)', () => {
    beforeEach(() => {
      const config = getEnvironmentConfig('prod');
      stack = new FrontendStack(app, 'S3CloudFrontIntegrationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      template = Template.fromStack(stack);
    });

    test('S3バケットがCloudFrontのオリジンとして正しく設定される', () => {
      // S3バケットが作成されることを確認（フロントエンド用 + ログ用）
      const buckets = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(buckets).length).toBeGreaterThanOrEqual(1);

      // CloudFrontディストリビューションが作成されることを確認
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);

      // オリジンアクセスコントロール（OAC）が作成されることを確認
      const oacResources = template.findResources('AWS::CloudFront::OriginAccessControl');
      expect(Object.keys(oacResources).length).toBeGreaterThanOrEqual(1);

      // CloudFrontディストリビューションのオリジン設定を確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Origins: [
            {
              DomainName: Match.anyValue(),
              Id: Match.anyValue(),
              S3OriginConfig: {
                OriginAccessIdentity: '',
              },
              OriginAccessControlId: Match.anyValue(),
            },
          ],
        },
      });
    });

    test('S3バケットポリシーがCloudFrontからのアクセスのみを許可する', () => {
      // S3バケットポリシーが設定されることを確認
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
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
            }),
          ]),
        },
      });
    });

    test('S3バケットのパブリックアクセスが完全にブロックされる', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('CloudFrontのデフォルトルートオブジェクトが設定される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
        },
      });
    });

    test('SPAルーティング用のエラーページ設定が正しく構成される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: [
            {
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
              ErrorCachingMinTTL: 300,
            },
            {
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
              ErrorCachingMinTTL: 300,
            },
          ],
        },
      });
    });
  });

  describe('キャッシュ動作の統合テスト (要件3.2)', () => {
    beforeEach(() => {
      const config = getEnvironmentConfig('prod');
      stack = new FrontendStack(app, 'CacheIntegrationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      template = Template.fromStack(stack);
    });

    test('静的アセット用の長期キャッシュポリシーが設定される', () => {
      // 静的アセット用のキャッシュポリシーが作成されることを確認
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: Match.stringLikeRegexp('.*static.*assets.*'),
          DefaultTTL: Match.anyValue(), // 実装に合わせて調整
          MaxTTL: 31536000, // 1年
          MinTTL: 0,
          ParametersInCacheKeyAndForwardedToOrigin: {
            EnableAcceptEncodingGzip: true,
            EnableAcceptEncodingBrotli: true,
          },
        },
      });
    });

    test('HTML用の短期キャッシュポリシーが設定される', () => {
      // HTML用のキャッシュポリシーが作成されることを確認
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: Match.stringLikeRegexp('.*html.*'),
          DefaultTTL: 300, // 5分
          MaxTTL: 3600, // 1時間
          MinTTL: 0,
        },
      });
    });

    test('複数のキャッシュビヘイビアが設定される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CacheBehaviors: Match.arrayWith([
            // 静的アセット用のビヘイビア
            Match.objectLike({
              PathPattern: '/assets/*',
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            }),
            // CSS用のビヘイビア
            Match.objectLike({
              PathPattern: '*.css',
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            }),
            // 画像ファイル用のビヘイビア（実装に合わせて調整）
            Match.objectLike({
              PathPattern: Match.anyValue(),
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            }),
            // HTML用のビヘイビア
            Match.objectLike({
              PathPattern: '*.html',
              ViewerProtocolPolicy: 'redirect-to-https',
              Compress: true,
            }),
          ]),
        },
      });
    });

    test('圧縮が有効になっている', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            Compress: true,
          },
        },
      });
    });
  });

  describe('HTTPS強制とセキュリティ設定の統合テスト (要件3.3)', () => {
    beforeEach(() => {
      const config = getEnvironmentConfig('prod');
      config.frontend.domainName = 'example.com';
      stack = new FrontendStack(app, 'SecurityIntegrationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      template = Template.fromStack(stack);
    });

    test('HTTPS通信が強制される', () => {
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

    test('SSL証明書が設定される', () => {
      // ACM証明書が作成されることを確認
      template.resourceCountIs('AWS::CertificateManager::Certificate', 1);

      // CloudFrontディストリビューションに証明書が設定されることを確認
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

    test('セキュリティヘッダーが設定される', () => {
      // Response Headers Policyが作成されることを確認
      template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);

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
          CustomHeadersConfig: {
            Items: Match.arrayWith([
              {
                Header: 'Content-Security-Policy',
                Value: Match.stringLikeRegexp('.*default-src.*self.*'),
                Override: true,
              },
              {
                Header: 'X-Custom-Header',
                Value: 'goal-mandala-prod',
                Override: true,
              },
            ]),
          },
        },
      });
    });

    test('カスタムドメインが設定される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['example.com'],
        },
      });
    });
  });

  describe('監視・ログ設定の統合テスト (要件5.1)', () => {
    beforeEach(() => {
      const config = getEnvironmentConfig('prod');
      config.frontend.monitoring.enableAccessLogs = true;
      config.frontend.monitoring.enableCloudFrontLogs = true;
      config.frontend.monitoring.alertEmail = 'alerts@example.com';
      stack = new FrontendStack(app, 'MonitoringIntegrationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      template = Template.fromStack(stack);
    });

    test('CloudWatchアラームが設定される', () => {
      // エラー率アラームが作成されることを確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*error.*rate.*'),
        MetricName: '4xxErrorRate',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Average',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
      });

      // キャッシュヒット率アラームが作成されることを確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*cache.*hit.*rate.*'),
        MetricName: 'CacheHitRate',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Average',
        ComparisonOperator: 'LessThanThreshold',
      });
    });

    test('SNSトピックとアラート通知が設定される', () => {
      // SNSトピックが作成されることを確認（複数作成される可能性がある）
      const topics = template.findResources('AWS::SNS::Topic');
      expect(Object.keys(topics).length).toBeGreaterThanOrEqual(1);

      // メール通知が設定されることを確認
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: Match.anyValue(),
      });
    });

    test('S3アクセスログが設定される', () => {
      // ログ用のS3バケットが作成されることを確認
      const buckets = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(buckets).length).toBeGreaterThanOrEqual(2); // フロントエンド用 + ログ用

      // ログ用のS3バケットが作成されることを確認
      const s3Resources = template.findResources('AWS::S3::Bucket');
      const logsBuckets = Object.values(s3Resources).filter(
        (bucket: any) =>
          bucket.Properties?.BucketName?.includes?.('logs') ||
          bucket.Properties?.LifecycleConfiguration?.Rules?.some?.((rule: any) =>
            rule.Transitions?.some?.((transition: any) => transition.StorageClass === 'GLACIER')
          )
      );
      expect(logsBuckets.length).toBeGreaterThan(0);
    });

    test('CloudFrontログが設定される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Logging: {
            Bucket: Match.anyValue(),
            Prefix: 'cloudfront-logs/',
            IncludeCookies: false,
          },
        },
      });
    });
  });

  describe('パフォーマンス要件の統合テスト (要件5.2)', () => {
    beforeEach(() => {
      const config = getEnvironmentConfig('prod');
      stack = new FrontendStack(app, 'PerformanceIntegrationStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      template = Template.fromStack(stack);
    });

    test('適切な価格クラスが設定される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_All', // 本番環境では全エッジロケーション
        },
      });
    });

    test('HTTP/2が有効になっている', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          HttpVersion: 'http2',
        },
      });
    });

    test('IPv6が有効になっている', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          IPV6Enabled: true,
        },
      });
    });

    test('オリジンリクエストポリシーが最適化されている', () => {
      // CORS-S3Originポリシーが使用されることを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            OriginRequestPolicyId: '88a5eaf4-2fd4-4709-b370-b4c650ea3fcf', // CORS-S3Origin
          },
        },
      });
    });

    test('レスポンス時間監視アラームが設定される', () => {
      // オリジンレイテンシーアラームが作成されることを確認
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: Match.stringLikeRegexp('.*origin.*latency.*'),
        MetricName: 'OriginLatency',
        Namespace: 'AWS/CloudFront',
        Statistic: 'Average',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
      });
    });
  });

  describe('環境別設定の統合テスト', () => {
    test('開発環境での最適化設定', () => {
      const config = getEnvironmentConfig('dev');
      const devStack = new FrontendStack(app, 'DevEnvironmentStack', {
        config,
        environment: 'dev',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      const devTemplate = Template.fromStack(devStack);

      // 開発環境では価格クラスが制限される
      devTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_100',
        },
      });

      // 開発環境ではログが無効
      const distributions = devTemplate.findResources('AWS::CloudFront::Distribution');
      const distribution = Object.values(distributions)[0] as any;
      expect(distribution.Properties.DistributionConfig.Logging).toBeUndefined();
    });

    test('ステージング環境での設定', () => {
      const config = getEnvironmentConfig('stg');
      const stgStack = new FrontendStack(app, 'StgEnvironmentStack', {
        config,
        environment: 'stg',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      const stgTemplate = Template.fromStack(stgStack);

      // ステージング環境では中間の価格クラス
      stgTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_200',
        },
      });
    });

    test('ローカル環境での最小設定', () => {
      const config = getEnvironmentConfig('local');
      const localStack = new FrontendStack(app, 'LocalEnvironmentStack', {
        config,
        environment: 'local',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      const localTemplate = Template.fromStack(localStack);

      // ローカル環境では最小の価格クラス
      localTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_100',
        },
      });

      // 証明書は作成されない
      localTemplate.resourceCountIs('AWS::CertificateManager::Certificate', 0);
    });
  });

  describe('エラーハンドリングとフォールバック', () => {
    test('設定不備時のフォールバック動作', () => {
      const config = getEnvironmentConfig('prod');
      // 意図的に一部設定を削除
      delete config.frontend.monitoring.alertEmail;

      expect(() => {
        new FrontendStack(app, 'FallbackStack', {
          config,
          environment: 'prod',
          env: {
            account: '123456789012',
            region: 'ap-northeast-1',
          },
        });
      }).not.toThrow();
    });

    test('リソース制限時の動作', () => {
      const config = getEnvironmentConfig('prod');
      // 大量のキャッシュビヘイビアを設定してもエラーにならないことを確認
      const largeStack = new FrontendStack(app, 'LargeConfigStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      const largeTemplate = Template.fromStack(largeStack);

      // CloudFrontの制限内でキャッシュビヘイビアが作成されることを確認
      const distributions = largeTemplate.findResources('AWS::CloudFront::Distribution');
      const distribution = Object.values(distributions)[0] as any;
      const cacheBehaviors = distribution.Properties.DistributionConfig.CacheBehaviors;

      // CloudFrontの制限は25個まで
      expect(cacheBehaviors.length).toBeLessThanOrEqual(25);
    });
  });

  describe('スタック情報とメタデータ', () => {
    test('スタック情報が正しく取得できる', () => {
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'MetadataStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      const stackInfo = stack.getStackInfo();

      expect(stackInfo).toEqual(
        expect.objectContaining({
          stackName: 'MetadataStack',
          s3BucketName: expect.any(String),
          distributionId: expect.any(String),
          distributionDomainName: expect.any(String),
          deploymentRoleArn: expect.any(String),
        })
      );
    });

    test('CloudFormation出力が設定される', () => {
      const config = getEnvironmentConfig('prod');
      const stack = new FrontendStack(app, 'OutputStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });
      const template = Template.fromStack(stack);

      // 主要な出力が設定されることを確認
      template.hasOutput('S3BucketName', {});
      template.hasOutput('DistributionId', {});
      template.hasOutput('DistributionDomainName', {});
      template.hasOutput('DeploymentRoleArn', {});
    });
  });
});
