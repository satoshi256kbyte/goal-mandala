// モックサービス
const mockReflectionService = {
  createReflection: jest.fn(),
  getReflection: jest.fn(),
  getReflectionsByGoal: jest.fn(),
  updateReflection: jest.fn(),
  deleteReflection: jest.fn(),
};

const mockActionProgressService = {
  getActionProgress: jest.fn(),
  categorizeActions: jest.fn(),
};

// Mock dependencies
jest.mock('../../generated/prisma-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../services/reflection.service', () => ({
  ReflectionService: jest.fn().mockImplementation(() => mockReflectionService),
}));

jest.mock('../../services/action-progress.service', () => ({
  ActionProgressService: jest.fn().mockImplementation(() => mockActionProgressService),
}));

// Mock auth middleware to inject user context
const mockAuthMiddleware = jest.fn((c, next) => {
  c.set('user', { id: 'user-123', email: 'test@example.com' });
  return next();
});

jest.mock('../../middleware/auth', () => ({
  authMiddleware: mockAuthMiddleware,
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock security utils
jest.mock('../../utils/security', () => ({
  sanitizeErrorForLogging: jest.fn(error => ({
    message: error instanceof Error ? error.message : 'Unknown error',
  })),
}));

// Mock errors
jest.mock('../../utils/errors', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  },
}));

import app, { setServices } from '../reflection';
import { NotFoundError } from '../../utils/errors';

