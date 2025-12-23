import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CloudTrailStack } from '../cloudtrail-stack';
import { ProjectConfig } from '../../config/project-config';

describe('CloudTrailStack', () => {
  let app: cdk.App;
  let stack: CloudTrailStack;
  let template: Template;

  const createTestConfig = (environment: string): ProjectConfig => ({
    projectName: 'goal-mandala',
    stackPrefix: 'goal-mandala',
    environment,
    region: 'ap-northeast-1',
    alertEmail: environment === 'prod' ? 'admin@example.com' : undefined,
  });

  describe('本番環境', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = createTestConfig('prod');
      stack = new CloudTrailStack(app, 'TestCloudTrailStack', config, {
        env: { region: config.region },
      });
      template = Template.fromStack(stack);
    });

    test('CloudTrailが作成されること', () => {
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        TrailName: 'goal-mandala-prod-audit-trail',
        IncludeGlobalServiceEvents: true,
        IsMultiRegionTrail: true,
        EnableLogFileValidation: true,
      });
    });

    test('S3バケットが作成されること', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'goal-mandala-prod-cloudtrail-logs',
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
              },
            },
          ],
        },
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });

    test('CloudWatch Logsロググループが作成されること', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/cloudtrail/goal-mandala-prod',
        RetentionInDays: 365, // 1年
      });
    });

    test('KMSキーが作成されること', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        Description: 'KMS key for CloudTrail log encryption',
        EnableKeyRotation: true,
      });

      template.hasResourceProperties('AWS::KMS::Alias', {
        AliasName: 'alias/goal-mandala-prod-cloudtrail-key',
      });
    });

    test('SNSトピックが作成されること', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'goal-mandala-prod-cloudtrail-alerts',
        DisplayName: 'CloudTrail Security Alerts',
      });
    });

    test('メール通知が設定されること', () => {
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'admin@example.com',
      });
    });

    test('ライフサイクルルールが設定されること', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              Id: 'DeleteOldLogs',
              Status: 'Enabled',
              ExpirationInDays: 2555, // 7年
              Transitions: [
                {
                  StorageClass: 'STANDARD_IA',
                  TransitionInDays: 30,
                },
                {
                  StorageClass: 'GLACIER',
                  TransitionInDays: 90,
                },
              ],
            },
          ],
        },
      });
    });

    test('スタック出力が定義されること', () => {
      template.hasOutput('TrailArn', {
        Export: {
          Name: 'goal-mandala-prod-cloudtrail-arn',
        },
      });

      template.hasOutput('LogBucketName', {
        Export: {
          Name: 'goal-mandala-prod-cloudtrail-bucket',
        },
      });

      template.hasOutput('LogGroupName', {
        Export: {
          Name: 'goal-mandala-prod-cloudtrail-loggroup',
        },
      });

      template.hasOutput('AlertTopicArn', {
        Export: {
          Name: 'goal-mandala-prod-cloudtrail-alert-topic',
        },
      });
    });

    test('適切なタグが設定されること', () => {
      const resources = template.findResources('AWS::CloudTrail::Trail');
      const trailLogicalId = Object.keys(resources)[0];
      const trail = resources[trailLogicalId];

      expect(trail.Properties.Tags).toEqual(
        expect.arrayContaining([
          { Key: 'Project', Value: 'goal-mandala' },
          { Key: 'Environment', Value: 'prod' },
          { Key: 'ManagedBy', Value: 'CDK' },
          { Key: 'Stack', Value: 'CloudTrail' },
        ])
      );
    });
  });

  describe('開発環境', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = createTestConfig('dev');
      stack = new CloudTrailStack(app, 'TestCloudTrailStack', config, {
        env: { region: config.region },
      });
      template = Template.fromStack(stack);
    });

    test('CloudTrailが作成されること', () => {
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        TrailName: 'goal-mandala-dev-audit-trail',
      });
    });

    test('ログ保持期間が短いこと', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30, // 1ヶ月
      });
    });

    test('ライフサイクルルールが短いこと', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              ExpirationInDays: 90, // 90日
            },
          ],
        },
      });
    });

    test('メール通知が設定されないこと', () => {
      const subscriptions = template.findResources('AWS::SNS::Subscription');
      expect(Object.keys(subscriptions).length).toBe(0);
    });
  });

  describe('セキュリティ', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = createTestConfig('prod');
      stack = new CloudTrailStack(app, 'TestCloudTrailStack', config, {
        env: { region: config.region },
      });
      template = Template.fromStack(stack);
    });

    test('S3バケットがパブリックアクセスをブロックすること', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('ログファイル検証が有効であること', () => {
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        EnableLogFileValidation: true,
      });
    });

    test('KMS暗号化が有効であること', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            {
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
              },
            },
          ],
        },
      });
    });

    test('キーローテーションが有効であること', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });
  });

  describe('リソース数', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = createTestConfig('prod');
      stack = new CloudTrailStack(app, 'TestCloudTrailStack', config, {
        env: { region: config.region },
      });
      template = Template.fromStack(stack);
    });

    test('必要なリソースが全て作成されること', () => {
      template.resourceCountIs('AWS::CloudTrail::Trail', 1);
      template.resourceCountIs('AWS::S3::Bucket', 1);
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
      template.resourceCountIs('AWS::KMS::Key', 1);
      template.resourceCountIs('AWS::KMS::Alias', 1);
      template.resourceCountIs('AWS::SNS::Topic', 1);
      template.resourceCountIs('AWS::SNS::Subscription', 1); // 本番環境のみ
    });
  });
});
