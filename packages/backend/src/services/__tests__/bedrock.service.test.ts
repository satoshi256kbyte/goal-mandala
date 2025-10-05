/**
 * BedrockServiceのテスト
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockService } from '../bedrock.service.js';
import type { GoalInput, SubGoalInput, ActionInput } from '../../types/ai-generation.types.js';

// モック設定
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('../bedrock-client.js', () => ({
  getBedrockClient: jest.fn(() => mockClient),
}));

const mockClient = {
  send: jest.fn(),
};

describe('BedrockService', () => {
  let service: BedrockService;

  beforeEach(() => {
    service = new BedrockService();
    jest.clearAllMocks();
  });

  describe('generateSubGoals', () => {
    const goalInput: GoalInput = {
      title: 'TypeScriptのエキスパートになる',
      description: '6ヶ月でTypeScriptの高度な機能を習得する',
      deadline: '2025-12-31',
      background: 'フロントエンド開発者として型安全性の高いコードを書けるようになりたい',
      constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
    };

    it('目標からサブ目標を生成する', async () => {
      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  subGoals: Array.from({ length: 8 }, (_, i) => ({
                    title: `サブ目標${i + 1}`,
                    description: `説明${i + 1}`,
                    background: `背景${i + 1}`,
                    position: i,
                  })),
                }),
              },
            ],
          },
        },
        stopReason: 'end_turn',
        usage: {
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
        },
      };

      mockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      const result = await service.generateSubGoals(goalInput);

      expect(result).toHaveLength(8);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('background');
      expect(result[0]).toHaveProperty('position');
    });

    it('Bedrockクライアントを正しく呼び出す', async () => {
      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  subGoals: Array.from({ length: 8 }, (_, i) => ({
                    title: `サブ目標${i + 1}`,
                    description: `説明${i + 1}`,
                    background: `背景${i + 1}`,
                    position: i,
                  })),
                }),
              },
            ],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      };

      mockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      await service.generateSubGoals(goalInput);

      expect(mockClient.send).toHaveBeenCalledTimes(1);
      expect(mockClient.send).toHaveBeenCalledWith(expect.any(InvokeModelCommand));
    });
  });

  describe('generateActions', () => {
    const subGoalInput: SubGoalInput = {
      goalTitle: 'TypeScriptのエキスパートになる',
      goalDescription: '6ヶ月でTypeScriptの高度な機能を習得する',
      subGoalTitle: '型システムを理解する',
      subGoalDescription: 'TypeScriptの型システムの基礎から応用まで学ぶ',
      background: '型安全性を高めるため',
      constraints: '実務で使える知識を優先する',
    };

    it('サブ目標からアクションを生成する', async () => {
      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  actions: Array.from({ length: 8 }, (_, i) => ({
                    title: `アクション${i + 1}`,
                    description: `説明${i + 1}`,
                    type: i % 2 === 0 ? 'execution' : 'habit',
                    background: `背景${i + 1}`,
                    position: i,
                  })),
                }),
              },
            ],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      };

      mockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      const result = await service.generateActions(subGoalInput);

      expect(result).toHaveLength(8);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('type');
      expect(['execution', 'habit']).toContain(result[0].type);
    });
  });

  describe('generateTasks', () => {
    const actionInput: ActionInput = {
      actionTitle: 'TypeScript公式ドキュメントを読む',
      actionDescription: '公式ドキュメントの型システムの章を読み込む',
      actionType: 'execution',
      background: '正確な知識を得るため',
      constraints: '1日1時間ずつ進める',
    };

    it('アクションからタスクを生成する', async () => {
      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  tasks: Array.from({ length: 5 }, (_, i) => ({
                    title: `タスク${i + 1}`,
                    description: `説明${i + 1}`,
                    type: 'execution',
                    estimatedMinutes: 30,
                  })),
                }),
              },
            ],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      };

      mockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      const result = await service.generateTasks(actionInput);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('estimatedMinutes');
    });
  });

  describe('エラーハンドリング', () => {
    const goalInput: GoalInput = {
      title: 'Test Goal',
      description: 'Test Description',
      deadline: '2025-12-31',
      background: 'Test Background',
    };

    it('Bedrock APIエラーを適切に処理する', async () => {
      mockClient.send.mockRejectedValue(new Error('API Error'));

      await expect(service.generateSubGoals(goalInput)).rejects.toThrow();
    });

    it('不正なJSONレスポンスを処理する', async () => {
      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [{ text: 'Invalid JSON' }],
          },
        },
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      };

      mockClient.send.mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify(mockResponseBody)),
      });

      await expect(service.generateSubGoals(goalInput)).rejects.toThrow();
    });
  });
});
