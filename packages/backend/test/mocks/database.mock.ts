/**
 * Database Mock for Local Testing
 *
 * このモックは、DynamoDBとPostgreSQLの代わりにインメモリデータベースを提供します。
 * Requirements: 11.2 - データベースモック
 */

export interface MockWorkflowExecution {
  executionArn: string;
  goalId: string;
  userId: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  startDate: string;
  stopDate?: string;
  input: {
    goalId: string;
    actionIds: string[];
  };
  output?: {
    successCount: number;
    failedCount: number;
    failedActions: string[];
  };
  progressPercentage: number;
  processedActions: number;
  totalActions: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface MockTask {
  id: string;
  actionId: string;
  title: string;
  description?: string;
  type: 'execution' | 'habit';
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  estimatedMinutes: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'draft' | 'processing' | 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * インメモリデータベースモック
 */
export class MockDatabase {
  private workflowExecutions: Map<string, MockWorkflowExecution> = new Map();
  private tasks: Map<string, MockTask> = new Map();
  private goals: Map<string, MockGoal> = new Map();

  /**
   * ワークフロー実行を保存
   */
  async saveWorkflowExecution(execution: MockWorkflowExecution): Promise<void> {
    this.workflowExecutions.set(execution.executionArn, execution);
  }

  /**
   * ワークフロー実行を取得
   */
  async getWorkflowExecution(executionArn: string): Promise<MockWorkflowExecution | null> {
    return this.workflowExecutions.get(executionArn) || null;
  }

  /**
   * ワークフロー実行を更新
   */
  async updateWorkflowExecution(
    executionArn: string,
    updates: Partial<MockWorkflowExecution>
  ): Promise<void> {
    const execution = this.workflowExecutions.get(executionArn);
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionArn}`);
    }

    this.workflowExecutions.set(executionArn, {
      ...execution,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * タスクを保存
   */
  async saveTasks(tasks: MockTask[]): Promise<void> {
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
  }

  /**
   * タスクを取得
   */
  async getTask(taskId: string): Promise<MockTask | null> {
    return this.tasks.get(taskId) || null;
  }

  /**
   * アクションIDでタスクを取得
   */
  async getTasksByActionId(actionId: string): Promise<MockTask[]> {
    return Array.from(this.tasks.values()).filter(task => task.actionId === actionId);
  }

  /**
   * 目標を保存
   */
  async saveGoal(goal: MockGoal): Promise<void> {
    this.goals.set(goal.id, goal);
  }

  /**
   * 目標を取得
   */
  async getGoal(goalId: string): Promise<MockGoal | null> {
    return this.goals.get(goalId) || null;
  }

  /**
   * 目標のステータスを更新
   */
  async updateGoalStatus(goalId: string, status: MockGoal['status']): Promise<void> {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    this.goals.set(goalId, {
      ...goal,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * 目標の進捗を更新
   */
  async updateGoalProgress(goalId: string, progress: number): Promise<void> {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    this.goals.set(goalId, {
      ...goal,
      progress,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * データベースをクリア
   */
  clear(): void {
    this.workflowExecutions.clear();
    this.tasks.clear();
    this.goals.clear();
  }

  /**
   * 統計情報を取得
   */
  getStats() {
    return {
      workflowExecutions: this.workflowExecutions.size,
      tasks: this.tasks.size,
      goals: this.goals.size,
    };
  }
}

/**
 * デフォルトのモックインスタンス
 */
export const mockDatabase = new MockDatabase();

/**
 * テストデータファクトリー
 */
export const createMockData = {
  /**
   * モックワークフロー実行を作成
   */
  workflowExecution: (overrides?: Partial<MockWorkflowExecution>): MockWorkflowExecution => {
    const now = new Date().toISOString();
    return {
      executionArn: `arn:aws:states:us-east-1:123456789012:execution:TaskGenerationWorkflow:${Date.now()}`,
      goalId: 'test-goal-id',
      userId: 'test-user-id',
      status: 'RUNNING',
      startDate: now,
      input: {
        goalId: 'test-goal-id',
        actionIds: ['action-1', 'action-2', 'action-3'],
      },
      progressPercentage: 0,
      processedActions: 0,
      totalActions: 3,
      currentBatch: 0,
      totalBatches: 1,
      estimatedTimeRemaining: 300,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * モックタスクを作成
   */
  task: (overrides?: Partial<MockTask>): MockTask => {
    const now = new Date().toISOString();
    return {
      id: `task-${Date.now()}`,
      actionId: 'test-action-id',
      title: 'Test Task',
      description: 'Test task description',
      type: 'execution',
      status: 'not_started',
      estimatedMinutes: 30,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * モック目標を作成
   */
  goal: (overrides?: Partial<MockGoal>): MockGoal => {
    const now = new Date().toISOString();
    return {
      id: `goal-${Date.now()}`,
      userId: 'test-user-id',
      title: 'Test Goal',
      description: 'Test goal description',
      status: 'draft',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },
};
