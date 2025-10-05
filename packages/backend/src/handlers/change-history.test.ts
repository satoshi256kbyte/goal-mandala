import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// モックを最初に設定
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUniqueHistory = jest.fn();
const mockFindUniqueGoal = jest.fn();
const mockFindUniqueSubGoal = jest.fn();
const mockFindUniqueAction = jest.fn();
const mockUpdateGoal = jest.fn();
const mockUpdateSubGoal = jest.fn();
const mockUpdateAction = jest.fn();

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockCreateResponse = jest.fn((c, status, message) => {
  return c.json({ error: message }, status);
});

// PrismaClientをモック
jest.mock('../generated/prisma-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    changeHistory: {
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUniqueHistory,
    },
    goal: {
      findUnique: mockFindUniqueGoal,
      update: mockUpdateGoal,
    },
    subGoal: {
      findUnique: mockFindUniqueSubGoal,
      update: mockUpdateSubGoal,
    },
    action: {
      findUnique: mockFindUniqueAction,
      update: mockUpdateAction,
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

// 動的インポートでハンドラーを読み込み
let changeHistoryHandler: any;

describe('Change History Handler - Get History API', () => {
  let app: any;

  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const { Hono } = await import('hono');
    changeHistoryHandler = (await import('./change-history')).default;

    app = new Hono();
    app.route('/', changeHistoryHandler);
  });

  describe('GET /api/goals/:goalId/history', () => {
    it('should return goal change history with pagination', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          entityType: 'goal',
          entityId: 'goal-123',
          userId: 'user-123',
          changedAt: new Date('2024-01-15T10:30:00Z'),
          changes: [
            {
              field: 'title',
              oldValue: '古いタイトル',
              newValue: '新しいタイトル',
            },
          ],
          user: {
            id: 'user-123',
            name: '山田太郎',
          },
        },
        {
          id: 'history-2',
          entityType: 'goal',
          entityId: 'goal-123',
          userId: 'user-123',
          changedAt: new Date('2024-01-14T09:00:00Z'),
          changes: [
            {
              field: 'description',
              oldValue: '古い説明',
              newValue: '新しい説明',
            },
          ],
          user: {
            id: 'user-123',
            name: '山田太郎',
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockHistory);
      mockCount.mockResolvedValue(50);

      const res = await app.request('/goals/goal-123/history?limit=20&offset=0', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.history).toHaveLength(2);
      expect(data.total).toBe(50);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          entityType: 'goal',
          entityId: 'goal-123',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          changedAt: 'desc',
        },
        take: 20,
        skip: 0,
      });

      expect(mockCount).toHaveBeenCalledWith({
        where: {
          entityType: 'goal',
          entityId: 'goal-123',
        },
      });
    });

    it('should use default pagination values when not provided', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const res = await app.request('/goals/goal-123/history', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      // 認証ミドルウェアをモックして認証失敗をシミュレート
      mockAuthMiddleware.mockImplementation((c, next) => {
        // userIdを設定しない
        return next();
      });

      const res = await app.request('/goals/goal-123/history', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('認証が必要です');
    });

    it('should handle database errors', async () => {
      // 認証ミドルウェアを正常に戻す
      mockAuthMiddleware.mockImplementation((c, next) => {
        c.set('userId', 'test-user-id');
        return next();
      });

      mockFindMany.mockRejectedValue(new Error('Database error'));

      const res = await app.request('/goals/goal-123/history', {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('GET /api/subgoals/:subGoalId/history', () => {
    it('should return subgoal change history', async () => {
      const mockHistory = [
        {
          id: 'history-3',
          entityType: 'subgoal',
          entityId: 'subgoal-456',
          userId: 'user-456',
          changedAt: new Date('2024-01-15T10:30:00Z'),
          changes: [
            {
              field: 'title',
              oldValue: '古いサブ目標',
              newValue: '新しいサブ目標',
            },
          ],
          user: {
            id: 'user-456',
            name: '佐藤花子',
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockHistory);
      mockCount.mockResolvedValue(1);

      const res = await app.request('/subgoals/subgoal-456/history', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.history).toHaveLength(1);
      expect(data.total).toBe(1);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entityType: 'subgoal',
            entityId: 'subgoal-456',
          },
        })
      );
    });
  });

  describe('GET /api/actions/:actionId/history', () => {
    it('should return action change history', async () => {
      const mockHistory = [
        {
          id: 'history-4',
          entityType: 'action',
          entityId: 'action-789',
          userId: 'user-789',
          changedAt: new Date('2024-01-15T10:30:00Z'),
          changes: [
            {
              field: 'background',
              oldValue: '古い背景',
              newValue: '新しい背景',
            },
          ],
          user: {
            id: 'user-789',
            name: '鈴木一郎',
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockHistory);
      mockCount.mockResolvedValue(1);

      const res = await app.request('/actions/action-789/history', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.history).toHaveLength(1);
      expect(data.total).toBe(1);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entityType: 'action',
            entityId: 'action-789',
          },
        })
      );
    });
  });

  describe('POST /api/goals/:goalId/rollback', () => {
    it('should rollback goal to a specific history version (admin only)', async () => {
      const mockHistory = {
        id: 'history-1',
        entityType: 'goal',
        entityId: 'goal-123',
        userId: 'admin-user-id',
        changedAt: new Date('2024-01-15T10:30:00Z'),
        changes: [
          {
            field: 'title',
            oldValue: '古いタイトル',
            newValue: '新しいタイトル',
          },
          {
            field: 'description',
            oldValue: '古い説明',
            newValue: '新しい説明',
          },
        ],
      };

      const mockGoal = {
        id: 'goal-123',
        userId: 'test-user-id',
        title: '新しいタイトル',
        description: '新しい説明',
        deadline: new Date('2024-12-31'),
        background: '背景',
        constraints: '制約',
        status: 'ACTIVE',
        progress: 50,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15T10:35:00Z'),
      };

      mockFindUniqueHistory.mockResolvedValue(mockHistory);
      mockFindUniqueGoal.mockResolvedValue(mockGoal);
      mockUpdateGoal.mockResolvedValue({
        ...mockGoal,
        title: '古いタイトル',
        description: '古い説明',
        updatedAt: new Date('2024-01-15T10:40:00Z'),
      });

      // 管理者権限を持つユーザーとしてモック
      mockAuthMiddleware.mockImplementation((c, next) => {
        c.set('userId', 'admin-user-id');
        c.set('isAdmin', true);
        return next();
      });

      const res = await app.request('/goals/goal-123/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId: 'history-1' }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe('古いタイトル');
      expect(data.description).toBe('古い説明');
    });

    it('should return 403 when non-admin user tries to rollback', async () => {
      // 通常ユーザーとしてモック
      mockAuthMiddleware.mockImplementation((c, next) => {
        c.set('userId', 'test-user-id');
        c.set('isAdmin', false);
        return next();
      });

      const res = await app.request('/goals/goal-123/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId: 'history-1' }),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe('管理者権限が必要です');
    });

    it('should return 404 when history not found', async () => {
      mockFindUniqueHistory.mockResolvedValue(null);

      // 管理者権限を持つユーザーとしてモック
      mockAuthMiddleware.mockImplementation((c, next) => {
        c.set('userId', 'admin-user-id');
        c.set('isAdmin', true);
        return next();
      });

      const res = await app.request('/goals/goal-123/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyId: 'non-existent-history' }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('変更履歴が見つかりません');
    });

    it('should return 400 when historyId is missing', async () => {
      // 管理者権限を持つユーザーとしてモック
      mockAuthMiddleware.mockImplementation((c, next) => {
        c.set('userId', 'admin-user-id');
        c.set('isAdmin', true);
        return next();
      });

      const res = await app.request('/goals/goal-123/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('historyIdは必須です');
    });
  });
});
