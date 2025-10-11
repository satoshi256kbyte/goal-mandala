import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';

/**
 * AI生成処理の非同期ワークフロー定義
 *
 * このワークフローは以下の処理を実行します：
 * 1. 処理状態を「PROCESSING」に更新
 * 2. AI生成処理を実行（タイムアウト: 5分）
 * 3. 処理状態を「COMPLETED」に更新
 * 4. エラー時は「FAILED」または「TIMEOUT」に更新
 */
export interface AIGenerationWorkflowProps {
  /**
   * 処理状態更新Lambda関数ARN
   */
  updateProcessingStateFunctionArn: string;

  /**
   * AI生成Worker Lambda関数ARN
   */
  aiGenerationWorkerFunctionArn: string;

  /**
   * 環境プレフィックス
   */
  stackPrefix: string;
}

/**
 * AI生成ワークフローを構築
 */
export class AIGenerationWorkflow extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: AIGenerationWorkflowProps) {
    super(scope, id);

    // Step Functions用のIAMロールを作成（循環依存を避けるため）
    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      roleName: `${props.stackPrefix}-step-functions-role`,
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

    // 処理状態を「PROCESSING」に更新
    const updateStatusToProcessing = new tasks.LambdaInvoke(this, 'UpdateStatusToProcessing', {
      lambdaFunction: lambda.Function.fromFunctionArn(
        this,
        'UpdateProcessingStateFunction',
        props.updateProcessingStateFunctionArn
      ),
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
      lambdaFunction: lambda.Function.fromFunctionArn(
        this,
        'AIGenerationWorkerFunction',
        props.aiGenerationWorkerFunctionArn
      ),
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
      lambdaFunction: lambda.Function.fromFunctionArn(
        this,
        'UpdateProcessingStateFunctionCompleted',
        props.updateProcessingStateFunctionArn
      ),
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
      lambdaFunction: lambda.Function.fromFunctionArn(
        this,
        'UpdateProcessingStateFunctionTimeout',
        props.updateProcessingStateFunctionArn
      ),
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
      lambdaFunction: lambda.Function.fromFunctionArn(
        this,
        'UpdateProcessingStateFunctionError',
        props.updateProcessingStateFunctionArn
      ),
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
    });
  }
}
