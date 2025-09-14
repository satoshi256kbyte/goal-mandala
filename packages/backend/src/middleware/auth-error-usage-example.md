# JWT認証エラーハンドリング使用例

## 概要

JWT認証ミドルウェアのエラーハンドリング機能は、要件3.1, 3.2, 3.3, 3.4に基づいて実装されています：

- **要件3.1**: 適切なHTTPステータスコードとエラーメッセージを返す
- **要件3.2**: トークンの形式が不正な場合は400 Bad Requestエラーを返す
- **要件3.3**: Cognito公開鍵の取得に失敗した場合は500 Internal Server Errorエラーを返す
- **要件3.4**: セキュリティ上重要でない範囲でエラー詳細をログに記録する

## 基本的な使用方法

### 1. 認証ミドルウェアの適用

```typescript
import { Hono } from 'hono';
import { jwtAuthMiddleware } from './middleware/auth';

const app = new Hono();

// 保護されたルートに認証ミドルウェアを適用
app.use(
  '/api/protected/*',
  jwtAuthMiddleware({
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    clientId: process.env.COGNITO_CLIENT_ID!,
    region: process.env.AWS_REGION!,
  })
);

app.get('/api/protected/profile', c => {
  const user = c.get('user');
  return c.json({ user });
});
```

### 2. エラーレスポンスの処理

認証エラーが発生した場合、以下のような統一されたエラーレスポンスが返されます：

```json
{
  "error": "TOKEN_INVALID",
  "message": "Invalid token format",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## エラータイプとHTTPステータスコード

| エラータイプ        | HTTPステータス | 説明                      | 例                                      |
| ------------------- | -------------- | ------------------------- | --------------------------------------- |
| `TOKEN_MISSING`     | 401            | Authorizationヘッダーなし | `Authorization`ヘッダーが存在しない     |
| `TOKEN_INVALID`     | 400            | トークン形式不正          | JWT形式が不正、デコードに失敗           |
| `TOKEN_EXPIRED`     | 401            | トークン有効期限切れ      | `exp`クレームが現在時刻より前           |
| `SIGNATURE_INVALID` | 401            | 署名検証失敗              | Cognito公開鍵による署名検証に失敗       |
| `CLAIMS_INVALID`    | 401            | クレーム検証失敗          | `iss`, `aud`, `token_use`クレームが不正 |
| `INTERNAL_ERROR`    | 500            | サーバー内部エラー        | Cognito公開鍵取得失敗、JWKS取得エラー   |

## セキュリティログ

### 認証成功ログ

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "event": "AUTH_SUCCESS",
  "userId": "user-123",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req-abc123",
  "details": {
    "endpoint": "/api/protected/profile",
    "method": "GET"
  }
}
```

### 認証失敗ログ

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "event": "AUTH_FAILURE",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req-abc123",
  "details": {
    "errorType": "TOKEN_INVALID",
    "endpoint": "/api/protected/profile",
    "method": "GET",
    "errorCategory": "malformed_token",
    "hasToken": true
  }
}
```

### エラーログ

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "errorType": "TOKEN_MISSING",
  "message": "Authorization header is required",
  "requestId": "req-abc123",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.100"
}
```

## 環境別エラーメッセージ

### 本番環境（セキュリティ重視）

本番環境では、セキュリティ上の理由から詳細なエラー情報を隠します：

```typescript
// 本番環境でのエラーメッセージ例
{
  "TOKEN_MISSING": "Authentication required",
  "TOKEN_INVALID": "Invalid token format",
  "TOKEN_EXPIRED": "Token has expired",
  "SIGNATURE_INVALID": "Invalid token signature",
  "CLAIMS_INVALID": "Invalid token claims",
  "INTERNAL_ERROR": "Authentication service temporarily unavailable"
}
```

### 開発環境（デバッグ重視）

開発環境では、デバッグのために詳細なエラー情報を提供します：

```typescript
// 開発環境では元のエラーメッセージをそのまま返す
'Invalid issuer. Expected: https://cognito-idp.ap-northeast-1.amazonaws.com/pool-id, Got: https://example.com';
```

## カスタムエラーハンドリング

### 独自のエラーハンドラーの実装

```typescript
import {
  AuthErrorHandler,
  AuthErrorContext,
} from './middleware/auth-error-handler';
import { AuthErrorType } from './middleware/types';

// カスタムエラーハンドラー
class CustomAuthErrorHandler extends AuthErrorHandler {
  static handleCustomError(error: unknown, context: AuthErrorContext) {
    // カスタムロジックを追加
    console.log('Custom error handling:', error);

    // 基本のエラーハンドリングを呼び出し
    super.handleAuthError(error, context);
  }
}
```

### エラー分類のカスタマイズ

```typescript
// 特定のエラーメッセージパターンを追加
const customError = new Error('Custom authentication error') as Error & {
  type: AuthErrorType;
};
customError.type = AuthErrorType.CLAIMS_INVALID;
throw customError;
```

## 監視とアラート

### 重要なセキュリティイベント

以下のエラータイプは重要なセキュリティイベントとして警告ログが記録されます：

- `SIGNATURE_INVALID`: 署名検証失敗（不正なトークンの可能性）
- `CLAIMS_INVALID`: クレーム検証失敗（偽造トークンの可能性）

### アラート設定例

```typescript
// CloudWatch Logsでのアラート設定例
{
  "filterPattern": "[timestamp, level=\"WARN\", message=\"Critical security event detected\"]",
  "metricTransformations": [
    {
      "metricName": "CriticalAuthFailures",
      "metricNamespace": "Authentication",
      "metricValue": "1"
    }
  ]
}
```

## トラブルシューティング

### よくあるエラーと対処法

1. **TOKEN_INVALID (400)**
   - 原因: JWT形式が不正、Base64デコードに失敗
   - 対処: クライアント側でトークン形式を確認

2. **SIGNATURE_INVALID (401)**
   - 原因: Cognito公開鍵による署名検証に失敗
   - 対処: トークンの有効性を確認、キャッシュクリアを試行

3. **INTERNAL_ERROR (500)**
   - 原因: Cognito JWKS取得に失敗
   - 対処: ネットワーク接続、Cognito設定を確認

### デバッグ方法

```typescript
// デバッグログの有効化
process.env.LOG_LEVEL = 'DEBUG';

// セキュリティ監査ログの有効化
process.env.ENABLE_SECURITY_AUDIT = 'true';
```

## セキュリティ考慮事項

1. **ログの機密情報除外**: JWTトークンの内容は直接ログに記録しない
2. **エラーメッセージの制限**: 本番環境では詳細なエラー情報を隠す
3. **レート制限**: 認証失敗の頻度を監視してレート制限を実装
4. **監査ログ**: すべての認証イベントを記録して監査可能にする

## パフォーマンス最適化

1. **キャッシュ活用**: Cognito公開鍵のキャッシュを適切に管理
2. **ログレベル調整**: 本番環境では不要なデバッグログを無効化
3. **エラー処理の最適化**: 頻繁なエラーパターンの処理を最適化
