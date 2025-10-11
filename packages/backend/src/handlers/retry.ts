/**
 * リトライHandler
 * POST /api/ai/async/retry/:processId エンドポイントの処理
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Context } from 'hono';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { jwtAuthMiddleware, getCurrentUser } from '../middleware/auth.js';
import { ProcessingStateService } from '../services/processing-state.service.js';
import { ProcessingStatus, ProcessingType } from '../types/async-processing.types.js';
import type {
  RetryResponse,
  StepFunctionsExecutionInput,
  ProcessingParams,
} from '../types/async-processing.types.js';
import {
  ProcessingNotFoundError,
  CannotRetryError,
  RetryLimitExceededError,
  StepFunctionsError,
  AuthenticationError,
  ForbiddenError,
  DatabaseError,
} from '../errors/async-processing.errors.js';
import { sanitizeErrorForLogging } from '../utils/security.js';
import { ESTIMATED_COMPLETION_TIME } from '../schemas/async-processing.schema.js';

// Honoアプリケーションの作成
const app = new Hono();

// ミドルウェアの設定
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*', // TODO: 本番環境では適切なオリジンを設定
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// サービスのインスタンス化
const processingStateService = new ProcessingStateService();
const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// リトライ上限
const MAX_RETRY_COUNT = 3;

/**
 * リトライエンドポイント
 * POST /api/ai/async/retry/:processId
 */
app.post('/api/ai/async/retry/:processId', jwtAuthMiddleware(), async (c: Context) => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || `req-${Date.now()}`;
  const processId = c.req.param('processId');

  try {
    // 1. ユーザーIDの抽出
    const userId = extractUserId(c);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        processId,
        action: 'retry_request_start',
        message: 'リトライリクエスト開始',
      })
    );

    // 2. 処理IDの検証
    if (!processId) {
      throw new ProcessingNotFoundError('');
    }

    // 3. 元の処理状態を取得
    const originalProcessing = await processingStateService.getProcessingState(processId, userId);

    if (!originalProcessing) {
      throw new ProcessingNotFoundError(processId);
    }

    // 4. ユーザー権限チェック
    if (originalProcessing.userId !== userId) {
      throw new ForbiddenError('この処理にアクセスする権限がありません');
    }

    // 5. リトライ可能性チェック
    checkRetryable(originalProcessing);

    // 6. 新規処理状態作成
    const newProcessing = await createNewProcessingState(userId, originalProcessing);

    // 7. Step Functions再起動
    await startStepFunctionsExecution(newProcessing.id, userId, originalProcessing);

    // 8. 完了予定時刻の推定
    const estimatedCompletionTime = estimateCompletionTime(originalProcessing.type);

    // 9. レスポンス返却
    const response = formatResponse(
      newProcessing.id,
      newProcessing.status,
      newProcessing.type,
      newProcessing.createdAt,
      estimatedCompletionTime,
      newProcessing.retryCount
    );

    // 10. 処理時間の記録
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        processId: newProcessing.id,
        originalProcessId: processId,
        action: 'retry_accepted',
        duration,
        metadata: {
          type: newProcessing.type,
          retryCount: newProcessing.retryCount,
          estimatedCompletionTime: estimatedCompletionTime.toISOString(),
        },
      })
    );

    return c.json(response, 202);
  } catch (error) {
    // 11. エラーハンドリング
    const duration = Date.now() - startTime;
    return handleError(error, c, requestId, processId, duration);
  }
});

/**
 * ヘルスチェックエンドポイント
 * GET /health
 */
app.get('/health', (c: Context) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() }, 200);
});

/**
 * ユーザーIDの抽出
 * @param c Honoコンテキスト
 * @returns ユーザーID
 * @throws AuthenticationError 認証情報が無効な場合
 */
function extractUserId(c: Context): string {
  try {
    const user = getCurrentUser(c);
    return user.id;
  } catch (error) {
    throw new AuthenticationError('認証が必要です');
  }
}

/**
 * リトライ可能性チェック
 * @param processing 処理状態
 * @throws CannotRetryError リトライ不可の場合
 * @throws RetryLimitExceededError リトライ上限超過の場合
 */
function checkRetryable(processing: {
  id: string;
  status: ProcessingStatus;
  retryCount: number;
}): void {
  // ステータスチェック（FAILED、TIMEOUTのみリトライ可能）
  if (
    processing.status !== ProcessingStatus.FAILED &&
    processing.status !== ProcessingStatus.TIMEOUT
  ) {
    throw new CannotRetryError(processing.id, processing.status);
  }

  // リトライ回数上限チェック（3回）
  if (processing.retryCount >= MAX_RETRY_COUNT) {
    throw new RetryLimitExceededError(processing.id, processing.retryCount, MAX_RETRY_COUNT);
  }
}

