import {
  Task,
  TaskNote,
  TaskHistory,
  SavedView,
  TaskStatus,
  TaskType,
  TaskFilters,
} from '../types';

/**
 * タスク生成用のファクトリー関数
 */
export const generateMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random().toString(36).substr(2, 9)}`,
  actionId: `action-${Math.random().toString(36).substr(2, 9)}`,
  title: 'サンプルタスク',
  description: 'タスクの説明',
  type: TaskType.EXECUTION,
  status: TaskStatus.NOT_STARTED,
  estimatedMinutes: 30,
  deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * タスクノート生成用のファクトリー関数
 */
export const generateMockTaskNote = (overrides: Partial<TaskNote> = {}): TaskNote => ({
  id: `note-${Math.random().toString(36).substr(2, 9)}`,
  taskId: `task-${Math.random().toString(36).substr(2, 9)}`,
  content: 'サンプルノート',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: `user-${Math.random().toString(36).substr(2, 9)}`,
  ...overrides,
});

/**
 * タスク履歴生成用のファクトリー関数
 */
export const generateMockTaskHistory = (overrides: Partial<TaskHistory> = {}): TaskHistory => ({
  id: `history-${Math.random().toString(36).substr(2, 9)}`,
  taskId: `task-${Math.random().toString(36).substr(2, 9)}`,
  oldStatus: TaskStatus.NOT_STARTED,
  newStatus: TaskStatus.IN_PROGRESS,
  changedAt: new Date(),
  userId: `user-${Math.random().toString(36).substr(2, 9)}`,
  ...overrides,
});

/**
 * 保存済みビュー生成用のファクトリー関数
 */
export const generateMockSavedView = (overrides: Partial<SavedView> = {}): SavedView => ({
  id: `view-${Math.random().toString(36).substr(2, 9)}`,
  userId: `user-${Math.random().toString(36).substr(2, 9)}`,
  name: 'サンプルビュー',
  filters: {},
  searchQuery: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * タスクフィルター生成用のファクトリー関数
 */
export const generateMockTaskFilters = (overrides: Partial<TaskFilters> = {}): TaskFilters => ({
  statuses: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
  deadlineRange: 'today',
  actionIds: [`action-${Math.random().toString(36).substr(2, 9)}`],
  ...overrides,
});
