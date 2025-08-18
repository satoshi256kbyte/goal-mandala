import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { LambdaConstruct } from '../constructs/lambda-construct';
import { EnvironmentConfig } from '../config/environment';

export interface ApiStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecret: secretsmanager.ISecret;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly lambdaConstruct: LambdaConstruct;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config, vpc, lambdaSecurityGroup, databaseSecret } = props;

    // Lambda コンストラクト作成
    this.lambdaConstruct = new LambdaConstruct(this, 'LambdaConstruct', {
      vpc,
      securityGroup: lambdaSecurityGroup,
      databaseSecret,
      config,
    });

    // API Gateway アクセスログ用 CloudWatch Logs グループ
    const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: `/aws/apigateway/${config.stackPrefix}-api`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
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

    // API エンドポイント設定
    this.setupApiEndpoints(config);

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

    // AI処理 Lambda 関数（Bedrock統合）
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
  }

  /**
   * API エンドポイントを設定する
   */
  private setupApiEndpoints(config: EnvironmentConfig): void {
    // 認証エンドポイント
    const authResource = this.api.root.addResource('auth');
    const authFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-auth`);
    if (authFunction) {
      authResource.addMethod('POST', new apigateway.LambdaIntegration(authFunction), {
        authorizationType: apigateway.AuthorizationType.NONE,
      });
    }

    // 目標管理エンドポイント
    const goalsResource = this.api.root.addResource('goals');
    const goalsFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-goals`);
    if (goalsFunction) {
      // 目標一覧取得・作成
      goalsResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction));
      goalsResource.addMethod('POST', new apigateway.LambdaIntegration(goalsFunction));

      // 個別目標操作
      const goalResource = goalsResource.addResource('{goalId}');
      goalResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction));
      goalResource.addMethod('PUT', new apigateway.LambdaIntegration(goalsFunction));
      goalResource.addMethod('DELETE', new apigateway.LambdaIntegration(goalsFunction));

      // サブ目標操作
      const subGoalsResource = goalResource.addResource('subgoals');
      subGoalsResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction));
      subGoalsResource.addMethod('POST', new apigateway.LambdaIntegration(goalsFunction));

      const subGoalResource = subGoalsResource.addResource('{subGoalId}');
      subGoalResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction));
      subGoalResource.addMethod('PUT', new apigateway.LambdaIntegration(goalsFunction));
      subGoalResource.addMethod('DELETE', new apigateway.LambdaIntegration(goalsFunction));

      // アクション操作
      const actionsResource = subGoalResource.addResource('actions');
      actionsResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction));
      actionsResource.addMethod('POST', new apigateway.LambdaIntegration(goalsFunction));

      const actionResource = actionsResource.addResource('{actionId}');
      actionResource.addMethod('GET', new apigateway.LambdaIntegration(goalsFunction));
      actionResource.addMethod('PUT', new apigateway.LambdaIntegration(goalsFunction));
      actionResource.addMethod('DELETE', new apigateway.LambdaIntegration(goalsFunction));
    }

    // タスク管理エンドポイント
    const tasksResource = this.api.root.addResource('tasks');
    const tasksFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-tasks`);
    if (tasksFunction) {
      // タスク一覧取得・作成
      tasksResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction));
      tasksResource.addMethod('POST', new apigateway.LambdaIntegration(tasksFunction));

      // 個別タスク操作
      const taskResource = tasksResource.addResource('{taskId}');
      taskResource.addMethod('GET', new apigateway.LambdaIntegration(tasksFunction));
      taskResource.addMethod('PUT', new apigateway.LambdaIntegration(tasksFunction));
      taskResource.addMethod('DELETE', new apigateway.LambdaIntegration(tasksFunction));

      // タスク状態更新
      const taskStatusResource = taskResource.addResource('status');
      taskStatusResource.addMethod('PUT', new apigateway.LambdaIntegration(tasksFunction));
    }

    // AI処理エンドポイント
    const aiResource = this.api.root.addResource('ai');
    const aiFunction = this.lambdaConstruct.getFunction(`${config.stackPrefix}-ai-processor`);
    if (aiFunction) {
      // サブ目標生成
      const generateSubGoalsResource = aiResource.addResource('generate-subgoals');
      generateSubGoalsResource.addMethod('POST', new apigateway.LambdaIntegration(aiFunction));

      // アクション生成
      const generateActionsResource = aiResource.addResource('generate-actions');
      generateActionsResource.addMethod('POST', new apigateway.LambdaIntegration(aiFunction));

      // タスク生成
      const generateTasksResource = aiResource.addResource('generate-tasks');
      generateTasksResource.addMethod('POST', new apigateway.LambdaIntegration(aiFunction));
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
