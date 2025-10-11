/**
 * AIGenerationWorker
 * Step Functionsから呼び出されるAI生成処理のワーカー
 * 実際のAI生成処理を実行し、進捗を更新する
 */

import { ProcessingStateService } from '../services/processing-state.service.js';
import { SubGoalGenerationService } from '../services/subgoal-generation.service.js';
import { ActionGenerationService } from '../services/action-generation.service.js';
import { TaskGenerationService } from '../services/task-generation.service.js';
import { ContextService } from '../services/context.service.js';
import { BedrockService } from '../services/bedrock.service.js';
import { ActionQualityValidator } from '../services/action-quality-validator.service.js';
import { ActionTypeClassifier } from '../services/action-type-classifier.service.js';
import { ActionDatabaseService } from '../services/action-database.service.js';
import { TaskQualityValidator } from '../services/task-quality-validator.service.js';
import { TaskDatabaseService } from '../services/task-database.service.js';
import { ProcessingType, ProcessingStatus } from '../generated/prisma-client/index.js';
import {
  StepFunctionsExecutionInput,
  StepFunctionsExecutionResult,
  ProcessingError,
  SubGoalGenerationParams,
  ActionGenerationParams,
  TaskGenerationParams,
} from '../types/async-processing.types.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

/**
 * AIGenerationWorkerハンドラー
 * @param event Step Functionsからの入力
 * @returns 処理結果
 */
export const handler = async (
  event: StepFunctionsExecutionInput
): Promise<StepFunctionsExecutionResult> => {
  const { processId, userId, type, params } = event;

  logger.info('AIGenerationWorker開始', {
    processId,
    userId,
    type,
    action: 'ai_generation_worker_start',
  });

  const processingStateService = new ProcessingStateService();

  try {
    // 処理タイプ別にルーティング
    const result = await routeByProcessingType(
      processId,
      userId,
      type,
      params,
      processingStateService
    );

    logger.info('AIGenerationWorker完了', {
      processId,
      userId,
      type,
      action: 'ai_generation_worker_completed',
    });

    return {
      processId,
      status: 'COMPLETED' as ProcessingStatus,
      result,
    };
  } catch (error) {
    logger.error('AIGenerationWorkerエラー', {
      processId,
      userId,
      type,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      action: 'ai_generation_worker_error',
    });

    // エラー情報を構築
    const processingError: ProcessingError = {
      code: getErrorCode(error),
      message: getErrorMessage(error),
      retryable: isRetryableError(error),
      details: error instanceof Error ? { stack: error.stack } : undefined,
    };

    // 処理状態をFAILEDに更新
    await processingStateService.updateProcessingError(processId, processingError);

    return {
      processId,
      status: 'FAILED' as ProcessingStatus,
      error: processingError,
    };
  }
};

/**
 * 処理タイプ別にルーティング
 */
async function routeByProcessingType(
  processId: string,
  userId: string,
  type: ProcessingType,
  params: unknown,
  processingStateService: ProcessingStateService
): Promise<unknown> {
  switch (type) {
    case ProcessingType.SUBGOAL_GENERATION:
      return await executeSubGoalGeneration(
        processId,
        userId,
        params as SubGoalGenerationParams,
        processingStateService
      );

    case ProcessingType.ACTION_GENERATION:
      return await executeActionGeneration(
        processId,
        userId,
        params as ActionGenerationParams,
        processingStateService
      );

    case ProcessingType.TASK_GENERATION:
      return await executeTaskGeneration(
        processId,
        userId,
        params as TaskGenerationParams,
        processingStateService
      );

    default:
      throw new Error(`未対応の処理タイプ: ${type}`);
  }
}

/**
 * サブ目標生成処理を実行
 */
async function executeSubGoalGeneration(
  processId: string,
  userId: string,
  params: SubGoalGenerationParams,
  processingStateService: ProcessingStateService
): Promise<unknown> {
  logger.info('サブ目標生成処理開始', {
    processId,
    userId,
    action: 'subgoal_generation_start',
  });

  // 進捗0%に設定
  await processingStateService.updateProcessingProgress(processId, 0);

  // サブ目標生成サービスを初期化
  const subGoalGenerationService = new SubGoalGenerationService();

  // AI生成実行
  const result = await subGoalGenerationService.generateAndSaveSubGoals(userId, params, processId);

  // 進捗50%に更新（AI生成完了）
  await processingStateService.updateProcessingProgress(processId, 50);

  logger.info('サブ目標AI生成完了', {
    processId,
    userId,
    subGoalCount: result.subGoals.length,
    action: 'subgoal_ai_generation_completed',
  });

  // 進捗100%に更新（データベース保存完了）
  await processingStateService.updateProcessingProgress(processId, 100);

  logger.info('サブ目標生成処理完了', {
    processId,
    userId,
    action: 'subgoal_generation_completed',
  });

  return result;
}

