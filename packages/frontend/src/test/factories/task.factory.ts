/**
 * Task Factory
 * タスクデータのテストファクトリー
 */

export enum TaskType {
  EXECUTION = 'execution',
  HABIT = 'habit',
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export interface Task {
  id: string;
  actionId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  estimatedMinutes: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskFactoryOptions {
  id?: string;
  actionId?: string;
  title?: string;
  description?: string;
  type?: TaskType;
  status?: TaskStatus;
  estimatedMinutes?: number;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * タスクデータを生成
 */
export function createMockTask(overrides?: TaskFactoryOptions): Task {
  const now = new Date();

  return {
    id: overrides?.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    actionId: overrides?.actionId || 'test-action-id',
    title: overrides?.title || 'テストタスク',
    description: overrides?.description || 'これはテスト用のタスクです',
    type: overrides?.type || TaskType.EXECUTION,
    status: overrides?.status || TaskStatus.NOT_STARTED,
    estimatedMinutes: overrides?.estimatedMinutes ?? 30,
    completedAt: overrides?.completedAt,
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

/**
 * 複数のタスクデータを生成
 */
export function createMockTasks(
  actionId: string,
  count: number = 3,
  overrides?: Omit<TaskFactoryOptions, 'actionId'>
): Task[] {
  return Array.from({ length: count }, (_, index) =>
    createMockTask({
      ...overrides,
      actionId,
      title: overrides?.title || `テストタスク ${index + 1}`,
      estimatedMinutes: overrides?.estimatedMinutes ?? 30 + index * 15,
    })
  );
}

/**
 * 実行タスクデータを生成
 */
export function createExecutionTask(overrides?: TaskFactoryOptions): Task {
  return createMockTask({
    ...overrides,
    type: TaskType.EXECUTION,
  });
}

/**
 * 習慣タスクデータを生成
 */
export function createHabitTask(overrides?: TaskFactoryOptions): Task {
  return createMockTask({
    ...overrides,
    type: TaskType.HABIT,
  });
}

/**
 * 未着手タスクデータを生成
 */
export function createNotStartedTask(overrides?: TaskFactoryOptions): Task {
  return createMockTask({
    ...overrides,
    status: TaskStatus.NOT_STARTED,
  });
}

/**
 * 進行中タスクデータを生成
 */
export function createInProgressTask(overrides?: TaskFactoryOptions): Task {
  return createMockTask({
    ...overrides,
    status: TaskStatus.IN_PROGRESS,
  });
}

/**
 * 完了タスクデータを生成
 */
export function createCompletedTask(overrides?: TaskFactoryOptions): Task {
  const now = new Date();

  return createMockTask({
    ...overrides,
    status: TaskStatus.COMPLETED,
    completedAt: overrides?.completedAt || now,
  });
}

/**
 * スキップタスクデータを生成
 */
export function createSkippedTask(overrides?: TaskFactoryOptions): Task {
  return createMockTask({
    ...overrides,
    status: TaskStatus.SKIPPED,
  });
}

/**
 * 今日のタスクデータを生成
 */
export function createTodayTasks(actionId: string, count: number = 3): Task[] {
  const now = new Date();

  return Array.from({ length: count }, (_, index) =>
    createMockTask({
      actionId,
      title: `今日のタスク ${index + 1}`,
      createdAt: now,
      updatedAt: now,
    })
  );
}
