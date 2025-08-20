# Secrets Manager API仕様書

## 概要

AWS Secrets Managerを使用した機密情報管理システムのAPI仕様書です。Lambda関数からのシークレット取得、管理、監視に関するAPIの詳細を記載しています。

## バージョン情報

- **API バージョン**: 1.0.0
- **最終更新日**: 2024-01-20
- **対応環境**: local, dev, stg, prod

## 認証・認可

### IAMロールベース認証

全てのAPI呼び出しはIAMロールベースの認証を使用します。

```typescript
// Lambda関数実行ロール
const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
  roleName: `${stackPrefix}-${environment}-lambda-secrets-role`,
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
});
```

### 必要な権限

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": ["arn:aws:secretsmanager:region:account:secret:goal-mandala-{env}-secret-*"]
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
      "Resource": "arn:aws:kms:region:account:key/{key-id}",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.region.amazonaws.com"
        }
      }
    }
  ]
}
```

## SecretService クラス API

### コンストラクタ

```typescript
constructor(
  region?: string,
  alertService?: AlertService,
  cacheConfig?: CacheConfig
)
```

**パラメータ:**

- `region` (optional): AWS リージョン (デフォルト: 'ap-northeast-1')
- `alertService` (optional): アラート送信サービス
- `cacheConfig` (optional): キャッシュ設定

**例:**

```typescript
const secretService = new SecretService('ap-northeast-1', undefined, {
  ttl: 300000, // 5分
  maxSize: 100,
  enableMetrics: true,
});
```

### データベース認証情報取得

#### getDatabaseCredentials()

```typescript
async getDatabaseCredentials(customTtl?: number): Promise<DatabaseCredentials>
```

**説明:** データベース接続に必要な認証情報を取得します。

**パラメータ:**

- `customTtl` (optional): カスタムキャッシュTTL（ミリ秒）

**戻り値:**

```typescript
interface DatabaseCredentials {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
  dbClusterIdentifier: string;
}
```

**使用例:**

```typescript
try {
  const dbCredentials = await secretService.getDatabaseCredentials();

  const connection = await createConnection({
    host: dbCredentials.host,
    port: dbCredentials.port,
    username: dbCredentials.username,
    password: dbCredentials.password,
    database: dbCredentials.dbname,
  });
} catch (error) {
  if (error instanceof SecretServiceError) {
    console.error(`Secret error [${error.code}]:`, error.message);
  }
}
```

**エラー:**

- `SECRET_NOT_FOUND`: シークレットが存在しない
- `ACCESS_DENIED`: アクセス権限がない
- `VALIDATION_ERROR`: データ形式が不正

### JWT設定取得

#### getJwtSecret()

```typescript
async getJwtSecret(customTtl?: number): Promise<string>
```

**説明:** JWT署名用の秘密鍵を取得します。

**戻り値:** JWT秘密鍵文字列

#### getJwtConfig()

```typescript
async getJwtConfig(customTtl?: number): Promise<JwtConfig>
```

**説明:** JWT設定情報を取得します。

**戻り値:**

```typescript
interface JwtConfig {
  secret: string;
  algorithm: string;
  issuer: string;
  expiresIn: string;
}
```

**使用例:**

```typescript
const jwtConfig = await secretService.getJwtConfig();

const token = jwt.sign(payload, jwtConfig.secret, {
  algorithm: jwtConfig.algorithm,
  issuer: jwtConfig.issuer,
  expiresIn: jwtConfig.expiresIn,
});
```

### 外部API認証情報取得

#### getExternalApiCredentials()

```typescript
async getExternalApiCredentials(customTtl?: number): Promise<ExternalApiCredentials>
```

**説明:** 外部API（Bedrock、SES等）の認証情報を取得します。

**戻り値:**

```typescript
interface ExternalApiCredentials {
  bedrock: {
    region: string;
    modelId: string;
  };
  ses: {
    region: string;
    fromEmail: string;
    replyToEmail: string;
  };
}
```

**使用例:**

```typescript
const apiCredentials = await secretService.getExternalApiCredentials();

