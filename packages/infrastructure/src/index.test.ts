import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from './stacks/database-stack';
import { ApiStack } from './stacks/api-stack';
import { FrontendStack } from './stacks/frontend-stack';
import { EnvironmentConfig } from './config/environment';

// 設定ファイルの読み込みをモック
jest.mock('./config/environment', () => ({
  getEnvironmentConfig: jest.fn(),
}));

import { getEnvironmentConfig } from './config/environment';
const mockedGetEnvironmentConfig = getEnvironmentConfig as jest.MockedFunction<
  typeof getEnvironmentConfig
>;

describe('CDK Application', () => {
  let app: cdk.App;
  let mockConfig: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();

    mockConfig = {
      stackPrefix: 'goal-mandala-test',
      region: 'ap-northeast-1',
      account: '123456789012',
      database: {
        instanceClass: 'serverless',
        minCapacity: 0.5,
        maxCapacity: 1,
        databaseName: 'goal_mandala',
        backupRetentionDays: 7,
        deletionProtection: false,
      },
      lambda: {
        timeout: 30,
        memorySize: 256,
        runtime: 'nodejs20.x',
      },
      frontend: {
        domainName: undefined,
        certificateArn: undefined,
        customErrorResponses: true,
      },
      monitoring: {
        logRetentionDays: 30,
        enableDetailedMonitoring: false,
      },
      tags: {
        Environment: 'test',
        Project: 'GoalMandala',
      },
    };

    mockedGetEnvironmentConfig.mockReturnValue(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DatabaseStack', () => {
    it('DatabaseStackが正常にsynthできる', () => {
      const stack = new DatabaseStack(app, 'TestDatabaseStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
      });

      const template = Template.fromStack(stack);

      // 主要リソースが作成されることを確認
      template.resourceCountIs('AWS::RDS::DBCluster', 1);
      template.resourceCountIs('AWS::SecretsManager::Secret', 1);
      template.resourceCountIs('AWS::EC2::SecurityGroup', 2); // Database + Lambda用
      template.resourceCountIs('AWS::RDS::DBSubnetGroup', 1);
      template.resourceCountIs('AWS::RDS::DBClusterParameterGroup', 1);
      template.resourceCountIs('AWS::Logs::LogGroup', 1);

      // スタック名が正しく設定されることを確認
      expect(stack.stackName).toBe('TestDatabaseStack');
    });

    it('本番環境設定でDatabaseStackが作成される', () => {
      const prodConfig: EnvironmentConfig = {
        ...mockConfig,
        stackPrefix: 'goal-mandala-prod',
        database: {
          ...mockConfig.database,
          minCapacity: 2,
          maxCapacity: 16,
          backupRetentionDays: 30,
          deletionProtection: true,
        },
      };

      const stack = new DatabaseStack(app, 'ProdDatabaseStack', {
        env: {
          region: prodConfig.region,
          account: prodConfig.account,
        },
        config: prodConfig,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::RDS::DBCluster', {
        ServerlessV2ScalingConfiguration: {
          MinCapacity: 2,
          MaxCapacity: 16,
        },
        DeletionProtection: true,
        BackupRetentionPeriod: 30,
      });
    });
  });

  describe('ApiStack', () => {
    it('ApiStackが正常にsynthできる', () => {
      // 依存するDatabaseStackを作成
      const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
      });

      const apiStack = new ApiStack(app, 'TestApiStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
        vpc: databaseStack.vpc,
        lambdaSecurityGroup: databaseStack.database.securityGroup,
        databaseSecret: databaseStack.database.secret,
      });

      const template = Template.fromStack(apiStack);

      // 主要リソースが作成されることを確認
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
      template.resourceCountIs('AWS::Lambda::Function', 1); // 最低1つのLambda関数
      template.resourceCountIs('AWS::IAM::Role', 1); // Lambda実行ロール

      expect(apiStack.stackName).toBe('TestApiStack');
    });

    it('ApiStackの依存関係が正しく設定される', () => {
      const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
      });

      const apiStack = new ApiStack(app, 'TestApiStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
        vpc: databaseStack.vpc,
        lambdaSecurityGroup: databaseStack.database.securityGroup,
        databaseSecret: databaseStack.database.secret,
      });

      // ApiStackがDatabaseStackに依存していることを確認
      expect(apiStack.dependencies).toContain(databaseStack);
    });
  });

  describe('FrontendStack', () => {
    it('FrontendStackが正常にsynthできる', () => {
      // 依存するスタックを作成
      const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
      });

      const apiStack = new ApiStack(app, 'TestApiStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
        database: databaseStack.database,
      });

      const frontendStack = new FrontendStack(app, 'TestFrontendStack', {
        env: {
          region: mockConfig.region,
          account: mockConfig.account,
        },
        config: mockConfig,
        api: apiStack.api,
      });

      const template = Template.fromStack(frontendStack);

      // 主要リソースが作成されることを確認
      template.resourceCountIs('AWS::S3::Bucket', 1);
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);

      expect(frontendStack.stackName).toBe('TestFrontendStack');
    });

    it('カスタムドメイン設定でFrontendStackが作成される', () => {
      const customConfig: EnvironmentConfig = {
        ...mockConfig,
        frontend: {
          domainName: 'example.com',
          certificateArn:
            'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
          customErrorResponses: true,
        },
      };

      const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
        env: {
          region: customConfig.region,
          account: customConfig.account,
        },
        config: customConfig,
      });

      const apiStack = new ApiStack(app, 'TestApiStack', {
        env: {
          region: customConfig.region,
          account: customConfig.account,
        },
        config: customConfig,
        vpc: databaseStack.vpc,
        lambdaSecurityGroup: databaseStack.database.securityGroup,
        databaseSecret: databaseStack.database.secret,
      });

      const frontendStack = new FrontendStack(app, 'TestFrontendStack', {
        env: {
          region: customConfig.region,
          account: customConfig.account,
        },
        config: customConfig,
        api: apiStack.api,
      });

      const template = Template.fromStack(frontendStack);

      // カスタムドメイン設定が適用されることを確認
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['example.com'],
          ViewerCertificate: {
            AcmCertificateArn:
              'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
            SslSupportMethod: 'sni-only',
          },
        },
      });
    });
  });

  describe('スタック間の統合', () => {
    it('全スタックが正常にsynthできる', () => {
      const env = {
        region: mockConfig.region,
        account: mockConfig.account,
      };

      const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
        env,
        config: mockConfig,
      });

      const apiStack = new ApiStack(app, 'TestApiStack', {
        env,
        config: mockConfig,
        vpc: databaseStack.vpc,
        lambdaSecurityGroup: databaseStack.database.securityGroup,
        databaseSecret: databaseStack.database.secret,
      });

      const frontendStack = new FrontendStack(app, 'TestFrontendStack', {
        env,
        config: mockConfig,
        api: apiStack.api,
      });

      // 全スタックがエラーなくsynthできることを確認
      const assembly = app.synth();

      expect(assembly.stacks).toHaveLength(3);
      expect(assembly.stacks.map(s => s.stackName)).toContain('TestDatabaseStack');
      expect(assembly.stacks.map(s => s.stackName)).toContain('TestApiStack');
      expect(assembly.stacks.map(s => s.stackName)).toContain('TestFrontendStack');
    });

    it('スタック間の依存関係が正しく設定される', () => {
      const env = {
        region: mockConfig.region,
        account: mockConfig.account,
      };

      const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
        env,
        config: mockConfig,
      });

      const apiStack = new ApiStack(app, 'TestApiStack', {
        env,
        config: mockConfig,
        vpc: databaseStack.vpc,
        lambdaSecurityGroup: databaseStack.database.securityGroup,
        databaseSecret: databaseStack.database.secret,
      });

      const frontendStack = new FrontendStack(app, 'TestFrontendStack', {
        env,
        config: mockConfig,
        api: apiStack.api,
      });

      // 依存関係が正しく設定されることを確認
      expect(apiStack.dependencies).toContain(databaseStack);
      expect(frontendStack.dependencies).toContain(apiStack);
    });
  });

  describe('エラーケース', () => {
    it('無効な設定でスタック作成時にエラーが発生する', () => {
      const invalidConfig: EnvironmentConfig = {
        ...mockConfig,
        database: {
          ...mockConfig.database,
          minCapacity: -1, // 無効な値
        },
      };

      // 無効な設定でスタック作成時にエラーが発生することを確認
      expect(() => {
        new DatabaseStack(app, 'InvalidDatabaseStack', {
          env: {
            region: invalidConfig.region,
            account: invalidConfig.account,
          },
          config: invalidConfig,
        });
      }).toThrow();
    });
  });
});
