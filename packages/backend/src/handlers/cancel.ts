/**
 * キャンセルHandler
 * POST /api/ai/async/cancel/:processId エンドポイントの処理
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Context } from 'hono';
import { SFNClient, StopExecutionCommand } from '@aws-sdk/client-sfn';
import { jwtAuthMiddleware, getCurrentUser } from '../middleware/auth.js';
import { ProcessingStateService } from '../services/processing-state.service.js';
import { ProcessingStatus } from '../types/async-processing.types.js';
import type { CancelResponse } from '../types/async-processing.types.js';
import {
  ProcessingNotFoundError,
  CannotCancelError,
  StepFunctionsError,
  AuthenticationError,
  ForbiddenError,
  DatabaseError,
} from '../errors/async-processing.errors.js';
import { sanitizeErrorForLogging } from '../utils/security.js';

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

/**
 * キャンセルエンドポイント
 * POST /api/ai/async/cancel/:processId
 */
app.post('/api/ai/async/cancel/:processId', jwtAuthMiddleware(), async (c: Context) => {
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
        action: 'cancel_request_start',
        message: 'キャンセルリクエスト開始',
      })
    );

    // 2. 処理IDの検証
    if (!processId) {
      throw new ProcessingNotFoundError('');
    }

    // 3. 処理状態を取得
    const processing = await processingStateService.getProcessingState(processId, userId);

    if (!processing) {
      throw new ProcessingNotFoundError(processId);
    }

    // 4. ユーザー権限チェック
    if (processing.userId !== userId) {
      throw new ForbiddenError('この処理にアクセスする権限がありません');
    }

    // 5. キャンセル可能性チェック
    checkCancellable(processing);

    // 6. Step Functions実行停止
    await stopStepFunctionsExecution(processId, userId);

    // 7. 処理状態更新（CANCELLED）
    await updateProcessingToCancelled(processId, 'ユーザーによるキャンセル');

    // 8. リソースクリーンアップ
    await cleanupResources(processId);

    // 9. レスポンス返却
    const response = formatResponse(
      processId,
      ProcessingStatus.CANCELLED,
      processing.type,
      processing.createdAt,
      new Date()
    );

    // 10. 処理時間の記録
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        processId,
        action: 'cancel_success',
        duration,
        metadata: {
          type: processing.type,
          previousStatus: processing.status,
        },
      })
    );

    return c.json(response, 200);
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
 * キャンセル可能性チェック
 * @param processing 処理状態
 * @throws CannotCancelError キャンセル不可の場合
 */
function checkCancellable(processing: { id: string; status: ProcessingStatus }): void {
  // ステータスチェック（PENDING、PROCESSINGのみキャンセル可能）
  if (
    processing.status !== ProcessingStatus.PENDING &&
    processing.status !== ProcessingStatus.PROCESSING
  ) {
    throw new CannotCancelError(processing.id, processing.status);
  }
}

/**
 * Step Functions実行停止
 * @param processId 処理ID
 * @param userId ユーザーID
 * @throws StepFunctionsError Step Functions停止エラー
 */
async function stopStepFunctionsExecution(processId: string, userId: string): Promise<void> {
  const stateMachineArn = process.env.STATE_MACHINE_ARN;

  if (!stateMachineArn) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        action: 'step_functions_stop_skipped',
        processId,
        userId,
        message:
          'Step Functions State MachineのARNが設定されていないため、停止処理をスキップします',
      })
    );
    return;
  }

  try {
    // 実行ARNを構築（processIdから生成）
    // 実際の実装では、ProcessingStateにexecutionArnを保存しておく必要がある
    // ここでは簡易的に構築
    const executionArn = `${stateMachineArn.replace(':stateMachine:', ':execution:')}:${processId}`;

    const command = new StopExecutionCommand({
      executionArn,
      cause: 'ユーザーによるキャンセル',
      error: 'USER_CANCELLED',
    });

    await sfnClient.send(command);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'step_functions_stopped',
        processId,
        userId,
        executionArn,
      })
    );
  } catch (error) {
    // Step Functionsの停止に失敗しても、処理状態の更新は続行
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'step_functions_stop_failed',
        processId,
        userId,
        error: sanitizeErrorForLogging(error),
        message: 'Step Functionsの停止に失敗しましたが、処理状態の更新は続行します',
      })
    );

    // エラーは投げずに続行（処理状態の更新を優先）
  }
}

/**
 * 処理状態をCANCELLEDに更新
 * @param processId 処理ID
 * @param reason キャンセル理由
 * @throws DatabaseError データベースエラー
 */
async function updateProcessingToCancelled(processId: string, reason: string): Promise<void> {
  try {
    await processingStateService.updateProcessingStatus(processId, ProcessingStatus.CANCELLED);

    // キャンセル理由をエラーフィールドに記録
    await processingStateService.updateProcessingError(processId, {
      code: 'CANCELLED',
      message: reason,
      retryable: false,
    });

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'processing_state_cancelled',
        processId,
        reason,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'processing_state_update_failed',
        processId,
        error: sanitizeErrorForLogging(error),
      })
    );
    throw new DatabaseError('処理状態の更新に失敗しました', error as Error);
  }
}

/**
 * リソースクリーンアップ
 * @param processId 処理ID
 */
async function cleanupResources(processId: string): Promise<void> {
  try {
    // TODO: 必要に応じてリソースのクリーンアップを実装
    // 例：一時ファイルの削除、キャッシュのクリア、外部リソースの解放など

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'resources_cleaned_up',
        processId,
        message: 'リソースのクリーンアップが完了しました',
      })
    );
  } catch (error) {
    // クリーンアップの失敗はログに記録するが、エラーは投げない
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'cleanup_failed',
        processId,
        error: sanitizeErrorForLogging(error),
        message: 'リソースのクリーンアップに失敗しましたが、処理は続行します',
      })
    );
  }
}

/**
 * レスポンスの整形
 * @param processId 処理ID
 * @param status 処理ステータス
 * @param type 処理タイプ
 * @param createdAt 作成日時
 * @param cancelledAt キャンセル日時
 * @returns 整形されたレスポンス
 */
function formatResponse(
  processId: string,
  status: ProcessingStatus,
  type: string,
  createdAt: Date,
  cancelledAt: Date
): CancelResponse {
  return {
    success: true,
    data: {
      processId,
      status,
      type: type as CancelResponse['data']['type'],
      createdAt: createdAt.toISOString(),
      cancelledAt: cancelledAt.toISOString(),
      message: '処理をキャンセルしました',
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
      action: 'cancel_error',
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
function mapErrorToResponse(error: unknown): CancelResponse {
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;

  if (error instanceof ProcessingNotFoundError) {
    errorCode = 'NOT_FOUND_ERROR';
    message = '処理が見つかりません';
    retryable = false;
  } else if (error instanceof CannotCancelError) {
    errorCode = 'CANNOT_CANCEL_ERROR';
    message = 'この状態の処理はキャンセルできません';
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
    message = '処理の停止に失敗しました';
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
      type: 'SUBGOAL_GENERATION',
      createdAt: new Date().toISOString(),
      cancelledAt: new Date().toISOString(),
      message: '',
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
    case 'CANNOT_CANCEL_ERROR':
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
