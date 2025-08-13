# Docker環境トラブルシューティングガイド

このガイドでは、Docker環境で発生する可能性のある問題とその解決方法を説明します。

## 目次

- [一般的な問題](#一般的な問題)
- [Docker Compose関連](#docker-compose関連)
- [PostgreSQL関連](#postgresql関連)
- [cognito-local関連](#cognito-local関連)
- [ネットワーク関連](#ネットワーク関連)
- [パフォーマンス関連](#パフォーマンス関連)
- [データ関連](#データ関連)
- [診断ツール](#診断ツール)

## 一般的な問題

### Docker Desktopが起動しない

**症状**: Docker Desktopが起動しない、またはコマンドが認識されない

**原因と解決方法**:

```bash
# 1. Docker Desktopの再起動
# Docker Desktopアプリケーションを完全に終了して再起動

# 2. Dockerデーモンの状態確認
docker info

# 3. Docker Desktopのリセット
# Docker Desktop > Settings > Reset > Reset to factory defaults
```

### 権限エラー

**症状**: `permission denied` エラーが発生

**解決方法**:

```bash
# 1. Dockerグループにユーザーを追加（Linux/macOS）
sudo usermod -aG docker $USER

# 2. ログアウト・ログインして権限を反映

# 3. Docker Desktopの場合は設定で権限を確認
```

### ディスク容量不足

**症状**: `no space left on device` エラー

**解決方法**:

```bash
# 1. 未使用のDockerリソースをクリーンアップ
docker system prune -a

# 2. 未使用のボリュームを削除
docker volume prune

# 3. 未使用のネットワークを削除
docker network prune

# 4. ディスク使用量確認
docker system df
```

## Docker Compose関連

### サービスが起動しない

**症状**: `docker-compose up` でサービスが起動しない

**診断手順**:

```bash
# 1. 設定ファイルの検証
docker-compose config

# 2. ログの確認
docker-compose logs [service_name]

# 3. サービス状態の確認
docker-compose ps

# 4. 専用スクリプトで診断
./tools/scripts/validate-docker-compose.sh
```

**よくある原因と解決方法**:

#### ポート競合

```bash
# 使用中のポートを確認
lsof -i :5432  # PostgreSQL
lsof -i :9229  # cognito-local

# 競合するプロセスを停止
sudo kill -9 [PID]

# または、docker-compose.ymlでポートを変更
```

#### 環境変数の問題

```bash
# 環境変数の確認
./tools/scripts/validate-env.sh

# .envファイルの存在確認
ls -la .env

# 必要に応じて.envファイルを再作成
cp .env.example .env
```

### サービスが頻繁に再起動する

**症状**: サービスが起動後すぐに停止・再起動を繰り返す

**診断方法**:

```bash
# 1. 詳細ログの確認
docker-compose logs -f --tail=100 [service_name]

# 2. コンテナの状態確認
docker-compose ps

# 3. リソース使用量確認
docker stats
```

**解決方法**:

```bash
# 1. メモリ不足の場合
# Docker Desktopのメモリ設定を増加

# 2. ヘルスチェック設定の調整
# docker-compose.ymlのhealthcheck設定を確認

# 3. 依存関係の問題
# depends_on設定を確認
```

## PostgreSQL関連

### データベースに接続できない

**症状**: `connection refused` または `authentication failed`

**診断手順**:

```bash
# 1. PostgreSQLコンテナの状態確認
docker-compose ps postgres

# 2. PostgreSQLログの確認
docker-compose logs postgres

# 3. 接続テスト
./tools/scripts/test-postgres-connection.sh

# 4. 手動接続テスト
docker-compose exec postgres pg_isready -U goal_mandala_user
```

**解決方法**:

#### 認証エラー

```bash
# 1. パスワードの確認
echo $POSTGRES_PASSWORD

# 2. 環境変数の再設定
# .envファイルでPOSTGRES_PASSWORDを確認・修正

# 3. コンテナの再作成
docker-compose down
docker-compose up -d postgres
```

#### 接続タイムアウト

```bash
# 1. PostgreSQLの起動完了を待機
docker-compose exec postgres pg_isready -U goal_mandala_user -t 30

# 2. ポート確認
docker-compose port postgres 5432

# 3. ネットワーク確認
docker network ls
docker network inspect goal-mandala-network
```

### データベースが初期化されない

**症状**: 初期化スクリプトが実行されない

**解決方法**:

```bash
# 1. ボリュームを削除して再作成
docker-compose down -v
docker-compose up -d postgres

# 2. 初期化スクリプトの確認
ls -la tools/docker/postgres/init.sql

# 3. 手動で初期化実行
docker-compose exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/init.sql
```

### データが永続化されない

**症状**: コンテナ再起動後にデータが消失

**解決方法**:

```bash
# 1. ボリュームの確認
docker volume ls | grep postgres

# 2. ボリュームマウントの確認
docker-compose config | grep -A5 volumes

# 3. ボリュームの詳細確認
docker volume inspect goal-mandala_postgres-data
```

## cognito-local関連

### cognito-localが起動しない

**症状**: cognito-localコンテナが起動しない

**診断手順**:

```bash
# 1. コンテナログの確認
docker-compose logs cognito-local

# 2. 設定ファイルの確認
cat tools/docker/cognito-local/config.json

# 3. 専用スクリプトで診断
./tools/scripts/validate-cognito-local.sh
```

**解決方法**:

```bash
# 1. 設定ファイルのJSON形式確認
jq . tools/docker/cognito-local/config.json

# 2. ポート競合の確認
lsof -i :9229

# 3. コンテナの再作成
docker-compose down cognito-local
docker-compose up -d cognito-local
```

### cognito-local APIが応答しない

**症状**: HTTP リクエストがタイムアウトまたはエラー

**診断方法**:

```bash
# 1. ヘルスチェック
curl -f http://localhost:9229/health

# 2. User Pool一覧取得テスト
curl http://localhost:9229/

# 3. コンテナ内からのテスト
docker-compose exec cognito-local curl http://localhost:9229/health
```

**解決方法**:

```bash
# 1. コンテナの再起動
docker-compose restart cognito-local

# 2. ログの詳細確認
docker-compose logs -f cognito-local

# 3. 設定の再読み込み
docker-compose down cognito-local
docker-compose up -d cognito-local
```

## ネットワーク関連

### サービス間通信ができない

**症状**: コンテナ間でサービスに接続できない

**診断方法**:

```bash
# 1. ネットワークの確認
docker network ls
docker network inspect goal-mandala-network

# 2. コンテナのネットワーク設定確認
docker-compose ps
docker inspect [container_name] | grep -A10 NetworkSettings

# 3. 名前解決テスト
docker-compose exec backend nslookup postgres
docker-compose exec backend ping postgres
```

**解決方法**:

```bash
# 1. ネットワークの再作成
docker-compose down
docker network rm goal-mandala-network
docker-compose up -d

# 2. DNS設定の確認
# docker-compose.ymlのnetworks設定を確認

# 3. ファイアウォール設定の確認
# ローカルファイアウォールがDocker通信をブロックしていないか確認
```

### 外部からアクセスできない

**症状**: ホストからコンテナサービスにアクセスできない

**解決方法**:

```bash
# 1. ポートマッピングの確認
docker-compose port postgres 5432
docker-compose port cognito-local 9229

# 2. バインドアドレスの確認
# docker-compose.ymlのports設定を確認
# "127.0.0.1:5432:5432" → "5432:5432" に変更

# 3. Docker Desktopのネットワーク設定確認
```

## パフォーマンス関連

### 起動が遅い

**症状**: `docker-compose up` の実行に時間がかかる

**解決方法**:

```bash
# 1. イメージのプル時間短縮
docker-compose pull

# 2. ビルドキャッシュの活用
docker-compose build --parallel

# 3. 不要なサービスの無効化
# 開発時に不要なサービスをコメントアウト

# 4. SSDの使用
# Docker Desktopのデータ保存先をSSDに設定
```

### 動作が重い

**症状**: コンテナの動作が遅い

**診断方法**:

```bash
# 1. リソース使用量確認
docker stats

# 2. ディスクI/O確認
docker system df

# 3. メモリ使用量確認
docker-compose exec postgres free -h
```

**解決方法**:

```bash
# 1. Docker Desktopのリソース設定増加
# CPU: 4コア以上
# メモリ: 8GB以上

# 2. PostgreSQL設定の最適化
# tools/docker/postgres/postgresql.conf を調整

# 3. 不要なコンテナの停止
docker-compose stop [unused_service]
```

## データ関連

### データが破損している

**症状**: データベースエラーやデータ不整合

**解決方法**:

```bash
# 1. データベースの整合性チェック
docker-compose exec postgres pg_dump -U goal_mandala_user goal_mandala_dev > /dev/null

# 2. データベースの修復
docker-compose exec postgres vacuumdb -U goal_mandala_user -d goal_mandala_dev --analyze

# 3. 最悪の場合はデータリセット
docker-compose down -v
docker-compose up -d
./tools/scripts/setup.sh
```

### バックアップ・リストアの問題

**症状**: データのバックアップ・リストアが失敗

**解決方法**:

```bash
# 1. 権限の確認
docker-compose exec postgres ls -la /var/lib/postgresql/data

# 2. ディスク容量の確認
docker-compose exec postgres df -h

# 3. 手動バックアップ・リストア
# バックアップ
docker-compose exec postgres pg_dump -U goal_mandala_user goal_mandala_dev > backup.sql

# リストア
docker-compose exec -T postgres psql -U goal_mandala_user goal_mandala_dev < backup.sql
```

## 診断ツール

### 自動診断スクリプト

```bash
# 総合診断
./tools/scripts/diagnose-issues.sh

# 個別診断
./tools/scripts/validate-env.sh
./tools/scripts/validate-docker-compose.sh
./tools/scripts/validate-postgres-setup.sh
./tools/scripts/validate-cognito-local.sh
./tools/scripts/health-check.sh
```

### 手動診断コマンド

```bash
# Docker環境の確認
docker info
docker-compose version

# サービス状態の確認
docker-compose ps
docker-compose logs --tail=50

# リソース使用量の確認
docker stats --no-stream
docker system df

# ネットワークの確認
docker network ls
docker network inspect goal-mandala-network

# ボリュームの確認
docker volume ls
docker volume inspect goal-mandala_postgres-data
```

### ログ収集

```bash
# 全サービスのログを収集
docker-compose logs > docker-logs.txt

# 特定サービスのログ
docker-compose logs postgres > postgres-logs.txt
docker-compose logs cognito-local > cognito-logs.txt

# システム情報の収集
docker info > docker-info.txt
docker-compose config > docker-compose-config.txt
```

## 緊急時の対応

### 完全リセット

```bash
# 1. 全コンテナとボリュームを削除
docker-compose down -v

# 2. 未使用リソースをクリーンアップ
docker system prune -a

# 3. 環境を再構築
cp .env.example .env
# .envファイルを編集
docker-compose up -d
./tools/scripts/setup.sh
```

### データ救出

```bash
# 1. 緊急バックアップ
docker-compose exec postgres pg_dumpall -U postgres > emergency-backup.sql

# 2. ボリュームのバックアップ
docker run --rm -v goal-mandala_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data-backup.tar.gz -C /data .

# 3. 設定ファイルのバックアップ
cp -r tools/docker/ backup-docker-config/
```

## サポート

### ログの提供

問題報告時は以下の情報を提供してください：

```bash
# 環境情報
docker info > environment-info.txt
docker-compose version >> environment-info.txt
uname -a >> environment-info.txt

# サービス状態
docker-compose ps > service-status.txt
docker-compose logs > service-logs.txt

# 設定情報
docker-compose config > compose-config.txt
```

### よくある質問

**Q: Docker Desktopのライセンスが必要ですか？**
A: 商用利用の場合は必要です。個人利用や小規模企業は無料で使用できます。

**Q: M1 Macで動作しますか？**
A: はい、ARM64対応のイメージを使用しているため動作します。

**Q: Windowsで動作しますか？**
A: はい、Docker Desktop for Windowsで動作します。WSL2の使用を推奨します。

**Q: 本番環境でも同じ構成を使用できますか？**
A: いいえ、これは開発環境専用です。本番環境ではAWS Aurora Serverless V2とAmazon Cognitoを使用します。

## 参考資料

- [Docker公式ドキュメント](https://docs.docker.com/)
- [Docker Compose公式ドキュメント](https://docs.docker.com/compose/)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [cognito-local GitHub](https://github.com/jagregory/cognito-local)
- [Docker環境セットアップガイド](./docker-setup-guide.md)
- [環境変数設定ガイド](./environment-variables.md)
