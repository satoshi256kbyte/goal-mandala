/**
 * タスク生成Handler統合テスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Context } from 'hono';

// モックを最初に設定
const mockValidateTaskGenerationRequest = jest.fn();
const mockGenerateAndSaveTasks = jest.fn();
const mockGetActionWithRelations = jest.fn();
const mockDisconnect = jest.fn();

// TaskGenerationRequestSchemaをモック
jest.mock('../../schemas/task-generation.schema', () => ({
  TaskGenerationRequestSchema: {
    parse: mockValidateTaskGenerationRequest,
  },
}));

// TaskGenerationServiceをモック
jest.mock('../../services/task-generation.service', () => ({
  TaskGenerationService: jest.fn().mockImplementation(() => ({
    generateAndSaveTasks: mockGenerateAndSaveTasks,
  })),
}));

// DatabaseServiceをモック（認可チェック用）
jest.mock('../../services/task-database.service', () => ({
  TaskDatabaseService: jest.fn().mockImplementation(() => ({
    getActionWithRelations: mockGetActionWithRelations,
    disconnect: mockDisconnect,
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

describe('Task Generation Handler - Integration Tests', () => {
  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const module = await import('../task-generation.js');
    app = module.app;
  });

  describe('POST /api/ai/generate/tasks - 正常系テスト', () => {
    const validRequest = {
      actionId: 'action-123',
      regenerate: false,
    };

    const mockTasks = Array.from({ length: 3 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `タスク${i + 1}`,
      description: 'a'.repeat(100),
      type: 'execution',
      estimatedMinutes: 45,
      priority: 'MEDIUM',
      dependencies: [],
      position: i,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    it('アクションからタスクを生成できる', async () => {
      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'execution',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'test-user-id',
            title: 'TypeScriptのエキスパートになる',
          },
        },
      });
      mockGenerateAndSaveTasks.mockResolvedValue({
        actionId: 'action-123',
        tasks: mockTasks,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.00023,
          actionContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
            actionTitle: 'TypeScript公式ドキュメントを読む',
            actionType: 'execution',
          },
          taskCount: 3,
          totalEstimatedMinutes: 135,
        },
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.actionId).toBe('action-123');
      expect(data.data.tasks).toHaveLength(3);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.tokensUsed).toBe(1500);
      expect(data.metadata.actionContext).toBeDefined();
      expect(mockGenerateAndSaveTasks).toHaveBeenCalledWith('test-user-id', 'action-123', false);
    });

    it('regenerate=trueで既存タスクを再生成できる', async () => {
      const requestWithRegenerate = {
        actionId: 'action-123',
        regenerate: true,
      };

      mockValidateTaskGenerationRequest.mockReturnValue(requestWithRegenerate);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'execution',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'test-user-id',
            title: 'TypeScriptのエキスパートになる',
          },
        },
      });
      mockGenerateAndSaveTasks.mockResolvedValue({
        actionId: 'action-123',
        tasks: mockTasks,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.00023,
          actionContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
            actionTitle: 'TypeScript公式ドキュメントを読む',
            actionType: 'execution',
          },
          taskCount: 3,
          totalEstimatedMinutes: 135,
        },
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(requestWithRegenerate),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockGenerateAndSaveTasks).toHaveBeenCalledWith('test-user-id', 'action-123', true);
    });

    it('タスク種別（EXECUTION/HABIT）がアクションから継承される', async () => {
      const habitTasks = mockTasks.map(task => ({ ...task, type: 'habit' }));

      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'habit',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'test-user-id',
            title: 'TypeScriptのエキスパートになる',
          },
        },
      });
      mockGenerateAndSaveTasks.mockResolvedValue({
        actionId: 'action-123',
        tasks: habitTasks,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.00023,
          actionContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
            actionTitle: '毎日TypeScriptコードを書く',
            actionType: 'habit',
          },
          taskCount: 3,
          totalEstimatedMinutes: 135,
        },
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      data.data.tasks.forEach((task: any) => {
        expect(task.type).toBe('habit');
      });
    });
  });

  describe('POST /api/ai/generate/tasks - バリデーションエラーテスト', () => {
    it('actionIdが空の場合は400エラーを返す', async () => {
      const { TaskValidationError } = await import('../../errors/task-generation.errors.js');
      mockValidateTaskGenerationRequest.mockImplementation(() => {
        throw new TaskValidationError('アクションIDは必須です', [
          { field: 'actionId', message: 'アクションIDは必須です' },
        ]);
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          actionId: '',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
      expect(mockGenerateAndSaveTasks).not.toHaveBeenCalled();
    });

    it('actionIdがUUID形式でない場合は400エラーを返す', async () => {
      const { TaskValidationError } = await import('../../errors/task-generation.errors.js');
      mockValidateTaskGenerationRequest.mockImplementation(() => {
        throw new TaskValidationError('アクションIDは有効なUUID形式である必要があります', [
          { field: 'actionId', message: 'アクションIDは有効なUUID形式である必要があります' },
        ]);
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          actionId: 'invalid-uuid',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('regenerateがboolean型でない場合は400エラーを返す', async () => {
      const { TaskValidationError } = await import('../../errors/task-generation.errors.js');
      mockValidateTaskGenerationRequest.mockImplementation(() => {
        throw new TaskValidationError('regenerateはboolean型である必要があります', [
          { field: 'regenerate', message: 'regenerateはboolean型である必要があります' },
        ]);
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          actionId: 'action-123',
          regenerate: 'true', // 文字列
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ai/generate/tasks - 認証・認可テスト', () => {
    const validRequest = {
      actionId: 'action-123',
    };

    it('認証トークンがない場合は401エラーを返す', async () => {
      const { UnauthorizedError } = await import('../../errors/task-generation.errors.js');
      mockGetCurrentUser.mockImplementationOnce(() => {
        throw new UnauthorizedError('認証が必要です');
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('他人のアクションにアクセスしようとした場合は403エラーを返す', async () => {
      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'execution',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'other-user-id', // 異なるユーザーID
            title: '他人の目標',
          },
        },
      });

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toContain('権限');
      expect(mockGenerateAndSaveTasks).not.toHaveBeenCalled();
    });

    it('存在しないアクションにアクセスしようとした場合は404エラーを返す', async () => {
      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue(null);

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ACTION_NOT_FOUND');
      expect(mockGenerateAndSaveTasks).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/ai/generate/tasks - エラーハンドリングテスト', () => {
    const validRequest = {
      actionId: 'action-123',
    };

    it('品質エラーが発生した場合は422エラーを返す', async () => {
      const { QualityValidationError } = await import('../../errors/task-generation.errors.js');
      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'execution',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'test-user-id',
            title: 'TypeScriptのエキスパートになる',
          },
        },
      });
      mockGenerateAndSaveTasks.mockRejectedValue(
        new QualityValidationError('タスクは最低1個以上必要です')
      );

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('QUALITY_VALIDATION_FAILED');
      expect(data.error.retryable).toBe(false);
    });

    it('データベースエラーが発生した場合は500エラーを返す', async () => {
      const { DatabaseError } = await import('../../errors/task-generation.errors.js');
      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'execution',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'test-user-id',
            title: 'TypeScriptのエキスパートになる',
          },
        },
      });
      mockGenerateAndSaveTasks.mockRejectedValue(new DatabaseError('データの保存に失敗しました'));

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DATABASE_ERROR');
      expect(data.error.retryable).toBe(true);
    });

    it('AIエラーが発生した場合は500エラーを返す', async () => {
      const { AIGenerationError } = await import('../../errors/task-generation.errors.js');
      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'execution',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'test-user-id',
            title: 'TypeScriptのエキスパートになる',
          },
        },
      });
      mockGenerateAndSaveTasks.mockRejectedValue(
        new AIGenerationError('AI生成サービスが一時的に利用できません')
      );

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AI_GENERATION_FAILED');
      expect(data.error.retryable).toBe(true);
    });

    it('予期しないエラーが発生した場合は500エラーを返す', async () => {
      mockValidateTaskGenerationRequest.mockReturnValue(validRequest);
      mockGetActionWithRelations.mockResolvedValue({
        id: 'action-123',
        subGoalId: 'subgoal-123',
        type: 'execution',
        subGoal: {
          id: 'subgoal-123',
          goalId: 'goal-123',
          goal: {
            id: 'goal-123',
            userId: 'test-user-id',
            title: 'TypeScriptのエキスパートになる',
          },
        },
      });
      mockGenerateAndSaveTasks.mockRejectedValue(new Error('Unexpected error'));

      const res = await app.request('/api/ai/generate/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /health - ヘルスチェックテスト', () => {
    it('ヘルスチェックエンドポイントが正常に動作する', async () => {
      const res = await app.request('/health', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });
});
