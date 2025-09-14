# JWT認証ミドルウェア

Amazon Cognitoから発行されたJWTトークンを検証し、保護されたAPIエンドポイントへのアクセス制御を提供するHonoミドルウェアです。

## 特徴

- ✅ **Amazon Cognito統合**: Cognito User PoolのJWTトークンを検証
- ✅ **高性能キャッシュ**: 公開鍵のメモリキャッシュでパフォーマンス最適化
- ✅ **型安全**: TypeScriptによる完全な型サポート
- ✅ **開発者フレンドリー**: モック認証による開発効率向上
- ✅ **包括的エラーハンドリング**: 詳細なエラー分類と統一レスポンス
- ✅ **セキュリティ重視**: 本番環境での厳格な検証とセキュリティ監査
- ✅ **柔軟な設定**: 環境別設定とカスタマイズ可能なオプション

## クイックスタート

### 1. インストール

```bash
npm install hono
```

### 2. 基本的な使用方法

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
  const user = getCurrentUser(c);
  return c.json({ user });
});
```

### 3. 環境変数設定

```bash
# 必須設定
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-northeast-1

# オプション設定
ENABLE_MOCK_AUTH=false
JWT_CACHE_TTL=3600
```

## 主要機能

### 認証ミドルウェア

```typescript
// 必須認証
app.use('/api/protected/*', jwtAuthMiddleware());

// オプショナル認証
app.use('/api/public/*', optionalAuthMiddleware());
```

### ユーザー情報取得

```typescript
import {
  getCurrentUser,
  getCurrentUserOptional,
  isAuthenticated,
} from './middleware/auth';

app.get('/api/user/profile', c => {
  const user = getCurrentUser(c); // 認証必須
  return c.json({ user });
});

app.get('/api/user/preferences', c => {
  const user = getCurrentUserOptional(c); // 認証オプション
  if (user) {
    return c.json({ preferences: getUserPreferences(user.id) });
  }
  return c.json({ preferences: getDefaultPreferences() });
});
```

### 権限・ロール・グループチェック

```typescript
import { hasPermission, hasRole, hasGroup } from './middleware/auth';