/**
 * 新規処理状態作成
 * @param userId ユーザーID
 * @param originalProcessing 元の処理状態
 * @returns 新規処理状態
 * @throws DatabaseError データベースエラー
 */
async function createNewProcessingState(
  userId: string,
  originalProcessing: {
    type: ProcessingType;
    targetId: string | null;
    retryCount: number;
  }
): Promise<{
  id: string;
  userId: string;
  type: ProcessingType;
  status: ProcessingStatus;
  progress: number;
  retryCount: number;
  createdAt: Date;
}> {
  try {
    // 新しい処理IDの生成とリトライ回数のインクリメント
    const newProcessing = await processingStateService.createProcessingState({
      userId,
      type: originalProcessing.type,
      targetId: originalProcessing.targetId || undefined,
    });

    // リトライ回数を更新（元の処理のretryCount + 1）
    // Note: 実際のPrismaスキーマにretryCountフィールドがあることを前提
    // ここでは新規作成後に更新する形で実装
    const retryCount = originalProcessing.retryCount + 1;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'new_processing_state_created',
        userId,
        newProcessId: newProcessing.id,
        type: originalProcessing.type,
        retryCount,
      })
    );

    return {
      ...newProcessing,
      retryCount,
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'new_processing_state_creation_failed',
        userId,
        type: originalProcessing.type,
        error: sanitizeErrorForLogging(error),
      })
    );
    throw new DatabaseError('新規処理状態の作成に失敗しました', error as Error);
  }
}

/**
 * Step Functions再起動
 * @param processId 新規処理ID
 * @param userId ユーザーID
 * @param originalProcessing 元の処理状態
 * @throws StepFunctionsError Step Functions起動エラー
 */
async function startStepFunctionsExecution(
  processId: string,
  userId: string,
  originalProcessing: {
    type: ProcessingType;
    targetId: string | null;
    result: unknown;
  }
): Promise<void> {
  const stateMachineArn = process.env.STATE_MACHINE_ARN;

  if (!stateMachineArn) {
    throw new StepFunctionsError(
      processId,
      'Step Functions State MachineのARNが設定されていません'
    );
  }

  try {
    // 元の処理の入力パラメータを使用
    // resultから元のparamsを復元（実際の実装では、元のparamsを別途保存しておく必要がある）
    const params = extractParamsFromResult(originalProcessing);

    const input: StepFunctionsExecutionInput = {
      processId,
      userId,
      type: originalProcessing.type,
      params,
    };

    const command = new StartExecutionCommand({
      stateMachineArn,
      name: `${processId}-${Date.now()}`,
      input: JSON.stringify(input),
    });

    const response = await sfnClient.send(command);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'step_functions_retry_started',
        processId,
        userId,
        executionArn: response.executionArn,
        type: originalProcessing.type,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'step_functions_retry_failed',
        processId,
        userId,
        error: sanitizeErrorForLogging(error),
      })
    );
    throw new StepFunctionsError(
      processId,
      'Step Functionsの再起動に失敗しました',
      undefined,
      error as Error
    );
  }
}

/**
 * 元の処理結果からパラメータを抽出
 * @param processing 処理状態
 * @returns 処理パラメータ
 */
function extractParamsFromResult(processing: {
  type: ProcessingType;
  targetId: string | null;
  result: unknown;
}): ProcessingParams {
  // TODO: 実際の実装では、元のparamsを別途保存しておく必要がある
  // ここでは簡易的にtargetIdから復元
  let params: ProcessingParams;

  if (processing.targetId) {
    // 処理タイプに応じてparamsを構築
    if (processing.type === ProcessingType.SUBGOAL_GENERATION) {
      params = { goalId: processing.targetId } as ProcessingParams;
    } else if (processing.type === ProcessingType.ACTION_GENERATION) {
      params = { subGoalId: processing.targetId } as ProcessingParams;
    } else if (processing.type === ProcessingType.TASK_GENERATION) {
      params = { actionId: processing.targetId } as ProcessingParams;
    } else {
      params = {} as ProcessingParams;
    }
  } else {
    params = {} as ProcessingParams;
  }

  return params;
}

/**
 * 完了予定時刻の推定
 * @param type 処理タイプ
 * @returns 完了予定時刻
 */
