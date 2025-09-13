# Amazon Cognito トラブルシューティングガイド

## 概要

このドキュメントでは、Amazon Cognitoの運用中に発生する可能性のある問題とその解決方法について説明します。

## よくある問題と解決方法

### 1. デプロイ関連の問題

#### 問題: CDKデプロイが失敗する

**症状**

```
Error: The stack named CognitoStack-dev failed creation, it may need to be manually deleted from the AWS console
```

**原因と解決方法**

1. **IAM権限不足**

   ```bash
   # 現在のIAM権限確認
   aws sts get-caller-identity
   aws iam get-user

   # 必要な権限を確認
   aws iam simulate-principal-policy \
     --policy-source-arn $(aws sts get-caller-identity --query Arn --output text) \
     --action-names cognito-idp:CreateUserPool \
     --resource-arns "*"
   ```

2. **リソース名の重複**

   ```bash
   # 既存のUser Pool確認
   aws cognito-idp list-user-pools --max-results 60

   # 重複する名前のリソースを削除または名前変更
   ```

3. **リージョンの不一致**

   ```bash
   # 現在のリージョン確認
   aws configure get region

   # CDKで指定されているリージョン確認
   cat cdk.json | grep region
   ```

#### 問題: User Pool作成時にカスタム属性エラー

**症状**

```
InvalidParameterException: Invalid attribute name format
```

**解決方法**

```typescript
// 正しいカスタム属性の定義
new cognito.UserPool(this, 'UserPool', {
  customAttributes: {
    // ❌ 間違い: custom:プレフィックスは自動付与される
    'custom:industry': new cognito.StringAttribute({ minLen: 1, maxLen: 50 }),

    // ✅ 正しい: プレフィックスなしで定義
    industry: new cognito.StringAttribute({ minLen: 1, maxLen: 50 }),
  },
});
```

### 2. 認証関連の問題

#### 問題: ログインできない

**症状**

```
NotAuthorizedException: Incorrect username or password
```

**診断手順**

1. **ユーザーの存在確認**

   ```bash
   aws cognito-idp admin-get-user \
     --user-pool-id $USER_POOL_ID \
     --username user@example.com
   ```

2. **ユーザーステータス確認**

   ```bash
   # ユーザーステータスをチェック
   aws cognito-idp list-users \
     --user-pool-id $USER_POOL_ID \
     --filter 'email = "user@example.com"'
   ```

3. **パスワードポリシー確認**
   ```bash
   aws cognito-idp describe-user-pool \
     --user-pool-id $USER_POOL_ID \
     --query 'UserPool.Policies.PasswordPolicy'
   ```

**解決方法**

1. **ユーザーステータスがFORCE_CHANGE_PASSWORDの場合**

   ```bash
   aws cognito-idp admin-set-user-password \
     --user-pool-id $USER_POOL_ID \
     --username user@example.com \
     --password "NewPassword123!" \
     --permanent
   ```

2. **メール未確認の場合**
   ```bash
   aws cognito-idp admin-confirm-sign-up \
     --user-pool-id $USER_POOL_ID \
     --username user@example.com
   ```

#### 問題: JWT検証エラー

**症状**

```
TokenExpiredError: jwt expired
InvalidTokenError: invalid signature
```

**診断手順**

1. **トークンの有効期限確認**

   ```javascript
   const jwt = require('jsonwebtoken');
   const decoded = jwt.decode(token, { complete: true });
   console.log('Token expires at:', new Date(decoded.payload.exp * 1000));
   ```

2. **JWKSエンドポイント確認**
   ```bash
   # JWKSエンドポイントからキー取得
   curl https://cognito-idp.ap-northeast-1.amazonaws.com/$USER_POOL_ID/.well-known/jwks.json
   ```

**解決方法**

1. **トークンリフレッシュ**

   ```javascript
   // リフレッシュトークンを使用してトークン更新
   const params = {
     AuthFlow: 'REFRESH_TOKEN_AUTH',
     ClientId: clientId,
     AuthParameters: {
       REFRESH_TOKEN: refreshToken,
     },
   };
   ```

2. **JWT検証ライブラリの更新**
   ```bash
   npm update jsonwebtoken
   npm update jwks-client
   ```

### 3. User Pool Client設定の問題

#### 問題: CORS エラー

**症状**

