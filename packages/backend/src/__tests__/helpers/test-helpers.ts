import { Context, Next } from 'hono';

export const setupTestDatabase = async () => ({ connected: true });
export const cleanupTestDatabase = async () => {};
export const createTestUser = async (data = {}) => ({
  id: 'test-user',
  email: 'test@example.com',
  ...data,
});
export const createTestGoal = async (data = {}) => ({
  id: 'test-goal',
  title: 'Test Goal',
  ...data,
});
export const createTestSubGoal = async (data = {}) => ({
  id: 'test-subgoal',
  position: 0,
  ...data,
});
export const createTestAction = async (data = {}) => ({
  id: 'test-action',
  type: 'EXECUTION',
  ...data,
});
export const createTestTask = async (data = {}) => ({
  id: 'test-task',
  status: 'NOT_STARTED',
  ...data,
});
export const createTestProcessingState = async (data = {}) => ({
  id: 'test-state',
  status: 'PENDING',
  ...data,
});
export const mockAuthMiddleware = () => (c: Context, next: Next) => next();
export const mockBedrockService = () => ({
  generateSubGoals: jest.fn(),
  generateActions: jest.fn(),
  generateTasks: jest.fn(),
});
export const mockPrismaClient = () => ({
  user: { findUnique: jest.fn() },
  goal: { findMany: jest.fn() },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
});
export const createMockJWTToken = () => 'mock-jwt-token';
export const createMockCognitoPayload = (data = {}) => ({
  sub: 'test-sub',
  email: 'test@example.com',
  ...data,
});
export const setupMockAuth = () => ({ setup: true });
export const cleanupMockAuth = () => {};
export const createTestContext = (data: Record<string, unknown> = {}) => ({
  req: {},
  res: {},
  get: (key: string) => data[key],
});
export const createTestRequest = (data: Record<string, unknown> = {}) => ({
  method: 'GET',
  url: '/',
  ...data,
});
export const createTestResponse = () => ({ status: 200, json: jest.fn() });
export const waitForAsync = async <T>(promise: Promise<T>) => promise;
export const expectAsyncError = async <T>(promise: Promise<T>, message: string) => {
  try {
    await promise;
    throw new Error('Expected error');
  } catch (e: unknown) {
    expect((e as Error).message).toContain(message);
  }
};
export const expectAsyncSuccess = async <T>(promise: Promise<T>) => promise;
export const createMockTimer = () => ({
  start: jest.fn(),
  end: jest.fn(),
  duration: jest.fn().mockReturnValue(100),
});
export const measureExecutionTime = async <T>(fn: () => Promise<T>) => {
  const start = Date.now();
  const result = await fn();
  return { result, duration: Date.now() - start };
};

// 既存のAPIGatewayイベント作成関数
export function createMockAPIGatewayEvent(body: unknown, userId?: string) {
  return {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    httpMethod: 'POST',
    requestContext: {
      authorizer: userId ? { claims: { sub: userId, email: 'test@example.com' } } : null,
    },
  };
}

export function createMockLambdaContext() {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2023/01/01/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

export const createValidSubGoalRequest = () => ({
  goalId: '550e8400-e29b-41d4-a716-446655440000',
  title: 'TypeScriptのエキスパートになる',
  description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
  deadline: '2025-12-31T23:59:59Z',
  background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
  constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
});
