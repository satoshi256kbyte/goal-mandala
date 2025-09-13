# Amazon Cognito デプロイガイド

## 概要

このドキュメントでは、目標管理曼荼羅システムにおけるAmazon Cognitoの設定とデプロイ手順について説明します。

## アーキテクチャ

### Cognito構成要素

- **User Pool**: ユーザー情報とパスワードを管理
- **User Pool Client**: フロントエンドアプリケーション用のクライアント設定
- **IAM Role**: Lambda関数がCognitoにアクセスするための権限

### セキュリティ設定

- **パスワードポリシー**: 最小8文字、大文字・小文字・数字・記号必須
- **高度なセキュリティ**: 異常なサインイン試行の検出と保護
- **メール検証**: 自動メール検証によるアカウント有効化

## デプロイ手順

### 前提条件

1. **AWS CLI設定**

   ```bash
   aws configure
   ```

2. **CDK Bootstrap**

   ```bash
   cd packages/infrastructure
   npx cdk bootstrap
   ```

3. **依存関係インストール**
   ```bash
   pnpm install
   ```

### 環境別デプロイ

#### 開発環境

```bash
# 環境設定確認
cat config/dev.json

# デプロイ実行
npx cdk deploy CognitoStack-dev --context environment=dev

# 出力値確認
aws cloudformation describe-stacks \
  --stack-name CognitoStack-dev \
  --query 'Stacks[0].Outputs'
```

#### ステージング環境

```bash
# 環境設定確認
cat config/stg.json

# デプロイ実行
npx cdk deploy CognitoStack-stg --context environment=stg

# 出力値確認
aws cloudformation describe-stacks \
  --stack-name CognitoStack-stg \
  --query 'Stacks[0].Outputs'
```

#### 本番環境

```bash
# 環境設定確認
cat config/prd.json

# デプロイ実行（本番環境は慎重に）
npx cdk deploy CognitoStack-prd --context environment=prd --require-approval broadening

# 出力値確認
aws cloudformation describe-stacks \
  --stack-name CognitoStack-prd \
  --query 'Stacks[0].Outputs'
```

### デプロイ後の確認

#### User Pool設定確認

```bash
# User Pool ID取得
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name CognitoStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# User Pool詳細確認
aws cognito-idp describe-user-pool --user-pool-id $USER_POOL_ID
```

#### User Pool Client設定確認

```bash
# User Pool Client ID取得
CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name CognitoStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

# User Pool Client詳細確認
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID
```

## 設定詳細

### User Pool設定

#### 基本設定

| 項目               | 設定値      | 説明                                 |
| ------------------ | ----------- | ------------------------------------ |
| ユーザー名属性     | email       | メールアドレスをユーザー名として使用 |
| 必須属性           | name, email | 登録時に必須の属性                   |
| 自動検証属性       | email       | メールアドレスの自動検証             |
| セルフサインアップ | 有効        | ユーザーが自分でアカウント作成可能   |

#### パスワードポリシー

| 項目                   | 設定値 | 説明                         |
| ---------------------- | ------ | ---------------------------- |
| 最小文字数             | 8文字  | パスワードの最小長           |
| 大文字                 | 必須   | A-Z                          |
| 小文字                 | 必須   | a-z                          |
| 数字                   | 必須   | 0-9                          |
| 記号                   | 必須   | 特殊文字                     |
| 一時パスワード有効期限 | 7日    | 管理者作成時の一時パスワード |

#### カスタム属性

| 属性名              | データ型 | 必須 | 可変 | 説明     |
| ------------------- | -------- | ---- | ---- | -------- |
| custom:industry     | String   | No   | Yes  | 業種     |
| custom:company_size | String   | No   | Yes  | 組織規模 |
| custom:job_title    | String   | No   | Yes  | 職種     |
| custom:position     | String   | No   | Yes  | 役職     |

### User Pool Client設定

#### 認証フロー