```
Access to fetch at 'https://cognito-idp.ap-northeast-1.amazonaws.com/' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**解決方法**

1. **User Pool Client設定確認**

   ```typescript
   new cognito.UserPoolClient(this, 'UserPoolClient', {
     // CORS設定を適切に行う
     supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
     oAuth: {
       callbackUrls: [
         'http://localhost:3000/callback', // 開発環境
         'https://yourdomain.com/callback', // 本番環境
       ],
       logoutUrls: ['http://localhost:3000', 'https://yourdomain.com'],
     },
   });
   ```

2. **フロントエンド側のCORS設定**

   ```javascript
   // AWS Amplifyを使用する場合
   import { Amplify } from 'aws-amplify';

   Amplify.configure({
     Auth: {
       region: 'ap-northeast-1',
       userPoolId: 'ap-northeast-1_xxxxxxxxx',
       userPoolWebClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
       cookieStorage: {
         domain: '.yourdomain.com',
         secure: true,
         sameSite: 'strict',
       },
     },
   });
   ```

#### 問題: 認証フローエラー

**症状**

```
InvalidParameterException: Auth flow not supported for this client
```

**解決方法**

```typescript
new cognito.UserPoolClient(this, 'UserPoolClient', {
  authFlows: {
    userSrp: true, // SRP認証を有効化
    userPassword: false, // パスワード認証は無効（セキュリティ上）
    adminUserPassword: true, // 管理者用パスワード認証（テスト用）
    custom: false, // カスタム認証は無効
  },
});
```

### 4. カスタム属性の問題

#### 問題: カスタム属性が保存されない

**症状**
ユーザー作成時にカスタム属性を指定しても保存されない

**診断手順**

1. **User Pool設定確認**

   ```bash
   aws cognito-idp describe-user-pool \
     --user-pool-id $USER_POOL_ID \
     --query 'UserPool.Schema[?Name==`custom:industry`]'
   ```

2. **属性の可変性確認**
   ```bash
   aws cognito-idp describe-user-pool \
     --user-pool-id $USER_POOL_ID \
     --query 'UserPool.Schema[?Mutable==`false`]'
   ```

**解決方法**

1. **正しい属性名の使用**

   ```bash
   # ❌ 間違い
   aws cognito-idp admin-update-user-attributes \
     --user-pool-id $USER_POOL_ID \
     --username user@example.com \
     --user-attributes Name=industry,Value="IT"

   # ✅ 正しい
   aws cognito-idp admin-update-user-attributes \
     --user-pool-id $USER_POOL_ID \
     --username user@example.com \
     --user-attributes Name=custom:industry,Value="IT"
   ```

2. **属性の可変性設定**
   ```typescript
   new cognito.UserPool(this, 'UserPool', {
     customAttributes: {
       industry: new cognito.StringAttribute({
         minLen: 1,
         maxLen: 50,
         mutable: true, // 作成後も変更可能
       }),
     },
   });
   ```

### 5. パフォーマンス関連の問題

#### 問題: 認証が遅い

**症状**
ログイン処理に時間がかかる（5秒以上）

**診断手順**

1. **CloudWatch メトリクス確認**

   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Cognito \
     --metric-name SignInLatency \
     --dimensions Name=UserPool,Value=$USER_POOL_ID \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-01-02T00:00:00Z \
     --period 3600 \
     --statistics Average
   ```

2. **ネットワーク遅延確認**
   ```bash
   # Cognitoエンドポイントへの接続テスト
   curl -w "@curl-format.txt" -o /dev/null -s \
     "https://cognito-idp.ap-northeast-1.amazonaws.com/"
   ```

**解決方法**

1. **リージョン最適化**

   ```typescript
   // ユーザーに近いリージョンを選択
   const stack = new CognitoStack(app, 'CognitoStack', {
     env: {
       region: 'ap-northeast-1', // 日本のユーザー向け
     },
   });
   ```

2. **接続プールの使用**

   ```javascript
   // AWS SDK v3での接続プール設定
   import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

   const client = new CognitoIdentityProviderClient({
     region: 'ap-northeast-1',
     maxAttempts: 3,
     requestHandler: {
       connectionTimeout: 5000,
       socketTimeout: 10000,
     },
   });
   ```

### 6. セキュリティ関連の問題

#### 問題: 異常なサインイン試行の検出

**症状**

```
TooManyRequestsException: Rate exceeded
```

**対応手順**