// モック振り返りデータ
const mockReflection = {
  id: 'reflection-123',
  goalId: 'goal-123',
  summary: 'テスト総括',
  regretfulActions: '惜しかったアクション',
  slowProgressActions: '進まなかったアクション',
  untouchedActions: '未着手アクション',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

// モックアクション進捗データ
const mockActionProgress = [
  { id: 'action-1', title: 'アクション1', progress: 90, subGoalTitle: 'サブ目標1' },
  { id: 'action-2', title: 'アクション2', progress: 10, subGoalTitle: 'サブ目標1' },
  { id: 'action-3', title: 'アクション3', progress: 0, subGoalTitle: 'サブ目標2' },
];

const mockCategorizedActions = {
  regretful: [mockActionProgress[0]],
  slowProgress: [mockActionProgress[1]],
  untouched: [mockActionProgress[2]],
};

describe('Reflection Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setServices({
      reflectionService: mockReflectionService as any,
      actionProgressService: mockActionProgressService as any,
    });
  });

  describe('POST /api/reflections', () => {
    it('振り返りを作成できる', async () => {
      mockReflectionService.createReflection.mockResolvedValue(mockReflection);

      const res = await app.request('/api/reflections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          goalId: '550e8400-e29b-41d4-a716-446655440000',
          summary: 'テスト総括',
          regretfulActions: '惜しかったアクション',
          slowProgressActions: '進まなかったアクション',
          untouchedActions: '未着手アクション',
        }),
      });

      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.reflection).toEqual(mockReflection);
    });

    it('バリデーションエラーを返す', async () => {
      const res = await app.request('/api/reflections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          goalId: 'invalid-uuid',
          summary: '',
        }),
      });

      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/reflections/:id', () => {
    it('振り返りを取得できる', async () => {
      mockReflectionService.getReflection.mockResolvedValue(mockReflection);

      const res = await app.request('/api/reflections/reflection-123', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reflection).toEqual(mockReflection);
    });

    it('振り返りが見つからない場合は404を返す', async () => {
      mockReflectionService.getReflection.mockResolvedValue(null);

      const res = await app.request('/api/reflections/reflection-123', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/goals/:goalId/reflections', () => {
    it('振り返り一覧を取得できる', async () => {
      const mockReflections = [mockReflection];
      mockReflectionService.getReflectionsByGoal.mockResolvedValue(mockReflections);

      const res = await app.request('/api/goals/goal-123/reflections', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reflections).toEqual(mockReflections);
      expect(data.data.total).toBe(1);
    });

    it('振り返りが存在しない場合は空配列を返す', async () => {
      mockReflectionService.getReflectionsByGoal.mockResolvedValue([]);

      const res = await app.request('/api/goals/goal-123/reflections', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reflections).toEqual([]);
      expect(data.data.total).toBe(0);
    });
  });

  describe('PUT /api/reflections/:id', () => {
    it('振り返りを更新できる', async () => {
      const updatedReflection = {
        ...mockReflection,
        summary: '更新された総括',
      };
      mockReflectionService.updateReflection.mockResolvedValue(updatedReflection);

      const res = await app.request('/api/reflections/reflection-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          summary: '更新された総括',
        }),
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reflection).toEqual(updatedReflection);
    });

    it('振り返りが見つからない場合は404を返す', async () => {
      mockReflectionService.updateReflection.mockRejectedValue(
        new NotFoundError('振り返りが見つかりません')
      );

      const res = await app.request('/api/reflections/reflection-123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          summary: '更新された総括',
        }),
      });

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/reflections/:id', () => {
    it('振り返りを削除できる', async () => {
      mockReflectionService.deleteReflection.mockResolvedValue(undefined);

      const res = await app.request('/api/reflections/reflection-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('振り返りを削除しました');
    });

    it('振り返りが見つからない場合は404を返す', async () => {
      mockReflectionService.deleteReflection.mockRejectedValue(
        new NotFoundError('振り返りが見つかりません')
      );

      const res = await app.request('/api/reflections/reflection-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/goals/:goalId/action-progress', () => {
    it('アクション進捗を取得できる', async () => {
      mockActionProgressService.getActionProgress.mockResolvedValue(mockActionProgress);
      mockActionProgressService.categorizeActions.mockReturnValue(mockCategorizedActions);

      const res = await app.request('/api/goals/goal-123/action-progress', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCategorizedActions);
    });

    it('目標が見つからない場合はエラーを返す', async () => {
      mockActionProgressService.getActionProgress.mockRejectedValue(
        new Error('目標が見つかりません')
      );

      const res = await app.request('/api/goals/goal-123/action-progress', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  /**
   * Property 9: 認証・認可の保証
   * Validates: Requirements 1.1, 2.1, 3.1, 4.1
   *
   * 全てのエンドポイントで認証が必須であり、
   * 認証されていないリクエストは拒否されることを検証
   */
  describe('Property 9: 認証・認可の保証', () => {
    const endpoints = [
      { method: 'POST', path: '/api/reflections', body: { goalId: 'goal-123', summary: 'test' } },
      { method: 'GET', path: '/api/reflections/reflection-123' },
      { method: 'GET', path: '/api/goals/goal-123/reflections' },
      { method: 'PUT', path: '/api/reflections/reflection-123', body: { summary: 'updated' } },
      { method: 'DELETE', path: '/api/reflections/reflection-123' },
      { method: 'GET', path: '/api/goals/goal-123/action-progress' },
    ];

    endpoints.forEach(({ method, path, body }) => {
      it(`${method} ${path} は認証なしでアクセスできない`, async () => {
        // 認証ミドルウェアをモックして認証エラーを返す
        mockAuthMiddleware.mockImplementationOnce((c, next) => {
          return c.json(
            {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: '認証が必要です',
                timestamp: new Date().toISOString(),
              },
            },
            401
          );
        });

        const options: RequestInit = {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {},
        };

        if (body) {
          options.body = JSON.stringify(body);
        }

        const res = await app.request(path, options);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('UNAUTHORIZED');
      });
    });

    it('認証されたユーザーのみが自分の振り返りにアクセスできる', async () => {
      // 異なるユーザーIDでモック
      mockAuthMiddleware.mockImplementationOnce((c, next) => {
        c.set('user', { id: 'other-user-456', email: 'other@example.com' });
        return next();
      });

      // 他のユーザーの振り返りを取得しようとする
      mockReflectionService.getReflection.mockResolvedValue(null);

      const res = await app.request('/api/reflections/reflection-123', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      // サービス層でユーザーIDチェックが行われ、nullが返される
      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(mockReflectionService.getReflection).toHaveBeenCalledWith(
        'reflection-123',
        'other-user-456'
      );
    });

    it('認証されたユーザーのみが自分の目標の振り返り一覧にアクセスできる', async () => {
      // 異なるユーザーIDでモック
      mockAuthMiddleware.mockImplementationOnce((c, next) => {
        c.set('user', { id: 'other-user-456', email: 'other@example.com' });
        return next();
      });

      // 他のユーザーの目標の振り返り一覧を取得しようとする
      mockReflectionService.getReflectionsByGoal.mockResolvedValue([]);

      const res = await app.request('/api/goals/goal-123/reflections', {
        headers: { Authorization: 'Bearer test-token' },
      });

      const data = await res.json();

      // サービス層でユーザーIDチェックが行われ、空配列が返される
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.reflections).toEqual([]);
      expect(mockReflectionService.getReflectionsByGoal).toHaveBeenCalledWith(
        'goal-123',
        'other-user-456'
      );
    });
  });
});
