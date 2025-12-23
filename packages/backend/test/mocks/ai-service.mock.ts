/**
 * AI Service Mock for Local Testing
 *
 * このモックは、Amazon Bedrockの代わりにローカルテスト用のAIレスポンスを提供します。
 * Requirements: 11.2 - AI APIモック
 */

export interface MockTaskGenerationInput {
  actionId: string;
  actionTitle: string;
  actionDescription: string;
  goalContext: {
    title: string;
    description: string;
    deadline: string;
  };
}

export interface MockTaskGenerationOutput {
  actionId: string;
  tasks: Array<{
    title: string;
    description: string;
    type: 'execution' | 'habit';
    estimatedMinutes: number;
  }>;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * タスク生成のモック実装
 */
export class MockAIService {
  private failureRate: number;
  private latencyMs: number;

  constructor(options: { failureRate?: number; latencyMs?: number } = {}) {
    this.failureRate = options.failureRate ?? 0;
    this.latencyMs = options.latencyMs ?? 100;
  }

  /**
   * タスク生成をシミュレート
   */
  async generateTasks(input: MockTaskGenerationInput): Promise<MockTaskGenerationOutput> {
    // レイテンシをシミュレート
    await this.delay(this.latencyMs);

    // ランダムに失敗をシミュレート
    if (Math.random() < this.failureRate) {
      return {
        actionId: input.actionId,
        tasks: [],
        status: 'failed',
        error: 'AI service temporarily unavailable',
      };
    }

    // 成功レスポンスを生成
    const tasks = this.generateMockTasks(input);

    return {
      actionId: input.actionId,
      tasks,
      status: 'success',
    };
  }

  /**
   * モックタスクを生成
   */
  private generateMockTasks(input: MockTaskGenerationInput) {
    const taskCount = Math.floor(Math.random() * 5) + 3; // 3-7個のタスク
    const tasks = [];

    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        title: `${input.actionTitle} - タスク ${i + 1}`,
        description: `${input.actionDescription}を実現するための具体的なタスク ${i + 1}`,
        type: (i % 3 === 0 ? 'habit' : 'execution') as 'execution' | 'habit',
        estimatedMinutes: Math.floor(Math.random() * 60) + 15, // 15-75分
      });
    }

    return tasks;
  }

  /**
   * 遅延をシミュレート
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 失敗率を設定
   */
  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * レイテンシを設定
   */
  setLatency(ms: number): void {
    this.latencyMs = Math.max(0, ms);
  }
}

/**
 * デフォルトのモックインスタンス
 */
export const mockAIService = new MockAIService();

/**
 * テストシナリオ別のモックファクトリー
 */
export const createMockAIService = {
  /**
   * 正常系: 全て成功
   */
  happyPath: () => new MockAIService({ failureRate: 0, latencyMs: 100 }),

  /**
   * 部分失敗: 30%の確率で失敗
   */
  partialFailure: () => new MockAIService({ failureRate: 0.3, latencyMs: 100 }),

  /**
   * 高レイテンシ: 2秒の遅延
   */
  highLatency: () => new MockAIService({ failureRate: 0, latencyMs: 2000 }),

  /**
   * 完全失敗: 全て失敗
   */
  completeFailure: () => new MockAIService({ failureRate: 1, latencyMs: 100 }),
};
