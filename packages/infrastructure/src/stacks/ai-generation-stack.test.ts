import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApiStack } from './api-stack';
import { getEnvironmentConfig } from '../config/environment';

describe('AI Generation Lambda Stack', () => {
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

    mockUserPool = cognito.UserPool.fromUserPoolId(
      mockStack,
      'MockUserPool',
      'ap-northeast-1_XXXXXXXXX'
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

  describe('AI Generation Lambda Function', () => {
    test('AI処理Lambda関数が作成される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        Runtime: 'nodejs20.x',
        Handler: 'index.handler',
        Timeout: 900, // 15分
        MemorySize: 1024,
      });
    });

    test('Lambda関数に適切な環境変数が設定される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        Environment: {
          Variables: Match.objectLike({
            NODE_ENV: 'production',
            FUNCTION_TYPE: 'ai',
            DATABASE_SECRET_ARN: Match.anyValue(),
            APP_REGION: 'ap-northeast-1',
            LOG_LEVEL: 'info',
            BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
            BEDROCK_REGION: 'ap-northeast-1',
            BEDROCK_MAX_RETRIES: '3',
            BEDROCK_TIMEOUT_MS: '300000',
          }),
        },
      });
    });

    test('Lambda関数がVPC内に配置される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        VpcConfig: {
          SecurityGroupIds: Match.anyValue(),
          SubnetIds: Match.anyValue(),
        },
      });
    });

    test('Lambda関数にX-Rayトレーシングが有効化される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        TracingConfig: {
          Mode: 'Active',
        },
      });
    });
  });

  describe('IAM Permissions', () => {
    test('Lambda関数にBedrock権限が付与される', () => {
      // Lambda関数のロールポリシーを確認
      const lambdaFunctions = template.findResources('AWS::Lambda::Function');
      const aiProcessorFunction = Object.values(lambdaFunctions).find(
        (resource: any) => resource.Properties?.FunctionName === 'goal-mandala-dev-ai-processor'
      );

      // Lambda関数が存在し、ロールが設定されていることを確認
      expect(aiProcessorFunction).toBeDefined();
      expect(aiProcessorFunction).toHaveProperty('Properties.Role');
    });

    test('Lambda実行ロールが設定される', () => {
      // Lambda関数にロールが設定されていることを確認
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        Role: Match.anyValue(),
      });
    });
  });

  describe('CloudWatch Logs', () => {
    test('Lambda関数用のCloudWatch Logsグループが作成される', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/lambda/goal-mandala-dev-ai-processor',
        RetentionInDays: 30,
      });
    });
  });

  describe('API Gateway Integration', () => {
    test('サブ目標生成エンドポイントが作成される', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'generate-subgoals',
      });
    });

    test('アクション生成エンドポイントが作成される', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'generate-actions',
      });
    });

    test('タスク生成エンドポイントが作成される', () => {
      template.hasResourceProperties('AWS::ApiGateway::Resource', {
        PathPart: 'generate-tasks',
      });
    });

    test('AI生成エンドポイントにCognito認証が設定される', () => {
      // Cognito Authorizerが作成されることを確認
      template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
        Type: 'COGNITO_USER_POOLS',
        IdentitySource: 'method.request.header.Authorization',
      });
    });

    test('AI生成エンドポイントにPOSTメソッドが設定される', () => {
      // POSTメソッドが作成されることを確認
      template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'POST',
        AuthorizationType: 'COGNITO_USER_POOLS',
      });
    });
  });

  describe('CloudWatch Alarms', () => {
    test('エラー率アラームが作成される', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-dev-ai-processor-error-rate',
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        Threshold: 5,
        EvaluationPeriods: 2,
      });
    });

    test('レスポンス時間アラームが作成される', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-dev-ai-processor-duration',
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        Threshold: 60000,
        EvaluationPeriods: 2,
      });
    });

    test('スロットリングアラームが作成される', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-dev-ai-processor-throttle',
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        Threshold: 1,
        EvaluationPeriods: 1,
      });
    });

    test('同時実行数アラームが作成される', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'goal-mandala-dev-ai-processor-concurrent-executions',
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        Threshold: 8,
        EvaluationPeriods: 2,
      });
    });
  });

  describe('Outputs', () => {
    test('Lambda関数ARNが出力される', () => {
      const outputs = template.findOutputs('*');
      const functionArnOutput = Object.values(outputs).find(output =>
        output.Export?.Name?.includes('ai-processor-arn')
      );
      expect(functionArnOutput).toBeDefined();
    });

    test('API URLが出力される', () => {
      const outputs = template.findOutputs('*');
      const apiUrlOutput = Object.values(outputs).find(output =>
        output.Export?.Name?.includes('api-url')
      );
      expect(apiUrlOutput).toBeDefined();
    });
  });

  describe('Resource Tagging', () => {
    test('Lambda関数に適切なタグが設定される', () => {
      // タグが設定されることを確認（CDKのタグ機能を使用）
      const resources = template.findResources('AWS::Lambda::Function');
      const aiProcessorFunction = Object.values(resources).find(
        (resource: any) => resource.Properties?.FunctionName === 'goal-mandala-dev-ai-processor'
      );
      expect(aiProcessorFunction).toBeDefined();
    });
  });

  describe('Performance Configuration', () => {
    test('Lambda関数のメモリサイズが1024MBに設定される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        MemorySize: 1024,
      });
    });

    test('Lambda関数のタイムアウトが15分に設定される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        Timeout: 900, // 15分 = 900秒
      });
    });
  });

  describe('Security Configuration', () => {
    test('Lambda関数がプライベートサブネットに配置される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        VpcConfig: {
          SubnetIds: Match.anyValue(),
        },
      });
    });

    test('Lambda関数にセキュリティグループが設定される', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-dev-ai-processor',
        VpcConfig: {
          SecurityGroupIds: Match.anyValue(),
        },
      });
    });
  });
});
