import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../config/environment';

export interface StepFunctionsStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  updateProcessingStateFunctionArn: string;
  aiGenerationWorkerFunctionArn: string;
}

/**
 * Step Functions専用スタック
 *
 * 循環依存を避けるため、Step Functions State Machineを独立したスタックとして分離
 */
export class StepFunctionsStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: StepFunctionsStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Step Functions用のIAMロールを作成
    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      roleName: `${config.stackPrefix}-step-functions-role`,
      inlinePolicies: {
        LambdaInvokePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['lambda:InvokeFunction'],
              resources: [
                props.updateProcessingStateFunctionArn,
                props.aiGenerationWorkerFunctionArn,
              ],
            }),
          ],
        }),
      },
    });

    // Lambda関数の参照を作成（ARNから）
    const updateProcessingStateFunction = lambda.Function.fromFunctionArn(
      this,
      'UpdateProcessingStateFunction',
      props.updateProcessingStateFunctionArn
    );

    const aiGenerationWorkerFunction = lambda.Function.fromFunctionArn(
      this,
      'AIGenerationWorkerFunction',
      props.aiGenerationWorkerFunctionArn
    );

    // 処理状態を「PROCESSING」に更新
    const updateStatusToProcessing = new tasks.LambdaInvoke(this, 'UpdateStatusToProcessing', {
      lambdaFunction: updateProcessingStateFunction,
      payload: sfn.TaskInput.fromObject({
        processId: sfn.JsonPath.stringAt('$.processId'),
        status: 'PROCESSING',
        progress: 0,
      }),
      resultPath: '$.updateResult',
      outputPath: '$',
    });

    // AI生成処理を実行
    const executeAIGeneration = new tasks.LambdaInvoke(this, 'ExecuteAIGeneration', {
      lambdaFunction: aiGenerationWorkerFunction,
      payload: sfn.TaskInput.fromObject({
        processId: sfn.JsonPath.stringAt('$.processId'),
        userId: sfn.JsonPath.stringAt('$.userId'),
        type: sfn.JsonPath.stringAt('$.type'),
        params: sfn.JsonPath.objectAt('$.params'),
      }),
      taskTimeout: sfn.Timeout.duration(Duration.seconds(300)), // 5分
      heartbeatTimeout: sfn.Timeout.duration(Duration.seconds(60)), // 1分ごとにハートビート
      resultPath: '$.generationResult',
      outputPath: '$',
    });

    // 処理状態を「COMPLETED」に更新
    const updateStatusToCompleted = new tasks.LambdaInvoke(this, 'UpdateStatusToCompleted', {
      lambdaFunction: updateProcessingStateFunction,
      payload: sfn.TaskInput.fromObject({
        processId: sfn.JsonPath.stringAt('$.processId'),
        status: 'COMPLETED',
        progress: 100,
        result: sfn.JsonPath.objectAt('$.generationResult.Payload'),
      }),
      resultPath: '$.finalUpdateResult',
      outputPath: '$',
    });

    // タイムアウト処理
    const handleTimeout = new tasks.LambdaInvoke(this, 'HandleTimeout', {
      lambdaFunction: updateProcessingStateFunction,
      payload: sfn.TaskInput.fromObject({
        processId: sfn.JsonPath.stringAt('$.processId'),
        status: 'TIMEOUT',
        error: {
          code: 'TIMEOUT_ERROR',
          message: '処理時間が制限を超えました',
          timestamp: sfn.JsonPath.stringAt('$$.State.EnteredTime'),
        },
      }),
      resultPath: '$.timeoutUpdateResult',
      outputPath: '$',
    });

    // エラー処理
    const handleError = new tasks.LambdaInvoke(this, 'HandleError', {
      lambdaFunction: updateProcessingStateFunction,
      payload: sfn.TaskInput.fromObject({
        processId: sfn.JsonPath.stringAt('$.processId'),
        status: 'FAILED',
        error: {
          code: 'PROCESSING_ERROR',
          message: sfn.JsonPath.stringAt('$.error'),
          cause: sfn.JsonPath.stringAt('$.cause'),
          timestamp: sfn.JsonPath.stringAt('$$.State.EnteredTime'),
        },
      }),
      resultPath: '$.errorUpdateResult',
      outputPath: '$',
    });

    // 成功時の終了状態
    const succeed = new sfn.Succeed(this, 'ProcessingSucceeded');

    // 失敗時の終了状態
    const failed = new sfn.Fail(this, 'ProcessingFailed', {
      cause: 'AI generation processing failed',
      error: 'ProcessingError',
    });

    // タイムアウト時の終了状態
    const timeout = new sfn.Fail(this, 'ProcessingTimeout', {
      cause: 'AI generation processing timed out',
      error: 'TimeoutError',
    });

    // ワークフロー定義
    const definition = updateStatusToProcessing
      .next(executeAIGeneration)
      .next(updateStatusToCompleted)
      .next(succeed);

    // タイムアウトエラーのキャッチ
    executeAIGeneration.addCatch(handleTimeout, {
      errors: ['States.Timeout'],
      resultPath: '$.error',
    });

    // その他のエラーのキャッチ
    executeAIGeneration.addCatch(handleError, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // 処理状態更新のエラーもキャッチ
    updateStatusToProcessing.addCatch(handleError, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // エラーハンドラーの次の状態を設定
    handleTimeout.next(timeout);
    handleError.next(failed);

    // リトライ設定（一時的なエラーに対して）
    executeAIGeneration.addRetry({
      errors: [
        'ThrottlingException',
        'ServiceUnavailableException',
        'Lambda.ServiceException',
        'Lambda.TooManyRequestsException',
      ],
      interval: Duration.seconds(1),
      maxAttempts: 3,
      backoffRate: 2, // エクスポネンシャルバックオフ: 1秒 → 2秒 → 4秒
    });

    // Step Functions State Machine作成
    this.stateMachine = new sfn.StateMachine(this, 'AIGenerationStateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      stateMachineType: sfn.StateMachineType.STANDARD,
      timeout: Duration.minutes(10), // 全体のタイムアウト: 10分
      tracingEnabled: true, // X-Rayトレーシング有効化
      role: stepFunctionsRole, // カスタムIAMロールを使用
      stateMachineName: `${config.stackPrefix}-ai-generation-workflow`,
    });

    // 出力
    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      description: 'AI Generation State Machine ARN',
      exportName: `${config.stackPrefix}-state-machine-arn`,
    });

    new cdk.CfnOutput(this, 'StateMachineName', {
      value: this.stateMachine.stateMachineName,
      description: 'AI Generation State Machine Name',
      exportName: `${config.stackPrefix}-state-machine-name`,
    });

    // Lambda関数にStep Functions実行権限を付与
    const asyncProcessingFunction = lambda.Function.fromFunctionArn(
      this,
      'AsyncProcessingFunction',
      `arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:${config.stackPrefix}-async-processing`
    );

    const cancelFunction = lambda.Function.fromFunctionArn(
      this,
      'CancelFunction',
      `arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:${config.stackPrefix}-cancel`
    );

    // Step Functions実行権限を付与
    this.stateMachine.grantStartExecution(asyncProcessingFunction);
    this.stateMachine.grantExecution(
      cancelFunction,
      'states:StopExecution',
      'states:DescribeExecution'
    );

    // Lambda関数の環境変数を更新するカスタムリソース
    const updateLambdaEnvProvider = new cr.Provider(this, 'UpdateLambdaEnvProvider', {
      onEventHandler: new lambda.Function(this, 'UpdateLambdaEnvHandler', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromInline(`
          const { LambdaClient, UpdateFunctionConfigurationCommand } = require('@aws-sdk/client-lambda');
          
          exports.handler = async (event) => {
            console.log('Event:', JSON.stringify(event, null, 2));
            
            const client = new LambdaClient({ region: process.env.AWS_REGION });
            const stateMachineArn = event.ResourceProperties.StateMachineArn;
            const functionNames = event.ResourceProperties.FunctionNames;
            
            if (event.RequestType === 'Create' || event.RequestType === 'Update') {
              for (const functionName of functionNames) {
                try {
                  await client.send(new UpdateFunctionConfigurationCommand({
                    FunctionName: functionName,
                    Environment: {
                      Variables: {
                        STATE_MACHINE_ARN: stateMachineArn
                      }
                    }
                  }));
                  console.log(\`Updated environment variable for \${functionName}\`);
                } catch (error) {
                  console.error(\`Failed to update \${functionName}:\`, error);
                  throw error;
                }
              }
            }
            
            return {
              PhysicalResourceId: 'lambda-env-updater',
              Data: {
                StateMachineArn: stateMachineArn
              }
            };
          };
        `),
        timeout: Duration.minutes(5),
        initialPolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['lambda:UpdateFunctionConfiguration', 'lambda:GetFunction'],
            resources: [
              `arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:${config.stackPrefix}-async-processing`,
              `arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:${config.stackPrefix}-cancel`,
            ],
          }),
        ],
      }),
    });

    // カスタムリソースを作成
    new cdk.CustomResource(this, 'UpdateLambdaEnv', {
      serviceToken: updateLambdaEnvProvider.serviceToken,
      properties: {
        StateMachineArn: this.stateMachine.stateMachineArn,
        FunctionNames: [`${config.stackPrefix}-async-processing`, `${config.stackPrefix}-cancel`],
      },
    });
  }
}
