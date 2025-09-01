/**
 * SecretsManager統合テスト用Lambda関数
 *
 * この関数は統合テストでSecretsManagerからのシークレット取得をテストするために使用されます。
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * テストリクエストの型定義
 */
interface TestRequest {
  action: 'getSecret' | 'getAllSecrets' | 'testPerformance';
  secretName?: string;
  testDuration?: number;
  concurrency?: number;
}

/**
 * テストレスポンスの型定義
 */
interface TestResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  duration: number;
  timestamp: string;
}

/**
 * SecretsManager統合テスト用Lambda関数ハンドラー
 */
export const handler = async (
  event: APIGatewayProxyEvent | TestRequest,
  context: Context
): Promise<APIGatewayProxyResult | TestResponse> => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log('SecretsManager Integration Test Handler started', {
    requestId: context.awsRequestId,
    event: typeof event === 'object' ? JSON.stringify(event) : event,
    timestamp,
  });

  try {
    // リクエストの解析
    let testRequest: TestRequest;

    if ('body' in event && event.body) {
      // API Gateway経由の場合
      testRequest = JSON.parse(event.body);
    } else {
      // 直接呼び出しの場合
      testRequest = event as TestRequest;
    }

    const region = process.env.AWS_REGION || 'ap-northeast-1';
    const secretsManagerClient = new SecretsManagerClient({ region });

    let result: Record<string, unknown>;

    switch (testRequest.action) {
      case 'getSecret':
        result = await testGetSecret(secretsManagerClient, testRequest.secretName!);
        break;

      case 'getAllSecrets':
        result = await testGetAllSecrets(secretsManagerClient);
        break;

      case 'testPerformance':
        result = await testPerformance(
          secretsManagerClient,
          testRequest.testDuration || 10000,
          testRequest.concurrency || 5
        );
        break;

      default:
        throw new Error(`Unknown action: ${testRequest.action}`);
    }

    const duration = Date.now() - startTime;
    const response: TestResponse = {
      success: true,
      data: result,
      duration,
      timestamp,
    };

    console.log('Test completed successfully', {
      action: testRequest.action,
      duration,
      timestamp,
    });

    // API Gateway経由の場合はHTTPレスポンスを返す
    if ('body' in event) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(response),
      };
    }

    // 直接呼び出しの場合はレスポンスオブジェクトを返す
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Test failed', {
      error: errorMessage,
      duration,
      timestamp,
      requestId: context.awsRequestId,
    });

    const errorResponse: TestResponse = {
      success: false,
      error: errorMessage,
      duration,
      timestamp,
    };

    // API Gateway経由の場合
    if ('body' in event) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse),
      };
    }

    // 直接呼び出しの場合
    return errorResponse;
  }
};

/**
 * 単一シークレット取得テスト
 */
async function testGetSecret(
  client: SecretsManagerClient,
  secretName: string
): Promise<Record<string, unknown>> {
  console.log(`Testing secret retrieval: ${secretName}`);

  const startTime = Date.now();

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const result = await client.send(command);

    const duration = Date.now() - startTime;

    // シークレット値は返さず、メタデータのみ返す
    return {
      secretName,
      exists: true,
      encrypted: !!(result as unknown as Record<string, unknown>).KmsKeyId,
      versionId: result.VersionId,
      versionStage: result.VersionStages?.[0],
      createdDate: result.CreatedDate,
      duration,
      hasValue: !!result.SecretString,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`Failed to retrieve secret ${secretName}:`, error);

    return {
      secretName,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof Error ? error.name : 'UnknownError',
      duration,
    };
  }
}

/**
 * 全シークレット取得テスト
 */
async function testGetAllSecrets(client: SecretsManagerClient): Promise<Record<string, unknown>> {
  console.log('Testing retrieval of all secrets');

  const environment = process.env.ENVIRONMENT || 'test';
  const stackPrefix = process.env.STACK_PREFIX || 'goal-mandala';

  const secretNames = [
    `${stackPrefix}-${environment}-secret-database`,
    `${stackPrefix}-${environment}-secret-jwt`,
    `${stackPrefix}-${environment}-secret-external-apis`,
  ];

  const startTime = Date.now();

  // 並列でシークレットを取得
  const promises = secretNames.map(secretName => testGetSecret(client, secretName));
  const secretResults = await Promise.all(promises);

  const duration = Date.now() - startTime;

  const successfulSecrets = secretResults.filter(r => r.exists).length;
  const failedSecrets = secretResults.filter(r => !r.exists).length;

  return {
    totalSecrets: secretNames.length,
    successfulSecrets,
    failedSecrets,
    successRate: (successfulSecrets / secretNames.length) * 100,
    duration,
    results: secretResults,
  };
}

