# データベースマイグレーションガイド

## 概要

このドキュメントは、目標管理曼荼羅システムのデータベースマイグレーション手順と運用ガイドです。Prismaを使用したマイグレーション管理について説明します。

## 目次

1. [開発環境でのマイグレーション](#開発環境でのマイグレーション)
2. [本番環境でのマイグレーション](#本番環境でのマイグレーション)
3. [マイグレーション管理](#マイグレーション管理)
4. [バックアップと復旧](#バックアップと復旧)
5. [トラブルシューティング](#トラブルシューティング)
6. [セキュリティ設定](#セキュリティ設定)
7. [監視とログ](#監視とログ)

## 開発環境でのマイグレーション

### 前提条件

- Docker Compose環境が起動していること
- PostgreSQLデータベースが利用可能であること
- 必要な環境変数が設定されていること

### 初回セットアップ

```bash
# 1. プロジェクトルートディレクトリに移動
cd /path/to/goal-mandala

# 2. Docker Compose環境を起動
docker-compose up -d

# 3. バックエンドディレクトリに移動
cd packages/backend

# 4. 初回マイグレーション実行
./scripts/migrate-dev.sh init
```

### 日常的なマイグレーション

```bash
# スキーマ変更後のマイグレーション
./scripts/migrate-dev.sh

# マイグレーション状態確認
./scripts/migrate-status.sh

# 詳細な状態確認
./scripts/migrate-status.sh all
```

### スキーマ変更の手順

1. `prisma/schema.prisma` を編集
2. スキーマ検証を実行
   ```bash
   pnpm run db:validate
   ```
3. マイグレーション生成・実行
   ```bash
   ./scripts/migrate-dev.sh "変更内容の説明"
   ```
4. 変更内容の確認
   ```bash
   ./scripts/migrate-status.sh schema
   ```

## 本番環境でのマイグレーション

### 事前準備

1. **バックアップの作成**
   ```bash
   ./scripts/backup-database.sh all
   ```

2. **マイグレーション計画の確認**
   - 影響範囲の評価
   - ダウンタイムの見積もり
   - ロールバック計画の策定

3. **ステージング環境でのテスト**
   ```bash
   # ステージング環境でドライラン
   NODE_ENV=staging ./scripts/migrate-prod.sh --dry-run
   ```

### 本番マイグレーション実行

```bash
# 1. 環境変数設定
export NODE_ENV=production
export DATABASE_URL="postgresql://..."

# 2. セキュリティチェック
./scripts/setup-db-security.sh all

# 3. ドライラン実行
./scripts/migrate-prod.sh --dry-run

# 4. 本番マイグレーション実行
./scripts/migrate-prod.sh
```

### 本番環境での注意事項

- **必ず事前にバックアップを取得**
- **ピーク時間を避けて実行**
- **監視体制を整備**
- **ロールバック手順を準備**

## マイグレーション管理

### マイグレーション状態の確認

```bash
# 基本的な状態確認
./scripts/migrate-status.sh

# スキーマ情報の確認
./scripts/migrate-status.sh schema

# マイグレーション履歴の確認
./scripts/migrate-status.sh history

# 全情報の確認
./scripts/migrate-status.sh all
```

### ロールバック

```bash
# 利用可能なマイグレーション一覧
./scripts/migrate-rollback.sh list

# 特定のマイグレーションまでロールバック
./scripts/migrate-rollback.sh to 20231201000000_init

# 完全リセット（開発環境のみ）
./scripts/migrate-rollback.sh reset
```

## バックアップと復旧

### バックアップの作成

```bash
# フルバックアップ
./scripts/backup-database.sh full

# スキーマのみバックアップ
./scripts/backup-database.sh schema

# データのみバックアップ
./scripts/backup-database.sh data

# 全種類のバックアップ
./scripts/backup-database.sh all
```

### バックアップの管理

```bash
# バックアップ統計表示
./scripts/backup-database.sh stats

# 古いバックアップファイルの削除
./scripts/backup-database.sh cleanup
```

### データベースの復旧

```bash
# 利用可能なバックアップファイル一覧
./scripts/restore-database.sh list

# 特定のバックアップから復旧
./scripts/restore-database.sh restore backups/full/full_backup_20231201_120000.sql

# S3からの復旧
./scripts/restore-database.sh s3-restore s3://bucket/backup.sql
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. マイグレーション実行エラー

**症状**: `prisma migrate dev` でエラーが発生

**原因と解決方法**:
- データベース接続エラー
  ```bash
  # 接続確認
  ./scripts/migrate-status.sh test
  ```
- スキーマ構文エラー
  ```bash
  # スキーマ検証
  pnpm run db:validate
  ```

#### 2. マイグレーション状態の不整合

**症状**: マイグレーション状態が期待と異なる

**解決方法**:
```bash
# マイグレーション状態をリセット
pnpm prisma migrate resolve --applied "マイグレーション名"

# または完全リセット（開発環境のみ）
./scripts/migrate-rollback.sh reset
```

#### 3. パフォーマンス問題

**症状**: マイグレーション実行が遅い

**対策**:
- インデックス作成の最適化
- バッチサイズの調整
- 並行実行数の制限

#### 4. 本番環境でのマイグレーション失敗

**緊急対応手順**:
1. 即座にアプリケーションを停止
2. バックアップからの復旧を検討
3. ロールバック実行
   ```bash
   ./scripts/migrate-rollback.sh reset
   ./scripts/restore-database.sh restore [最新のバックアップ]
   ```

### ログの確認

```bash
# アプリケーションログ
docker-compose logs backend

# データベースログ
docker-compose logs postgres

# マイグレーションログ（CloudWatch）
aws logs tail /aws/lambda/goal-mandala-migration --follow
```

## セキュリティ設定

### データベース接続のセキュリティ

```bash
# セキュリティ設定チェック
./scripts/setup-db-security.sh check

# 推奨設定の表示
./scripts/setup-db-security.sh recommend

# セキュリティ監査
./scripts/setup-db-security.sh audit
```

### 本番環境の推奨設定

```bash
# DATABASE_URLの例（本番環境）
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require&connect_timeout=10&statement_timeout=30000&connection_limit=10&pool_timeout=10"
```

### 開発環境の推奨設定

```bash
# DATABASE_URLの例（開発環境）
DATABASE_URL="postgresql://user:password@localhost:5432/database?connect_timeout=10&statement_timeout=30000&connection_limit=5&pool_timeout=10"
```

## 監視とログ

### メトリクス監視

マイグレーション実行時に以下のメトリクスが収集されます：

- **MigrationStarted**: マイグレーション開始回数
- **MigrationCompleted**: マイグレーション完了回数
- **MigrationFailed**: マイグレーション失敗回数
- **MigrationDuration**: マイグレーション実行時間
- **DatabaseConnection**: データベース接続成功/失敗
- **TablesAffected**: 影響を受けたテーブル数

### ログ出力

構造化ログが以下の形式で出力されます：

```json
{
  "timestamp": "2023-12-01T12:00:00.000Z",
  "level": "INFO",
  "message": "マイグレーション開始: init",
  "migrationName": "init",
  "metadata": {
    "action": "migration_start",
    "environment": "production"
  }
}
```

### アラート設定

以下の条件でアラートを設定することを推奨します：

- マイグレーション失敗時
- マイグレーション実行時間が30秒を超過
- データベース接続失敗が連続3回発生

## CI/CD統合

### GitHub Actions

マイグレーションは以下のタイミングで自動実行されます：

1. **プルリクエスト時**: マイグレーションテスト実行
2. **mainブランチマージ時**: 本番マイグレーション実行

### 手動実行

緊急時のロールバックは手動で実行できます：

```bash
# GitHub Actionsの手動実行
gh workflow run database-migration.yml
```

## ベストプラクティス

### マイグレーション設計

1. **段階的な変更**: 大きな変更は複数のマイグレーションに分割
2. **後方互換性**: 可能な限り後方互換性を保持
3. **テスト**: 必ずテスト環境で検証
4. **ドキュメント**: 変更内容を明確に記録

### 運用

1. **定期バックアップ**: 自動バックアップの設定
2. **監視**: メトリクスとログの継続的な監視
3. **訓練**: 緊急時対応の定期的な訓練
4. **レビュー**: マイグレーション内容の事前レビュー

## 関連ドキュメント

- [Prisma公式ドキュメント](https://www.prisma.io/docs/)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Docker環境セットアップガイド](./docker-setup-guide.md)
- [環境変数設定ガイド](./environment-variables.md)

## サポート

問題が発生した場合は、以下の情報を含めてサポートチームに連絡してください：

1. エラーメッセージ
2. 実行したコマンド
3. 環境情報（NODE_ENV、データベースバージョンなど）
4. ログファイル
5. マイグレーション履歴
