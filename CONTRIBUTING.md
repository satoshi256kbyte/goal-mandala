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

詳細な環境変数設定については [環境変数設定ガイド](./docs/environment-variables.md) を参照してください。

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

Docker環境の詳細については [Docker環境セットアップガイド](./docs/docker-setup-guide.md) を参照してください。

### 6. 開発環境の起動確認

```bash
# 全パッケージをビルド
pnpm build

# テストを実行
pnpm test

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

### テストピラミッド

1. **ユニットテスト** (多数): 個別関数・コンポーネントのテスト
2. **統合テスト** (中程度): API + データベースの結合テスト
3. **E2Eテスト** (少数): ユーザーフローのテスト

### テスト実行

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

### テスト作成ガイドライン

#### フロントエンド (React Testing Library)

```typescript
// コンポーネントテストの例
import { render, screen } from '@testing-library/react';
import { MandalaChart } from './MandalaChart';

describe('MandalaChart', () => {
  it('should render mandala chart with 9x9 grid', () => {
    render(<MandalaChart />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toBeInTheDocument();
    
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(81);
  });
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

```bash
# Lambda + API Gatewayをローカル起動
pnpm --filter @goal-mandala/backend dev

# 別ターミナルでフロントエンド起動
pnpm --filter @goal-mandala/frontend dev
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

Docker環境の詳細なトラブルシューティングについては [Docker環境トラブルシューティングガイド](./docs/docker-troubleshooting.md) を参照してください。

#### 5. AWS関連問題

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

#### バックエンド

```bash
# SAM CLIのデバッグモード
sam local start-api --debug

# Lambdaログの確認
sam logs -n YourFunctionName --stack-name your-stack-name
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

- [Docker環境セットアップガイド](./docs/docker-setup-guide.md) - Docker環境の詳細セットアップ手順
- [Docker環境トラブルシューティングガイド](./docs/docker-troubleshooting.md) - Docker関連問題の解決方法
- [環境変数設定ガイド](./docs/environment-variables.md) - 環境変数の詳細設定

#### アーキテクチャ・設計

- [モノレポアーキテクチャ](./docs/monorepo-architecture.md) - パッケージ構成と依存関係
- [統合テストガイド](./docs/integration-testing.md) - テスト実行方法
- [CI用バージョン設定](./docs/ci-version-settings.md) - 環境設定詳細

#### プロダクト仕様

- [プロダクト概要](./.kiro/steering/1-product-overview.md) - システム概要
- [技術スタック](./.kiro/steering/2-technology-stack.md) - 使用技術詳細

---

このドキュメントは継続的に更新されます。不明な点があれば、遠慮なく質問してください。
