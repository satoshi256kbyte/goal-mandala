# Docker環境セットアップガイド

このガイドでは、目標管理曼荼羅プロジェクトのローカル開発環境をDocker Composeを使用してセットアップする方法を説明します。

## 概要

ローカル開発環境では以下のサービスがDocker Composeで起動されます：

- **PostgreSQL**: メインデータベース
- **cognito-local**: Amazon Cognitoのローカルエミュレータ

## 前提条件

以下のツールがインストールされている必要があります：

- Docker Desktop (または Docker Engine + Docker Compose)
- Git
- asdf (バージョン管理ツール)

### Docker Desktopのインストール確認

```bash
# Dockerのバージョン確認
docker --version
# 例: Docker version 24.0.0, build 1234567

# Docker Composeのバージョン確認
docker-compose --version
# 例: Docker Compose version v2.20.0
```

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/goal-mandala.git
cd goal-mandala
```

### 2. 開発ツールのセットアップ

```bash
# asdfプラグインのインストール
asdf plugin add nodejs
asdf plugin add python
asdf plugin add pnpm

# .tool-versionsに基づいてツールをインストール
asdf install

# 依存関係のインストール
pnpm install
```

### 3. 環境変数の設定

```bash
# 環境変数ファイルをコピー
cp .env.example .env
```

`.env`ファイルを編集して、以下の重要な値を設定してください：

```bash
# データベース設定
POSTGRES_PASSWORD=your_secure_password_here

# JWT設定
JWT_SECRET=your_jwt_secret_here

# その他の設定は開発用デフォルト値のまま使用可能
```

### 4. Docker環境の起動

#### 基本的な起動方法

```bash
# バックグラウンドでサービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f
```

#### Makefileを使用した起動（推奨）

```bash
# 環境起動
make -C tools/docker up

# サービス状態確認
make -C tools/docker health

# 利用可能なコマンド一覧
make -C tools/docker help
```

### 5. 初期化スクリプトの実行

```bash
# 開発環境の初期化
./tools/scripts/setup.sh

# または個別に実行
./tools/scripts/validate-env.sh
./tools/scripts/validate-docker-compose.sh
./tools/scripts/validate-postgres-setup.sh
./tools/scripts/validate-cognito-local.sh
```

### 6. 動作確認

```bash
# ヘルスチェックの実行
./tools/scripts/health-check.sh

# PostgreSQL接続テスト
./tools/scripts/test-postgres-connection.sh

# cognito-local動作確認
./tools/scripts/validate-cognito-local.sh
```

## サービス詳細

### PostgreSQL

- **ポート**: 5432
- **データベース名**: goal_mandala_dev, goal_mandala_test
- **ユーザー名**: goal_mandala_user
- **パスワード**: 環境変数 `POSTGRES_PASSWORD` で設定
- **データ永続化**: `postgres-data` ボリューム

#### 直接接続方法

```bash
# Docker経由で接続
docker-compose exec postgres psql -U goal_mandala_user -d goal_mandala_dev

# ホストから直接接続
psql -h localhost -p 5432 -U goal_mandala_user -d goal_mandala_dev

# 接続スクリプトを使用
./tools/scripts/docker-db-connect.sh
```

### cognito-local

- **ポート**: 9229
- **エンドポイント**: <http://localhost:9229>
- **設定ファイル**: `tools/docker/cognito-local/config.json`
- **データ永続化**: `cognito-data` ボリューム

#### 動作確認方法

```bash
# ヘルスチェック
curl http://localhost:9229/health

# User Pool一覧取得
curl http://localhost:9229/

# 専用スクリプトで確認
./tools/scripts/validate-cognito-local.sh
```

## 開発用コマンド

### Docker Compose基本操作

```bash
# サービス起動
docker-compose up -d

# サービス停止
docker-compose down

# サービス再起動
docker-compose restart

# ログ表示
docker-compose logs -f [service_name]

# サービス状態確認
docker-compose ps
```

### Makefileコマンド（推奨）

```bash
# 環境起動
make -C tools/docker up

