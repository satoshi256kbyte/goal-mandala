/**
 * サブ目標生成Handler統合テスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Context } from 'hono';

// モックを最初に設定
const mockValidateSubGoalGenerationRequest = jest.fn();
const mockSanitizeInput = jest.fn((input: string) => input);
const mockGenerateAndSaveSubGoals = jest.fn();
const mockGetGoal = jest.fn();
const mockDisconnect = jest.fn();

// InputValidationServiceをモック
jest.mock('../services/input-validation.service', () => ({
  InputValidationService: jest.fn().mockImplementation(() => ({
    validateSubGoalGenerationRequest: mockValidateSubGoalGenerationRequest,
    sanitizeInput: mockSanitizeInput,
  })),
}));

// SubGoalGenerationServiceをモック
jest.mock('../services/subgoal-generation.service', () => ({
  SubGoalGenerationService: jest.fn().mockImplementation(() => ({
    generateAndSaveSubGoals: mockGenerateAndSaveSubGoals,
  })),
}));

// DatabaseServiceをモック
jest.mock('../services/subgoal-database.service', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    getGoal: mockGetGoal,
    disconnect: mockDisconnect,
  })),
}));

// 認証ミドルウェアをモック
const mockGetCurrentUser = jest.fn(() => ({ id: 'test-user-id', email: 'test@example.com' }));

jest.mock('../middleware/auth', () => ({
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

describe('SubGoal Generation Handler - Integration Tests', () => {
  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const module = await import('./subgoal-generation.js');
    app = module.app;
  });

  describe('POST /api/ai/generate/subgoals - 正常系テスト', () => {
    const validRequest = {
      title: 'TypeScriptのエキスパートになる',
      description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
      deadline: '2025-12-31T23:59:59Z',
      background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
      constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
    };

    const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
      id: `subgoal-${i + 1}`,
      title: `サブ目標${i + 1}`,
      description: 'a'.repeat(100),
      background: '背景情報',
      position: i,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    it('新規目標作成時にサブ目標を生成できる', async () => {
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockResolvedValue({
        goalId: 'goal-123',
        subGoals: mockSubGoals,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.000225,
        },
      });

      const res = await app.request('/api/ai/generate/subgoals', {
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
      expect(data.data.goalId).toBe('goal-123');
      expect(data.data.subGoals).toHaveLength(8);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.tokensUsed).toBe(1500);
      expect(mockGenerateAndSaveSubGoals).toHaveBeenCalledWith('test-user-id', validRequest);
    });

    it('既存目標更新時にサブ目標を生成できる', async () => {
      const requestWithGoalId = {
        ...validRequest,
        goalId: 'existing-goal-123',
      };

      mockValidateSubGoalGenerationRequest.mockReturnValue(requestWithGoalId);
      mockGetGoal.mockResolvedValue({
        id: 'existing-goal-123',
        userId: 'test-user-id',
        title: '既存の目標',
      });
      mockGenerateAndSaveSubGoals.mockResolvedValue({
        goalId: 'existing-goal-123',
        subGoals: mockSubGoals,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.000225,
        },
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(requestWithGoalId),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.goalId).toBe('existing-goal-123');
      expect(mockGetGoal).toHaveBeenCalledWith('existing-goal-123');
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('制約事項が空でもサブ目標を生成できる', async () => {
      const requestWithoutConstraints = {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: '2025-12-31T23:59:59Z',
        background: 'フロントエンド開発者として成長したい',
      };

      mockValidateSubGoalGenerationRequest.mockReturnValue(requestWithoutConstraints);
      mockGenerateAndSaveSubGoals.mockResolvedValue({
        goalId: 'goal-456',
        subGoals: mockSubGoals,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1400,
          estimatedCost: 0.00021,
        },
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(requestWithoutConstraints),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  describe('POST /api/ai/generate/subgoals - バリデーションエラーテスト', () => {
    it('タイトルが空の場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockImplementation(() => {
        throw new ValidationError('タイトルは必須です', [
          { field: 'title', message: 'タイトルは必須です' },
        ]);
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: '',
          description: '説明',
          deadline: '2025-12-31T23:59:59Z',
          background: '背景',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
      expect(mockGenerateAndSaveSubGoals).not.toHaveBeenCalled();
    });

    it('タイトルが200文字を超える場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockImplementation(() => {
        throw new ValidationError('タイトルは200文字以内である必要があります', [
          { field: 'title', message: 'タイトルは200文字以内である必要があります' },
        ]);
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'a'.repeat(201),
          description: '説明',
          deadline: '2025-12-31T23:59:59Z',
          background: '背景',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('説明が空の場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockImplementation(() => {
        throw new ValidationError('説明は必須です', [
          { field: 'description', message: '説明は必須です' },
        ]);
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'タイトル',
          description: '',
          deadline: '2025-12-31T23:59:59Z',
          background: '背景',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('達成期限が過去の日付の場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockImplementation(() => {
        throw new ValidationError('達成期限は未来の日付である必要があります', [
          { field: 'deadline', message: '達成期限は未来の日付である必要があります' },
        ]);
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'タイトル',
          description: '説明',
          deadline: '2020-01-01T00:00:00Z',
          background: '背景',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('背景が1000文字を超える場合は400エラーを返す', async () => {
      const { ValidationError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockImplementation(() => {
        throw new ValidationError('背景は1000文字以内である必要があります', [
          { field: 'background', message: '背景は1000文字以内である必要があります' },
        ]);
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          title: 'タイトル',
          description: '説明',
          deadline: '2025-12-31T23:59:59Z',
          background: 'a'.repeat(1001),
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/ai/generate/subgoals - 認証・認可テスト', () => {
    const validRequest = {
      title: 'TypeScriptのエキスパートになる',
      description: '6ヶ月でTypeScriptの高度な機能を習得する',
      deadline: '2025-12-31T23:59:59Z',
      background: 'フロントエンド開発者として成長したい',
    };

    it('認証トークンがない場合は401エラーを返す', async () => {
      // 認証ミドルウェアをモックして認証失敗をシミュレート
      const { AuthenticationError } = await import('../errors/subgoal-generation.errors.js');
      mockGetCurrentUser.mockImplementationOnce(() => {
        throw new AuthenticationError('認証が必要です');
      });

      const res = await app.request('/api/ai/generate/subgoals', {
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

    it('他人の目標を更新しようとした場合は403エラーを返す', async () => {
      const requestWithGoalId = {
        ...validRequest,
        goalId: 'other-user-goal-123',
      };

      mockValidateSubGoalGenerationRequest.mockReturnValue(requestWithGoalId);
      mockGetGoal.mockResolvedValue({
        id: 'other-user-goal-123',
        userId: 'other-user-id', // 異なるユーザーID
        title: '他人の目標',
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(requestWithGoalId),
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN_ERROR');
      expect(data.error.message).toContain('権限');
      expect(mockGenerateAndSaveSubGoals).not.toHaveBeenCalled();
    });

    it('存在しない目標を更新しようとした場合は404エラーを返す', async () => {
      const requestWithGoalId = {
        ...validRequest,
        goalId: 'non-existent-goal-123',
      };

      mockValidateSubGoalGenerationRequest.mockReturnValue(requestWithGoalId);
      mockGetGoal.mockResolvedValue(null);

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(requestWithGoalId),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND_ERROR');
      expect(mockGenerateAndSaveSubGoals).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/ai/generate/subgoals - エラーハンドリングテスト', () => {
    const validRequest = {
      title: 'TypeScriptのエキスパートになる',
      description: '6ヶ月でTypeScriptの高度な機能を習得する',
      deadline: '2025-12-31T23:59:59Z',
      background: 'フロントエンド開発者として成長したい',
    };

    it('品質エラーが発生した場合は422エラーを返す', async () => {
      const { QualityError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockRejectedValue(
        new QualityError('サブ目標は8個である必要があります（現在: 7個）')
      );

      const res = await app.request('/api/ai/generate/subgoals', {
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
      const { DatabaseError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockRejectedValue(
        new DatabaseError('データの保存に失敗しました', new Error('Connection timeout'))
      );

      const res = await app.request('/api/ai/generate/subgoals', {
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
      const { BedrockError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockRejectedValue(
        new BedrockError('AI生成サービスが一時的に利用できません', true)
      );

      const res = await app.request('/api/ai/generate/subgoals', {
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
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockRejectedValue(new Error('Unexpected error'));

      const res = await app.request('/api/ai/generate/subgoals', {
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
      title: 'TypeScriptのエキスパートになる',
      description: '6ヶ月でTypeScriptの高度な機能を習得する',
      deadline: '2025-12-31T23:59:59Z',
      background: 'フロントエンド開発者として成長したい',
    };

    const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
      id: `subgoal-${i + 1}`,
      title: `サブ目標${i + 1}`,
      description: 'a'.repeat(100),
      background: '背景情報',
      position: i,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    it('成功レスポンスに必要なフィールドが全て含まれる', async () => {
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockResolvedValue({
        goalId: 'goal-123',
        subGoals: mockSubGoals,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.000225,
        },
      });

      const res = await app.request('/api/ai/generate/subgoals', {
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
      expect(data.data).toHaveProperty('goalId');
      expect(data.data).toHaveProperty('subGoals');
      expect(data.metadata).toHaveProperty('generatedAt');
      expect(data.metadata).toHaveProperty('tokensUsed');
      expect(data.metadata).toHaveProperty('estimatedCost');
    });

    it('エラーレスポンスに必要なフィールドが全て含まれる', async () => {
      const { ValidationError } = await import('../errors/subgoal-generation.errors.js');
      mockValidateSubGoalGenerationRequest.mockImplementation(() => {
        throw new ValidationError('タイトルは必須です', [
          { field: 'title', message: 'タイトルは必須です' },
        ]);
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ title: '' }),
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

    it('サブ目標が8個含まれる', async () => {
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockResolvedValue({
        goalId: 'goal-123',
        subGoals: mockSubGoals,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.000225,
        },
      });

      const res = await app.request('/api/ai/generate/subgoals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      const data = await res.json();
      expect(data.data.subGoals).toHaveLength(8);
      data.data.subGoals.forEach((subGoal: any, index: number) => {
        expect(subGoal).toHaveProperty('id');
        expect(subGoal).toHaveProperty('title');
        expect(subGoal).toHaveProperty('description');
        expect(subGoal).toHaveProperty('background');
        expect(subGoal).toHaveProperty('position');
        expect(subGoal.position).toBe(index);
        expect(subGoal).toHaveProperty('progress');
        expect(subGoal).toHaveProperty('createdAt');
        expect(subGoal).toHaveProperty('updatedAt');
      });
    });

    it('CORSヘッダーが適切に設定される', async () => {
      mockValidateSubGoalGenerationRequest.mockReturnValue(validRequest);
      mockGenerateAndSaveSubGoals.mockResolvedValue({
        goalId: 'goal-123',
        subGoals: mockSubGoals,
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 1500,
          estimatedCost: 0.000225,
        },
      });

      const res = await app.request('/api/ai/generate/subgoals', {
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
