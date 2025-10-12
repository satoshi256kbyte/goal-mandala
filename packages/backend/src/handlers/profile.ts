import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PrismaClient } from '../generated/prisma-client';
import { ProfileService } from '../services/profile.service';
import { ProfileValidationService } from '../services/profile-validation.service';
import { jwtAuthMiddleware } from '../middleware/auth';
import { NotFoundError, ValidationError, DatabaseError } from '../errors/profile.errors';
import { logger } from '../utils/logger';
import { sanitizeErrorForLogging } from '../utils/security';

// Prismaクライアントのインスタンス化
const prisma = new PrismaClient();

// サービスのインスタンス化
const validationService = new ProfileValidationService();
const profileService = new ProfileService(prisma, validationService);

// Honoアプリケーションの作成
const app = new Hono();

// CORSミドルウェアの適用
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
  })
);

// GET /api/profile - プロフィール取得
app.get('/api/profile', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    // ユーザーIDの抽出
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;

    // ログ記録
    logger.info('Profile API request', {
      requestId,
      userId,
      method: 'GET',
      path: '/api/profile',
      timestamp: new Date().toISOString(),
    });

    // プロフィール取得
    const profile = await profileService.getProfile(userId);

    // 処理時間の計算
    const duration = Date.now() - startTime;

    // ログ記録
    logger.info('Profile API response', {
      requestId,
      userId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    // レスポンスの整形
    return c.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    // エラーログ記録（機密情報マスキング）
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Profile API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// PUT /api/profile - プロフィール更新
app.put('/api/profile', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    // ユーザーIDの抽出
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;

    // リクエストボディの取得
    const body = await c.req.json();

    // ログ記録
    logger.info('Profile API request', {
      requestId,
      userId,
      method: 'PUT',
      path: '/api/profile',
      timestamp: new Date().toISOString(),
    });

    // プロフィール更新
    const profile = await profileService.updateProfile(userId, body);

    // 処理時間の計算
    const duration = Date.now() - startTime;

    // ログ記録
    logger.info('Profile API response', {
      requestId,
      userId,
      statusCode: 200,
      duration,
      timestamp: new Date().toISOString(),
    });

    // レスポンスの整形
    return c.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    // エラーログ記録（機密情報マスキング）
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Profile API error', {
      requestId,
      error: sanitizedError,
      duration,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
});

// DELETE /api/profile - プロフィール削除
app.delete('/api/profile', jwtAuthMiddleware(), async c => {
  const startTime = Date.now();
  const requestId = c.req.header('x-request-id') || 'unknown';

  try {
    // ユーザーIDの抽出
    const user = c.get('user');
    if (!user || !user.id) {
      throw new Error('User ID not found in context');
    }

    const userId = user.id;

    // ログ記録
    logger.info('Profile API request', {
      requestId,
      userId,
      method: 'DELETE',
      path: '/api/profile',
      timestamp: new Date().toISOString(),
    });

    // プロフィール削除
    await profileService.deleteProfile(userId);

    // 処理時間の計算
    const duration = Date.now() - startTime;

    // ログ記録
    logger.info('Profile API response', {
      requestId,
      userId,
      statusCode: 204,
      duration,
      timestamp: new Date().toISOString(),
    });

    // 204 No Contentレスポンスの返却
    return c.body(null, 204);
  } catch (error) {
    // エラーログ記録（機密情報マスキング）
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.error('Profile API error', {
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

  // ValidationError
  if (err instanceof ValidationError) {
    logger.error('Validation error', {
      requestId,
      error: err.message,
      timestamp,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          timestamp,
        },
      },
      400
    );
  }

  // NotFoundError
  if (err instanceof NotFoundError) {
    logger.error('Not found error', {
      requestId,
      error: err.message,
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

  // DatabaseError
  if (err instanceof DatabaseError) {
    logger.error('Database error', {
      requestId,
      error: err.message,
      timestamp,
    });

    return c.json(
      {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: err.message,
          timestamp,
        },
      },
      500
    );
  }

  // その他のエラー（機密情報マスキング）
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

export { app, profileService };
