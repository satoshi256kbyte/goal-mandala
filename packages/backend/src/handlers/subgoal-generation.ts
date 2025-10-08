/**
 * サブ目標生成Lambda Handler
 * POST /api/ai/generate/subgoals エンドポイントの処理
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Context } from 'hono';
import { jwtAuthMiddleware, getCurrentUser } from '../middleware/auth.js';
import { InputValidationService } from '../services/input-validation.service.js';
import { SubGoalGenerationService } from '../services/subgoal-generation.service.js';
import type { SubGoalGenerationResponse, ErrorDetail } from '../types/subgoal-generation.types.js';
import {
  ValidationError,
  QualityError,
  DatabaseError,
  BedrockError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from '../errors/subgoal-generation.errors.js';
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
const inputValidationService = new InputValidationService();
const subGoalGenerationService = new SubGoalGenerationService();

/**
 * サブ目標生成エンドポイント
 * POST /api/ai/generate/subgoals
 */
app.post('/api/ai/generate/subgoals', jwtAuthMiddleware(), async (c: Context) => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || `req-${Date.now()}`;

  try {
    // 1. ユーザーIDの抽出
    const user = getCurrentUser(c);
    const userId = user.id;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        action: 'subgoal_generation_start',
        message: 'サブ目標生成リクエスト開始',
      })
    );

    // 2. リクエストボディの取得
    const body = await c.req.json();

    // 3. リクエスト検証
    const validatedRequest = inputValidationService.validateSubGoalGenerationRequest(body);

    // 4. 認可チェック（既存目標の更新の場合）
    if (validatedRequest.goalId) {
      await checkAuthorization(userId, validatedRequest.goalId);
    }

    // 5. サブ目標生成サービスの呼び出し
    const result = await subGoalGenerationService.generateAndSaveSubGoals(userId, validatedRequest);

    // 6. レスポンスの整形
    const response = formatResponse(result);

    // 7. 処理時間の記録
    const duration = Date.now() - startTime;
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        requestId,
        userId,
        action: 'subgoal_generation_success',
        duration,
        metadata: {
          goalId: result.goalId,
          subGoalCount: result.subGoals.length,
          tokensUsed: result.metadata.tokensUsed,
          estimatedCost: result.metadata.estimatedCost,
        },
      })
    );

    return c.json(response, 200);
  } catch (error) {
    // 8. エラーハンドリング
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
 * 認可チェック（目標所有者確認）
 * @param userId ユーザーID
 * @param goalId 目標ID
 * @throws ForbiddenError 所有者でない場合
 * @throws NotFoundError 目標が見つからない場合
 */
async function checkAuthorization(userId: string, goalId: string): Promise<void> {
  const { DatabaseService } = await import('../services/subgoal-database.service.js');
  const databaseService = new DatabaseService();

  try {
    // データベースから目標を取得
    const goal = await databaseService.getGoal(goalId);

    // 目標が存在しない場合
    if (!goal) {
      throw new NotFoundError('目標が見つかりません');
    }

    // 所有者でない場合
    if (goal.userId !== userId) {
      throw new ForbiddenError('この目標を編集する権限がありません');
    }

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        action: 'authorization_check_success',
        userId,
        goalId,
        message: '認可チェック成功',
      })
    );
  } finally {
    await databaseService.disconnect();
  }
}

/**
 * レスポンスの整形
 * @param result サブ目標生成結果
 * @returns 整形されたレスポンス
 */
function formatResponse(result: {
  goalId: string;
  subGoals: Array<{
    id: string;
    title: string;
    description: string;
    background: string;
    position: number;
    progress: number;
    createdAt: string;
    updatedAt: string;
  }>;
  metadata: {
    generatedAt: Date;
    tokensUsed: number;
    estimatedCost: number;
  };
}): SubGoalGenerationResponse {
  return {
    success: true,
    data: {
      goalId: result.goalId,
      subGoals: result.subGoals,
    },
    metadata: {
      generatedAt: result.metadata.generatedAt.toISOString(),
      tokensUsed: result.metadata.tokensUsed,
      estimatedCost: result.metadata.estimatedCost,
    },
  };
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
      action: 'subgoal_generation_error',
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
function mapErrorToResponse(error: unknown): SubGoalGenerationResponse {
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;
  let details: ErrorDetail['details'] = undefined;

  if (error instanceof ValidationError) {
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
    retryable = false;
    details = error.details;
  } else if (error instanceof QualityError) {
    errorCode = 'QUALITY_ERROR';
    message = 'AI生成結果の品質が基準を満たしませんでした。もう一度お試しください。';
    retryable = true;
  } else if (error instanceof DatabaseError) {
    errorCode = 'DATABASE_ERROR';
    message = 'データの保存に失敗しました';
    retryable = true;
  } else if (error instanceof BedrockError) {
    errorCode = 'AI_SERVICE_ERROR';
    message = 'AI生成サービスが一時的に利用できません';
    retryable = (error as BedrockError).retryable;
  } else if (error instanceof AuthenticationError) {
    errorCode = 'AUTHENTICATION_ERROR';
    message = '認証が必要です';
    retryable = false;
  } else if (error instanceof ForbiddenError) {
    errorCode = 'FORBIDDEN_ERROR';
    message = 'この操作を実行する権限がありません';
    retryable = false;
  } else if (error instanceof NotFoundError) {
    errorCode = 'NOT_FOUND_ERROR';
    message = '指定されたリソースが見つかりません';
    retryable = false;
  } else if (error instanceof Error) {
    // その他のエラー
    message = error.message || message;
  }

  return {
    success: false,
    error: {
      code: errorCode,
      message,
      retryable,
      details,
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
    case 'QUALITY_ERROR':
      return 422;
    case 'DATABASE_ERROR':
      return 500;
    case 'AI_SERVICE_ERROR':
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
