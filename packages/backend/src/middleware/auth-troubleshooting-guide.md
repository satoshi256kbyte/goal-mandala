# JWT認証ミドルウェア トラブルシューティングガイド

## 概要

このガイドでは、JWT認証ミドルウェアで発生する可能性のある問題とその解決方法について説明します。

## よくある問題と解決方法

### 1. 認証エラー関連

#### 問題: "Authorization header is required" (401エラー)

**症状:**

```json
{
  "error": "Authorization header is required",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**原因:**

- Authorizationヘッダーが送信されていない
- ヘッダー名が間違っている

**解決方法:**

```typescript
// ✅ 正しいヘッダー設定
const response = await fetch('/api/protected/endpoint', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

// ❌ 間違った例
const response = await fetch('/api/protected/endpoint', {
  headers: {
    Auth: `Bearer ${token}`, // ヘッダー名が間違い
    Authorization: token, // Bearerプレフィックスがない
  },
});
```

#### 問題: "Bearer token is required" (401エラー)

**症状:**

```json
{
  "error": "Bearer token is required",
  "statusCode": 401
}
```

**原因:**

- Bearerプレフィックスがない
- トークン形式が間違っている

**解決方法:**

```typescript
// ✅ 正しい形式
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

// ❌ 間違った形式
Authorization: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Token eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 問題: "Token has expired" (401エラー)

**症状:**

```json
{
  "error": "Token has expired",
  "statusCode": 401
}
```

**原因:**

- JWTトークンの有効期限が切れている
- システム時刻がずれている

**解決方法:**

1. **新しいトークンを取得:**

```typescript
// Cognitoから新しいトークンを取得
const auth = new CognitoAuth();
const newToken = await auth.refreshToken(refreshToken);
```

2. **システム時刻の確認:**

```bash
# システム時刻の確認
date

# NTPサーバーとの同期
sudo ntpdate -s time.nist.gov
```

3. **時刻ずれ許容設定:**

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    clockTolerance: 300, // 5分間の時刻ずれを許容
  })
);
```

#### 問題: "Invalid token signature" (401エラー)

**症状:**

```json
{
  "error": "Invalid token signature",
  "statusCode": 401
}
```

**原因:**

- トークンが改ざんされている
- 間違ったCognito User Poolから発行されたトークン
- 公開鍵の取得に失敗

**解決方法:**

1. **Cognito設定の確認:**

```bash
# 環境変数の確認
echo "COGNITO_USER_POOL_ID: $COGNITO_USER_POOL_ID"
echo "COGNITO_CLIENT_ID: $COGNITO_CLIENT_ID"
```

2. **トークンの発行元確認:**

```typescript
// JWTトークンのデコード（検証なし）
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token issuer:', payload.iss);
console.log('Token audience:', payload.aud);
```

3. **公開鍵キャッシュのクリア:**

```typescript
import { CognitoKeyManagerImpl } from './middleware/cognito-key-manager';

const keyManager = new CognitoKeyManagerImpl(userPoolId, region);
keyManager.clearCache(); // キャッシュをクリア
```

### 2. 設定エラー関連

#### 問題: "Required environment variable COGNITO_USER_POOL_ID is not set"

**症状:**

```
Error: Required environment variable COGNITO_USER_POOL_ID is not set in production
```

**原因:**

- 必須環境変数が設定されていない
- 環境変数名が間違っている

**解決方法:**

1. **環境変数の設定確認:**

```bash
# 環境変数の確認
env | grep COGNITO

# 必要な環境変数の設定
export COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
export COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. **.envファイルの確認:**

```bash
# .envファイルの内容確認
cat .env | grep COGNITO
```

#### 問題: "Mock authentication is not allowed in production environment"

**症状:**

```json
{
  "error": "Authentication configuration error",
  "statusCode": 500
}
```

**原因:**

- 本番環境でモック認証が有効になっている

**解決方法:**

```bash
# 本番環境では必ずfalseに設定
export ENABLE_MOCK_AUTH=false
export NODE_ENV=production
```

### 3. ネットワーク・接続エラー関連

#### 問題: "Failed to fetch Cognito public keys"

**症状:**

```json
{
  "error": "Internal server error",
  "statusCode": 500
}
```

**原因:**

- Cognito JWKSエンドポイントへの接続に失敗
- ネットワーク制限やファイアウォール
- DNS解決の問題

**解決方法:**

