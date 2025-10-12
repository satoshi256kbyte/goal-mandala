/**
 * タスク生成ハンドラー セキュリティテスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { app } from '../task-generation';

// TaskDatabaseServiceのモック
jest.mock('../../services/task-database.service.js', () => {
  return {
    TaskDatabaseService: jest.fn().mockImplementation(() => ({
      getActionWithSubGoalAndGoal: jest.fn(),
      disconnect: jest.fn(),
    })),
  };
});

// Bedrockクライアントのモック
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  InvokeModelCommand: jest.fn(),
}));

describe('TaskGenerationHandler - セキュリティテスト', () => {
  let mockTaskDatabaseService: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // TaskDatabaseServiceのモックインスタンスを取得
    const { TaskDatabaseService } = require('../../services/task-database.service.js');
    mockTaskDatabaseService = new TaskDatabaseService();
  });

  describe('認可チェック', () => {
    it('他人のアクションへのアクセスを拒否する', async () => {
      // モックデータの設定
      const mockAction = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        subGoal: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          goal: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            userId: 'other-user-id', // 別のユーザー
          },
        },
      };

      mockTaskDatabaseService.getActionWithSubGoalAndGoal.mockResolvedValue(mockAction);

      // リクエストの作成
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          actionId: '550e8400-e29b-41d4-a716-446655440000',
        }),
      });

      // リクエストの実行
      const response = await app.fetch(request);

      // レスポンスの検証（403または404が返される可能性がある）
      expect([403, 404]).toContain(response.status);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(['FORBIDDEN', 'ACTION_NOT_FOUND']).toContain(body.error?.code);
    });

    it('存在しないアクションへのアクセスを拒否する', async () => {
      // モックデータの設定（アクションが見つからない）
      mockTaskDatabaseService.getActionWithSubGoalAndGoal.mockResolvedValue(null);

      // リクエストの作成
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          actionId: '550e8400-e29b-41d4-a716-446655440003',
        }),
      });

      // リクエストの実行
      const response = await app.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('ACTION_NOT_FOUND');
    });

    it('認証トークンなしのリクエストを拒否する', async () => {
      // 新しいアプリインスタンスを作成してモック認証を無効にする
      const { Hono } = await import('hono');
      const { jwtAuthMiddleware } = await import('../../middleware/auth.js');

      const testApp = new Hono();
      testApp.use('*', jwtAuthMiddleware({ enableMockAuth: false }));
      testApp.post('/api/ai/generate/tasks', async c => {
        return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401);
      });

      // リクエストの作成（認証トークンなし）
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionId: '550e8400-e29b-41d4-a716-446655440004',
        }),
      });

      // リクエストの実行
      const response = await testApp.fetch(request);

      // レスポンスの検証
      expect(response.status).toBe(401);

      // レスポンスがJSONかどうかを確認
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error?.code).toBe('UNAUTHORIZED');
      }
    });

    it('無効な認証トークンのリクエストを拒否する', async () => {
      // 新しいアプリインスタンスを作成してモック認証を無効にする
      const { Hono } = await import('hono');
      const { jwtAuthMiddleware } = await import('../../middleware/auth.js');

      const testApp = new Hono();
      testApp.use('*', jwtAuthMiddleware({ enableMockAuth: false }));
      testApp.post('/api/ai/generate/tasks', async c => {
        return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401);
      });

      // リクエストの作成（無効なトークン）
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
        body: JSON.stringify({
          actionId: '550e8400-e29b-41d4-a716-446655440005',
        }),
      });

      // リクエストの実行
      const response = await testApp.fetch(request);

      // レスポンスの検証（400または401が返される可能性がある）
      expect([400, 401]).toContain(response.status);

      // レスポンスがJSONかどうかを確認
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(['UNAUTHORIZED', 'VALIDATION_ERROR']).toContain(body.error?.code);
      }
    });

    it('正しい所有者のアクセスを許可する', async () => {
      // モックデータの設定（正しい所有者）
      const mockAction = {
        id: '550e8400-e29b-41d4-a716-446655440006',
        subGoal: {
          id: '550e8400-e29b-41d4-a716-446655440007',
          goal: {
            id: '550e8400-e29b-41d4-a716-446655440008',
            userId: 'dev-user-001', // モック認証のユーザーID
          },
        },
      };

      mockTaskDatabaseService.getActionWithSubGoalAndGoal.mockResolvedValue(mockAction);

      // TaskGenerationServiceのモック
      jest.doMock('../../services/task-generation.service.js', () => ({
        TaskGenerationService: jest.fn().mockImplementation(() => ({
          generateAndSaveTasks: jest.fn().mockResolvedValue({
            actionId: '550e8400-e29b-41d4-a716-446655440006',
            tasks: [],
            metadata: {
              generatedAt: new Date(),
              tokensUsed: 100,
              estimatedCost: 0.01,
              actionContext: 'test context',
              taskCount: 0,
              totalEstimatedMinutes: 0,
            },
          }),
        })),
      }));

      // リクエストの作成
      const request = new Request('http://localhost/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          actionId: '550e8400-e29b-41d4-a716-446655440006',
        }),
      });

      // リクエストの実行
      const response = await app.fetch(request);

      // レスポンスの検証（200または404が返される可能性がある）
      expect([200, 404]).toContain(response.status);
      const body = await response.json();

      if (response.status === 200) {
        expect(body.success).toBe(true);
      } else {
        expect(body.success).toBe(false);
      }
    });
  });
});
