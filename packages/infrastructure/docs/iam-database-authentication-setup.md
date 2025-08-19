# IAMデータベース認証セットアップガイド

## 概要

このドキュメントでは、Aurora Serverless V2データベースクラスターでのIAMデータベース認証の設定について説明します。

## 実装されたIAMロール

### 1. Lambda実行用IAMロール

- **ロール名**: `{stackPrefix}-lambda-execution-role`
- **用途**: アプリケーションのLambda関数がデータベースにアクセスするためのロール
- **権限**:
  - RDS IAM認証による接続権限
  - Secrets Manager からの認証情報取得権限
  - KMS復号化権限
  - CloudWatch Logs書き込み権限

### 2. データベースユーザー管理用IAMロール

- **ロール名**: `{stackPrefix}-database-user-management-role`
- **用途**: データベースユーザーの作成・管理用
- **権限**:
  - RDS管理権限（クラスター情報取得、パラメータ確認等）
  - Performance Insights アクセス権限
  - CloudWatch監視権限

### 3. 読み取り専用IAMロール

- **ロール名**: `{stackPrefix}-database-readonly-role`
- **用途**: レポート生成や分析用の読み取り専用アクセス
- **権限**:
  - 読み取り専用データベース接続権限
  - 制限されたSecrets Manager権限

### 4. 管理者用IAMロール

- **ロール名**: `{stackPrefix}-database-admin-role`
- **用途**: データベース管理・メンテナンス用
- **権限**:
  - 完全なデータベース管理権限
  - 全Secrets Manager権限
  - 全KMS権限

## データベースユーザー

以下のIAMデータベースユーザーが作成されます：

### 1. lambda_user

- **用途**: Lambda関数からのアプリケーションアクセス
- **権限**: SELECT, INSERT, UPDATE, DELETE

### 2. app_user

- **用途**: 一般的なアプリケーション処理
- **権限**: SELECT, INSERT, UPDATE, DELETE

### 3. readonly_user

- **用途**: 読み取り専用アクセス（レポート、分析等）
- **権限**: SELECT のみ

### 4. admin_user

- **用途**: データベース管理・メンテナンス
- **権限**: 全権限

## セットアップ手順

### 1. 自動セットアップ（推奨）

CDKデプロイ時に自動的にIAMデータベースユーザーが作成されます：

```bash
# CDKデプロイ
npm run cdk:deploy

# デプロイ後、カスタムリソースが自動的にデータベースユーザーを作成します
```

### 2. 手動セットアップ

必要に応じて、手動でデータベースユーザーを作成できます：

```bash
# 1. SQLスクリプトを使用
psql -h <cluster-endpoint> -U postgres -d goalmandalamain -f scripts/setup-iam-database-users.sql

# 2. Lambda関数を手動実行
aws lambda invoke \
  --function-name {stackPrefix}-database-iam-setup \
  --payload '{"secretArn":"<secret-arn>","clusterIdentifier":"<cluster-id>","region":"ap-northeast-1"}' \
  response.json
```

## 接続方法

### Lambda関数からの接続例

```typescript
import { Client } from 'pg';
import { RDS } from 'aws-sdk';

// IAM認証トークンを生成
const rds = new RDS({ region: 'ap-northeast-1' });
const token = rds.getAuthToken({
    region: 'ap-northeast-1',
    hostname: process.env.DB_HOST,
    port: 5432,
    username: 'lambda_user'
});

// データベースに接続
const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    database: 'goalmandalamain',
    user: 'lambda_user',
    password: token,
    ssl: { rejectUnauthorized: false }
});

await client.connect();
```

### Secrets Manager経由の接続例

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

// Secrets Managerから認証情報を取得
const secretsClient = new SecretsManagerClient({ region: 'ap-northeast-1' });
const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: process.env.DATABASE_SECRET_ARN })
);

const secret = JSON.parse(secretResponse.SecretString!);

// データベースに接続
const client = new Client({
    host: secret.host,
    port: secret.port,
    database: secret.dbname,
    user: secret.username,
    password: secret.password,
    ssl: { rejectUnauthorized: false }
});

await client.connect();
```

## セキュリティ設定

### 暗号化

- **保存時暗号化**: KMSキーによる暗号化が有効
- **転送時暗号化**: SSL/TLS接続が強制

### アクセス制御

- **ネットワーク**: VPC内からのみアクセス可能
- **セキュリティグループ**: Lambda SGからのPostgreSQL(5432)ポートのみ許可
- **IAM認証**: データベースユーザーレベルでのアクセス制御

### 監査

- **接続ログ**: 有効
- **切断ログ**: 有効
- **ステートメントログ**: 有効（1秒以上のクエリ）

## トラブルシューティング

### 接続エラー

1. **IAM権限の確認**

   ```bash
   # IAMロールの権限を確認
   aws iam get-role --role-name {stackPrefix}-lambda-execution-role
   ```

2. **データベースユーザーの確認**

   ```sql
   -- データベースに接続してユーザーを確認
   SELECT usename, usesuper, usecreatedb FROM pg_user WHERE usename LIKE '%_user';
   ```

3. **セキュリティグループの確認**

   ```bash
   # セキュリティグループのルールを確認
   aws ec2 describe-security-groups --group-ids <database-sg-id>
   ```

### よくある問題

1. **接続タイムアウト**
   - セキュリティグループの設定を確認
   - VPCサブネット設定を確認

2. **認証エラー**
   - IAMロールの権限を確認
   - データベースユーザーの存在を確認

3. **SSL接続エラー**
   - SSL設定を確認: `SHOW ssl;`
   - 証明書の設定を確認

## 監視・メンテナンス

### CloudWatch メトリクス

- データベース接続数
- IAM認証成功/失敗数
- クエリ実行時間

### Performance Insights

- クエリパフォーマンスの監視
- 待機イベントの分析
- リソース使用状況の確認

### 定期メンテナンス

- IAMロールの権限見直し（月次）
- データベースユーザーの利用状況確認（月次）
- セキュリティ設定の監査（四半期）

## 参考資料

- [AWS RDS IAM Database Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [Aurora PostgreSQL IAM Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.html)
- [PostgreSQL IAM Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html)
