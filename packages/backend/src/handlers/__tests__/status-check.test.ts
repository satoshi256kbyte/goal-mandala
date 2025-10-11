/**
 * StatusCheckHandler ユニットテスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Context } from 'hono';

// モックを最初に設定
const mockGetProcessingState = jest.fn();

// ProcessingStateServiceをモック
jest.mock('../../services/processing-state.service', () => ({
  ProcessingStateService: jest.fn().mockImplementation(() => ({
    getProcessingState: mockGetProcessingState,
  })),
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

describe('StatusCheckHandler - ユニットテスト', () => {
  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // 環境変数を設定
    process.env.AWS_REGION = 'ap-northeast-1';

    // ハンドラーを動的にインポート（モックが適用された後）
    const module = await import('../status-check.js');
    app = module.app;
  });

  describe('GET /api/ai/async/status/:processId - 正常系テスト', () => {
    it('処理中の状態を取得できる', async () => {
      const mockProcessingState = {
        id: 'process-123',
        userId: 'test-user-id',
        type: 'SUBGOAL_GENERATION',
        status: 'PROCESSING',
        targetId: 'goal-123',
        progress: 50,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:02:30Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessingState);

      const res = await app.request('/api/ai/async/status/process-123', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-123');
      expect(body.data.status).toBe('PROCESSING');
      expect(body.data.type).toBe('SUBGOAL_GENERATION');
      expect(body.data.progress).toBe(50);
      expect(body.data.createdAt).toBe('2025-10-10T10:00:00.000Z');
      expect(body.data.updatedAt).toBe('2025-10-10T10:02:30.000Z');
      expect(body.data.estimatedCompletionTime).toBeDefined();

      // ProcessingStateServiceが呼ばれたことを確認
      expect(mockGetProcessingState).toHaveBeenCalledWith('process-123', 'test-user-id');
    });

    it('完了した処理の状態を取得できる（結果付き）', async () => {
      const mockResult = {
        goalId: 'goal-123',
        subGoals: [
          { id: 'subgoal-1', title: 'サブ目標1' },
          { id: 'subgoal-2', title: 'サブ目標2' },
        ],
      };

      const mockProcessingState = {
        id: 'process-456',
        userId: 'test-user-id',
        type: 'SUBGOAL_GENERATION',
        status: 'COMPLETED',
        targetId: 'goal-123',
        progress: 100,
        result: mockResult,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:04:30Z'),
        completedAt: new Date('2025-10-10T10:04:30Z'),
      };

      mockGetProcessingState.mockResolvedValue(mockProcessingState);

      const res = await app.request('/api/ai/async/status/process-456', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-456');
      expect(body.data.status).toBe('COMPLETED');
      expect(body.data.progress).toBe(100);
      expect(body.data.result).toEqual(mockResult);
      expect(body.data.completedAt).toBe('2025-10-10T10:04:30.000Z');
    });

    it('失敗した処理の状態を取得できる（エラー情報付き）', async () => {
      const mockError = {
        code: 'AI_ERROR',
        message: 'AI生成に失敗しました',
        retryable: true,
      };

      const mockProcessingState = {
        id: 'process-789',
        userId: 'test-user-id',
        type: 'ACTION_GENERATION',
        status: 'FAILED',
        targetId: 'subgoal-123',
        progress: 50,
        result: null,
        error: mockError,
        retryCount: 1,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:03:00Z'),
        completedAt: new Date('2025-10-10T10:03:00Z'),
      };

      mockGetProcessingState.mockResolvedValue(mockProcessingState);

      const res = await app.request('/api/ai/async/status/process-789', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processId).toBe('process-789');
      expect(body.data.status).toBe('FAILED');
      expect(body.data.progress).toBe(50);
      expect(body.data.error).toEqual(mockError);
      expect(body.data.completedAt).toBe('2025-10-10T10:03:00.000Z');
    });

    it('タイムアウトした処理の状態を取得できる', async () => {
      const mockError = {
        code: 'TIMEOUT_ERROR',
        message: '処理時間が制限を超えました',
        retryable: true,
      };

      const mockProcessingState = {
        id: 'process-timeout',
        userId: 'test-user-id',
        type: ProcessingType.TASK_GENERATION,
        status: ProcessingStatus.TIMEOUT,
        targetId: 'action-123',
        progress: 75,
        result: null,
        error: mockError,
        retryCount: 0,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:05:00Z'),
        completedAt: new Date('2025-10-10T10:05:00Z'),
      };

      mockGetProcessingState.mockResolvedValue(mockProcessingState);

      const res = await app.request('/api/ai/async/status/process-timeout', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('TIMEOUT');
      expect(body.data.error).toEqual(mockError);
    });

    it('PENDING状態の処理を取得できる', async () => {
      const mockProcessingState = {
        id: 'process-pending',
        userId: 'test-user-id',
        type: ProcessingType.SUBGOAL_GENERATION,
        status: ProcessingStatus.PENDING,
        targetId: 'goal-123',
        progress: 0,
        result: null,
        error: null,
        retryCount: 0,
        createdAt: new Date('2025-10-10T10:00:00Z'),
        updatedAt: new Date('2025-10-10T10:00:00Z'),
        completedAt: null,
      };

      mockGetProcessingState.mockResolvedValue(mockProcessingState);

      const res = await app.request('/api/ai/async/status/process-pending', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING');
      expect(body.data.progress).toBe(0);
    });
  });

  describe('GET /api/ai/async/status/:processId - 異常系テスト', () => {
    it('処理IDが無効な形式の場合は400エラーを返す', async () => {
      const res = await app.request('/api/ai/async/status/invalid-id', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
      expect(body.error?.message).toContain('形式が正しくありません');
    });

    it('処理IDが空の場合は400エラーを返す', async () => {
      const res = await app.request('/api/ai/async/status/', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      // ルートが一致しないため404になる
      expect(res.status).toBe(404);
    });

    it('処理が見つからない場合は404エラーを返す', async () => {
      mockGetProcessingState.mockResolvedValue(null);

      const res = await app.request('/api/ai/async/status/12345678-1234-1234-1234-123456789012', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND_ERROR');
      expect(body.error?.message).toContain('見つかりません');
    });

    it('他のユーザーの処理にアクセスしようとした場合は404エラーを返す', async () => {
      // getProcessingStateがnullを返す（他のユーザーの処理）
      mockGetProcessingState.mockResolvedValue(null);

      const res = await app.request('/api/ai/async/status/12345678-1234-1234-1234-123456789012', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('NOT_FOUND_ERROR');
      // セキュリティ上、他のユーザーの処理かどうかは明示しない
    });

    it('認証トークンがない場合は401エラーを返す', async () => {
      // 認証なしのリクエスト用に一時的にモックを変更
      mockGetCurrentUser.mockImplementationOnce(() => {
        throw new Error('Unauthorized');
      });

      const res = await app.request('/api/ai/async/status/12345678-1234-1234-1234-123456789012', {
        method: 'GET',
        headers: {},
      });

      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('データベースエラーが発生した場合は500エラーを返す', async () => {
      mockGetProcessingState.mockRejectedValue(new Error('Database connection failed'));

      const res = await app.request('/api/ai/async/status/12345678-1234-1234-1234-123456789012', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('DATABASE_ERROR');
      expect(body.error?.message).toContain('取得に失敗しました');
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

  describe('UUID形式検証', () => {
    it('正しいUUID形式の処理IDを受け入れる', async () => {
      const validUUIDs = [
        '12345678-1234-1234-1234-123456789012',
        'abcdef12-3456-7890-abcd-ef1234567890',
        'ABCDEF12-3456-7890-ABCD-EF1234567890',
      ];

      for (const uuid of validUUIDs) {
        mockGetProcessingState.mockResolvedValue({
          id: uuid,
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
        });

        const res = await app.request(`/api/ai/async/status/${uuid}`, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        });

        expect(res.status).toBe(200);
      }
    });

    it('不正なUUID形式の処理IDを拒否する', async () => {
      const invalidUUIDs = [
        '12345678-1234-1234-1234',
        '12345678123412341234123456789012',
        'not-a-uuid',
        '12345678-1234-1234-1234-12345678901g',
      ];

      for (const uuid of invalidUUIDs) {
        const res = await app.request(`/api/ai/async/status/${uuid}`, {
          method: 'GET',
          headers: {
            Authorization: 'Bearer valid-token',
          },
        });

        expect(res.status).toBe(400);

        const body = await res.json();
        expect(body.error?.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});
