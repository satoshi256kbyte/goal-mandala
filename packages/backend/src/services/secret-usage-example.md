# SecretService 使用例

## 基本的な使用方法

### 1. サービスのインスタンス化

```typescript
import { SecretService } from './secret';

// デフォルトリージョン（ap-northeast-1）でインスタンス化
const secretService = new SecretService();

// カスタムリージョンでインスタンス化
const secretService = new SecretService('us-east-1');

// カスタムアラートサービスと組み合わせ
const customAlertService = new MyCustomAlertService();
const secretService = new SecretService('ap-northeast-1', customAlertService);
```

### 2. データベース認証情報の取得

```typescript
try {
    const dbCredentials = await secretService.getDatabaseCredentials();
    
    console.log('Database connection info:', {
        host: dbCredentials.host,
        port: dbCredentials.port,
        database: dbCredentials.dbname,
        username: dbCredentials.username
        // パスワードはログに出力しない
    });
    
    // データベース接続に使用
    const connection = await createConnection({
        host: dbCredentials.host,
        port: dbCredentials.port,
        database: dbCredentials.dbname,
        username: dbCredentials.username,
        password: dbCredentials.password
    });
} catch (error) {
    if (error instanceof SecretServiceError) {
        console.error('Secret retrieval failed:', {
            code: error.code,
            message: error.message,
            secretId: error.secretId
        });
    }
}
```

### 3. JWT設定の取得

```typescript
try {
    // JWT秘密鍵のみ取得
    const jwtSecret = await secretService.getJwtSecret();
    
    // JWT設定全体を取得（推奨）
    const jwtConfig = await secretService.getJwtConfig();
    
    // JWTトークンの検証
    const decoded = jwt.verify(token, jwtConfig.secret, {
        algorithms: [jwtConfig.algorithm],
        issuer: jwtConfig.issuer
    });
} catch (error) {
    console.error('JWT configuration error:', error);
}
```

### 4. 外部API認証情報の取得

```typescript
try {
    const apiCredentials = await secretService.getExternalApiCredentials();
    
    // Bedrock設定
    const bedrockClient = new BedrockClient({
        region: apiCredentials.bedrock.region
    });
    
    // SES設定
    const sesClient = new SESClient({
        region: apiCredentials.ses.region
    });
    
    await sesClient.send(new SendEmailCommand({
        Source: apiCredentials.ses.fromEmail,
        ReplyToAddresses: [apiCredentials.ses.replyToEmail],
        // ... その他の設定
    }));
} catch (error) {
    console.error('External API credentials error:', error);
}
```

### 5. 全シークレットの一括取得

```typescript
try {
    const allSecrets = await secretService.getAllSecrets();
    
    // データベース接続
    const dbConnection = await createConnection(allSecrets.database);
    
    // JWT設定
    const jwtMiddleware = createJwtMiddleware(allSecrets.jwt);
    
    // 外部API設定
    const bedrockClient = new BedrockClient({
        region: allSecrets.externalApis.bedrock.region
    });
} catch (error) {
    console.error('Failed to retrieve all secrets:', error);
}
```

## エラーハンドリング

### エラーコードによる分岐処理

```typescript
import { SecretService, SecretServiceError, ERROR_CODES } from './secret';

try {
    const credentials = await secretService.getDatabaseCredentials();
} catch (error) {
    if (error instanceof SecretServiceError) {
        switch (error.code) {
            case ERROR_CODES.SECRET_NOT_FOUND:
                console.error('Secret not found. Please check if the secret exists.');
                // フォールバック処理やアラート送信
                break;
                
            case ERROR_CODES.ACCESS_DENIED:
                console.error('Access denied. Please check IAM permissions.');
                // 権限エラーの処理
                break;
                
            case ERROR_CODES.THROTTLING_EXCEPTION:
                console.error('API throttling detected. Retrying...');
                // 自動リトライは既に実装済み
                break;
                
            case ERROR_CODES.VALIDATION_ERROR:
                console.error('Secret validation failed:', error.message);
                // バリデーションエラーの処理
                break;
                
            default:
                console.error('Unexpected error:', error.message);
        }
    }
}
```

### リトライ処理の活用

```typescript
// SecretServiceは自動的にリトライを行いますが、
// アプリケーションレベルでの追加リトライも可能
async function getSecretsWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await secretService.getAllSecrets();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            // 指数バックオフ
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

## キャッシュ管理

### キャッシュのクリア

```typescript
// 全キャッシュをクリア
secretService.clearCache();

// 特定のシークレットのキャッシュをクリア
secretService.clearSecretCache('goal-mandala-prod-secret-database');

