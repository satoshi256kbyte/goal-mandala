# Infrastructure Package

AWS CDKを使用したインフラストラクチャ管理パッケージです。

## 概要

このパッケージは、目標管理曼荼羅システムのAWSインフラストラクチャをコードで管理します。

### 主要機能

- 環境別スタック管理（local/dev/stg/prod）
- Aurora Serverless V2データベース
- Lambda + API Gateway
- CloudFront + S3静的サイトホスティング
- Cognito認証
- Secrets Manager機密情報管理

## クイックスタート

### 1. 依存関係のインストール

```bash
# ルートディレクトリから
pnpm install

# または、このパッケージのみ
cd packages/infrastructure
pnpm install
```

### 2. AWS認証設定

```bash
# AWS CLIの設定
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=ap-northeast-1
```

### 3. CDK Bootstrap（初回のみ）

```bash
pnpm run cdk:bootstrap
```

### 4. 開発環境デプロイ

```bash
# 差分確認
pnpm run deploy:dev:diff

# デプロイ実行
pnpm run deploy:dev
```

## 利用可能なコマンド

### 基本コマンド

```bash
# ビルド
pnpm run build

# テスト実行
pnpm run test
pnpm run test:coverage

# Lint & Format
pnpm run lint
pnpm run format

# 型チェック
pnpm run type-check
```

### CDKコマンド

```bash
# CloudFormationテンプレート生成
pnpm run cdk:synth
pnpm run cdk:synth:dev
pnpm run cdk:synth:stg
pnpm run cdk:synth:prod
pnpm run cdk:synth:all

# 差分表示
pnpm run cdk:diff
pnpm run cdk:diff:dev
pnpm run cdk:diff:stg
pnpm run cdk:diff:prod

# スタック一覧
pnpm run cdk:list
pnpm run cdk:list:dev
pnpm run cdk:list:stg
pnpm run cdk:list:prod

# CDK診断
pnpm run cdk:doctor
```

### デプロイコマンド

```bash
# 環境別デプロイ
pnpm run deploy:dev
pnpm run deploy:stg
pnpm run deploy:prod

# 差分のみ表示
pnpm run deploy:dev:diff
pnpm run deploy:stg:diff
pnpm run deploy:prod:diff

# ヘルパースクリプト使用
pnpm run cdk:helper synth dev
pnpm run cdk:helper deploy stg
pnpm run cdk:helper diff prod
```

### CI/CD関連コマンド

```bash
# CI検証（全チェック）
pnpm run ci:validate

# セキュリティチェック
pnpm run security:check
```

## プロジェクト構造

```
packages/infrastructure/
├── src/
│   ├── config/           # 環境設定
│   ├── constructs/       # 再利用可能なコンストラクト
│   ├── stacks/          # CDKスタック定義
│   └── index.ts         # エントリーポイント
├── config/              # 環境別設定ファイル
├── scripts/             # デプロイ・ヘルパースクリプト
├── docs/               # ドキュメント
├── cdk.json            # CDK設定
├── package.json        # パッケージ設定
└── README.md          # このファイル
```

## 環境設定

### 環境別設定ファイル

各環境の設定は`config/`ディレクトリで管理：

- `local.json` - ローカル開発環境
- `dev.json` - 開発環境
- `stg.json` - ステージング環境
- `prod.json` - 本番環境

### 設定例

```json
{
  "stackPrefix": "goal-mandala-dev",
  "region": "ap-northeast-1",
  "database": {
    "instanceClass": "serverless",
    "minCapacity": 0.5,
    "maxCapacity": 1
  },
  "lambda": {
    "timeout": 30,
    "memorySize": 256
  }
}
```

## GitHub Actions CI/CD

### ワークフロー

1. **CDK CI** (`.github/workflows/cdk-ci.yml`)
   - プルリクエスト時の検証
   - Lint、テスト、CDK synth
   - セキュリティチェック

2. **CDK Deploy** (`.github/workflows/cdk-deploy.yml`)
   - 手動デプロイワークフロー
   - 環境選択可能
   - 承認フロー付き

### 必要なSecrets

GitHubリポジトリに以下のSecretsを設定：

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### デプロイ手順

```bash
# GitHub CLIを使用
gh workflow run cdk-deploy.yml \
  -f environment=dev \
  -f confirm_deployment=deploy

# または、GitHubのWebUIから実行
```

## セキュリティ

### セキュリティチェックリスト

デプロイ前に[セキュリティチェックリスト](./docs/security-checklist.md)を確認してください。

### 主要なセキュリティ設定

- IAM最小権限の原則
- VPCプライベートサブネット
- 保存時・転送時暗号化
- Secrets Manager機密情報管理
- CloudTrail監査ログ

## トラブルシューティング

### よくある問題

#### 1. 認証エラー

```bash
# 認証状態確認
aws sts get-caller-identity

# プロファイル確認
aws configure list
```

#### 2. CDK Bootstrap エラー

```bash
# Bootstrap実行
pnpm run cdk:bootstrap

# 特定環境でBootstrap
cdk bootstrap --context environment=dev
```

#### 3. 権限不足

IAMユーザーに必要な権限を付与：

- CloudFormation操作権限
- 各AWSサービスの操作権限
- CDKに必要な権限

### デバッグ方法

```bash
# 詳細ログ有効化
export CDK_DEBUG=true

# CDK診断
pnpm run cdk:doctor

# 設定確認
cat config/dev.json
```

## 開発ガイド

### 新しいスタックの追加

1. `src/stacks/`に新しいスタッククラスを作成
2. `src/index.ts`でスタックをインスタンス化
3. 必要に応じて`config/`の設定を更新
4. テストを作成

### 新しいコンストラクトの追加

1. `src/constructs/`に新しいコンストラクトを作成
2. 適切なプロパティインターフェースを定義
3. ユニットテストを作成
4. ドキュメントを更新

## 参考資料

- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## サポート

問題や質問がある場合は、以下を確認してください：

1. [トラブルシューティングガイド](./TROUBLESHOOTING.md)
2. [セキュリティチェックリスト](./docs/security-checklist.md)
3. [環境変数設定ガイド](./docs/environment-variables.md)
4. [GitHub Actions設定ガイド](./docs/github-actions-setup.md)
