# 設計ドキュメント

## 概要

ローカル開発環境でPostgreSQLとcognito-localを動作させるDocker Compose環境を設計します。開発者の生産性向上と本番環境との一貫性を重視した設計とします。

## アーキテクチャ

### システム構成

```mermaid
graph TB
    subgraph "ローカル開発環境"
        subgraph "Docker Compose"
            DB[PostgreSQL Container<br/>Port: 5432]
            COGNITO[cognito-local Container<br/>Port: 9229]
            VOLUME1[postgres-data Volume]
            VOLUME2[cognito-data Volume]
        end
        
        subgraph "開発アプリケーション"
            BACKEND[Backend Application<br/>Port: 3001]
            FRONTEND[Frontend Application<br/>Port: 3000]
        end
    end
    
    BACKEND --> DB
    BACKEND --> COGNITO
    FRONTEND --> BACKEND
    DB --> VOLUME1
    COGNITO --> VOLUME2
```

### ネットワーク構成

- **ネットワーク名**: `goal-mandala-network`
- **ドライバー**: bridge
- **サービス間通信**: コンテナ名による名前解決
- **ホストアクセス**: 各サービスのポートをホストにマッピング

## コンポーネントと インターフェース

### PostgreSQLコンテナ

#### 設定

- **イメージ**: `postgres:15-alpine`
- **ポート**: `5432:5432`
- **環境変数**:
  - `POSTGRES_DB`: goal_mandala_dev
  - `POSTGRES_USER`: goal_mandala_user
  - **`POSTGRES_PASSWORD`**: 環境変数から取得
- **ボリューム**: `postgres-data:/var/lib/postgresql/data`
- **初期化スクリプト**: `./tools/docker/postgres/init.sql`

#### ヘルスチェック

```bash
pg_isready -U goal_mandala_user -d goal_mandala_dev
```

### cognito-localコンテナ

#### 設定

- **イメージ**: `jagregory/cognito-local:latest`
- **ポート**: `9229:9229`
- **環境変数**:
  - `COGNITO_LOCAL_PORT`: 9229
  - `COGNITO_LOCAL_HOSTNAME`: localhost
- **ボリューム**: `cognito-data:/app/.cognito`
- **設定ファイル**: `./tools/docker/cognito-local/config.json`

#### 初期設定

- User Pool作成
- User Pool Client作成
- テストユーザー作成

### 環境変数管理

#### .env.example構成

```bash
# Database Configuration
DATABASE_URL=postgresql://goal_mandala_user:password@localhost:5432/goal_mandala_dev
POSTGRES_PASSWORD=your_secure_password_here

# Cognito Configuration
COGNITO_LOCAL_ENDPOINT=http://localhost:9229
COGNITO_USER_POOL_ID=local_user_pool_id
COGNITO_CLIENT_ID=local_client_id
COGNITO_REGION=ap-northeast-1

# Application Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# AWS Configuration (for local development)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

## データモデル

### PostgreSQL初期化スキーマ

```sql
-- 開発用データベース作成
CREATE DATABASE goal_mandala_dev;
CREATE DATABASE goal_mandala_test;

-- 開発用ユーザー作成
CREATE USER goal_mandala_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE goal_mandala_dev TO goal_mandala_user;
GRANT ALL PRIVILEGES ON DATABASE goal_mandala_test TO goal_mandala_user;

-- 拡張機能有効化
\c goal_mandala_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c goal_mandala_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### cognito-local設定

```json
{
  "UserPools": {
    "local_user_pool_id": {
      "Id": "local_user_pool_id",
      "Name": "GoalMandalaUserPool",
      "Policies": {
        "PasswordPolicy": {
          "MinimumLength": 8,
          "RequireUppercase": true,
          "RequireLowercase": true,
          "RequireNumbers": true,
          "RequireSymbols": false
        }
      },
      "UsernameAttributes": ["email"],
      "AutoVerifiedAttributes": ["email"]
    }
  },
  "UserPoolClients": {
    "local_client_id": {
      "UserPoolId": "local_user_pool_id",
      "ClientId": "local_client_id",
      "ClientName": "GoalMandalaClient",
      "GenerateSecret": false,
      "ExplicitAuthFlows": [
        "ADMIN_NO_SRP_AUTH",
        "USER_PASSWORD_AUTH"
      ]
    }
  }
}
```