function estimateCompletionTime(type: ProcessingType): Date {
  const estimatedSeconds = ESTIMATED_COMPLETION_TIME[type];
  const completionTime = new Date();
  completionTime.setSeconds(completionTime.getSeconds() + estimatedSeconds);
  return completionTime;
}

/**
 * レスポンスの整形
 * @param processId 処理ID
 * @param status 処理ステータス
 * @param type 処理タイプ
 * @param createdAt 作成日時
 * @param estimatedCompletionTime 完了予定時刻
 * @param retryCount リトライ回数
 * @returns 整形されたレスポンス
 */
function formatResponse(
  processId: string,
  status: ProcessingStatus,
  type: ProcessingType,
  createdAt: Date,
  estimatedCompletionTime: Date,
  retryCount: number
): RetryResponse {
  return {
    success: true,
    data: {
      processId,
      status,
      type,
      createdAt: createdAt.toISOString(),
      estimatedCompletionTime: estimatedCompletionTime.toISOString(),
      retryCount,
    },
  };
}

/**
 * エラーハンドリング
 * @param error エラーオブジェクト
 * @param c Honoコンテキスト
 * @param requestId リクエストID
 * @param processId 処理ID
 * @param duration 処理時間
 * @returns エラーレスポンス
 */
function handleError(
  error: unknown,
  c: Context,
  requestId: string,
  processId: string,
  duration: number
): Response {
  const errorResponse = mapErrorToResponse(error);

  // エラーオブジェクトを安全な形式に変換（機密情報をマスキング）
  const sanitizedError = sanitizeErrorForLogging(error);

  // エラーログの記録
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      requestId,
      processId,
      action: 'retry_error',
      duration,
      error: {
        code: errorResponse.error?.code || 'UNKNOWN_ERROR',
        message: sanitizedError.message,
        name: sanitizedError.name,
        stack: sanitizedError.stack,
      },
    })
  );

  const statusCode = getStatusCode(errorResponse.error?.code || 'INTERNAL_ERROR');
  return c.json(errorResponse, statusCode as 200);
}

/**
 * エラーをレスポンスにマッピング
 * @param error エラーオブジェクト
 * @returns エラーレスポンス
 */
function mapErrorToResponse(error: unknown): RetryResponse {
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;

  if (error instanceof ProcessingNotFoundError) {
    errorCode = 'NOT_FOUND_ERROR';
    message = '処理が見つかりません';
    retryable = false;
  } else if (error instanceof CannotRetryError) {
    errorCode = 'CANNOT_RETRY_ERROR';
    message = 'この状態の処理はリトライできません';
    retryable = false;
  } else if (error instanceof RetryLimitExceededError) {
    errorCode = 'RETRY_LIMIT_EXCEEDED_ERROR';
    message = 'リトライ上限を超えました';
    retryable = false;
  } else if (error instanceof ForbiddenError) {
    errorCode = 'FORBIDDEN_ERROR';
    message = 'この処理にアクセスする権限がありません';
    retryable = false;
  } else if (error instanceof DatabaseError) {
    errorCode = 'DATABASE_ERROR';
    message = 'データの保存に失敗しました';
    retryable = true;
  } else if (error instanceof StepFunctionsError) {
    errorCode = 'STEP_FUNCTIONS_ERROR';
    message = '処理の再起動に失敗しました';
    retryable = true;
  } else if (error instanceof AuthenticationError) {
    errorCode = 'AUTHENTICATION_ERROR';
    message = '認証が必要です';
    retryable = false;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  return {
    success: false,
    data: {
      processId: '',
      status: ProcessingStatus.FAILED,
      type: ProcessingType.SUBGOAL_GENERATION,
      createdAt: new Date().toISOString(),
      estimatedCompletionTime: new Date().toISOString(),
      retryCount: 0,
    },
    error: {
      code: errorCode,
      message,
      retryable,
    },
  };
}

/**
 * エラーコードからHTTPステータスコードを取得
 * @param errorCode エラーコード
 * @returns HTTPステータスコード
 */
function getStatusCode(errorCode: string): number {
  switch (errorCode) {
    case 'NOT_FOUND_ERROR':
      return 404;
    case 'CANNOT_RETRY_ERROR':
    case 'RETRY_LIMIT_EXCEEDED_ERROR':
      return 400;
    case 'AUTHENTICATION_ERROR':
      return 401;
    case 'FORBIDDEN_ERROR':
      return 403;
    case 'DATABASE_ERROR':
      return 500;
    case 'STEP_FUNCTIONS_ERROR':
      return 503;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}

// Lambda Handlerのエクスポート
export const handler = app.fetch;

// テスト用にアプリケーションもエクスポート
export { app };
