import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AIGenerationLambdaConstruct } from './ai-generation-lambda-construct';

describe('AIGenerationLambdaConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
    });
  });

  describe('Lambda関数の作成', () => {
    it('Lambda関数が正しく作成される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'goal-mandala-test-ai-generation',
        Runtime: 'nodejs20.x',
        Handler: 'ai-generation.handler',
        MemorySize: 1024,
        Timeout: 300,
        ReservedConcurrentExecutions: 10,
      });
    });

    it('カスタム設定でLambda関数が作成される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'prod',
        codePath: './dist',
        handler: 'index.handler',
        memorySize: 2048,
        timeout: 600,
        reservedConcurrentExecutions: 20,
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 2048,
        Timeout: 600,
        ReservedConcurrentExecutions: 20,
      });
    });

    it('環境変数が正しく設定される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'dev',
        codePath: './dist',
        handler: 'ai-generation.handler',
        bedrockRegion: 'us-east-1',
        bedrockModelId: 'amazon.nova-micro-v1:0',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: {
            BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
            BEDROCK_REGION: 'us-east-1',
            LOG_LEVEL: 'INFO',
            NODE_ENV: 'dev',
          },
        },
      });
    });
  });

  describe('IAMロールの作成', () => {
    it('Lambda実行ロールが正しく作成される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-lambda-ai-generation-role',
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

    it('基本的なLambda実行権限が付与される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                { Ref: 'AWS::Partition' },
                ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
              ],
            ],
          },
        ],
      });
    });
  });

  describe('Bedrock権限の付与', () => {
    it('Bedrock InvokeModel権限が正しく付与される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
        bedrockRegion: 'ap-northeast-1',
        bedrockModelId: 'amazon.nova-micro-v1:0',
      });

      const template = Template.fromStack(stack);

      // ポリシーステートメントの中にBedrock権限が含まれていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const policyStatements = Object.values(policies).flatMap((policy: any) =>
        policy.Properties.PolicyDocument.Statement.filter(
          (stmt: any) => stmt.Sid === 'BedrockInvokeModelPermission'
        )
      );

      expect(policyStatements).toHaveLength(1);
      expect(policyStatements[0]).toMatchObject({
        Action: 'bedrock:InvokeModel',
        Effect: 'Allow',
        Resource: 'arn:aws:bedrock:ap-northeast-1::foundation-model/amazon.nova-micro-v1:0',
        Sid: 'BedrockInvokeModelPermission',
      });
    });

    it('最小権限の原則が適用される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      // Bedrock権限が特定のモデルのみに制限されていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const policyStatements = Object.values(policies).flatMap((policy: any) =>
        policy.Properties.PolicyDocument.Statement.filter(
          (stmt: any) => stmt.Action === 'bedrock:InvokeModel'
        )
      );

      expect(policyStatements).toHaveLength(1);
      expect(policyStatements[0].Resource).toContain('foundation-model/amazon.nova-micro-v1:0');
    });
  });

  describe('CloudWatch Logs権限の付与', () => {
    it('CloudWatch Logs権限が正しく付与される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      // ポリシーステートメントの中にCloudWatch Logs権限が含まれていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const policyStatements = Object.values(policies).flatMap((policy: any) =>
        policy.Properties.PolicyDocument.Statement.filter(
          (stmt: any) => stmt.Sid === 'CloudWatchLogsPermission'
        )
      );

      expect(policyStatements).toHaveLength(1);
      expect(policyStatements[0]).toMatchObject({
        Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        Effect: 'Allow',
        Sid: 'CloudWatchLogsPermission',
      });
    });
  });

  describe('追加権限の付与', () => {
    it('VPCアクセス権限を付与できる', () => {
      const construct = new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      construct.grantVpcAccess('vpc-12345678');

      const template = Template.fromStack(stack);

      // ポリシーステートメントの中にVPCアクセス権限が含まれていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const policyStatements = Object.values(policies).flatMap((policy: any) =>
        policy.Properties.PolicyDocument.Statement.filter(
          (stmt: any) => stmt.Sid === 'VPCAccessPermission'
        )
      );

      expect(policyStatements).toHaveLength(1);
      expect(policyStatements[0]).toMatchObject({
        Action: [
          'ec2:CreateNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DeleteNetworkInterface',
          'ec2:AssignPrivateIpAddresses',
          'ec2:UnassignPrivateIpAddresses',
        ],
        Condition: {
          StringEquals: {
            'ec2:Vpc': 'vpc-12345678',
          },
        },
        Effect: 'Allow',
        Resource: '*',
        Sid: 'VPCAccessPermission',
      });
    });

    it('Secrets Managerアクセス権限を付与できる', () => {
      const construct = new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      construct.grantSecretsManagerAccess(
        'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret'
      );

      const template = Template.fromStack(stack);

      // ポリシーステートメントの中にSecrets Manager権限が含まれていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const policyStatements = Object.values(policies).flatMap((policy: any) =>
        policy.Properties.PolicyDocument.Statement.filter(
          (stmt: any) => stmt.Sid === 'SecretsManagerAccessPermission'
        )
      );

      expect(policyStatements).toHaveLength(1);
      expect(policyStatements[0]).toMatchObject({
        Action: 'secretsmanager:GetSecretValue',
        Effect: 'Allow',
        Resource: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-secret',
        Sid: 'SecretsManagerAccessPermission',
      });
    });

    it('DynamoDBアクセス権限を付与できる', () => {
      const construct = new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      construct.grantDynamoDBAccess(
        'arn:aws:dynamodb:ap-northeast-1:123456789012:table/test-table'
      );

      const template = Template.fromStack(stack);

      // ポリシーステートメントの中にDynamoDB権限が含まれていることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      const policyStatements = Object.values(policies).flatMap((policy: any) =>
        policy.Properties.PolicyDocument.Statement.filter(
          (stmt: any) => stmt.Sid === 'DynamoDBAccessPermission'
        )
      );

      expect(policyStatements).toHaveLength(1);
      expect(policyStatements[0]).toMatchObject({
        Action: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        Effect: 'Allow',
        Resource: [
          'arn:aws:dynamodb:ap-northeast-1:123456789012:table/test-table',
          'arn:aws:dynamodb:ap-northeast-1:123456789012:table/test-table/index/*',
        ],
        Sid: 'DynamoDBAccessPermission',
      });
    });
  });

  describe('出力', () => {
    it('Lambda関数のARNが出力される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      template.hasOutput('*', {
        Export: {
          Name: 'goal-mandala-test-ai-generation-function-arn',
        },
      });
    });

    it('Lambda関数の名前が出力される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      template.hasOutput('*', {
        Export: {
          Name: 'goal-mandala-test-ai-generation-function-name',
        },
      });
    });

    it('IAMロールのARNが出力される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'test',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      template.hasOutput('*', {
        Export: {
          Name: 'goal-mandala-test-ai-generation-role-arn',
        },
      });
    });
  });

  describe('タグ', () => {
    it('適切なタグが設定される', () => {
      new AIGenerationLambdaConstruct(stack, 'TestAIGeneration', {
        environment: 'prod',
        codePath: './dist',
        handler: 'ai-generation.handler',
      });

      const template = Template.fromStack(stack);

      // Lambda関数にタグが設定されていることを確認
      const functions = template.findResources('AWS::Lambda::Function');
      const aiGenerationFunction = Object.values(functions).find(
        (fn: any) => fn.Properties.FunctionName === 'goal-mandala-prod-ai-generation'
      ) as any;

      expect(aiGenerationFunction).toBeDefined();
      expect(aiGenerationFunction.Properties.Tags).toEqual(
        expect.arrayContaining([
          { Key: 'Environment', Value: 'prod' },
          { Key: 'Service', Value: 'AI Generation' },
          { Key: 'ManagedBy', Value: 'CDK' },
        ])
      );
    });
  });
});
