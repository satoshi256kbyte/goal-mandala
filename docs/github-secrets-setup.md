# GitHub Secrets 設定ガイド

## 概要

このドキュメントでは、GitHub ActionsでCI/CDパイプラインを実行するために必要なシークレット（機密情報）の設定方法について説明します。

## 必要なシークレット一覧

### AWS関連シークレット

| シークレット名 | 説明 | 必須 | 例 |
|---------------|------|------|-----|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | ✅ | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | ✅ | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWSリージョン | ✅ | `ap-northeast-1` |
| `AWS_ACCOUNT_ID` | AWSアカウントID | ✅ | `123456789012` |

### デプロイ関連シークレット

| シークレット名 | 説明 | 必須 | 例 |
|---------------|------|------|-----|
| `S3_BUCKET_NAME` | フロントエンド用S3バケット名 | ✅ | `goal-mandala-frontend-prod` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFrontディストリビューションID | ✅ | `E1234567890ABC` |

### データベース関連シークレット

| シークレット名 | 説明 | 必須 | 例 |
|---------------|------|------|-----|
| `DATABASE_URL` | データベース接続URL（テスト用） | ⚠️ | `postgresql://user:pass@localhost:5432/testdb` |
| `DATABASE_SECRET_ARN` | AWS Secrets ManagerのARN | ✅ | `arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:prod/database-AbCdEf` |

### 外部サービス関連シークレット

| シークレット名 | 説明 | 必須 | 例 |
|---------------|------|------|-----|
| `BEDROCK_MODEL_ID` | Amazon Bedrockモデル識別子 | ✅ | `amazon.nova-micro-v1:0` |
| `JWT_SECRET` | JWT署名用秘密鍵 | ✅ | `your-super-secret-jwt-key-here` |

### 通知関連シークレット（オプション）

| シークレット名 | 説明 | 必須 | 例 |
|---------------|------|------|-----|
| `SLACK_WEBHOOK_URL` | Slack通知用WebhookURL | ❌ | `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX` |
| `DISCORD_WEBHOOK_URL` | Discord通知用WebhookURL | ❌ | `https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz` |

## シークレット設定手順

### 1. GitHubリポジトリでのシークレット設定

1. GitHubリポジトリのページにアクセス
2. **Settings** タブをクリック
3. 左サイドバーの **Secrets and variables** > **Actions** をクリック
4. **New repository secret** ボタンをクリック
5. シークレット名と値を入力して **Add secret** をクリック

### 2. 環境別シークレット設定

#### Development環境

```bash
# 開発環境用のシークレット設定例
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012
S3_BUCKET_NAME=goal-mandala-frontend-dev
DATABASE_URL=postgresql://postgres:password@localhost:5432/goal_mandala_dev
```

#### Staging環境

```bash
# ステージング環境用のシークレット設定例
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012
S3_BUCKET_NAME=goal-mandala-frontend-stg
DATABASE_URL=postgresql://postgres:password@staging-db:5432/goal_mandala_stg
```

#### Production環境

```bash
# 本番環境用のシークレット設定例
AWS_REGION=ap-northeast-1
AWS_ACCOUNT_ID=123456789012
S3_BUCKET_NAME=goal-mandala-frontend-prod
DATABASE_SECRET_ARN=arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:prod/database-AbCdEf
```

## AWS IAMユーザー作成手順

### 1. IAMユーザーの作成

```bash
# AWS CLIでIAMユーザーを作成
aws iam create-user --user-name github-actions-user

# アクセスキーを作成
aws iam create-access-key --user-name github-actions-user
```

### 2. 必要な権限の付与

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::goal-mandala-*",
        "arn:aws:s3:::goal-mandala-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction"
      ],
      "Resource": "arn:aws:lambda:ap-northeast-1:*:function:goal-mandala-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-northeast-1:*:secret:goal-mandala-*"
    }
  ]
}
```

## セキュリティベストプラクティス

### 1. 最小権限の原則

- 必要最小限の権限のみを付与
- 環境別にIAMユーザーを分離
- 定期的な権限の見直し

### 2. シークレットローテーション

```bash
# 定期的なアクセスキーローテーション（推奨：90日毎）
aws iam create-access-key --user-name github-actions-user
# 新しいキーをGitHubに設定後、古いキーを削除
aws iam delete-access-key --user-name github-actions-user --access-key-id OLD_ACCESS_KEY_ID
```

### 3. 監査とモニタリング

- CloudTrailでAPI呼び出しを監視
- 異常なアクセスパターンの検出
- 定期的なセキュリティレビュー

## トラブルシューティング

### よくある問題と解決方法

#### 1. AWS認証エラー

```bash
# エラー例
Error: The security token included in the request is invalid

# 解決方法
# 1. アクセスキーとシークレットキーが正しく設定されているか確認
# 2. IAMユーザーに適切な権限が付与されているか確認
# 3. リージョンが正しく設定されているか確認
```

#### 2. S3アクセス権限エラー

```bash
# エラー例
Error: Access Denied when calling the PutObject operation

# 解決方法
# 1. S3バケットポリシーを確認
# 2. IAMユーザーのS3権限を確認
# 3. バケット名が正しいか確認
```

#### 3. CloudFront無効化エラー

```bash
# エラー例
Error: User is not authorized to perform: cloudfront:CreateInvalidation

# 解決方法
# 1. CloudFront権限がIAMユーザーに付与されているか確認
# 2. ディストリビューションIDが正しいか確認
```

## 環境変数とシークレットの使い分け

### 環境変数として設定するもの

- 公開情報（リージョン、バケット名など）
- 設定値（タイムアウト、リトライ回数など）

### シークレットとして設定するもの

- 認証情報（アクセスキー、パスワードなど）
- API キー
- 暗号化キー

## 参考リンク

- [GitHub Actions - Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

## 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2025-01-XX | 初版作成 | 開発チーム |
