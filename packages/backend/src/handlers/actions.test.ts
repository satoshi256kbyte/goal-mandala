import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// モックを最初に設定
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

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
    action: {
      findUnique: mockFindUnique,
      update: mockUpdate,
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
let actionsHandler: any;

describe('Actions Handler - Update API', () => {
  let app: any;

  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const { Hono } = await import('hono');
    actionsHandler = (await import('./actions')).default;

    app = new Hono();
    app.route('/actions', actionsHandler);
  });

  describe('PUT /actions/:actionId', () => {
    const validActionData = {
      id: 'action-123',
      subGoalId: 'subgoal-123',
      title: '既存のアクション',
      description: '既存の説明',
      background: '既存の背景',
      constraints: '既存の制約',
      position: 0,
      progress: 20,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15T10:30:00Z'),
      subGoal: {
        goal: {
          userId: 'test-user-id',
        },
      },
    };

    describe('正常系テスト（更新成功）', () => {
      it('有効なデータでアクションを更新できる', async () => {
        mockFindUnique.mockResolvedValue(validActionData);
        mockUpdate.mockResolvedValue({
          ...validActionData,
          title: '新しいアクションタイトル',
          description: '新しい説明',
          updatedAt: new Date('2024-01-15T10:35:00Z'),
        });

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          constraints: '既存の制約',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.title).toBe('新しいアクションタイトル');
        expect(data.description).toBe('新しい説明');
        expect(mockUpdate).toHaveBeenCalled();
      });

      it('制約事項が空の場合でも更新できる', async () => {
        mockFindUnique.mockResolvedValue(validActionData);
        mockUpdate.mockResolvedValue({
          ...validActionData,
          constraints: null,
          updatedAt: new Date('2024-01-15T10:35:00Z'),
        });

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(200);
        expect(mockUpdate).toHaveBeenCalled();
      });
    });

    describe('バリデーションエラーテスト', () => {
      it('タイトルが空の場合は400エラーを返す', async () => {
        const requestBody = {
          title: '',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('タイトルが100文字を超える場合は400エラーを返す', async () => {
        const requestBody = {
          title: 'a'.repeat(101),
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('説明が空の場合は400エラーを返す', async () => {
        const requestBody = {
          title: '新しいアクションタイトル',
          description: '',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('説明が500文字を超える場合は400エラーを返す', async () => {
        const requestBody = {
          title: '新しいアクションタイトル',
          description: 'a'.repeat(501),
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('背景が空の場合は400エラーを返す', async () => {
        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('背景が1000文字を超える場合は400エラーを返す', async () => {
        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: 'a'.repeat(1001),
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('制約事項が1000文字を超える場合は400エラーを返す', async () => {
        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          constraints: 'a'.repeat(1001),
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('updatedAtが不足している場合は400エラーを返す', async () => {
        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(400);
        expect(mockUpdate).not.toHaveBeenCalled();
      });
    });

    describe('楽観的ロック競合テスト', () => {
      it('updatedAtが一致しない場合は409エラーを返す', async () => {
        mockFindUnique.mockResolvedValue({
          ...validActionData,
          updatedAt: new Date('2024-01-15T10:32:00Z'), // 異なる更新日時
        });

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z', // 古い更新日時
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toBe('EDIT_CONFLICT');
        expect(data.latestData).toBeDefined();
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('競合エラー時に最新データを返す', async () => {
        const latestData = {
          ...validActionData,
          title: '他のユーザーが更新したアクション',
          updatedAt: new Date('2024-01-15T10:32:00Z'),
        };

        mockFindUnique.mockResolvedValue(latestData);

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.latestData.title).toBe('他のユーザーが更新したアクション');
        expect(data.latestData.updatedAt).toBeDefined();
      });
    });

    describe('権限エラーテスト', () => {
      it('他のユーザーのアクションを更新しようとした場合は403エラーを返す', async () => {
        mockFindUnique.mockResolvedValue({
          ...validActionData,
          subGoal: {
            goal: {
              userId: 'other-user-id', // 異なるユーザーID
            },
          },
        });

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.error).toContain('権限');
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('認証されていない場合は401エラーを返す', async () => {
        // 認証ミドルウェアがuserIdを設定しない場合
        mockAuthMiddleware.mockImplementationOnce((c, next) => {
          // userIdを設定しない
          return next();
        });

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(401);
        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it('アクションが存在しない場合は404エラーを返す', async () => {
        mockFindUnique.mockResolvedValue(null);

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(404);
        expect(mockUpdate).not.toHaveBeenCalled();
      });
    });

    describe('エラーハンドリング', () => {
      it('データベースエラーが発生した場合は500エラーを返す', async () => {
        mockFindUnique.mockRejectedValue(new Error('Database error'));

        const requestBody = {
          title: '新しいアクションタイトル',
          description: '新しい説明',
          background: '既存の背景',
          updatedAt: '2024-01-15T10:30:00Z',
        };

        const res = await app.request('/actions/action-123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        expect(res.status).toBe(500);
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });
});
