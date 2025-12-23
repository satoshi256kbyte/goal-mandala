# デプロイ手順書

## 概要

このドキュメントは、目標管理曼荼羅システムの本番環境へのデプロイ手順を記載します。

## 前提条件

### 必要なツール

- Node.js 23.10.0以上
- pnpm 8.15.0以上
- AWS CLI v2
- AWS CDK v2
- Git

### AWS認証情報

以下の環境変数が設定されていること：

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="ap-northeast-1"
export AWS_ACCOUNT_ID="202633084296"
```

### GitHub Secrets

以下のシークレットが設定されていること：

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DISTRIBUTION_ID`
- `API_ENDPOINT`
- `SLACK_WEBHOOK_URL`（オプション）

## 初回デプロイ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/goal-mandala.git
cd goal-mandala
```

### 2. 依存関係のインストール

```bash
pnpm install
```

### 3. 環境変数の設定

```bash
# .envファイルを作成
cp .env.example .env

# 必要な環境変数を設定
vi .env
```

### 4. ビルド

```bash
pnpm build
```

### 5. CDK Bootstrap（初回のみ）

```bash
cd packages/infrastructure
pnpm cdk bootstrap aws://202633084296/ap-northeast-1
```

### 6. CDKスタックのデプロイ

```bash
# 全スタックをデプロイ
pnpm cdk deploy --all --require-approval never

# または個別にデプロイ
pnpm cdk deploy GoalMandalaVpcStack
pnpm cdk deploy GoalMandalaDatabaseStack
pnpm cdk deploy GoalMandalaSecretsManagerStack
pnpm cdk deploy GoalMandalaCognitoStack
pnpm cdk deploy GoalMandalaApiStack
pnpm cdk deploy GoalMandalaTaskManagementStack
pnpm cdk deploy GoalMandalaTaskGenerationWorkflowStack
pnpm cdk deploy GoalMandalaReminderStack
pnpm cdk deploy GoalMandalaS3FrontendStack
pnpm cdk deploy GoalMandalaCloudTrailStack
```

### 7. フロントエンドのデプロイ

```bash
# S3バケット名を取得
export S3_BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name GoalMandalaS3FrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

# CloudFrontディストリビューションIDを取得
export CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name GoalMandalaS3FrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' \
  --output text)

# フロントエンドをビルド
cd ../../packages/frontend
pnpm build

# S3にアップロード
aws s3 sync dist/ s3://${S3_BUCKET_NAME} --delete

# CloudFrontキャッシュを無効化
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

### 8. データベースマイグレーション

```bash
cd ../backend

# マイグレーション実行
pnpm prisma migrate deploy

# シードデータ投入（必要に応じて）
pnpm prisma db seed
```

### 9. デプロイ後確認

```bash
# APIエンドポイントを取得
export API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name GoalMandalaApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# ヘルスチェック
curl -f ${API_ENDPOINT}/health

# CloudFront URLを取得
export CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name GoalMandalaS3FrontendStack \
  --query 'Stacks[0].Outputs[?OutputKey==`DistributionUrl`].OutputValue' \
  --output text)

# フロントエンドアクセス確認
curl -f ${CLOUDFRONT_URL}
```

## 通常デプロイ手順

### GitHub Actions経由（推奨）

1. **mainブランチにマージ**

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

2. **GitHub Actionsの確認**

- <https://github.com/your-org/goal-mandala/actions>にアクセス
- "Deploy to Production"ワークフローが自動実行される
- テストジョブが成功することを確認
- デプロイジョブの承認を実行
- デプロイが完了することを確認

3. **デプロイ後確認**

- CloudWatch Dashboardsで監視
- アプリケーションの動作確認
- エラーログの確認

### 手動デプロイ

緊急時やGitHub Actionsが使用できない場合の手順：

1. **最新コードの取得**

```bash
git checkout main
git pull origin main
```

2. **依存関係の更新**

```bash
pnpm install
```

3. **ビルド**

```bash
pnpm build
```

4. **CDKデプロイ**

```bash
cd packages/infrastructure
pnpm cdk deploy --all --require-approval never
```

5. **フロントエンドデプロイ**

```bash
cd ../frontend
aws s3 sync dist/ s3://${S3_BUCKET_NAME} --delete
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

6. **データベースマイグレーション**

```bash
cd ../backend
pnpm prisma migrate deploy
```

7. **デプロイ後確認**

```bash
# ヘルスチェック
curl -f ${API_ENDPOINT}/health

# アプリケーション動作確認
curl -f ${CLOUDFRONT_URL}
```

## 緊急デプロイ手順

重大な問題が発生し、緊急でデプロイが必要な場合の手順：

### 1. 緊急対応チームの招集

- Slackで緊急対応チャンネルに通知
- 対応可能なメンバーを確認

### 2. 問題の特定と修正

```bash
# 緊急修正ブランチを作成
git checkout -b hotfix/critical-issue

# 問題を修正
# ...

# コミット
git add .
git commit -m "hotfix: critical issue description"

# プッシュ
git push origin hotfix/critical-issue
```

### 3. 緊急デプロイの実行

```bash
# mainブランチにマージ
git checkout main
git merge hotfix/critical-issue
git push origin main

# GitHub Actionsで自動デプロイ
# または手動デプロイ（上記参照）
```

### 4. 動作確認

```bash
# ヘルスチェック
curl -f ${API_ENDPOINT}/health

# 問題が解決されたことを確認
# ...
```

### 5. 事後対応

- インシデントレポートの作成
- 再発防止策の検討
- ドキュメントの更新

## デプロイ前チェックリスト

### コード品質

- [ ] 全てのテストが成功している
- [ ] リントエラーがない
- [ ] 型チェックエラーがない
- [ ] コードレビューが完了している
- [ ] セキュリティスキャンが完了している

### インフラ

- [ ] CDKスタックが正常にsynthできる
- [ ] 環境変数が正しく設定されている
- [ ] Secrets Managerに機密情報が設定されている
- [ ] IAMロール・ポリシーが適切に設定されている

### データベース

- [ ] マイグレーションファイルが作成されている
- [ ] マイグレーションがテスト環境で成功している
- [ ] バックアップが最新である
