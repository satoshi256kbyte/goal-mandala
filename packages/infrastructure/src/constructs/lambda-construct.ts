import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface LambdaConstructProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  databaseSecret: secretsmanager.ISecret;
  config: EnvironmentConfig;
  userPool?: cognito.IUserPool;
  userPoolClient?: cognito.IUserPoolClient;
  cognitoLambdaRole?: iam.IRole;
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
  public readonly alarmTopic?: sns.Topic;
  private readonly props: LambdaConstructProps;

  constructor(scope: Construct, id: string, props: LambdaConstructProps) {
    super(scope, id);

    this.props = props;
    const { databaseSecret, config, cognitoLambdaRole } = props;

    // Lambda実行ロール（Cognitoロールが提供されている場合はそれを使用、そうでなければ新規作成）
    if (cognitoLambdaRole) {
      // CognitoStackから提供されたロールを使用
      this.executionRole = cognitoLambdaRole as iam.Role;

      // データベースアクセス権限を追加
      this.executionRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          resources: [databaseSecret.secretArn],
        })
      );
    } else {
      // 新規ロール作成（Cognitoが利用できない場合のフォールバック）
      this.executionRole = new iam.Role(this, 'LambdaExecutionRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        description: 'Execution role for Lambda functions',
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaVPCAccessExecutionRole'
          ),
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
    }

    // アラーム通知用のSNSトピックを作成（本番環境のみ）
    if (config.environment === 'prod' || config.environment === 'stg') {
      this.alarmTopic = new sns.Topic(this, 'LambdaAlarmTopic', {
        topicName: `${config.stackPrefix}-lambda-alarms`,
        displayName: 'Lambda Function Alarms',
      });

      // タグ設定
      if (config.tags) {
        Object.entries(config.tags).forEach(([key, value]) => {
          cdk.Tags.of(this.alarmTopic).add(key, value);
        });
      }

      // 出力
      new cdk.CfnOutput(this, 'AlarmTopicArn', {
        value: this.alarmTopic.topicArn,
        description: 'SNS Topic ARN for Lambda alarms',
        exportName: `${config.stackPrefix}-lambda-alarm-topic-arn`,
      });
    }

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
    // Bedrock固有の環境変数を追加
    const bedrockEnvironment = {
      ...functionConfig.environment,
      BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
      BEDROCK_REGION: this.props.config.region,
      BEDROCK_MAX_RETRIES: '3',
      BEDROCK_TIMEOUT_MS: '300000', // 5分
    };

    const bedrockConfig: LambdaFunctionConfig = {
      ...functionConfig,
      handler: functionConfig.handler || 'index.handler',
      timeout: functionConfig.timeout || cdk.Duration.minutes(15), // AI処理は時間がかかる
      memorySize: functionConfig.memorySize || 1024, // AI処理はメモリを多く使用
      environment: bedrockEnvironment,
    };

    const bedrockFunction = this.createFunction(bedrockConfig);

    // Bedrock アクセス権限を追加
    bedrockFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.props.config.region}::foundation-model/amazon.nova-micro-v1:0`,
        ],
      })
    );

    // CloudWatch Metricsへの書き込み権限を追加
    bedrockFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
      })
    );

    // CloudWatchアラームを作成
    this.createBedrockAlarms(bedrockFunction, functionConfig.functionName);

    return bedrockFunction;
  }

  /**
   * Bedrock Lambda関数用のCloudWatchアラームを作成する
   */
  private createBedrockAlarms(lambdaFunction: lambda.Function, functionName: string): void {
    // エラー率アラーム
    const errorAlarm = new cloudwatch.Alarm(this, `${functionName}ErrorAlarm`, {
      alarmName: `${functionName}-error-rate`,
      alarmDescription: `${functionName} のエラー率が閾値を超えました`,
      metric: lambdaFunction.metricErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5, // 5分間で5回以上のエラー
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // レスポンス時間アラーム
    const durationAlarm = new cloudwatch.Alarm(this, `${functionName}DurationAlarm`, {
      alarmName: `${functionName}-duration`,
      alarmDescription: `${functionName} の処理時間が閾値を超えました`,
      metric: lambdaFunction.metricDuration({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 60000, // 60秒
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // スロットリングアラーム
    const throttleAlarm = new cloudwatch.Alarm(this, `${functionName}ThrottleAlarm`, {
      alarmName: `${functionName}-throttle`,
      alarmDescription: `${functionName} がスロットリングされました`,
      metric: lambdaFunction.metricThrottles({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1, // 1回でもスロットリングされたらアラート
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // 同時実行数アラーム（カスタムメトリクスを使用）
    const concurrentExecutionsAlarm = new cloudwatch.Alarm(
      this,
      `${functionName}ConcurrentExecutionsAlarm`,
      {
        alarmName: `${functionName}-concurrent-executions`,
        alarmDescription: `${functionName} の同時実行数が閾値を超えました`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'ConcurrentExecutions',
          dimensionsMap: {
            FunctionName: lambdaFunction.functionName,
          },
          statistic: 'Maximum',
          period: cdk.Duration.minutes(1),
        }),
        threshold: 8, // 同時実行数の80%（予約済み同時実行数10の場合）
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }
    );

    // SNSトピックが存在する場合、アラームアクションを追加
    if (this.alarmTopic) {
      const snsAction = new cloudwatchActions.SnsAction(this.alarmTopic);
      errorAlarm.addAlarmAction(snsAction);
      durationAlarm.addAlarmAction(snsAction);
      throttleAlarm.addAlarmAction(snsAction);
      concurrentExecutionsAlarm.addAlarmAction(snsAction);
    }

    // タグ設定
    if (this.props.config.tags) {
      Object.entries(this.props.config.tags).forEach(([key, value]) => {
        cdk.Tags.of(errorAlarm).add(key, value);
        cdk.Tags.of(durationAlarm).add(key, value);
        cdk.Tags.of(throttleAlarm).add(key, value);
        cdk.Tags.of(concurrentExecutionsAlarm).add(key, value);
      });
    }
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
    const commonEnv: Record<string, string> = {
      NODE_ENV: 'production',
      DATABASE_SECRET_ARN: this.props.databaseSecret.secretArn,
      APP_REGION: this.props.config.region, // AWS_REGIONは予約語のため変更
      LOG_LEVEL: 'info',
    };

    // Cognitoリソースが利用可能な場合は環境変数に追加
    if (this.props.userPool) {
      commonEnv.COGNITO_USER_POOL_ID = this.props.userPool.userPoolId;
    }

    if (this.props.userPoolClient) {
      commonEnv.COGNITO_USER_POOL_CLIENT_ID = this.props.userPoolClient.userPoolClientId;
    }

    return commonEnv;
  }
}