# 環境停止
make -C tools/docker down

# 環境再起動
make -C tools/docker restart

# ログ表示
make -C tools/docker logs

# ヘルスチェック
make -C tools/docker health

# 環境クリーンアップ（データも削除）
make -C tools/docker clean

# データベース接続
make -C tools/docker db-connect

# 利用可能なコマンド一覧
make -C tools/docker help
```

### 開発用ユーティリティスクリプト

```bash
# 環境の完全セットアップ
./tools/scripts/setup.sh

# 環境変数検証
./tools/scripts/validate-env.sh

# Docker Compose設定検証
./tools/scripts/validate-docker-compose.sh

# PostgreSQL設定検証
./tools/scripts/validate-postgres-setup.sh

# cognito-local設定検証
./tools/scripts/validate-cognito-local.sh

# 総合ヘルスチェック
./tools/scripts/health-check.sh

# データベース接続
./tools/scripts/docker-db-connect.sh

# 環境診断
./tools/scripts/diagnose-issues.sh

# 環境リセット
./tools/scripts/docker-reset.sh
```

## データ管理

### データベースマイグレーション

```bash
# マイグレーション実行
pnpm --filter @goal-mandala/backend run db:migrate

# マイグレーション状態確認
pnpm --filter @goal-mandala/backend run db:migrate:status

# マイグレーションリセット
pnpm --filter @goal-mandala/backend run db:migrate:reset
```

### シードデータ

```bash
# シードデータ投入
pnpm --filter @goal-mandala/backend run db:seed

# テストデータ投入
pnpm --filter @goal-mandala/backend run db:seed:test
```

### データバックアップ・リストア

```bash
# データベースダンプ作成
docker-compose exec postgres pg_dump -U goal_mandala_user goal_mandala_dev > backup.sql

# データベースリストア
docker-compose exec -T postgres psql -U goal_mandala_user goal_mandala_dev < backup.sql
```

## パフォーマンス最適化

### Docker設定の最適化

```bash
# Docker Desktopのリソース設定確認
# - CPU: 4コア以上推奨
# - メモリ: 8GB以上推奨
# - ディスク: 50GB以上推奨
```

### PostgreSQL設定の最適化

開発環境用の最適化設定は `tools/docker/postgres/postgresql.conf` で管理されています：

```conf
# 開発環境用設定例
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

## セキュリティ考慮事項

### 開発環境固有の設定

- **パスワード**: 開発用の弱いパスワードは使用しない
- **ポート**: 必要なポートのみ公開
- **ネットワーク**: Docker内部ネットワークで分離
- **データ**: 本番データは使用しない

### 機密情報管理

```bash
# .envファイルは絶対にコミットしない
echo ".env" >> .gitignore

# 強固なパスワードの生成例
openssl rand -base64 32
```

## 統合テスト

### Docker環境での統合テスト実行

```bash
# 統合テスト実行
./tools/scripts/test-docker-env.sh

# CI環境での統合テスト
./tools/scripts/test-docker-ci.sh

# 簡易テスト
./tools/scripts/test-docker-quick.sh
```

### テスト用データベース

```bash
# テスト用データベースの初期化
docker-compose exec postgres createdb -U goal_mandala_user goal_mandala_test

# テスト実行
pnpm test:integration
```

## 次のステップ

Docker環境のセットアップが完了したら：

1. **アプリケーション開発**: [CONTRIBUTING.md](../CONTRIBUTING.md) を参照
2. **API開発**: バックエンドパッケージのREADMEを参照
3. **フロントエンド開発**: フロントエンドパッケージのREADMEを参照
4. **インフラ開発**: インフラパッケージのREADMEを参照

## 参考資料

- [環境変数設定ガイド](./environment-variables.md)
- [トラブルシューティングガイド](./docker-troubleshooting.md)
- [Docker最適化ガイド](./docker-optimization.md)
- [統合テストガイド](./integration-testing.md)
