/**
 * RetryHandler ユニットテスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Context } from 'hono';
import { ProcessingType, ProcessingStatus } from '../../types/async-processing.types.js';

// モックを最初に設定
const mockGetProcessingState = jest.fn();
const mockCreateProcessingState = jest.fn();
const mockSend = jest.fn();

// ProcessingStateServiceをモック
jest.mock('../../services/processing-state.service', () => ({
  ProcessingStateService: jest.fn().mockImplementation(() => ({
    getProcessingState: mockGetProcessingState,
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

describe('RetryHandler - ユニットテスト', () => {
  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // 環境変数を設定
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:ap-northeast-1:123456789012:stateMachine:test';
    process.env.AWS_REGION = 'ap-northeast-1';

    // ハンドラーを動的にインポート（モックが適用された後）
    const module = await import('../retry.js');
    app = module.app;
  });

  describe('POST /api/ai/async/retry/:processId - 正常系テスト', () => {
    it('FAILED状態の処理をリトライできる', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: { code: 'AI_ERROR', message: 'AI生成に失敗しました' },
        retryCount: 0,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:05:00Z'),
        completedAt: new Date('2025-10-10T10:05:00Z'),
      };

      const mockNewProcessing = {
        id: 'process-456',
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);
      mockCreateProcessingState.mockResolvedValue(mockNewProcessing);
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-456',
        startDate: new Date(),
      });

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(202);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-456');
      expect(body.data.status).toBe('PENDING');
      expect(body.data.type).toBe('SUBGOAL_GENERATION');
      expect(body.data.retryCount).toBe(1);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.estimatedCompletionTime).toBeDefined();

      // ProcessingStateServiceが呼ばれたことを確認
      expect(mockGetProcessingState).toHaveBeenCalledWith(processId, 'test-user-id');
      expect(mockCreateProcessingState).toHaveBeenCalledWith({
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        targetId: 'goal-123',
      });

      // Step Functionsが起動されたことを確認
      expect(mockSend).toHaveBeenCalled();
    });

    it('TIMEOUT状態の処理をリトライできる', async () => {
      const processId = 'process-789';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.ACTION_GENERATION,
        status: ProcessingStatus.TIMEOUT,
        targetId: 'subgoal-123',
        progress: 30,
        result: null,
        error: { code: 'TIMEOUT_ERROR', message: '処理時間が制限を超えました' },
        retryCount: 1,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:10:00Z'),
        completedAt: new Date('2025-10-10T10:10:00Z'),
      };

      const mockNewProcessing = {
        id: 'process-101',
        userId: 'test-user-id',
        type: ProcessingType.ACTION_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);
      mockCreateProcessingState.mockResolvedValue(mockNewProcessing);
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-101',
        startDate: new Date(),
      });

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(202);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-101');
      expect(body.data.status).toBe('PENDING');
      expect(body.data.type).toBe('ACTION_GENERATION');
      expect(body.data.retryCount).toBe(2);
    });

    it('リトライ回数が2回の処理をリトライできる（上限3回）', async () => {
      const processId = 'process-202';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.TASK_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'action-123',
        progress: 0,
        result: null,
        error: { code: 'DATABASE_ERROR', message: 'データベースエラー' },
        retryCount: 2,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:02:00Z'),
        completedAt: new Date('2025-10-10T10:02:00Z'),
      };

      const mockNewProcessing = {
        id: 'process-303',
        userId: 'test-user-id',
        type: ProcessingType.TASK_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);
      mockCreateProcessingState.mockResolvedValue(mockNewProcessing);
      mockSend.mockResolvedValue({
        executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test:exec-303',
        startDate: new Date(),
      });

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(202);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.retryCount).toBe(3);
    });
  });

  describe('POST /api/ai/async/retry/:processId - 異常系テスト', () => {
    it('処理が見つからない場合は404エラーを返す', async () => {
      const processId = 'non-existent-process';

      mockGetProcessingState.mockResolvedValue(null);

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND_ERROR');
      expect(body.error?.message).toBe('処理が見つかりません');
    });

    it('他のユーザーの処理をリトライしようとすると403エラーを返す', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'other-user-id', // 異なるユーザーID
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('FORBIDDEN_ERROR');
      expect(body.error?.message).toBe('この処理にアクセスする権限がありません');
    });

    it('COMPLETED状態の処理はリトライできない（400エラー）', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.COMPLETED,
        targetId: 'goal-123',
        progress: 100,
        result: { subGoals: [] },
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('CANNOT_RETRY_ERROR');
      expect(body.error?.message).toBe('この状態の処理はリトライできません');
    });

    it('PENDING状態の処理はリトライできない（400エラー）', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        targetId: 'goal-123',
        progress: 0,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('CANNOT_RETRY_ERROR');
    });

    it('PROCESSING状態の処理はリトライできない（400エラー）', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PROCESSING,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('CANNOT_RETRY_ERROR');
    });

    it('リトライ回数が上限（3回）を超えている場合は400エラーを返す', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'goal-123',
        progress: 0,
        result: null,
        error: { code: 'AI_ERROR', message: 'AI生成に失敗しました' },
        retryCount: 3, // 上限に達している
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('RETRY_LIMIT_EXCEEDED_ERROR');
      expect(body.error?.message).toBe('リトライ上限を超えました');
    });

    it('認証トークンがない場合は401エラーを返す', async () => {
      // 認証なしのリクエスト用に一時的にモックを変更
      mockGetCurrentUser.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      const processId = 'process-123';

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('データベースエラーが発生した場合は500エラーを返す', async () => {
      const processId = 'process-123';

      mockGetProcessingState.mockRejectedValue(new Error('Database connection failed'));

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('INTERNAL_ERROR');
    });

    it('新規処理状態作成時にエラーが発生した場合は500エラーを返す', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);
      mockCreateProcessingState.mockRejectedValue(new Error('Database write failed'));

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('DATABASE_ERROR');
    });

    it('Step Functions起動エラーが発生した場合は503エラーを返す', async () => {
      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      const mockNewProcessing = {
        id: 'process-456',
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);
      mockCreateProcessingState.mockResolvedValue(mockNewProcessing);
      mockSend.mockRejectedValue(new Error('Step Functions execution failed'));

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(503);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('STEP_FUNCTIONS_ERROR');
    });

    it('STATE_MACHINE_ARNが設定されていない場合は503エラーを返す', async () => {
      // 環境変数を削除
      delete process.env.STATE_MACHINE_ARN;

      const processId = 'process-123';

      const mockOriginalProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      };

      const mockNewProcessing = {
        id: 'process-456',
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        progress: 0,
        createdAt: new Date(),
      };

      mockGetProcessingState.mockResolvedValue(mockOriginalProcessing);
      mockCreateProcessingState.mockResolvedValue(mockNewProcessing);

      const res = await app.request(`/api/ai/async/retry/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
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
