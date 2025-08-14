# 開発用スクリプト

このディレクトリには、開発環境のセットアップ、テスト、メンテナンスを行うスクリプトが含まれています。

## 開発環境セットアップスクリプト

### 1. メインセットアップスクリプト

```bash
./tools/scripts/setup.sh
```

**機能:**

- 依存関係チェックとインストール
- 環境変数ファイル作成
- Docker環境セットアップ
- PostgreSQL初期化確認
- cognito-local初期化確認
- エラーハンドリングと進捗表示

**オプション:**

- `--skip-docker`: Docker環境のセットアップをスキップ
- `--skip-deps`: 依存関係のインストールをスキップ
- `--verbose`: 詳細なログを表示

### 2. ヘルスチェックスクリプト

```bash
./tools/scripts/health-check.sh
```

**機能:**

- 開発環境の包括的なヘルスチェック
- 基本依存関係の確認
- Docker環境の状態確認
- PostgreSQLとcognito-localの動作確認
- ポート使用状況の確認
- 問題の自動検出と修復提案

**オプション:**

- `--verbose`: 詳細な診断情報を表示
- `--fix`: 問題を自動修復（可能な場合）

### 3. 個別サービスヘルスチェック

#### PostgreSQL接続確認

```bash
./tools/scripts/test-postgres-connection.sh
```

**機能:**

- PostgreSQL接続状態の詳細確認
- データベース存在確認
- UUID拡張機能確認
- 権限テスト
- データベース統計情報表示

**オプション:**

- `--verbose`: 詳細なログを表示
- `--json`: JSON形式で結果を出力

#### cognito-local動作確認

```bash
./tools/scripts/validate-cognito-local.sh
```

**機能:**

- cognito-local接続確認
- User Pool設定確認
- テストユーザー確認
- 認証エンドポイント確認
- 設定ファイル検証
- 応答時間測定

**オプション:**

- `--verbose`: 詳細なログを表示
- `--json`: JSON形式で結果を出力

### 4. エラー診断・トラブルシューティング

```bash
./tools/scripts/diagnose-issues.sh
```

**機能:**

- システム情報収集
- Docker環境の詳細診断
- PostgreSQLの包括的診断
- cognito-localの包括的診断
- 環境変数の確認
- 問題の自動検出と解決策提案

**オプション:**

- `--service SERVICE`: 特定のサービスのみ診断 (postgres|cognito-local|all)
- `--verbose`: 詳細なログを表示
- `--json`: JSON形式で結果を出力

**使用例:**

```bash
# 全サービスの診断
./tools/scripts/diagnose-issues.sh

# PostgreSQLのみ診断
./tools/scripts/diagnose-issues.sh --service postgres

# cognito-localのみ診断
./tools/scripts/diagnose-issues.sh --service cognito-local

# 詳細ログ付きで診断
./tools/scripts/diagnose-issues.sh --verbose

# JSON形式で結果出力
./tools/scripts/diagnose-issues.sh --json
```

### 5. データベース関連スクリプト

#### データベーススキーマ検証

```bash
./tools/scripts/validate-database-schema.sh
```

**機能:**

- PostgreSQL接続確認
- データベース存在確認
- ユーザー権限確認
- 拡張機能確認
- 接続テスト実行

#### シードデータ投入

```bash
./tools/scripts/seed-database.sh
```

**機能:**

- データベースシードデータの投入
- テストデータの投入（オプション）
- データリセット機能（オプション）

**オプション:**

- `--reset`: 既存データをリセット
- `--test-data`: テスト用データも投入

## 統合テストスクリプト

### 1. シンプル版統合テスト（推奨）

```bash
pnpm run test:integration
# または
node tools/scripts/integration-test-simple.js
```

**特徴:**

- 設定ファイルの整合性チェック
- ワークスペース構成の確認
- 依存関係設定の検証
- 実際のビルド・テストは実行しない
- 高速実行（数秒で完了）

**用途:**

- 設定変更後の基本確認
- CI/CDでの基本チェック
- 開発環境セットアップ後の確認

### 2. 完全版統合テスト

```bash
pnpm run test:integration:full
# または
node tools/scripts/integration-test-full.js
```

**特徴:**

- 実際の依存関係インストール
- 各パッケージのビルド実行
- 型チェック・リント・テストの実行
- パフォーマンス測定
- 包括的な動作確認

