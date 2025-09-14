# JWT認証ミドルウェア 環境変数設定例

## 基本的な環境変数

### 必須環境変数

```bash
# AWS設定
AWS_REGION=ap-northeast-1

# Cognito設定
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# データベース設定
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT設定
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
```

### オプション環境変数

```bash
# 認証設定
ENABLE_MOCK_AUTH=false
JWT_CACHE_TTL=3600

# モック認証設定（開発環境用）
MOCK_USER_ID=dev-user-001
MOCK_USER_EMAIL=developer@example.com
MOCK_USER_NAME=Development User

# ログ設定
LOG_LEVEL=INFO
ENABLE_SECURITY_AUDIT=true

# フロントエンド設定
FRONTEND_URL=https://your-domain.com
```

## 環境別設定例

### 開発環境 (.env.development)

```bash
# 実行環境
NODE_ENV=development

# AWS設定
AWS_REGION=ap-northeast-1

# Cognito設定（開発用）
COGNITO_USER_POOL_ID=ap-northeast-1_devpool123
COGNITO_CLIENT_ID=dev123client456id789

# データベース設定（ローカル）
DATABASE_URL=postgresql://postgres:password@localhost:5432/goal_mandala_dev

# JWT設定
JWT_SECRET=development-jwt-secret-key-for-local-testing-only

# 認証設定（モック認証有効）
ENABLE_MOCK_AUTH=true
JWT_CACHE_TTL=300

# モック認証設定
MOCK_USER_ID=dev-user-001
MOCK_USER_EMAIL=developer@example.com
MOCK_USER_NAME=Development User

# ログ設定（詳細ログ）
LOG_LEVEL=DEBUG
ENABLE_SECURITY_AUDIT=false

# フロントエンド設定
FRONTEND_URL=http://localhost:5173
```

### テスト環境 (.env.test)

```bash
# 実行環境
NODE_ENV=test

# AWS設定
AWS_REGION=ap-northeast-1

# Cognito設定（テスト用）
COGNITO_USER_POOL_ID=ap-northeast-1_testpool123
COGNITO_CLIENT_ID=test123client456id789

# データベース設定（テスト用）
DATABASE_URL=postgresql://postgres:password@localhost:5432/goal_mandala_test

# JWT設定
JWT_SECRET=test-jwt-secret-key-for-testing-purposes-only

# 認証設定（モック認証有効）
ENABLE_MOCK_AUTH=true
JWT_CACHE_TTL=60

# モック認証設定
MOCK_USER_ID=test-user-001
MOCK_USER_EMAIL=test@example.com
MOCK_USER_NAME=Test User

# ログ設定（エラーのみ）
LOG_LEVEL=ERROR
ENABLE_SECURITY_AUDIT=false

# フロントエンド設定
FRONTEND_URL=http://localhost:3000
```

### ステージング環境 (.env.staging)

```bash
# 実行環境
NODE_ENV=staging

# AWS設定
AWS_REGION=ap-northeast-1

# Cognito設定（ステージング用）
COGNITO_USER_POOL_ID=ap-northeast-1_stgpool123
COGNITO_CLIENT_ID=stg123client456id789

# データベース設定（RDS）
DATABASE_URL=postgresql://username:password@staging-db.cluster-xxx.ap-northeast-1.rds.amazonaws.com:5432/goal_mandala

# JWT設定
JWT_SECRET=staging-jwt-secret-key-change-this-in-production

# 認証設定（実Cognito使用）
ENABLE_MOCK_AUTH=false
JWT_CACHE_TTL=1800

# ログ設定
LOG_LEVEL=INFO
ENABLE_SECURITY_AUDIT=true

# フロントエンド設定
FRONTEND_URL=https://staging.your-domain.com
```

### 本番環境 (.env.production)

```bash
# 実行環境
NODE_ENV=production

# AWS設定
AWS_REGION=ap-northeast-1

# Cognito設定（本番用）
COGNITO_USER_POOL_ID=ap-northeast-1_prodpool123
COGNITO_CLIENT_ID=prod123client456id789

# データベース設定（RDS）
DATABASE_URL=postgresql://username:password@production-db.cluster-xxx.ap-northeast-1.rds.amazonaws.com:5432/goal_mandala

# JWT設定（Secrets Managerから取得推奨）
JWT_SECRET=production-super-secure-jwt-secret-key-from-secrets-manager

# 認証設定（実Cognito使用、モック認証無効）
ENABLE_MOCK_AUTH=false
JWT_CACHE_TTL=3600

# ログ設定（本番用）
LOG_LEVEL=WARN
ENABLE_SECURITY_AUDIT=true

# フロントエンド設定
FRONTEND_URL=https://your-domain.com
```

## AWS Secrets Manager使用時の設定

### 1. Secrets Managerからの環境変数取得

```bash
# Secrets Manager ARN（環境変数として設定）
JWT_SECRET_ARN=arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:jwt-secret-abc123
DATABASE_SECRET_ARN=arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:database-credentials-def456
COGNITO_SECRET_ARN=arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:cognito-config-ghi789
```

### 2. Lambda環境変数での設定例

