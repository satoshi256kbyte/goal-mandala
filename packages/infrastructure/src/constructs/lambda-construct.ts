import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface LambdaConstructProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  databaseSecret: secretsmanager.ISecret;
  config: EnvironmentConfig;
}

export interface LambdaFunctionConfig {
  functionName: string;
  handler: string;
  codePath: string;
  description?: string;
  environment?: Record<string, string>;
  timeout?: cdk.Duration;
  memorySize?: number;
  reservedConcurrency?: number;
}

export class LambdaConstruct extends Construct {
  public readonly functions: Map<string, lambda.Function> = new Map();
  public readonly executionRole: iam.Role;
  private readonly props: LambdaConstructProps;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    this.props = props;
    const { vpc, securityGroup, databaseSecret, config } = props;

    // Lambda実行ロール
    this.executionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        DatabaseAccess: new iam.PolicyDocument({
          statements: [
            // Secrets Manager アクセス権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
              resources: [databaseSecret.secretArn],
            }),
            // CloudWatch Logs 権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
              resources: [`arn:aws:logs:${config.region}:*:log-group:/aws/lambda/*`],
            }),
            // X-Ray トレーシング権限
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.executionRole).add(key, value);
      });
    }
  }

  /**
   * Lambda関数を作成する
   */
  public createFunction(functionConfig: LambdaFunctionConfig): lambda.Function {
    const {
      functionName,
      handler,
      codePath,
      description,
      environment = {},
      timeout,
      memorySize,
      reservedConcurrency,
    } = functionConfig;

    // CloudWatch Logs グループ
    const logGroup = new logs.LogGroup(this, `${functionName}LogGroup`, {
      logGroupName: `/aws/lambda/${functionName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda関数
    const lambdaFunction = new lambda.Function(this, functionName, {
      functionName,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler,
      code: lambda.Code.fromAsset(codePath),
      role: this.executionRole,
      description: description || `Lambda function: ${functionName}`,
      timeout: timeout || cdk.Duration.seconds(30),
      memorySize: memorySize || 256,
      ...(reservedConcurrency !== undefined && { reservedConcurrency }),

      // VPC設定
      vpc: this.props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [this.props.securityGroup],

      // 環境変数
      environment: {
        ...this.getCommonEnvironment(),
        ...environment,
      },

      // 監視設定
      tracing: lambda.Tracing.ACTIVE,

      // ログ設定
      logGroup,

      // デッドレターキュー設定（必要に応じて）
      deadLetterQueueEnabled: false,

      // 再試行設定
      retryAttempts: 0,
    });

    // 関数をマップに追加
    this.functions.set(functionName, lambdaFunction);

    // タグ設定
    if (this.props.config.tags) {
      Object.entries(this.props.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(lambdaFunction).add(key, value);
        cdk.Tags.of(logGroup).add(key, value);
      });
    }

    // 出力
    new cdk.CfnOutput(this, `${functionName}Arn`, {
      value: lambdaFunction.functionArn,
      description: `ARN of ${functionName} Lambda function`,
      exportName: `${this.props.config.stackPrefix}-${functionName.toLowerCase()}-arn`,
    });

    return lambdaFunction;
  }

  /**
   * API Gateway用のLambda関数を作成する
   */
  public createApiFunction(
    functionConfig: Omit<LambdaFunctionConfig, 'handler'> & {
      handler?: string;
    }
  ): lambda.Function {
    const apiConfig: LambdaFunctionConfig = {
      ...functionConfig,
      handler: functionConfig.handler || 'index.handler',
      timeout: functionConfig.timeout || cdk.Duration.seconds(30),
      memorySize: functionConfig.memorySize || 512,
    };

    return this.createFunction(apiConfig);
  }

  /**
   * Bedrock AI用のLambda関数を作成する
   */
  public createBedrockFunction(
    functionConfig: Omit<LambdaFunctionConfig, 'handler'> & {
      handler?: string;
    }
  ): lambda.Function {
    const bedrockConfig: LambdaFunctionConfig = {
      ...functionConfig,
      handler: functionConfig.handler || 'index.handler',
      timeout: functionConfig.timeout || cdk.Duration.minutes(15), // AI処理は時間がかかる
      memorySize: functionConfig.memorySize || 1024, // AI処理はメモリを多く使用
    };

    const bedrockFunction = this.createFunction(bedrockConfig);

    // Bedrock アクセス権限を追加
    bedrockFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'], // 必要に応じて特定のモデルARNに制限
      })
    );

    return bedrockFunction;
  }

  /**
   * Step Functions用のLambda関数を作成する
   */
  public createStepFunction(
    functionConfig: Omit<LambdaFunctionConfig, 'handler'> & {
      handler?: string;
    }
  ): lambda.Function {
    const stepConfig: LambdaFunctionConfig = {
      ...functionConfig,
      handler: functionConfig.handler || 'index.handler',
      timeout: functionConfig.timeout || cdk.Duration.minutes(5),
      memorySize: functionConfig.memorySize || 512,
    };

    return this.createFunction(stepConfig);
  }

  /**
   * 関数名で Lambda 関数を取得する
   */
  public getFunction(functionName: string): lambda.Function | undefined {
    return this.functions.get(functionName);
  }

  /**
   * 全ての Lambda 関数を取得する
   */
  public getAllFunctions(): lambda.Function[] {
    return Array.from(this.functions.values());
  }

  /**
   * 共通環境変数を取得する
   */
  private getCommonEnvironment(): Record<string, string> {
    return {
      NODE_ENV: 'production',
      DATABASE_SECRET_ARN: this.props.databaseSecret.secretArn,
      APP_REGION: this.props.config.region, // AWS_REGIONは予約語のため変更
      LOG_LEVEL: 'info',
    };
  }
}
