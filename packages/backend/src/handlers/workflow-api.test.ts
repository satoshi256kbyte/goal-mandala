import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// モックを最初に設定
const mockFindUnique = jest.fn();

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockCreateResponse = jest.fn((c, status, message) => {
  return c.json({ error: message }, status);
});

const mockStartWorkflowHandler = jest.fn();
const mockGetStatusHandler = jest.fn();
const mockCancelWorkflowHandler = jest.fn();

// PrismaClientをモック
jest.mock('../generated/prisma-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    goal: {
      findUnique: mockFindUnique,
    },
    workflowExecution: {
      findUnique: mockFindUnique,
    },
  })),
}));

// ロガーをモック
jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

// レスポンスユーティリティをモック
jest.mock('../utils/response', () => ({
  createResponse: mockCreateResponse,
}));

// 認証ミドルウェアをモック
const mockAuthMiddleware = jest.fn((c, next) => {
  c.set('userId', 'test-user-id');
  return next();
});

jest.mock('../middleware/auth', () => ({
  authMiddleware: mockAuthMiddleware,
}));

// ワークフローハンドラーをモック
jest.mock('../workflows/handlers/start-workflow', () => ({
  handler: mockStartWorkflowHandler,
}));

jest.mock('../workflows/handlers/get-status', () => ({
  handler: mockGetStatusHandler,
}));

jest.mock('../workflows/handlers/cancel-workflow', () => ({
  handler: mockCancelWorkflowHandler,
}));

// 動的インポートでハンドラーを読み込み
let workflowApiHandler: any;

describe('Workflow API Handler', () => {
  let app: any;

  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const { Hono } = await import('hono');
    workflowApiHandler = (await import('./workflow-api')).default;

    app = new Hono();
    app.route('/api/v1', workflowApiHandler);
  });

  describe('POST /api/v1/goals/:goalId/start-activity', () => {
    const validGoalId = '123e4567-e89b-12d3-a456-426614174000';
    const validGoalData = {
      id: validGoalId,
      userId: 'test-user-id',
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: new Date('2025-12-31'),
      background: 'テスト背景',
      constraints: 'テスト制約',
      status: 'DRAFT',
      progress: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
    };

    it('有効なgoalIdでワークフローを開始できる', async () => {
      mockFindUnique.mockResolvedValue(validGoalData);
      mockStartWorkflowHandler.mockResolvedValue({
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test-execution',
        startDate: '2024-01-15T10:00:00Z',
        status: 'RUNNING',
      });

      const res = await app.request(`/api/v1/goals/${validGoalId}/start-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.executionArn).toBeDefined();
      expect(data.startDate).toBeDefined();
      expect(data.status).toBe('RUNNING');
      expect(data.message).toBe('タスク生成ワークフローを開始しました');
    });

    it('認証されていない場合は401エラーを返す', async () => {
      mockAuthMiddleware.mockImplementationOnce((c, next) => {
        // userIdを設定しない
        return next();
      });

      const res = await app.request(`/api/v1/goals/${validGoalId}/start-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(401);
    });

    it('目標が存在しない場合は404エラーを返す', async () => {
      mockFindUnique.mockResolvedValue(null);

      const res = await app.request(`/api/v1/goals/${validGoalId}/start-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/workflows/:executionArn/status', () => {
    const validWorkflowExecution = {
      executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test-execution',
      goalId: 'goal-123',
      userId: 'test-user-id',
      status: 'RUNNING',
      startDate: '2024-01-15T10:00:00Z',
      progressPercentage: 50,
      processedActions: 4,
      totalActions: 8,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    };

    it('有効なexecutionArnでステータスを取得できる', async () => {
      mockFindUnique.mockResolvedValue(validWorkflowExecution);
      mockGetStatusHandler.mockResolvedValue({
        executionArn: validWorkflowExecution.executionArn,
        status: 'RUNNING',
        startDate: '2024-01-15T10:00:00Z',
        progressPercentage: 50,
        processedActions: 4,
        totalActions: 8,
        failedActions: [],
      });

      const encodedArn = encodeURIComponent(validWorkflowExecution.executionArn);
      const res = await app.request(`/api/v1/workflows/${encodedArn}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.executionArn).toBe(validWorkflowExecution.executionArn);
      expect(data.status).toBe('RUNNING');
    });

    it('ワークフロー実行が存在しない場合は404エラーを返す', async () => {
      mockFindUnique.mockResolvedValue(null);

      const encodedArn = encodeURIComponent(validWorkflowExecution.executionArn);
      const res = await app.request(`/api/v1/workflows/${encodedArn}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/workflows/:executionArn/cancel', () => {
    const validWorkflowExecution = {
      executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test-execution',
      goalId: 'goal-123',
      userId: 'test-user-id',
      status: 'RUNNING',
      startDate: '2024-01-15T10:00:00Z',
      progressPercentage: 50,
      processedActions: 4,
      totalActions: 8,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    };

    it('有効なexecutionArnでワークフローをキャンセルできる', async () => {
      mockFindUnique.mockResolvedValue(validWorkflowExecution);
      mockCancelWorkflowHandler.mockResolvedValue({
        executionArn: validWorkflowExecution.executionArn,
        status: 'ABORTED',
        stopDate: '2024-01-15T10:30:00Z',
      });

      const encodedArn = encodeURIComponent(validWorkflowExecution.executionArn);
      const res = await app.request(`/api/v1/workflows/${encodedArn}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'ユーザーによるキャンセル' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.executionArn).toBe(validWorkflowExecution.executionArn);
      expect(data.status).toBe('ABORTED');
    });

    it('既に完了したワークフローをキャンセルしようとした場合は409エラーを返す', async () => {
      mockFindUnique.mockResolvedValue({
        ...validWorkflowExecution,
        status: 'SUCCEEDED',
      });

      const encodedArn = encodeURIComponent(validWorkflowExecution.executionArn);
      const res = await app.request(`/api/v1/workflows/${encodedArn}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(409);
    });
  });
});
