/**
 * JWT認証ミドルウェアの使用例
 *
 * 要件4.2, 4.3に対応：
 * - 型安全な方法でユーザー情報にアクセス
 * - 必要な情報（sub、email、name等）が含まれていることを保証
 */

import { Hono, Context } from 'hono';
import {
  jwtAuthMiddleware,
  optionalAuthMiddleware,
  getCurrentUser,
  getCurrentUserOptional,
  getAuthContext,
  hasPermission,
  hasRole,
  hasGroup,
  AuthenticatedUser,
  AuthContext,
  AuthMiddlewareOptions,
  RequiredAuthContext,
  OptionalAuthContext,
} from './index';

// アプリケーション設定
const app = new Hono();

// 認証設定
const authOptions: AuthMiddlewareOptions = {
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  region: process.env.AWS_REGION!,
  enableMockAuth: process.env.NODE_ENV === 'development',
  cacheTimeout: 3600,
  enableSecurityAudit: true,
};

// 基本的な認証ミドルウェアの使用
app.use('/api/protected/*', jwtAuthMiddleware(authOptions));

// オプショナル認証ミドルウェアの使用
app.use('/api/public/*', optionalAuthMiddleware(authOptions));

// 型安全なユーザー情報アクセスの例
app.get('/api/protected/profile', (c: RequiredAuthContext) => {
  // 型安全にユーザー情報を取得
  const user: AuthenticatedUser = getCurrentUser(c);

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    groups: user.groups,
    emailVerified: user.emailVerified,
  });
});

// 認証コンテキストの使用例
app.get('/api/protected/context', (c: Context) => {
  const authContext: AuthContext = getAuthContext(c);

  return c.json({
    user: {
      id: authContext.user.id,
      email: authContext.user.email,
    },
    metadata: {
      authMethod: authContext.metadata.authMethod,
      tokenType: authContext.metadata.tokenType,
      expiresAt: authContext.metadata.expiresAt,
    },
    isAuthenticated: authContext.isAuthenticated,
  });
});

// オプショナル認証の使用例
app.get('/api/public/info', (c: OptionalAuthContext) => {
  const user: AuthenticatedUser | null = getCurrentUserOptional(c);

  if (user) {
    return c.json({
      message: `Hello, ${user.name || user.email}!`,
      authenticated: true,
    });
  } else {
    return c.json({
      message: 'Hello, anonymous user!',
      authenticated: false,
    });
  }
});

// 権限チェックの使用例
app.get('/api/protected/admin', (c: Context) => {
  const user = getCurrentUser(c);

  if (!hasRole(c, 'admin')) {
    return c.json({ error: 'Admin role required' }, 403);
  }

  return c.json({
    message: 'Admin access granted',
    user: user.email,
  });
});

// グループベースアクセス制御の例
app.get('/api/protected/managers', (c: Context) => {
  const user = getCurrentUser(c);

  if (!hasGroup(c, 'managers') && !hasGroup(c, 'admins')) {
    return c.json({ error: 'Manager or admin group required' }, 403);
  }

  return c.json({
    message: 'Manager access granted',
    user: user.email,
    groups: user.groups,
  });
});

// 権限ベースアクセス制御の例
app.delete('/api/protected/users/:id', (c: Context) => {
  const user = getCurrentUser(c);
  const targetUserId = c.req.param('id');

  // 自分のアカウントまたは削除権限が必要
  if (user.id !== targetUserId && !hasPermission(c, 'users:delete')) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  return c.json({
    message: 'User deletion authorized',
    targetUserId,
    authorizedBy: user.email,
  });
});

// カスタム認証チェック関数の例
function requireEmailVerification(c: Context): AuthenticatedUser {
  const user = getCurrentUser(c);

  if (!user.emailVerified) {
    throw new Error('Email verification required');
  }

  return user;
}

// メール認証必須エンドポイントの例
app.post('/api/protected/sensitive-action', (c: Context) => {
  try {
    const user = requireEmailVerification(c);

    return c.json({
      message: 'Sensitive action authorized',
      user: user.email,
      verified: user.emailVerified,
    });
  } catch (error) {
    return c.json({ error: 'Email verification required' }, 403);
  }
});

// 型安全なミドルウェアファクトリーの例
function createAuthMiddleware(requiredGroups: string[]) {
  return jwtAuthMiddleware({
    ...authOptions,
    allowedGroups: requiredGroups,
  });
}

// 特定グループ用ミドルウェアの使用
app.use('/api/admin/*', createAuthMiddleware(['admins']));
app.use('/api/managers/*', createAuthMiddleware(['managers', 'admins']));

// エラーハンドリングの例
app.onError((err, c) => {
  console.error('Authentication error:', err);

  if (err.message.includes('not authenticated')) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  if (err.message.includes('permissions')) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
