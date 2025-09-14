/**
 * JWT認証ミドルウェア使用例
 *
 * このファイルは、JWT認証ミドルウェアの使用方法を示すサンプルです。
 * 実際のアプリケーションでは、このパターンを参考にしてください。
 */

import { Hono } from 'hono';
import {
  jwtAuthMiddleware,
  optionalAuthMiddleware,
  getCurrentUser,
  getCurrentUserOptional,
} from './auth';
import { AuthMiddlewareOptions } from './types';

// Honoアプリケーションの作成
const app = new Hono();

// ===== 基本的な使用方法 =====

// 1. 環境変数を使用したデフォルト設定
app.use('/api/protected/*', jwtAuthMiddleware());

// 2. カスタムオプションを使用した設定
const customAuthOptions: Partial<AuthMiddlewareOptions> = {
  userPoolId: 'custom-user-pool-id',
  clientId: 'custom-client-id',
  region: 'us-east-1',
  enableMockAuth: false,
  cacheTimeout: 1800, // 30分
};

app.use('/api/admin/*', jwtAuthMiddleware(customAuthOptions));

// 3. オプショナル認証（認証されていなくてもアクセス可能）
app.use('/api/public/*', optionalAuthMiddleware());

// ===== エンドポイントの実装例 =====

// 保護されたエンドポイント（認証必須）
app.get('/api/protected/profile', c => {
  // 認証されたユーザー情報を取得
  const user = getCurrentUser(c);

  return c.json({
    message: 'Protected endpoint accessed successfully',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  });
});

// 管理者向けエンドポイント（カスタム認証設定）
app.get('/api/admin/users', c => {
  const user = getCurrentUser(c);

  // 管理者権限チェック（例）
  if (!user.email.endsWith('@admin.example.com')) {
    return c.json({ error: 'Admin access required' }, 403);
  }

  return c.json({
    message: 'Admin endpoint accessed successfully',
    users: [], // 実際のユーザーリストを返す
  });
});

// パブリックエンドポイント（オプショナル認証）
app.get('/api/public/content', c => {
  const user = getCurrentUserOptional(c);

  if (user) {
    // 認証されたユーザー向けのコンテンツ
    return c.json({
      message: 'Personalized content',
      content: `Hello ${user.name || user.email}!`,
      isAuthenticated: true,
    });
  } else {
    // 匿名ユーザー向けのコンテンツ
    return c.json({
      message: 'Public content',
      content: 'Welcome to our public API!',
      isAuthenticated: false,
    });
  }
});

// ===== エラーハンドリングの例 =====

// グローバルエラーハンドラー
app.onError((err, c) => {
  console.error('Application error:', err);

  // 認証エラーの場合
  if (err.message.includes('authentication') || err.message.includes('token')) {
    return c.json(
      {
        error: 'Authentication failed',
        message: 'Please login and try again',
      },
      401
    );
  }

  // その他のエラー
  return c.json(
    {
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    },
    500
  );
});

// ===== 開発環境での使用例 =====

// 開発環境用のモック認証設定
const developmentAuthOptions: Partial<AuthMiddlewareOptions> = {
  enableMockAuth: true, // モック認証を有効化
};

// 開発環境でのみモック認証を使用
if (process.env.NODE_ENV === 'development') {
  app.use('/api/dev/*', jwtAuthMiddleware(developmentAuthOptions));

  app.get('/api/dev/test', c => {
    const user = getCurrentUser(c);
    return c.json({
      message: 'Development endpoint with mock auth',
      user,
      environment: 'development',
    });
  });
}

// ===== ヘルスチェックエンドポイント（認証不要） =====

app.get('/health', c => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export { app };

// ===== 使用方法のドキュメント =====

/**
 * JWT認証ミドルウェアの使用方法
 *
 * 1. 基本的な使用方法:
 *    app.use('/protected/*', jwtAuthMiddleware());
 *
 * 2. カスタムオプション付き:
 *    app.use('/admin/*', jwtAuthMiddleware({
 *      userPoolId: 'custom-pool-id',
 *      clientId: 'custom-client-id',
 *      enableMockAuth: false
 *    }));
 *
 * 3. オプショナル認証:
 *    app.use('/public/*', optionalAuthMiddleware());
 *
 * 4. ユーザー情報の取得:
 *    const user = getCurrentUser(c);           // 認証必須
 *    const user = getCurrentUserOptional(c);  // 認証オプショナル
 *
 * 5. 環境変数設定:
 *    COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
 *    COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
 *    AWS_REGION=ap-northeast-1
 *    ENABLE_MOCK_AUTH=false
 *    JWT_CACHE_TTL=3600
 */
