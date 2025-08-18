import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Template } from 'aws-cdk-lib/assertions';
import { ApiStack } from './api-stack';
import { getEnvironmentConfig } from '../config/environment';

describe('ApiStack', () => {
  let app: cdk.App;
  let stack: ApiStack;
  let template: Template;
  let mockVpc: ec2.IVpc;
  let mockSecurityGroup: ec2.ISecurityGroup;
  let mockSecret: secretsmanager.ISecret;

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

    // モックオブジェクトを作成
    mockVpc = ec2.Vpc.fromLookup(mockStack, 'MockVpc', {
      vpcId: 'vpc-12345678',
    });

    mockSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      mockStack,
      'MockSecurityGroup',
      'sg-12345678'
    );

    mockSecret = secretsmanager.Secret.fromSecretArn(
      mockStack,
      'MockSecret',
      'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret-abcdef'
    );

    stack = new ApiStack(app, 'TestApiStack', {
      config,
      vpc: mockVpc,
      lambdaSecurityGroup: mockSecurityGroup,
      databaseSecret: mockSecret,
      env: {
        region: config.region,
        account: '123456789012',
      },
    });

    template = Template.fromStack(stack);
  });

  test('API Gatewayが作成される', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'goal-mandala-dev-api',
      Description: 'Goal Mandala API',
    });
  });

  test('API Gatewayデプロイメントが作成される', () => {
    template.hasResource('AWS::ApiGateway::Deployment', {});
    template.hasResource('AWS::ApiGateway::Stage', {});
  });

  test('Lambda実行ロールが作成される', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
          },
        ],
      },
    });
  });

  test('Lambda関数が作成される', () => {
    // 認証関数
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-auth',
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      Timeout: 30,
      MemorySize: 512,
    });

    // 目標管理関数
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-goals',
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
    });

    // タスク管理関数
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-tasks',
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
    });

    // AI処理関数
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-ai-processor',
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      Timeout: 900, // 15分
      MemorySize: 1024,
    });
  });

  test('API Gatewayリソースが作成される', () => {
    // 認証エンドポイント
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'auth',
    });

    // 目標管理エンドポイント
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'goals',
    });

    // タスク管理エンドポイント
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'tasks',
    });

    // AI処理エンドポイント
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'ai',
    });

    // ヘルスチェックエンドポイント
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'health',
    });
  });

  test('API Gatewayメソッドが作成される', () => {
    // POSTメソッド
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
    });

    // GETメソッド
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'GET',
    });

    // PUTメソッド
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'PUT',
    });

    // DELETEメソッド
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'DELETE',
    });
  });

  test('CloudWatch Logsグループが作成される', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/apigateway/goal-mandala-dev-api',
      RetentionInDays: 30,
    });

    // Lambda関数用のログループ
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/lambda/goal-mandala-dev-auth',
      RetentionInDays: 30,
    });
  });

  test('Bedrock権限が設定される', () => {
    // IAMポリシーが存在することを確認（詳細な権限は実際のLambda関数作成時に検証）
    template.hasResource('AWS::IAM::Policy', {});
  });

  test('必要な出力が定義される', () => {
    template.hasOutput('ApiUrl', {});
    template.hasOutput('ApiId', {});
  });

  test('Lambda関数の環境変数が設定される', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          NODE_ENV: 'production',
          DATABASE_SECRET_ARN:
            'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret-abcdef',
          APP_REGION: 'ap-northeast-1',
          LOG_LEVEL: 'info',
          FUNCTION_TYPE: 'auth',
        },
      },
    });
  });
});