| フロー                   | 設定 | 説明                                 |
| ------------------------ | ---- | ------------------------------------ |
| ALLOW_USER_SRP_AUTH      | 有効 | SRP認証（推奨）                      |
| ALLOW_REFRESH_TOKEN_AUTH | 有効 | リフレッシュトークン                 |
| ALLOW_USER_PASSWORD_AUTH | 無効 | パスワード認証（セキュリティ上無効） |

#### トークン設定

| トークン種別         | 有効期限 | 説明               |
| -------------------- | -------- | ------------------ |
| アクセストークン     | 1時間    | API呼び出し用      |
| IDトークン           | 1時間    | ユーザー情報取得用 |
| リフレッシュトークン | 30日     | トークン更新用     |

### IAM設定

#### Lambda実行ロール

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:ListUsers"
      ],
      "Resource": "arn:aws:cognito-idp:ap-northeast-1:*:userpool/*"
    }
  ]
}
```

## 環境別設定差分

### 開発環境 (dev)

- **削除保護**: 無効
- **高度なセキュリティ**: 監査モード
- **メール送信**: テスト用ドメイン
- **ログレベル**: DEBUG

### ステージング環境 (stg)

- **削除保護**: 有効
- **高度なセキュリティ**: 強制モード
- **メール送信**: ステージング用ドメイン
- **ログレベル**: INFO

### 本番環境 (prd)

- **削除保護**: 有効
- **高度なセキュリティ**: 強制モード
- **メール送信**: 本番ドメイン
- **ログレベル**: WARN
- **バックアップ**: 有効

## セキュリティ考慮事項

### 認証セキュリティ

1. **SRP認証の使用**
   - パスワードを平文で送信しない
   - クライアント側でハッシュ化

2. **JWT検証**
   - 署名検証の実装
   - 有効期限チェック
   - 発行者検証

3. **HTTPS必須**
   - 全通信の暗号化
   - 証明書の適切な管理

### 権限管理

1. **最小権限の原則**
   - 必要最小限のIAM権限
   - リソースベースの制限

2. **環境分離**
   - 環境ごとに独立したUser Pool
   - クロス環境アクセスの禁止

### 監査・ログ

1. **CloudTrail**
   - Cognito API呼び出しの記録
   - 管理操作の監査

2. **CloudWatch Logs**
   - 認証イベントの記録
   - エラーログの監視

## 運用手順

### ユーザー管理

#### ユーザー作成

```bash
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com Name=name,Value="Test User" \
  --message-action SUPPRESS
```

#### パスワード設定

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username user@example.com \
  --password "NewPassword123!" \
  --permanent
```

#### ユーザー削除

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id $USER_POOL_ID \
  --username user@example.com
```

### 監視・メトリクス

#### 重要メトリクス

- **SignInSuccesses**: ログイン成功数
- **SignInThrottles**: レート制限発生数
- **UserRegistration**: ユーザー登録数
- **TokenRefresh**: トークンリフレッシュ数

#### アラート設定

```bash
# 高エラー率アラート
aws cloudwatch put-metric-alarm \
  --alarm-name "CognitoHighErrorRate" \
  --alarm-description "Cognito error rate > 5%" \
  --metric-name SignInErrors \
  --namespace AWS/Cognito \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

## バックアップ・復旧

### User Pool設定バックアップ

```bash
# User Pool設定エクスポート
aws cognito-idp describe-user-pool \
  --user-pool-id $USER_POOL_ID > user-pool-backup.json

# User Pool Client設定エクスポート
aws cognito-idp describe-user-pool-client \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID > user-pool-client-backup.json
```

### ユーザーデータバックアップ

```bash
# ユーザーリストエクスポート
aws cognito-idp list-users \
  --user-pool-id $USER_POOL_ID > users-backup.json
```

## 関連リンク

- [Amazon Cognito Developer Guide](https://docs.aws.amazon.com/cognito/latest/developerguide/)
- [AWS CDK Cognito Construct Library](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito-readme.html)
- [Cognito Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/security.html)
