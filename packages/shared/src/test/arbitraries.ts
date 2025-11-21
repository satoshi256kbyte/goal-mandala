import fc from 'fast-check';
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
 * TaskType用のArbitrary
 */
export const taskTypeArbitrary = fc.constantFrom(TaskType.EXECUTION, TaskType.HABIT);

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
 * Task用のArbitrary
 */
export const taskArbitrary: fc.Arbitrary<Task> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  actionId: fc.string({ minLength: 1, maxLength: 50 }),
  title: fc.string({ minLength: 1, maxLength: 255 }),
  description: fc.option(fc.string({ maxLength: 1000 })),
  type: taskTypeArbitrary,
  status: taskStatusArbitrary,
  estimatedMinutes: fc.integer({ min: 1, max: 480 }), // 1分〜8時間
  deadline: fc.option(fc.date()),
  completedAt: fc.option(fc.date()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

/**
 * TaskNote用のArbitrary
 */
export const taskNoteArbitrary: fc.Arbitrary<TaskNote> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  taskId: fc.string({ minLength: 1, maxLength: 50 }),
  content: fc.string({ minLength: 1, maxLength: 5000 }),
  createdAt: fc.date(),
  updatedAt: fc.date(),
  userId: fc.string({ minLength: 1, maxLength: 50 }),
});

/**
 * TaskHistory用のArbitrary
 */
export const taskHistoryArbitrary: fc.Arbitrary<TaskHistory> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  taskId: fc.string({ minLength: 1, maxLength: 50 }),
  oldStatus: taskStatusArbitrary,
  newStatus: taskStatusArbitrary,
  changedAt: fc.date(),
  userId: fc.string({ minLength: 1, maxLength: 50 }),
});

/**
 * TaskFilters用のArbitrary
 */
export const taskFiltersArbitrary: fc.Arbitrary<TaskFilters> = fc.record({
  statuses: fc.option(fc.array(taskStatusArbitrary, { minLength: 1, maxLength: 4 })),
  deadlineRange: fc.option(fc.constantFrom('today', 'this_week', 'overdue', 'custom')),
  actionIds: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 })
  ),
});

/**
 * SavedView用のArbitrary
 */
export const savedViewArbitrary: fc.Arbitrary<SavedView> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  userId: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 255 }),
  filters: taskFiltersArbitrary,
  searchQuery: fc.option(fc.string({ maxLength: 255 })),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});
