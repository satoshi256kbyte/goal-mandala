import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { LambdaConstruct } from './lambda-construct';
import { EnvironmentConfig } from '../config/environment';

describe('LambdaConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let vpc: ec2.Vpc;
  let securityGroup: ec2.SecurityGroup;
  let databaseSecret: secretsmanager.Secret;
  let config: EnvironmentConfig;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');

    // VPCを作成
    vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // セキュリティグループを作成
    securityGroup = new ec2.SecurityGroup(stack, 'TestSecurityGroup', {
      vpc,
      description: 'Test security group',
    });

    // データベースシークレットを作成
    databaseSecret = new secretsmanager.Secret(stack, 'TestSecret', {
      description: 'Test database secret',
    });

    // テスト用設定
    config = {
      stackPrefix: 'goal-mandala-test',
      region: 'ap-northeast-1',
      database: {
        instanceClass: 'serverless',
        minCapacity: 0.5,
        maxCapacity: 1,
      },
      lambda: {
        timeout: 30,
        memorySize: 256,
      },
      frontend: {},
      tags: {
        Environment: 'test',
        Project: 'GoalMandala',
      },
    };
  });

  it('LambdaConstructが正しく作成される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    const template = Template.fromStack(stack);

    // IAM実行ロールが作成されることを確認
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      Description: 'Execution role for Lambda functions',
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              { Ref: 'AWS::Partition' },
              ':iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole',
            ],
          ],
        },
      ],
    });

    // インラインポリシーが作成されることを確認
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: [
        {
          PolicyName: 'DatabaseAccess',
          PolicyDocument: {
            Statement: Match.arrayWith([
              {
                Effect: 'Allow',
                Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
                Resource: { Ref: Match.anyValue() },
              },
              {
                Effect: 'Allow',
                Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                Resource: Match.stringLikeRegexp('arn:aws:logs:.*:log-group:/aws/lambda/.*'),
              },
              {
                Effect: 'Allow',
                Action: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                Resource: '*',
              },
            ]),
          },
        },
      ],
    });

    // プロパティが正しく設定されることを確認
    expect(lambdaConstruct.executionRole).toBeDefined();
    expect(lambdaConstruct.functions).toBeDefined();
    expect(lambdaConstruct.functions.size).toBe(0);
  });

  it('基本的なLambda関数が作成される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    const lambdaFunction = lambdaConstruct.createFunction({
      functionName: 'TestFunction',
      handler: 'index.handler',
      codePath: './src',
      description: 'Test Lambda function',
    });

    const template = Template.fromStack(stack);

    // Lambda関数が作成されることを確認
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'TestFunction',
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
      Description: 'Test Lambda function',
      Timeout: 30,
      MemorySize: 256,
      TracingConfig: {
        Mode: 'Active',
      },
    });

    // CloudWatch Logsグループが作成されることを確認
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/lambda/TestFunction',
      RetentionInDays: 30,
    });

    // 出力が作成されることを確認（パターンマッチング）
    const outputs = template.findOutputs('*');
    const outputNames = Object.keys(outputs);
    expect(outputNames.some(name => name.startsWith('LambdaTestFunctionArn'))).toBe(true);

    // 関数がマップに追加されることを確認
    expect(lambdaConstruct.functions.get('TestFunction')).toBe(lambdaFunction);
    expect(lambdaConstruct.getFunction('TestFunction')).toBe(lambdaFunction);
  });

  it('API用Lambda関数が作成される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    lambdaConstruct.createApiFunction({
      functionName: 'ApiFunction',
      codePath: './src',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'ApiFunction',
      Handler: 'index.handler',
      Timeout: 30,
      MemorySize: 512,
    });
  });

  it('Bedrock用Lambda関数が作成される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    lambdaConstruct.createBedrockFunction({
      functionName: 'BedrockFunction',
      codePath: './src',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'BedrockFunction',
      Handler: 'index.handler',
      Timeout: 900, // 15分
      MemorySize: 1024,
    });

    // Bedrockアクセス権限が追加されることを確認
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Effect: 'Allow',
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            Resource: '*',
          },
        ]),
      },
    });
  });

  it('Step Functions用Lambda関数が作成される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    lambdaConstruct.createStepFunction({
      functionName: 'StepFunction',
      codePath: './src',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'StepFunction',
      Handler: 'index.handler',
      Timeout: 300, // 5分
      MemorySize: 512,
    });
  });

  it('カスタム設定でLambda関数が作成される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    lambdaConstruct.createFunction({
      functionName: 'CustomFunction',
      handler: 'custom.handler',
      codePath: './src',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      reservedConcurrency: 10,
      environment: {
        CUSTOM_VAR: 'custom-value',
      },
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'CustomFunction',
      Handler: 'custom.handler',
      Timeout: 300,
      MemorySize: 1024,
      Environment: {
        Variables: {
          NODE_ENV: 'production',
          DATABASE_SECRET_ARN: { Ref: Match.anyValue() },
          APP_REGION: 'ap-northeast-1',
          LOG_LEVEL: 'info',
          CUSTOM_VAR: 'custom-value',
        },
      },
    });
  });

  it('VPC設定が正しく適用される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    lambdaConstruct.createFunction({
      functionName: 'VpcFunction',
      handler: 'index.handler',
      codePath: './src',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      VpcConfig: {
        SecurityGroupIds: Match.anyValue(),
        SubnetIds: Match.anyValue(),
      },
    });
  });

  it('環境変数が正しく設定される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    lambdaConstruct.createFunction({
      functionName: 'EnvFunction',
      handler: 'index.handler',
      codePath: './src',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          NODE_ENV: 'production',
          DATABASE_SECRET_ARN: { Ref: Match.anyValue() },
          APP_REGION: 'ap-northeast-1',
          LOG_LEVEL: 'info',
        },
      },
    });
  });

  it('タグが正しく適用される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    lambdaConstruct.createFunction({
      functionName: 'TaggedFunction',
      handler: 'index.handler',
      codePath: './src',
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
      Tags: [
        {
          Key: 'Environment',
          Value: 'test',
        },
        {
          Key: 'Project',
          Value: 'GoalMandala',
        },
      ],
    });
  });

  it('全ての関数を取得できる', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    const func1 = lambdaConstruct.createFunction({
      functionName: 'Function1',
      handler: 'index.handler',
      codePath: './src',
    });

    const func2 = lambdaConstruct.createFunction({
      functionName: 'Function2',
      handler: 'index.handler',
      codePath: './src',
    });

    const allFunctions = lambdaConstruct.getAllFunctions();
    expect(allFunctions).toHaveLength(2);
    expect(allFunctions).toContain(func1);
    expect(allFunctions).toContain(func2);
  });

  it('存在しない関数名でundefinedが返される', () => {
    const lambdaConstruct = new LambdaConstruct(stack, 'Lambda', {
      vpc,
      securityGroup,
      databaseSecret,
      config,
    });

    expect(lambdaConstruct.getFunction('NonExistentFunction')).toBeUndefined();
  });
});
