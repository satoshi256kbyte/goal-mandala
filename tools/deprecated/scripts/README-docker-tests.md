# Docker環境統合テスト

このディレクトリには、Docker Compose環境の統合テストスクリプトが含まれています。

## テストスクリプト一覧

### 1. メインテストランナー

- **`run-docker-tests.sh`** - 各種テストスイートを実行するメインスクリプト

### 2. テストスイート

- **`test-docker-env.sh`** - 完全な統合テスト（全機能テスト）
- **`test-docker-quick.sh`** - 基本動作確認用クイックテスト
- **`test-docker-ci.sh`** - CI/CD環境用自動テスト

### 3. 設定ファイル

- **`test-config.json`** - テスト設定とメタデータ
- **`README-docker-tests.md`** - このドキュメント

## 使用方法

### 基本的な使用方法

```bash
# プロジェクトルートで実行
./tools/scripts/run-docker-tests.sh [テストスイート]
```

### テストスイート

#### クイックテスト（推奨）

```bash
./tools/scripts/run-docker-tests.sh quick
```

- 実行時間: 約2分
- 基本的な動作確認のみ
- 開発中の動作確認に最適

#### 完全テスト

```bash
./tools/scripts/run-docker-tests.sh full
```

- 実行時間: 約5分
- 全機能の詳細テスト
- リリース前の最終確認に使用

#### CI/CDテスト

```bash
./tools/scripts/run-docker-tests.sh ci
```

- 実行時間: 約3分
- 自動化環境用
- 非対話式実行

#### 全テストスイート

```bash
./tools/scripts/run-docker-tests.sh all
```

- 全てのテストスイートを順次実行
- 最も包括的なテスト

## テスト内容

### 1. 前提条件チェック

- Docker Composeファイルの存在確認
- 設定ファイルの検証
- 環境変数ファイルの確認

### 2. コンテナ起動テスト

- Docker Composeによるサービス起動
- コンテナ状態の確認
- サービス間の依存関係確認

### 3. PostgreSQL接続テスト

- データベース接続確認
- 基本的なSQL操作テスト
- 拡張機能（uuid-ossp）の確認
- データ永続化テスト

### 4. cognito-local接続テスト

- サービス起動確認
- ヘルスチェックエンドポイント確認
- 設定ファイル読み込み確認

### 5. ネットワーク・統合テスト

- コンテナ間通信テスト
- ボリューム永続化テスト
- リソース使用量チェック
- ログ出力確認

## 要件対応

このテストスイートは以下の要件をカバーしています：

- **要件1.1**: Docker Composeでサービスが正常に起動すること
- **要件1.2**: PostgreSQLとcognito-localが正常に動作すること
- **要件2.1**: データベース接続が正常に行えること
- **要件2.2**: 認証サービスが正常に動作すること

## トラブルシューティング

### よくある問題

#### 1. ポート競合エラー

```
Error: Port 5432 is already in use
```

**解決方法**: 既存のPostgreSQLサービスを停止するか、ポートを変更

#### 2. 環境変数ファイル不足

```
ERROR: .env file not found
```

**解決方法**: `.env.example`を`.env`にコピーして設定

#### 3. Docker権限エラー

```
Permission denied while trying to connect to Docker daemon
```

**解決方法**: Dockerグループにユーザーを追加するか、sudoで実行

#### 4. メモリ不足

```
Container exited with code 137
```

**解決方法**: Dockerのメモリ制限を増やす

### ログ確認方法

```bash
# 全サービスのログ確認
docker-compose logs

# 特定サービスのログ確認
docker-compose logs postgres
docker-compose logs cognito-local

# リアルタイムログ監視
docker-compose logs -f
```

### 手動クリーンアップ

```bash
# コンテナとボリュームを完全削除
docker-compose down -v --remove-orphans

# 未使用のDockerリソースを削除
docker system prune -f
```

## CI/CD統合

### GitHub Actions例

```yaml
name: Docker Environment Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  docker-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Docker Integration Tests
      run: ./tools/scripts/run-docker-tests.sh ci
```

## 開発者向け情報

### テストスクリプトの拡張

新しいテストを追加する場合：

1. `test-docker-env.sh`に新しいテスト関数を追加
2. `test-config.json`にテスト情報を追加
3. 必要に応じて他のテストスイートにも追加

### テスト結果の解釈

- **PASS**: テストが成功
- **FAIL**: テストが失敗
- **WARNING**: 警告（テストは継続）

### パフォーマンス考慮事項

- クイックテストは開発中の頻繁な実行に適している
- 完全テストはリソース使用量が多いため、必要時のみ実行
- CI/CDテストは自動化環境での実行に最適化されている

## 関連ドキュメント

- [Docker Compose設定](../../docker-compose.yml)
- [環境変数設定](.env.example)
- [PostgreSQL初期化スクリプト](../docker/postgres/init.sql)
- [cognito-local設定](../docker/cognito-local/config.json)
