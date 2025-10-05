/**
 * AI生成Lambda Handlerのテスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from './ai-generation.js';
import { BedrockService } from '../services/bedrock.service.js';

// BedrockServiceをモック化
jest.mock('../services/bedrock.service.js');

// テスト用のヘルパー関数
function createAuthenticatedEvent(
  body: unknown,
  userId = 'test-user-123'
): Partial<APIGatewayProxyEvent> {
  return {
    body: JSON.stringify(body),
    headers: { 'x-user-id': 'test-user-123' },
    requestContext: {
      requestId: 'test-request-id',
    } as any,
    headers: {
      'x-user-id': userId,
    },
  };
}

describe('AI Generation Handler', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    // テスト環境を設定
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // 環境変数を元に戻す
    process.env.NODE_ENV = originalEnv;
  });

  describe('リクエスト処理', () => {
    it('正常なサブ目標生成リクエストを処理できる', async () => {
      // モックの設定
      const mockSubGoals = [
        {
          title: 'サブ目標1',
          description: '説明1',
          background: '背景1',
          position: 0,
        },
      ];

      jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockResolvedValue(mockSubGoals);

      // テストイベント作成
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      // ハンドラー実行
      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      // 検証
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockSubGoals);
    });

    it('正常なアクション生成リクエストを処理できる', async () => {
      // モックの設定
      const mockActions = [
        {
          title: 'アクション1',
          description: '説明1',
          type: 'execution' as const,
          background: '背景1',
          position: 0,
        },
      ];

      jest.spyOn(BedrockService.prototype, 'generateActions').mockResolvedValue(mockActions);

      // テストイベント作成
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'action',
          input: {
            goalTitle: 'テスト目標',
            goalDescription: '目標の説明',
            subGoalTitle: 'サブ目標',
            subGoalDescription: 'サブ目標の説明',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      // ハンドラー実行
      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      // 検証
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockActions);
    });

    it('正常なタスク生成リクエストを処理できる', async () => {
      // モックの設定
      const mockTasks = [
        {
          title: 'タスク1',
          description: '説明1',
          type: 'execution' as const,
          estimatedMinutes: 30,
        },
      ];

      jest.spyOn(BedrockService.prototype, 'generateTasks').mockResolvedValue(mockTasks);

      // テストイベント作成
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'task',
          input: {
            actionTitle: 'アクション',
            actionDescription: 'アクションの説明',
            actionType: 'execution',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      // ハンドラー実行
      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      // 検証
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockTasks);
    });
  });

  describe('認証', () => {
    it('認証情報がない場合は401エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
        headers: {},
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('AUTHENTICATION_ERROR');
    });

    it('userIdが一致しない場合は401エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'different-user-id',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
        headers: {
          'x-user-id': 'test-user-123',
        },
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('バリデーション', () => {
    it('bodyが存在しない場合は400エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: null,
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('不正なJSON形式の場合は400エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: 'invalid json',
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('typeフィールドが存在しない場合は400エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          input: {},
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('不正なtypeの場合は400エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'invalid',
          input: {},
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('inputフィールドが存在しない場合は400エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('userIdフィールドが存在しない場合は400エラーを返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          input: {
            title: 'テスト',
          },
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('ルーティング', () => {
    it('typeに応じて適切なサービスメソッドを呼び出す - subgoal', async () => {
      const mockSubGoals = [
        {
          title: 'サブ目標1',
          description: '説明1',
          background: '背景1',
          position: 0,
        },
      ];

      const generateSubGoalsSpy = jest
        .spyOn(BedrockService.prototype, 'generateSubGoals')
        .mockResolvedValue(mockSubGoals);

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      await handler(event as APIGatewayProxyEvent);

      expect(generateSubGoalsSpy).toHaveBeenCalledTimes(1);
      expect(generateSubGoalsSpy).toHaveBeenCalledWith({
        title: 'テスト目標',
        description: '目標の説明',
        deadline: '2025-12-31',
        background: '背景情報',
      });
    });

    it('typeに応じて適切なサービスメソッドを呼び出す - action', async () => {
      const mockActions = [
        {
          title: 'アクション1',
          description: '説明1',
          type: 'execution' as const,
          background: '背景1',
          position: 0,
        },
      ];

      const generateActionsSpy = jest
        .spyOn(BedrockService.prototype, 'generateActions')
        .mockResolvedValue(mockActions);

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'action',
          input: {
            goalTitle: 'テスト目標',
            goalDescription: '目標の説明',
            subGoalTitle: 'サブ目標',
            subGoalDescription: 'サブ目標の説明',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      await handler(event as APIGatewayProxyEvent);

      expect(generateActionsSpy).toHaveBeenCalledTimes(1);
      expect(generateActionsSpy).toHaveBeenCalledWith({
        goalTitle: 'テスト目標',
        goalDescription: '目標の説明',
        subGoalTitle: 'サブ目標',
        subGoalDescription: 'サブ目標の説明',
        background: '背景情報',
      });
    });

    it('typeに応じて適切なサービスメソッドを呼び出す - task', async () => {
      const mockTasks = [
        {
          title: 'タスク1',
          description: '説明1',
          type: 'execution' as const,
          estimatedMinutes: 30,
        },
      ];

      const generateTasksSpy = jest
        .spyOn(BedrockService.prototype, 'generateTasks')
        .mockResolvedValue(mockTasks);

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'task',
          input: {
            actionTitle: 'アクション',
            actionDescription: 'アクションの説明',
            actionType: 'execution',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      await handler(event as APIGatewayProxyEvent);

      expect(generateTasksSpy).toHaveBeenCalledTimes(1);
      expect(generateTasksSpy).toHaveBeenCalledWith({
        actionTitle: 'アクション',
        actionDescription: 'アクションの説明',
        actionType: 'execution',
        background: '背景情報',
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('サービスエラーが発生した場合は500エラーを返す', async () => {
      jest
        .spyOn(BedrockService.prototype, 'generateSubGoals')
        .mockRejectedValue(new Error('Service error'));

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });

  describe('レスポンス形式', () => {
    it('成功時は正しいレスポンス形式を返す', async () => {
      const mockSubGoals = [
        {
          title: 'サブ目標1',
          description: '説明1',
          background: '背景1',
          position: 0,
        },
      ];

      jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockResolvedValue(mockSubGoals);

      const event: Partial<APIGatewayProxyEvent> = {
        body: JSON.stringify({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-123',
        }),
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('headers');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
    });

    it('エラー時は正しいレスポンス形式を返す', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        body: null,
        headers: { 'x-user-id': 'test-user-123' },
        requestContext: {
          requestId: 'test-request-id',
        } as any,
      };

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('body');
      expect(result).toHaveProperty('headers');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('retryable');
    });
  });
});