**用途:**

- 本格的な動作確認
- リリース前の最終チェック
- パフォーマンス測定

### 3. 高度版統合テスト

```bash
pnpm run test:integration:advanced
# または
node tools/scripts/integration-test.js
```

**特徴:**

- 最も包括的なテスト
- 非同期処理の詳細テスト
- エラーハンドリングの検証
- 詳細なログ出力

**用途:**

- 開発中のデバッグ
- 詳細な問題調査

### 4. Shell版統合テスト

```bash
pnpm run test:integration:shell
# または
bash tools/scripts/integration-test.sh
```

**特徴:**

- Bashスクリプトベース
- Node.js環境に依存しない
- シンプルな実装

**用途:**

- Node.js環境が不安定な場合
- シンプルなCI環境

## 使い分けガイド

| 状況 | 推奨スクリプト | 理由 |
|------|---------------|------|
| 日常的な開発 | シンプル版 | 高速で基本的な問題を検出 |
| 設定変更後 | シンプル版 | 設定の整合性を素早く確認 |
| プルリクエスト前 | 完全版 | 実際の動作を包括的に確認 |
| リリース前 | 完全版 | 本番環境での動作を保証 |
| 問題調査 | 高度版 | 詳細な情報で問題を特定 |
| CI/CD | シンプル版 | 高速で基本的な品質を保証 |

## テスト内容

### 共通テスト項目

- Node.js バージョン確認
- pnpm インストール確認
- 設定ファイル存在確認
- ワークスペース構成確認
- パッケージ依存関係確認
- Turbo設定確認

### 完全版・高度版の追加項目

- 実際の依存関係インストール
- 各パッケージのビルド
- 型チェック実行
- リント実行
- ユニットテスト実行
- パフォーマンス測定

## トラブルシューティング

### よくある問題と解決方法

#### 1. Node.js バージョンエラー

```bash
# asdf使用時
asdf install nodejs 23.10.0
asdf local nodejs 23.10.0

# nvm使用時
nvm install 23.10.0
nvm use 23.10.0
```

#### 2. pnpm がない

```bash
# npm経由でインストール
npm install -g pnpm

# または corepack使用
corepack enable
corepack prepare pnpm@latest --activate
```

#### 3. 依存関係エラー

```bash
# キャッシュクリア
pnpm store prune

# 再インストール
rm -rf node_modules packages/*/node_modules
pnpm install
```

#### 4. ビルドエラー

```bash
# shared パッケージを最初にビルド
pnpm --filter @goal-mandala/shared run build

# 全体をビルド
pnpm run build
```

## カスタマイズ

### 新しいテストの追加

各スクリプトの `main` 関数に新しいテストを追加できます：

```javascript
await runTest('新しいテスト', async () => {
  // テストロジック
});
```

### テストの無効化

特定のテストを無効化する場合は、該当する `runTest` 呼び出しをコメントアウトしてください。

### 設定の変更

各スクリプトの上部にある設定値を変更することで、テストの動作をカスタマイズできます。

## 使用例

### 初回セットアップ

```bash
# 完全なセットアップ
./tools/scripts/setup.sh

# セットアップ後の確認
./tools/scripts/health-check.sh
```

### 日常的な開発

```bash
# 環境状態の確認
./tools/scripts/health-check.sh

# 問題がある場合の自動修復
./tools/scripts/health-check.sh --fix

# 詳細な診断情報が必要な場合
./tools/scripts/health-check.sh --verbose

# 特定のサービスの詳細診断
./tools/scripts/diagnose-issues.sh --service postgres --verbose
./tools/scripts/diagnose-issues.sh --service cognito-local --verbose
```

### Docker環境のトラブルシューティング

```bash
# Docker環境のみ再セットアップ
./tools/scripts/setup.sh --skip-deps

# データベース状態の詳細確認
./tools/scripts/validate-database-schema.sh

# cognito-local状態の詳細確認
./tools/scripts/validate-cognito-local.sh
```

### CI/CD環境での使用

```bash
# 依存関係のみインストール（Docker環境スキップ）
./tools/scripts/setup.sh --skip-docker

# 基本的なヘルスチェック
./tools/scripts/health-check.sh
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. Docker環境の問題

```bash
# Docker環境のリセット
docker-compose down -v
./tools/scripts/setup.sh