```yaml
# SAM template.yaml での設定例
Environment:
  Variables:
    NODE_ENV: !Ref Environment
    AWS_REGION: !Ref AWS::Region
    JWT_SECRET_ARN: !Ref JWTSecretArn
    DATABASE_SECRET_ARN: !Ref DatabaseSecretArn
    COGNITO_USER_POOL_ID: !Ref CognitoUserPoolId
    COGNITO_CLIENT_ID: !Ref CognitoClientId
    ENABLE_MOCK_AUTH: false
    JWT_CACHE_TTL: 3600
    LOG_LEVEL: INFO
    ENABLE_SECURITY_AUDIT: true
```

## Docker Compose使用時の設定

### docker-compose.yml

```yaml
version: '3.8'
services:
  backend:
    build: .
    environment:
      - NODE_ENV=development
      - AWS_REGION=ap-northeast-1
      - COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
      - COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
      - DATABASE_URL=postgresql://postgres:password@db:5432/goal_mandala
      - JWT_SECRET=docker-development-jwt-secret
      - ENABLE_MOCK_AUTH=true
      - JWT_CACHE_TTL=300
      - MOCK_USER_ID=docker-user-001
      - MOCK_USER_EMAIL=docker@example.com
      - MOCK_USER_NAME=Docker User
      - LOG_LEVEL=DEBUG
      - ENABLE_SECURITY_AUDIT=false
      - FRONTEND_URL=http://localhost:5173
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=goal_mandala
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - '5432:5432'
```

## 環境変数の検証

### 1. 必須環境変数チェック

```bash
#!/bin/bash
# validate-env.sh

required_vars=(
  "NODE_ENV"
  "AWS_REGION"
  "COGNITO_USER_POOL_ID"
  "COGNITO_CLIENT_ID"
  "DATABASE_URL"
  "JWT_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "Error: Required environment variable $var is not set"
    exit 1
  fi
done

echo "All required environment variables are set"
```

### 2. 環境変数の形式チェック

```bash
#!/bin/bash
# check-env-format.sh

# Cognito User Pool ID形式チェック
if [[ ! $COGNITO_USER_POOL_ID =~ ^[a-z0-9-]+_[a-zA-Z0-9]+$ ]]; then
  echo "Error: COGNITO_USER_POOL_ID format is invalid"
  exit 1
fi

# データベースURL形式チェック
if [[ ! $DATABASE_URL =~ ^postgresql:// ]]; then
  echo "Error: DATABASE_URL must start with postgresql://"
  exit 1
fi

# JWT_SECRET長さチェック
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "Warning: JWT_SECRET should be at least 32 characters long"
fi

echo "Environment variable format validation passed"
```

## セキュリティ考慮事項

### 1. 機密情報の管理

```bash
# ❌ 悪い例：機密情報をコードに直接記述
JWT_SECRET=hardcoded-secret

# ✅ 良い例：Secrets Managerから取得
JWT_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:name

# ✅ 良い例：環境変数から取得
JWT_SECRET=${JWT_SECRET}
```

### 2. 本番環境での注意事項

```bash
# 本番環境では必ずfalseに設定
ENABLE_MOCK_AUTH=false

# 本番環境では適切なログレベルに設定
LOG_LEVEL=WARN

# セキュリティ監査を有効化
ENABLE_SECURITY_AUDIT=true

# 強力なJWT秘密鍵を使用
JWT_SECRET=production-grade-secret-key-with-high-entropy
```

### 3. 開発環境での注意事項

```bash
# 開発環境でのみモック認証を有効化
ENABLE_MOCK_AUTH=true

# 開発用の短いキャッシュ時間
JWT_CACHE_TTL=300

# 詳細なデバッグログ
LOG_LEVEL=DEBUG
```

## トラブルシューティング

### 1. よくある設定ミス

#### Cognito設定エラー

```bash
# ❌ 間違った形式
COGNITO_USER_POOL_ID=wrong-format

# ✅ 正しい形式
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
```

#### データベース接続エラー

```bash
# ❌ 間違った形式
DATABASE_URL=mysql://user:pass@host/db

# ✅ 正しい形式
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### 2. 環境変数の確認方法

```bash
# 環境変数の一覧表示（機密情報は除く）
env | grep -E '^(NODE_ENV|AWS_REGION|COGNITO_|ENABLE_|LOG_LEVEL)=' | sort

# 特定の環境変数の確認
echo "NODE_ENV: $NODE_ENV"
echo "ENABLE_MOCK_AUTH: $ENABLE_MOCK_AUTH"
```

### 3. 設定の動的確認

```typescript
// TypeScriptでの環境変数確認
import { config } from '../config/environment';

console.log('Current configuration:', {
  nodeEnv: config.NODE_ENV,
  enableMockAuth: config.ENABLE_MOCK_AUTH,
  jwtCacheTtl: config.JWT_CACHE_TTL,
  logLevel: config.LOG_LEVEL,
});
```

## 参考資料

- [AWS Lambda 環境変数の使用](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Docker Compose 環境変数](https://docs.docker.com/compose/environment-variables/)
- [Node.js 環境変数のベストプラクティス](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)
