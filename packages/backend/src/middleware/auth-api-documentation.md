# JWT認証ミドルウェア API仕様書

## 概要

JWT認証ミドルウェアは、Amazon Cognitoから発行されたJWTトークンを検証し、保護されたAPIエンドポイントへのアクセス制御を提供するHonoミドルウェアです。

## 認証方式

### Bearer Token認証

すべての保護されたエンドポイントは、HTTPヘッダーにBearerトークンを含める必要があります。

```http
Authorization: Bearer <JWT_TOKEN>
```

### サポートするトークン種別

- **Access Token**: Cognitoから発行されるアクセストークン
- **ID Token**: Cognitoから発行されるIDトークン

## エンドポイント仕様

### 認証が必要なエンドポイント

#### リクエストヘッダー

| ヘッダー名    | 必須 | 形式               | 説明                   |
| ------------- | ---- | ------------------ | ---------------------- |
| Authorization | ✓    | `Bearer <token>`   | Cognito JWT トークン   |
| Content-Type  | -    | `application/json` | リクエストボディの形式 |
| X-Request-ID  | -    | `string`           | リクエスト追跡用ID     |

#### レスポンスヘッダー

| ヘッダー名   | 説明               |
| ------------ | ------------------ |
| Content-Type | `application/json` |
| X-Request-ID | リクエスト追跡用ID |

### 認証エラーレスポンス

#### 401 Unauthorized

**トークンが提供されていない場合:**

```json
{
  "error": "Authorization header is required",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**無効なトークン形式:**

```json
{
  "error": "Bearer token is required",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**トークンの有効期限切れ:**

```json
{
  "error": "Token has expired",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**無効な署名:**

```json
{
  "error": "Invalid token signature",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**無効なクレーム:**

```json
{
  "error": "Invalid token claims",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 403 Forbidden

**権限不足:**

```json
{
  "error": "Insufficient permissions",
  "statusCode": 403,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 500 Internal Server Error

**サーバー内部エラー:**

```json
{
  "error": "Internal server error",
  "statusCode": 500,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## ユーザー情報取得API

### GET /api/user/profile

認証されたユーザーのプロフィール情報を取得します。

#### リクエスト

```http
GET /api/user/profile
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### レスポンス

**成功時 (200 OK):**

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "cognitoSub": "cognito-sub-123",
    "cognitoUsername": "johndoe",
    "groups": ["users", "premium"],
    "emailVerified": true,
    "phoneNumber": "+81-90-1234-5678",
    "phoneNumberVerified": true
  }
}
```

### GET /api/user/context

認証コンテキストの詳細情報を取得します。

#### リクエスト

```http
GET /api/user/context
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### レスポンス

**成功時 (200 OK):**

```json
{
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "cognitoSub": "cognito-sub-123"
  },
  "isAuthenticated": true,
  "metadata": {
    "authMethod": "jwt",
    "tokenType": "access",
    "issuedAt": "2024-01-01T00:00:00.000Z",
    "expiresAt": "2024-01-01T01:00:00.000Z",
    "sessionId": "session-123"
  }
}
```

## 権限チェックAPI

### GET /api/user/permissions

ユーザーの権限情報を取得します。

#### リクエスト

```http
GET /api/user/permissions
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### レスポンス

**成功時 (200 OK):**

```json
{
  "permissions": ["read:profile", "write:profile", "read:goals"],
  "roles": ["user", "premium"],
  "groups": ["users", "premium-users"]
}
```

### POST /api/user/check-permission

特定の権限を持っているかチェックします。

#### リクエスト

```http
POST /api/user/check-permission
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "permission": "admin:users:delete"
}
```

#### レスポンス

**成功時 (200 OK):**

```json
{
  "hasPermission": false,
  "permission": "admin:users:delete"
}
```

## ヘルスチェックAPI

### GET /health/auth

認証システムの状態を確認します。

#### リクエスト

```http
GET /health/auth
```

#### レスポンス

**正常時 (200 OK):**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "config": {
    "mockAuthEnabled": false,
    "cacheTimeout": "3600",
    "environment": "production"
  }
}
```

**異常時 (500 Internal Server Error):**

```json
{
  "status": "unhealthy",
  "error": "Failed to connect to Cognito",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## JWT トークン仕様

### トークン構造

JWT トークンは以下の構造を持ちます：

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.signature
```

### ヘッダー (Header)

```json
{
  "alg": "RS256",
  "kid": "key-id-123",
  "typ": "JWT"
}
```

| フィールド | 必須 | 説明                     |
| ---------- | ---- | ------------------------ |
| alg        | ✓    | 署名アルゴリズム (RS256) |
| kid        | ✓    | 公開鍵ID                 |
| typ        | ✓    | トークンタイプ (JWT)     |

### ペイロード (Payload)

