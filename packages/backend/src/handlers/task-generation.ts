/**
 * タスク生成Lambda Handler
 * POST /api/ai/generate/tasks エンドポイントの処理
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Context } from 'hono';
import { jwtAuthMiddleware, getCurrentUser } from '../middleware/auth.js';
import { TaskGenerationRequestSchema } from '../schemas/task-generation.schema.js';
import { TaskGenerationService } from '../services/task-generation.service.js';
import type {
  TaskGenerationResponse,
  TaskGenerationResult,
} from '../types/task-generation.types.js';
import {
  TaskValidationError,
  ActionNotFoundError,
  ForbiddenError,
  TaskGenerationError,
} from '../errors/task-generation.errors.js';
import { sanitizeErrorForLogging } from '../utils/security.js';
import { logger as utilLogger, createTimer } from '../utils/logger.js';
import { prisma } from '../config/database.js';

// Honoアプリケーションの作成
const app = new Hono();

// ミドルウェアの設定
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', // 環境変数から許可オリジンを取得
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// サービスのインスタンス化
import { ContextService } from '../services/context.service.js';
import { BedrockService } from '../services/bedrock.service.js';
import { TaskQualityValidator } from '../services/task-quality-validator.service.js';
import { TaskDatabaseService } from '../services/task-database.service.js';

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

/**
 * タスク生成エンドポイント
 * POST /api/ai/generate/tasks
 */
app.post('/api/ai/generate/tasks', jwtAuthMiddleware(), async (c: Context) => {
  const timer = createTimer();
  const requestId = c.req.header('x-request-id') || `req-${Date.now()}`;

  try {
    // 1. ユーザーIDの抽出
    const user = getCurrentUser(c);
    const userId = user.id;

    utilLogger.info('タスク生成リクエスト開始', {
      requestId,
      userId,
      action: 'task_generation_start',
    });

    // 2. リクエストボディの取得
    const body = await c.req.json();

    // 3. リクエスト検証
    const validatedRequest = TaskGenerationRequestSchema.parse(body);

    utilLogger.info('リクエスト検証成功', {
      requestId,
      userId,
      actionId: validatedRequest.actionId,
      regenerate: validatedRequest.regenerate,
    });

    // 4. 認可チェック（アクション所有者確認）
    await checkAuthorization(userId, validatedRequest.actionId, requestId);

    // 5. タスク生成サービスの呼び出し
    const result = await taskGenerationService.generateAndSaveTasks(
      userId,
      validatedRequest.actionId,
      validatedRequest.regenerate || false
    );

    // 6. レスポンスの整形
    const response = formatResponse(result);

    // 7. 処理時間の記録
    const duration = timer.end();
    utilLogger.info('タスク生成成功', {
      requestId,
      userId,
      actionId: result.actionId,
      action: 'task_generation_success',
      duration: `${duration}ms`,
      metadata: {
        taskCount: result.tasks.length,
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
 * 認可チェック（アクション所有者確認）
 * @param userId ユーザーID
 * @param actionId アクションID
 * @param requestId リクエストID
 * @throws ForbiddenError 所有者でない場合
 * @throws ActionNotFoundError アクションが見つからない場合
 */
async function checkAuthorization(
  userId: string,
  actionId: string,
  requestId: string
): Promise<void> {
  const { TaskDatabaseService } = await import('../services/task-database.service.js');
  const databaseService = new TaskDatabaseService();

  try {
    // データベースからアクション、サブ目標、目標を取得
    const action = await databaseService.getActionWithSubGoalAndGoal(actionId);

    // アクションが存在しない場合
    if (!action) {
      throw new ActionNotFoundError(actionId);
    }

    // 所有者でない場合
    if (action.subGoal.goal.userId !== userId) {
      throw new ForbiddenError('このアクションにアクセスする権限がありません');
    }

    utilLogger.info('認可チェック成功', {
      requestId,
      userId,
      actionId,
      action: 'authorization_check_success',
    });
  } finally {
    await databaseService.disconnect();
  }
}

/**
 * レスポンスの整形
 * @param result タスク生成結果
 * @returns 整形されたレスポンス
 */
function formatResponse(result: TaskGenerationResult): TaskGenerationResponse {
  return {
    success: true,
    data: {
      actionId: result.actionId,
      tasks: result.tasks,
    },
    metadata: {
      generatedAt: result.metadata.generatedAt.toISOString(),
      tokensUsed: result.metadata.tokensUsed,
      estimatedCost: result.metadata.estimatedCost,
      actionContext: result.metadata.actionContext,
      taskCount: result.metadata.taskCount,
      totalEstimatedMinutes: result.metadata.totalEstimatedMinutes,
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
  utilLogger.error('タスク生成エラー', {
    requestId,
    action: 'task_generation_error',
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
 * エラーをレスポンスにマッピング
 * @param error エラーオブジェクト
 * @returns エラーレスポンス
 */
function mapErrorToResponse(error: unknown): TaskGenerationResponse {
  let errorCode = 'INTERNAL_ERROR';
  let message = 'サーバーエラーが発生しました';
  let retryable = true;
  let details: unknown = undefined;

  // TaskGenerationErrorの場合
  if (error instanceof TaskGenerationError) {
    errorCode = error.code;
    message = error.message;
    retryable = error.retryable;
    details = error.details;
  }
  // エラーの型をnameプロパティで判定
  else if (error && typeof error === 'object' && 'name' in error) {
    const errorName = (error as Error).name;
    const errorMessage = (error as Error).message;

    switch (errorName) {
      case 'TaskValidationError':
        errorCode = 'VALIDATION_ERROR';
        message = errorMessage;
        retryable = false;
        if ('details' in error) {
          details = (error as TaskValidationError).details;
        }
        break;
      case 'ActionNotFoundError':
        errorCode = 'ACTION_NOT_FOUND';
        message = errorMessage;
        retryable = false;
        break;
      case 'QualityValidationError':
        errorCode = 'QUALITY_VALIDATION_FAILED';
        message = 'AI生成結果の品質が基準を満たしませんでした。もう一度お試しください。';
        retryable = false;
        break;
      case 'DatabaseError':
        errorCode = 'DATABASE_ERROR';
        message = 'データの保存に失敗しました';
        retryable = true;
        break;
      case 'AIGenerationError':
        errorCode = 'AI_GENERATION_FAILED';
        message = 'AI生成サービスが一時的に利用できません';
        retryable = true;
        break;
      case 'UnauthorizedError':
        errorCode = 'UNAUTHORIZED';
        message = '認証が必要です';
        retryable = false;
        break;
      case 'ForbiddenError':
        errorCode = 'FORBIDDEN';
        message = 'この操作を実行する権限がありません';
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
 * エラーメッセージから機密情報を除去する
 * @param message エラーメッセージ
 * @returns サニタイズされたメッセージ
 */
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;

  // データベース接続文字列をマスキング
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
 * エラーコードからHTTPステータスコードを取得
 * @param errorCode エラーコード
 * @returns HTTPステータスコード
 */
function getStatusCode(errorCode: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'ACTION_NOT_FOUND':
    case 'NOT_FOUND':
      return 404;
    case 'QUALITY_VALIDATION_FAILED':
      return 400;
    case 'DATABASE_ERROR':
      return 500;
    case 'AI_GENERATION_FAILED':
    case 'AI_SERVICE_ERROR':
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
