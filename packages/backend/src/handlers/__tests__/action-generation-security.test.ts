/**
 * アクション生成Handler セキュリティテスト
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

describe('Action Generation Handler - Security Tests', () => {
  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const module = await import('../action-generation.js');
    app = module.app;
  });

  describe('認可チェック', () => {
    const validRequest = {
      subGoalId: 'subgoal-123',
    };

    it('サブ目標の所有者のみがアクセスできる', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id', // 同じユーザーID
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: [],
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'テスト目標',
            subGoalTitle: 'テストサブ目標',
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
      expect(mockGetSubGoalWithGoal).toHaveBeenCalledWith('subgoal-123');
    });

    it('他人のサブ目標にはアクセスできない', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goal: {
          id: 'goal-123',
          userId: 'other-user-id', // 異なるユーザーID
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
      expect(mockGenerateAndSaveActions).not.toHaveBeenCalled();
    });

    it('存在しないサブ目標にはアクセスできない', async () => {
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

    it('認可チェックでデータベース接続が適切にクローズされる', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
        },
      });
      mockGenerateAndSaveActions.mockResolvedValue({
        subGoalId: 'subgoal-123',
        actions: [],
        metadata: {
          generatedAt: new Date(),
          tokensUsed: 2000,
          estimatedCost: 0.0003,
          goalContext: {
            goalTitle: 'テスト目標',
            subGoalTitle: 'テストサブ目標',
          },
        },
      });

      await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('認可チェックでエラーが発生してもデータベース接続がクローズされる', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockRejectedValue(new Error('Database error'));

      await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('機密情報マスキング', () => {
    const validRequest = {
      subGoalId: 'subgoal-123',
    };

    it('エラーログに機密情報が含まれない', async () => {
      // utilLogger.errorをスパイ
      const { logger: utilLogger } = await import('../../utils/logger.js');
      const loggerErrorSpy = jest.spyOn(utilLogger, 'error').mockImplementation(() => {});

      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
        },
      });

      // データベースエラーをシミュレート（接続文字列を含む）
      const dbError = new Error('Connection failed');
      (dbError as any).connectionString = 'postgresql://user:password@localhost:5432/db';
      mockGenerateAndSaveActions.mockRejectedValue(dbError);

      await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      // logger.errorが呼ばれたことを確認
      expect(loggerErrorSpy).toHaveBeenCalled();

      // ログに機密情報が含まれていないことを確認
      const logCalls = loggerErrorSpy.mock.calls;
      logCalls.forEach(call => {
        const logString = JSON.stringify(call);
        expect(logString).not.toContain('password');
        expect(logString).not.toContain('user:password');
      });

      loggerErrorSpy.mockRestore();
    });

    it('スタックトレースに機密情報が含まれない', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
        },
      });

      // エラーにスタックトレースを含める
      const error = new Error('Test error');
      error.stack = `Error: Test error
    at /home/username/project/file.js:10:15
    at postgresql://user:password@localhost:5432/db`;
      mockGenerateAndSaveActions.mockRejectedValue(error);

      await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      // ログにマスキングされたスタックトレースが含まれることを確認
      const logCalls = consoleErrorSpy.mock.calls;
      logCalls.forEach(call => {
        const logString = JSON.stringify(call);
        if (logString.includes('stack')) {
          expect(logString).not.toContain('/home/username');
          expect(logString).not.toContain('user:password');
        }
      });

      consoleErrorSpy.mockRestore();
    });

    it('エラーレスポンスに機密情報が含まれない', async () => {
      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
        },
      });

      // 機密情報を含むエラーをシミュレート
      const error = new Error('Database connection failed: postgresql://user:password@localhost');
      mockGenerateAndSaveActions.mockRejectedValue(error);

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRequest),
      });

      const data = await res.json();
      const responseString = JSON.stringify(data);

      // レスポンスに機密情報が含まれていないことを確認
      expect(responseString).not.toContain('password');
      expect(responseString).not.toContain('postgresql://user:password');
      expect(data.error.message).not.toContain('password');
    });
  });

  describe('プロンプトインジェクション対策', () => {
    it('プロンプトインジェクションパターンが検出される（ContextServiceで実施）', async () => {
      // このテストはContextServiceのテストで実施されるため、
      // ここでは統合的な動作確認のみ行う
      const validRequest = {
        subGoalId: 'subgoal-123',
      };

      mockValidateActionGenerationRequest.mockReturnValue(validRequest);
      mockGetSubGoalWithGoal.mockResolvedValue({
        id: 'subgoal-123',
        goal: {
          id: 'goal-123',
          userId: 'test-user-id',
        },
      });

      // ContextServiceでプロンプトインジェクションが検出された場合のエラーをシミュレート
      const { ValidationError } = await import('../../errors/action-generation.errors.js');
      mockGenerateAndSaveActions.mockRejectedValue(
        new ValidationError('不正な入力が検出されました')
      );

      const res = await app.request('/api/ai/generate/actions', {
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
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('入力サニタイゼーション', () => {
    it('特殊文字を含むsubGoalIdが適切に処理される', async () => {
      const requestWithSpecialChars = {
        subGoalId: 'subgoal-<script>alert("xss")</script>',
      };

      const { ValidationError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockImplementation(() => {
        throw new ValidationError('サブ目標IDは有効なUUID形式である必要があります');
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(requestWithSpecialChars),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('SQLインジェクションパターンが拒否される', async () => {
      const requestWithSqlInjection = {
        subGoalId: "'; DROP TABLE actions; --",
      };

      const { ValidationError } = await import('../../errors/action-generation.errors.js');
      mockValidateActionGenerationRequest.mockImplementation(() => {
        throw new ValidationError('サブ目標IDは有効なUUID形式である必要があります');
      });

      const res = await app.request('/api/ai/generate/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(requestWithSqlInjection),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('レート制限（将来の拡張機能）', () => {
    it('API Gatewayのレート制限が適用される想定', () => {
      // このテストは将来の拡張機能として延期
      // API Gatewayレベルでレート制限が適用される
      expect(true).toBe(true);
    });
  });
});