1. **ネットワーク接続の確認:**

```bash
# Cognito JWKSエンドポイントへの接続確認
curl -I https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_xxxxxxxxx/.well-known/jwks.json
```

2. **DNS解決の確認:**

```bash
# DNS解決の確認
nslookup cognito-idp.ap-northeast-1.amazonaws.com
```

3. **プロキシ設定の確認:**

```bash
# プロキシ環境変数の確認
echo "HTTP_PROXY: $HTTP_PROXY"
echo "HTTPS_PROXY: $HTTPS_PROXY"
```

#### 問題: "Connection timeout"

**症状:**

- リクエストがタイムアウトする
- 応答が遅い

**解決方法:**

1. **タイムアウト設定の調整:**

```typescript
// fetch のタイムアウト設定
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒

try {
  const response = await fetch(jwksUrl, {
    signal: controller.signal,
  });
} finally {
  clearTimeout(timeoutId);
}
```

2. **リトライ機能の実装:**

```typescript
const retryFetch = async (url: string, retries = 3): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
};
```

### 4. パフォーマンス関連

#### 問題: 認証処理が遅い

**症状:**

- APIレスポンスが遅い
- タイムアウトが発生する

**原因:**

- 公開鍵キャッシュが効いていない
- 毎回Cognitoから公開鍵を取得している

**解決方法:**

1. **キャッシュ統計の確認:**

```typescript
import { CognitoKeyManagerImpl } from './middleware/cognito-key-manager';

const keyManager = new CognitoKeyManagerImpl(userPoolId, region);
const stats = keyManager.getCacheStats();

console.log('Cache statistics:', {
  keyCount: stats.keyCount,
  cacheAge: stats.cacheAge,
  isValid: stats.isValid,
  hitRate: stats.hitCount / (stats.hitCount + stats.missCount),
});
```

2. **キャッシュ時間の調整:**

```typescript
app.use(
  '/api/*',
  jwtAuthMiddleware({
    cacheTimeout: 3600, // 1時間キャッシュ
  })
);
```

3. **事前ウォームアップ:**

```typescript
// アプリケーション起動時に公開鍵を事前取得
const keyManager = new CognitoKeyManagerImpl(userPoolId, region);
await keyManager.warmupCache();
```

#### 問題: メモリ使用量が多い

**症状:**

- メモリ使用量が増加し続ける
- OutOfMemoryエラーが発生

**原因:**

- キャッシュがクリアされていない
- メモリリークが発生している

**解決方法:**

1. **定期的なキャッシュクリア:**

```typescript
// 定期的にキャッシュをクリア（例：1時間ごと）
setInterval(
  () => {
    keyManager.clearCache();
  },
  60 * 60 * 1000
);
```

2. **メモリ使用量の監視:**

```typescript
// メモリ使用量の監視
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
  });
}, 30000);
```

### 5. 開発環境特有の問題

#### 問題: モック認証が動作しない

**症状:**

- 開発環境でも実際のCognito認証が要求される
- モックユーザー情報が取得できない

**解決方法:**

1. **環境変数の確認:**

```bash
# 開発環境でのモック認証設定
export NODE_ENV=development
export ENABLE_MOCK_AUTH=true
```

2. **設定の動的確認:**

```typescript
import { config } from '../config/environment';

console.log('Mock auth configuration:', {
  nodeEnv: config.NODE_ENV,
  enableMockAuth: config.ENABLE_MOCK_AUTH,
  mockUserId: config.MOCK_USER_ID,
});
```

#### 問題: cognito-localとの連携エラー

**症状:**

- ローカルCognitoエミュレーターに接続できない
- トークンの検証に失敗する

**解決方法:**

1. **cognito-localの起動確認:**

```bash
# cognito-localの起動確認
docker ps | grep cognito-local

# ログの確認
docker logs cognito-local-container
```

2. **エンドポイント設定:**

```typescript
// 開発環境でのエンドポイント設定
const cognitoEndpoint =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:9229'
    : `https://cognito-idp.${region}.amazonaws.com`;
```

### 6. ログとデバッグ

#### デバッグログの有効化

```typescript
// 詳細なデバッグログを有効化
process.env.LOG_LEVEL = 'DEBUG';

