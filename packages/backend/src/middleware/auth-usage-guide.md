# JWT認証ミドルウェア 使用方法ガイド

## 概要

JWT認証ミドルウェアは、Amazon Cognitoから発行されたJWTトークンを検証し、保護されたAPIエンドポイントへのアクセス制御を提供するHonoミドルウェアです。

## 基本的な使用方法

### 1. 基本的なセットアップ

```typescript
import { Hono } from 'hono';
import { jwtAuthMiddleware } from './middleware/auth';

const app = new Hono();

// 認証ミドルウェアを適用
app.use(
  '/api/protected/*',
  jwtAuthMiddleware({
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    clientId: process.env.COGNITO_CLIENT_ID!,
    region: process.env.AWS_REGION!,
  })
);

// 保護されたエンドポイント
app.get('/api/protected/profile', c => {
  const user = c.get('user') as AuthenticatedUser;
  return c.json({ user });
});
```

### 2. 環境変数による設定

```typescript
import { jwtAuthMiddleware } from './middleware/auth';

// 環境変数から自動的に設定を読み込み
app.use('/api/protected/*', jwtAuthMiddleware());
```

### 3. オプショナル認証

認証されていなくてもエラーにしない場合：

```typescript
import { optionalAuthMiddleware } from './middleware/auth';

app.use('/api/public/*', optionalAuthMiddleware());

app.get('/api/public/content', c => {
  const user = getCurrentUserOptional(c);
  if (user) {
    // 認証済みユーザー向けコンテンツ
    return c.json({ content: 'Premium content', user });
  } else {
    // 未認証ユーザー向けコンテンツ
    return c.json({ content: 'Public content' });
  }
});
```

## ユーザー情報の取得

### 1. 基本的なユーザー情報取得

```typescript
import { getCurrentUser, getCurrentUserOptional } from './middleware/auth';

// 認証必須のエンドポイント
app.get('/api/user/profile', c => {
  const user = getCurrentUser(c); // 認証されていない場合は401エラー
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
});

// オプショナル認証のエンドポイント
app.get('/api/user/preferences', c => {
  const user = getCurrentUserOptional(c); // 認証されていない場合はnull
  if (user) {
    return c.json({ preferences: getUserPreferences(user.id) });
  } else {
    return c.json({ preferences: getDefaultPreferences() });
  }
});
```

### 2. 認証コンテキストの取得

```typescript
import {
  getAuthContext,
  getAuthMetadata,
  isAuthenticated,
} from './middleware/auth';

app.get('/api/user/context', c => {
  if (!isAuthenticated(c)) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const authContext = getAuthContext(c);
  const metadata = getAuthMetadata(c);

  return c.json({
    user: authContext.user,
    authMethod: metadata?.authMethod,
    tokenType: metadata?.tokenType,
    expiresAt: metadata?.expiresAt,
  });
});
```

## 権限・ロール・グループチェック

### 1. 権限チェック

```typescript
import { hasPermission, hasRole, hasGroup } from './middleware/auth';

app.get('/api/admin/users', c => {
  if (!hasPermission(c, 'admin:users:read')) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  // 管理者権限が必要な処理
  return c.json({ users: getAllUsers() });
});
```

### 2. ロールチェック

```typescript
app.delete('/api/admin/users/:id', c => {
  if (!hasRole(c, 'admin')) {
    return c.json({ error: 'Admin role required' }, 403);
  }

  const userId = c.req.param('id');
  deleteUser(userId);
  return c.json({ success: true });
});
```

### 3. グループチェック

```typescript
app.get('/api/groups/premium-content', c => {
  if (!hasGroup(c, 'premium-users')) {
    return c.json({ error: 'Premium membership required' }, 403);
  }

  return c.json({ content: getPremiumContent() });
});
```

## 開発環境でのモック認証

### 1. 基本的なモック認証

```typescript
// 開発環境でのモック認証設定
app.use(
  '/api/*',
  jwtAuthMiddleware({
    enableMockAuth: process.env.NODE_ENV === 'development',
  })
);
```

### 2. カスタムモックユーザー

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    enableMockAuth: true,
    mockUser: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      cognitoSub: 'test-cognito-sub',
      groups: ['admin', 'premium-users'],
    },
  })
);
```

## 高度な設定

### 1. キャッシュ設定

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    cacheTimeout: 1800, // 30分間キャッシュ
  })
);
```

### 2. トークン種別の制限

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    allowedTokenUse: ['access'], // アクセストークンのみ許可
  })
);
```

### 3. 時刻ずれ許容設定

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    clockTolerance: 300, // 5分間の時刻ずれを許容
  })
);
```

### 4. メール認証必須設定

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    requireEmailVerification: true, // メール認証済みユーザーのみ許可
  })
);
```

### 5. グループ制限

```typescript
app.use(
  '/api/admin/*',
  jwtAuthMiddleware({
    allowedGroups: ['admin', 'moderator'], // 指定グループのみ許可
  })
);
```

### 6. カスタムクレーム検証

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    customClaimsValidator: async payload => {
      // カスタム検証ロジック
      return payload.email?.endsWith('@company.com') || false;
    },
  })
);
```