```json
{
  "sub": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "iss": "https://cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_xxxxxxxxx",
  "aud": "client-id-123",
  "token_use": "access",
  "exp": 1640995200,
  "iat": 1640991600,
  "auth_time": 1640991600,
  "cognito:username": "johndoe",
  "cognito:groups": ["users", "premium"],
  "email_verified": true,
  "phone_number": "+81-90-1234-5678",
  "phone_number_verified": true
}
```

#### 必須クレーム

| クレーム  | 説明                            |
| --------- | ------------------------------- |
| sub       | ユーザーID（サブジェクト）      |
| email     | メールアドレス                  |
| iss       | 発行者（Cognito User Pool）     |
| aud       | 対象者（Client ID）             |
| token_use | トークン種別 (access/id)        |
| exp       | 有効期限（Unix タイムスタンプ） |
| iat       | 発行時刻（Unix タイムスタンプ） |

#### オプションクレーム

| クレーム              | 説明              |
| --------------------- | ----------------- |
| name                  | 表示名            |
| auth_time             | 認証時刻          |
| cognito:username      | Cognitoユーザー名 |
| cognito:groups        | 所属グループ      |
| email_verified        | メール認証済み    |
| phone_number          | 電話番号          |
| phone_number_verified | 電話番号認証済み  |

## 開発環境でのモック認証

### モック認証の有効化

開発環境では、実際のCognitoトークンの代わりにモック認証を使用できます。

#### 環境変数設定

```bash
ENABLE_MOCK_AUTH=true
MOCK_USER_ID=dev-user-001
MOCK_USER_EMAIL=developer@example.com
MOCK_USER_NAME=Development User
```

#### モックユーザー情報

モック認証が有効な場合、以下のユーザー情報が返されます：

```json
{
  "id": "dev-user-001",
  "email": "developer@example.com",
  "name": "Development User",
  "cognitoSub": "mock-cognito-dev-user-001",
  "cognitoUsername": "mock-dev-user-001",
  "groups": ["mock-users"],
  "emailVerified": true,
  "phoneNumberVerified": false
}
```

### モック認証の使用方法

モック認証が有効な場合、Authorizationヘッダーは不要です：

```http
GET /api/protected/profile
# Authorization ヘッダーなしでアクセス可能
```

## セキュリティ考慮事項

### トークンの取り扱い

1. **保存場所**: トークンはセキュアな場所に保存してください
   - ✅ HTTPOnly Cookie
   - ✅ セキュアなローカルストレージ
   - ❌ 平文でのローカルストレージ
   - ❌ URLパラメータ

2. **送信方法**: 必ずHTTPSを使用してください
   - ✅ `https://api.example.com`
   - ❌ `http://api.example.com`

3. **有効期限**: トークンの有効期限を確認してください
   - アクセストークン: 通常1時間
   - IDトークン: 通常1時間
   - リフレッシュトークン: 通常30日

### レート制限

認証エンドポイントには以下のレート制限が適用されます：

- **認証試行**: 1分間に10回まで
- **トークン検証**: 1秒間に100回まで

制限を超えた場合、429 Too Many Requestsエラーが返されます：

```json
{
  "error": "Rate limit exceeded",
  "statusCode": 429,
  "retryAfter": 60
}
```

## SDKとライブラリ

### JavaScript/TypeScript

```typescript
// 認証ヘルパー関数の使用例
import { getCurrentUser, isAuthenticated } from './middleware/auth';

// Honoハンドラー内での使用
app.get('/api/profile', c => {
  if (!isAuthenticated(c)) {
    return c.json({ error: 'Not authenticated' }, 401);
  }

  const user = getCurrentUser(c);
  return c.json({ user });
});
```

### cURL

```bash
# 認証付きAPIリクエスト
curl -X GET \
  https://api.example.com/api/user/profile \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Postman

```json
{
  "name": "Get User Profile",
  "request": {
    "method": "GET",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{jwt_token}}",
        "type": "text"
      }
    ],
    "url": {
      "raw": "{{base_url}}/api/user/profile",
      "host": ["{{base_url}}"],
      "path": ["api", "user", "profile"]
    }
  }
}
```

## 変更履歴

| バージョン | 日付       | 変更内容                 |
| ---------- | ---------- | ------------------------ |
| 1.0.0      | 2024-01-01 | 初版リリース             |
| 1.1.0      | 2024-01-15 | オプショナル認証機能追加 |
| 1.2.0      | 2024-02-01 | 権限チェック機能追加     |
| 1.3.0      | 2024-02-15 | モック認証機能強化       |

## サポート

### 問い合わせ先

- **技術サポート**: tech-support@company.com
- **ドキュメント**: docs@company.com
- **バグレポート**: bugs@company.com

### 参考資料

- [Amazon Cognito ドキュメント](https://docs.aws.amazon.com/cognito/)
- [JWT 仕様 (RFC 7519)](https://tools.ietf.org/html/rfc7519)
- [Hono ドキュメント](https://hono.dev/)
- [OAuth 2.0 仕様](https://tools.ietf.org/html/rfc6749)
