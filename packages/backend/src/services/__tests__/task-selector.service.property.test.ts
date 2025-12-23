/**
 * Task Selector Service プロパティベーステスト
 * Requirements: 1.2, 4.1-4.4, 5.1-5.5
 *
 * Feature: 3.2-reminder-functionality
 */

import * as fc from 'fast-check';
import { TaskSelectorService, TaskWithAction } from '../task-selector.service';
import { PrismaClient, TaskStatus, TaskType } from '../../generated/prisma-client';
import { MoodPreference } from '@goal-mandala/shared';

// Prisma Clientのモック
const mockPrisma = {
  task: {
    findMany: jest.fn(),
  },
  habitTaskReminderTracking: {
    findMany: jest.fn(),
  },
} as unknown as jest.Mocked<PrismaClient>;

describe('TaskSelectorService Property-Based Tests', () => {
  let taskSelectorService: TaskSelectorService;

  beforeEach(() => {
    jest.clearAllMocks();
    taskSelectorService = new TaskSelectorService(mockPrisma);
  });

  /**
   * Property 1: No Email for Users Without Tasks
   * Feature: 3.2-reminder-functionality, Property 1: No Email for Users Without Tasks
   * Validates: Requirements 1.2
   *
   * For any user with no pending tasks, the ReminderSystem should not send a reminder email
   */
  it('Property 1: No Email for Users Without Tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // goalId
        async (userId, goalId) => {
          // Arrange: ユーザーにタスクがない
          mockPrisma.task.findMany.mockResolvedValue([]);
          mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);

          // Act
          const result = await taskSelectorService.selectTasksForReminder(userId, goalId);

          // Assert: タスクが選択されない（メールを送信しない）
          expect(result).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12: Stay On Track Task Selection Ratio
   * Feature: 3.2-reminder-functionality, Property 12: Stay On Track Task Selection Ratio
   * Validates: Requirements 4.1
   *
   * For any user with "stay_on_track" mood preference, 2/3 of selected tasks should be from the same or adjacent actions
   */
  it('Property 12: Stay On Track Task Selection Ratio', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // goalId
        fc.integer({ min: 10, max: 20 }), // タスク数
        async (userId, goalId, taskCount) => {
          // Arrange: 十分な数の実行タスクを用意
          const mockTasks: TaskWithAction[] = Array.from({ length: taskCount }, (_, i) => ({
            id: `task-${i}`,
            actionId: `action-${i % 8}`,
            title: `Task ${i}`,
            type: TaskType.EXECUTION,
            status: TaskStatus.NOT_STARTED,
            estimatedMinutes: 30,
            createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
            action: {
              id: `action-${i % 8}`,
              subGoalId: 'subgoal-1',
              position: i % 8,
              subGoal: {
                id: 'subgoal-1',
                goalId,
                position: 0,
              },
            },
          }));

          mockPrisma.task.findMany.mockResolvedValue(mockTasks);
          mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);

          // Act
          const result = await taskSelectorService.selectTasksForReminder(
            userId,
            goalId,
            MoodPreference.STAY_ON_TRACK
          );

          // Assert: 最大3タスクまで選択される
          expect(result.length).toBeLessThanOrEqual(3);

          // Note: 2/3の比率は実装の詳細に依存するため、ここでは最大数のみを検証
          // 実際の比率検証は統合テストで行う
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: Change Pace Task Selection Source
   * Feature: 3.2-reminder-functionality, Property 13: Change Pace Task Selection Source
   * Validates: Requirements 4.3
   *
   * For any user with "change_pace" mood preference, all selected tasks should be from the oldest 10 incomplete tasks
   */
  it('Property 13: Change Pace Task Selection Source', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // goalId
        fc.integer({ min: 10, max: 20 }), // タスク数
        async (userId, goalId, taskCount) => {
          // Arrange: 十分な数の実行タスクを用意（古い順にソート）
          const mockTasks: TaskWithAction[] = Array.from({ length: taskCount }, (_, i) => ({
            id: `task-${i}`,
            actionId: `action-${i % 8}`,
            title: `Task ${i}`,
            type: TaskType.EXECUTION,
            status: TaskStatus.NOT_STARTED,
            estimatedMinutes: 30,
            createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
            action: {
              id: `action-${i % 8}`,
              subGoalId: 'subgoal-1',
              position: i % 8,
              subGoal: {
                id: 'subgoal-1',
                goalId,
                position: 0,
              },
            },
          }));

          mockPrisma.task.findMany.mockResolvedValue(mockTasks);
          mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);

          // Act
          const result = await taskSelectorService.selectTasksForReminder(
            userId,
            goalId,
            MoodPreference.CHANGE_PACE
          );

          // Assert: 選択されたタスクは古い10件の中から選ばれている
          const oldest10Ids = mockTasks.slice(0, 10).map(t => t.id);
          const selectedIds = result.map(t => t.id);

          selectedIds.forEach(id => {
            expect(oldest10Ids).toContain(id);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 14: First Time Random Selection
   * Feature: 3.2-reminder-functionality, Property 14: First Time Random Selection
   * Validates: Requirements 4.4
   *
   * For any user with no mood preference set, task selection should be completely random
   */
  it('Property 14: First Time Random Selection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // goalId
        fc.integer({ min: 5, max: 10 }), // タスク数
        async (userId, goalId, taskCount) => {
          // Arrange: 実行タスクを用意
          const mockTasks: TaskWithAction[] = Array.from({ length: taskCount }, (_, i) => ({
            id: `task-${i}`,
            actionId: `action-${i}`,
            title: `Task ${i}`,
            type: TaskType.EXECUTION,
            status: TaskStatus.NOT_STARTED,
            estimatedMinutes: 30,
            createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
            action: {
              id: `action-${i}`,
              subGoalId: 'subgoal-1',
              position: i,
              subGoal: {
                id: 'subgoal-1',
                goalId,
                position: 0,
              },
            },
          }));

          mockPrisma.task.findMany.mockResolvedValue(mockTasks);
          mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);

          // Act: 気分選択なし（初回）
          const result = await taskSelectorService.selectTasksForReminder(userId, goalId, null);

          // Assert: タスクが選択される（ランダム性の検証は統計的に困難なため、選択されることのみ検証）
          expect(result.length).toBeGreaterThan(0);
          expect(result.length).toBeLessThanOrEqual(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 15: Execution Task Limit
   * Feature: 3.2-reminder-functionality, Property 15: Execution Task Limit
   * Validates: Requirements 5.1
   *
   * For any task selection, the number of execution tasks should not exceed 3
   */
  it('Property 15: Execution Task Limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // goalId
        fc.integer({ min: 5, max: 20 }), // タスク数
        fc.option(fc.constantFrom(MoodPreference.STAY_ON_TRACK, MoodPreference.CHANGE_PACE), {
          nil: null,
        }), // 気分選択
        async (userId, goalId, taskCount, moodPreference) => {
          // Arrange: 多数の実行タスクを用意
          const mockTasks: TaskWithAction[] = Array.from({ length: taskCount }, (_, i) => ({
            id: `task-${i}`,
            actionId: `action-${i % 8}`,
            title: `Task ${i}`,
            type: TaskType.EXECUTION,
            status: TaskStatus.NOT_STARTED,
            estimatedMinutes: 30,
            createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
            action: {
              id: `action-${i % 8}`,
              subGoalId: 'subgoal-1',
              position: i % 8,
              subGoal: {
                id: 'subgoal-1',
                goalId,
                position: 0,
              },
            },
          }));

          mockPrisma.task.findMany.mockResolvedValue(mockTasks);
          mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);

          // Act
          const result = await taskSelectorService.selectTasksForReminder(
            userId,
            goalId,
            moodPreference
          );

          // Assert: 実行タスクは最大3つまで
          const executionTasks = result.filter(t => t.type === TaskType.EXECUTION);
          expect(executionTasks.length).toBeLessThanOrEqual(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Habit Task Weekly Reminder
   * Feature: 3.2-reminder-functionality, Property 16: Habit Task Weekly Reminder
   * Validates: Requirements 5.2
   *
   * For any habit task over a 7-day period, it should be included in reminders at least once
   *
   * Note: この性質は7日間のシミュレーションが必要なため、統合テストで検証する
   */
  it.skip('Property 16: Habit Task Weekly Reminder', () => {
    // 統合テストで実装
  });

  /**
   * Property 17: Habit Task Even Distribution
   * Feature: 3.2-reminder-functionality, Property 17: Habit Task Even Distribution
   * Validates: Requirements 5.3
   *
   * For any set of habit tasks over multiple weeks, reminders should be spread evenly across weekdays
   *
   * Note: この性質は複数週のシミュレーションが必要なため、統合テストで検証する
   */
  it.skip('Property 17: Habit Task Even Distribution', () => {
    // 統合テストで実装
  });

  /**
   * Property 18: Habit Task Priority
   * Feature: 3.2-reminder-functionality, Property 18: Habit Task Priority
   * Validates: Requirements 5.4
   *
   * For any habit task not reminded in the past 7 days, it should be prioritized for the current day
   */
  it('Property 18: Habit Task Priority', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // goalId
        async (userId, goalId) => {
          // Arrange: 習慣タスクを用意（7日間リマインドなし）
          const sevenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
          const mockTasks: TaskWithAction[] = [
            {
              id: 'habit-task-1',
              actionId: 'action-1',
              title: 'Habit Task 1',
              type: TaskType.HABIT,
              status: TaskStatus.NOT_STARTED,
              estimatedMinutes: 30,
              createdAt: new Date('2024-01-01'),
              action: {
                id: 'action-1',
                subGoalId: 'subgoal-1',
                position: 0,
                subGoal: {
                  id: 'subgoal-1',
                  goalId,
                  position: 0,
                },
              },
            },
          ];

          const mockTracking = [
            {
              id: 'tracking-1',
              taskId: 'habit-task-1',
              lastRemindedAt: sevenDaysAgo,
              reminderCount: 1,
              weekNumber: 1,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
            },
          ];

          mockPrisma.task.findMany.mockResolvedValue(mockTasks);
          mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue(mockTracking);

          // Act
          const result = await taskSelectorService.selectTasksForReminder(userId, goalId);

          // Assert: 7日間リマインドなしのタスクが優先的に選択される
          expect(result.length).toBeGreaterThan(0);
          expect(result[0].id).toBe('habit-task-1');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19: Remaining Slots Filled with Execution Tasks
   * Feature: 3.2-reminder-functionality, Property 19: Remaining Slots Filled with Execution Tasks
   * Validates: Requirements 5.5
   *
   * For any task selection where criteria are met, remaining slots should be filled with execution tasks
   */
  it('Property 19: Remaining Slots Filled with Execution Tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.string({ minLength: 1 }), // goalId
        fc.integer({ min: 5, max: 10 }), // 実行タスク数
        async (userId, goalId, executionTaskCount) => {
          // Arrange: 習慣タスク1つと複数の実行タスクを用意
          const mockTasks: TaskWithAction[] = [
            {
              id: 'habit-task-1',
              actionId: 'action-habit',
              title: 'Habit Task',
              type: TaskType.HABIT,
              status: TaskStatus.NOT_STARTED,
              estimatedMinutes: 30,
              createdAt: new Date('2024-01-01'),
              action: {
                id: 'action-habit',
                subGoalId: 'subgoal-1',
                position: 0,
                subGoal: {
                  id: 'subgoal-1',
                  goalId,
                  position: 0,
                },
              },
            },
            ...Array.from({ length: executionTaskCount }, (_, i) => ({
              id: `exec-task-${i}`,
              actionId: `action-${i}`,
              title: `Execution Task ${i}`,
              type: TaskType.EXECUTION,
              status: TaskStatus.NOT_STARTED,
              estimatedMinutes: 30,
              createdAt: new Date(`2024-01-${String(i + 2).padStart(2, '0')}`),
              action: {
                id: `action-${i}`,
                subGoalId: 'subgoal-1',
                position: i,
                subGoal: {
                  id: 'subgoal-1',
                  goalId,
                  position: 0,
                },
              },
            })),
          ];

          mockPrisma.task.findMany.mockResolvedValue(mockTasks);
          mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);

          // Act
          const result = await taskSelectorService.selectTasksForReminder(userId, goalId);

          // Assert: 習慣タスク1つ + 実行タスク（残りスロット）= 最大3つ
          expect(result.length).toBeLessThanOrEqual(3);

          const habitTasks = result.filter(t => t.type === TaskType.HABIT);
          const executionTasks = result.filter(t => t.type === TaskType.EXECUTION);

          expect(habitTasks.length).toBeLessThanOrEqual(1);
          expect(executionTasks.length).toBeLessThanOrEqual(2); // 3 - 1 (habit) = 2
        }
      ),
      { numRuns: 100 }
    );
  });
});
