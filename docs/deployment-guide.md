# デプロイ手順書

## 概要

本ドキュメントは、目標管理曼荼羅システムの本番環境へのデプロイ手順を説明します。

## 目次

1. [事前準備](#事前準備)
2. [初回デプロイ](#初回デプロイ)
3. [通常デプロイ](#通常デプロイ)
4. [デプロイ後の確認](#デプロイ後の確認)
5. [トラブルシューティング](#トラブルシューティング)

## 事前準備

### 1. GitHub Secrets設定

本番環境へのデプロイには、以下のGitHub Secretsの設定が必要です。

#### AWS認証情報

1. GitHubリポジトリの **Settings** > **Secrets and variables** > **Actions** に移動
2. **New repository secret** をクリック
3. 以下のシークレットを追加：

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | IAMユーザー作成時に取得 |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | IAMユーザー作成時に取得 |

#### GitHub Variables

1. **Variables** タブに移動
2. **New repository variable** をクリック
3. 以下の変数を追加：

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `AWS_REGION` | `ap-northeast-1` | AWSリージョン |
| `AWS_ACCOUNT_ID` | `202633084296` | AWSアカウントID |

#### デプロイ関連シークレット

CDKデプロイ後に以下のシークレットを追加：

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| `S3_BUCKET_NAME` | フロントエンド用S3バケット名 | CDKデプロイ後にAWSコンソールで確認 |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFrontディストリビューションID | CDKデプロイ後にAWSコンソールで確認 |
| `API_ENDPOINT` | APIエンドポイントURL | CDKデプロイ後にAWSコンソールで確認 |

#### Slack Webhook URL（オプション）

デプロイ通知を受け取る場合：

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| `SLACK_WEBHOOK_URL` | Slack Webhook URL | Slackアプリ設定で作成 |

### 2. IAMユーザー作成

GitHub Actions用のIAMユーザーを作成します。

#### 手順

1. AWSコンソールにログイン
2. **IAM** > **ユーザー** > **ユーザーを追加** をクリック
3. ユーザー名: `github-actions-deploy`
4. アクセスの種類: **プログラムによるアクセス** を選択
5. アクセス許可: 以下のポリシーをアタッチ
   - `AWSCloudFormationFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AWSLambda_FullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `AmazonRDSFullAccess`
   - `SecretsManagerReadWrite`
6. **ユーザーの作成** をクリック
7. アクセスキーIDとシークレットアクセスキーを安全に保存

#### セキュリティのベストプラクティス

- アクセスキーは定期的にローテーション（推奨：90日毎）
- 最小権限の原則を適用
- CloudTrailでAPI呼び出しを監視

### 3. GitHub Environment設定

本番環境への手動承認を設定します。

#### 手順

1. GitHubリポジトリの **Settings** > **Environments** に移動
2. **New environment** をクリック
3. 環境名: `production`
4. **Required reviewers** を有効化
   - 承認者を1名以上設定
5. **Deployment branches** を設定
   - **Selected branches** を選択
   - `main` ブランチのみを許可
6. **Save protection rules** をクリック

## 初回デプロイ

### 1. CDK Bootstrap

AWSアカウントでCDKを初めて使用する場合、Bootstrapが必要です。

```bash
# プロジェクトルートで実行
cd packages/infrastructure

# Bootstrap実行
npx cdk bootstrap aws://202633084296/ap-northeast-1
```

### 2. Secrets Manager設定

データベース接続情報をSecrets Managerに保存します。

```bash
# AWS CLIで実行
aws secretsmanager create-secret \
  --name goal-mandala/production/database \
  --description "Production database credentials" \
  --secret-string '{
    "username": "goal_mandala_user",
    "password": "YOUR_SECURE_PASSWORD",
    "host": "YOUR_RDS_ENDPOINT",
    "port": 5432,
    "database": "goal_mandala_prod"
  }' \
  --region ap-northeast-1
```

**注意**: `YOUR_SECURE_PASSWORD`と`YOUR_RDS_ENDPOINT`は実際の値に置き換えてください。

### 3. CDKデプロイ

インフラストラクチャをデプロイします。

```bash
# プロジェクトルートで実行
cd packages/infrastructure

# 本番環境設定ファイルを確認
cat config/production.json

# CDKデプロイ（全スタック）
npx cdk deploy --all --require-approval never

# または個別にデプロイ
npx cdk deploy DatabaseStack-production
npx cdk deploy ApiStack-production
npx cdk deploy FrontendStack-production
```

#### デプロイ完了後の確認

デプロイが完了すると、以下の情報が出力されます：

- S3バケット名
- CloudFrontディストリビューションID
- APIエンドポイントURL

これらの値をGitHub Secretsに追加してください。

### 4. フロントエンドデプロイ

フロントエンドをS3にデプロイします。

```bash
# プロジェクトルートで実行
cd packages/frontend

# ビルド
npm run build

# S3にアップロード
aws s3 sync dist/ s3://YOUR_S3_BUCKET_NAME --delete

# CloudFrontキャッシュを無効化
aws cloudfront create-invalidation \
  --distribution-id YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

**注意**: `YOUR_S3_BUCKET_NAME`と`YOUR_CLOUDFRONT_DISTRIBUTION_ID`は実際の値に置き換えてください。

### 5. 動作確認

デプロイが完了したら、以下を確認します。

#### ヘルスチェック

```bash
# APIヘルスチェック
curl https://YOUR_API_ENDPOINT/health

# 期待されるレスポンス
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-12-13T12:00:00.000Z",
  "services": {
    "database": "ok",
    "api": "ok",
    "frontend": "ok"
  }
}
```

#### フロントエンドアクセス

1. ブラウザでCloudFrontのURLにアクセス
2. ログイン画面が表示されることを確認
3. テストユーザーでログインできることを確認

## 通常デプロイ

通常のデプロイは、GitHub Actionsで自動化されています。

### 1. mainブランチへのpush

```bash
# 開発ブランチで作業
git checkout develop
git add .
git commit -m "feat: 新機能の追加"
git push origin develop

# プルリクエストを作成
# GitHubでdevelop -> mainのプルリクエストを作成

# レビュー後、mainブランチにマージ
```

### 2. GitHub Actionsでの自動デプロイ

mainブランチにpushすると、以下のワークフローが自動実行されます：

#### テストジョブ

1. Lint実行
2. Type Check実行
3. Unit Tests実行
4. Integration Tests実行
5. E2E Tests実行

#### デプロイジョブ（テスト成功後）

1. ビルド実行
2. AWS認証
3. CDKデプロイ
4. フロントエンドデプロイ
5. CloudFrontキャッシュ無効化
6. ヘルスチェック
7. Slack通知

### 3. 承認手順

GitHub Environmentで承認者を設定している場合：

1. GitHub Actionsの **Actions** タブに移動
2. 実行中のワークフローを選択
3. **Review deployments** をクリック
4. **production** 環境を選択
5. **Approve and deploy** をクリック

### 4. 動作確認

デプロイ完了後、以下を確認します：

```bash
# ヘルスチェック
curl https://YOUR_API_ENDPOINT/health

# バージョン確認
curl https://YOUR_API_ENDPOINT/version
```

## デプロイ後の確認

### 1. ヘルスチェック

```bash
# APIヘルスチェック
curl https://YOUR_API_ENDPOINT/health

# 期待されるレスポンス
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-12-13T12:00:00.000Z",
  "services": {
    "database": "ok",
    "api": "ok",
    "frontend": "ok"
  }
}
```

### 2. CloudWatch Dashboards確認

1. AWSコンソールにログイン
2. **CloudWatch** > **Dashboards** に移動
3. `goal-mandala-production` ダッシュボードを選択
4. 以下のメトリクスを確認：
   - Lambda実行回数
   - Lambda実行時間
   - Lambda エラー率
   - API Gateway リクエスト数
   - API Gateway レイテンシー
   - Aurora接続数
   - Aurora CPU使用率

### 3. CloudWatch Alarms確認

1. **CloudWatch** > **Alarms** に移動
2. 以下のアラームが正常（OK）であることを確認：
   - `goal-mandala-production-high-error-rate`
   - `goal-mandala-production-high-latency`
   - `goal-mandala-production-database-connection-error`

### 4. X-Ray トレーシング確認

1. **X-Ray** > **Service map** に移動
2. サービスマップが正常に表示されることを確認
3. **Traces** タブでトレースを確認
4. エラーがないことを確認

## トラブルシューティング

### デプロイ失敗時の対処方法

#### 1. テストジョブ失敗

**症状**: Lint、Type Check、Unit Tests、Integration Tests、E2E Testsのいずれかが失敗

**対処方法**:

1. GitHub Actionsのログを確認
2. エラーメッセージを確認
3. ローカル環境で再現
4. 問題を修正
5. 再度push

```bash
# ローカルでテスト実行
npm run lint
npm run type-check
npm run test
npm run test:integration
npm run test:e2e
```

#### 2. デプロイジョブ失敗

**症状**: AWS認証エラー、CDKデプロイエラー、S3デプロイエラー、CloudFront無効化エラー

**対処方法**:

1. GitHub Actionsのログを確認
2. エラーメッセージを確認
3. AWS認証情報を確認
4. IAMポリシーを確認
5. 問題を修正
6. 再度デプロイ

```bash
# AWS認証確認
aws sts get-caller-identity

# CDKデプロイ確認
cd packages/infrastructure
npx cdk diff
```

### ヘルスチェック失敗時の対処方法

**症状**: ヘルスチェックエンドポイントが200 OKを返さない

**対処方法**:

1. CloudWatch Logsを確認
2. Lambda関数のログを確認
3. データベース接続を確認
4. 問題を修正
5. ロールバックを検討

```bash
# CloudWatch Logsを確認
aws logs tail /aws/lambda/goal-mandala-production-api --follow

# データベース接続確認
aws rds describe-db-instances --db-instance-identifier goal-mandala-production
```

### CloudFrontキャッシュ問題の対処方法

**症状**: フロントエンドの更新が反映されない

**対処方法**:

1. CloudFrontキャッシュを無効化
2. ブラウザキャッシュをクリア
3. 再度アクセス

```bash
# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

## まとめ

本ドキュメントでは、目標管理曼荼羅システムの本番環境へのデプロイ手順を説明しました。

### 重要なポイント

1. **事前準備**: GitHub Secrets、IAMユーザー、GitHub Environmentの設定が必要
2. **初回デプロイ**: CDK Bootstrap、Secrets Manager設定、CDKデプロイ、フロントエンドデプロイが必要
3. **通常デプロイ**: GitHub Actionsで自動化されており、mainブランチへのpushで自動実行
4. **デプロイ後の確認**: ヘルスチェック、CloudWatch Dashboards、CloudWatch Alarms、X-Ray トレーシングを確認
5. **トラブルシューティング**: デプロイ失敗、ヘルスチェック失敗、CloudFrontキャッシュ問題の対処方法を理解

### 次のステップ

- [運用マニュアル](./operations-manual.md)を参照して、日常的な運用方法を理解してください
- [トラブルシューティングガイド](./troubleshooting-guide.md)を参照して、問題発生時の対処方法を理解してください
- [ロールバック手順書](./rollback-guide.md)を参照して、ロールバック方法を理解してください
