# クイックスタート: 変更履歴マイグレーション

## 最速で実行する方法

```bash
# 1. プロジェクトルートから
docker-compose up -d postgres

# 2. バックエンドディレクトリに移動
cd packages/backend

# 3. 自動スクリプトを実行
./scripts/run-migration.sh
```

これだけです！スクリプトが全て自動で行います。

## Docker起動エラーが出た場合

```bash
# Volumeをクリーンアップして再起動
docker-compose down -v
docker volume rm goal-mandala_postgres-data
docker-compose up -d postgres

# 再度マイグレーション実行
cd packages/backend
./scripts/run-migration.sh
```

## 手動で実行したい場合

```bash
# 1. Docker起動
docker-compose up -d postgres

# 2. Prismaクライアント生成
cd packages/backend
npx prisma generate

# 3. マイグレーション実行
npx prisma migrate deploy

# 4. 確認
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\dt change_history"

# 5. テスト実行
npm test -- tests/migration-change-history.test.ts --run
```

## 確認コマンド

```bash
# テーブル一覧
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\dt"

# change_historyテーブルの構造
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\d change_history"

# インデックス確認
docker exec -it goal-mandala-postgres psql -U goal_mandala_user -d goal_mandala_dev -c "\di"
```

## トラブルシューティング

### "permission denied" エラー

→ `docker-compose down -v` してから再起動

### "DATABASE_URL not found" エラー

→ `.env`ファイルが存在するか確認

### "connection refused" エラー

→ PostgreSQLコンテナが起動しているか確認: `docker ps | grep postgres`

## 詳細情報

- 完全な手順: [MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md)
- 実装詳細: [docs/change-history-schema-implementation.md](./docs/change-history-schema-implementation.md)
- 完了サマリー: [TASK_1_COMPLETION_SUMMARY.md](./TASK_1_COMPLETION_SUMMARY.md)
