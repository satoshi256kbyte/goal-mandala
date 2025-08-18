import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Template } from 'aws-cdk-lib/assertions';
import { FrontendStack } from './frontend-stack';
import { getEnvironmentConfig } from '../config/environment';

describe('FrontendStack', () => {
  let app: cdk.App;
  let stack: FrontendStack;
  let template: Template;
  let mockApi: apigateway.RestApi;

  beforeEach(() => {
    app = new cdk.App();
    const config = getEnvironmentConfig('dev');

    // モック用のスタックを作成
    const mockStack = new cdk.Stack(app, 'MockStack', {
      env: {
        region: config.region,
        account: '123456789012',
      },
    });

    // モックAPIを作成
    mockApi = new apigateway.RestApi(mockStack, 'MockApi', {
      restApiName: 'mock-api',
    });

    // API Gatewayの検証エラーを回避するため、ダミーメソッドを追加
    mockApi.root.addMethod('GET');

    stack = new FrontendStack(app, 'TestFrontendStack', {
      config,
      api: mockApi,
      env: {
        region: config.region,
        account: '123456789012',
      },
    });

    template = Template.fromStack(stack);
  });

  test('S3バケットが作成される', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'goal-mandala-dev-frontend-123456789012',
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
    });
  });

  test('CloudFrontログ用S3バケットが作成される', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: 'goal-mandala-dev-cloudfront-logs-123456789012',
      LifecycleConfiguration: {
        Rules: [
          {
            Id: 'DeleteOldLogs',
            Status: 'Enabled',
            ExpirationInDays: 90,
          },
        ],
      },
    });
  });

  test('Origin Access Control (OAC)が作成される', () => {
    template.hasResource('AWS::CloudFront::OriginAccessControl', {});
  });

  test('CloudFront Distributionが作成される', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Comment: 'CloudFront distribution for goal-mandala-dev',
        DefaultRootObject: 'index.html',
        Enabled: true,
        HttpVersion: 'http2and3',
        IPV6Enabled: true,
        PriceClass: 'PriceClass_100',
      },
    });
  });

  test('レスポンスヘッダーポリシーが作成される', () => {
    template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
      ResponseHeadersPolicyConfig: {
        Name: 'goal-mandala-dev-security-headers',
        Comment: 'Security headers for Goal Mandala application',
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

  test('CloudFrontのビヘイビアが設定される', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultCacheBehavior: {
          ViewerProtocolPolicy: 'redirect-to-https',
        },
      },
    });
  });

  test('エラーレスポンス設定がされる', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CustomErrorResponses: [
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
        ],
      },
    });
  });

  test('地理的制限が設定される', () => {
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

  test('S3バケットポリシーが設定される', () => {
    template.hasResource('AWS::S3::BucketPolicy', {});
  });

  test('必要な出力が定義される', () => {
    template.hasOutput('WebsiteBucketName', {});
    template.hasOutput('DistributionId', {});
    template.hasOutput('DistributionDomainName', {});
    template.hasOutput('WebsiteUrl', {});
  });

  test('ログ設定が有効になる', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Logging: {
          Prefix: 'access-logs/',
        },
      },
    });
  });
});
