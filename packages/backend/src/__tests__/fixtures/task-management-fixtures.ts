import fc from 'fast-check';
import {
  Task,
  TaskNote,
  TaskHistory,
  SavedView,
  TaskStatus,
  TaskType,
  TaskFilters,
  DeadlineRange,
} from '@goal-mandala/shared';

// ファクトリー関数

/**
 * タスクのファクトリー関数
 */
export function createMockTask(overrides?: Partial<Task>): Task {
  const now = new Date();
  return {
    id: `task-${Math.random().toString(36).substring(7)}`,
    actionId: `action-${Math.random().toString(36).substring(7)}`,
    title: 'テストタスク',
    description: 'テストタスクの説明',
    type: TaskType.EXECUTION,
    status: TaskStatus.NOT_STARTED,
    estimatedMinutes: 30,
    deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7日後
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * タスクノートのファクトリー関数
 */
export function createMockTaskNote(overrides?: Partial<TaskNote>): TaskNote {
  const now = new Date();
  return {
    id: `note-${Math.random().toString(36).substring(7)}`,
    taskId: `task-${Math.random().toString(36).substring(7)}`,
    userId: `user-${Math.random().toString(36).substring(7)}`,
    content: 'テストノートの内容',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * タスク履歴のファクトリー関数
 */
export function createMockTaskHistory(overrides?: Partial<TaskHistory>): TaskHistory {
  return {
    id: `history-${Math.random().toString(36).substring(7)}`,
    taskId: `task-${Math.random().toString(36).substring(7)}`,
    userId: `user-${Math.random().toString(36).substring(7)}`,
    oldStatus: TaskStatus.NOT_STARTED,
    newStatus: TaskStatus.IN_PROGRESS,
    changedAt: new Date(),
    ...overrides,
  };
}

/**
 * 保存済みビューのファクトリー関数
 */
export function createMockSavedView(overrides?: Partial<SavedView>): SavedView {
  const now = new Date();
  return {
    id: `view-${Math.random().toString(36).substring(7)}`,
    userId: `user-${Math.random().toString(36).substring(7)}`,
    name: 'テストビュー',
    filters: {
      statuses: [TaskStatus.NOT_STARTED],
    },
    searchQuery: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * タスクフィルターのファクトリー関数
 */
export function createMockTaskFilters(overrides?: Partial<TaskFilters>): TaskFilters {
  return {
    statuses: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
    deadlineRange: 'today' as DeadlineRange,
    actionIds: [],
    ...overrides,
  };
}

// fast-check Arbitrary定義

/**
 * TaskStatus用のArbitrary
 */
export const taskStatusArbitrary = fc.constantFrom(
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
  TaskStatus.SKIPPED
);

/**
 * TaskType用のArbitrary
 */
export const taskTypeArbitrary = fc.constantFrom(TaskType.EXECUTION, TaskType.HABIT);

/**
 * DeadlineRange用のArbitrary
 */
export const deadlineRangeArbitrary = fc.constantFrom<DeadlineRange>(
  'today',
  'this_week',
  'overdue',
  'custom'
);

/**
 * Task用のArbitrary
 */
export const taskArbitrary: fc.Arbitrary<Task> = fc.record({
  id: fc.uuid(),
  actionId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 255 }),
  description: fc.option(fc.string({ maxLength: 1000 })),
  type: taskTypeArbitrary,
  status: taskStatusArbitrary,
  estimatedMinutes: fc.integer({ min: 5, max: 480 }), // 5分〜8時間
  deadline: fc.option(
    fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })
  ),
  completedAt: fc.option(fc.date()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * TaskNote用のArbitrary
 */
export const taskNoteArbitrary: fc.Arbitrary<TaskNote> = fc.record({
  id: fc.uuid(),
  taskId: fc.uuid(),
  userId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 5000 }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * TaskHistory用のArbitrary
 */
export const taskHistoryArbitrary: fc.Arbitrary<TaskHistory> = fc.record({
  id: fc.uuid(),
  taskId: fc.uuid(),
  userId: fc.uuid(),
  oldStatus: taskStatusArbitrary,
  newStatus: taskStatusArbitrary,
  changedAt: fc.date(),
});

/**
 * TaskFilters用のArbitrary
 */
export const taskFiltersArbitrary: fc.Arbitrary<TaskFilters> = fc.record({
  statuses: fc.option(fc.array(taskStatusArbitrary, { minLength: 1, maxLength: 4 })),
  deadlineRange: fc.option(deadlineRangeArbitrary),
  customDeadlineRange: fc.option(
    fc.record({
      start: fc.date(),
      end: fc.date(),
    })
  ),
  actionIds: fc.option(fc.array(fc.uuid(), { maxLength: 10 })),
});

/**
 * SavedView用のArbitrary
 */
export const savedViewArbitrary: fc.Arbitrary<SavedView> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 255 }),
  filters: taskFiltersArbitrary,
  searchQuery: fc.option(fc.string({ maxLength: 255 })),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// テストデータセット

/**
 * 複数のタスクを生成するヘルパー関数
 */
export function createMockTasks(count: number, overrides?: Partial<Task>): Task[] {
  return Array.from({ length: count }, () => createMockTask(overrides));
}

/**
 * 複数のタスクノートを生成するヘルパー関数
 */
export function createMockTaskNotes(count: number, taskId: string): TaskNote[] {
  return Array.from({ length: count }, () => createMockTaskNote({ taskId }));
}

/**
 * 複数のタスク履歴を生成するヘルパー関数
 */
export function createMockTaskHistories(count: number, taskId: string): TaskHistory[] {
  return Array.from({ length: count }, (_, index) => {
    const statuses = [
      TaskStatus.NOT_STARTED,
      TaskStatus.IN_PROGRESS,
      TaskStatus.COMPLETED,
      TaskStatus.SKIPPED,
    ];
    return createMockTaskHistory({
      taskId,
      oldStatus: statuses[index % statuses.length],
      newStatus: statuses[(index + 1) % statuses.length],
    });
  });
}
