# マイグレーション実行手順

## 変更履歴テーブル追加マイグレーション

このドキュメントは、編集機能のための変更履歴テーブルを追加するマイグレーションの実行手順を説明します。

## 前提条件

- Docker Desktopが起動していること
- PostgreSQLコンテナが正常に動作していること

## 手順

### 1. Dockerコンテナの起動

```bash
# プロジェクトルートディレクトリで実行
docker-compose up -d postgres
```

### 2. データベース接続の確認

```bash
# PostgreSQLコンテナが起動しているか確認
docker ps | grep goal-mandala-postgres

# データベースに接続できるか確認
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "SELECT 1;"
```

### 3. マイグレーションの実行

```bash
# packages/backendディレクトリに移動
cd packages/backend

# マイグレーションを実行
npx prisma migrate deploy
```

または、開発環境の場合:

```bash
# 開発環境用マイグレーション（マイグレーション履歴も更新）
npx prisma migrate dev
```

### 4. マイグレーションの確認

```bash
# テーブルが作成されたか確認
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\dt change_history"

# テーブル構造を確認
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\d change_history"
```

### 5. テストの実行

```bash
# マイグレーションテストを実行
npm test -- tests/migration-change-history.test.ts
```

## トラブルシューティング

### Docker volume permission エラーが発生する場合

```bash
# Docker volumeを削除して再作成
docker-compose down -v
docker volume rm goal-mandala_postgres-data
docker-compose up -d postgres
```

### マイグレーションが失敗する場合

```bash
# マイグレーション状態を確認
npx prisma migrate status

# マイグレーションをリセット（開発環境のみ）
npx prisma migrate reset

# マイグレーションを再実行
npx prisma migrate deploy
```

### データベース接続エラーが発生する場合

1. `.env`ファイルの`DATABASE_URL`が正しいか確認
2. PostgreSQLコンテナが起動しているか確認
3. ポート5432が他のプロセスで使用されていないか確認

```bash
# ポート使用状況を確認
lsof -i :5432
```

## マイグレーションの内容

このマイグレーションでは以下の変更を行います：

1. **change_historyテーブルの作成**
   - 目標、サブ目標、アクションの変更履歴を記録
   - JSON形式で変更内容を保存
   - ユーザーIDとの外部キー制約

2. **インデックスの追加**
   - `(entity_type, entity_id, changed_at)`: エンティティごとの履歴取得用
   - `(user_id, changed_at)`: ユーザーごとの履歴取得用

3. **外部キー制約**
   - `user_id` → `users.id`: カスケード削除

## 既存データへの影響

このマイグレーションは新しいテーブルを追加するのみで、既存のデータには影響しません。

## ロールバック手順

マイグレーションをロールバックする必要がある場合：

```bash
# マイグレーションファイルを削除
rm -rf packages/backend/prisma/migrations/20251005002705_add_change_history_table

# データベースからテーブルを削除
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "DROP TABLE IF EXISTS change_history CASCADE;"

# Prismaクライアントを再生成
npx prisma generate
```

## 次のステップ

マイグレーションが正常に完了したら、以下のタスクに進むことができます：

1. バックエンドAPI実装（更新系）
2. 変更履歴記録機能の実装
3. フロントエンド編集コンポーネントの実装