### 7. コールバック関数

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    onAuthSuccess: async context => {
      console.log(`User ${context.user.email} authenticated successfully`);
      // 認証成功時の処理（ログ記録、統計更新など）
    },
    onAuthFailure: async context => {
      console.log(`Authentication failed: ${context.error.message}`);
      // 認証失敗時の処理（アラート送信、ブロック処理など）
    },
  })
);
```

## エラーハンドリング

### 1. 基本的なエラーハンドリング

```typescript
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        statusCode: err.status,
      },
      err.status
    );
  }

  console.error('Unexpected error:', err);
  return c.json(
    {
      error: 'Internal server error',
      statusCode: 500,
    },
    500
  );
});
```

### 2. 認証エラーの詳細処理

```typescript
import { AuthErrorType } from './middleware/types';

app.onError((err, c) => {
  if (err instanceof HTTPException && err.cause) {
    const authError = err.cause as any;

    switch (authError.type) {
      case AuthErrorType.TOKEN_EXPIRED:
        return c.json(
          {
            error: 'Token expired',
            message: 'Please refresh your token',
            code: 'TOKEN_EXPIRED',
          },
          401
        );

      case AuthErrorType.TOKEN_INVALID:
        return c.json(
          {
            error: 'Invalid token',
            message: 'Please login again',
            code: 'TOKEN_INVALID',
          },
          401
        );

      default:
        return c.json(
          {
            error: 'Authentication failed',
            message: authError.message,
          },
          401
        );
    }
  }

  return c.json({ error: 'Internal server error' }, 500);
});
```

## パフォーマンス最適化

### 1. キャッシュ効果の確認

```typescript
import { CognitoKeyManagerImpl } from './middleware/cognito-key-manager';

// キャッシュ統計の取得
const keyManager = new CognitoKeyManagerImpl(userPoolId, region);
const stats = keyManager.getCacheStats();
console.log(
  'Cache hit rate:',
  stats.hitCount / (stats.hitCount + stats.missCount)
);
```

### 2. 複数エンドポイントでの共通設定

```typescript
// 共通設定を定義
const commonAuthOptions = {
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
  region: process.env.AWS_REGION!,
  cacheTimeout: 3600,
};

// 複数のルートで同じ設定を使用
app.use('/api/users/*', jwtAuthMiddleware(commonAuthOptions));
app.use('/api/goals/*', jwtAuthMiddleware(commonAuthOptions));
app.use('/api/tasks/*', jwtAuthMiddleware(commonAuthOptions));
```

## セキュリティベストプラクティス

### 1. 本番環境での設定

```typescript
const authOptions = {
  // 本番環境ではモック認証を無効化
  enableMockAuth: process.env.NODE_ENV !== 'production',

  // セキュリティ監査ログを有効化
  enableSecurityAudit: process.env.NODE_ENV === 'production',

  // メール認証を必須に
  requireEmailVerification: process.env.NODE_ENV === 'production',

  // 短いキャッシュ時間
  cacheTimeout: process.env.NODE_ENV === 'production' ? 1800 : 3600,
};
```

### 2. ログ記録

```typescript
import { logger } from '../utils/logger';

app.use('/api/*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  const user = getCurrentUserOptional(c);
  logger.info('API request', {
    method: c.req.method,
    path: c.req.path,
    userId: user?.id,
    duration,
    status: c.res.status,
  });
});
```

## トラブルシューティング

### 1. よくある問題

#### トークンが無効と表示される

- Cognito User Pool IDとClient IDが正しく設定されているか確認
- トークンの有効期限が切れていないか確認
- ネットワーク接続でCognito JWKSエンドポイントにアクセスできるか確認

#### キャッシュが効かない

- `cacheTimeout`設定が適切か確認
- メモリ不足でキャッシュがクリアされていないか確認

#### 本番環境でモック認証エラー

- `ENABLE_MOCK_AUTH`環境変数が`false`に設定されているか確認

### 2. デバッグ方法

```typescript
// デバッグログを有効化
process.env.LOG_LEVEL = 'DEBUG';

// 認証処理の詳細ログを確認
app.use(
  '/api/*',
  jwtAuthMiddleware({
    onAuthSuccess: context => {
      console.log('Auth success:', {
        userId: context.user.id,
        tokenType: context.metadata.tokenType,
        authMethod: context.metadata.authMethod,
      });
    },
    onAuthFailure: context => {
      console.log('Auth failure:', {
        error: context.error.type,
        message: context.error.message,
        path: context.request.path,
      });
    },
  })
);
```

## 型定義の活用

### 1. 型安全なユーザー情報アクセス

```typescript
import { AuthenticatedUser, AuthContext } from './middleware/types';

// 型安全なユーザー情報取得
const getUserProfile = (
  c: Context
): { id: string; email: string; name?: string } => {
  const user: AuthenticatedUser = getCurrentUser(c);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
};
```

### 2. カスタム型ガード

```typescript
import { isAuthenticatedUser, isAuthContext } from './middleware/types';

const processUserData = (data: unknown) => {
  if (isAuthenticatedUser(data)) {
    // data は AuthenticatedUser 型として扱える
    console.log(`Processing user: ${data.email}`);
  }
};
```

## 参考資料

- [Amazon Cognito JWT トークンの検証](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html)
- [Hono ミドルウェア開発ガイド](https://hono.dev/guides/middleware)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
