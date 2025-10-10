/**
 * アクション生成Lambda Handler
 * POST /api/ai/generate/actions エンドポイントの処理
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Context } from 'hono';
import { jwtAuthMiddleware, getCurrentUser } from '../middleware/auth.js';
import { ActionGenerationRequestSchema } from '../schemas/action-generation.schema.js';
import { ActionGenerationService } from '../services/action-generation.service.js';
import type {
  ActionGenerationResponse,
  ActionGenerationResult,
  ErrorDetail,
} from '../types/action-generation.types.js';
import {
  ValidationError,
  BedrockError,
  ForbiddenError,
  NotFoundError,
} from '../errors/action-generation.errors.js';
import { sanitizeErrorForLogging } from '../utils/security.js';
import { logger as utilLogger, createTimer } from '../utils/logger.js';

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
import { ContextService } from '../services/context.service.js';
import { BedrockService } from '../services/bedrock.service.js';
import { ActionQualityValidator } from '../services/action-quality-validator.service.js';
import { ActionTypeClassifier } from '../services/action-type-classifier.service.js';
import { ActionDatabaseService } from '../services/action-database.service.js';

const contextService = new ContextService();
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

/**
 * アクション生成エンドポイント
 * POST /api/ai/generate/actions
 */
app.post('/api/ai/generate/actions', jwtAuthMiddleware(), async (c: Context) => {
  const timer = createTimer();
  const requestId = c.req.header('x-request-id') || `req-${Date.now()}`;

  try {
    // 1. ユーザーIDの抽出
    const user = getCurrentUser(c);
    const userId = user.id;

    utilLogger.info('アクション生成リクエスト開始', {
      requestId,
      userId,
      action: 'action_generation_start',
    });

    // 2. リクエストボディの取得
    const body = await c.req.json();

    // 3. リクエスト検証
    const validatedRequest = ActionGenerationRequestSchema.parse(body);

    utilLogger.info('リクエスト検証成功', {
      requestId,
      userId,
      subGoalId: validatedRequest.subGoalId,
      regenerate: validatedRequest.regenerate,
    });

    // 4. 認可チェック（サブ目標所有者確認）
    await checkAuthorization(userId, validatedRequest.subGoalId, requestId);

    // 5. アクション生成サービスの呼び出し
    const result = await actionGenerationService.generateAndSaveActions(
      userId,
      validatedRequest.subGoalId,
      validatedRequest.regenerate || false
    );

    // 6. レスポンスの整形
    const response = formatResponse(result);

    // 7. 処理時間の記録
    const duration = timer.end();
    utilLogger.info('アクション生成成功', {
      requestId,
      userId,
      subGoalId: result.subGoalId,
      action: 'action_generation_success',
      duration: `${duration}ms`,
      metadata: {
        actionCount: result.actions.length,
        tokensUsed: result.metadata.tokensUsed,
        estimatedCost: result.metadata.estimatedCost,
      },
    });

    return c.json(response, 200);
  } catch (error) {
    // 8. エラーハンドリング
    const duration = timer.end();
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
 * 認可チェック（サブ目標所有者確認）
 * @param userId ユーザーID
 * @param subGoalId サブ目標ID
 * @param requestId リクエストID
 * @throws ForbiddenError 所有者でない場合
 * @throws NotFoundError サブ目標が見つからない場合
 */
async function checkAuthorization(
  userId: string,
  subGoalId: string,
  requestId: string
): Promise<void> {
  const { ActionDatabaseService } = await import('../services/action-database.service.js');
  const databaseService = new ActionDatabaseService();

  try {
    // データベースからサブ目標と目標を取得
    const subGoal = await databaseService.getSubGoalWithGoal(subGoalId);

    // サブ目標が存在しない場合
    if (!subGoal) {
      throw new NotFoundError('サブ目標が見つかりません');
    }

    // 所有者でない場合
    if (subGoal.goal.userId !== userId) {
      throw new ForbiddenError('このサブ目標にアクセスする権限がありません');
    }

    utilLogger.info('認可チェック成功', {
      requestId,
      userId,
      subGoalId,
      action: 'authorization_check_success',
    });
  } finally {
    await databaseService.disconnect();
  }
}

/**
 * レスポンスの整形
 * @param result アクション生成結果
 * @returns 整形されたレスポンス
 */
function formatResponse(result: ActionGenerationResult): ActionGenerationResponse {
  return {
    success: true,
    data: {
      subGoalId: result.subGoalId,
      actions: result.actions,
    },
    metadata: {
      generatedAt: result.metadata.generatedAt.toISOString(),
      tokensUsed: result.metadata.tokensUsed,
      estimatedCost: result.metadata.estimatedCost,
      goalContext: result.metadata.goalContext,
    },
  };
}

/**
 * エラーハンドリング
 * @param error エラーオブジェクト
 * @param c Honoコンテキスト
 * @param requestId リクエストID
 * @param duration 処理時間（ミリ秒）
 * @returns エラーレスポンス
 */
function handleError(error: unknown, c: Context, requestId: string, duration: number): Response {
  const errorResponse = mapErrorToResponse(error);

  // エラーオブジェクトを安全な形式に変換（機密情報をマスキング）
  const sanitizedError = sanitizeErrorForLogging(error);

  // エラーログの記録
  utilLogger.error('アクション生成エラー', {
    requestId,
    action: 'action_generation_error',
    duration: `${duration}ms`,
    error: {
      code: errorResponse.error?.code || 'UNKNOWN_ERROR',
      message: sanitizedError.message,
      name: sanitizedError.name,
      stack: sanitizedError.stack,
    },
  });

  const statusCode = getStatusCode(errorResponse.error?.code || 'INTERNAL_ERROR');
  return c.json(errorResponse, statusCode as 200);
}

/**
 * エラーメッセージから機密情報を除去する
 * @param message エラーメッセージ
 * @returns サニタイズされたメッセージ
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;

  // データベース接続文字列をマスキング（より広範なパターン）
  sanitized = sanitized.replace(/postgresql:\/\/[^:]+:[^@]+@[^\s]+/g, 'postgresql://***:***@***');
  sanitized = sanitized.replace(/mysql:\/\/[^:]+:[^@]+@[^\s]+/g, 'mysql://***:***@***');

  // パスワードを含む文字列をマスキング
  sanitized = sanitized.replace(/password[=:]\s*[^\s,;]+/gi, 'password=***');

  // AWSアクセスキーをマスキング
  sanitized = sanitized.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA****************');

  // JWTトークンをマスキング
  sanitized = sanitized.replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    'eyJ***.***.***.***'
  );

  return sanitized;
}

/**
 * エラーをレスポンスにマッピング
 * @param error エラーオブジェクト
 * @returns エラーレスポンス
 */
function mapErrorToResponse(error: unknown): ActionGenerationResponse {
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;
  let details: ErrorDetail[] | undefined = undefined;

  // エラーの型をnameプロパティで判定
  if (error && typeof error === 'object' && 'name' in error) {
    const errorName = (error as Error).name;
    const errorMessage = (error as Error).message;

    switch (errorName) {
      case 'ValidationError':
        errorCode = 'VALIDATION_ERROR';
        message = errorMessage;
        retryable = false;
        if ('details' in error) {
          details = (error as ValidationError).details;
        }
        break;
      case 'QualityError':
        errorCode = 'QUALITY_ERROR';
        message = 'AI生成結果の品質が基準を満たしませんでした。もう一度お試しください。';
        retryable = true;
        break;
      case 'DatabaseError':
        errorCode = 'DATABASE_ERROR';
        message = 'データの保存に失敗しました';
        retryable = true;
        break;
      case 'BedrockError':
        errorCode = 'AI_SERVICE_ERROR';
        message = 'AI生成サービスが一時的に利用できません';
        retryable = 'retryable' in error ? (error as BedrockError).retryable : true;
        break;
      case 'AuthenticationError':
        errorCode = 'AUTHENTICATION_ERROR';
        message = '認証が必要です';
        retryable = false;
        break;
      case 'ForbiddenError':
        errorCode = 'FORBIDDEN';
        message = 'この操作を実行する権限がありません';
        retryable = false;
        break;
      case 'NotFoundError':
        errorCode = 'NOT_FOUND';
        message = '指定されたリソースが見つかりません';
        retryable = false;
        break;
      default:
        // その他のエラー - 機密情報をサニタイズ
        message = sanitizeErrorMessage(errorMessage || message);
        break;
    }
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
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
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
