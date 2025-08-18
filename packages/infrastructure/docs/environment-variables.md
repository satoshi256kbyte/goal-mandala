# 環境変数設定ガイド

## 概要

CDKプロジェクトのデプロイに必要な環境変数とGitHub Secretsの設定方法について説明します。

## GitHub Secrets設定

### 必須のSecrets

以下のSecretsをGitHubリポジトリに設定する必要があります：

#### AWS認証情報

| Secret名                | 説明                        | 例                                         |
| ----------------------- | --------------------------- | ------------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | AWSアクセスキーID           | `AKIAIOSFODNN7EXAMPLE`                     |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

#### 設定手順

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に移動
2. 「New repository secret」をクリック
3. 各Secretを追加

```bash
# AWS CLIで一時的な認証情報を取得する場合
aws sts get-session-token --duration-seconds 3600
```

### Variables設定

環境固有の設定値をVariablesとして設定します：

| Variable名   | 説明          | デフォルト値     |
| ------------ | ------------- | ---------------- |
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |

## 環境別設定ファイル

### 設定ファイルの場所

```
packages/infrastructure/config/
├── local.json    # ローカル開発環境
├── dev.json      # 開発環境
├── stg.json      # ステージング環境
└── prod.json     # 本番環境
```

### 設定ファイルの構造

```json
{
  "stackPrefix": "goal-mandala-{environment}",
  "region": "ap-northeast-1",
  "account": "123456789012",
  "database": {
    "instanceClass": "serverless",
    "minCapacity": 0.5,
    "maxCapacity": 1
  },
  "lambda": {
    "timeout": 30,
    "memorySize": 256
  },
  "frontend": {
    "domainName": null,
    "certificateArn": null
  }
}
```

### 環境別の設定例

#### 開発環境 (dev.json)

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
  },
  "frontend": {
    "domainName": null,
    "certificateArn": null
  }
}
```

#### 本番環境 (prod.json)

```json
{
  "stackPrefix": "goal-mandala-prod",
  "region": "ap-northeast-1",
  "database": {
    "instanceClass": "serverless",
    "minCapacity": 1,
    "maxCapacity": 4
  },
  "lambda": {
    "timeout": 60,
    "memorySize": 512
  },
  "frontend": {
    "domainName": "app.goal-mandala.com",
    "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
  }
}
```

## ローカル開発環境の環境変数

### .env.local設定

```bash
# AWS設定
AWS_REGION=ap-northeast-1
AWS_PROFILE=default

# CDK設定
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=ap-northeast-1

# 開発環境設定
ENVIRONMENT=local
```

### 環境変数の優先順位

1. システム環境変数
2. `.env.local`ファイル
3. `.env`ファイル
4. CDKコンテキスト設定
5. デフォルト値

## セキュリティ考慮事項

### 機密情報の管理

- **絶対にコミットしない**: `.env.local`、認証情報ファイル
- **最小権限の原則**: IAMユーザーには必要最小限の権限のみ付与
- **定期的なローテーション**: アクセスキーの定期的な更新

### 推奨IAMポリシー

CDKデプロイ用のIAMユーザーには以下の権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "rds:*",
        "secretsmanager:*",
        "cloudfront:*",
        "route53:*",
        "acm:*",
        "iam:*",
        "logs:*",
        "events:*",
        "states:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## トラブルシューティング

### よくあるエラー

#### 認証エラー

```
Error: Need to perform AWS calls for account 123456789012, but no credentials found
```

**解決方法**:

1. AWS認証情報が正しく設定されているか確認
2. `aws sts get-caller-identity`で認証状態を確認

#### 権限エラー

```
User: arn:aws:iam::123456789012:user/deploy-user is not authorized to perform: cloudformation:CreateStack
```

**解決方法**:

1. IAMユーザーの権限を確認
2. 必要な権限を追加

#### リージョンエラー

```
Stack goal-mandala-dev-database failed: The specified region does not exist
```

**解決方法**:

1. `AWS_REGION`環境変数を確認
2. 設定ファイルのリージョン設定を確認

### デバッグ方法

```bash
# CDK設定の確認
cdk doctor

# 認証情報の確認
aws sts get-caller-identity

# CDK差分の確認
cdk diff --context environment=dev

# 詳細ログの有効化
export CDK_DEBUG=true
cdk deploy --context environment=dev
```

## 参考リンク

- [AWS CDK Environment Variables](https://docs.aws.amazon.com/cdk/v2/guide/environments.html)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