## エラーハンドリング

### コンテナ起動エラー

1. **ポート競合**
   - エラー検出: docker-compose起動時のポートバインドエラー
   - 対処: 使用中ポートの確認と代替ポート提案

2. **環境変数不足**
   - エラー検出: 必須環境変数の未設定
   - 対処: .env.exampleとの比較チェック

3. **ボリューム権限エラー**
   - エラー検出: データディレクトリへの書き込み権限不足
   - 対処: 権限修正スクリプトの提供

### データベース接続エラー

1. **接続タイムアウト**
   - 原因: PostgreSQLコンテナの起動遅延
   - 対処: リトライ機能付き接続チェック

2. **認証エラー**
   - 原因: パスワード不一致
   - 対処: 環境変数とコンテナ設定の整合性チェック

## テスト戦略

### 統合テスト

1. **コンテナ起動テスト**
   - 全サービスの正常起動確認
   - ヘルスチェック通過確認

2. **データベース接続テスト**
   - アプリケーションからの接続確認
   - CRUD操作の動作確認

3. **認証機能テスト**
   - cognito-localへの接続確認
   - ユーザー登録・ログイン動作確認

### 自動化テスト

```bash
#!/bin/bash
# tools/scripts/test-docker-env.sh

echo "=== Docker環境テスト開始 ==="

# コンテナ起動
docker-compose up -d

# ヘルスチェック待機
echo "サービス起動待機中..."
sleep 30

# PostgreSQL接続テスト
echo "PostgreSQL接続テスト..."
docker-compose exec postgres pg_isready -U goal_mandala_user -d goal_mandala_dev

# cognito-local接続テスト
echo "cognito-local接続テスト..."
curl -f http://localhost:9229/health || exit 1

echo "=== 全テスト完了 ==="
```

## セキュリティ考慮事項

### 開発環境固有の設定

1. **パスワード管理**
   - 開発用の弱いパスワードは.env.exampleに記載
   - 実際の.envファイルでは強固なパスワードを推奨

2. **ネットワーク分離**
   - Docker内部ネットワークでサービス間通信
   - 必要なポートのみホストに公開

3. **データ永続化**
   - 開発データの分離
   - テストデータの自動クリーンアップ

### 本番環境との差異

- 認証: cognito-local vs Amazon Cognito
- データベース: PostgreSQL vs Aurora Serverless V2
- ネットワーク: ローカル vs VPC

## パフォーマンス考慮事項

### リソース使用量

- **PostgreSQL**: メモリ256MB、CPU 0.5コア
- **cognito-local**: メモリ128MB、CPU 0.25コア
- **合計**: メモリ384MB、CPU 0.75コア

### 起動時間最適化

1. **イメージサイズ削減**
   - Alpine Linuxベースイメージ使用
   - 不要パッケージの除外

2. **並列起動**
   - depends_onによる依存関係管理
   - ヘルスチェックによる起動完了検出

## 運用・保守

### 日常的な操作

```bash
# 環境起動
docker-compose up -d

# 環境停止
docker-compose down

# ログ確認
docker-compose logs -f

# データリセット
docker-compose down -v
docker-compose up -d
```

### トラブルシューティング

1. **コンテナ状態確認**

   ```bash
   docker-compose ps
   docker-compose logs [service_name]
   ```

2. **データベース直接接続**

   ```bash
   docker-compose exec postgres psql -U goal_mandala_user -d goal_mandala_dev
   ```

3. **設定ファイル確認**

   ```bash
   docker-compose config
   ```
