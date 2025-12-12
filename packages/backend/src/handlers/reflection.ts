import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma-client';
import { ReflectionService } from '../services/reflection.service';
import { ActionProgressService } from '../services/action-progress.service';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { sanitizeErrorForLogging } from '../utils/security';
import { NotFoundError } from '../utils/errors';
import { createReflectionSchema, updateReflectionSchema } from '../schemas/reflection.schema';

// Prismaクライアントのインスタンス化
const prisma = new PrismaClient();

// サービスのインスタンス化（テスト時は外部から注入可能）
let reflectionService = new ReflectionService(prisma);
let actionProgressService = new ActionProgressService(prisma);

// テスト用のサービス注入関数
export const setServices = (services: {
  reflectionService?: ReflectionService;
  actionProgressService?: ActionProgressService;
}) => {
  if (services.reflectionService) reflectionService = services.reflectionService;
  if (services.actionProgressService) actionProgressService = services.actionProgressService;
};

// Honoアプリケーションの作成
const app = new Hono();

// CORSミドルウェアの適用
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

/**
 * POST /api/reflections - 振り返り作成
 */
app.post('/api/reflections', authMiddleware, async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const body = await c.req.json();

    logger.info('Reflection create API request', {
      requestId,
      userId,
      method: 'POST',
      path: '/api/reflections',
      timestamp: new Date().toISOString(),
    });

    // バリデーション
    const validatedData = createReflectionSchema.parse(body);

    // 振り返り作成
    const reflection = await reflectionService.createReflection(validatedData);

    const duration = Date.now() - startTime;

    logger.info('Reflection create API response', {
      requestId,
      userId,
      reflectionId: reflection.id,
      statusCode: 201,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json(
      {
        success: true,
        data: {
          reflection,
        },
      },
      201
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Reflection create API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

/**
 * GET /api/reflections/:id - 振り返り取得（単一）
 */
app.get('/api/reflections/:id', authMiddleware, async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const reflectionId = c.req.param('id');

    logger.info('Reflection get API request', {
      requestId,
      userId,
      reflectionId,
      method: 'GET',
      path: `/api/reflections/${reflectionId}`,
      timestamp: new Date().toISOString(),
    });

    // 振り返り取得
    const reflection = await reflectionService.getReflection(reflectionId, userId);

    if (!reflection) {
      const duration = Date.now() - startTime;
      logger.warn('Reflection not found', {
        requestId,
        userId,
        reflectionId,
        statusCode: 404,
        duration,
        timestamp: new Date().toISOString(),
      });

      return c.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '振り返りが見つかりません',
            timestamp: new Date().toISOString(),
          },
        },
        404
      );
    }

    const duration = Date.now() - startTime;

    logger.info('Reflection get API response', {
      requestId,
      userId,
      reflectionId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        reflection,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Reflection get API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

/**
 * GET /api/goals/:goalId/reflections - 振り返り一覧取得
 */
app.get('/api/goals/:goalId/reflections', authMiddleware, async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const goalId = c.req.param('goalId');

    logger.info('Reflection list API request', {
      requestId,
      userId,
      goalId,
      method: 'GET',
      path: `/api/goals/${goalId}/reflections`,
      timestamp: new Date().toISOString(),
    });

    // 振り返り一覧取得
    const reflections = await reflectionService.getReflectionsByGoal(goalId, userId);

    const duration = Date.now() - startTime;

    logger.info('Reflection list API response', {
      requestId,
      userId,
      goalId,
      reflectionCount: reflections.length,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        reflections,
        total: reflections.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Reflection list API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

/**
 * PUT /api/reflections/:id - 振り返り更新
 */
app.put('/api/reflections/:id', authMiddleware, async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const reflectionId = c.req.param('id');
    const body = await c.req.json();

    logger.info('Reflection update API request', {
      requestId,
      userId,
      reflectionId,
      method: 'PUT',
      path: `/api/reflections/${reflectionId}`,
      timestamp: new Date().toISOString(),
    });

    // バリデーション
    const validatedData = updateReflectionSchema.parse(body);

    // 振り返り更新
    const reflection = await reflectionService.updateReflection(
      reflectionId,
      userId,
      validatedData
    );

    const duration = Date.now() - startTime;

    logger.info('Reflection update API response', {
      requestId,
      userId,
      reflectionId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        reflection,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Reflection update API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

/**
 * DELETE /api/reflections/:id - 振り返り削除
 */
app.delete('/api/reflections/:id', authMiddleware, async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const reflectionId = c.req.param('id');

    logger.info('Reflection delete API request', {
      requestId,
      userId,
      reflectionId,
      method: 'DELETE',
      path: `/api/reflections/${reflectionId}`,
      timestamp: new Date().toISOString(),
    });

    // 振り返り削除
    await reflectionService.deleteReflection(reflectionId, userId);

    const duration = Date.now() - startTime;

    logger.info('Reflection delete API response', {
      requestId,
      userId,
      reflectionId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: '振り返りを削除しました',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Reflection delete API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

/**
 * GET /api/goals/:goalId/action-progress - アクション進捗取得
 */
app.get('/api/goals/:goalId/action-progress', authMiddleware, async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;
    const goalId = c.req.param('goalId');

    logger.info('Action progress API request', {
      requestId,
      userId,
      goalId,
      method: 'GET',
      path: `/api/goals/${goalId}/action-progress`,
      timestamp: new Date().toISOString(),
    });

    // アクション進捗取得
    const progress = await actionProgressService.getActionProgress(goalId, userId);

    // 分類
    const categorized = actionProgressService.categorizeActions(progress);

    const duration = Date.now() - startTime;

    logger.info('Action progress API response', {
      requestId,
      userId,
      goalId,
      totalActions: progress.length,
      regretfulCount: categorized.regretful.length,
      slowProgressCount: categorized.slowProgress.length,
      untouchedCount: categorized.untouched.length,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: categorized,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Action progress API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// エラーハンドリング
app.onError((err, c) => {
  const timestamp = new Date().toISOString();
  const requestId = c.req.header('x-request-id') || 'unknown';

  // Zodバリデーションエラー
  if (err instanceof z.ZodError) {
    logger.error('Validation error', {
      requestId,
      errors: err.errors,
      timestamp,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          details: err.errors,
          timestamp,
        },
      },
      400
    );
  }

  // NotFoundエラー
  if (err instanceof NotFoundError) {
    logger.warn('Not found error', {
      requestId,
      message: err.message,
      timestamp,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: err.message,
          timestamp,
        },
      },
      404
    );
  }

  // その他のエラー
  const sanitizedError = sanitizeErrorForLogging(err);
  logger.error('Unexpected error', {
    requestId,
    error: sanitizedError,
    timestamp,
  });

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '予期しないエラーが発生しました',
        timestamp,
      },
    },
    500
  );
});

export default app;
export { reflectionService, actionProgressService };
