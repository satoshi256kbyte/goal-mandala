import * as fc from 'fast-check';
import { ProgressService } from '../progress.service';
import { PrismaClient, TaskStatus, ActionType } from '../../generated/prisma-client';
import { taskArbitrary, taskStatusArbitrary } from '../../__tests__/utils/task-arbitraries';

// Prismaクライアントのモック
const mockPrisma = {
  task: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  action: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  subGoal: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  goal: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
} as unknown as PrismaClient;

describe('Progress Service Property-Based Tests', () => {
  let progressService: ProgressService;

  beforeEach(() => {
    jest.clearAllMocks();
    progressService = new ProgressService(mockPrisma);
  });

  /**
   * Feature: task-management, Property 7: 進捗の連鎖更新
   * Validates: Requirements 2.5, 10.1-10.5, 11.1-11.5, 12.1-12.5
   *
   * For any タスク、タスクの状態を更新した場合、
   * 関連するアクション、サブ目標、目標の進捗が正しく再計算され更新される
   */
  describe('Property 7: 進捗の連鎖更新', () => {
    it('should update progress cascade when task status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          async (taskId, actionProgress, subGoalProgress, goalProgress) => {
            // Setup: タスクとその階層構造をモック
            const actionId = fc.sample(fc.uuid(), 1)[0];
            const subGoalId = fc.sample(fc.uuid(), 1)[0];
            const goalId = fc.sample(fc.uuid(), 1)[0];

            const task = {
              id: taskId,
              actionId,
              status: TaskStatus.COMPLETED,
            };

            const action = {
              id: actionId,
              subGoalId,
              progress: actionProgress,
              type: ActionType.EXECUTION,
            };

            const subGoal = {
              id: subGoalId,
              goalId,
              progress: subGoalProgress,
            };

            const goal = {
              id: goalId,
              progress: goalProgress,
            };

            mockPrisma.task.findUnique = jest.fn().mockResolvedValue(task);
            mockPrisma.action.findUnique = jest.fn().mockResolvedValue(action);
            mockPrisma.subGoal.findUnique = jest.fn().mockResolvedValue(subGoal);
            mockPrisma.goal.findUnique = jest.fn().mockResolvedValue(goal);

            // アクションのタスク一覧をモック（完了タスク50%）
            const actionTasks = [
              { status: TaskStatus.COMPLETED },
              { status: TaskStatus.NOT_STARTED },
            ];
            mockPrisma.task.findMany = jest.fn().mockResolvedValue(actionTasks);

            // サブ目標のアクション一覧をモック
            const subGoalActions = [{ progress: 50 }, { progress: 30 }];
            mockPrisma.action.findMany = jest.fn().mockResolvedValue(subGoalActions);

            // 目標のサブ目標一覧をモック
            const goalSubGoals = [{ progress: 40 }, { progress: 60 }];
            mockPrisma.subGoal.findMany = jest.fn().mockResolvedValue(goalSubGoals);

            mockPrisma.action.update = jest.fn().mockResolvedValue({ ...action, progress: 50 });
            mockPrisma.subGoal.update = jest.fn().mockResolvedValue({ ...subGoal, progress: 40 });
            mockPrisma.goal.update = jest.fn().mockResolvedValue({ ...goal, progress: 50 });

            // Execute: 進捗を更新
            await progressService.updateProgress(taskId);

            // Verify: アクション進捗が更新された
            expect(mockPrisma.action.update).toHaveBeenCalled();
            const actionUpdateCall = (mockPrisma.action.update as jest.Mock).mock.calls[0][0];
            expect(actionUpdateCall.data.progress).toBeGreaterThanOrEqual(0);
            expect(actionUpdateCall.data.progress).toBeLessThanOrEqual(100);

            // Verify: サブ目標進捗が更新された
            expect(mockPrisma.subGoal.update).toHaveBeenCalled();
            const subGoalUpdateCall = (mockPrisma.subGoal.update as jest.Mock).mock.calls[0][0];
            expect(subGoalUpdateCall.data.progress).toBeGreaterThanOrEqual(0);
            expect(subGoalUpdateCall.data.progress).toBeLessThanOrEqual(100);

            // Verify: 目標進捗が更新された
            expect(mockPrisma.goal.update).toHaveBeenCalled();
            const goalUpdateCall = (mockPrisma.goal.update as jest.Mock).mock.calls[0][0];
            expect(goalUpdateCall.data.progress).toBeGreaterThanOrEqual(0);
            expect(goalUpdateCall.data.progress).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 進捗計算の境界値テスト
   */
  describe('Progress calculation boundary tests', () => {
    it('should handle 0% progress correctly', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async taskId => {
          // Setup: 全てのタスクが未着手
          const actionId = fc.sample(fc.uuid(), 1)[0];
          const task = { id: taskId, actionId, status: TaskStatus.NOT_STARTED };
          const action = { id: actionId, type: ActionType.EXECUTION };

          mockPrisma.task.findUnique = jest.fn().mockResolvedValue(task);
          mockPrisma.action.findUnique = jest.fn().mockResolvedValue(action);
          mockPrisma.task.findMany = jest
            .fn()
            .mockResolvedValue([{ status: TaskStatus.NOT_STARTED }]);

          // Execute: アクション進捗を計算
          const progress = await progressService.calculateActionProgress(actionId);

          // Verify: 進捗が0%
          expect(progress).toBe(0);
        }),
        { numRuns: 50 }
      );
    });

    it('should handle 100% progress correctly', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async taskId => {
          // Setup: 全てのタスクが完了
          const actionId = fc.sample(fc.uuid(), 1)[0];
          const task = { id: taskId, actionId, status: TaskStatus.COMPLETED };
          const action = { id: actionId, type: ActionType.EXECUTION };

          mockPrisma.task.findUnique = jest.fn().mockResolvedValue(task);
          mockPrisma.action.findUnique = jest.fn().mockResolvedValue(action);
          mockPrisma.task.findMany = jest
            .fn()
            .mockResolvedValue([{ status: TaskStatus.COMPLETED }]);

          // Execute: アクション進捗を計算
          const progress = await progressService.calculateActionProgress(actionId);

          // Verify: 進捗が100%
          expect(progress).toBe(100);
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 進捗計算の整合性テスト
   */
  describe('Progress calculation consistency', () => {
    it('should always return progress between 0 and 100', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(taskStatusArbitrary, { minLength: 1, maxLength: 10 }),
          async (actionId, taskStatuses) => {
            // Setup: ランダムな状態のタスクをモック
            const action = { id: actionId, type: ActionType.EXECUTION };
            const tasks = taskStatuses.map(status => ({ status }));

            mockPrisma.action.findUnique = jest.fn().mockResolvedValue(action);
            mockPrisma.task.findMany = jest.fn().mockResolvedValue(tasks);

            // Execute: アクション進捗を計算
            const progress = await progressService.calculateActionProgress(actionId);

            // Verify: 進捗が0-100の範囲内
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(100);

            // Verify: 進捗が整数
            expect(Number.isInteger(progress)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