# コンテナの状態確認
docker-compose ps
docker-compose logs -f
```

#### 2. PostgreSQL接続エラー

```bash
# PostgreSQL詳細診断
./tools/scripts/test-postgres-connection.sh --verbose

# または包括的診断
./tools/scripts/diagnose-issues.sh --service postgres --verbose

# PostgreSQL再起動
docker-compose restart postgres

# 接続テスト
docker-compose exec postgres pg_isready -U goal_mandala_user -d goal_mandala_dev
```

#### 3. cognito-local接続エラー

```bash
# cognito-local詳細診断
./tools/scripts/validate-cognito-local.sh --verbose

# または包括的診断
./tools/scripts/diagnose-issues.sh --service cognito-local --verbose

# cognito-local再起動
docker-compose restart cognito-local

# 接続テスト
curl -f http://localhost:9229/health
```

#### 4. 環境変数の問題

```bash
# .envファイルの再作成
rm .env
cp .env.example .env

# 環境変数の確認
./tools/scripts/health-check.sh --verbose
```

#### 5. 依存関係の問題

```bash
# 依存関係の再インストール
rm -rf node_modules packages/*/node_modules
pnpm install

# または
./tools/scripts/setup.sh --skip-docker
```

### エラーメッセージ別対処法

#### "PostgreSQLに接続できません"

1. Docker環境が起動しているか確認
2. ポート5432が使用されているか確認
3. 環境変数POSTGRES_PASSWORDが正しく設定されているか確認

#### "cognito-localに接続できません"

1. Docker環境が起動しているか確認
2. ポート9229が使用されているか確認
3. cognito-local設定ファイルが正しいか確認

#### "依存関係がインストールされていません"

1. Node.jsのバージョンが正しいか確認（23.10.0推奨）
2. pnpmがインストールされているか確認
3. ネットワーク接続を確認

## スクリプトの拡張

### 新しいヘルスチェックの追加

`tools/scripts/health-check.sh`に新しいチェック項目を追加する場合：

```bash
# 新しいチェック項目を追加
echo "🔍 新しいサービスチェック"
echo "======================="

log_info "新しいサービスを確認中..."
if new_service_check; then
    log_success "新しいサービスが正常です"
else
    log_error "新しいサービスに問題があります"
    record_issue "新しいサービスエラー"
fi
```

### カスタムセットアップ処理の追加

`tools/scripts/setup.sh`にカスタム処理を追加する場合：

```bash
# カスタムセットアップ処理
show_progress X Y "カスタム処理"
log_info "カスタム処理を実行中..."
# カスタム処理のロジック
log_success "カスタム処理が完了しました"
```

## AWS SAM CLI関連スクリプト

### SAM Local API起動スクリプト

```bash
./tools/scripts/sam-local-start.sh [オプション]
```

**機能:**

- AWS SAM CLIを使用したローカルAPI起動
- 依存関係の自動ビルド
- ホットリロード機能
- 環境変数の自動読み込み
- デバッグモード対応

**オプション:**

- `-p, --port PORT`: APIサーバーのポート番号 (デフォルト: 3001)
- `-h, --host HOST`: APIサーバーのホスト (デフォルト: 0.0.0.0)
- `-e, --env ENV`: 環境設定 (default|dev|staging|production, デフォルト: default)
- `--no-build`: ビルドをスキップ
- `--debug`: デバッグモードで実行
- `--help`: ヘルプを表示

**使用例:**

```bash
# デフォルト設定で起動
./tools/scripts/sam-local-start.sh

# ポート3002で起動
./tools/scripts/sam-local-start.sh -p 3002

# dev環境設定で起動
./tools/scripts/sam-local-start.sh -e dev

# ビルドをスキップして起動
./tools/scripts/sam-local-start.sh --no-build

# デバッグモードで起動
./tools/scripts/sam-local-start.sh --debug

# pnpmスクリプト経由で起動
pnpm run sam:start
pnpm run sam:start:debug
pnpm run sam:start:dev
```

**機能詳細:**

- **依存関係チェック**: AWS SAM CLI、Node.js、pnpmの存在確認
- **自動ビルド**: TypeScriptのビルドと依存関係のインストール
- **環境変数読み込み**: .envファイルからの環境変数自動読み込み
- **ホットリロード**: warm-containers機能による高速起動
- **設定管理**: samconfig.tomlからの設定自動読み込み

## 開発用ユーティリティスクリプト

### 1. Docker環境管理スクリプト

```bash
./tools/scripts/docker-env.sh [start|stop|restart|status]
```

**機能:**

- Docker開発環境の起動・停止・再起動
- 環境状態の確認
- ヘルスチェックの自動実行
- エラーハンドリングと詳細ログ

**使用例:**

```bash
# 環境起動
./tools/scripts/docker-env.sh start

# 環境停止
./tools/scripts/docker-env.sh stop

# 環境再起動
./tools/scripts/docker-env.sh restart

# 状態確認
./tools/scripts/docker-env.sh status
```

### 2. ログ確認スクリプト

```bash
./tools/scripts/docker-logs.sh [service-name] [options]
```

**機能:**

- 全サービスまたは特定サービスのログ表示
- リアルタイムログ監視
- エラーログのフィルタリング
- ログのエクスポート機能

**オプション:**

- `-f, --follow`: リアルタイム表示
- `-n, --tail N`: 最新N行を表示
- `--errors`: エラーログのみ表示
- `--export`: ログをファイルにエクスポート
- `--services`: 利用可能なサービス一覧を表示

**使用例:**

```bash
# 全サービスのログを表示
./tools/scripts/docker-logs.sh

# PostgreSQLのログを表示
./tools/scripts/docker-logs.sh postgres

# リアルタイムでログを監視
./tools/scripts/docker-logs.sh postgres -f

# エラーログのみを表示
./tools/scripts/docker-logs.sh --errors

# ログをファイルにエクスポート
./tools/scripts/docker-logs.sh --export
```

### 3. データリセットスクリプト

```bash
./tools/scripts/docker-reset.sh [command] [options]
```

**機能:**

- データベースデータのリセット
- Cognitoデータのリセット
- 全データの一括リセット
- シードデータの投入
- Docker環境の完全クリーンアップ

**コマンド:**

- `database`: データベースのみリセット
- `cognito`: Cognitoのみリセット
- `all`: 全データリセット（デフォルト）
- `seed`: シードデータ投入
- `cleanup`: 完全クリーンアップ

**オプション:**

- `-y, --yes`: 確認プロンプトをスキップ

**使用例:**

```bash
# 全データをリセット
./tools/scripts/docker-reset.sh

# データベースのみリセット
./tools/scripts/docker-reset.sh database

# 確認なしで全データリセット
./tools/scripts/docker-reset.sh all --yes

# シードデータを投入
./tools/scripts/docker-reset.sh seed

# 完全クリーンアップ
./tools/scripts/docker-reset.sh cleanup
```

### 4. データベース直接接続スクリプト

```bash
./tools/scripts/docker-db-connect.sh [command] [options]
```

**機能:**

- psqlでのデータベース直接接続
- 接続情報の表示
- データベース・テーブル一覧表示
- SQLファイルの実行
- データベースのバックアップ・リストア

**コマンド:**

- `connect [DB]`: psqlで接続（デフォルト）
- `info`: 接続情報を表示
- `pgadmin`: pgAdmin接続設定を表示
- `list-db`: データベース一覧を表示
- `list-tables [DB]`: テーブル一覧を表示
- `size [DB]`: データベースサイズを表示
- `exec-sql FILE [DB]`: SQLファイルを実行
- `backup [DB]`: データベースをバックアップ
- `restore FILE [DB]`: バックアップからリストア

**使用例:**

```bash
# デフォルトDBに接続
./tools/scripts/docker-db-connect.sh

# 特定のDBに接続
./tools/scripts/docker-db-connect.sh connect goal_mandala_test

# 接続情報を表示
./tools/scripts/docker-db-connect.sh info

# テーブル一覧を表示
./tools/scripts/docker-db-connect.sh list-tables

# SQLファイルを実行
./tools/scripts/docker-db-connect.sh exec-sql schema.sql

# データベースをバックアップ
./tools/scripts/docker-db-connect.sh backup

# バックアップからリストア
./tools/scripts/docker-db-connect.sh restore backup.sql
```

## 関連ドキュメント

- [統合テストガイド](../../docs/integration-testing.md)
- [開発環境セットアップ](../../README.md)
- [モノレポ構成](../../docs/monorepo-structure.md)
- [Docker環境設定](../docker/README.md)
