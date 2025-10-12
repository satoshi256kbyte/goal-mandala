import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';
import { LambdaConstruct } from '../constructs/lambda-construct';
import { EnvironmentConfig } from '../config/environment';

export interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecret: secretsmanager.ISecret;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  cognitoLambdaRole: iam.IRole;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly lambdaConstruct: LambdaConstruct;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      config,
      vpc,
      lambdaSecurityGroup,
      databaseSecret,
      userPool,
      userPoolClient,
      cognitoLambdaRole,
    } = props;

    // Lambda コンストラクト作成
    this.lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct', {
      vpc,
      securityGroup: lambdaSecurityGroup,
      databaseSecret,
      config,
      userPool,
      userPoolClient,
      cognitoLambdaRole,
    });

    // API Gateway アクセスログ用 CloudWatch Logs グループ
    const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: `/aws/apigateway/${config.stackPrefix}-api`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito Authorizer作成
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `${config.stackPrefix}-cognito-authorizer`,
      identitySource: 'method.request.header.Authorization',
    });

    // API Gateway 作成
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${config.stackPrefix}-api`,
      description: 'Goal Mandala API',

      // CORS設定
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // 本番環境では特定のドメインに制限
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
        allowCredentials: true,
      },

      // API Gateway の設定
      deployOptions: {
        stageName: 'v1',
        description: `API deployment for ${config.stackPrefix}`,

        // アクセスログ設定
        accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),

        // スロットリング設定
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,

        // キャッシュ設定（開発環境では無効）
        cachingEnabled: false,

        // メトリクス設定
        metricsEnabled: true,
        dataTraceEnabled: config.monitoring?.enableDetailedMonitoring ?? false,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },

      // エンドポイント設定
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },

      // バイナリメディアタイプ
      binaryMediaTypes: ['image/*', 'application/pdf'],
    });

    // Lambda 関数作成
    this.createLambdaFunctions(config);

    // CloudWatchアラーム設定
    this.setupCloudWatchAlarms(config);

    // API エンドポイント設定
    this.setupApiEndpoints(config, cognitoAuthorizer);

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.api).add(key, value);
        cdk.Tags.of(apiLogGroup).add(key, value);
      });
    }

    // 出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `${config.stackPrefix}-api-url`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: `${config.stackPrefix}-api-id`,
    });

    // Cognito統合情報の出力
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID used by API',
      exportName: `${config.stackPrefix}-api-cognito-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID used by API',
      exportName: `${config.stackPrefix}-api-cognito-user-pool-client-id`,
    });

    new cdk.CfnOutput(this, 'CognitoAuthorizerName', {
      value: cognitoAuthorizer.authorizerId,
      description: 'Cognito Authorizer ID',
      exportName: `${config.stackPrefix}-api-cognito-authorizer-id`,
    });
  }

  /**
   * CloudWatchアラームを設定する
   */
  private setupCloudWatchAlarms(config: EnvironmentConfig): void {
    // アラーム通知用のSNSトピックを取得
    const alarmTopic = this.lambdaConstruct.alarmTopic;
    if (!alarmTopic) {
      console.warn('Alarm topic not found, skipping alarm setup');
      return;
    }

    // 非同期処理開始Lambda関数のアラーム
    const asyncProcessingFunction = this.lambdaConstruct.getFunction(
      `${config.stackPrefix}-async-processing`
    );
    if (asyncProcessingFunction) {
      // エラー率アラーム
      const asyncErrorAlarm = asyncProcessingFunction
        .metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
        .createAlarm(this, 'AsyncProcessingErrorAlarm', {
          alarmName: `${config.stackPrefix}-async-processing-error-rate`,
          alarmDescription: '非同期処理開始のエラー率が閾値を超えました',
          threshold: 5, // 5分間で5回以上のエラー
          evaluationPeriods: 2,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

      asyncErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
    }

    // AI生成Worker Lambda関数のアラーム
    const aiGenerationWorkerFunction = this.lambdaConstruct.getFunction(
      `${config.stackPrefix}-ai-generation-worker`
    );
    if (aiGenerationWorkerFunction) {
      // タイムアウト率アラーム（処理時間が4分を超える）
      const workerDurationAlarm = aiGenerationWorkerFunction
        .metricDuration({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        })
        .createAlarm(this, 'AIGenerationWorkerDurationAlarm', {
          alarmName: `${config.stackPrefix}-ai-generation-worker-duration`,
          alarmDescription: 'AI生成処理の処理時間が閾値を超えました',
          threshold: 240000, // 4分（ミリ秒）
          evaluationPeriods: 2,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

      workerDurationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

      // エラー率アラーム
      const workerErrorAlarm = aiGenerationWorkerFunction
        .metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
        .createAlarm(this, 'AIGenerationWorkerErrorAlarm', {
          alarmName: `${config.stackPrefix}-ai-generation-worker-error-rate`,
          alarmDescription: 'AI生成処理のエラー率が閾値を超えました',
          threshold: 3, // 5分間で3回以上のエラー
          evaluationPeriods: 2,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

      workerErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
    }

    // 待機中処理数アラーム（カスタムメトリクス）
    const queueDepthMetric = new cloudwatch.Metric({
      namespace: 'GoalMandala/AsyncProcessing',
      metricName: 'QueueDepth',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const queueDepthAlarm = queueDepthMetric.createAlarm(this, 'QueueDepthAlarm', {
      alarmName: `${config.stackPrefix}-queue-depth`,
      alarmDescription: '待機中の処理数が閾値を超えました',
      threshold: 100, // 100件以上の待機中処理
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    queueDepthAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

    // プロフィール管理Lambda関数のアラーム
    const profileFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-profile`);
    if (profileFunction) {
      // エラー率アラーム（5%閾値）
      const profileErrorAlarm = profileFunction
        .metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        })
        .createAlarm(this, 'ProfileErrorAlarm', {
          alarmName: `${config.stackPrefix}-profile-error-rate`,
          alarmDescription: 'プロフィール管理APIのエラー率が5%を超えました',
          threshold: 5, // 5分間で5回以上のエラー（約5%）
          evaluationPeriods: 2,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

      profileErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));

      // 処理時間アラーム（2秒閾値）
      const profileDurationAlarm = profileFunction
        .metricDuration({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        })
        .createAlarm(this, 'ProfileDurationAlarm', {
          alarmName: `${config.stackPrefix}-profile-duration`,
          alarmDescription: 'プロフィール管理APIの処理時間が2秒を超えました',
          threshold: 2000, // 2秒（ミリ秒）
          evaluationPeriods: 2,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

      profileDurationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(alarmTopic));
    }
  }

  /**
   * Lambda 関数を作成する
   */
  private createLambdaFunctions(config: EnvironmentConfig): void {
    // 認証関連 Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-auth`,
      codePath: '../backend/dist', // バックエンドのビルド成果物
      description: 'Authentication and authorization handler',
      environment: {
        FUNCTION_TYPE: 'auth',
      },
    });

    // 目標管理 Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-goals`,
      codePath: '../backend/dist',
      description: 'Goals management handler',
      environment: {
        FUNCTION_TYPE: 'goals',
      },
    });

    // タスク管理 Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-tasks`,
      codePath: '../backend/dist',
      description: 'Tasks management handler',
      environment: {
        FUNCTION_TYPE: 'tasks',
      },
    });

    // サブ目標生成 Lambda 関数（Bedrock統合）
    this.lambdaConstruct.createBedrockFunction({
      functionName: `${config.stackPrefix}-subgoal-generation`,
      codePath: '../backend/dist',
      description: 'Subgoal generation API with Amazon Bedrock',
      handler: 'handlers/subgoal-generation.handler',
      timeout: cdk.Duration.seconds(60), // サブ目標生成は比較的高速
      memorySize: 1024,
      reservedConcurrency: 10, // 同時実行数制限
      environment: {
        FUNCTION_TYPE: 'subgoal-generation',
        BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
        BEDROCK_REGION: config.region,
        LOG_LEVEL: 'INFO',
      },
    });

    // アクション生成 Lambda 関数（Bedrock統合）
    this.lambdaConstruct.createBedrockFunction({
      functionName: `${config.stackPrefix}-action-generation`,
      codePath: '../backend/dist',
      description: 'Action generation API with Amazon Bedrock',
      handler: 'handlers/action-generation.handler',
      timeout: cdk.Duration.seconds(60), // アクション生成は60秒以内
      memorySize: 1024,
      reservedConcurrency: 10, // 同時実行数制限
      environment: {
        FUNCTION_TYPE: 'action-generation',
        BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
        BEDROCK_REGION: config.region,
        LOG_LEVEL: 'INFO',
      },
    });

    // タスク生成 Lambda 関数（Bedrock統合）
    this.lambdaConstruct.createBedrockFunction({
      functionName: `${config.stackPrefix}-task-generation`,
      codePath: '../backend/dist',
      description: 'Task generation API with Amazon Bedrock',
      handler: 'handlers/task-generation.handler',
      timeout: cdk.Duration.seconds(60), // タスク生成は60秒以内
      memorySize: 1024,
      reservedConcurrency: 10, // 同時実行数制限
      environment: {
        FUNCTION_TYPE: 'task-generation',
        BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
        BEDROCK_REGION: config.region,
        LOG_LEVEL: 'INFO',
      },
    });

    // AI処理 Lambda 関数（Bedrock統合）- 将来の拡張用
    this.lambdaConstruct.createBedrockFunction({
      functionName: `${config.stackPrefix}-ai-processor`,
      codePath: '../backend/dist',
      description: 'AI processing with Amazon Bedrock',
      timeout: cdk.Duration.minutes(15), // AI処理は時間がかかる
      memorySize: 1024,
      environment: {
        FUNCTION_TYPE: 'ai',
      },
    });

    // 非同期処理開始 Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-async-processing`,
      codePath: '../backend/dist',
      description: 'Async processing handler',
      handler: 'handlers/async-processing.handler',
      timeout: cdk.Duration.seconds(30), // 即座に返却するため短い
      memorySize: 512,
      reservedConcurrency: 50, // 同時実行数制限
      environment: {
        FUNCTION_TYPE: 'async-processing',
        LOG_LEVEL: 'INFO',
      },
    });

    // 処理状態確認 Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-status-check`,
      codePath: '../backend/dist',
      description: 'Processing status check handler',
      handler: 'handlers/status-check.handler',
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      reservedConcurrency: 100, // 頻繁にアクセスされる
      environment: {
        FUNCTION_TYPE: 'status-check',
        LOG_LEVEL: 'INFO',
      },
    });

    // 処理再試行 Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-retry`,
      codePath: '../backend/dist',
      description: 'Processing retry handler',
      handler: 'handlers/retry.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrency: 20,
      environment: {
        FUNCTION_TYPE: 'retry',
        LOG_LEVEL: 'INFO',
      },
    });

    // 処理キャンセル Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-cancel`,
      codePath: '../backend/dist',
      description: 'Processing cancel handler',
      handler: 'handlers/cancel.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrency: 20,
      environment: {
        FUNCTION_TYPE: 'cancel',
        LOG_LEVEL: 'INFO',
      },
    });

    // AI生成Worker Lambda 関数（Step Functions用）
    this.lambdaConstruct.createBedrockFunction({
      functionName: `${config.stackPrefix}-ai-generation-worker`,
      codePath: '../backend/dist',
      description: 'AI generation worker for Step Functions',
      handler: 'handlers/ai-generation-worker.handler',
      timeout: cdk.Duration.minutes(5), // 5分
      memorySize: 1024,
      reservedConcurrency: 10, // 同時実行数制限
      environment: {
        FUNCTION_TYPE: 'ai-generation-worker',
        BEDROCK_MODEL_ID: 'amazon.nova-micro-v1:0',
        BEDROCK_REGION: config.region,
        LOG_LEVEL: 'INFO',
      },
    });

    // 処理状態更新 Lambda 関数（Step Functions用）
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-update-processing-state`,
      codePath: '../backend/dist',
      description: 'Processing state update handler for Step Functions',
      handler: 'handlers/update-processing-state.handler',
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        FUNCTION_TYPE: 'update-processing-state',
        LOG_LEVEL: 'INFO',
      },
    });

    // プロフィール管理 Lambda 関数
    this.lambdaConstruct.createApiFunction({
      functionName: `${config.stackPrefix}-profile`,
      codePath: '../backend/dist',
      description: 'Profile management API handler',
      handler: 'handlers/profile.handler',
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      reservedConcurrency: 10, // 同時実行数制限
      environment: {
        FUNCTION_TYPE: 'profile',
        LOG_LEVEL: 'INFO',
      },
    });
  }

  /**
   * API エンドポイントを設定する
   */
  private setupApiEndpoints(
    config: EnvironmentConfig,
    cognitoAuthorizer: apigateway.CognitoUserPoolsAuthorizer
  ): void {
    // 認証エンドポイント
    const authResource = this.api.root.addResource('auth');
    const authFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-auth`);
    if (authFunction) {
      authResource.addMethod('POST', new apigateway.LambdaIntegration(authFunction), {
        authorizationType: apigateway.AuthorizationType.NONE,
      });
    }

    // 目標管理エンドポイント（認証必須）
    const goalsResource = this.api.root.addResource('goals');
    const goalsFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-goals`);
    if (goalsFunction) {
      // 目標一覧取得・作成
      goalsResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      goalsResource.addMethod('POST', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });

      // 個別目標操作
      const goalResource = goalsResource.addResource('{goalId}');
      goalResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      goalResource.addMethod('PUT', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      goalResource.addMethod('DELETE', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });

      // サブ目標操作
      const subGoalsResource = goalResource.addResource('subgoals');
      subGoalsResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      subGoalsResource.addMethod('POST', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });

      const subGoalResource = subGoalsResource.addResource('{subGoalId}');
      subGoalResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      subGoalResource.addMethod('PUT', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      subGoalResource.addMethod('DELETE', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });

      // アクション操作
      const actionsResource = subGoalResource.addResource('actions');
      actionsResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      actionsResource.addMethod('POST', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });

      const actionResource = actionsResource.addResource('{actionId}');
      actionResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      actionResource.addMethod('PUT', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      actionResource.addMethod('DELETE', new apigateway.LambdaIntegration(goalsFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    }

    // タスク管理エンドポイント（認証必須）
    const tasksResource = this.api.root.addResource('tasks');
    const tasksFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-tasks`);
    if (tasksFunction) {
      // タスク一覧取得・作成
      tasksResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      tasksResource.addMethod('POST', new apigateway.LambdaIntegration(tasksFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });

      // 個別タスク操作
      const taskResource = tasksResource.addResource('{taskId}');
      taskResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      taskResource.addMethod('PUT', new apigateway.LambdaIntegration(tasksFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
      taskResource.addMethod('DELETE', new apigateway.LambdaIntegration(tasksFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });

      // タスク状態更新
      const taskStatusResource = taskResource.addResource('status');
      taskStatusResource.addMethod('PUT', new apigateway.LambdaIntegration(tasksFunction), {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      });
    }

    // AI処理エンドポイント（認証必須）
    // /api/ai/generate/* の構造に変更
    const apiResource = this.api.root.addResource('api');
    const aiResource = apiResource.addResource('ai');
    const generateResource = aiResource.addResource('generate');

    // サブ目標生成Lambda関数
    const subgoalGenerationFunction = this.lambdaConstruct.getFunction(
      `${config.stackPrefix}-subgoal-generation`
    );
    if (subgoalGenerationFunction) {
      const subgoalsResource = generateResource.addResource('subgoals');
      subgoalsResource.addMethod(
        'POST',
        new apigateway.LambdaIntegration(subgoalGenerationFunction, {
          timeout: cdk.Duration.seconds(60),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // アクション生成Lambda関数
    const actionGenerationFunction = this.lambdaConstruct.getFunction(
      `${config.stackPrefix}-action-generation`
    );
    if (actionGenerationFunction) {
      const actionsResource = generateResource.addResource('actions');
      actionsResource.addMethod(
        'POST',
        new apigateway.LambdaIntegration(actionGenerationFunction, {
          timeout: cdk.Duration.seconds(60),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // タスク生成Lambda関数
    const taskGenerationFunction = this.lambdaConstruct.getFunction(
      `${config.stackPrefix}-task-generation`
    );
    if (taskGenerationFunction) {
      const tasksResource = generateResource.addResource('tasks');
      tasksResource.addMethod(
        'POST',
        new apigateway.LambdaIntegration(taskGenerationFunction, {
          timeout: cdk.Duration.seconds(60),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // 非同期処理エンドポイント（認証必須）
    const asyncResource = aiResource.addResource('async');

    // 非同期処理開始
    const asyncProcessingFunction = this.lambdaConstruct.getFunction(
      `${config.stackPrefix}-async-processing`
    );
    if (asyncProcessingFunction) {
      const asyncGenerateResource = asyncResource.addResource('generate');
      asyncGenerateResource.addMethod(
        'POST',
        new apigateway.LambdaIntegration(asyncProcessingFunction, {
          timeout: cdk.Duration.seconds(30),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // 処理状態確認
    const statusCheckFunction = this.lambdaConstruct.getFunction(
      `${config.stackPrefix}-status-check`
    );
    if (statusCheckFunction) {
      const statusResource = asyncResource.addResource('status');
      const processIdResource = statusResource.addResource('{processId}');
      processIdResource.addMethod(
        'GET',
        new apigateway.LambdaIntegration(statusCheckFunction, {
          timeout: cdk.Duration.seconds(10),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // 処理再試行
    const retryFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-retry`);
    if (retryFunction) {
      const retryResource = asyncResource.addResource('retry');
      const retryProcessIdResource = retryResource.addResource('{processId}');
      retryProcessIdResource.addMethod(
        'POST',
        new apigateway.LambdaIntegration(retryFunction, {
          timeout: cdk.Duration.seconds(30),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // 処理キャンセル
    const cancelFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-cancel`);
    if (cancelFunction) {
      const cancelResource = asyncResource.addResource('cancel');
      const cancelProcessIdResource = cancelResource.addResource('{processId}');
      cancelProcessIdResource.addMethod(
        'POST',
        new apigateway.LambdaIntegration(cancelFunction, {
          timeout: cdk.Duration.seconds(30),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // プロフィール管理エンドポイント（認証必須）
    const profileFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-profile`);
    if (profileFunction) {
      const profileResource = apiResource.addResource('profile');

      // GET /api/profile - プロフィール取得
      profileResource.addMethod(
        'GET',
        new apigateway.LambdaIntegration(profileFunction, {
          timeout: cdk.Duration.seconds(10),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );

      // PUT /api/profile - プロフィール更新
      profileResource.addMethod(
        'PUT',
        new apigateway.LambdaIntegration(profileFunction, {
          timeout: cdk.Duration.seconds(10),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );

      // DELETE /api/profile - プロフィール削除
      profileResource.addMethod(
        'DELETE',
        new apigateway.LambdaIntegration(profileFunction, {
          timeout: cdk.Duration.seconds(10),
        }),
        {
          authorizer: cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }

    // ヘルスチェックエンドポイント
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod(
      'GET',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': JSON.stringify({
                status: 'healthy',
                timestamp: '$context.requestTime',
                version: '1.0.0',
              }),
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseModels: {
              'application/json': apigateway.Model.EMPTY_MODEL,
            },
          },
        ],
      }
    );
  }
}
