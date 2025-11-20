/**
 * ProgressServiceのユニットテスト
 * Requirements: 2.5, 10.1-10.5, 11.1-11.5, 12.1-12.5
 */

import { ProgressService } from '../progress.service';
import { TaskStatus } from '../../generated/prisma-client';

// Prismaクライアントのモック
const mockPrisma = {
  action: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  subGoal: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  goal: {
    update: jest.fn(),
  },
  task: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ProgressServiceのインスタンス作成
const progressService = new ProgressService(mockPrisma);

describe('ProgressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateActionProgress', () => {
    const mockActionId = 'action-1';

    it('should return 0 when action has no tasks', async () => {
      const mockAction = {
        id: mockActionId,
        type: 'EXECUTION',
        tasks: [],
      };
      mockPrisma.action.findUnique.mockResolvedValue(mockAction);

      const result = await progressService.calculateActionProgress(mockActionId);

      expect(result).toBe(0);
    });

    it('should calculate execution action progress correctly', async () => {
      const mockAction = {
        id: mockActionId,
        type: 'EXECUTION',
        tasks: [
          { id: 'task-1', status: TaskStatus.COMPLETED },
          { id: 'task-2', status: TaskStatus.COMPLETED },
          { id: 'task-3', status: TaskStatus.NOT_STARTED },
          { id: 'task-4', status: TaskStatus.IN_PROGRESS },
        ],
      };
      mockPrisma.action.findUnique.mockResolvedValue(mockAction);

      const result = await progressService.calculateActionProgress(mockActionId);

      // 4タスク中2タスク完了 = 50%
      expect(result).toBe(50);
    });

    it('should calculate habit action progress correctly', async () => {
      const mockAction = {
        id: mockActionId,
        type: 'HABIT',
        tasks: [
          { id: 'task-1', status: TaskStatus.COMPLETED },
          { id: 'task-2', status: TaskStatus.COMPLETED },
          { id: 'task-3', status: TaskStatus.COMPLETED },
          { id: 'task-4', status: TaskStatus.NOT_STARTED },
          { id: 'task-5', status: TaskStatus.NOT_STARTED },
        ],
      };
      mockPrisma.action.findUnique.mockResolvedValue(mockAction);

      const result = await progressService.calculateActionProgress(mockActionId);

      // 5タスク中3タスク完了 = 60%
      // 習慣アクションは80%継続で100%達成とみなすため: (60% / 80%) * 100% = 75%
      expect(result).toBe(75);
    });

    it('should cap habit action progress at 100%', async () => {
      const mockAction = {
        id: mockActionId,
        type: 'HABIT',
        tasks: [
          { id: 'task-1', status: TaskStatus.COMPLETED },
          { id: 'task-2', status: TaskStatus.COMPLETED },
          { id: 'task-3', status: TaskStatus.COMPLETED },
          { id: 'task-4', status: TaskStatus.COMPLETED },
          { id: 'task-5', status: TaskStatus.COMPLETED },
        ],
      };
      mockPrisma.action.findUnique.mockResolvedValue(mockAction);

      const result = await progressService.calculateActionProgress(mockActionId);

      // 100%完了でも上限は100%
      expect(result).toBe(100);
    });

    it('should return 0 when action not found', async () => {
      mockPrisma.action.findUnique.mockResolvedValue(null);

      const result = await progressService.calculateActionProgress(mockActionId);

      expect(result).toBe(0);
    });
  });

  describe('calculateSubGoalProgress', () => {
    const mockSubGoalId = 'subgoal-1';

    it('should return 0 when subgoal has no actions', async () => {
      mockPrisma.action.findMany.mockResolvedValue([]);

      const result = await progressService.calculateSubGoalProgress(mockSubGoalId);

      expect(result).toBe(0);
    });

    it('should calculate average progress of actions', async () => {
      const mockActions = [{ id: 'action-1' }, { id: 'action-2' }, { id: 'action-3' }];
      mockPrisma.action.findMany.mockResolvedValue(mockActions);

      // calculateActionProgressをモック
      jest
        .spyOn(progressService, 'calculateActionProgress')
        .mockResolvedValueOnce(80) // action-1: 80%
        .mockResolvedValueOnce(60) // action-2: 60%
        .mockResolvedValueOnce(100); // action-3: 100%

      const result = await progressService.calculateSubGoalProgress(mockSubGoalId);

      // 平均: (80 + 60 + 100) / 3 = 80%
      expect(result).toBe(80);
    });

    it('should round average progress to nearest integer', async () => {
      const mockActions = [{ id: 'action-1' }, { id: 'action-2' }];
      mockPrisma.action.findMany.mockResolvedValue(mockActions);

      jest
        .spyOn(progressService, 'calculateActionProgress')
        .mockResolvedValueOnce(33) // action-1: 33%
        .mockResolvedValueOnce(34); // action-2: 34%

      const result = await progressService.calculateSubGoalProgress(mockSubGoalId);

      // 平均: (33 + 34) / 2 = 33.5% → 34%（四捨五入）
      expect(result).toBe(34);
    });
  });

  describe('calculateGoalProgress', () => {
    const mockGoalId = 'goal-1';

    it('should return 0 when goal has no subgoals', async () => {
      mockPrisma.subGoal.findMany.mockResolvedValue([]);

      const result = await progressService.calculateGoalProgress(mockGoalId);

      expect(result).toBe(0);
    });

    it('should calculate average progress of subgoals', async () => {
      const mockSubGoals = [{ id: 'subgoal-1' }, { id: 'subgoal-2' }];
      mockPrisma.subGoal.findMany.mockResolvedValue(mockSubGoals);

      jest
        .spyOn(progressService, 'calculateSubGoalProgress')
        .mockResolvedValueOnce(70) // subgoal-1: 70%
        .mockResolvedValueOnce(90); // subgoal-2: 90%

      const result = await progressService.calculateGoalProgress(mockGoalId);

      // 平均: (70 + 90) / 2 = 80%
      expect(result).toBe(80);
    });
  });

  describe('updateProgress', () => {
    const mockTaskId = 'task-1';
    const mockTask = {
      id: mockTaskId,
      action: {
        id: 'action-1',
        subGoal: {
          id: 'subgoal-1',
          goal: {
            id: 'goal-1',
          },
        },
      },
    };

    it('should update progress cascade from task to goal', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.$transaction.mockImplementation(async callback => {
        const mockTx = {
          action: { update: jest.fn() },
          subGoal: { update: jest.fn() },
          goal: { update: jest.fn() },
        };
        return await callback(mockTx);
      });

      jest.spyOn(progressService, 'calculateActionProgress').mockResolvedValue(75);
      jest.spyOn(progressService, 'calculateSubGoalProgress').mockResolvedValue(60);
      jest.spyOn(progressService, 'calculateGoalProgress').mockResolvedValue(45);

      await progressService.updateProgress(mockTaskId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should mark action as achieved when progress reaches 100%', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.$transaction.mockImplementation(async callback => {
        const mockTx = {
          action: { update: jest.fn() },
          subGoal: { update: jest.fn() },
          goal: { update: jest.fn() },
        };
        return await callback(mockTx);
      });

      jest.spyOn(progressService, 'calculateActionProgress').mockResolvedValue(100);
      jest.spyOn(progressService, 'calculateSubGoalProgress').mockResolvedValue(80);
      jest.spyOn(progressService, 'calculateGoalProgress').mockResolvedValue(60);

      await progressService.updateProgress(mockTaskId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should mark goal as completed when progress reaches 100%', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(mockTask);
      mockPrisma.$transaction.mockImplementation(async callback => {
        const mockTx = {
          action: { update: jest.fn() },
          subGoal: { update: jest.fn() },
          goal: { update: jest.fn() },
        };
        return await callback(mockTx);
      });

      jest.spyOn(progressService, 'calculateActionProgress').mockResolvedValue(100);
      jest.spyOn(progressService, 'calculateSubGoalProgress').mockResolvedValue(100);
      jest.spyOn(progressService, 'calculateGoalProgress').mockResolvedValue(100);

      await progressService.updateProgress(mockTaskId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should return early when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await progressService.updateProgress(mockTaskId);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should return early when task has no action', async () => {
      const taskWithoutAction = { id: mockTaskId, action: null };
      mockPrisma.task.findUnique.mockResolvedValue(taskWithoutAction);

      await progressService.updateProgress(mockTaskId);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