/**
 * パフォーマンステスト
 */
async function testPerformance(
  client: SecretsManagerClient,
  testDuration: number,
  concurrency: number
): Promise<Record<string, unknown>> {
  console.log(`Starting performance test: ${testDuration}ms duration, ${concurrency} concurrency`);

  const environment = process.env.ENVIRONMENT || 'test';
  const stackPrefix = process.env.STACK_PREFIX || 'goal-mandala';
  const testSecretName = `${stackPrefix}-${environment}-secret-database`;

  const startTime = Date.now();
  const results = [];

  // 指定された期間中、並行してシークレット取得を実行
  while (Date.now() - startTime < testDuration) {
    const batchStartTime = Date.now();

    // 並行リクエストを作成
    const promises = Array(concurrency)
      .fill(null)
      .map(async () => {
        const requestStartTime = Date.now();

        try {
          const command = new GetSecretValueCommand({ SecretId: testSecretName });
          await client.send(command);

          return {
            success: true,
            duration: Date.now() - requestStartTime,
          };
        } catch (error) {
          return {
            success: false,
            duration: Date.now() - requestStartTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // 次のバッチまで少し待機
    const batchDuration = Date.now() - batchStartTime;
    if (batchDuration < 100) {
      await new Promise(resolve => setTimeout(resolve, 100 - batchDuration));
    }
  }

  const totalDuration = Date.now() - startTime;

  // 統計の計算
  const successfulRequests = results.filter(r => r.success);
  const failedRequests = results.filter(r => !r.success);

  const totalRequests = results.length;
  const successRate = (successfulRequests.length / totalRequests) * 100;
  const averageLatency =
    successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length;
  const maxLatency = Math.max(...successfulRequests.map(r => r.duration));
  const minLatency = Math.min(...successfulRequests.map(r => r.duration));

  // パーセンタイルの計算
  const sortedLatencies = successfulRequests.map(r => r.duration).sort((a, b) => a - b);
  const p50Index = Math.floor(sortedLatencies.length * 0.5);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p99Index = Math.floor(sortedLatencies.length * 0.99);

  const performanceMetrics = {
    testConfiguration: {
      duration: testDuration,
      concurrency,
      testSecretName,
    },
    results: {
      totalRequests,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: Math.round(successRate * 100) / 100,
      totalDuration,
    },
    latencyMetrics: {
      averageLatency: Math.round(averageLatency * 100) / 100,
      minLatency,
      maxLatency,
      p50Latency: sortedLatencies[p50Index] || 0,
      p95Latency: sortedLatencies[p95Index] || 0,
      p99Latency: sortedLatencies[p99Index] || 0,
    },
    throughputMetrics: {
      requestsPerSecond: Math.round((totalRequests / (totalDuration / 1000)) * 100) / 100,
      successfulRequestsPerSecond:
        Math.round((successfulRequests.length / (totalDuration / 1000)) * 100) / 100,
    },
    errorAnalysis: {
      errorTypes: failedRequests.reduce(
        (acc, r) => {
          const errorType = r.error || 'Unknown';
          acc[errorType] = (acc[errorType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  };

  console.log('Performance test completed', {
    totalRequests,
    successRate: performanceMetrics.results.successRate,
    averageLatency: performanceMetrics.latencyMetrics.averageLatency,
    requestsPerSecond: performanceMetrics.throughputMetrics.requestsPerSecond,
  });

  return performanceMetrics;
}

/**
 * ヘルスチェック用のハンドラー
 */
export const healthCheckHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId,
      environment: process.env.ENVIRONMENT || 'unknown',
      region: process.env.AWS_REGION || 'unknown',
    }),
  };
};
