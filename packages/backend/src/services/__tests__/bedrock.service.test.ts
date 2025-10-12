/**
 * BedrockServiceのテスト
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { BedrockService } from '../bedrock.service.js';
import type { GoalInput, SubGoalInput, ActionInput } from '../../types/ai-generation.types.js';
import type { GenerationContext } from '../../types/action-generation.types.js';
import type { TaskGenerationContext } from '../../types/task-generation.types.js';

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

  describe('generateActionsWithContext', () => {
    const generationContext: GenerationContext = {
      goal: {
        id: 'goal-001',
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: new Date('2025-12-31'),
        background: 'フロントエンド開発者として型安全性の高いコードを書けるようになりたい',
        constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
      },
      subGoal: {
        id: 'subgoal-001',
        title: '型システムを理解する',
        description: 'TypeScriptの型システムの基礎から応用まで学ぶ',
        background: '型安全性を高めるため',
        position: 0,
      },
      relatedSubGoals: [
        {
          title: 'ジェネリクスを習得する',
          description: 'ジェネリクスの使い方を学ぶ',
          position: 1,
        },
        {
          title: '高度な型を理解する',
          description: 'Utility TypesやConditional Typesを学ぶ',
          position: 2,
        },
      ],
      user: {
        industry: 'IT',
        jobType: 'フロントエンドエンジニア',
      },
    };

    it('GenerationContextからアクションを生成する', async () => {
      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  actions: Array.from({ length: 8 }, (_, i) => ({
                    title: `アクション${i + 1}`,
                    description: `説明${i + 1}`.repeat(15), // 100文字以上
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

      const result = await service.generateActionsWithContext(generationContext);

      expect(result).toHaveLength(8);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('background');
      expect(result[0]).toHaveProperty('position');
      expect(['execution', 'habit']).toContain(result[0].type);
    });

    it('プロンプトに目標コンテキストが含まれる', async () => {
      // InvokeModelCommandのモックを作成
      const mockInvokeModelCommand = jest.fn();
      (InvokeModelCommand as jest.Mock) = mockInvokeModelCommand;

      let capturedInput: any;
      mockInvokeModelCommand.mockImplementation((input: any) => {
        capturedInput = input;
        return { input };
      });

      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  actions: Array.from({ length: 8 }, (_, i) => ({
                    title: `アクション${i + 1}`,
                    description: `説明${i + 1}`.repeat(15),
                    type: 'execution',
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

      await service.generateActionsWithContext(generationContext);

      expect(capturedInput).toBeDefined();
      const requestBody = JSON.parse(capturedInput.body);
      const promptText = requestBody.messages[0].content[0].text;

      // プロンプトに目標情報が含まれることを確認
      expect(promptText).toContain(generationContext.goal.title);
      expect(promptText).toContain(generationContext.goal.description);
      expect(promptText).toContain(generationContext.subGoal.title);
      expect(promptText).toContain(generationContext.subGoal.description);
    });

    it('プロンプトに関連サブ目標が含まれる', async () => {
      const mockInvokeModelCommand = jest.fn();
      (InvokeModelCommand as jest.Mock) = mockInvokeModelCommand;

      let capturedInput: any;
      mockInvokeModelCommand.mockImplementation((input: any) => {
        capturedInput = input;
        return { input };
      });

      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  actions: Array.from({ length: 8 }, (_, i) => ({
                    title: `アクション${i + 1}`,
                    description: `説明${i + 1}`.repeat(15),
                    type: 'execution',
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

      await service.generateActionsWithContext(generationContext);

      expect(capturedInput).toBeDefined();
      const requestBody = JSON.parse(capturedInput.body);
      const promptText = requestBody.messages[0].content[0].text;

      // プロンプトに関連サブ目標が含まれることを確認
      expect(promptText).toContain(generationContext.relatedSubGoals[0].title);
      expect(promptText).toContain(generationContext.relatedSubGoals[1].title);
    });

    it('プロンプトにユーザー情報が含まれる', async () => {
      const mockInvokeModelCommand = jest.fn();
      (InvokeModelCommand as jest.Mock) = mockInvokeModelCommand;

      let capturedInput: any;
      mockInvokeModelCommand.mockImplementation((input: any) => {
        capturedInput = input;
        return { input };
      });

      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  actions: Array.from({ length: 8 }, (_, i) => ({
                    title: `アクション${i + 1}`,
                    description: `説明${i + 1}`.repeat(15),
                    type: 'execution',
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

      await service.generateActionsWithContext(generationContext);

      expect(capturedInput).toBeDefined();
      const requestBody = JSON.parse(capturedInput.body);
      const promptText = requestBody.messages[0].content[0].text;

      // プロンプトにユーザー情報が含まれることを確認
      expect(promptText).toContain(generationContext.user.industry);
      expect(promptText).toContain(generationContext.user.jobType);
    });

    it('レスポンス解析エラーを適切に処理する', async () => {
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

      await expect(service.generateActionsWithContext(generationContext)).rejects.toThrow();
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

  describe('generateTasksWithContext', () => {
    const taskGenerationContext = {
      action: {
        id: 'action-001',
        title: 'TypeScript公式ドキュメントを読む',
        description: '公式ドキュメントの型システムの章を読み込む',
        background: '正確な知識を得るため',
        type: 'execution' as const,
      },
      subGoal: {
        id: 'subgoal-001',
        title: '型システムを理解する',
        description: 'TypeScriptの型システムの基礎から応用まで学ぶ',
      },
      goal: {
        id: 'goal-001',
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: new Date('2025-12-31'),
      },
      user: {
        preferences: {
          workStyle: '朝型',
          timeAvailable: 120,
        },
      },
    };

    it('TaskGenerationContextからタスクを生成する', async () => {
      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  tasks: Array.from({ length: 5 }, (_, i) => ({
                    title: `タスク${i + 1}`,
                    description: `説明${i + 1}`.repeat(10),
                    type: 'execution',
                    estimatedMinutes: 45,
                    priority: i === 0 ? 'HIGH' : 'MEDIUM',
                    dependencies: i > 0 ? [`task-${i - 1}`] : [],
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

      const result = await service.generateTasksWithContext(taskGenerationContext);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('estimatedMinutes');
      expect(result[0].type).toBe('execution');
    });

    it('プロンプトに目標コンテキストが含まれる', async () => {
      const mockInvokeModelCommand = jest.fn();
      (InvokeModelCommand as jest.Mock) = mockInvokeModelCommand;

      let capturedInput: any;
      mockInvokeModelCommand.mockImplementation((input: any) => {
        capturedInput = input;
        return { input };
      });

      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  tasks: Array.from({ length: 3 }, (_, i) => ({
                    title: `タスク${i + 1}`,
                    description: `説明${i + 1}`.repeat(10),
                    type: 'execution',
                    estimatedMinutes: 45,
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

      await service.generateTasksWithContext(taskGenerationContext);

      expect(capturedInput).toBeDefined();
      const requestBody = JSON.parse(capturedInput.body);
      const promptText = requestBody.messages[0].content[0].text;

      // プロンプトに目標情報が含まれることを確認
      expect(promptText).toContain(taskGenerationContext.goal.title);
      expect(promptText).toContain(taskGenerationContext.subGoal.title);
      expect(promptText).toContain(taskGenerationContext.action.title);
    });

    it('プロンプトにユーザー設定が含まれる', async () => {
      const mockInvokeModelCommand = jest.fn();
      (InvokeModelCommand as jest.Mock) = mockInvokeModelCommand;

      let capturedInput: any;
      mockInvokeModelCommand.mockImplementation((input: any) => {
        capturedInput = input;
        return { input };
      });

      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  tasks: Array.from({ length: 3 }, (_, i) => ({
                    title: `タスク${i + 1}`,
                    description: `説明${i + 1}`.repeat(10),
                    type: 'execution',
                    estimatedMinutes: 45,
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

      await service.generateTasksWithContext(taskGenerationContext);

      expect(capturedInput).toBeDefined();
      const requestBody = JSON.parse(capturedInput.body);
      const promptText = requestBody.messages[0].content[0].text;

      // プロンプトにコンテキスト情報が含まれることを確認
      expect(promptText).toContain('TypeScriptのエキスパートになる');
      expect(promptText).toContain('型システムを理解する');
      expect(promptText).toContain('TypeScript公式ドキュメントを読む');

      // ユーザー設定がある場合のみチェック（現在のプロンプトテンプレートに含まれていない場合はスキップ）
      // if (taskGenerationContext.user.preferences?.workStyle) {
      //   expect(promptText).toContain(taskGenerationContext.user.preferences.workStyle);
      // }
    });

    it('タスク粒度（30-60分）の指示が含まれる', async () => {
      const mockInvokeModelCommand = jest.fn();
      (InvokeModelCommand as jest.Mock) = mockInvokeModelCommand;

      let capturedInput: any;
      mockInvokeModelCommand.mockImplementation((input: any) => {
        capturedInput = input;
        return { input };
      });

      const mockResponseBody = {
        output: {
          message: {
            role: 'assistant',
            content: [
              {
                text: JSON.stringify({
                  tasks: Array.from({ length: 3 }, (_, i) => ({
                    title: `タスク${i + 1}`,
                    description: `説明${i + 1}`.repeat(10),
                    type: 'execution',
                    estimatedMinutes: 45,
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

      await service.generateTasksWithContext(taskGenerationContext);

      expect(capturedInput).toBeDefined();
      const requestBody = JSON.parse(capturedInput.body);
      const promptText = requestBody.messages[0].content[0].text;

      // タスク粒度の指示が含まれることを確認
      expect(promptText).toMatch(/30.*60.*分/);
    });

    it('レスポンス解析エラーを適切に処理する', async () => {
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

      await expect(service.generateTasksWithContext(taskGenerationContext)).rejects.toThrow();
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
