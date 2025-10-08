/**
 * テストセットアップの検証
 * テスト環境が正しく設定されていることを確認
 */

import {
  createMockAPIGatewayEvent,
  createMockContext,
  createValidSubGoalRequest,
  generateTestUserId,
  expectErrorResponse,
  expectSuccessResponse,
} from './helpers';
import { validSubGoals, mockGoal, mockUser, ERROR_MESSAGES } from './fixtures';
import { deepClone, randomString, futureDate, expectArrayLength } from './utils';

describe('テストセットアップの検証', () => {
  describe('環境変数', () => {
    it('必要な環境変数が設定されている', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.AWS_REGION).toBeDefined();
      expect(process.env.BEDROCK_MODEL_ID).toBeDefined();
      expect(process.env.FRONTEND_URL).toBeDefined();
    });
  });

  describe('テストヘルパー', () => {
    it('createMockAPIGatewayEvent: モックイベントを作成できる', () => {
      const body = { test: 'data' };
      const userId = 'test-user-123';
      const event = createMockAPIGatewayEvent(body, userId);

      expect(event.body).toBe(JSON.stringify(body));
      expect(event.headers['Content-Type']).toBe('application/json');
      expect(event.headers['x-user-id']).toBe(userId);
      expect(event.httpMethod).toBe('POST');
      expect(event.path).toBe('/api/ai/generate/subgoals');
    });

    it('createMockContext: モックコンテキストを作成できる', () => {
      const context = createMockContext();

      expect(context.functionName).toBe('test-function');
      expect(context.functionVersion).toBe('$LATEST');
      expect(context.memoryLimitInMB).toBe('1024');
      expect(typeof context.getRemainingTimeInMillis).toBe('function');
    });

    it('createValidSubGoalRequest: 有効なリクエストを作成できる', () => {
      const request = createValidSubGoalRequest();

      expect(request.title).toBeDefined();
      expect(request.description).toBeDefined();
      expect(request.deadline).toBeDefined();
      expect(request.background).toBeDefined();
      expect(new Date(request.deadline).getTime()).toBeGreaterThan(Date.now());
    });

    it('generateTestUserId: ユニークなユーザーIDを生成できる', () => {
      const userId1 = generateTestUserId();
      const userId2 = generateTestUserId();

      expect(userId1).toMatch(/^test-user-/);
      expect(userId2).toMatch(/^test-user-/);
      expect(userId1).not.toBe(userId2);
    });

    it('expectErrorResponse: エラーレスポンスを検証できる', () => {
      const response = {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
          },
        }),
      };

      expect(() => {
        expectErrorResponse(response, 400, 'VALIDATION_ERROR');
      }).not.toThrow();
    });

    it('expectSuccessResponse: 成功レスポンスを検証できる', () => {
      const response = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: { test: 'data' },
        }),
      };

      expect(() => {
        expectSuccessResponse(response);
      }).not.toThrow();
    });
  });

  describe('テストフィクスチャ', () => {
    it('validSubGoals: 8個のサブ目標が定義されている', () => {
      expectArrayLength(validSubGoals, 8);
      validSubGoals.forEach((subGoal, index) => {
        expect(subGoal.position).toBe(index);
        expect(subGoal.title).toBeDefined();
        expect(subGoal.description).toBeDefined();
        expect(subGoal.background).toBeDefined();
      });
    });

    it('mockGoal: 目標データが正しく定義されている', () => {
      expect(mockGoal.id).toBeDefined();
      expect(mockGoal.userId).toBeDefined();
      expect(mockGoal.title).toBeDefined();
      expect(mockGoal.description).toBeDefined();
      expect(mockGoal.status).toBe('ACTIVE');
      expect(mockGoal.progress).toBe(0);
    });

    it('mockUser: ユーザーデータが正しく定義されている', () => {
      expect(mockUser.id).toBeDefined();
      expect(mockUser.email).toBeDefined();
      expect(mockUser.name).toBeDefined();
      expect(mockUser.industry).toBeDefined();
      expect(mockUser.jobTitle).toBeDefined();
    });

    it('ERROR_MESSAGES: エラーメッセージが定義されている', () => {
      expect(ERROR_MESSAGES.VALIDATION_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.QUALITY_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.DATABASE_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.AI_SERVICE_ERROR).toBeDefined();
    });
  });

  describe('テストユーティリティ', () => {
    it('deepClone: オブジェクトをディープコピーできる', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('randomString: ランダムな文字列を生成できる', () => {
      const str1 = randomString(10);
      const str2 = randomString(10);

      expect(str1).toHaveLength(10);
      expect(str2).toHaveLength(10);
      expect(str1).not.toBe(str2);
    });

    it('futureDate: 未来の日付を生成できる', () => {
      const future = futureDate(30);
      const now = new Date();

      expect(future.getTime()).toBeGreaterThan(now.getTime());
    });

    it('expectArrayLength: 配列の長さを検証できる', () => {
      const array = [1, 2, 3];

      expect(() => {
        expectArrayLength(array, 3);
      }).not.toThrow();
    });
  });

  describe('モック設定', () => {
    it('Prisma Client: モックが正しく設定されている', () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      expect(prisma.$connect).toBeDefined();
      expect(prisma.$disconnect).toBeDefined();
      expect(prisma.goal).toBeDefined();
      expect(prisma.subGoal).toBeDefined();
    });

    it('Bedrock Runtime Client: モックが正しく設定されている', () => {
      const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
      const client = new BedrockRuntimeClient({});

      expect(client.send).toBeDefined();
    });

    it('CloudWatch Client: モックが正しく設定されている', () => {
      const { CloudWatchClient } = require('@aws-sdk/client-cloudwatch');
      const client = new CloudWatchClient({});

      expect(client.send).toBeDefined();
    });
  });
});
