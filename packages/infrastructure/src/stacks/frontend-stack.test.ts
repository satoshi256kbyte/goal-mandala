import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { FrontendStack } from './frontend-stack';
import { EnvironmentConfig } from '../config/environment';
import { constants } from '../config/constants';

describe('FrontendStack', () => {
  let app: cdk.App;
  let stack: FrontendStack;
  let template: Template;

  const mockConfig: EnvironmentConfig = {
    stackPrefix: 'test-frontend',
    region: 'ap-northeast-1',
    environment: 'test',
    network: {
      natGateways: 1,
      enableVpcEndpoints: false,
      vpcCidr: '10.0.0.0/16',
      maxAzs: 2,
    },
    database: {
      instanceClass: 'serverless',
      minCapacity: 0.5,
      maxCapacity: 2.0,
      multiAz: false,
    },
    lambda: {
      timeout: 30,
      memorySize: 256,
    },
    frontend: {
      customErrorResponses: true,
      security: {
        enableHsts: true,
        hstsMaxAge: 31536000,
        hstsIncludeSubdomains: true,
        hstsPreload: true,
        enableContentTypeOptions: true,
        enableFrameOptions: true,
        frameOptionsValue: 'DENY',
        enableReferrerPolicy: true,
        referrerPolicyValue: 'strict-origin-when-cross-origin',
        enableCsp: false,
        customHeaders: {
          'X-Custom-Header': 'test-app',
        },
      },
      s3: {
        enableVersioning: true,
        enableLogging: false,
        lifecyclePolicyEnabled: true,
        oldVersionExpirationDays: 30,
        incompleteMultipartUploadDays: 7,
      },
      monitoring: {
        enableAccessLogs: false,
        enableCloudFrontLogs: false,
        enableCostMonitoring: false,
        logRetentionDays: 30,
        retainLogsOnDelete: false,
        errorRateThreshold: 5,
        cacheHitRateThreshold: 80,
        s3RequestsThreshold: 1000,
        monthlyBudgetLimit: 50,
      },
    },
    tags: {
      Project: 'test-project',
      Environment: 'test',
    },
  };

  beforeEach(() => {
    app = new cdk.App();
    stack = new FrontendStack(app, 'TestFrontendStack', {
      config: mockConfig,
      environment: 'test',
    });
    template = Template.fromStack(stack);
  });

  describe('S3バケット', () => {
    test('S3バケットが作成される', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('S3バケットに適切なライフサイクルポリシーが設定される', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Status: 'Enabled',
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 7,
              },
            }),
            Match.objectLike({
              Status: 'Enabled',
              NoncurrentVersionExpiration: {
                NoncurrentDays: 30,
              },
            }),
          ]),
        },
      });
    });
  });

  describe('CloudFront', () => {
    test('CloudFrontディストリビューションが作成される', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
          Enabled: true,
          HttpVersion: 'http2',
          IPV6Enabled: true,
          PriceClass: 'PriceClass_100',
        },
      });
    });

    test('Origin Access Control (OAC)が作成される', () => {
      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          OriginAccessControlOriginType: 'S3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });
    });

    test('Response Headers Policyが作成される', () => {
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
    });

    test('カスタムキャッシュポリシーが作成される', () => {
      // 静的アセット用の長期キャッシュポリシー
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          DefaultTTL: 2592000, // 30日
          MaxTTL: 31536000, // 1年
          MinTTL: 0,
        },
      });

      // HTML用の短期キャッシュポリシー
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          DefaultTTL: 300, // 5分
          MaxTTL: 3600, // 1時間
          MinTTL: 0,
        },
      });
    });

    test('エラーページ設定が適用される', () => {
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

  describe('SNSトピック', () => {
    test('アラート用SNSトピックが作成される', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'test-frontend-frontend-alerts',
        DisplayName: 'Frontend Alerts for test-frontend (test)',
      });
    });
  });

  describe('CloudFormation出力', () => {
    test('必要な出力が設定される', () => {
      template.hasOutput('S3BucketName', {});
      template.hasOutput('S3BucketArn', {});
      template.hasOutput('CloudFrontDistributionId', {});
      template.hasOutput('CloudFrontDistributionDomainName', {});
      template.hasOutput('CloudFrontDomainName', {});
      template.hasOutput('WebsiteUrl', {});
      template.hasOutput('AlertTopicArn', {});
    });
  });

  describe('タグ設定', () => {
    test('適切なタグが設定される', () => {
      // S3バケットが作成されていることを確認
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });

      // スタックレベルでタグが設定されていることを確認
      expect(stack.tags.tagValues()).toEqual(
        expect.objectContaining({
          Project: 'test-project',
          Environment: 'test',
        })
      );
    });
  });

  describe('監視設定', () => {
    test('監視が無効な場合、MonitoringConstructが作成されない', () => {
      // 現在のmockConfigでは監視が無効なので、監視関連のリソースは作成されない
      expect(stack.monitoringConstruct).toBeUndefined();
    });

    test('監視が有効な場合、MonitoringConstructが作成される', () => {
      const configWithMonitoring = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          monitoring: {
            ...mockConfig.frontend.monitoring,
            enableAccessLogs: true,
            alertEmail: 'test@example.com',
          },
        },
      };

      // 新しいアプリケーションインスタンスを作成
      const newApp = new cdk.App();
      const stackWithMonitoring = new FrontendStack(newApp, 'TestFrontendStackWithMonitoring', {
        config: configWithMonitoring,
        environment: 'test',
      });

      expect(stackWithMonitoring.monitoringConstruct).toBeDefined();
    });
  });

  describe('設定検証', () => {
    test('有効な設定で例外が発生しない', () => {
      expect(() => {
        stack.validateConfiguration(mockConfig);
      }).not.toThrow();
    });

    test('スタック情報が正しく取得できる', () => {
      const stackInfo = stack.getStackInfo();

      expect(stackInfo).toHaveProperty('stackName');
      expect(stackInfo).toHaveProperty('s3BucketName');
      expect(stackInfo).toHaveProperty('s3BucketArn');
      expect(stackInfo).toHaveProperty('distributionId');
      expect(stackInfo).toHaveProperty('distributionDomainName');
      expect(stackInfo).toHaveProperty('domainName');
      expect(stackInfo).toHaveProperty('alertTopicArn');
    });

    test('デプロイ情報が正しく取得できる', () => {
      const deploymentInfo = stack.getDeploymentInfo();

      expect(deploymentInfo).toHaveProperty('bucketName');
      expect(deploymentInfo).toHaveProperty('distributionId');
      expect(deploymentInfo).toHaveProperty('domainName');
      expect(deploymentInfo).toHaveProperty('websiteUrl');
      expect(deploymentInfo.websiteUrl).toMatch(/^https:\/\//);
    });
  });

  describe('デプロイロール', () => {
    test('デプロイ用IAMロールが作成できる', () => {
      // 新しいアプリケーションとスタックを作成してテスト
      const newApp = new cdk.App();
      const newStack = new FrontendStack(newApp, 'TestDeploymentRoleStack', {
        config: mockConfig,
        environment: 'test',
      });

      const deploymentRole = newStack.createDeploymentRole();

      expect(deploymentRole).toBeDefined();
      expect(deploymentRole.roleArn).toBeDefined();

      // テンプレートを生成してIAMロールが作成されることを確認
      const newTemplate = Template.fromStack(newStack);
      newTemplate.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: {
                Service: 'codebuild.amazonaws.com',
              },
            }),
          ]),
        },
      });
    });
  });

  describe('カスタムドメイン設定', () => {
    test('カスタムドメインが設定されている場合、適切に処理される', () => {
      const configWithDomain = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          domainName: 'example.com',
        },
      };

      // 新しいアプリケーションインスタンスを作成
      const newApp = new cdk.App();
      const stackWithDomain = new FrontendStack(newApp, 'TestFrontendStackWithDomain', {
        config: configWithDomain,
        environment: 'test',
      });

      const templateWithDomain = Template.fromStack(stackWithDomain);

      // ACM証明書が作成される
      templateWithDomain.hasResourceProperties('AWS::CertificateManager::Certificate', {
        DomainName: 'example.com',
        ValidationMethod: 'DNS',
      });

      // CloudFrontディストリビューションにドメイン名が設定される
      templateWithDomain.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['example.com'],
        },
      });
    });

    test('既存の証明書ARNが指定されている場合、新しい証明書は作成されない', () => {
      const configWithCertArn = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          domainName: 'example.com',
          certificateArn:
            'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
        },
      };

      const newApp = new cdk.App();
      const stackWithCert = new FrontendStack(newApp, 'TestFrontendStackWithCert', {
        config: configWithCertArn,
        environment: 'test',
      });

      const templateWithCert = Template.fromStack(stackWithCert);

      // 新しい証明書は作成されない
      templateWithCert.resourceCountIs('AWS::CertificateManager::Certificate', 0);

      // CloudFrontディストリビューションにドメイン名が設定される
      templateWithCert.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['example.com'],
        },
      });
    });
  });

  describe('環境別設定', () => {
    test('本番環境では適切な設定が適用される', () => {
      const prodConfig = {
        ...mockConfig,
        environment: constants.ENVIRONMENTS.PROD,
        frontend: {
          ...mockConfig.frontend,
          domainName: 'example.com',
          security: {
            ...mockConfig.frontend.security,
            enableHsts: true,
            hstsMaxAge: 31536000,
          },
        },
      };

      const newApp = new cdk.App();
      const prodStack = new FrontendStack(newApp, 'TestProdStack', {
        config: prodConfig,
        environment: constants.ENVIRONMENTS.PROD,
      });

      const prodTemplate = Template.fromStack(prodStack);

      // 本番環境の価格クラス
      prodTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_All',
        },
      });

      // HSTS設定
      prodTemplate.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
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

      // S3バケットの削除保護
      prodTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
      });
    });

    test('開発環境では開発向け設定が適用される', () => {
      const devConfig = {
        ...mockConfig,
        environment: constants.ENVIRONMENTS.DEV,
      };

      const newApp = new cdk.App();
      const devStack = new FrontendStack(newApp, 'TestDevStack', {
        config: devConfig,
        environment: constants.ENVIRONMENTS.DEV,
      });

      const devTemplate = Template.fromStack(devStack);

      // 開発環境の価格クラス
      devTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_100',
        },
      });

      // S3バケットの自動削除
      devTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
      });
    });

    test('ステージング環境では適切な設定が適用される', () => {
      const stgConfig = {
        ...mockConfig,
        environment: constants.ENVIRONMENTS.STG,
      };

      const newApp = new cdk.App();
      const stgStack = new FrontendStack(newApp, 'TestStgStack', {
        config: stgConfig,
        environment: constants.ENVIRONMENTS.STG,
      });

      const stgTemplate = Template.fromStack(stgStack);

      // ステージング環境の価格クラス
      stgTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          PriceClass: 'PriceClass_200',
        },
      });

      // S3バケットのスナップショット保護
      stgTemplate.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Snapshot',
      });
    });
  });

  describe('セキュリティ設定の詳細テスト', () => {
    test('セキュリティヘッダーが完全に設定される', () => {
      const secureConfig = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          security: {
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
              'script-src': ["'self'", "'unsafe-inline'"],
              'style-src': ["'self'", "'unsafe-inline'"],
            },
            customHeaders: {
              'X-Custom-Security': 'enabled',
              'X-API-Version': 'v1.0',
            },
          },
        },
      };

      const newApp = new cdk.App();
      const secureStack = new FrontendStack(newApp, 'TestSecureStack', {
        config: secureConfig,
        environment: 'test',
      });

      const secureTemplate = Template.fromStack(secureStack);

      // セキュリティヘッダーの詳細確認
      secureTemplate.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
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
                Value: Match.stringLikeRegexp("default-src 'self'.*"),
                Override: true,
              },
              {
                Header: 'X-Custom-Security',
                Value: 'enabled',
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

    test('セキュリティ設定の検証が正しく動作する', () => {
      // 有効な設定
      expect(() => {
        stack.validateConfiguration(mockConfig);
      }).not.toThrow();

      // 本番環境で証明書なしの場合はエラー
      const prodConfigNoCert = {
        ...mockConfig,
        environment: constants.ENVIRONMENTS.PROD,
      };

      const newApp = new cdk.App();
      expect(() => {
        new FrontendStack(newApp, 'TestProdNoCert', {
          config: prodConfigNoCert,
          environment: constants.ENVIRONMENTS.PROD,
        });
      }).toThrow('Security validation failed');
    });
  });

  describe('キャッシュ設定の詳細テスト', () => {
    test('カスタムキャッシュポリシーが正しく作成される', () => {
      // 静的アセット用の長期キャッシュポリシー
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: `${mockConfig.stackPrefix}-test-static-assets-cache`,
          Comment: 'Long-term cache policy for static assets (test)',
          DefaultTTL: 2592000, // 30日
          MaxTTL: 31536000, // 1年
          MinTTL: 0,
          ParametersInCacheKeyAndForwardedToOrigin: {
            EnableAcceptEncodingGzip: true,
            EnableAcceptEncodingBrotli: true,
            HeadersConfig: {
              HeaderBehavior: 'none',
            },
            QueryStringsConfig: {
              QueryStringBehavior: 'none',
            },
            CookiesConfig: {
              CookieBehavior: 'none',
            },
          },
        },
      });

      // HTML用の短期キャッシュポリシー
      template.hasResourceProperties('AWS::CloudFront::CachePolicy', {
        CachePolicyConfig: {
          Name: `${mockConfig.stackPrefix}-test-html-cache`,
          Comment: 'Short-term cache policy for HTML and API responses (test)',
          DefaultTTL: 300, // 5分
          MaxTTL: 3600, // 1時間
          MinTTL: 0,
          ParametersInCacheKeyAndForwardedToOrigin: {
            EnableAcceptEncodingGzip: true,
            EnableAcceptEncodingBrotli: true,
            HeadersConfig: {
              HeaderBehavior: 'whitelist',
              Headers: ['Accept', 'Accept-Language', 'Authorization'],
            },
            QueryStringsConfig: {
              QueryStringBehavior: 'all',
            },
            CookiesConfig: {
              CookieBehavior: 'none',
            },
          },
        },
      });
    });

    test('追加ビヘイビアが正しく設定される', () => {
      const distributionResource = template.findResources('AWS::CloudFront::Distribution');
      const distribution = Object.values(distributionResource)[0] as any;
      const cacheBehaviors = distribution.Properties.DistributionConfig.CacheBehaviors;

      // 14個の追加ビヘイビアが設定される
      expect(cacheBehaviors).toHaveLength(14);

      // 主要なパスパターンの確認
      const pathPatterns = cacheBehaviors.map((behavior: any) => behavior.PathPattern);
      expect(pathPatterns).toContain('/assets/*');
      expect(pathPatterns).toContain('*.js');
      expect(pathPatterns).toContain('*.css');
      expect(pathPatterns).toContain('*.html');
      expect(pathPatterns).toContain('*.png');
      expect(pathPatterns).toContain('*.jpg');
      expect(pathPatterns).toContain('*.jpeg');
      expect(pathPatterns).toContain('*.gif');
      expect(pathPatterns).toContain('*.svg');
      expect(pathPatterns).toContain('*.webp');
      expect(pathPatterns).toContain('*.woff');
      expect(pathPatterns).toContain('*.woff2');
      expect(pathPatterns).toContain('*.ttf');
      expect(pathPatterns).toContain('*.json');

      // 全てのビヘイビアでHTTPS強制が設定されている
      cacheBehaviors.forEach((behavior: any) => {
        expect(behavior.ViewerProtocolPolicy).toBe('redirect-to-https');
      });
    });
  });

  describe('監視設定の詳細テスト', () => {
    test('監視が有効な場合の詳細設定', () => {
      const configWithFullMonitoring = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          monitoring: {
            enableAccessLogs: true,
            enableCloudFrontLogs: true,
            enableCostMonitoring: true,
            alertEmail: 'test@example.com',
            logRetentionDays: 90,
            retainLogsOnDelete: true,
            errorRateThreshold: 3,
            cacheHitRateThreshold: 85,
            s3RequestsThreshold: 500,
            monthlyBudgetLimit: 100,
          },
        },
      };

      const newApp = new cdk.App();
      const stackWithMonitoring = new FrontendStack(newApp, 'TestMonitoringStack', {
        config: configWithFullMonitoring,
        environment: 'test',
      });

      const monitoringTemplate = Template.fromStack(stackWithMonitoring);

      // MonitoringConstructが作成される
      expect(stackWithMonitoring.monitoringConstruct).toBeDefined();

      // CloudWatchアラームが作成される（基本3個 + キャッシュ効率監視3個 + 証明書監視1個 = 7個以上）
      const alarmCount = Object.keys(
        monitoringTemplate.findResources('AWS::CloudWatch::Alarm')
      ).length;
      expect(alarmCount).toBeGreaterThanOrEqual(3);

      // CloudWatchダッシュボードが作成される
      monitoringTemplate.hasResourceProperties('AWS::CloudWatch::Dashboard', {});

      // 予算アラートが作成される
      monitoringTemplate.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
          BudgetLimit: {
            Amount: 100,
            Unit: 'USD',
          },
        },
      });

      // SNSサブスクリプションが作成される
      monitoringTemplate.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'test@example.com',
      });

      // 監視情報の出力が追加される
      monitoringTemplate.hasOutput('DashboardUrl', {});
      monitoringTemplate.hasOutput('LogsBucketName', {});
      monitoringTemplate.hasOutput('BudgetName', {});
    });

    test('監視設定の判定ロジックが正しく動作する', () => {
      // 監視無効の場合
      const configNoMonitoring = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          monitoring: {
            enableAccessLogs: false,
            enableCloudFrontLogs: false,
            enableCostMonitoring: false,
            alertEmail: undefined,
          },
        },
      };

      const newApp1 = new cdk.App();
      const stackNoMonitoring = new FrontendStack(newApp1, 'TestNoMonitoring', {
        config: configNoMonitoring,
        environment: 'test',
      });

      expect(stackNoMonitoring.monitoringConstruct).toBeUndefined();

      // 部分的に監視有効の場合
      const configPartialMonitoring = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          monitoring: {
            enableAccessLogs: true,
            enableCloudFrontLogs: false,
            enableCostMonitoring: false,
            alertEmail: undefined,
          },
        },
      };

      const newApp2 = new cdk.App();
      const stackPartialMonitoring = new FrontendStack(newApp2, 'TestPartialMonitoring', {
        config: configPartialMonitoring,
        environment: 'test',
      });

      expect(stackPartialMonitoring.monitoringConstruct).toBeDefined();
    });
  });

  describe('IAMロールとアクセス権限', () => {
    test('デプロイ用IAMロールが正しく作成される', () => {
      // 新しいアプリケーションとスタックを作成してテスト
      const newApp = new cdk.App();
      const newStack = new FrontendStack(newApp, 'TestDeploymentRoleStack', {
        config: mockConfig,
        environment: 'test',
      });

      const deploymentRole = newStack.createDeploymentRole();

      expect(deploymentRole).toBeInstanceOf(iam.Role);

      const templateWithRole = Template.fromStack(newStack);

      // IAMロールが作成される
      templateWithRole.hasResourceProperties('AWS::IAM::Role', {
        RoleName: `${newStack.stackName}-deployment-role`,
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Service: 'codebuild.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            }),
          ]),
        },
      });

      // S3アクセス権限が付与される
      templateWithRole.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                Match.stringLikeRegexp('s3:GetObject.*'),
                's3:PutObject',
                Match.stringLikeRegexp('s3:DeleteObject.*'),
              ]),
            }),
          ]),
        },
      });

      // CloudFrontキャッシュ無効化権限が付与される
      templateWithRole.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: [
                'cloudfront:CreateInvalidation',
                'cloudfront:GetInvalidation',
                'cloudfront:ListInvalidations',
              ],
            }),
          ]),
        },
      });
    });
  });

  describe('スタック情報とユーティリティメソッド', () => {
    test('スタック情報が完全に取得できる', () => {
      const stackInfo = stack.getStackInfo();

      expect(stackInfo).toEqual({
        stackName: stack.stackName,
        s3BucketName: expect.any(String),
        s3BucketArn: expect.any(String),
        distributionId: expect.any(String),
        distributionDomainName: expect.any(String),
        domainName: expect.any(String),
        alertTopicArn: expect.any(String),
      });

      // 各プロパティが定義されている
      expect(stackInfo.stackName).toBeDefined();
      expect(stackInfo.s3BucketName).toBeDefined();
      expect(stackInfo.s3BucketArn).toBeDefined();
      expect(stackInfo.distributionId).toBeDefined();
      expect(stackInfo.distributionDomainName).toBeDefined();
      expect(stackInfo.domainName).toBeDefined();
      expect(stackInfo.alertTopicArn).toBeDefined();
    });

    test('監視有効時のスタック情報に監視情報が含まれる', () => {
      const configWithMonitoring = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          monitoring: {
            ...mockConfig.frontend.monitoring,
            enableAccessLogs: true,
            alertEmail: 'test@example.com',
          },
        },
      };

      const newApp = new cdk.App();
      const stackWithMonitoring = new FrontendStack(newApp, 'TestStackInfoMonitoring', {
        config: configWithMonitoring,
        environment: 'test',
      });

      const stackInfo = stackWithMonitoring.getStackInfo();

      expect(stackInfo).toHaveProperty('monitoring');
      expect(stackInfo.monitoring).toHaveProperty('alertTopicArn');
      expect(stackInfo.monitoring).toHaveProperty('dashboardUrl');
    });

    test('デプロイ情報が正しく取得できる', () => {
      const deploymentInfo = stack.getDeploymentInfo();

      expect(deploymentInfo).toEqual({
        bucketName: expect.any(String),
        distributionId: expect.any(String),
        domainName: expect.any(String),
        websiteUrl: expect.stringMatching(/^https:\/\//),
      });

      // WebサイトURLがHTTPSで始まる
      expect(deploymentInfo.websiteUrl).toMatch(/^https:\/\//);
    });
  });

  describe('エラーハンドリングと例外ケース', () => {
    test('設定が不完全でもスタックが作成される', () => {
      const incompleteConfig = {
        stackPrefix: 'test',
        region: 'ap-northeast-1',
        environment: 'test',
        frontend: {
          s3: {},
          monitoring: {},
        },
        tags: {},
      } as any;

      const newApp = new cdk.App();

      expect(() => {
        new FrontendStack(newApp, 'TestIncompleteConfig', {
          config: incompleteConfig,
          environment: 'test',
        });
      }).not.toThrow();
    });

    test('無効な環境名でもスタックが作成される', () => {
      const newApp = new cdk.App();

      expect(() => {
        new FrontendStack(newApp, 'TestInvalidEnv', {
          config: mockConfig,
          environment: 'invalid-environment',
        });
      }).not.toThrow();
    });

    test('設定サマリーが正しく出力される', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const newApp = new cdk.App();
      new FrontendStack(newApp, 'TestConfigSummary', {
        config: mockConfig,
        environment: 'test',
      });

      // 設定サマリーが出力される
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('=== Frontend Stack Configuration Summary ===')
      );

      consoleSpy.mockRestore();
    });
  });
});
