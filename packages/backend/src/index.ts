import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { config } from './config/environment';
import { logger, logRequest, createTimer } from './utils/logger';

// Honoアプリケーションの初期化
const app = new Hono();

// CORS設定
app.use(
  '*',
  cors({
    origin: config.FRONTEND_URL,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// リクエストログ設定
app.use('*', async (c, next) => {
  const timer = createTimer();
  await next();
  const duration = timer.end();
  logRequest(c.req.method, c.req.path, c.res.status, duration);
});

// ヘルスチェックエンドポイント
app.get('/health', c => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    version: '1.0.0',
  });
});

// ハンドラーのインポート
import progressHistoryHandler from './handlers/progress-history';
import goalsHandler from './handlers/goals';
import subGoalsHandler from './handlers/subgoals';
import actionsHandler from './handlers/actions';

// API v1 ルート
const apiV1 = new Hono();

// 基本的なAPIエンドポイント（プレースホルダー）
apiV1.get('/', c => {
  return c.json({
    message: 'Goal Mandala API v1',
    timestamp: new Date().toISOString(),
  });
});

// 進捗履歴API
apiV1.route('/progress-history', progressHistoryHandler);

// 目標・サブ目標・アクション更新API
apiV1.route('/goals', goalsHandler);
apiV1.route('/subgoals', subGoalsHandler);
apiV1.route('/actions', actionsHandler);

// APIルートをマウント
app.route('/api/v1', apiV1);

// 404ハンドラー
app.notFound(c => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// グローバルエラーハンドラー
app.onError((err, c) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      err.status
    );
  }

  return c.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
    500
  );
});

// AWS Lambda ハンドラーのエクスポート
export const handler = handle(app);

// 開発環境用のアプリケーションエクスポート
export { app };