// 認証処理のトレース
app.use('/api/*', async (c, next) => {
  const start = Date.now();
  console.log(
    `[AUTH] Starting authentication for ${c.req.method} ${c.req.path}`
  );

  try {
    await next();
    console.log(`[AUTH] Authentication successful in ${Date.now() - start}ms`);
  } catch (error) {
    console.log(
      `[AUTH] Authentication failed in ${Date.now() - start}ms:`,
      error
    );
    throw error;
  }
});
```

#### エラーログの分析

```typescript
// 構造化ログの出力
import { logger } from '../utils/logger';

const logAuthError = (error: any, context: any) => {
  logger.error('Authentication error', {
    errorType: error.type || 'UNKNOWN',
    errorMessage: error.message,
    requestId: context.requestId,
    userId: context.userId,
    endpoint: context.endpoint,
    userAgent: context.userAgent,
    ipAddress: context.ipAddress,
    timestamp: new Date().toISOString(),
  });
};
```

## 診断ツール

### 1. 認証状態チェッカー

```typescript
// 認証状態の診断
export const diagnoseAuthState = (c: Context) => {
  const authHeader = c.req.header('Authorization');
  const user = c.get('user');
  const isAuth = c.get('isAuthenticated');

  return {
    hasAuthHeader: !!authHeader,
    authHeaderFormat: authHeader?.startsWith('Bearer ') ? 'valid' : 'invalid',
    hasUser: !!user,
    isAuthenticated: !!isAuth,
    userInfo: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      : null,
  };
};
```

### 2. 設定検証ツール

```typescript
// 設定の検証
export const validateAuthConfig = () => {
  const issues: string[] = [];

  if (!process.env.COGNITO_USER_POOL_ID) {
    issues.push('COGNITO_USER_POOL_ID is not set');
  }

  if (!process.env.COGNITO_CLIENT_ID) {
    issues.push('COGNITO_CLIENT_ID is not set');
  }

  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ENABLE_MOCK_AUTH === 'true'
  ) {
    issues.push('Mock authentication is enabled in production');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
```

### 3. パフォーマンス測定

```typescript
// 認証パフォーマンスの測定
export const measureAuthPerformance = async (token: string) => {
  const start = Date.now();

  try {
    const { jwtValidator } = initializeAuthComponents();
    const payload = await jwtValidator.validateToken(token);

    return {
      success: true,
      duration: Date.now() - start,
      userId: payload.sub,
    };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
```

## 緊急時対応

### 1. 認証システム無効化

```typescript
// 緊急時の認証バイパス（本番環境では使用禁止）
const emergencyBypass = process.env.EMERGENCY_AUTH_BYPASS === 'true';

if (emergencyBypass && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ EMERGENCY: Authentication bypass is enabled');

  app.use('/api/*', (c, next) => {
    c.set('user', {
      id: 'emergency-user',
      email: 'emergency@system.local',
      name: 'Emergency User',
      cognitoSub: 'emergency-sub',
    });
    c.set('isAuthenticated', true);
    return next();
  });
}
```

### 2. ヘルスチェックエンドポイント

```typescript
// 認証システムのヘルスチェック
app.get('/health/auth', async c => {
  try {
    const keyManager = new CognitoKeyManagerImpl(
      process.env.COGNITO_USER_POOL_ID!,
      process.env.AWS_REGION!
    );

    // 公開鍵の取得テスト
    const testKid = 'test-key-id';
    await keyManager.getPublicKey(testKid).catch(() => {
      // エラーは無視（テスト目的）
    });

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      config: {
        mockAuthEnabled: process.env.ENABLE_MOCK_AUTH === 'true',
        cacheTimeout: process.env.JWT_CACHE_TTL,
        environment: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});
```

## サポート情報

### ログ収集

問題が発生した場合、以下の情報を収集してください：

1. **エラーメッセージとスタックトレース**
2. **環境変数設定（機密情報は除く）**
3. **リクエストヘッダー（Authorizationヘッダーは部分的に）**
4. **システム時刻とタイムゾーン**
5. **ネットワーク接続状況**

### 連絡先

- **開発チーム**: dev-team@company.com
- **インフラチーム**: infra-team@company.com
- **緊急時**: emergency@company.com

### 参考資料

- [Amazon Cognito トラブルシューティング](https://docs.aws.amazon.com/cognito/latest/developerguide/troubleshooting.html)
- [JWT デバッガー](https://jwt.io/)
- [Hono ドキュメント](https://hono.dev/)
- [Node.js デバッグガイド](https://nodejs.org/en/docs/guides/debugging-getting-started/)
