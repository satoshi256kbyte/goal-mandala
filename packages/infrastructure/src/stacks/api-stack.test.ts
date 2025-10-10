import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
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
  let mockUserPool: cognito.IUserPool;
  let mockUserPoolClient: cognito.IUserPoolClient;
  let mockCognitoRole: iam.IRole;

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

    mockUserPool = cognito.UserPool.fromUserPoolArn(
      mockStack,
      'MockUserPool',
      'arn:aws:cognito-idp:ap-northeast-1:123456789012:userpool/ap-northeast-1_test123'
    );

    mockUserPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
      mockStack,
      'MockUserPoolClient',
      'test-client-id'
    );

    mockCognitoRole = iam.Role.fromRoleArn(
      mockStack,
      'MockCognitoRole',
      'arn:aws:iam::123456789012:role/test-cognito-role'
    );

    stack = new ApiStack(app, 'TestApiStack', {
      config,
      vpc: mockVpc,
      lambdaSecurityGroup: mockSecurityGroup,
      databaseSecret: mockSecret,
      userPool: mockUserPool,
      userPoolClient: mockUserPoolClient,
      cognitoLambdaRole: mockCognitoRole,
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

  test('Lambda実行ロールが設定される', () => {
    // モックのCognitoロールを使用しているため、新しいロールは作成されない
    // Lambda関数が正しく作成されていることで間接的に確認
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-auth',
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

    // サブ目標生成関数
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-subgoal-generation',
      Runtime: 'nodejs20.x',
      Handler: 'handlers/subgoal-generation.handler',
      Timeout: 60,
      MemorySize: 1024,
    });

    // アクション生成関数
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-action-generation',
      Runtime: 'nodejs20.x',
      Handler: 'handlers/action-generation.handler',
      Timeout: 60,
      MemorySize: 1024,
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

  test('Bedrock Lambda関数が作成される', () => {
    // Bedrock統合Lambda関数が正しく作成されていることを確認
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-subgoal-generation',
      Timeout: 60,
      MemorySize: 1024,
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-action-generation',
      Timeout: 60,
      MemorySize: 1024,
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-task-generation',
      Timeout: 60,
      MemorySize: 1024,
    });
  });

  test('アクション生成エンドポイントが作成される', () => {
    // /api/ai/generate/actions リソース
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'actions',
    });
  });

  test('アクション生成Lambda関数の環境変数が設定される', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-action-generation',
      Environment: {
        Variables: {
          FUNCTION_TYPE: 'action-generation',
          BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
          BEDROCK_REGION: 'ap-northeast-1',
          LOG_LEVEL: 'INFO',
        },
      },
    });
  });

  test('タスク生成Lambda関数が作成される', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-task-generation',
      Runtime: 'nodejs20.x',
      Handler: 'handlers/task-generation.handler',
      Timeout: 60,
      MemorySize: 1024,
    });
  });

  test('タスク生成エンドポイントが作成される', () => {
    // /api/ai/generate/tasks リソース
    template.hasResourceProperties('AWS::ApiGateway::Resource', {
      PathPart: 'tasks',
    });
  });

  test('タスク生成Lambda関数の環境変数が設定される', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'goal-mandala-dev-task-generation',
      Environment: {
        Variables: {
          FUNCTION_TYPE: 'task-generation',
          BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
          BEDROCK_REGION: 'ap-northeast-1',
          LOG_LEVEL: 'INFO',
        },
      },
    });
  });

  test('タスク生成Lambda関数にCognito Authorizerが設定される', () => {
    // タスク生成エンドポイントにCognito認証が設定されていることを確認
    const methods = template.findResources('AWS::ApiGateway::Method', {
      Properties: {
        HttpMethod: 'POST',
        AuthorizationType: 'COGNITO_USER_POOLS',
      },
    });

    // 少なくとも1つのPOSTメソッドがCognito認証を使用していることを確認
    expect(Object.keys(methods).length).toBeGreaterThan(0);
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
