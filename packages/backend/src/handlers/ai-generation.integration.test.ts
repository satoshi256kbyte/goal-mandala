/**
 * AI生成Lambda Handler 統合テスト
 *
 * このテストは、実際のBedrockサービスとの統合をテストします。
 * 環境変数 ENABLE_BEDROCK_INTEGRATION_TEST=true を設定すると、
 * 実際のBedrock APIを呼び出します。
 */

import { describe, it, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from './ai-generation.js';
import { BedrockService } from '../services/bedrock.service.js';

// 統合テストの実行フラグ
const ENABLE_INTEGRATION_TEST = process.env.ENABLE_BEDROCK_INTEGRATION_TEST === 'true';

// 統合テストをスキップする条件付きdescribe
const describeIntegration = ENABLE_INTEGRATION_TEST ? describe : describe.skip;

// テスト用のヘルパー関数
function createTestEvent(
  body: unknown,
  userId = 'test-user-integration'
): Partial<APIGatewayProxyEvent> {
  return {
    body: JSON.stringify(body),
    headers: {
      'x-user-id': userId,
      'Content-Type': 'application/json',
    },
    requestContext: {
      requestId: `test-request-${Date.now()}`,
      authorizer: {
        claims: {
          sub: userId,
        },
      },
    } as any,
  };
}

describe('AI Generation Handler - Integration Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    // テスト環境を設定
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // 環境変数を元に戻す
    process.env.NODE_ENV = originalEnv;
  });

  describe('モック統合テスト（常に実行）', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('サブ目標生成のエンドツーエンドフロー', () => {
      it('目標入力からサブ目標生成まで正常に処理できる', async () => {
        // 現実的なモックデータ（8個のサブ目標）
        const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
          title: `サブ目標${i + 1}`,
          description: `サブ目標${i + 1}の詳細説明。この目標を達成することで、全体の目標に近づきます。`,
          background: `このサブ目標が必要な理由は、全体目標の達成に不可欠な要素だからです。`,
          position: i,
        }));

        jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockResolvedValue(mockSubGoals);

        const event = createTestEvent({
          type: 'subgoal',
          input: {
            title: 'TypeScriptのエキスパートになる',
            description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
            deadline: '2025-12-31',
            background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
            constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        // ステータスコードの検証
        expect(result.statusCode).toBe(200);

        // レスポンスボディの検証
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data).toHaveLength(8);

        // 各サブ目標の構造検証
        body.data.forEach((subGoal: any, index: number) => {
          expect(subGoal).toHaveProperty('title');
          expect(subGoal).toHaveProperty('description');
          expect(subGoal).toHaveProperty('background');
          expect(subGoal).toHaveProperty('position', index);
          expect(typeof subGoal.title).toBe('string');
          expect(typeof subGoal.description).toBe('string');
          expect(typeof subGoal.background).toBe('string');
        });
      });

      it('制約事項がない場合でも正常に処理できる', async () => {
        const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
          title: `サブ目標${i + 1}`,
          description: `説明${i + 1}`,
          background: `背景${i + 1}`,
          position: i,
        }));

        jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockResolvedValue(mockSubGoals);

        const event = createTestEvent({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(8);
      });
    });

    describe('アクション生成のエンドツーエンドフロー', () => {
      it('サブ目標入力からアクション生成まで正常に処理できる', async () => {
        // 現実的なモックデータ（8個のアクション）
        const mockActions = Array.from({ length: 8 }, (_, i) => ({
          title: `アクション${i + 1}`,
          description: `アクション${i + 1}の詳細説明。このアクションを実行することで、サブ目標に近づきます。`,
          type: i % 2 === 0 ? ('execution' as const) : ('habit' as const),
          background: `このアクションが必要な理由は、サブ目標の達成に不可欠だからです。`,
          position: i,
        }));

        jest.spyOn(BedrockService.prototype, 'generateActions').mockResolvedValue(mockActions);

        const event = createTestEvent({
          type: 'action',
          input: {
            goalTitle: 'TypeScriptのエキスパートになる',
            goalDescription: '6ヶ月でTypeScriptの高度な機能を習得する',
            subGoalTitle: '型システムを完全に理解する',
            subGoalDescription: 'TypeScriptの型システムの全機能を理解し、活用できるようになる',
            background: '型安全性を高めるために必要',
            constraints: '平日2時間の学習時間',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        // ステータスコードの検証
        expect(result.statusCode).toBe(200);

        // レスポンスボディの検証
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data).toHaveLength(8);

        // 各アクションの構造検証
        body.data.forEach((action: any, index: number) => {
          expect(action).toHaveProperty('title');
          expect(action).toHaveProperty('description');
          expect(action).toHaveProperty('type');
          expect(action).toHaveProperty('background');
          expect(action).toHaveProperty('position', index);
          expect(['execution', 'habit']).toContain(action.type);
        });
      });
    });

    describe('タスク生成のエンドツーエンドフロー', () => {
      it('アクション入力からタスク生成まで正常に処理できる', async () => {
        // 現実的なモックデータ（3-10個のタスク）
        const mockTasks = Array.from({ length: 5 }, (_, i) => ({
          title: `タスク${i + 1}`,
          description: `タスク${i + 1}の詳細説明。このタスクを完了することで、アクションが進みます。`,
          type: 'execution' as const,
          estimatedMinutes: 30 + i * 15,
        }));

        jest.spyOn(BedrockService.prototype, 'generateTasks').mockResolvedValue(mockTasks);

        const event = createTestEvent({
          type: 'task',
          input: {
            actionTitle: 'TypeScriptの公式ドキュメントを読む',
            actionDescription: 'TypeScriptの公式ドキュメントを通読し、理解を深める',
            actionType: 'execution',
            background: '基礎知識の習得に必要',
            constraints: '1日2時間まで',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        // ステータスコードの検証
        expect(result.statusCode).toBe(200);

        // レスポンスボディの検証
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThanOrEqual(3);
        expect(body.data.length).toBeLessThanOrEqual(10);

        // 各タスクの構造検証
        body.data.forEach((task: any) => {
          expect(task).toHaveProperty('title');
          expect(task).toHaveProperty('description');
          expect(task).toHaveProperty('type');
          expect(task).toHaveProperty('estimatedMinutes');
          expect(['execution', 'habit']).toContain(task.type);
          expect(typeof task.estimatedMinutes).toBe('number');
          expect(task.estimatedMinutes).toBeGreaterThan(0);
        });
      });

      it('習慣アクションの場合は少数のタスクを生成する', async () => {
        const mockTasks = Array.from({ length: 2 }, (_, i) => ({
          title: `習慣タスク${i + 1}`,
          description: `習慣タスク${i + 1}の説明`,
          type: 'habit' as const,
          estimatedMinutes: 30,
        }));

        jest.spyOn(BedrockService.prototype, 'generateTasks').mockResolvedValue(mockTasks);

        const event = createTestEvent({
          type: 'task',
          input: {
            actionTitle: '毎日TypeScriptのコードを書く',
            actionDescription: '毎日30分以上TypeScriptのコードを書いて練習する',
            actionType: 'habit',
            background: '継続的な練習が必要',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(true);
        expect(body.data.length).toBeGreaterThanOrEqual(1);
        expect(body.data.length).toBeLessThanOrEqual(3);
      });
    });

    describe('エラーシナリオの統合テスト', () => {
      it('Bedrockサービスがスロットリングエラーを返した場合、適切にハンドリングする', async () => {
        const throttlingError = new Error('ThrottlingException');
        throttlingError.name = 'ThrottlingException';

        jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockRejectedValue(throttlingError);

        const event = createTestEvent({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
        expect(body.error.retryable).toBe(true);
      });

      it('Bedrockサービスがタイムアウトした場合、適切にハンドリングする', async () => {
        const timeoutError = new Error('TimeoutError');
        timeoutError.name = 'TimeoutError';

        jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockRejectedValue(timeoutError);

        const event = createTestEvent({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
        expect(body.error.retryable).toBe(true);
      });

      it('不正なレスポンス形式の場合、適切にハンドリングする', async () => {
        const parseError = new Error('Invalid response format');
        parseError.name = 'ParseError';

        jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockRejectedValue(parseError);

        const event = createTestEvent({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-integration',
        });

        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

        expect(result.statusCode).toBe(500);
        const body = JSON.parse(result.body);
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
      });
    });

    describe('パフォーマンステスト', () => {
      it('サブ目標生成が30秒以内に完了する', async () => {
        const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
          title: `サブ目標${i + 1}`,
          description: `説明${i + 1}`,
          background: `背景${i + 1}`,
          position: i,
        }));

        jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockResolvedValue(mockSubGoals);

        const event = createTestEvent({
          type: 'subgoal',
          input: {
            title: 'テスト目標',
            description: '目標の説明',
            deadline: '2025-12-31',
            background: '背景情報',
          },
          userId: 'test-user-integration',
        });

        const startTime = Date.now();
        const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(result.statusCode).toBe(200);
        expect(duration).toBeLessThan(30000); // 30秒以内
      }, 35000); // テストタイムアウトを35秒に設定

      it('複数のリクエストを連続して処理できる', async () => {
        const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
          title: `サブ目標${i + 1}`,
          description: `説明${i + 1}`,
          background: `背景${i + 1}`,
          position: i,
        }));

        jest.spyOn(BedrockService.prototype, 'generateSubGoals').mockResolvedValue(mockSubGoals);

        const requests = Array.from({ length: 3 }, (_, i) =>
          createTestEvent({
            type: 'subgoal',
            input: {
              title: `テスト目標${i + 1}`,
              description: '目標の説明',
              deadline: '2025-12-31',
              background: '背景情報',
            },
            userId: 'test-user-integration',
          })
        );

        const results = await Promise.all(
          requests.map(event => handler(event as APIGatewayProxyEvent))
        );

        results.forEach(result => {
          expect(result.statusCode).toBe(200);
          const body = JSON.parse(result.body);
          expect(body.success).toBe(true);
        });
      });
    });
  });

  describeIntegration('実際のBedrock API統合テスト（オプション）', () => {
    // 注意: これらのテストは実際のBedrock APIを呼び出すため、
    // ENABLE_BEDROCK_INTEGRATION_TEST=true を設定した場合のみ実行されます。
    // また、AWS認証情報が必要です。

    it('実際のBedrock APIでサブ目標を生成できる', async () => {
      const event = createTestEvent({
        type: 'subgoal',
        input: {
          title: 'TypeScriptのエキスパートになる',
          description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
          deadline: '2025-12-31',
          background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
          constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
        },
        userId: 'test-user-integration',
      });

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(8);

      // 生成されたサブ目標の品質チェック
      body.data.forEach((subGoal: any) => {
        expect(subGoal.title.length).toBeGreaterThan(0);
        expect(subGoal.title.length).toBeLessThanOrEqual(30);
        expect(subGoal.description.length).toBeGreaterThan(0);
        expect(subGoal.description.length).toBeLessThanOrEqual(200);
        expect(subGoal.background.length).toBeGreaterThan(0);
        expect(subGoal.background.length).toBeLessThanOrEqual(100);
      });
    }, 60000); // 実際のAPI呼び出しは時間がかかるため、タイムアウトを60秒に設定

    it('実際のBedrock APIでアクションを生成できる', async () => {
      const event = createTestEvent({
        type: 'action',
        input: {
          goalTitle: 'TypeScriptのエキスパートになる',
          goalDescription: '6ヶ月でTypeScriptの高度な機能を習得する',
          subGoalTitle: '型システムを完全に理解する',
          subGoalDescription: 'TypeScriptの型システムの全機能を理解し、活用できるようになる',
          background: '型安全性を高めるために必要',
        },
        userId: 'test-user-integration',
      });

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(8);

      // 生成されたアクションの品質チェック
      body.data.forEach((action: any) => {
        expect(action.title.length).toBeGreaterThan(0);
        expect(action.title.length).toBeLessThanOrEqual(30);
        expect(['execution', 'habit']).toContain(action.type);
      });
    }, 60000);

    it('実際のBedrock APIでタスクを生成できる', async () => {
      const event = createTestEvent({
        type: 'task',
        input: {
          actionTitle: 'TypeScriptの公式ドキュメントを読む',
          actionDescription: 'TypeScriptの公式ドキュメントを通読し、理解を深める',
          actionType: 'execution',
          background: '基礎知識の習得に必要',
        },
        userId: 'test-user-integration',
      });

      const result = (await handler(event as APIGatewayProxyEvent)) as APIGatewayProxyResult;

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(3);
      expect(body.data.length).toBeLessThanOrEqual(10);

      // 生成されたタスクの品質チェック
      body.data.forEach((task: any) => {
        expect(task.title.length).toBeGreaterThan(0);
        expect(task.estimatedMinutes).toBeGreaterThanOrEqual(30);
        expect(task.estimatedMinutes).toBeLessThanOrEqual(60);
      });
    }, 60000);
  });
});
