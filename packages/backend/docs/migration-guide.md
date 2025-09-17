# マイグレーションガイド

## 概要

Goal Mandalaプロジェクトのデータベースマイグレーション手順とベストプラクティスを説明します。

## 開発環境でのマイグレーション

### 初期セットアップ

```bash
# 1. 環境変数設定
cp .env.example .env
# DATABASE_URLを適切に設定

# 2. Docker環境起動
docker-compose up -d

# 3. 初期マイグレーション生成・実行
pnpm run migrate:init
```

### 日常的なマイグレーション

```bash
# スキーマ変更後のマイグレーション生成
pnpm run migrate:dev

# マイグレーション状態確認
pnpm run migrate:status

# Prismaクライアント再生成
pnpm run db:generate
```

## 本番環境でのマイグレーション

### 事前準備

1. **バックアップ作成**

   ```bash
   ./scripts/backup-database.sh
   ```

2. **マイグレーション内容確認**

   ```bash
   # ローカルでマイグレーション内容を確認
   npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
   ```

3. **ステージング環境でのテスト**
   ```bash
   # ステージング環境でマイグレーションテスト
   NODE_ENV=staging ./scripts/migrate-prod.sh
   ```

### 本番マイグレーション実行

```bash
# 本番環境でのマイグレーション実行
NODE_ENV=production ./scripts/migrate-prod.sh
```

## CI/CDでの自動マイグレーション

GitHub Actionsワークフローが以下を自動実行します：

- **プルリクエスト時**: マイグレーションテスト
- **mainブランチマージ時**: 統合テスト
- **本番デプロイ時**: 本番マイグレーション（手動承認後）

## トラブルシューティング

### よくある問題

#### 1. マイグレーション失敗

```bash
# エラーログ確認
npx prisma migrate status

# 手動でマイグレーション状態をリセット
npx prisma migrate resolve --rolled-back <migration-name>

# 再実行
npx prisma migrate deploy
```

#### 2. スキーマドリフト

```bash
# スキーマの差分確認
npx prisma db pull
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma

# 必要に応じてスキーマ修正後、新しいマイグレーション作成
npx prisma migrate dev --name fix-schema-drift
```

#### 3. データベース復旧

```bash
# 利用可能なバックアップ確認
ls -la ./backups/

# バックアップから復旧
./scripts/restore-database.sh ./backups/goal_mandala_backup_YYYYMMDD_HHMMSS.sql.custom
```

## セキュリティ考慮事項

### 本番環境での注意点

1. **最小権限の原則**
   - マイグレーション実行用の専用ユーザーを使用
   - 必要最小限の権限のみ付与

2. **バックアップの暗号化**

   ```bash
   # バックアップファイルの暗号化
   gpg --symmetric --cipher-algo AES256 backup_file.sql
   ```

3. **監査ログ**
   - 全てのマイグレーション実行をログに記録
   - CloudWatch Logsで監視

### 緊急時対応

#### ロールバック手順

1. **即座の対応**

   ```bash
   # アプリケーション停止
   # 直前のバックアップから復旧
   ./scripts/restore-database.sh ./backups/pre_migration_backup.sql.custom
   ```

2. **根本原因調査**
   - マイグレーションログの確認
   - データ整合性チェック
   - 修正版マイグレーションの準備

## パフォーマンス考慮事項

### 大量データでのマイグレーション

```bash
# バッチサイズを指定したマイグレーション
# （カスタムマイグレーションスクリプトで実装）

# インデックス作成の最適化
# CONCURRENTLY オプションの使用を検討
```

### 監視項目

- マイグレーション実行時間
- データベース接続数
- ロック待機時間
- ディスク使用量

## 運用チェックリスト

### マイグレーション前

- [ ] バックアップ作成完了
- [ ] ステージング環境でのテスト完了
- [ ] 影響範囲の確認
- [ ] ロールバック手順の準備
- [ ] 関係者への通知

### マイグレーション後

- [ ] マイグレーション成功確認
- [ ] アプリケーション動作確認
- [ ] データ整合性確認
- [ ] パフォーマンス確認
- [ ] 監視ダッシュボード確認

## 関連ドキュメント

- [Prisma公式ドキュメント](https://www.prisma.io/docs/)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Docker環境セットアップガイド](../../docs/docker-setup-guide.md)
