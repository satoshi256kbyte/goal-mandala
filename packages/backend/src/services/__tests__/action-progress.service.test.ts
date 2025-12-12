import { PrismaClient } from '@prisma/client';
import { ActionProgressService } from '../action-progress.service';

// Prismaクライアントのモック
const mockPrisma = {
  goal: {
    findFirst: jest.fn(),
  },
  subGoal: {
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ActionProgressService', () => {
  let actionProgressService: ActionProgressService;

  beforeEach(() => {
    jest.clearAllMocks();
    actionProgressService = new ActionProgressService(mockPrisma);
  });

  describe('getActionProgress', () => {
    it('should return action progress for a goal', async () => {
      // Setup: モックデータ
      const goalId = 'goal-1';
      const userId = 'user-1';

      const mockGoal = {
        id: goalId,
        userId,
        title: 'Test Goal',
        description: 'Test Description',
        deadline: new Date(),
        background: 'Test Background',
        constraints: null,
        status: 'active' as const,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSubGoals = [
        {
          id: 'subgoal-1',
          goalId,
          title: 'SubGoal 1',
          description: 'Description 1',
          background: 'Background 1',
          constraints: null,
          position: 0,
          progress: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
          actions: [
            {
              id: 'action-1',
              subGoalId: 'subgoal-1',
              title: 'Action 1',
              description: 'Description 1',
              background: 'Background 1',
              constraints: null,
              type: 'execution' as const,
              position: 0,
              progress: 80,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: 'action-2',
              subGoalId: 'subgoal-1',
              title: 'Action 2',
              description: 'Description 2',
              background: 'Background 2',
              constraints: null,
              type: 'execution' as const,
              position: 1,
              progress: 20,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
        {
          id: 'subgoal-2',
          goalId,
          title: 'SubGoal 2',
          description: 'Description 2',
          background: 'Background 2',
          constraints: null,
          position: 1,
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          actions: [
            {
              id: 'action-3',
              subGoalId: 'subgoal-2',
              title: 'Action 3',
              description: 'Description 3',
              background: 'Background 3',
              constraints: null,
              type: 'execution' as const,
              position: 0,
              progress: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        },
      ];

      mockPrisma.goal.findFirst = jest.fn().mockResolvedValue(mockGoal);
      mockPrisma.subGoal.findMany = jest.fn().mockResolvedValue(mockSubGoals);

      // Execute: アクション進捗を取得
      const result = await actionProgressService.getActionProgress(goalId, userId);

      // Verify: 正しいアクション進捗が返されることを確認
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'action-1',
        title: 'Action 1',
        progress: 80,
        subGoalTitle: 'SubGoal 1',
      });
      expect(result[1]).toEqual({
        id: 'action-2',
        title: 'Action 2',
        progress: 20,
        subGoalTitle: 'SubGoal 1',
      });
      expect(result[2]).toEqual({
        id: 'action-3',
        title: 'Action 3',
        progress: 0,
        subGoalTitle: 'SubGoal 2',
      });

      // Verify: Prismaメソッドが正しく呼ばれたことを確認
      expect(mockPrisma.goal.findFirst).toHaveBeenCalledWith({
        where: {
          id: goalId,
          userId,
        },
      });
      expect(mockPrisma.subGoal.findMany).toHaveBeenCalledWith({
        where: {
          goalId,
        },
        include: {
          actions: true,
        },
      });
    });

    it('should throw error when goal is not found', async () => {
      // Setup: 目標が見つからない場合
      const goalId = 'non-existent-goal';
      const userId = 'user-1';

      mockPrisma.goal.findFirst = jest.fn().mockResolvedValue(null);

      // Execute & Verify: エラーがスローされることを確認
      await expect(actionProgressService.getActionProgress(goalId, userId)).rejects.toThrow(
        '目標が見つかりません'
      );

      // Verify: subGoal.findManyが呼ばれていないことを確認
      expect(mockPrisma.subGoal.findMany).not.toHaveBeenCalled();
    });

    it('should throw error when userId does not match goal owner', async () => {
      // Setup: ユーザーIDが一致しない場合
      const goalId = 'goal-1';
      const userId = 'wrong-user';

      mockPrisma.goal.findFirst = jest.fn().mockResolvedValue(null);

      // Execute & Verify: エラーがスローされることを確認
      await expect(actionProgressService.getActionProgress(goalId, userId)).rejects.toThrow(
        '目標が見つかりません'
      );
    });

    it('should return empty array when goal has no sub-goals', async () => {
      // Setup: サブ目標がない場合
      const goalId = 'goal-1';
      const userId = 'user-1';

      const mockGoal = {
        id: goalId,
        userId,
        title: 'Test Goal',
        description: 'Test Description',
        deadline: new Date(),
        background: 'Test Background',
        constraints: null,
        status: 'active' as const,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.goal.findFirst = jest.fn().mockResolvedValue(mockGoal);
      mockPrisma.subGoal.findMany = jest.fn().mockResolvedValue([]);

      // Execute: アクション進捗を取得
      const result = await actionProgressService.getActionProgress(goalId, userId);

      // Verify: 空配列が返されることを確認
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return empty array when sub-goals have no actions', async () => {
      // Setup: アクションがない場合
      const goalId = 'goal-1';
      const userId = 'user-1';

      const mockGoal = {
        id: goalId,
        userId,
        title: 'Test Goal',
        description: 'Test Description',
        deadline: new Date(),
        background: 'Test Background',
        constraints: null,
        status: 'active' as const,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSubGoals = [
        {
          id: 'subgoal-1',
          goalId,
          title: 'SubGoal 1',
          description: 'Description 1',
          background: 'Background 1',
          constraints: null,
          position: 0,
          progress: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          actions: [],
        },
      ];

      mockPrisma.goal.findFirst = jest.fn().mockResolvedValue(mockGoal);
      mockPrisma.subGoal.findMany = jest.fn().mockResolvedValue(mockSubGoals);

      // Execute: アクション進捗を取得
      const result = await actionProgressService.getActionProgress(goalId, userId);

      // Verify: 空配列が返されることを確認
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('categorizeActions', () => {
    it('should categorize actions by progress', () => {
      // Setup: テストデータ
      const actions = [
        { id: 'action-1', title: 'Action 1', progress: 90, subGoalTitle: 'SubGoal 1' },
        { id: 'action-2', title: 'Action 2', progress: 80, subGoalTitle: 'SubGoal 1' },
        { id: 'action-3', title: 'Action 3', progress: 50, subGoalTitle: 'SubGoal 2' },
        { id: 'action-4', title: 'Action 4', progress: 20, subGoalTitle: 'SubGoal 2' },
        { id: 'action-5', title: 'Action 5', progress: 10, subGoalTitle: 'SubGoal 3' },
        { id: 'action-6', title: 'Action 6', progress: 0, subGoalTitle: 'SubGoal 3' },
      ];

      // Execute: アクションを分類
      const result = actionProgressService.categorizeActions(actions);

      // Verify: 正しく分類されていることを確認
      expect(result.regretful).toHaveLength(2);
      expect(result.regretful).toEqual([
        { id: 'action-1', title: 'Action 1', progress: 90, subGoalTitle: 'SubGoal 1' },
        { id: 'action-2', title: 'Action 2', progress: 80, subGoalTitle: 'SubGoal 1' },
      ]);

      expect(result.slowProgress).toHaveLength(2);
      expect(result.slowProgress).toEqual([
        { id: 'action-4', title: 'Action 4', progress: 20, subGoalTitle: 'SubGoal 2' },
        { id: 'action-5', title: 'Action 5', progress: 10, subGoalTitle: 'SubGoal 3' },
      ]);

      expect(result.untouched).toHaveLength(1);
      expect(result.untouched).toEqual([
        { id: 'action-6', title: 'Action 6', progress: 0, subGoalTitle: 'SubGoal 3' },
      ]);
    });

    it('should handle empty actions array', () => {
      // Setup: 空配列
      const actions: any[] = [];

      // Execute: アクションを分類
      const result = actionProgressService.categorizeActions(actions);

      // Verify: 全てのカテゴリが空配列であることを確認
      expect(result.regretful).toEqual([]);
      expect(result.slowProgress).toEqual([]);
      expect(result.untouched).toEqual([]);
    });

    it('should handle actions with progress exactly at boundaries', () => {
      // Setup: 境界値のテストデータ
      const actions = [
        { id: 'action-1', title: 'Action 1', progress: 100, subGoalTitle: 'SubGoal 1' },
        { id: 'action-2', title: 'Action 2', progress: 80, subGoalTitle: 'SubGoal 1' },
        { id: 'action-3', title: 'Action 3', progress: 79, subGoalTitle: 'SubGoal 2' },
        { id: 'action-4', title: 'Action 4', progress: 21, subGoalTitle: 'SubGoal 2' },
        { id: 'action-5', title: 'Action 5', progress: 20, subGoalTitle: 'SubGoal 3' },
        { id: 'action-6', title: 'Action 6', progress: 0, subGoalTitle: 'SubGoal 3' },
      ];

      // Execute: アクションを分類
      const result = actionProgressService.categorizeActions(actions);

      // Verify: 境界値が正しく分類されていることを確認
      expect(result.regretful).toHaveLength(2);
      expect(result.regretful.map(a => a.id)).toEqual(['action-1', 'action-2']);

      expect(result.slowProgress).toHaveLength(1);
      expect(result.slowProgress.map(a => a.id)).toEqual(['action-5']);

      expect(result.untouched).toHaveLength(1);
      expect(result.untouched.map(a => a.id)).toEqual(['action-6']);
    });

    it('should not categorize actions with progress between 21-79', () => {
      // Setup: 中間の進捗のテストデータ
      const actions = [
        { id: 'action-1', title: 'Action 1', progress: 21, subGoalTitle: 'SubGoal 1' },
        { id: 'action-2', title: 'Action 2', progress: 50, subGoalTitle: 'SubGoal 1' },
        { id: 'action-3', title: 'Action 3', progress: 79, subGoalTitle: 'SubGoal 2' },
      ];

      // Execute: アクションを分類
      const result = actionProgressService.categorizeActions(actions);

      // Verify: 中間の進捗はどのカテゴリにも含まれないことを確認
      expect(result.regretful).toEqual([]);
      expect(result.slowProgress).toEqual([]);
      expect(result.untouched).toEqual([]);
    });
  });
});
