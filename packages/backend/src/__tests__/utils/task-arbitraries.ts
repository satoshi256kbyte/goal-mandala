import * as fc from 'fast-check';
import { TaskStatus, TaskType } from '../../generated/prisma-client';

/**
 * タスク状態のArbitrary
 */
export const taskStatusArbitrary = fc.constantFrom(
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.COMPLETED,
  TaskStatus.SKIPPED
);

/**
 * タスクタイプのArbitrary
 */
export const taskTypeArbitrary = fc.constantFrom(TaskType.EXECUTION, TaskType.HABIT);

/**
 * タスクのArbitrary
 */
export const taskArbitrary = fc.record({
  id: fc.uuid(),
  actionId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 255 }),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  type: taskTypeArbitrary,
  status: taskStatusArbitrary,
  estimatedMinutes: fc.integer({ min: 1, max: 480 }),
  deadline: fc.option(fc.date(), { nil: undefined }),
  completedAt: fc.option(fc.date(), { nil: undefined }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * タスクノートのArbitrary
 */
export const taskNoteArbitrary = fc.record({
  id: fc.uuid(),
  taskId: fc.uuid(),
  userId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 5000 }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * タスク履歴のArbitrary
 */
export const taskHistoryArbitrary = fc.record({
  id: fc.uuid(),
  taskId: fc.uuid(),
  userId: fc.uuid(),
  oldStatus: taskStatusArbitrary,
  newStatus: taskStatusArbitrary,
  changedAt: fc.date(),
});

/**
 * タスクフィルターのArbitrary
 */
export const taskFiltersArbitrary = fc.record({
  statuses: fc.option(fc.array(taskStatusArbitrary, { minLength: 1, maxLength: 4 }), {
    nil: undefined,
  }),
  deadlineRange: fc.option(fc.constantFrom('today', 'this_week', 'overdue', 'custom'), {
    nil: undefined,
  }),
  actionIds: fc.option(fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }), { nil: undefined }),
});

/**
 * 保存済みビューのArbitrary
 */
export const savedViewArbitrary = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 255 }),
  filters: fc.jsonValue(),
  searchQuery: fc.option(fc.string({ maxLength: 255 }), { nil: undefined }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});
