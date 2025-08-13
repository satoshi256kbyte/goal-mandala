# Docker設定最適化ガイド

## 概要

このドキュメントでは、目標管理曼荼羅プロジェクトのDocker環境最適化について説明します。

## 最適化項目

### 1. .dockerignoreファイル

不要なファイルをDockerコンテキストから除外し、ビルド時間を短縮します。

**除外対象:**

- Git関連ファイル
- Node.js関連ファイル（node_modules等）
- 環境変数ファイル（.env等）
- ログファイル
- IDE設定ファイル
- 一時ファイル
- 機密情報ファイル

### 2. リソース制限設定

各サービスに適切なリソース制限を設定し、システムリソースの効率的な利用を実現します。

#### PostgreSQL

- **制限**: メモリ512MB、CPU 0.5コア
- **予約**: メモリ256MB、CPU 0.25コア

#### Cognito Local

- **制限**: メモリ256MB、CPU 0.25コア
- **予約**: メモリ128MB、CPU 0.1コア

### 3. コンテナ起動順序

`depends_on`と`condition: service_healthy`を使用して、PostgreSQLの起動完了後にCognito Localが起動するよう制御します。

### 4. ヘルスチェック設定

各サービスに適切なヘルスチェックを設定し、サービスの正常性を監視します。

#### PostgreSQL

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U goal_mandala_user -d goal_mandala_dev"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

#### Cognito Local

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:9229/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### 5. セキュリティ設定

- `no-new-privileges:true`: 新しい権限の取得を禁止
- `restart: unless-stopped`: 手動停止以外は自動再起動

### 6. ログ設定

- **ドライバー**: json-file
- **最大サイズ**: 10MB
- **最大ファイル数**: 3個
- **本番環境**: 圧縮有効、50MB、5ファイル

## 環境別設定

### 開発環境（docker-compose.override.yml）

- デバッグログ有効
- 設定ファイルの動的マウント
- ポート番号の環境変数対応

### 本番環境（docker-compose.prod.yml）

- より厳格なリソース制限
- セキュリティ強化（AppArmor等）
- ログ圧縮有効
- より頻繁なヘルスチェック

## PostgreSQL最適化

### 設定ファイル（postgresql.conf）

開発環境用に最適化された設定：

- **メモリ設定**: shared_buffers=128MB、effective_cache_size=256MB
- **WAL設定**: wal_level=replica、max_wal_size=1GB
- **ログ設定**: 詳細ログ有効（開発用）
- **パフォーマンス設定**: fsync=off（開発環境のみ）

### 認証設定（pg_hba.conf）

- ローカル接続: trust
- ネットワーク接続: md5認証
- Docker ネットワーク対応

## 運用コマンド

### Makefileコマンド

```bash
# 基本操作
make -C tools/docker up      # 環境起動
make -C tools/docker down    # 環境停止
make -C tools/docker restart # 環境再起動

# 監視・デバッグ
make -C tools/docker logs    # ログ表示
make -C tools/docker health  # ヘルスチェック
make -C tools/docker status  # リソース使用状況

# 環境管理
make -C tools/docker clean   # 完全クリーンアップ
make -C tools/docker build   # イメージ再ビルド

# 環境別起動
make -C tools/docker dev     # 開発環境設定
make -C tools/docker prod    # 本番環境設定

# データベース操作
make -C tools/docker db-connect  # DB接続
make -C tools/docker db-dump     # DBダンプ
make -C tools/docker db-restore BACKUP_FILE=backup.sql  # DB復元
```

## トラブルシューティング

### よくある問題

1. **ポート競合**
   - 解決方法: 環境変数でポート番号を変更
   - 例: `POSTGRES_PORT=5433 docker-compose up`

2. **メモリ不足**
   - 解決方法: Docker Desktopのメモリ割り当てを増加
   - 推奨: 最低4GB以上

3. **権限エラー**
   - 解決方法: ボリュームの権限確認
   - コマンド: `sudo chown -R $USER:$USER data/`

4. **ヘルスチェック失敗**
   - 確認方法: `docker-compose logs [service_name]`
   - 対処: サービス固有のログを確認

### パフォーマンス監視

```bash
# リソース使用状況の確認
docker stats

# 詳細な統計情報
make -C tools/docker status

# ログの確認
docker-compose logs -f --tail=100
```

## セキュリティ考慮事項

### 開発環境

- 機密情報は環境変数で管理
- .envファイルはGitignore対象
- デフォルトパスワードの変更必須

### 本番環境

- より厳格なリソース制限
- セキュリティオプションの追加
- ログの適切な管理
- 定期的なセキュリティ更新

## 今後の改善予定

1. **監視強化**
   - Prometheus/Grafana統合
   - アラート機能の追加

2. **バックアップ自動化**
   - 定期バックアップスクリプト
   - S3への自動アップロード

3. **CI/CD統合**
   - GitHub Actionsでの自動テスト
   - セキュリティスキャンの統合

4. **マルチステージビルド**
   - カスタムDockerfileの最適化
   - イメージサイズの削減
