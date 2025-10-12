# PostgreSQL Docker設定

## 概要

このディレクトリには、Goal Mandala開発環境用のPostgreSQLコンテナ設定が含まれています。

## ファイル構成

- `init.sql`: PostgreSQL初期化スクリプト
- `README.md`: このファイル（設定説明）

## 初期化スクリプト（init.sql）の内容

### 作成されるデータベース

- `goal_mandala_dev`: 開発用データベース
- `goal_mandala_test`: テスト用データベース

### 作成されるユーザー

- `goal_mandala_user`: 開発・テスト用ユーザー
  - パスワード: `goal_mandala_password_dev`（開発環境用）
  - 権限: 両データベースへの全権限

### 有効化される拡張機能

- `uuid-ossp`: UUID生成機能
  - 両データベースで有効化
  - Prismaでのid生成に使用

### 権限設定

- `goal_mandala_user`に以下の権限を付与:
  - データベースへの全権限
  - publicスキーマへの全権限
  - 全テーブル・シーケンスへの全権限

## データ永続化

- ボリューム名: `postgres-data`
- マウントポイント: `/var/lib/postgresql/data`
- ドライバー: local
- データはコンテナ削除後も保持される

## 接続情報

### 開発用データベース

```
Host: localhost
Port: 5432
Database: goal_mandala_dev
Username: goal_mandala_user
Password: ${POSTGRES_PASSWORD} (環境変数)
```

### テスト用データベース

```
Host: localhost
Port: 5432
Database: goal_mandala_test
Username: goal_mandala_user
Password: ${POSTGRES_PASSWORD} (環境変数)
```

## 使用方法

1. Docker Composeでコンテナを起動:

   ```bash
   docker-compose up -d postgres
   ```

2. データベース接続確認:

   ```bash
   docker-compose exec postgres psql -U goal_mandala_user -d goal_mandala_dev
   ```

3. 拡張機能確認:

   ```sql
   \dx
   ```

4. UUID生成テスト:

   ```sql
   SELECT uuid_generate_v4();
   ```

## トラブルシューティング

### 初期化スクリプトが実行されない場合

1. ボリュームを削除して再作成:

   ```bash
   docker-compose down -v
   docker-compose up -d postgres
   ```

### 接続エラーの場合

1. コンテナの状態確認:

   ```bash
   docker-compose ps postgres
   ```

2. ログ確認:

   ```bash
   docker-compose logs postgres
   ```

3. ヘルスチェック確認:

   ```bash
   docker-compose exec postgres pg_isready -U goal_mandala_user -d goal_mandala_dev
   ```