/**
 * アクション生成処理を実行
 */
async function executeActionGeneration(
  processId: string,
  userId: string,
  params: ActionGenerationParams,
  processingStateService: ProcessingStateService
): Promise<unknown> {
  logger.info('アクション生成処理開始', {
    processId,
    userId,
    subGoalId: params.subGoalId,
    action: 'action_generation_start',
  });

  // 進捗0%に設定
  await processingStateService.updateProcessingProgress(processId, 0);

  // アクション生成サービスを初期化
  const contextService = new ContextService(prisma);
  const bedrockService = new BedrockService();
  const qualityValidator = new ActionQualityValidator();
  const typeClassifier = new ActionTypeClassifier();
  const databaseService = new ActionDatabaseService();

  const actionGenerationService = new ActionGenerationService(
    contextService,
    bedrockService,
    qualityValidator,
    typeClassifier,
    databaseService
  );

  // AI生成実行（regenerate=false）
  const result = await actionGenerationService.generateAndSaveActions(
    userId,
    params.subGoalId,
    false
  );

  // 進捗100%に更新
  await processingStateService.updateProcessingProgress(processId, 100);

  logger.info('アクション生成処理完了', {
    processId,
    userId,
    subGoalId: params.subGoalId,
    actionCount: result.actions.length,
    action: 'action_generation_completed',
  });

  return result;
}

/**
 * タスク生成処理を実行
 */
async function executeTaskGeneration(
  processId: string,
  userId: string,
  params: TaskGenerationParams,
  processingStateService: ProcessingStateService
): Promise<unknown> {
  logger.info('タスク生成処理開始', {
    processId,
    userId,
    actionId: params.actionId,
    action: 'task_generation_start',
  });

  // 進捗0%に設定
  await processingStateService.updateProcessingProgress(processId, 0);

  // タスク生成サービスを初期化
  const contextService = new ContextService(prisma);
  const bedrockService = new BedrockService();
  const qualityValidator = new TaskQualityValidator();
  const databaseService = new TaskDatabaseService();

  const taskGenerationService = new TaskGenerationService(
    contextService,
    bedrockService,
    qualityValidator,
    databaseService
  );

  // AI生成実行（regenerate=false）
  const result = await taskGenerationService.generateAndSaveTasks(userId, params.actionId, false);

  // 進捗100%に更新
  await processingStateService.updateProcessingProgress(processId, 100);

  logger.info('タスク生成処理完了', {
    processId,
    userId,
    actionId: params.actionId,
    taskCount: result.tasks.length,
    action: 'task_generation_completed',
  });

  return result;
}

/**
 * エラーコードを取得
 */
function getErrorCode(error: unknown): string {
  if (error instanceof Error) {
    // エラー名からコードを推測
    if (error.name === 'ValidationError') {
      return 'VALIDATION_ERROR';
    }
    if (error.message.includes('Bedrock') || error.message.includes('AI')) {
      return 'AI_ERROR';
    }
    if (error.message.includes('Database') || error.message.includes('Prisma')) {
      return 'DATABASE_ERROR';
    }
    if (error.message.includes('Timeout') || error.message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    }
  }
  return 'UNKNOWN_ERROR';
}

/**
 * エラーメッセージを取得（機密情報を含まない）
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // ユーザーフレンドリーなメッセージに変換
    const code = getErrorCode(error);
    switch (code) {
      case 'VALIDATION_ERROR':
        return '入力データの検証に失敗しました。入力内容を確認してください。';
      case 'AI_ERROR':
        return 'AI生成に失敗しました。もう一度お試しください。';
      case 'DATABASE_ERROR':
        return 'データベースエラーが発生しました。しばらくしてからお試しください。';
      case 'TIMEOUT_ERROR':
        return '処理時間が制限を超えました。もう一度お試しください。';
      default:
        return '予期しないエラーが発生しました。しばらくしてからお試しください。';
    }
  }
  return '予期しないエラーが発生しました。しばらくしてからお試しください。';
}

/**
 * リトライ可能なエラーかどうかを判定
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const code = getErrorCode(error);
    // AI_ERROR、DATABASE_ERROR、TIMEOUT_ERRORはリトライ可能
    return ['AI_ERROR', 'DATABASE_ERROR', 'TIMEOUT_ERROR'].includes(code);
  }
  return false;
}
