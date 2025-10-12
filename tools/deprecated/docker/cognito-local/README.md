# cognito-local設定

このディレクトリには、ローカル開発環境でAmazon Cognitoをエミュレートするための`cognito-local`の設定ファイルが含まれています。

## 設定ファイル

### config.json

cognito-localの設定ファイルです。以下の要素が定義されています：

#### User Pool設定

- **Pool ID**: `local_user_pool_id`
- **Pool名**: `GoalMandalaUserPool`
- **パスワードポリシー**:
  - 最小長: 8文字
  - 大文字必須: あり
  - 小文字必須: あり
  - 数字必須: あり
  - 記号必須: なし
- **ユーザー名属性**: email
- **自動検証属性**: email

#### User Pool Client設定

- **Client ID**: `local_client_id`
- **Client名**: `GoalMandalaClient`
- **シークレット生成**: なし
- **認証フロー**:
  - `ADMIN_NO_SRP_AUTH`
  - `USER_PASSWORD_AUTH`
  - `ALLOW_USER_PASSWORD_AUTH`
  - `ALLOW_REFRESH_TOKEN_AUTH`
- **トークン有効期限**:
  - アクセストークン: 60分
  - IDトークン: 60分
  - リフレッシュトークン: 30日

#### 事前作成テストユーザー

開発・テスト用に以下のユーザーが事前に作成されます：

| メールアドレス | パスワード | 用途 |
|---|---|---|
| <test@example.com> | TestPassword123! | 基本テスト用 |
| <dev@goalmandalasystem.com> | DevPassword123! | 開発者用 |
| <admin@goalmandalasystem.com> | AdminPassword123! | 管理者用 |

## 使用方法

### Docker Composeでの起動

```bash
# Docker Compose環境を起動
docker-compose up -d

# cognito-localコンテナのログを確認
docker-compose logs cognito-local
```

### 認証テスト

```bash
# ヘルスチェック
curl http://localhost:9229/health

# User Pool情報の取得
curl -X POST http://localhost:9229/ \
  -H "Content-Type: application/x-amz-json-1.1" \
  -H "X-Amz-Target: AWSCognitoIdentityProviderService.DescribeUserPool" \
  -d '{"UserPoolId": "local_user_pool_id"}'
```

### アプリケーションからの接続

環境変数で以下を設定してください：

```bash
COGNITO_LOCAL_ENDPOINT=http://localhost:9229
COGNITO_USER_POOL_ID=local_user_pool_id
COGNITO_CLIENT_ID=local_client_id
COGNITO_REGION=ap-northeast-1
```

## トラブルシューティング

### よくある問題

1. **ポート9229が使用中**

   ```bash
   # ポート使用状況を確認
   lsof -i :9229
   
   # 使用中のプロセスを停止
   kill -9 <PID>
   ```

2. **設定ファイルが読み込まれない**
   - `config.json`の構文エラーを確認
   - Docker Composeのボリュームマウントを確認

3. **認証エラー**
   - User Pool IDとClient IDが正しいか確認
   - 認証フローが適切に設定されているか確認

### ログ確認

```bash
# cognito-localコンテナのログを確認
docker-compose logs -f cognito-local

# 詳細なデバッグログを有効にする場合
# docker-compose.ymlでCOGNITO_LOCAL_LOG_LEVEL=debugを設定
```

## 設定のカスタマイズ

### 新しいユーザーの追加

`config.json`の`Users`セクションに新しいユーザーを追加できます：

```json
{
  "Users": {
    "local_user_pool_id": {
      "newuser@example.com": {
        "Username": "newuser@example.com",
        "Attributes": [
          {
            "Name": "sub",
            "Value": "new-user-sub-id"
          },
          {
            "Name": "email",
            "Value": "newuser@example.com"
          },
          {
            "Name": "email_verified",
            "Value": "true"
          },
          {
            "Name": "name",
            "Value": "New User"
          }
        ],
        "UserStatus": "CONFIRMED",
        "Password": "NewPassword123!",
        "UserCreateDate": "2024-01-01T00:00:00.000Z",
        "UserLastModifiedDate": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

### パスワードポリシーの変更

`UserPools`セクションの`PasswordPolicy`を変更できます：

```json
{
  "Policies": {
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }
}
```

## 参考資料

- [cognito-local GitHub](https://github.com/jagregory/cognito-local)
- [Amazon Cognito User Pools API Reference](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/)
