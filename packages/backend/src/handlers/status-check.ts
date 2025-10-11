/**
 * 処理状態取得Lambda Handler
 * GET /api/ai/async/status/:processId エンドポイントの処理
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Context } from 'hono';
import { jwtAuthMiddleware, getCurrentUser } from '../middleware/auth.js';
import { ProcessingStateService } from '../services/processing-state.service.js';
import type { ProcessingStateResponse, ProcessingError } from '../types/async-processing.types.js';
import { ProcessingStatus } from '../generated/prisma-client';
import {
  ProcessingNotFoundError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  ForbiddenError,
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
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// サービスのインスタンス化
const processingStateService = new ProcessingStateService();

/**
 * 処理状態取得エンドポイント
 * GET /api/ai/async/status/:processId
 */
app.get('/api/ai/async/status/:processId', jwtAuthMiddleware(), async (c: Context) => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || `req-${Date.now()}`;

  try {
    // 1. ユーザーIDの抽出
    const userId = extractUserId(c);

    // 2. 処理IDの取得と検証
    const processId = c.req.param('processId');
    validateProcessId(processId);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        processId,
        action: 'status_check_start',
        message: '処理状態取得リクエスト開始',
      })
    );

    // 3. 処理状態取得
    const processingState = await getProcessingState(processId, userId);

    // 4. レスポンス返却
    const response = formatResponse(processingState);

    // 5. 処理時間の記録
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        processId,
        action: 'status_check_success',
        duration,
        metadata: {
          status: processingState.status,
          progress: processingState.progress,
        },
      })
    );

    return c.json(response, 200);
  } catch (error) {
    // 6. エラーハンドリング
    const duration = Date.now() - startTime;
    return handleError(error, c, requestId, duration);
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
 * 処理IDの検証
 * @param processId 処理ID
 * @throws ValidationError 処理IDが無効な場合
 */
function validateProcessId(processId: string): void {
  if (!processId) {
    throw new ValidationError('処理IDが指定されていません');
  }

  // UUID形式のチェック（簡易版）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(processId)) {
    throw new ValidationError('処理IDの形式が正しくありません');
  }
}

/**
 * 処理状態取得
 * @param processId 処理ID
 * @param userId ユーザーID
 * @returns 処理状態
 * @throws ProcessingNotFoundError 処理が見つからない場合
 * @throws ForbiddenError 他のユーザーの処理にアクセスしようとした場合
 * @throws DatabaseError データベースエラー
 */
async function getProcessingState(
  processId: string,
  userId: string
): Promise<{
  id: string;
  userId: string;
  type: string;
  status: ProcessingStatus;
  targetId: string | null;
  progress: number;
  result: unknown;
  error: unknown;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}> {
  try {
    const processingState = await processingStateService.getProcessingState(processId, userId);

    if (!processingState) {
      // 処理が存在しないか、他のユーザーの処理
      // セキュリティ上、どちらの理由かは明示しない
      throw new ProcessingNotFoundError(processId);
    }

    return processingState;
  } catch (error) {
    if (error instanceof ProcessingNotFoundError) {
      throw error;
    }

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        action: 'processing_state_retrieval_failed',
        userId,
        processId,
        error: sanitizeErrorForLogging(error),
      })
    );

    throw new DatabaseError('処理状態の取得に失敗しました', error as Error);
  }
}

/**
 * レスポンスの整形
 * @param processingState 処理状態
 * @returns 整形されたレスポンス
 */
function formatResponse(processingState: {
  id: string;
  type: string;
  status: ProcessingStatus;
  progress: number;
  result: unknown;
  error: unknown;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): ProcessingStateResponse {
  // 完了予定時刻の推定
  const estimatedCompletionTime = estimateCompletionTime(
    processingState.type,
    processingState.createdAt,
    processingState.status
  );

  const response: ProcessingStateResponse = {
    success: true,
    data: {
      processId: processingState.id,
      status: processingState.status,
      type: processingState.type as ProcessingStateResponse['data']['type'],
      progress: processingState.progress,
      createdAt: processingState.createdAt.toISOString(),
      updatedAt: processingState.updatedAt.toISOString(),
      estimatedCompletionTime: estimatedCompletionTime.toISOString(),
    },
  };

  // 完了している場合は結果を含める
  if (processingState.status === ProcessingStatus.COMPLETED && processingState.result) {
    response.data.result = processingState.result;
    response.data.completedAt = processingState.completedAt?.toISOString();
  }

  // 失敗している場合はエラー情報を含める
  if (
    (processingState.status === ProcessingStatus.FAILED ||
      processingState.status === ProcessingStatus.TIMEOUT) &&
    processingState.error
  ) {
    response.error = processingState.error as ProcessingError;
    response.data.completedAt = processingState.completedAt?.toISOString();
  }

  return response;
}

/**
 * 完了予定時刻の推定
 * @param type 処理タイプ
 * @param createdAt 作成日時
 * @param status 処理ステータス
 * @returns 完了予定時刻
 */
function estimateCompletionTime(type: string, createdAt: Date, status: ProcessingStatus): Date {
  // 既に完了している場合は現在時刻を返す
  if (
    status === ProcessingStatus.COMPLETED ||
    status === ProcessingStatus.FAILED ||
    status === ProcessingStatus.TIMEOUT ||
    status === ProcessingStatus.CANCELLED
  ) {
    return new Date();
  }

  // 処理タイプに応じた推定時間を取得
  const estimatedSeconds =
    ESTIMATED_COMPLETION_TIME[type as keyof typeof ESTIMATED_COMPLETION_TIME] || 300;

  const completionTime = new Date(createdAt);
  completionTime.setSeconds(completionTime.getSeconds() + estimatedSeconds);

  return completionTime;
}

/**
 * エラーハンドリング
 * @param error エラーオブジェクト
 * @param c Honoコンテキスト
 * @param requestId リクエストID
 * @param duration 処理時間
 * @returns エラーレスポンス
 */
function handleError(error: unknown, c: Context, requestId: string, duration: number): Response {
  const errorResponse = mapErrorToResponse(error);

  // エラーオブジェクトを安全な形式に変換（機密情報をマスキング）
  const sanitizedError = sanitizeErrorForLogging(error);

  // エラーログの記録
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      requestId,
      action: 'status_check_error',
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
function mapErrorToResponse(error: unknown): ProcessingStateResponse {
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;

  if (error instanceof ValidationError) {
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
    retryable = false;
  } else if (error instanceof ProcessingNotFoundError) {
    errorCode = 'NOT_FOUND_ERROR';
    message = '処理が見つかりません';
    retryable = false;
  } else if (error instanceof ForbiddenError) {
    errorCode = 'FORBIDDEN_ERROR';
    message = 'この処理にアクセスする権限がありません';
    retryable = false;
  } else if (error instanceof DatabaseError) {
    errorCode = 'DATABASE_ERROR';
    message = 'データの取得に失敗しました';
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
      status: 'FAILED' as ProcessingStateResponse['data']['status'],
      type: 'SUBGOAL_GENERATION' as ProcessingStateResponse['data']['type'],
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedCompletionTime: new Date().toISOString(),
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
    case 'VALIDATION_ERROR':
      return 400;
    case 'AUTHENTICATION_ERROR':
      return 401;
    case 'FORBIDDEN_ERROR':
      return 403;
    case 'NOT_FOUND_ERROR':
      return 404;
    case 'DATABASE_ERROR':
      return 500;
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}

// Lambda Handlerのエクスポート
export const handler = app.fetch;

// テスト用にアプリケーションもエクスポート
export { app };