const bedrockClient = new BedrockClient({
  region: apiCredentials.bedrock.region,
});

const sesClient = new SESClient({
  region: apiCredentials.ses.region,
});
```

### バッチ取得

#### getAllSecrets()

```typescript
async getAllSecrets(): Promise<{
  database: DatabaseCredentials;
  jwt: JwtConfig;
  externalApis: ExternalApiCredentials;
}>
```

**説明:** 全てのシークレットを並列で取得します（パフォーマンス最適化）。

**使用例:**

```typescript
const { database, jwt, externalApis } = await secretService.getAllSecrets();
```

#### getMultipleSecrets()

```typescript
async getMultipleSecrets(
  secretIds: string[],
  customTtl?: number
): Promise<Map<string, SecretValue>>
```

**説明:** 複数のシークレットを効率的に取得します。

**パラメータ:**

- `secretIds`: 取得するシークレットIDの配列
- `customTtl`: カスタムキャッシュTTL

**使用例:**

```typescript
const secretIds = ['goal-mandala-prod-secret-database', 'goal-mandala-prod-secret-jwt'];

const secrets = await secretService.getMultipleSecrets(secretIds);
```

### キャッシュ管理

#### preloadSecrets()

```typescript
async preloadSecrets(secretIds: string[], customTtl?: number): Promise<void>
```

**説明:** シークレットを事前にキャッシュに読み込みます。

#### getCacheMetrics()

```typescript
getCacheMetrics(): CacheMetrics
```

**説明:** キャッシュのパフォーマンスメトリクスを取得します。

**戻り値:**

```typescript
interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  oldestEntry?: number;
  newestEntry?: number;
  totalAccesses: number;
}
```

#### clearCache()

```typescript
clearCache(): void
```

**説明:** キャッシュを全てクリアします。

#### invalidateSecret()

```typescript
invalidateSecret(secretId: string): boolean
```

**説明:** 特定のシークレットのキャッシュを無効化します。

## エラーハンドリング

### SecretServiceError

```typescript
class SecretServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
    public readonly secretId?: string
  )
}
```

### エラーコード一覧

| コード                  | 説明                     | 対処法                           |
| ----------------------- | ------------------------ | -------------------------------- |
| `SECRET_NOT_FOUND`      | シークレットが存在しない | シークレット名とリージョンを確認 |
| `ACCESS_DENIED`         | アクセス権限がない       | IAM権限を確認                    |
| `THROTTLING_EXCEPTION`  | API制限に達した          | 指数バックオフでリトライ         |
| `INVALID_SECRET_FORMAT` | シークレット形式が不正   | シークレットの内容を確認         |
| `VALIDATION_ERROR`      | 入力値が不正             | パラメータを確認                 |
| `NETWORK_ERROR`         | ネットワークエラー       | 接続状況を確認                   |
| `CACHE_ERROR`           | キャッシュエラー         | キャッシュをクリアして再試行     |
| `TIMEOUT_ERROR`         | タイムアウト             | タイムアウト設定を確認           |

### エラーハンドリング例

```typescript
try {
  const credentials = await secretService.getDatabaseCredentials();
} catch (error) {
  if (error instanceof SecretServiceError) {
    switch (error.code) {
      case 'SECRET_NOT_FOUND':
        // フォールバック処理
        break;
      case 'ACCESS_DENIED':
        // 権限エラー処理
        break;
      case 'THROTTLING_EXCEPTION':
        // リトライ処理
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      default:
        // その他のエラー処理
        break;
    }
  }
}
```

## パフォーマンス最適化

### キャッシュ戦略

```typescript
// Lambda関数の初期化時にプリロード
const secretService = new SecretService();

export const handler = async (event: any) => {
  // 初回呼び出し時にキャッシュされる
  const credentials = await secretService.getDatabaseCredentials();

  // 2回目以降はキャッシュから高速取得
  const jwtConfig = await secretService.getJwtConfig();
};
```

### バッチ取得の活用

```typescript
// 非効率な例（3回のAPI呼び出し）
const db = await secretService.getDatabaseCredentials();
const jwt = await secretService.getJwtConfig();
const apis = await secretService.getExternalApiCredentials();

