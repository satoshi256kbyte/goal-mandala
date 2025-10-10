/**
 * アクション生成Handler統合テスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Context } from 'hono';

// モックを最初に設定
const mockValidateActionGenerationRequest = jest.fn();
const mockGenerateAndSaveActions = jest.fn();
const mockGetSubGoalWithGoal = jest.fn();
const mockDisconnect = jest.fn();

// ActionGenerationRequestSchemaをモック
jest.mock('../../schemas/action-generation.schema', () => ({
  ActionGenerationRequestSchema: {
    parse: mockValidateActionGenerationRequest,
  },
}));

// ActionGenerationServiceをモック
jest.mock('../../services/action-generation.service', () => ({
  ActionGenerationService: jest.fn().mockImplementation(() => ({
    generateAndSaveActions: mockGenerateAndSaveActions,
  })),
}));

// DatabaseServiceをモック（認可チェック用）
jest.mock('../../services/action-database.service', () => ({
  ActionDatabaseService: jest.fn().mockImplementation(() => ({
    getSubGoalWithGoal: mockGetSubGoalWithGoal,
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

describe('Action Generation Handler - Integration Tests', () => {
  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const module = await import('../action-generation.js');
    app = module.app;
  });

  describe('POST /api/ai/generate/actions - 正常系テスト', () => {
    const validRequest = {
      subGoalId: 'subgoal-123',
      regenerate: false,
    };

    const mockActions = Array.from({ length: 8 }, (_, i) => ({
      id: `action-${i + 1}`,
      title: `アクション${i + 1}`,
      description: 'a'.repeat(150),
      background: '背景情報',
      type: i % 2 === 0 ? 'execution' : 'habit',
      position: i,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    it('サブ目標からアクションを生成できる', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: mockActions,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
          },
        },
      });

      const res = await app.request('/api/ai/generate/actions', {
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
      expect(data.data.subGoalId).toBe('subgoal-123');
      expect(data.data.actions).toHaveLength(8);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.tokensUsed).toBe(2000);
      expect(data.metadata.goalContext).toBeDefined();
      expect(mockGenerateAndSaveActions).toHaveBeenCalledWith('test-user-id', 'subgoal-123', false);
    });

    it('regenerate=trueで既存アクションを再生成できる', async () => {
      const requestWithRegenerate = {
        subGoalId: 'subgoal-123',
        regenerate: true,
      };

      mockValidateActionGenerationRequest.mockReturnValue(requestWithRegenerate);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: mockActions,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
          },
        },
      });

      const res = await app.request('/api/ai/generate/actions', {
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
      expect(mockGenerateAndSaveActions).toHaveBeenCalledWith('test-user-id', 'subgoal-123', true);
    });

    it('アクション種別（EXECUTION/HABIT）が正しく設定される', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: mockActions,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
          },
        },
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      data.data.actions.forEach((action: any) => {
        expect(['execution', 'habit']).toContain(action.type);
      });
    });
  });

  describe('POST /api/ai/generate/actions - バリデーションエラーテスト', () => {
    it('subGoalIdが空の場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockImplementation(() => {
        throw new ValidationError('サブ目標IDは必須です', [
          { field: 'subGoalId', message: 'サブ目標IDは必須です' },
        ]);
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          subGoalId: '',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
      expect(mockGenerateAndSaveActions).not.toHaveBeenCalled();
    });

    it('subGoalIdがUUID形式でない場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockImplementation(() => {
        throw new ValidationError('サブ目標IDは有効なUUID形式である必要があります', [
          { field: 'subGoalId', message: 'サブ目標IDは有効なUUID形式である必要があります' },
        ]);
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          subGoalId: 'invalid-uuid',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('regenerateがboolean型でない場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockImplementation(() => {
        throw new ValidationError('regenerateはboolean型である必要があります', [
          { field: 'regenerate', message: 'regenerateはboolean型である必要があります' },
        ]);
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          subGoalId: 'subgoal-123',
          regenerate: 'true', // 文字列
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ai/generate/actions - 認証・認可テスト', () => {
    const validRequest = {
      subGoalId: 'subgoal-123',
    };

    it('認証トークンがない場合は401エラーを返す', async () => {
      const { AuthenticationError } = await import('../../errors/action-generation.errors.js');
      mockGetCurrentUser.mockImplementationOnce(() => {
        throw new AuthenticationError('認証が必要です');
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('他人のサブ目標にアクセスしようとした場合は403エラーを返す', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'other-user-id', // 異なるユーザーID
          title: '他人の目標',
        },
      });

      const res = await app.request('/api/ai/generate/actions', {
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
      expect(mockGenerateAndSaveActions).not.toHaveBeenCalled();
    });

    it('存在しないサブ目標にアクセスしようとした場合は404エラーを返す', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue(null);

      const res = await app.request('/api/ai/generate/actions', {
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
      expect(data.error.code).toBe('NOT_FOUND');
      expect(mockGenerateAndSaveActions).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/ai/generate/actions - エラーハンドリングテスト', () => {
    const validRequest = {
      subGoalId: 'subgoal-123',
    };

    it('品質エラーが発生した場合は422エラーを返す', async () => {
      const { QualityError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockRejectedValue(
        new QualityError('アクションは8個である必要があります（現在: 7個）')
      );

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('QUALITY_ERROR');
      expect(data.error.retryable).toBe(true);
    });

    it('データベースエラーが発生した場合は500エラーを返す', async () => {
      const { DatabaseError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockRejectedValue(
        new DatabaseError('データの保存に失敗しました', new Error('Connection timeout'))
      );

      const res = await app.request('/api/ai/generate/actions', {
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

    it('Bedrockエラーが発生した場合は503エラーを返す', async () => {
      const { BedrockError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockRejectedValue(
        new BedrockError('AI生成サービスが一時的に利用できません', true)
      );

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('AI_SERVICE_ERROR');
      expect(data.error.retryable).toBe(true);
    });

    it('予期しないエラーが発生した場合は500エラーを返す', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockRejectedValue(new Error('Unexpected error'));

      const res = await app.request('/api/ai/generate/actions', {
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

  describe('レスポンス形式テスト', () => {
    const validRequest = {
      subGoalId: 'subgoal-123',
    };

    const mockActions = Array.from({ length: 8 }, (_, i) => ({
      id: `action-${i + 1}`,
      title: `アクション${i + 1}`,
      description: 'a'.repeat(150),
      background: '背景情報',
      type: i % 2 === 0 ? 'execution' : 'habit',
      position: i,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    it('成功レスポンスに必要なフィールドが全て含まれる', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: mockActions,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
          },
        },
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      const data = await res.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('metadata');
      expect(data.data).toHaveProperty('subGoalId');
      expect(data.data).toHaveProperty('actions');
      expect(data.metadata).toHaveProperty('generatedAt');
      expect(data.metadata).toHaveProperty('tokensUsed');
      expect(data.metadata).toHaveProperty('estimatedCost');
      expect(data.metadata).toHaveProperty('goalContext');
      expect(data.metadata.goalContext).toHaveProperty('goalTitle');
      expect(data.metadata.goalContext).toHaveProperty('subGoalTitle');
    });

    it('エラーレスポンスに必要なフィールドが全て含まれる', async () => {
      const { ValidationError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockImplementation(() => {
        throw new ValidationError('サブ目標IDは必須です', [
          { field: 'subGoalId', message: 'サブ目標IDは必須です' },
        ]);
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ subGoalId: '' }),
      });

      const data = await res.json();
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(data.error).toHaveProperty('retryable');
      expect(data.error).toHaveProperty('details');
    });

    it('アクションが8個含まれる', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: mockActions,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
          },
        },
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      const data = await res.json();
      expect(data.data.actions).toHaveLength(8);
      data.data.actions.forEach((action: any, index: number) => {
        expect(action).toHaveProperty('id');
        expect(action).toHaveProperty('title');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('background');
        expect(action).toHaveProperty('type');
        expect(['execution', 'habit']).toContain(action.type);
        expect(action).toHaveProperty('position');
        expect(action.position).toBe(index);
        expect(action).toHaveProperty('progress');
        expect(action).toHaveProperty('createdAt');
        expect(action).toHaveProperty('updatedAt');
      });
    });

    it('CORSヘッダーが適切に設定される', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goalId: 'goal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
          title: 'TypeScriptのエキスパートになる',
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: mockActions,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'TypeScriptのエキスパートになる',
            subGoalTitle: 'TypeScriptの基礎文法を習得する',
          },
        },
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.headers.get('access-control-allow-origin')).toBeDefined();
    });
  });
});
