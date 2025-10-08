/**
 * テストヘルパー関数
 * サブ目標生成APIのテストで使用する共通ヘルパー関数
 */

import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import type { SubGoalGenerationRequest } from '../../types/subgoal-generation.types';

/**
 * モックAPIGatewayProxyEventを作成
 */
export function createMockAPIGatewayEvent(body: unknown, userId?: string): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/api/ai/generate/subgoals',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      authorizer: userId
        ? {
            claims: {
              sub: userId,
              email: 'test@example.com',
            },
          }
        : null,
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'jest-test',
        userArn: null,
      },
      path: '/api/ai/generate/subgoals',
      stage: 'test',
      requestId: 'test-request-id',
      requestTime: '01/Jan/2025:00:00:00 +0000',
      requestTimeEpoch: 1704067200000,
      resourceId: 'test-resource-id',
      resourcePath: '/api/ai/generate/subgoals',
    },
    resource: '/api/ai/generate/subgoals',
  };
}

/**
 * モックLambda Contextを作成
 */
export function createMockContext(): Context {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789012:function:test-function',
    memoryLimitInMB: '1024',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2025/01/01/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

/**
 * 有効なサブ目標生成リクエストを作成
 */
export function createValidSubGoalRequest(
  overrides?: Partial<SubGoalGenerationRequest>
): SubGoalGenerationRequest {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);

  return {
    title: 'TypeScriptのエキスパートになる',
    description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
    deadline: futureDate.toISOString(),
    background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
    constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
    ...overrides,
  };
}

/**
 * 無効なサブ目標生成リクエストを作成（バリデーションエラー用）
 */
export function createInvalidSubGoalRequest(
  invalidField: 'title' | 'description' | 'deadline' | 'background'
): Partial<SubGoalGenerationRequest> {
  const base = createValidSubGoalRequest();

  switch (invalidField) {
    case 'title':
      return { ...base, title: '' };
    case 'description':
      return { ...base, description: '' };
    case 'deadline':
      return { ...base, deadline: '2020-01-01T00:00:00Z' }; // 過去の日付
    case 'background':
      return { ...base, background: '' };
    default:
      return base;
  }
}

/**
 * テスト用のユーザーIDを生成
 */
export function generateTestUserId(): string {
  return `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * テスト用の目標IDを生成
 */
export function generateTestGoalId(): string {
  return `test-goal-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * エラーレスポンスの検証ヘルパー
 */
export function expectErrorResponse(
  response: { statusCode: number; body: string },
  expectedStatusCode: number,
  expectedErrorCode: string
): void {
  expect(response.statusCode).toBe(expectedStatusCode);

  const body = JSON.parse(response.body);
  expect(body.success).toBe(false);
  expect(body.error).toBeDefined();
  expect(body.error.code).toBe(expectedErrorCode);
}

/**
 * 成功レスポンスの検証ヘルパー
 */
export function expectSuccessResponse(response: { statusCode: number; body: string }): void {
  expect(response.statusCode).toBe(200);

  const body = JSON.parse(response.body);
  expect(body.success).toBe(true);
  expect(body.data).toBeDefined();
}

/**
 * 待機ヘルパー（非同期処理のテスト用）
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 環境変数のモック設定
 */
export function setupTestEnvironment(): void {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-32chars';
  process.env.AWS_REGION = 'ap-northeast-1';
  process.env.BEDROCK_MODEL_ID = 'amazon.nova-micro-v1:0';
  process.env.FRONTEND_URL = 'http://localhost:5173';
}

/**
 * 環境変数のクリーンアップ
 */
export function cleanupTestEnvironment(): void {
  delete process.env.NODE_ENV;
  delete process.env.DATABASE_URL;
  delete process.env.JWT_SECRET;
  delete process.env.AWS_REGION;
  delete process.env.BEDROCK_MODEL_ID;
  delete process.env.FRONTEND_URL;
}
