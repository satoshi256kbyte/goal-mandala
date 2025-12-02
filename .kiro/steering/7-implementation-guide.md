# 実装ガイド

## Git 運用ガイド

### Conventional Commits

このプロジェクトでは、[Conventional Commits v1.0.0](https://www.conventionalcommits.org/ja/v1.0.0/)に従ってコミットメッセージを記述してください。  

### ブランチ戦略

Git Flowを採用します。  

## リポジトリ構造

以下の構造でモノレポとして管理します：  

```bash
goal-mandala/
├── packages/
│   ├── frontend/           # React + TypeScript フロントエンド
│   ├── backend/            # Hono + Lambda バックエンド
│   ├── infrastructure/     # AWS CDK インフラ定義
│   └── shared/             # 共通型定義・ユーティリティ
├── tools/
│   ├── docker/             # Docker Compose設定
│   └── scripts/            # 開発用スクリプト
├── docs/                   # ドキュメント
├── .github/                # GitHub Actions設定
├── package.json            # モノレポルート設定
├── pnpm-workspace.yaml     # pnpm ワークスペース設定
├── .tool-versions          # asdfバージョン管理
├── .gitignore
├── .env.example
└── README.md
```

## 開発ツール管理方法

各種ツールは`asdf`を使用してインストール・管理します。  

## コーディング規約

- テストファースト
- TypeScriptの`any`型は使用しない
- 未使用変数は削除する
- ユニットテストでエラーがない状態を維持する
- リントでエラー、警告がない状態を維持する

## レスポンシブ対応

### ブレークポイント

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### 画面別対応

#### マンダラチャート画面

- Mobile: 縦スクロール、タップで詳細表示
- Tablet: 横スクロール対応、サイドパネル
- Desktop: 全体表示、ホバー効果

#### タスクリスト

- Mobile: カード形式、スワイプ操作
- Tablet: リスト形式、フィルター常時表示
- Desktop: テーブル形式、ソート機能

## アクセシビリティ対応

### 基本要件

- キーボード操作: 全機能をキーボードで操作可能
- スクリーンリーダー: 適切なARIAラベル設定
- 色覚対応: 色以外の情報でも判別可能
- フォントサイズ: 拡大表示対応

### 具体的対応

- `alt`属性の設定
- `aria-label`、`aria-describedby`の適切な使用
- フォーカス表示の明確化
- 十分なコントラスト比の確保

## パフォーマンス要件

### ページロード時間

- 初回ロード: < 3秒
- 画面遷移: < 1秒
- AI処理: < 30秒（進捗表示付き）

### 最適化手法

- Code Splitting: ページ単位での分割
- Lazy Loading: 画像・コンポーネントの遅延読み込み
- Caching: APIレスポンスのキャッシュ
- Compression: 静的ファイルの圧縮

## エラーハンドリング

### エラー画面

- 404 Not Found: ページが見つからない
- 500 Server Error: サーバーエラー
- Network Error: ネットワークエラー
- AI Processing Error: AI処理エラー

### エラー表示方針

- Toast通知: 軽微なエラー
- モーダル: 重要なエラー
- インライン: フォーム入力エラー
- 専用ページ: システムエラー

## セキュリティ考慮事項

### 認証・認可

- JWT Token: 有効期限付きトークン
- CSRF Protection: CSRFトークンの実装
- XSS Prevention: 入力値のサニタイズ

### データ保護

- HTTPS: 全通信の暗号化
- Input Validation: 入力値検証
- SQL Injection Prevention: パラメータ化クエリ

## パフォーマンス最適化

### フロントエンド最適化

- React最適化: memo、useMemo、useCallbackの適切な使用
- バンドル最適化: Code Splitting、Tree Shaking
- キャッシュ戦略: React Queryによるデータキャッシュ
- 画像最適化: WebP形式、遅延読み込み

### バックエンド最適化

- データベース最適化: 適切なインデックス設計
- Lambda最適化: コールドスタート対策
- キャッシュ戦略: CloudFrontによる静的コンテンツキャッシュ
- 接続プール: Prismaの接続プール設定

### 監視・ログ

- アプリケーションログ: CloudWatch Logs
- パフォーマンス監視: CloudWatch Metrics
- エラー追跡: X-Ray トレーシング
- アラート設定: 異常検知とSlack通知

### 入力検証

- フロントエンド: React Hook Formによる検証
- バックエンド: Zodによるスキーマ検証
- SQLインジェクション対策: Prismaによるパラメータ化クエリ

## Docker環境

### Docker Composeセットアップ

ローカル開発環境では以下のサービスがDocker Composeで起動されます：

- PostgreSQL: メインデータベース
- cognito-local: Amazon Cognitoのローカルエミュレータ

#### 前提条件

以下のツールがインストールされている必要があります：

- Docker Desktop (または Docker Engine + Docker Compose)
- Git
- asdf (バージョン管理ツール)

#### セットアップ手順

```bash
# 1. リポジトリのクローン
git clone https://github.com/your-org/goal-mandala.git
cd goal-mandala

# 2. 開発ツールのセットアップ
asdf plugin add nodejs
asdf plugin add python
asdf plugin add pnpm
asdf install
pnpm install

# 3. 環境変数の設定
cp .env.example .env
# .envファイルを編集してPOSTGRES_PASSWORDとJWT_SECRETを設定

# 4. Docker環境の起動
docker-compose up -d

# 5. 初期化スクリプトの実行
./tools/scripts/setup.sh

# 6. 動作確認
./tools/scripts/health-check.sh
```

#### サービス詳細

PostgreSQL:
- ポート: 5432
- データベース名: goal_mandala_dev, goal_mandala_test
- ユーザー名: goal_mandala_user
- データ永続化: `postgres-data` ボリューム

cognito-local:
- ポート: 9229
- エンドポイント: <http://localhost:9229>
- 設定ファイル: `tools/docker/cognito-local/config.json`
- データ永続化: `cognito-data` ボリューム

#### 開発用コマンド

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

# データベース接続
make -C tools/docker db-connect

# 環境クリーンアップ（データも削除）
make -C tools/docker clean
```

### Docker最適化

#### リソース制限設定

各サービスに適切なリソース制限を設定し、システムリソースの効率的な利用を実現します。

PostgreSQL:
- 制限: メモリ512MB、CPU 0.5コア
- 予約: メモリ256MB、CPU 0.25コア

Cognito Local:
- 制限: メモリ256MB、CPU 0.25コア
- 予約: メモリ128MB、CPU 0.1コア

#### ヘルスチェック設定

PostgreSQL:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U goal_mandala_user -d goal_mandala_dev"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Cognito Local:
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:9229/health || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

#### ログ設定

- ドライバー: json-file
- 最大サイズ: 10MB
- 最大ファイル数: 3個
- 本番環境: 圧縮有効、50MB、5ファイル

#### PostgreSQL最適化設定

開発環境用に最適化された設定（`tools/docker/postgres/postgresql.conf`）：

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### トラブルシューティング

#### よくある問題と解決方法

ポート競合:
```bash
# 使用中のポートを確認
lsof -i :5432  # PostgreSQL
lsof -i :9229  # cognito-local

# 競合するプロセスを停止
sudo kill -9 [PID]
```

データベースに接続できない:
```bash
# PostgreSQLコンテナの状態確認
docker-compose ps postgres

# PostgreSQLログの確認
docker-compose logs postgres

# 接続テスト
./tools/scripts/test-postgres-connection.sh
```

cognito-localが起動しない:
```bash
# コンテナログの確認
docker-compose logs cognito-local

# 設定ファイルの確認
cat tools/docker/cognito-local/config.json

# 専用スクリプトで診断
./tools/scripts/validate-cognito-local.sh
```

動作が重い:
```bash
# リソース使用量確認
docker stats

# Docker Desktopのリソース設定増加
# CPU: 4コア以上、メモリ: 8GB以上推奨
```

完全リセット:
```bash
# 全コンテナとボリュームを削除
docker-compose down -v

# 未使用リソースをクリーンアップ
docker system prune -a

# 環境を再構築
cp .env.example .env
docker-compose up -d
./tools/scripts/setup.sh
```

#### 診断ツール

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

## GitHub設定

### ブランチ保護ルール

#### mainブランチの保護設定

GitHubリポジトリの Settings > Branches で以下の設定を行います：

必須設定項目:

- ✅ Require a pull request before merging
  - Required approving reviews: 1
  - Dismiss stale reviews when new commits are pushed
  - Require review from code owners
  
- ✅ Require status checks to pass before merging
  - Require branches to be up to date before merging
  - Status checks: `CI / lint-and-test`, `CI / type-check`, `CI / build`, `CI / test-coverage`
  
- ✅ Require conversation resolution before merging
- ✅ Require signed commits
- ✅ Require linear history
- ✅ Include administrators
- ❌ Allow force pushes (禁止)
- ❌ Allow deletions (禁止)

#### developブランチの保護設定

mainブランチより緩和された設定：

- ✅ Require a pull request before merging (1承認)
- ✅ Require status checks to pass before merging
- ✅ Require conversation resolution before merging
- ❌ Require signed commits (緩和)
- ❌ Require linear history (緩和)

### GitHub Secrets設定

CI/CDパイプラインで必要なシークレットを設定します。

Settings > Secrets and variables > Actions で以下を設定：

#### AWS関連シークレット

| シークレット名 | 説明 | 例 |
|---------------|------|-----|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/...` |
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `AWS_ACCOUNT_ID` | AWSアカウントID | `123456789012` |

#### デプロイ関連シークレット

| シークレット名 | 説明 |
|---------------|------|
| `S3_BUCKET_NAME` | フロントエンド用S3バケット名 |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFrontディストリビューションID |
| `DATABASE_SECRET_ARN` | AWS Secrets ManagerのARN |
| `JWT_SECRET` | JWT署名用秘密鍵 |

#### IAMユーザー作成と権限設定

```bash
# IAMユーザーを作成
aws iam create-user --user-name github-actions-user

# アクセスキーを作成
aws iam create-access-key --user-name github-actions-user
```

必要な権限（IAMポリシー）:
- S3: GetObject, PutObject, DeleteObject, ListBucket
- CloudFront: CreateInvalidation, GetInvalidation
- Lambda: UpdateFunctionCode, UpdateFunctionConfiguration
- Secrets Manager: GetSecretValue

#### セキュリティベストプラクティス

- 最小権限の原則を適用
- 定期的なアクセスキーローテーション（推奨：90日毎）
- CloudTrailでAPI呼び出しを監視
- 異常なアクセスパターンの検出

### Huskyセットアップ

Pre-commit Hookを使用してコード品質を保証します。

#### 設定内容

`.husky/pre-commit`で以下のチェックを実行：

1. Lint-staged: ESLint + Prettier
2. Type Checking: TypeScript型チェック

#### テスト方法

```bash
# Pre-commit hookを手動テスト
pnpm husky:test

# Lint-stagedのみテスト
pnpm lint-staged:test

# 型チェックのみテスト
pnpm type-check:all
```

#### トラブルシューティング

```bash
# Hookが実行されない場合
pnpm husky:install

# 権限エラーの場合
chmod +x .husky/pre-commit

# 緊急時のみ（非推奨）
git commit --no-verify -m "emergency commit"
```

### CODEOWNERSファイル

`.github/CODEOWNERS`でコードレビュー担当者を指定：

```
# Global owners
* @goal-mandala-team

# Frontend specific
/packages/frontend/ @frontend-team @goal-mandala-team

# Backend specific  
/packages/backend/ @backend-team @goal-mandala-team

# Infrastructure specific
/packages/infrastructure/ @devops-team @goal-mandala-team

# CI/CD workflows
/.github/ @devops-team @goal-mandala-team
```

## CI/CD設定

### バージョン管理

#### asdf設定（.tool-versions）

プロジェクトルートの`.tool-versions`ファイルで以下のバージョンを管理：

```
nodejs 23.10.0
python 3.13.3
```

注意: pnpmは`package.json`の`packageManager`フィールドで管理されており、asdfでは管理していません。

#### package.json engines設定

ルート`package.json`の`engines`フィールドで最小バージョンを指定：

```json
{
  "engines": {
    "node": ">=23.10.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

### GitHub Actions設定

GitHub Actionsワークフローでのバージョン設定例：

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '23.10.0'
          cache: 'pnpm'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.13.3'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: '8.15.0'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test
```

### バージョン確認コマンド

開発環境でバージョンを確認：

```bash
# Node.jsバージョン確認
node --version
# 期待値: v23.10.0

# Pythonバージョン確認
python --version
# 期待値: Python 3.13.3

# pnpmバージョン確認
npx pnpm --version
# 期待値: 8.15.0
```

### バージョン更新手順

1. `.tool-versions`ファイルの更新:
   ```bash
   echo "nodejs 23.11.0" > .tool-versions
   echo "python 3.13.4" >> .tool-versions
   ```

2. `package.json`の`engines`フィールド更新:
   ```json
   {
     "engines": {
       "node": ">=23.11.0",
       "pnpm": ">=8.16.0"
     },
     "packageManager": "pnpm@8.16.0"
   }
   ```

3. CI/CDワークフローの更新: GitHub ActionsやDockerfileの該当箇所を更新

4. 依存関係の再インストール:
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

### トラブルシューティング

```bash
# Node.jsバージョンが一致しない場合
asdf uninstall nodejs 23.10.0
asdf install nodejs 23.10.0
asdf global nodejs 23.10.0

# Pythonバージョンが一致しない場合
asdf uninstall python 3.13.3
asdf install python 3.13.3
asdf global python 3.13.3

# pnpmバージョンが一致しない場合
npm uninstall -g pnpm
npm install -g pnpm@8.15.0
```

## 環境変数管理

### 環境変数ファイルの作成

#### .envファイルの作成

プロジェクトルートで以下のコマンドを実行：

```bash
cp .env.example .env
```

#### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | PostgreSQL接続URL | `postgresql://user:password@localhost:5432/dbname` |
| `POSTGRES_PASSWORD` | PostgreSQLパスワード | `secure_password_123` |
| `NODE_ENV` | 実行環境 | `development`, `test`, `production` |
| `PORT` | APIサーバーポート | `3001` |
| `FRONTEND_URL` | フロントエンドURL | `http://localhost:3000` |
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |
| `JWT_SECRET` | JWT署名用秘密鍵 | `32文字以上の安全な文字列` |

#### セキュリティ上の注意

- JWT_SECRET: 32文字以上の安全な文字列を設定
- POSTGRES_PASSWORD: デフォルト値から変更
- 本番環境: より強固なパスワードと秘密鍵を使用

### 環境変数検証

#### 検証コマンド

```bash
# 環境変数検証の実行
pnpm run env:validate

# または直接実行
bash tools/scripts/validate-env.sh

# Node.js版の検証
pnpm run env:validate:node
```

#### 検証内容

1. 必須環境変数の存在確認: すべての必須環境変数が設定されているかチェック
2. データベースURL形式の検証: PostgreSQL接続URLの形式が正しいかチェック
3. ポート番号の検証: ポート番号が1-65535の範囲内かチェック
4. URL形式の検証: フロントエンドURLやAPIのURL形式をチェック
5. NODE_ENV値の検証: 標準的な値（development/test/production）かチェック
6. セキュリティ設定の検証: JWT_SECRETの長さと安全性をチェック
7. Docker環境の確認: DockerとDocker Composeがインストールされているかチェック

#### 検証結果の例

成功時：
```
[SUCCESS] .envファイルが見つかりました
[SUCCESS] すべての必須環境変数が設定されています
[SUCCESS] DATABASE_URLの形式が正しいです
[SUCCESS] PORTの値が正しいです: 3001
[SUCCESS] NODE_ENVの値が正しいです: development
[SUCCESS] JWT_SECRETの長さが適切です
```

エラー時：
```
[ERROR] .envファイルが見つかりません
[ERROR] 環境変数 JWT_SECRET が設定されていません
[WARNING] JWT_SECRETがデフォルト値のままです
```

### 環境別設定

#### 開発環境（development）

```bash
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# データベース設定（Docker Compose）
DATABASE_URL=postgresql://goal_mandala_user:your_password@localhost:5432/goal_mandala_dev
POSTGRES_PASSWORD=your_password

# Cognito Local設定
COGNITO_LOCAL_ENDPOINT=http://localhost:9229
COGNITO_USER_POOL_ID=local_user_pool_id
COGNITO_CLIENT_ID=local_client_id

# AWS設定（ローカル開発用）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# JWT設定
JWT_SECRET=your_jwt_secret_here_32_chars_minimum
```

#### テスト環境（test）

```bash
NODE_ENV=test
PORT=3002
DATABASE_URL=postgresql://goal_mandala_user:password@localhost:5432/goal_mandala_test
```

#### 本番環境（production）

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:secure_password@prod-host:5432/goal_mandala_prod
JWT_SECRET=very_long_and_secure_secret_key_for_production_64_chars_min
```

### トラブルシューティング

#### よくあるエラーと対処法

1. .envファイルが見つからない:
```bash
cp .env.example .env
```

2. JWT_SECRETがデフォルト値のまま:
.envファイルでJWT_SECRETを32文字以上の安全な値に変更

3. データベースURL形式エラー:
正しい形式: `postgresql://username:password@host:port/database`

4. ポート番号エラー:
PORTを1-65535の範囲内の数値に設定

### Docker環境での特別な考慮事項

#### Docker Composeでの環境変数

1. データベース接続: ホスト名は `localhost` を使用（Docker Composeがポートフォワーディングを行う）
2. cognito-local接続: エンドポイントは `http://localhost:9229` を使用
3. ポート設定: Docker Composeがポートマッピングを行うため、標準ポートを使用可能

#### Docker環境の検証

```bash
# Docker環境の総合チェック
./tools/scripts/validate-docker-compose.sh

# PostgreSQL接続テスト
./tools/scripts/test-postgres-connection.sh

# cognito-local接続テスト
./tools/scripts/validate-cognito-local.sh

# 全体的なヘルスチェック
./tools/scripts/health-check.sh
```

## ドキュメント

- 一般利用者向けと開発者向けで、ドキュメントを分けてください。
- プロダクトの概要、大まかな現在の開発状況、使い方はREADME.mdに書いてください。
- セットアップ方法、開発ツールの使い方、開発者用コマンドなどはCONTRIBUTING.mdに書いてください。
