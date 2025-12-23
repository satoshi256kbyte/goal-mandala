/**
 * Task Selector Serviceのユニットテスト
 * Requirements: 4.1-4.5, 5.1-5.5
 */

import { TaskSelectorService } from '../task-selector.service';
import { PrismaClient, TaskStatus, TaskType } from '../../generated/prisma-client';
import { MoodPreference } from '@goal-mandala/shared';

// Prisma Clientのモック
const mockPrisma = {
  task: {
    findMany: jest.fn(),
  },
  action: {
    findMany: jest.fn(),
  },
  habitTaskReminderTracking: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  userReminderPreference: {
    findUnique: jest.fn(),
  },
} as unknown as jest.Mocked<PrismaClient>;

describe('TaskSelectorService', () => {
  let taskSelectorService: TaskSelectorService;
  const mockUserId = 'user-123';
  const mockGoalId = 'goal-123';

  beforeEach(() => {
    jest.clearAllMocks();
    taskSelectorService = new TaskSelectorService(mockPrisma);
  });

  describe('selectTasksForReminder', () => {
    describe('基本的なタスク選択', () => {
      it('未完了タスクのみを取得すること', async () => {
        // Arrange
        const mockTasks = [
          {
            id: 'task-1',
            actionId: 'action-1',
            title: 'Task 1',
            type: TaskType.EXECUTION,
            status: TaskStatus.NOT_STARTED,
            estimatedMinutes: 30,
            createdAt: new Date('2024-01-01'),
            action: {
              id: 'action-1',
              subGoalId: 'subgoal-1',
              position: 0,
              subGoal: {
                id: 'subgoal-1',
                goalId: mockGoalId,
                position: 0,
              },
            },
          },
          {
            id: 'task-2',
            actionId: 'action-2',
            title: 'Task 2',
            type: TaskType.EXECUTION,
            status: TaskStatus.IN_PROGRESS,
            estimatedMinutes: 45,
            createdAt: new Date('2024-01-02'),
            action: {
              id: 'action-2',
              subGoalId: 'subgoal-1',
              position: 1,
              subGoal: {
                id: 'subgoal-1',
                goalId: mockGoalId,
                position: 0,
              },
            },
          },
        ];

        mockPrisma.task.findMany.mockResolvedValue(mockTasks);
        mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);
        mockPrisma.userReminderPreference.findUnique.mockResolvedValue(null);

        // Act
        const result = await taskSelectorService.selectTasksForReminder(mockUserId, mockGoalId);

        // Assert
        expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
          where: {
            action: {
              subGoal: {
                goal: {
                  userId: mockUserId,
                  id: mockGoalId,
                  status: 'ACTIVE',
                },
              },
            },
            status: {
              in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
            },
          },
          include: {
            action: {
              include: {
                subGoal: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });
        expect(result).toHaveLength(2);
      });

      it('タスクがない場合は空配列を返すこと', async () => {
        // Arrange
        mockPrisma.task.findMany.mockResolvedValue([]);
        mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);
        mockPrisma.userReminderPreference.findUnique.mockResolvedValue(null);

        // Act
        const result = await taskSelectorService.selectTasksForReminder(mockUserId, mockGoalId);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('実行タスクと習慣タスクの分離', () => {
      it('実行タスクと習慣タスクを正しく分離すること', async () => {
        // Arrange
        const mockTasks = [
          {
            id: 'task-1',
            actionId: 'action-1',
            title: 'Execution Task',
            type: TaskType.EXECUTION,
            status: TaskStatus.NOT_STARTED,
            estimatedMinutes: 30,
            createdAt: new Date('2024-01-01'),
            action: {
              id: 'action-1',
              subGoalId: 'subgoal-1',
              position: 0,
              subGoal: {
                id: 'subgoal-1',
                goalId: mockGoalId,
                position: 0,
              },
            },
          },
          {
            id: 'task-2',
            actionId: 'action-2',
            title: 'Habit Task',
            type: TaskType.HABIT,
            status: TaskStatus.NOT_STARTED,
            estimatedMinutes: 45,
            createdAt: new Date('2024-01-02'),
            action: {
              id: 'action-2',
              subGoalId: 'subgoal-1',
              position: 1,
              subGoal: {
                id: 'subgoal-1',
                goalId: mockGoalId,
                position: 0,
              },
            },
          },
        ];

        mockPrisma.task.findMany.mockResolvedValue(mockTasks);
        mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);
        mockPrisma.userReminderPreference.findUnique.mockResolvedValue(null);

        // Act
        const result = await taskSelectorService.selectTasksForReminder(mockUserId, mockGoalId);

        // Assert
        expect(result.some(t => t.type === TaskType.EXECUTION)).toBe(true);
        expect(result.some(t => t.type === TaskType.HABIT)).toBe(true);
      });
    });

    describe('実行タスクの上限制御', () => {
      it('実行タスクが最大3つまでに制限されること', async () => {
        // Arrange
        const mockTasks = Array.from({ length: 10 }, (_, i) => ({
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
            position: i % 8,
            subGoal: {
              id: 'subgoal-1',
              goalId: mockGoalId,
              position: 0,
            },
          },
        }));

        mockPrisma.task.findMany.mockResolvedValue(mockTasks);
        mockPrisma.habitTaskReminderTracking.findMany.mockResolvedValue([]);
        mockPrisma.userReminderPreference.findUnique.mockResolvedValue(null);

        // Act
        const result = await taskSelectorService.selectTasksForReminder(mockUserId, mockGoalId);

        // Assert
        const executionTasks = result.filter(t => t.type === TaskType.EXECUTION);
        expect(executionTasks.length).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('getIncompleteTasks', () => {
    it('未完了タスクを取得すること', async () => {
      // Arrange
      const mockTasks = [
        {
          id: 'task-1',
          actionId: 'action-1',
          title: 'Task 1',
          type: TaskType.EXECUTION,
          status: TaskStatus.NOT_STARTED,
          estimatedMinutes: 30,
          createdAt: new Date('2024-01-01'),
          action: {
            id: 'action-1',
            subGoalId: 'subgoal-1',
            position: 0,
            subGoal: {
              id: 'subgoal-1',
              goalId: mockGoalId,
              position: 0,
            },
          },
        },
      ];

      mockPrisma.task.findMany.mockResolvedValue(mockTasks);

      // Act
      const result = await taskSelectorService['getIncompleteTasks'](mockUserId, mockGoalId);

      // Assert
      expect(result).toEqual(mockTasks);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: {
          action: {
            subGoal: {
              goal: {
                userId: mockUserId,
                id: mockGoalId,
                status: 'ACTIVE',
              },
            },
          },
          status: {
            in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS],
          },
        },
        include: {
          action: {
            include: {
              subGoal: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  });

  describe('separateTasksByType', () => {
    it('実行タスクと習慣タスクを正しく分離すること', async () => {
      // Arrange
      const mockTasks = [
        {
          id: 'task-1',
          type: TaskType.EXECUTION,
        },
        {
          id: 'task-2',
          type: TaskType.HABIT,
        },
        {
          id: 'task-3',
          type: TaskType.EXECUTION,
        },
      ] as any[];

      // Act
      const result = taskSelectorService['separateTasksByType'](mockTasks);

      // Assert
      expect(result.executionTasks).toHaveLength(2);
      expect(result.habitTasks).toHaveLength(1);
      expect(result.executionTasks.every(t => t.type === TaskType.EXECUTION)).toBe(true);
      expect(result.habitTasks.every(t => t.type === TaskType.HABIT)).toBe(true);
    });
  });
});