1. **CloudWatch Logs確認**

   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/cognito/userpool/$USER_POOL_ID \
     --filter-pattern "TooManyRequestsException"
   ```

2. **IP制限の実装**
   ```typescript
   // WAFでIP制限を実装
   new wafv2.WebAcl(this, 'CognitoWAF', {
     scope: wafv2.Scope.REGIONAL,
     defaultAction: wafv2.WafAction.allow(),
     rules: [
       {
         name: 'RateLimitRule',
         priority: 1,
         statement: new wafv2.RateLimitStatement({
           limit: 100,
           aggregateKeyType: wafv2.AggregateKeyType.IP,
         }),
         action: wafv2.WafAction.block(),
       },
     ],
   });
   ```

#### 問題: パスワードポリシー違反

**症状**

```
InvalidPasswordException: Password did not conform with policy
```

**解決方法**

1. **パスワードポリシーの確認と調整**

   ```typescript
   new cognito.UserPool(this, 'UserPool', {
     passwordPolicy: {
       minLength: 8,
       requireLowercase: true,
       requireUppercase: true,
       requireDigits: true,
       requireSymbols: true,
       tempPasswordValidity: Duration.days(7),
     },
   });
   ```

2. **ユーザー向けガイダンス**
   ```javascript
   // フロントエンドでのパスワード検証
   const validatePassword = password => {
     const rules = [
       { test: /.{8,}/, message: '8文字以上である必要があります' },
       { test: /[a-z]/, message: '小文字を含む必要があります' },
       { test: /[A-Z]/, message: '大文字を含む必要があります' },
       { test: /\d/, message: '数字を含む必要があります' },
       { test: /[!@#$%^&*]/, message: '記号を含む必要があります' },
     ];

     return rules.filter(rule => !rule.test.test(password));
   };
   ```

## 監視とアラート

### 重要メトリクスの監視

```bash
# CloudWatch アラーム設定例
aws cloudwatch put-metric-alarm \
  --alarm-name "CognitoHighErrorRate" \
  --alarm-description "Cognito authentication error rate > 5%" \
  --metric-name SignInErrors \
  --namespace AWS/Cognito \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:cognito-alerts
```

### ログ分析

```bash
# 認証エラーの分析
aws logs insights start-query \
  --log-group-name /aws/cognito/userpool/$USER_POOL_ID \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string '
    fields @timestamp, @message
    | filter @message like /ERROR/
    | stats count() by bin(5m)
  '
```

## 緊急時対応

### User Pool無効化

```bash
# 緊急時のUser Pool無効化（注意：全ユーザーがログインできなくなります）
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --user-pool-add-ons AdvancedSecurityMode=AUDIT
```

### バックアップからの復旧

```bash
# User Pool設定の復旧
aws cognito-idp update-user-pool \
  --cli-input-json file://user-pool-backup.json

# User Pool Client設定の復旧
aws cognito-idp update-user-pool-client \
  --cli-input-json file://user-pool-client-backup.json
```

## 予防策

### 定期的なヘルスチェック

```bash
#!/bin/bash
# cognito-health-check.sh

USER_POOL_ID="ap-northeast-1_xxxxxxxxx"
CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxx"

# User Pool存在確認
if aws cognito-idp describe-user-pool --user-pool-id $USER_POOL_ID > /dev/null 2>&1; then
  echo "✅ User Pool is accessible"
else
  echo "❌ User Pool is not accessible"
  exit 1
fi

# User Pool Client存在確認
if aws cognito-idp describe-user-pool-client --user-pool-id $USER_POOL_ID --client-id $CLIENT_ID > /dev/null 2>&1; then
  echo "✅ User Pool Client is accessible"
else
  echo "❌ User Pool Client is not accessible"
  exit 1
fi

echo "🎉 All Cognito resources are healthy"
```

### 設定変更の記録

```bash
# 設定変更前のバックアップ
aws cognito-idp describe-user-pool --user-pool-id $USER_POOL_ID > "backup-$(date +%Y%m%d-%H%M%S).json"

# 変更履歴の記録
git add .
git commit -m "feat(cognito): update password policy for enhanced security"
```

## サポートリソース

- [AWS Cognito トラブルシューティング](https://docs.aws.amazon.com/cognito/latest/developerguide/troubleshooting.html)
- [AWS Support](https://aws.amazon.com/support/)
- [AWS Cognito フォーラム](https://forums.aws.amazon.com/forum.jspa?forumID=173)
- [AWS Status Page](https://status.aws.amazon.com/)