// 定期的なキャッシュクリア
setInterval(() => {
    secretService.clearCache();
}, 5 * 60 * 1000); // 5分ごと
```

### キャッシュ統計の確認

```typescript
const stats = secretService.getErrorStats();
console.log('Cache statistics:', {
    cacheSize: stats.cacheSize,
    environment: stats.environment,
    maxRetries: stats.maxRetries,
    cacheTtl: stats.cacheTtl
});
```

## ヘルスチェック

### サービスの健全性確認

```typescript
async function checkSecretServiceHealth() {
    try {
        const healthStatus = await secretService.healthCheck();
        
        if (healthStatus.status === 'healthy') {
            console.log('All secrets are accessible');
        } else {
            console.warn('Some secrets are not accessible:', {
                checks: healthStatus.checks,
                errors: healthStatus.errors
            });
            
            // 個別のチェック結果を確認
            if (!healthStatus.checks.database) {
                console.error('Database credentials are not accessible');
            }
            if (!healthStatus.checks.jwt) {
                console.error('JWT configuration is not accessible');
            }
            if (!healthStatus.checks.externalApis) {
                console.error('External API credentials are not accessible');
            }
        }
        
        return healthStatus;
    } catch (error) {
        console.error('Health check failed:', error);
        return { status: 'unhealthy', error: error.message };
    }
}

// 定期的なヘルスチェック
setInterval(async () => {
    await checkSecretServiceHealth();
}, 60 * 1000); // 1分ごと
```

## Lambda関数での使用例

### 基本的なLambda関数

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SecretService } from './services/secret';

const secretService = new SecretService();

export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    try {
        // シークレットを取得
        const secrets = await secretService.getAllSecrets();
        
        // データベース接続
        const dbConnection = await createConnection(secrets.database);
        
        // ビジネスロジックの実行
        const result = await processRequest(event, dbConnection);
        
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Lambda execution error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
```

### 認証ミドルウェアでの使用

```typescript
import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { SecretService } from './services/secret';

const secretService = new SecretService();

export async function authenticateRequest(event: APIGatewayProxyEvent) {
    try {
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Missing or invalid authorization header');
        }
        
        const token = authHeader.substring(7);
        
        // JWT設定を取得
        const jwtConfig = await secretService.getJwtConfig();
        
        // トークンを検証
        const decoded = jwt.verify(token, jwtConfig.secret, {
            algorithms: [jwtConfig.algorithm as jwt.Algorithm],
            issuer: jwtConfig.issuer
        });
        
        return decoded;
    } catch (error) {
        console.error('Authentication failed:', error);
        throw new Error('Authentication failed');
    }
}
```

## カスタムアラートサービス

### Slack通知の実装例

```typescript
import { AlertService } from './secret';

class SlackAlertService implements AlertService {
    private webhookUrl: string;
    
    constructor(webhookUrl: string) {
        this.webhookUrl = webhookUrl;
    }
    
    async sendAlert(
        severity: 'low' | 'medium' | 'high' | 'critical',
        message: string,
        context?: any
    ): Promise<void> {
        const color = {
            low: '#36a64f',      // green
            medium: '#ff9500',   // orange
            high: '#ff0000',     // red
            critical: '#8b0000'  // dark red
        }[severity];
        
        const payload = {
            attachments: [{
                color,
                title: `Secret Service Alert [${severity.toUpperCase()}]`,
                text: message,
                fields: context ? Object.entries(context).map(([key, value]) => ({
                    title: key,
                    value: JSON.stringify(value),
                    short: true
                })) : [],
                ts: Math.floor(Date.now() / 1000)
            }]
        };
        
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                console.error('Failed to send Slack alert:', response.statusText);
            }
        } catch (error) {
            console.error('Error sending Slack alert:', error);
        }
    }
}

// 使用例
const slackAlertService = new SlackAlertService(process.env.SLACK_WEBHOOK_URL!);
const secretService = new SecretService('ap-northeast-1', slackAlertService);
```

## ベストプラクティス

### 1. 環境変数の設定

```bash
# Lambda環境変数
ENVIRONMENT=prod
AWS_REGION=ap-northeast-1
```

### 2. IAM権限の最小化

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": [
                "arn:aws:secretsmanager:ap-northeast-1:*:secret:goal-mandala-prod-secret-*"
            ]
        }
    ]
}
```

### 3. エラーログの構造化

```typescript
import { logger } from '../utils/logger';

try {
    const credentials = await secretService.getDatabaseCredentials();
} catch (error) {
    logger.error('Database credentials retrieval failed', {
        errorCode: error.code,
        secretId: error.secretId,
        environment: process.env.ENVIRONMENT,
        timestamp: new Date().toISOString()
    });
}
```

### 4. 定期的なヘルスチェック

```typescript
// CloudWatch Eventsで定期実行
export const healthCheckHandler = async () => {
    const healthStatus = await secretService.healthCheck();
    
    // CloudWatchメトリクスに送信
    await cloudWatch.putMetricData({
        Namespace: 'GoalMandala/SecretService',
        MetricData: [{
            MetricName: 'HealthStatus',
            Value: healthStatus.status === 'healthy' ? 1 : 0,
            Unit: 'Count'
        }]
    }).promise();
};
```
