# 開発者向けガイド (CONTRIBUTING.md)

このドキュメントは、目標管理曼荼羅プロジェクトの開発に参加する開発者向けの詳細なガイドです。

## 目次

- [開発環境セットアップ](#開発環境セットアップ)
- [プロジェクト構成詳細](#プロジェクト構成詳細)
- [開発ワークフロー](#開発ワークフロー)
- [テスト戦略](#テスト戦略)
- [デプロイメント](#デプロイメント)
- [トラブルシューティング](#トラブルシューティング)

## 開発環境セットアップ

### 前提条件

以下のツールがインストールされている必要があります：

- **asdf**: バージョン管理ツール
- **Docker**: ローカル開発環境用
- **Git**: バージョン管理
- **AWS SAM CLI**: Lambda関数のローカル実行用

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/goal-mandala.git
cd goal-mandala
```

### 2. 開発ツールのインストール

```bash
# asdfプラグインのインストール
asdf plugin add nodejs
asdf plugin add python
asdf plugin add pnpm

# .tool-versionsに基づいてツールをインストール
asdf install

# pnpmが正しくインストールされているか確認
pnpm --version  # 8.15.0が表示されるはず
```

### 2.1. AWS SAM CLIのインストール

AWS SAM CLIは、Lambda関数とAPI Gatewayをローカルでエミュレートするために必要です。

**macOS (Homebrew使用)**:

```bash
brew tap aws/tap
brew install aws-sam-cli

# インストール確認
sam --version
```

**その他のOS**:
[AWS SAM CLI公式インストールガイド](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)を参照してください。

**Docker Desktopの確認**:
SAM CLIはDockerを使用してLambda実行環境をエミュレートします。

```bash
# Dockerが起動していることを確認
docker --version
docker ps
```

### 3. 依存関係のインストール

```bash
# 全パッケージの依存関係をインストール
pnpm install

# インストール確認
pnpm list --depth=0
```

### 4. 環境変数の設定

```bash
# 環境変数ファイルをコピー
cp .env.example .env

# 必要に応じて.envファイルを編集
# 特に以下の値は必ず変更してください：
# - POSTGRES_PASSWORD: データベースパスワード
# - JWT_SECRET: JWT署名用秘密鍵
```

詳細な環境変数設定については [実装ガイド](./.kiro/steering/7-implementation-guide.md#環境変数管理) を参照してください。

### 5. Docker環境のセットアップ

ローカル開発にはDocker Composeを使用してPostgreSQLとcognito-localを起動します。

```bash
# Docker環境の起動
docker-compose up -d

# または、Makefileを使用（推奨）
make -C tools/docker up

# サービス状態確認
make -C tools/docker health

# 初期化スクリプトの実行
./tools/scripts/setup.sh
```

Docker環境の詳細については [実装ガイド](./.kiro/steering/7-implementation-guide.md#docker環境) を参照してください。

### 6. 開発環境の起動確認

```bash
# 全パッケージをビルド
pnpm build

# テストを実行
pnpm test

# SAM CLI環境の確認
cd packages/backend
sam validate --template template.yaml
sam build

# ローカルAPI起動テスト
sam local start-api --port 3001 &
sleep 10
curl http://localhost:3001/health
kill %1  # バックグラウンドプロセスを終了

# 開発サーバーを起動
pnpm dev
```

## プロジェクト構成詳細

### モノレポ構成

このプロジェクトは **pnpm workspace** と **Turbo** を使用したモノレポ構成です。

#### ワークスペース設定 (`pnpm-workspace.yaml`)

```yaml
packages:
  - 'packages/*'
  - 'tools/*'
```

#### Turbo設定 (`turbo.json`)

Turboは以下のタスクの依存関係とキャッシュを管理します：

- `build`: パッケージのビルド
- `test`: テストの実行
- `lint`: リントチェック
- `type-check`: TypeScript型チェック

### パッケージ詳細

#### `packages/shared`

**役割**: 共通型定義とユーティリティ

```typescript
// 主要なエクスポート
export * from './types';
export * from './utils';
export * from './constants';
```

**開発時の注意点**:

- 他のパッケージから参照されるため、破壊的変更は慎重に行う
- 型定義の変更後は必ず `pnpm build` を実行
- 循環依存を避ける

#### `packages/frontend`

**役割**: React フロントエンド

**主要技術**:

- React 18 + TypeScript
- Vite (ビルドツール)
- Tailwind CSS (スタイリング)
- React Router (ルーティング)
- Vitest (テスト)

**開発コマンド**:

```bash
# 開発サーバー起動
pnpm --filter @goal-mandala/frontend dev

# ビルド
pnpm --filter @goal-mandala/frontend build

# テスト実行
pnpm --filter @goal-mandala/frontend test
```

#### `packages/backend`

**役割**: Hono バックエンド (AWS Lambda)

**主要技術**:

- Hono (Web フレームワーク)
- AWS SDK (Bedrock, Secrets Manager等)
- Prisma (ORM)
- Zod (バリデーション)
- Jest (テスト)

**開発コマンド**:

```bash
# ローカルAPI起動 (SAM CLI使用)
pnpm --filter @goal-mandala/backend dev

# ビルド
pnpm --filter @goal-mandala/backend build

# テスト実行
pnpm --filter @goal-mandala/backend test
```

#### `packages/infrastructure`

**役割**: AWS CDK インフラ定義

**主要技術**:

- AWS CDK v2
- TypeScript
- Jest (テスト)

**開発コマンド**:

```bash
# CDKスタックをシンセサイズ
pnpm --filter @goal-mandala/infrastructure run synth

# 差分確認
pnpm --filter @goal-mandala/infrastructure run diff

# デプロイ
pnpm --filter @goal-mandala/infrastructure run deploy
```

## 開発ワークフロー

### ブランチ戦略

Git Flow を採用しています：

- `main`: 本番環境用
- `develop`: 開発統合用
- `feature/*`: 機能開発用
- `hotfix/*`: 緊急修正用

### 開発手順

#### 1. 新機能開発

```bash
# developブランチから機能ブランチを作成
git checkout develop
git pull origin develop
git checkout -b feature/mandala-chart-display

# 開発作業
# ...

# コミット前のチェック
pnpm lint:all
pnpm type-check:all
pnpm test:all

# コミット
git add .
git commit -m "feat: マンダラチャート表示機能を追加"

# プッシュ
git push origin feature/mandala-chart-display
```

#### 2. プルリクエスト作成

- GitHub上でプルリクエストを作成
- レビュアーを指定
- CI/CDチェックが通ることを確認

#### 3. コードレビュー

- 機能要件の確認
- コード品質の確認
- テストカバレッジの確認
- セキュリティの確認

### コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/) に従います：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Type一覧**:

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コードスタイル変更（機能に影響なし）
- `refactor`: リファクタリング
- `perf`: パフォーマンス改善
- `test`: テスト追加・修正
- `build`: ビルドシステム変更
- `ci`: CI設定変更
- `chore`: その他の変更

**例**:

```
feat(frontend): マンダラチャート表示コンポーネントを追加

9x9グリッドレイアウトでマンダラチャートを表示する
コンポーネントを実装。レスポンシブ対応済み。

Closes #123
```

## テスト戦略

### テストピラミッド（簡素化版）

このプロジェクトでは、軽量で高速なテスト実行を優先し、以下の簡素化されたテストピラミッドを採用しています：

```
        E2E (3)
       /       \
  統合テスト (3)
     /           \
ユニットテスト (30)
```

1. **ユニットテスト** (約30ファイル): コア機能、エラーハンドリング、セキュリティに集中
2. **統合テスト** (3ファイル): 認証、目標作成、プロフィール設定の重要フローのみ
3. **E2Eテスト** (3ファイル): 認証、目標作成、マンダラ編集の主要ユーザーフローのみ

### テスト実行タイミング

| テストタイプ | 開発中 | コミット前 | PR作成時 | マージ前 |
|------------|--------|-----------|---------|---------|
| ユニットテスト | ✓ | ✓ | ✓ | ✓ |
| 統合テスト | - | ✓ | ✓ | ✓ |
| E2Eテスト | - | - | ✓ | ✓ |
| カバレッジ | - | - | ✓ | ✓ |

### 削除されたテスト

テストアーキテクチャ刷新により、以下のテストは削除されました：

- **パフォーマンステスト**: 別途パフォーマンス監視ツールで実施
- **アクセシビリティテスト**: 開発時のマニュアルチェックとE2Eテストで代替
- **重複テストファイル**: 1コンポーネント=1テストファイルに統合（約82%削減）

### テスト実行

#### 基本的なテスト実行

```bash
# 全パッケージのテスト実行
pnpm test

# カバレッジ付きテスト
pnpm test:coverage

# 統合テスト
pnpm test:integration

# E2Eテスト (Playwright)
pnpm --filter @goal-mandala/frontend test:e2e
```

#### フロントエンドテストの使い分け

フロントエンドでは、開発フローに応じて最適なテストコマンドを選択できます：

```bash
# 1. 基本テスト（高速・カバレッジなし、推奨）
pnpm --filter @goal-mandala/frontend test
# - 実行時間: 約60秒
# - カバレッジ: なし
# - 分離: なし（高速実行）
# - 用途: 開発中の高速フィードバック

# 2. ユニットテストのみ実行
pnpm --filter @goal-mandala/frontend test:unit
# - 実行時間: 約60秒
# - カバレッジ: なし
# - 対象: ユニットテストのみ（統合テスト除外）
# - 用途: コミット前の品質確認

# 3. 統合テストのみ実行
pnpm --filter @goal-mandala/frontend test:integration
# - 実行時間: 約30秒
# - カバレッジ: なし
# - 対象: 統合テストのみ
# - 用途: API統合の確認

# 4. カバレッジ付きテスト
pnpm --filter @goal-mandala/frontend test:coverage
# - 実行時間: JSON形式のみ
# - カバレッジ: あり（JSON形式のみ）
# - 用途: PR作成前、CI/CD

# 5. E2Eテスト（重要フローのみ）
pnpm --filter @goal-mandala/frontend test:e2e
# - 実行時間: 約120秒
# - 対象: 認証、目標作成、マンダラ編集
# - 用途: PR作成前、マージ前

# 6. 開発用ウォッチモード
pnpm --filter @goal-mandala/frontend test:watch
# - カバレッジ: なし
# - 用途: 開発中の継続的なテスト実行
```

#### テスト実行のベストプラクティス

**開発フロー別の推奨コマンド**:

1. **開発中（頻繁な実行）**:
   ```bash
   pnpm --filter @goal-mandala/frontend test
   # または
   pnpm --filter @goal-mandala/frontend test:watch
   ```
   - カバレッジ計算なしで高速フィードバック
   - コード変更のたびに実行しても負担が少ない

2. **コミット前（品質確認）**:
   ```bash
   pnpm --filter @goal-mandala/frontend test:unit
   ```
   - ユニットテストのみを確実に実行
   - 統合テストを除外して実行時間を短縮

3. **プルリクエスト作成前（完全チェック）**:
   ```bash
   pnpm --filter @goal-mandala/frontend test:coverage
   pnpm --filter @goal-mandala/frontend test:integration
   pnpm --filter @goal-mandala/frontend test:e2e
   ```
   - カバレッジレポートを生成（JSON形式のみ）
   - 統合テストとE2Eテストも実行

4. **CI/CD環境**:
   ```bash
   pnpm test  # 全パッケージのテスト
   pnpm test:coverage  # カバレッジ付き
   ```
   - タイムアウト設定で安全に実行
   - 全体で10分以内に完了

**パフォーマンス最適化のポイント**:

- **カバレッジ計算の制御**: デフォルトで無効化、必要時のみ `test:coverage` で実行
- **並列実行の最適化**: maxConcurrency: 4, maxForks: 2 でメモリ効率優先
- **テスト分離の無効化**: `isolate: false` で高速実行
- **タイムアウトの短縮**: testTimeout: 3000ms で遅いテストを早期検出
- **統合テストの分離**: ユニットテストと統合テストを分けて実行可能

### テスト作成ガイドライン

#### 基本方針

1. **1コンポーネント = 1テストファイル**: 重複テストファイルは作成しない
2. **コア機能に集中**: UI詳細、アニメーション、レスポンシブテストは不要
3. **最小限のテストケース**: エッジケースの過剰なテストは避ける
4. **統合テストは最小限**: 重要なユーザーフローのみ

#### テストケースの優先順位

- **高**: コア機能、エラーハンドリング、セキュリティ
- **中**: バリデーション、状態管理
- **低**: UI詳細、アニメーション、レスポンシブ（テスト不要）

#### フロントエンド (React Testing Library)

```typescript
// コンポーネントテストの例（コア機能のみ）
import { render, screen } from '@testing-library/react';
import { MandalaChart } from './MandalaChart';

describe('MandalaChart', () => {
  // コア機能のみテスト
  describe('基本機能', () => {
    it('should render mandala chart with 9x9 grid', () => {
      render(<MandalaChart />);
      
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
      
      const cells = screen.getAllByRole('gridcell');
      expect(cells).toHaveLength(81);
    });
  });
  
  // エラーハンドリング
  describe('エラーハンドリング', () => {
    it('should display error message when data loading fails', () => {
      // エラーケースのテスト
    });
  });
  
  // レスポンシブ、アニメーション、UI詳細のテストは不要
});
```

#### バックエンド (Jest)

```typescript
// APIテストの例
import { testClient } from 'hono/testing';
import { app } from '../src/app';

describe('Goals API', () => {
  it('should create a new goal', async () => {
    const res = await testClient(app).goals.$post({
      json: {
        title: 'Test Goal',
        description: 'Test Description',
        deadline: '2024-12-31'
      }
    });
    
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe('Test Goal');
  });
});
```

#### カバレッジ目標

- **コア機能**: 80%以上
- **エラーハンドリング**: 80%以上
- **セキュリティ機能**: 100%
- **UI詳細**: カバレッジ不要（テスト対象外）

## デプロイメント

### ローカル開発環境

#### Docker Compose使用

```bash
# PostgreSQL + cognito-localを起動
docker-compose up -d

# または、Makefileを使用（推奨）
make -C tools/docker up

# 初期化スクリプトの実行（初回のみ）
./tools/scripts/setup.sh

# データベースマイグレーション
pnpm --filter @goal-mandala/backend run db:migrate

# シードデータ投入
pnpm --filter @goal-mandala/backend run db:seed

# 動作確認
./tools/scripts/health-check.sh
```

**Docker環境の管理コマンド**:

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

# 環境クリーンアップ
make -C tools/docker clean

# 利用可能なコマンド一覧
make -C tools/docker help
```

#### AWS SAM CLI使用

AWS SAM CLIを使用してLambda関数とAPI Gatewayをローカルでエミュレートできます。

**前提条件**:

- AWS SAM CLIがインストールされていること
- Docker Desktopが起動していること

**SAM CLI環境のセットアップ**:

```bash
# SAM CLIのインストール確認
sam --version

# backendディレクトリに移動
cd packages/backend

# SAMテンプレートの確認
cat template.yaml

# SAM設定の確認
cat samconfig.toml
```

**ローカルAPI起動**:

```bash
# 方法1: pnpmスクリプト使用（推奨）
pnpm --filter @goal-mandala/backend dev

# 方法2: 直接SAMコマンド使用
cd packages/backend
sam build
sam local start-api --port 3001 --host 0.0.0.0

# 方法3: 専用スクリプト使用
./tools/scripts/sam-local-start.sh
```

**フロントエンドとの連携**:

```bash
# 別ターミナルでフロントエンド起動
pnpm --filter @goal-mandala/frontend dev

# APIエンドポイント確認
curl http://localhost:3001/health
```

**SAM CLI開発のワークフロー**:

1. **コード変更**: `packages/backend/src/` 内のファイルを編集
2. **自動ビルド**: ファイル変更を検知して自動的にリビルド
3. **ホットリロード**: 変更が即座にローカルAPIに反映
4. **テスト**: ブラウザまたはcurlでAPIをテスト

**SAMビルドとテスト**:

```bash
# SAMビルド実行
pnpm --filter @goal-mandala/backend build

# または直接実行
cd packages/backend
sam build

# ビルド成果物の確認
ls -la .aws-sam/build/

# Lambda関数の単体テスト
sam local invoke ApiFunction --event events/test-event.json

# API Gateway統合テスト
curl -X POST http://localhost:3001/api/v1/goals \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Goal","description":"Test Description"}'
```

### ステージング・本番環境

#### CDKデプロイ

```bash
# ステージング環境
pnpm --filter @goal-mandala/infrastructure run deploy -- --context environment=staging

# 本番環境
pnpm --filter @goal-mandala/infrastructure run deploy -- --context environment=production
```

#### GitHub Actions

CI/CDパイプラインは以下のワークフローで実行されます：

1. **プルリクエスト時**:
   - リント・型チェック
   - ユニットテスト
   - ビルド確認

2. **mainブランチマージ時**:
   - 全テスト実行
   - ステージング環境デプロイ
   - E2Eテスト実行

3. **リリースタグ作成時**:
   - 本番環境デプロイ

## 開発ツール設定

### VS Code設定

推奨拡張機能 (`.vscode/extensions.json`):

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "Prisma.prisma"
  ]
}
```

ワークスペース設定 (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.workingDirectories": ["packages/*"]
}
```

### ESLint設定

ルート `.eslintrc.mjs`:

```javascript
export default {
  root: true,
  extends: [
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist/', 'node_modules/']
};
```

### Prettier設定

`.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. pnpm install エラー

```bash
# キャッシュクリア
pnpm store prune

# lockfileを削除して再インストール
rm pnpm-lock.yaml
pnpm install
```

#### 2. Turbo キャッシュ問題

```bash
# Turboキャッシュをクリア
pnpm turbo clean

# 強制的に全てリビルド
pnpm build --force
```

#### 3. TypeScript型エラー

```bash
# sharedパッケージを再ビルド
pnpm --filter @goal-mandala/shared build

# 型チェック実行
pnpm type-check
```

#### 4. Docker関連問題

```bash
# コンテナを完全に削除して再作成
docker-compose down -v
docker-compose up -d

# データベース接続確認
docker-compose exec postgres psql -U goal_mandala_user -d goal_mandala_dev

# 総合診断スクリプト実行
./tools/scripts/diagnose-issues.sh

# 個別診断スクリプト
./tools/scripts/validate-docker-compose.sh
./tools/scripts/validate-postgres-setup.sh
./tools/scripts/validate-cognito-local.sh

# ヘルスチェック
./tools/scripts/health-check.sh
```

Docker環境の詳細なトラブルシューティングについては [実装ガイド](./.kiro/steering/7-implementation-guide.md#トラブルシューティング) を参照してください。

#### 5. AWS SAM CLI関連問題

```bash
# SAM CLIバージョン確認
sam --version

# Dockerが起動しているか確認
docker ps

# SAMビルドエラーの場合
cd packages/backend
rm -rf .aws-sam
sam build --debug

# SAMローカルAPI起動エラーの場合
sam local start-api --debug --log-file sam-debug.log

# Lambda関数のログ確認
sam logs -n ApiFunction --stack-name goal-mandala-api --tail

# SAM設定ファイルの検証
sam validate --template template.yaml

# ポート競合の場合
lsof -i :3001  # ポート3001を使用しているプロセスを確認
kill -9 <PID>  # 必要に応じてプロセスを終了

# Lambda関数の環境変数確認
sam local start-api --parameter-overrides DatabaseUrl=postgresql://postgres:password@host.docker.internal:5432/goal_mandala
```

#### 6. AWS関連問題

```bash
# AWS認証情報確認
aws sts get-caller-identity

# CDK bootstrap確認
pnpm --filter @goal-mandala/infrastructure run cdk bootstrap
```

### デバッグ方法

#### フロントエンド

```bash
# React Developer Toolsを使用
# ブラウザの開発者ツールでコンポーネント状態を確認

# Viteの詳細ログ
pnpm --filter @goal-mandala/frontend dev --debug
```

#### バックエンド (SAM CLI)

```bash
# SAM CLIのデバッグモード
sam local start-api --debug --log-file sam-debug.log

# Lambda関数の詳細ログ
sam local start-api --debug-port 5858 --debug-args "-e debugger"

# 特定のLambda関数を単体実行
sam local invoke ApiFunction --event events/test-event.json --debug

# Lambda関数のログをリアルタイム表示
sam logs -n ApiFunction --stack-name goal-mandala-api --tail

# 環境変数を指定してデバッグ
sam local start-api --parameter-overrides \
  DatabaseUrl=postgresql://postgres:password@host.docker.internal:5432/goal_mandala \
  JwtSecret=debug-secret

# SAMテンプレートの検証
sam validate --template template.yaml --lint

# ビルド成果物の確認
ls -la .aws-sam/build/ApiFunction/
cat .aws-sam/build/ApiFunction/package.json
```

#### インフラ

```bash
# CDK差分確認
pnpm --filter @goal-mandala/infrastructure run diff

# CloudFormationスタック確認
aws cloudformation describe-stacks --stack-name your-stack-name
```

## パフォーマンス最適化

### フロントエンド

- React.memo, useMemo, useCallbackの適切な使用
- Code Splittingによる遅延読み込み
- 画像最適化 (WebP形式、遅延読み込み)
- バンドルサイズの監視

### バックエンド

- Prismaクエリの最適化
- Lambda関数のコールドスタート対策
- 適切なキャッシュ戦略
- データベースインデックスの最適化

### インフラ

- CloudFrontキャッシュ設定
- Aurora Serverless V2の設定最適化
- Lambda関数のメモリ・タイムアウト調整

## セキュリティ

### 開発時の注意点

- 機密情報をコードにハードコーディングしない
- 環境変数を適切に使用
- 依存関係の脆弱性を定期的にチェック
- 入力値の適切なバリデーション

### セキュリティチェック

```bash
# 依存関係の脆弱性スキャン
pnpm audit

# 修正可能な脆弱性を自動修正
pnpm audit --fix
```

## 貢献ガイドライン

### プルリクエスト作成前チェックリスト

- [ ] 機能要件を満たしている
- [ ] テストが追加されている
- [ ] テストが全て通る
- [ ] リントエラーがない
- [ ] 型エラーがない
- [ ] ドキュメントが更新されている
- [ ] 破壊的変更がある場合は明記されている

### コードレビューポイント

- 機能要件の充足
- コード品質・可読性
- テストカバレッジ
- パフォーマンス影響
- セキュリティ考慮
- ドキュメント整備

## サポート

### 質問・相談

- GitHub Issues: バグ報告・機能要望
- GitHub Discussions: 技術的な質問・議論
- Slack: リアルタイムコミュニケーション

### 参考資料

#### 開発環境・セットアップ

- [実装ガイド](./.kiro/steering/7-implementation-guide.md) - Docker環境、GitHub設定、CI/CD設定、環境変数管理
- [AWS SAM CLI公式ドキュメント](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/) - SAM CLIの詳細な使用方法

#### アーキテクチャ・設計

- [技術スタック](./.kiro/steering/2-technology-stack.md) - モノレポ構成とパッケージ依存関係
- [テストガイド](./.kiro/steering/9-test-guide.md) - テスト戦略と実行方法
- [データベース設計](./.kiro/steering/6-database-design.md) - ER図とマイグレーション管理

#### プロダクト仕様

- [プロダクト概要](./.kiro/steering/1-product-overview.md) - システム概要
- [技術スタック](./.kiro/steering/2-technology-stack.md) - 使用技術詳細

---

このドキュメントは継続的に更新されます。不明な点があれば、遠慮なく質問してください。
