# 設計書

## 概要

AWS SAM CLI環境を構築し、ローカル開発環境でLambda関数とAPI Gatewayをエミュレートできるシステムを設計する。モノレポ構成に適合し、既存のDocker Compose環境と連携する設計とする。

## アーキテクチャ

### システム構成

```
goal-mandala/
├── packages/
│   └── backend/
│       ├── src/
│       │   ├── handlers/          # Lambda関数ハンドラー
│       │   ├── middleware/         # 共通ミドルウェア
│       │   └── utils/             # ユーティリティ
│       ├── template.yaml          # SAMテンプレート
│       └── samconfig.toml         # SAM設定
├── tools/
│   └── scripts/
│       ├── sam-local-start.sh     # ローカルAPI起動スクリプト
│       └── sam-build.sh           # SAMビルドスクリプト
└── .env                           # 環境変数
```

### 技術スタック

- **AWS SAM CLI**: Lambda関数とAPI Gatewayのローカルエミュレーション
- **TypeScript**: Lambda関数の開発言語
- **Hono**: 軽量なWebフレームワーク
- **esbuild**: TypeScriptのビルドツール（高速ビルド）

## コンポーネントと インターフェース

### SAMテンプレート (template.yaml)

#### Lambda関数定義

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs18.x
    Environment:
      Variables:
        NODE_ENV: development
        DATABASE_URL: !Ref DatabaseUrl

Parameters:
  DatabaseUrl:
    Type: String
    Default: postgresql://postgres:password@localhost:5432/goal_mandala

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: dist/
      Handler: index.handler
      Events:
        ApiProxy:
          Type: Api
          Properties:
            Path: /{proxy+}
            Method: ANY
            RestApiId: !Ref ApiGateway
  
  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: local
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"
        AllowOrigin: "'http://localhost:5173'"
```

#### ビルド設定

```yaml
Metadata:
  AWS::Serverless::Function:
    BuildMethod: esbuild
    BuildProperties:
      Minify: false
      Target: "es2020"
      Sourcemap: true
      EntryPoints: 
        - src/index.ts
```

### Lambda関数テンプレート

#### メインハンドラー (src/index.ts)

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/aws-lambda'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

// ミドルウェア設定
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

app.use('*', logger())

// ヘルスチェックエンドポイント
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API ルート
app.route('/api/v1', apiRoutes)

// エラーハンドリング
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export const handler = handle(app)
```

#### 環境変数管理

```typescript
// src/config/environment.ts
export const config = {
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/goal_mandala',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-northeast-1',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  }
}
```

### SAM設定ファイル (samconfig.toml)

```toml
version = 0.1

[default]
[default.build]
[default.build.parameters]
cached = true
parallel = true

[default.local_start_api]
[default.local_start_api.parameters]
port = 3001
host = "0.0.0.0"
warm_containers = "EAGER"
parameter_overrides = "DatabaseUrl=postgresql://postgres:password@localhost:5432/goal_mandala"

[default.deploy]
[default.deploy.parameters]
stack_name = "goal-mandala-api"
s3_bucket = "goal-mandala-sam-artifacts"
s3_prefix = "goal-mandala-api"
region = "ap-northeast-1"
capabilities = "CAPABILITY_IAM"
parameter_overrides = "DatabaseUrl=postgresql://postgres:password@rds-endpoint:5432/goal_mandala"
```

## データモデル

### 環境変数スキーマ

```typescript
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production'
  DATABASE_URL: string
  JWT_SECRET: string
  AWS_REGION: string
  FRONTEND_URL: string
}
```

## エラーハンドリング

### エラー分類

1. **バリデーションエラー**: 400 Bad Request
2. **認証エラー**: 401 Unauthorized
3. **認可エラー**: 403 Forbidden
4. **リソース未発見**: 404 Not Found
5. **サーバーエラー**: 500 Internal Server Error

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  error: string
  message?: string
  details?: any
  timestamp: string
}
```

### ログ出力

```typescript
// src/utils/logger.ts
export const logError = (error: Error, context?: any) => {
  console.error({
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })
}
```

## テスト戦略

### ローカルテスト

1. **SAM Local API**: `sam local start-api`でローカルAPIサーバー起動
2. **ユニットテスト**: Jest + Supertest でAPIエンドポイントテスト
3. **統合テスト**: Docker Compose環境との連携テスト

### テスト環境

```bash
# ローカルAPI起動
sam local start-api --port 3001 --host 0.0.0.0

# テスト実行
npm run test:api
```

### モックデータ

```typescript
// tests/mocks/database.ts
export const mockDatabaseConnection = {
  // テスト用のデータベースモック
}
```

## パフォーマンス考慮事項

### ビルド最適化

- **esbuild**: 高速なTypeScriptビルド
- **キャッシュ**: SAMビルドキャッシュの活用
- **並列ビルド**: 複数Lambda関数の並列ビルド

### ローカル開発最適化

- **ホットリロード**: ファイル変更時の自動再ビルド
- **Warm Containers**: コンテナの事前起動でレスポンス向上

## セキュリティ考慮事項

### 開発環境セキュリティ

- **環境変数**: 機密情報の適切な管理
- **CORS設定**: フロントエンドからのアクセス制御
- **入力検証**: リクエストデータの検証

### 認証・認可

```typescript
// src/middleware/auth.ts
export const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  // JWT検証ロジック
  await next()
}
```
