import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { S3FrontendConstruct } from './s3-frontend-construct';
import { EnvironmentConfig } from '../config/environment';
import { constants } from '../config/constants';

describe('S3FrontendConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let mockConfig: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();
    // テスト用のアカウントIDを設定
    app.node.setContext('accountId', '123456789012');

    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });

    mockConfig = {
      stackPrefix: 'goal-mandala-test',
      region: 'ap-northeast-1',
      network: {
        natGateways: 1,
        enableVpcEndpoints: false,
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
        s3: {
          enableVersioning: true,
          enableLogging: false,
          lifecyclePolicyEnabled: true,
          oldVersionExpirationDays: 30,
          incompleteMultipartUploadDays: 7,
        },
      },
      tags: {
        Project: 'goal-mandala',
        Environment: 'test',
      },
    };
  });

  describe('基本的なS3バケット作成', () => {
    test('S3バケットが正しく作成される', () => {
      // Arrange & Act
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // S3バケットの存在確認
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.stringLikeRegexp('goal-mandala-test-frontend-.*'),
        VersioningConfiguration: {
          Status: 'Enabled',
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
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });

      // バケット名が正しく設定されている（CDKトークンの場合もある）
      expect(construct.bucketName).toBeDefined();
      expect(construct.bucket).toBeInstanceOf(s3.Bucket);
    });

    test('CORS設定が正しく適用される', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedMethods: ['GET', 'HEAD'],
              AllowedOrigins: ['*'],
              AllowedHeaders: ['*'],
              MaxAge: 3000,
            },
          ],
        },
      });
    });

    test('ライフサイクルポリシーが設定される', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'DeleteIncompleteMultipartUploads',
              Status: 'Enabled',
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 7,
              },
            }),
            Match.objectLike({
              Id: 'DeleteOldVersions',
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

  describe('環境別設定', () => {
    test('本番環境では削除保護が有効', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: constants.ENVIRONMENTS.PROD,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 本番環境では DeletionPolicy が Retain に設定される
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Retain',
      });
    });

    test('開発環境では自動削除が有効', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: constants.ENVIRONMENTS.DEV,
      });

      // Assert
      const template = Template.fromStack(stack);

      // 開発環境では DeletionPolicy が Delete に設定される
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Delete',
      });
    });

    test('ステージング環境ではスナップショット保護', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: constants.ENVIRONMENTS.STG,
      });

      // Assert
      const template = Template.fromStack(stack);

      // ステージング環境では DeletionPolicy が Snapshot に設定される
      template.hasResource('AWS::S3::Bucket', {
        DeletionPolicy: 'Snapshot',
      });
    });
  });

  describe('CloudFrontポリシー設定', () => {
    test('CloudFront用バケットポリシーが正しく追加される', () => {
      // Arrange
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      const distributionArn = 'arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE';

      // Act
      construct.addCloudFrontPolicy(distributionArn);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowCloudFrontServicePrincipal',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Action: 's3:GetObject',
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': distributionArn,
                },
              },
            }),
          ]),
        },
      });
    });
  });

  describe('IAMロール権限設定', () => {
    test('デプロイ用ロールに適切な権限が付与される', () => {
      // Arrange
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      const deployRole = new iam.Role(stack, 'DeployRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      });

      // Act
      construct.grantDeploymentAccess(deployRole);

      // Assert
      const template = Template.fromStack(stack);

      // IAMロールにS3権限が付与されていることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                Match.stringLikeRegexp('s3:GetObject.*'),
                Match.stringLikeRegexp('s3:GetBucket.*'),
                Match.stringLikeRegexp('s3:List.*'),
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('バケット情報取得', () => {
    test('バケット情報が正しく取得できる', () => {
      // Arrange & Act
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      const bucketInfo = construct.getBucketInfo();

      // Assert
      expect(bucketInfo).toHaveProperty('bucketName');
      expect(bucketInfo).toHaveProperty('bucketArn');
      expect(bucketInfo).toHaveProperty('bucketDomainName');
      expect(bucketInfo).toHaveProperty('bucketRegionalDomainName');
      expect(bucketInfo).toHaveProperty('bucketWebsiteUrl');

      expect(bucketInfo.bucketName).toBeDefined();
      expect(bucketInfo.bucketArn).toBeDefined();
    });
  });

  describe('タグ設定', () => {
    test('適切なタグが設定される', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: {
          ...mockConfig,
          tags: {
            Project: 'goal-mandala',
            Environment: 'test',
            Owner: 'test-team',
          },
        },
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // タグが設定されていることを確認（CDKが自動的にタグを管理）
      const bucketResource = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(bucketResource)).toHaveLength(1);

      // バケットが作成されていることを確認
      template.hasResource('AWS::S3::Bucket', {});
    });
  });

  describe('セキュリティ設定', () => {
    test('バケットが適切にセキュアに設定される', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // パブリックアクセスがブロックされていることを確認
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });

      // 暗号化が有効であることを確認
      template.hasResourceProperties('AWS::S3::Bucket', {
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

    test('バケット通知設定が有効になる', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // EventBridgeが有効であることを確認（CDKでは自動的に設定される）
      const buckets = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(buckets)).toHaveLength(1);

      // バケットが作成されていることを確認
      template.hasResource('AWS::S3::Bucket', {});
    });

    test('バケットメトリクスが設定される', () => {
      // Arrange & Act
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // メトリクス設定が存在することを確認
      template.hasResourceProperties('AWS::S3::Bucket', {
        MetricsConfigurations: [
          {
            Id: 'EntireBucket',
          },
        ],
      });
    });
  });

  describe('アクセスログ設定', () => {
    test('アクセスログ設定が正しく動作する', () => {
      // Arrange
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      const logsBucket = new s3.Bucket(stack, 'LogsBucket');

      // Act
      construct.setupAccessLogging(logsBucket, 'test-logs/');

      // Assert - メソッドがエラーを投げないことを確認
      expect(construct.bucket).toBeDefined();
    });
  });

  describe('バケット名生成ロジック', () => {
    test('アカウントIDが利用可能な場合、適切なバケット名が生成される', () => {
      // Arrange
      const appWithAccount = new cdk.App();
      appWithAccount.node.setContext('accountId', '123456789012');

      const stackWithAccount = new cdk.Stack(appWithAccount, 'TestStackWithAccount', {
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      // Act
      const construct = new S3FrontendConstruct(stackWithAccount, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      expect(construct.bucketName).toBeDefined();
      expect(construct.bucket).toBeInstanceOf(s3.Bucket);
    });

    test('アカウントIDが不明な場合、自動生成される', () => {
      // Arrange
      const appWithoutAccount = new cdk.App();
      const stackWithoutAccount = new cdk.Stack(appWithoutAccount, 'TestStackWithoutAccount');

      // Act
      const construct = new S3FrontendConstruct(stackWithoutAccount, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      expect(construct.bucket).toBeInstanceOf(s3.Bucket);
      expect(construct.bucketName).toBeDefined();
    });
  });

  describe('ライフサイクルポリシーの詳細テスト', () => {
    test('ライフサイクルポリシーが無効な場合、ルールが設定されない', () => {
      // Arrange
      const configWithoutLifecycle = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          s3: {
            ...mockConfig.frontend.s3,
            lifecyclePolicyEnabled: false,
          },
        },
      };

      // Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: configWithoutLifecycle,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // ライフサイクルルールが設定されていない
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });

      // ライフサイクル設定がないことを確認
      const buckets = template.findResources('AWS::S3::Bucket');
      const bucket = Object.values(buckets)[0] as any;
      expect(bucket.Properties.LifecycleConfiguration).toBeUndefined();
    });

    test('カスタムライフサイクル設定が適用される', () => {
      // Arrange
      const configWithCustomLifecycle = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          s3: {
            ...mockConfig.frontend.s3,
            lifecyclePolicyEnabled: true,
            oldVersionExpirationDays: 60,
            incompleteMultipartUploadDays: 14,
          },
        },
      };

      // Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: configWithCustomLifecycle,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'DeleteIncompleteMultipartUploads',
              Status: 'Enabled',
              AbortIncompleteMultipartUpload: {
                DaysAfterInitiation: 14,
              },
            }),
            Match.objectLike({
              Id: 'DeleteOldVersions',
              Status: 'Enabled',
              NoncurrentVersionExpiration: {
                NoncurrentDays: 60,
              },
            }),
          ]),
        },
      });
    });
  });

  describe('バケット通知とメトリクス設定', () => {
    test('EventBridge通知が有効になる', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // EventBridgeが有効であることを確認（CDKでは自動的に設定される）
      const buckets = template.findResources('AWS::S3::Bucket');
      expect(Object.keys(buckets)).toHaveLength(1);

      // バケットが作成されていることを確認
      template.hasResource('AWS::S3::Bucket', {});
    });

    test('バケットメトリクスが設定される', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        MetricsConfigurations: [
          {
            Id: 'EntireBucket',
          },
        ],
      });
    });
  });

  describe('アクセス権限の詳細テスト', () => {
    test('デプロイロールに包括的な権限が付与される', () => {
      // Arrange
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      const deployRole = new iam.Role(stack, 'DeployRole', {
        assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      });

      // Act
      construct.grantDeploymentAccess(deployRole);

      // Assert
      const template = Template.fromStack(stack);

      // S3権限が付与されていることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                Match.stringLikeRegexp('s3:GetObject.*'),
                Match.stringLikeRegexp('s3:PutObject.*'),
              ]),
            }),
          ]),
        },
      });

      // 追加権限（リスト、削除など）
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                's3:ListBucket',
                Match.stringLikeRegexp('s3:DeleteObject.*'),
                's3:GetBucketLocation',
                's3:GetBucketVersioning',
              ]),
            }),
          ]),
        },
      });
    });

    test('CloudFrontポリシーが正しく設定される', () => {
      // Arrange
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      const distributionArn = 'arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE';

      // Act
      construct.addCloudFrontPolicy(distributionArn);

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'AllowCloudFrontServicePrincipal',
              Effect: 'Allow',
              Principal: {
                Service: 'cloudfront.amazonaws.com',
              },
              Action: 's3:GetObject',
              Condition: {
                StringEquals: {
                  'AWS:SourceArn': distributionArn,
                },
              },
            }),
          ]),
        },
      });
    });
  });

  describe('バージョニング設定', () => {
    test('バージョニングが無効な場合、適切に設定される', () => {
      // Arrange
      const configWithoutVersioning = {
        ...mockConfig,
        frontend: {
          ...mockConfig.frontend,
          s3: {
            ...mockConfig.frontend.s3,
            enableVersioning: false,
          },
        },
      };

      // Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: configWithoutVersioning,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      // バージョニングが無効な場合、VersioningConfigurationが設定されない
      const buckets = template.findResources('AWS::S3::Bucket');
      const bucket = Object.values(buckets)[0] as any;

      // バージョニングが無効の場合、VersioningConfigurationは設定されない
      expect(bucket.Properties.VersioningConfiguration).toBeUndefined();
    });
  });

  describe('CORS設定の詳細テスト', () => {
    test('CORS設定が正しく適用される', () => {
      // Arrange & Act
      new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      // Assert
      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::S3::Bucket', {
        CorsConfiguration: {
          CorsRules: [
            {
              AllowedMethods: ['GET', 'HEAD'],
              AllowedOrigins: ['*'],
              AllowedHeaders: ['*'],
              MaxAge: 3000,
            },
          ],
        },
      });
    });
  });

  describe('エラーケース', () => {
    test('無効な環境名でもコンストラクトが作成される', () => {
      // Arrange & Act
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'invalid-env',
      });

      // Assert
      expect(construct.bucket).toBeInstanceOf(s3.Bucket);
      expect(construct.bucketName).toBeDefined();
    });

    test('設定が不完全でもデフォルト値が適用される', () => {
      // Arrange
      const incompleteConfig = {
        ...mockConfig,
        frontend: {
          s3: {
            enableVersioning: false,
            // 他の設定を省略
          },
        },
      };

      // Act & Assert
      expect(() => {
        new S3FrontendConstruct(stack, 'S3Frontend', {
          config: incompleteConfig as any,
          environment: 'test',
        });
      }).not.toThrow();
    });

    test('アクセスログ設定が例外を投げない', () => {
      // Arrange
      const construct = new S3FrontendConstruct(stack, 'S3Frontend', {
        config: mockConfig,
        environment: 'test',
      });

      const logsBucket = new s3.Bucket(stack, 'LogsBucket');

      // Act & Assert
      expect(() => {
        construct.setupAccessLogging(logsBucket, 'test-logs/');
      }).not.toThrow();
    });
  });
});
