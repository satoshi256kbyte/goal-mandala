# モック認証機能 使用ガイド

## 概要

このドキュメントでは、JWT認証ミドルウェアのモック認証機能の使用方法について説明します。
モック認証機能は開発効率を向上させるために実装されており、要件6.1、6.2、6.3に対応しています。

## 機能概要

### 要件6.1: 環境変数による認証方式切り替え機能

環境変数 `ENABLE_MOCK_AUTH` を使用して、モック認証と実Cognito認証を切り替えることができます。

```bash
# モック認証を有効にする
ENABLE_MOCK_AUTH=true

# モック認証を無効にする（実Cognito認証を使用）
ENABLE_MOCK_AUTH=false
```

### 要件6.2: 開発環境用固定ユーザー情報の設定

モック認証時に使用するユーザー情報を環境変数で設定できます。

```bash
# モックユーザーの基本情報
MOCK_USER_ID=dev-user-001
MOCK_USER_EMAIL=developer@localhost
MOCK_USER_NAME=Local Developer
```

### 要件6.3: 本番環境での実Cognito検証の確保

本番環境では自動的にモック認証が無効になり、実Cognito認証のみが使用されます。

## 使用方法

### 1. 基本的な使用方法

```typescript
import { jwtAuthMiddleware } from './middleware/auth';

// 環境変数の設定に従って自動的に認証方式を選択
app.use('/api/protected/*', jwtAuthMiddleware());
```

### 2. カスタムモックユーザーの設定

```typescript
import { jwtAuthMiddleware } from './middleware/auth';
import { MockUserConfig } from './middleware/types';

const customMockUser: MockUserConfig = {
  id: 'test-user-123',
  email: 'test.user@company.com',
  name: 'Test User',
  cognitoSub: 'test-cognito-sub-123',
  customAttributes: {
    department: 'Engineering',
    role: 'Developer',
  },
};

app.use(
  '/api/custom/*',
  jwtAuthMiddleware({
    enableMockAuth: true,
    mockUser: customMockUser,
  })
);
```

### 3. 環境別設定

```typescript
function getAuthMiddleware() {
  switch (process.env.NODE_ENV) {
    case 'development':
      return jwtAuthMiddleware({
        enableMockAuth: true,
        mockUser: {
          id: 'dev-user-001',
          email: 'developer@localhost',
          name: 'Local Developer',
          cognitoSub: 'dev-cognito-sub',
        },
      });

    case 'staging':
    case 'production':
      return jwtAuthMiddleware({
        enableMockAuth: false,
        userPoolId: process.env.COGNITO_USER_POOL_ID!,
        clientId: process.env.COGNITO_CLIENT_ID!,
        region: process.env.AWS_REGION!,
      });

    default:
      return jwtAuthMiddleware();
  }
}

app.use('/api/*', getAuthMiddleware());
```

## 環境変数設定

### 開発環境 (.env.development)

```bash
# モック認証を有効にする
ENABLE_MOCK_AUTH=true

# モックユーザー情報
MOCK_USER_ID=dev-user-001
MOCK_USER_EMAIL=developer@localhost
MOCK_USER_NAME=Local Developer

# ログレベル
LOG_LEVEL=DEBUG
```

### ステージング環境 (.env.staging)

```bash
# モック認証を無効にする
ENABLE_MOCK_AUTH=false

# 実Cognito設定
COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
AWS_REGION=ap-northeast-1

# ログレベル
LOG_LEVEL=INFO
```

### 本番環境 (.env.production)

```bash
# モック認証を無効にする（必須）
ENABLE_MOCK_AUTH=false

# 実Cognito設定（必須）
COGNITO_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
AWS_REGION=ap-northeast-1

# セキュリティ設定
ENABLE_SECURITY_AUDIT=true
LOG_LEVEL=WARN
```

## セキュリティ考慮事項

### 1. 本番環境での制限

- 本番環境では `ENABLE_MOCK_AUTH=true` が設定されていてもエラーが発生します
- 本番環境では必ず実Cognito認証が使用されます

### 2. 設定検証

- 無効なメールアドレスやユーザーIDが設定された場合、起動時にエラーが発生します
- 本番環境でモック認証が有効な場合、警告ログが出力されます

### 3. ログ出力

モック認証使用時は以下の情報がログに記録されます：

```json
{
  "level": "info",
  "message": "Mock authentication successful",
  "userId": "dev-user-001",
  "email": "developer@localhost",
  "name": "Local Developer",
  "authMode": "mock",
  "environment": "development",
  "requestId": "req-1234567890"
}
```

## トラブルシューティング

### 1. モック認証が動作しない

**症状**: モック認証が有効なはずなのに401エラーが発生する

**原因と対処法**:

- `ENABLE_MOCK_AUTH=true` が正しく設定されているか確認
- 本番環境でモック認証を使用しようとしていないか確認
- 環境変数が正しく読み込まれているか確認

### 2. 本番環境でエラーが発生する

**症状**: 本番環境で500エラーが発生する

**原因と対処法**:

- `ENABLE_MOCK_AUTH=false` に設定する
- 実Cognito設定（`COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`）が正しく設定されているか確認

### 3. カスタムモックユーザーが反映されない

**症状**: カスタム設定したモックユーザー情報が使用されない

**原因と対処法**:

- `MockUserConfig` の型定義に従って正しく設定されているか確認
- ミドルウェアのオプションで `mockUser` が正しく渡されているか確認

## テスト方法

### 1. ユニットテスト

```bash
# モック認証機能のテストを実行
npm test -- mock-auth.test.ts
```

### 2. 手動テスト

```bash
# 開発環境でモック認証をテスト
curl -X GET http://localhost:3001/api/protected/profile

# 実Cognito認証をテスト（Authorizationヘッダー付き）
curl -X GET http://localhost:3001/api/protected/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 関連ファイル

- `packages/backend/src/middleware/auth.ts` - メインの認証ミドルウェア
- `packages/backend/src/middleware/types.ts` - 型定義
- `packages/backend/src/config/environment.ts` - 環境変数管理
- `packages/backend/src/middleware/mock-auth-example.ts` - 使用例
- `packages/backend/src/middleware/mock-auth.test.ts` - テストファイル

## 注意事項

1. **セキュリティ**: モック認証は開発・テスト環境でのみ使用してください
2. **パフォーマンス**: モック認証は実Cognito認証よりも高速ですが、本番環境の動作とは異なります
3. **デバッグ**: モック認証使用時は適切なログが出力されるため、デバッグに活用してください
4. **CI/CD**: CI/CD環境では環境に応じて適切な認証方式を選択してください
