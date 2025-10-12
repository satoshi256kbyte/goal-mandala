# Docker Compose 開発環境

このディレクトリには、ローカル開発環境用のDocker Compose設定が含まれています。

## 前提条件

- Docker Desktop がインストールされていること
- Docker Compose がインストールされていること（Docker Desktop に含まれています）

## セットアップ

1. 環境変数ファイルを作成:

   ```bash
   cp .env.example .env
   ```

2. 必要に応じて `.env` ファイルの値を編集してください。

## 使用方法

### 環境の起動

```bash
# バックグラウンドで起動
docker-compose up -d

# フォアグラウンドで起動（ログを確認したい場合）
docker-compose up
```

### 環境の停止

```bash
# コンテナを停止
docker-compose down

# コンテナを停止してボリュームも削除（データをリセット）
docker-compose down -v
```

### ログの確認

```bash
# 全サービスのログを確認
docker-compose logs -f

# 特定のサービスのログを確認
docker-compose logs -f postgres
docker-compose logs -f cognito-local
```

### サービスの状態確認

```bash
# 実行中のコンテナを確認
docker-compose ps

# ヘルスチェック状態を確認
docker-compose ps --format table
```

## サービス詳細

### PostgreSQL

- **ポート**: 5432
- **データベース**: goal_mandala_dev, goal_mandala_test
- **ユーザー**: goal_mandala_user
- **パスワード**: 環境変数 `POSTGRES_PASSWORD` で設定

#### データベースへの直接接続

```bash
# コンテナ内でpsqlを実行
docker-compose exec postgres psql -U goal_mandala_user -d goal_mandala_dev

# ホストからpsqlで接続（psqlがインストールされている場合）
psql -h localhost -p 5432 -U goal_mandala_user -d goal_mandala_dev
```

### cognito-local

- **ポート**: 9229
- **エンドポイント**: <http://localhost:9229>
- **User Pool ID**: local_user_pool_id
- **Client ID**: local_client_id

#### テストユーザー

設定済みのテストユーザー:

- **Email**: <test@example.com>
- **Password**: TestPassword123!

#### 動作確認

```bash
# ヘルスチェック
curl http://localhost:9229/health

# User Pool一覧取得
curl http://localhost:9229/
```

## トラブルシューティング

### ポート競合エラー

既に使用されているポートがある場合は、docker-compose.yml のポート設定を変更してください。

### データベース接続エラー

1. PostgreSQLコンテナが起動しているか確認:

   ```bash
   docker-compose ps postgres
   ```

2. ヘルスチェックが通っているか確認:

   ```bash
   docker-compose logs postgres
   ```

3. 環境変数が正しく設定されているか確認:

   ```bash
   docker-compose config
   ```

### cognito-local接続エラー

1. cognito-localコンテナが起動しているか確認:

   ```bash
   docker-compose ps cognito-local
   ```

2. 設定ファイルが正しく読み込まれているか確認:

   ```bash
   docker-compose logs cognito-local
   ```

### データのリセット

開発データをリセットしたい場合:

```bash
# 全てのコンテナとボリュームを削除
docker-compose down -v

# 再起動
docker-compose up -d
```

## ファイル構成

```
tools/docker/
├── README.md                    # このファイル
├── postgres/
│   └── init.sql                # PostgreSQL初期化スクリプト
└── cognito-local/
    └── config.json             # cognito-local設定ファイル
```

## 設定ファイル

### PostgreSQL初期化スクリプト

`tools/docker/postgres/init.sql` には以下の設定が含まれています:

- 開発用データベース（goal_mandala_dev）の作成
- テスト用データベース（goal_mandala_test）の作成
- ユーザー（goal_mandala_user）の作成と権限付与
- uuid-ossp拡張機能の有効化

### cognito-local設定

`tools/docker/cognito-local/config.json` には以下の設定が含まれています:

- User Pool設定
- User Pool Client設定
- テストユーザー設定
- パスワードポリシー設定
