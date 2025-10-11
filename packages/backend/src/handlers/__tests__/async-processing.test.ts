/**
 * AsyncProcessingHandler ユニットテスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Context } from 'hono';
import { ProcessingType, ProcessingStatus } from '../../generated/prisma-client';

// モックを最初に設定
const mockCreateProcessingState = jest.fn();
const mockSend = jest.fn();

// ProcessingStateServiceをモック
jest.mock('../../services/processing-state.service', () => ({
  ProcessingStateService: jest.fn().mockImplementation(() => ({
    createProcessingState: mockCreateProcessingState,
  })),
}));

// AWS SDK Step Functionsクライアントをモック
jest.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  StartExecutionCommand: jest.fn().mockImplementation(params => params),
}));

// 認証ミドルウェアをモック
const mockGetCurrentUser = jest.fn(() => ({ id: 'test-user-id', email: 'test@example.com' }));

jest.mock('../../middleware/auth', () => ({
  jwtAuthMiddleware: jest.fn(() => {
    return async (c: Context, next: () => Promise<void>) => {
      c.set('user', { id: 'test-user-id', email: 'test@example.com' });
      await next();
    };
  }),
  getCurrentUser: mockGetCurrentUser,
}));

// 動的インポートでハンドラーを読み込み
let app: any;

describe('AsyncProcessingHandler - ユニットテスト', () => {
  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // 環境変数を設定
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:ap-northeast-1:123456789012:stateMachine:test';
    process.env.AWS_REGION = 'ap-northeast-1';

    // ハンドラーを動的にインポート（モックが適用された後）
    const module = await import('../async-processing.js');
    app = module.app;
  });

  describe('POST /api/ai/async/generate - 正常系テスト', () => {
    it('サブ目標生成の非同期処理を開始できる', async () => {
      const validRequest = {
        type: 'SUBGOAL_GENERATION',
        params: {
          goalId: 'goal-123',
          title: 'TypeScriptのエキスパートになる',
          description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
          deadline: '2025-12-31T23:59:59Z',
          background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
          constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
        },
      };

      const mockProcessingState = {
        id: 'process-123',
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockCreateProcessingState.mockResolvedValue(mockProcessingState);
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-123',
        startDate: new Date(),
      });

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(202);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-123');
      expect(body.data.status).toBe('PENDING');
      expect(body.data.type).toBe('SUBGOAL_GENERATION');
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.estimatedCompletionTime).toBeDefined();

      // ProcessingStateServiceが呼ばれたことを確認
      expect(mockCreateProcessingState).toHaveBeenCalledWith({
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: 'goal-123',
      });

      // Step Functionsが起動されたことを確認
      expect(mockSend).toHaveBeenCalled();
    });

    it('アクション生成の非同期処理を開始できる', async () => {
      const validRequest = {
        type: 'ACTION_GENERATION',
        params: {
          subGoalId: 'subgoal-123',
        },
      };

      const mockProcessingState = {
        id: 'process-456',
        userId: 'test-user-id',
        type: ProcessingType.ACTION_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockCreateProcessingState.mockResolvedValue(mockProcessingState);
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-456',
        startDate: new Date(),
      });

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(202);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-456');
      expect(body.data.type).toBe('ACTION_GENERATION');

      // ProcessingStateServiceが呼ばれたことを確認
      expect(mockCreateProcessingState).toHaveBeenCalledWith({
        userId: 'test-user-id',
        type: ProcessingType.ACTION_GENERATION,
        targetId: 'subgoal-123',
      });
    });

    it('タスク生成の非同期処理を開始できる', async () => {
      const validRequest = {
        type: 'TASK_GENERATION',
        params: {
          actionId: 'action-123',
        },
      };

      const mockProcessingState = {
        id: 'process-789',
        userId: 'test-user-id',
        type: ProcessingType.TASK_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockCreateProcessingState.mockResolvedValue(mockProcessingState);
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-789',
        startDate: new Date(),
      });

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(202);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-789');
      expect(body.data.type).toBe('TASK_GENERATION');

      // ProcessingStateServiceが呼ばれたことを確認
      expect(mockCreateProcessingState).toHaveBeenCalledWith({
        userId: 'test-user-id',
        type: ProcessingType.TASK_GENERATION,
        targetId: 'action-123',
      });
    });
  });

  describe('POST /api/ai/async/generate - 異常系テスト', () => {
    it('リクエストボディが不正な場合は400エラーを返す', async () => {
      const invalidRequest = {
        type: 'INVALID_TYPE',
        params: {},
      };

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('必須フィールドが欠けている場合は400エラーを返す', async () => {
      const invalidRequest = {
        type: 'SUBGOAL_GENERATION',
        params: {
          // goalIdが欠けている
          title: 'Test',
        },
      };

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('認証トークンがない場合は401エラーを返す', async () => {
      // 認証なしのリクエスト用に一時的にモックを変更
      mockGetCurrentUser.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      const validRequest = {
        type: 'SUBGOAL_GENERATION',
        params: {
          goalId: 'goal-123',
          title: 'Test',
          description: 'Test description',
          deadline: '2025-12-31T23:59:59Z',
          background: 'Test background',
        },
      };

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('データベースエラーが発生した場合は500エラーを返す', async () => {
      const validRequest = {
        type: 'SUBGOAL_GENERATION',
        params: {
          goalId: 'goal-123',
          title: 'Test',
          description: 'Test description',
          deadline: '2025-12-31T23:59:59Z',
          background: 'Test background',
        },
      };

      mockCreateProcessingState.mockRejectedValue(new Error('Database connection failed'));

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('DATABASE_ERROR');
    });

    it('Step Functions起動エラーが発生した場合は503エラーを返す', async () => {
      const validRequest = {
        type: 'SUBGOAL_GENERATION',
        params: {
          goalId: 'goal-123',
          title: 'Test',
          description: 'Test description',
          deadline: '2025-12-31T23:59:59Z',
          background: 'Test background',
        },
      };

      const mockProcessingState = {
        id: 'process-123',
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockCreateProcessingState.mockResolvedValue(mockProcessingState);
      mockSend.mockRejectedValue(new Error('Step Functions execution failed'));

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('STEP_FUNCTIONS_ERROR');
    });

    it('STATE_MACHINE_ARNが設定されていない場合は503エラーを返す', async () => {
      // 環境変数を削除
      delete process.env.STATE_MACHINE_ARN;

      const validRequest = {
        type: 'SUBGOAL_GENERATION',
        params: {
          goalId: 'goal-123',
          title: 'Test',
          description: 'Test description',
          deadline: '2025-12-31T23:59:59Z',
          background: 'Test background',
        },
      };

      const mockProcessingState = {
        id: 'process-123',
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockCreateProcessingState.mockResolvedValue(mockProcessingState);

      const res = await app.request('/api/ai/async/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('STEP_FUNCTIONS_ERROR');

      // 環境変数を復元
      process.env.STATE_MACHINE_ARN =
        'arn:aws:states:ap-northeast-1:123456789012:stateMachine:test';
    });
  });

  describe('GET /health - ヘルスチェック', () => {
    it('ヘルスチェックエンドポイントが正常に動作する', async () => {
      const res = await app.request('/health', {
        method: 'GET',
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });
});
