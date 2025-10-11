/**
 * CancelHandlerのユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ProcessingStatus, ProcessingType } from '../../types/async-processing.types.js';

// モックを最初に設定
const mockGetProcessingState = jest.fn();
const mockUpdateProcessingStatus = jest.fn();
const mockUpdateProcessingError = jest.fn();
const mockSend = jest.fn();

// ProcessingStateServiceをモック
jest.mock('../../services/processing-state.service', () => ({
  ProcessingStateService: jest.fn().mockImplementation(() => ({
    getProcessingState: mockGetProcessingState,
    updateProcessingStatus: mockUpdateProcessingStatus,
    updateProcessingError: mockUpdateProcessingError,
  })),
}));

// AWS SDK Step Functionsクライアントをモック
jest.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  StopExecutionCommand: jest.fn().mockImplementation(params => params),
}));

// 認証ミドルウェアをモック
jest.mock('../../middleware/auth', () => ({
  jwtAuthMiddleware: jest.fn().mockImplementation(() => {
    return async (_c: unknown, next: () => Promise<void>) => {
      await next();
    };
  }),
  getCurrentUser: jest.fn().mockReturnValue({
    id: 'test-user-id',
    email: 'test@example.com',
  }),
}));

// テスト対象のモジュールをインポート（モックの後）
import { app } from '../cancel.js';

describe('CancelHandler', () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // 環境変数の設定
    process.env.STATE_MACHINE_ARN =
      'arn:aws:states:ap-northeast-1:123456789012:stateMachine:test-state-machine';
  });

  afterEach(() => {
    delete process.env.STATE_MACHINE_ARN;
  });

  describe('POST /api/ai/async/cancel/:processId', () => {
    it('PENDING状態の処理を正常にキャンセルできる', async () => {
      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        targetId: 'test-goal-id',
        progress: 0,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);
      mockUpdateProcessingStatus.mockResolvedValue(undefined);
      mockUpdateProcessingError.mockResolvedValue(undefined);
      mockSend.mockResolvedValue({});

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.processId).toBe(processId);
      expect(data.data.status).toBe(ProcessingStatus.CANCELLED);
      expect(data.data.message).toBe('処理をキャンセルしました');

      expect(mockGetProcessingState).toHaveBeenCalledWith(processId, 'test-user-id');
      expect(mockUpdateProcessingStatus).toHaveBeenCalledWith(
        processId,
        ProcessingStatus.CANCELLED
      );
      expect(mockUpdateProcessingError).toHaveBeenCalledWith(processId, {
        code: 'CANCELLED',
        message: 'ユーザーによるキャンセル',
        retryable: false,
      });
    });

    it('PROCESSING状態の処理を正常にキャンセルできる', async () => {
      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.ACTION_GENERATION,
        status: ProcessingStatus.PROCESSING,
        targetId: 'test-subgoal-id',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:05:00Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);
      mockUpdateProcessingStatus.mockResolvedValue(undefined);
      mockUpdateProcessingError.mockResolvedValue(undefined);
      mockSend.mockResolvedValue({});

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe(ProcessingStatus.CANCELLED);
    });

    it('処理が見つからない場合は404エラーを返す', async () => {
      const processId = 'non-existent-id';

      mockGetProcessingState.mockResolvedValue(null);

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('NOT_FOUND_ERROR');
      expect(data.error?.message).toBe('処理が見つかりません');
    });

    it('COMPLETED状態の処理はキャンセルできない', async () => {
      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.COMPLETED,
        targetId: 'test-goal-id',
        progress: 100,
        result: { subGoals: [] },
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:10:00Z'),
        completedAt: new Date('2025-01-01T00:10:00Z'),
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('CANNOT_CANCEL_ERROR');
      expect(data.error?.message).toBe('この状態の処理はキャンセルできません');
    });

    it('FAILED状態の処理はキャンセルできない', async () => {
      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.FAILED,
        targetId: 'test-goal-id',
        progress: 50,
        result: null,
        error: { code: 'AI_ERROR', message: 'AI生成に失敗しました', retryable: true },
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:05:00Z'),
        completedAt: new Date('2025-01-01T00:05:00Z'),
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('CANNOT_CANCEL_ERROR');
    });

    it('他のユーザーの処理はキャンセルできない', async () => {
      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'other-user-id', // 異なるユーザーID
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        targetId: 'test-goal-id',
        progress: 0,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('FORBIDDEN_ERROR');
      expect(data.error?.message).toBe('この処理にアクセスする権限がありません');
    });

    it('Step Functions停止に失敗しても処理状態は更新される', async () => {
      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PROCESSING,
        targetId: 'test-goal-id',
        progress: 30,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:03:00Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);
      mockUpdateProcessingStatus.mockResolvedValue(undefined);
      mockUpdateProcessingError.mockResolvedValue(undefined);
      mockSend.mockRejectedValue(new Error('Step Functions停止エラー'));

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      // Step Functions停止に失敗しても、処理状態の更新は成功する
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe(ProcessingStatus.CANCELLED);

      expect(mockUpdateProcessingStatus).toHaveBeenCalledWith(
        processId,
        ProcessingStatus.CANCELLED
      );
    });

    it('データベースエラーの場合は500エラーを返す', async () => {
      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        targetId: 'test-goal-id',
        progress: 0,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);
      mockUpdateProcessingStatus.mockRejectedValue(new Error('Database error'));

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error?.code).toBe('DATABASE_ERROR');
      expect(data.error?.retryable).toBe(true);
    });

    it('STATE_MACHINE_ARNが設定されていない場合でも処理は続行される', async () => {
      delete process.env.STATE_MACHINE_ARN;

      const processId = 'test-process-id';
      const mockProcessing = {
        id: processId,
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        targetId: 'test-goal-id',
        progress: 0,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessing);
      mockUpdateProcessingStatus.mockResolvedValue(undefined);
      mockUpdateProcessingError.mockResolvedValue(undefined);

      const req = new Request(`http://localhost/api/ai/async/cancel/${processId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe(ProcessingStatus.CANCELLED);

      // Step Functions停止は呼ばれない
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('GET /health', () => {
    it('ヘルスチェックが正常に動作する', async () => {
      const req = new Request('http://localhost/health', {
        method: 'GET',
      });

      const res = await app.fetch(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });
});