// 効率的な例（並列実行）
const { database, jwt, externalApis } = await secretService.getAllSecrets();
```

## 監視・メトリクス

### CloudWatch メトリクス

自動的に以下のメトリクスが送信されます：

- `SecretsManager/GetSecretValue/Success`
- `SecretsManager/GetSecretValue/Error`
- `SecretsManager/Cache/HitRate`
- `SecretsManager/Cache/Size`

### カスタムメトリクス

```typescript
// メトリクス取得
const metrics = secretService.getCacheMetrics();

// CloudWatchに送信
await cloudWatch.putMetricData({
  Namespace: 'GoalMandala/SecretsManager',
  MetricData: [
    {
      MetricName: 'CacheHitRate',
      Value: metrics.hitRate,
      Unit: 'Percent',
    },
  ],
});
```

## セキュリティ考慮事項

### 機密情報の取り扱い

```typescript
// ❌ 悪い例：ログに機密情報を出力
console.log('Database password:', credentials.password);

// ✅ 良い例：機密情報をマスク
console.log('Database credentials retrieved for user:', credentials.username);
```

### 環境分離

```typescript
// 環境別のシークレット名
const secretName = `goal-mandala-${process.env.ENVIRONMENT}-secret-database`;

// 環境チェック
if (!['local', 'dev', 'stg', 'prod'].includes(process.env.ENVIRONMENT)) {
  throw new Error('Invalid environment');
}
```

## 使用例

### Lambda関数での基本的な使用

```typescript
import { SecretService } from './services/secret';

const secretService = new SecretService();

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    // データベース接続
    const dbCredentials = await secretService.getDatabaseCredentials();
    const db = await createConnection(dbCredentials);

    // JWT検証
    const jwtConfig = await secretService.getJwtConfig();
    const decoded = jwt.verify(event.headers.authorization, jwtConfig.secret);

    // 外部API呼び出し
    const apiCredentials = await secretService.getExternalApiCredentials();
    const bedrockResponse = await callBedrock(apiCredentials.bedrock);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

### 高パフォーマンス設定

```typescript
// Lambda関数の外側で初期化（コンテナ再利用時にキャッシュが保持される）
const secretService = new SecretService('ap-northeast-1', undefined, {
  ttl: 10 * 60 * 1000, // 10分キャッシュ
  maxSize: 50,
  enableMetrics: true,
});

// 初期化時にプリロード
const initPromise = secretService.preloadSecrets([
  'goal-mandala-prod-secret-database',
  'goal-mandala-prod-secret-jwt',
  'goal-mandala-prod-secret-external-apis',
]);

export const handler = async (event: any) => {
  // プリロード完了を待機
  await initPromise;

  // キャッシュから高速取得
  const { database, jwt, externalApis } = await secretService.getAllSecrets();

  // 処理続行...
};
```

## トラブルシューティング

### よくある問題

#### 1. シークレットが見つからない

```
Error: SECRET_NOT_FOUND
```

**確認項目:**

- シークレット名の環境変数が正しく設定されているか
- リージョンが正しく設定されているか
- CDKスタックが正しくデプロイされているか

#### 2. アクセス権限エラー

```
Error: ACCESS_DENIED
```

**確認項目:**

- Lambda関数のIAMロールにSecretsManager権限があるか
- KMS復号化権限があるか
- 環境別のアクセス制御が正しく設定されているか

#### 3. パフォーマンス問題

```
Warning: High latency detected
```

**対処法:**

- キャッシュTTLを延長
- プリロード機能を活用
- バッチ取得を使用

## 関連ドキュメント

- [運用手順書](./secrets-manager-operations-guide.md)
- [トラブルシューティングガイド](./secrets-manager-troubleshooting-guide.md)
- [セキュリティ設定ガイド](./secrets-manager-security-guide.md)
- [統合テストガイド](./secrets-manager-integration-tests.md)

## 変更履歴

| バージョン | 日付       | 変更内容 |
| ---------- | ---------- | -------- |
| 1.0.0      | 2024-01-20 | 初版作成 |