app.get('/api/admin/users', c => {
  if (!hasPermission(c, 'admin:users:read')) {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  return c.json({ users: getAllUsers() });
});
```

### 開発環境でのモック認証

```typescript
// 開発環境でのモック認証
app.use(
  '/api/*',
  jwtAuthMiddleware({
    enableMockAuth: process.env.NODE_ENV === 'development',
    mockUser: {
      id: 'dev-user-123',
      email: 'dev@example.com',
      name: 'Development User',
    },
  })
);
```

## 設定オプション

### AuthMiddlewareOptions

```typescript
interface AuthMiddlewareOptions {
  userPoolId: string; // Cognito User Pool ID
  clientId: string; // Cognito Client ID
  region: string; // AWSリージョン
  enableMockAuth?: boolean; // モック認証有効化
  mockUser?: MockUserConfig; // モックユーザー設定
  cacheTimeout?: number; // キャッシュタイムアウト（秒）
  allowedTokenUse?: ('access' | 'id')[]; // 許可するトークン種別
  clockTolerance?: number; // 時刻ずれ許容（秒）
  requireEmailVerification?: boolean; // メール認証必須
  allowedGroups?: string[]; // 許可するグループ
  customClaimsValidator?: (payload: CognitoJWTPayload) => boolean;
  onAuthSuccess?: (context: AuthSuccessContext) => void;
  onAuthFailure?: (context: AuthFailureContext) => void;
}
```

## エラーハンドリング

### 認証エラーの種類

| エラータイプ      | HTTPステータス | 説明                      |
| ----------------- | -------------- | ------------------------- |
| TOKEN_MISSING     | 401            | Authorizationヘッダーなし |
| TOKEN_INVALID     | 401            | トークン形式不正          |
| TOKEN_EXPIRED     | 401            | トークン有効期限切れ      |
| SIGNATURE_INVALID | 401            | 署名検証失敗              |
| CLAIMS_INVALID    | 401            | クレーム検証失敗          |
| INTERNAL_ERROR    | 500            | サーバー内部エラー        |

### エラーレスポンス例

```json
{
  "error": "Token has expired",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## パフォーマンス

### キャッシュ機能

- **公開鍵キャッシュ**: Cognito公開鍵をメモリにキャッシュ
- **TTL設定**: デフォルト1時間、設定可能
- **自動更新**: 検証失敗時の自動キャッシュクリア

### パフォーマンス目標

- 認証処理: < 100ms（キャッシュヒット時）
- 初回公開鍵取得: < 500ms
- キャッシュヒット率: > 90%

## セキュリティ

### セキュリティ機能

- **厳格な署名検証**: RS256アルゴリズムによる署名検証
- **クレーム検証**: iss、aud、token_use、expの厳密チェック
- **本番環境保護**: 本番環境でのモック認証無効化
- **セキュリティ監査**: 認証イベントのログ記録

### セキュリティベストプラクティス

```typescript
// 本番環境での推奨設定
const productionAuthOptions = {
  enableMockAuth: false,
  requireEmailVerification: true,
  enableSecurityAudit: true,
  cacheTimeout: 1800, // 30分
  clockTolerance: 60, // 1分
};
```

## 開発・テスト

### 開発環境設定

```bash
# 開発環境用設定
NODE_ENV=development
ENABLE_MOCK_AUTH=true
MOCK_USER_ID=dev-user-001
MOCK_USER_EMAIL=developer@example.com
MOCK_USER_NAME=Development User
LOG_LEVEL=DEBUG
```

### テスト

```bash
# ユニットテスト実行
npm test

# カバレッジ確認
npm run test:coverage

# 統合テスト実行
npm run test:integration
```

## ドキュメント

### 詳細ドキュメント

- [使用方法ガイド](./auth-usage-guide.md) - 詳細な使用方法と実装例
- [環境変数設定例](./auth-environment-example.md) - 環境別設定例
- [トラブルシューティング](./auth-troubleshooting-guide.md) - 問題解決ガイド
- [API仕様書](./auth-api-documentation.md) - 完全なAPI仕様

### 型定義

```typescript
// 主要な型定義
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly cognitoSub: string;
  readonly cognitoUsername?: string;
  readonly groups?: readonly string[];
  readonly emailVerified?: boolean;
}

export interface AuthContext {
  readonly user: AuthenticatedUser;
  readonly isAuthenticated: boolean;
  readonly metadata: AuthMetadata;
}
```

## 要件対応

このミドルウェアは以下の要件に対応しています：

### 認証機能（要件1）

- ✅ 有効なJWTトークンの検証とリクエスト処理
- ✅ 無効・期限切れトークンの401エラー返却
- ✅ ユーザー情報のリクエストコンテキスト追加

### Cognito統合（要件2）

- ✅ Cognito公開鍵による署名検証
- ✅ iss、aud、token_useクレームの検証

### エラーハンドリング（要件3）

- ✅ 適切なHTTPステータスコードとエラーメッセージ
- ✅ セキュリティログの記録

### ユーザー情報アクセス（要件4）

- ✅ 型安全なユーザー情報アクセス
- ✅ 必要な情報の保証

### パフォーマンス最適化（要件5）

- ✅ 公開鍵のメモリキャッシュ
- ✅ キャッシュヒット時の高速処理
- ✅ 検証失敗時の自動キャッシュクリア

### 開発効率向上（要件6）

- ✅ 環境変数による認証方式切り替え
- ✅ 開発環境でのモック認証
- ✅ 本番環境での実Cognito検証

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## サポート

- **技術サポート**: tech-support@company.com
- **ドキュメント**: docs@company.com
- **バグレポート**: bugs@company.com

## 変更履歴

### v1.0.0 (2024-01-01)

- 初版リリース
- 基本的なJWT認証機能
- Cognito統合
- モック認証機能

### v1.1.0 (2024-01-15)

- オプショナル認証機能追加
- パフォーマンス改善
- エラーハンドリング強化

### v1.2.0 (2024-02-01)

- 権限・ロール・グループチェック機能
- セキュリティ監査機能
- 詳細ログ機能
