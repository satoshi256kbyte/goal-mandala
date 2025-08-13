# cognito-local セットアップガイド

このガイドでは、ローカル開発環境でcognito-localを使用してAmazon Cognitoをエミュレートする方法を説明します。

## 前提条件

- Docker および Docker Compose がインストールされていること
- curl コマンドが利用可能であること（テスト用）
- jq コマンドが利用可能であること（JSON解析用、オプション）

## セットアップ手順

### 1. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Cognito Configuration
COGNITO_LOCAL_ENDPOINT=http://localhost:9229
COGNITO_USER_POOL_ID=local_user_pool_id
COGNITO_CLIENT_ID=local_client_id
COGNITO_REGION=ap-northeast-1

# AWS Configuration (for local development)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

### 2. Docker Composeでの起動

```bash
# cognito-localサービスのみを起動
docker-compose up -d cognito-local

# または、全サービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f cognito-local
```

### 3. 動作確認

#### ヘルスチェック

```bash
curl http://localhost:9229/health
```

期待される応答：

```json
{"status":"ok"}
```

#### 設定検証スクリプトの実行

```bash
cd tools/docker/cognito-local
./validate-config.sh
```

#### 認証テストスクリプトの実行

```bash
cd tools/docker/cognito-local
./test-auth.sh
```

## 利用可能なテストユーザー

以下のテストユーザーが事前に設定されています：

| メールアドレス | パスワード | 用途 |
|---|---|---|
| <test@example.com> | TestPassword123! | 基本テスト用 |
| <dev@goalmandalasystem.com> | DevPassword123! | 開発者用 |
| <admin@goalmandalasystem.com> | AdminPassword123! | 管理者用 |

## アプリケーションからの利用方法

### Node.js / TypeScript での利用例

```typescript
import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

// ローカル開発用のクライアント設定
const cognitoClient = new CognitoIdentityProviderClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:9229',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

// ユーザー認証
async function authenticateUser(username: string, password: string) {
  const command = new AdminInitiateAuthCommand({
    UserPoolId: 'local_user_pool_id',
    ClientId: 'local_client_id',
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });

  try {
    const response = await cognitoClient.send(command);
    return response.AuthenticationResult;
  } catch (error) {
    console.error('認証エラー:', error);
    throw error;
  }
}

// 使用例
authenticateUser('test@example.com', 'TestPassword123!')
  .then(result => {
    console.log('認証成功:', result?.AccessToken);
  })
  .catch(error => {
    console.error('認証失敗:', error);
  });
```

### React での利用例

```typescript
import { useEffect, useState } from 'react';
import { CognitoIdentityProviderClient, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REACT_APP_COGNITO_REGION || 'ap-northeast-1',
  endpoint: process.env.REACT_APP_COGNITO_LOCAL_ENDPOINT || 'http://localhost:9229',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const command = new AdminInitiateAuthCommand({
        UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'local_user_pool_id',
        ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || 'local_client_id',
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await cognitoClient.send(command);
      console.log('ログイン成功:', response.AuthenticationResult);
      
      // トークンを保存
      if (response.AuthenticationResult?.AccessToken) {
        localStorage.setItem('accessToken', response.AuthenticationResult.AccessToken);
      }
    } catch (error) {
      console.error('ログインエラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  );
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. ポート9229が使用中

```bash
# ポート使用状況を確認
lsof -i :9229

# 使用中のプロセスを停止
kill -9 <PID>

# または、Docker Composeを停止
docker-compose down
```

#### 2. 設定ファイルが読み込まれない

- `config.json` の構文エラーを確認
- Docker Compose のボリュームマウントを確認
- ファイルの権限を確認

```bash
# 設定ファイルの構文チェック
jq empty tools/docker/cognito-local/config.json

# ボリュームマウントの確認
docker-compose config
```

#### 3. 認証エラー

- User Pool ID と Client ID が正しいか確認
- 認証フローが適切に設定されているか確認
- パスワードがポリシーに準拠しているか確認

#### 4. CORS エラー（ブラウザから直接アクセスする場合）

cognito-local は CORS ヘッダーを適切に設定していない場合があります。
本番環境では API Gateway や Lambda を経由してアクセスすることを推奨します。

### ログの確認

```bash
# cognito-local のログを確認
docker-compose logs -f cognito-local

# 詳細なデバッグログを有効にする場合
# docker-compose.yml で環境変数を追加
# environment:
#   - DEBUG=cognito-local:*
```

### 設定のリセット

```bash
# コンテナとボリュームを削除して完全にリセット
docker-compose down -v
docker-compose up -d
```

## 本番環境への移行

ローカル開発が完了したら、以下の手順で本番環境の Amazon Cognito に移行してください：

1. **環境変数の更新**

   ```bash
   # 本番環境用の設定
   COGNITO_USER_POOL_ID=<実際のUser Pool ID>
   COGNITO_CLIENT_ID=<実際のClient ID>
   COGNITO_REGION=ap-northeast-1
   # COGNITO_LOCAL_ENDPOINT は削除
   ```

2. **AWS SDK の設定更新**

   ```typescript
   const cognitoClient = new CognitoIdentityProviderClient({
     region: process.env.COGNITO_REGION,
     // endpoint は削除（デフォルトのAWSエンドポイントを使用）
   });
   ```

3. **認証フローの確認**
   - 本番環境では `ADMIN_NO_SRP_AUTH` の使用を避ける
   - `USER_PASSWORD_AUTH` または SRP 認証を使用する

## 参考資料

- [cognito-local GitHub リポジトリ](https://github.com/jagregory/cognito-local)
- [Amazon Cognito User Pools API リファレンス](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-cognito-identity-provider/)
