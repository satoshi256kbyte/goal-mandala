import {
  checkEditPermission,
  checkGoalOwnership,
  checkSubGoalOwnership,
  checkActionOwnership,
} from './permissions';
import { PrismaClient } from '../generated/prisma-client';

// Prismaのモック
jest.mock('../generated/prisma-client', () => {
  const mockPrisma = {
    goal: {
      findUnique: jest.fn(),
    },
    subGoal: {
      findUnique: jest.fn(),
    },
    action: {
      findUnique: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('権限チェック', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('checkGoalOwnership', () => {
    it('目標の所有者の場合、trueを返す', async () => {
      const userId = 'user-123';
      const goalId = 'goal-456';

      prisma.goal.findUnique.mockResolvedValue({
        id: goalId,
        userId: userId,
        title: 'Test Goal',
      });

      const result = await checkGoalOwnership(prisma, userId, goalId);
      expect(result).toBe(true);
      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: goalId },
        select: { userId: true },
      });
    });

    it('目標の所有者でない場合、falseを返す', async () => {
      const userId = 'user-123';
      const goalId = 'goal-456';

      prisma.goal.findUnique.mockResolvedValue({
        id: goalId,
        userId: 'other-user',
        title: 'Test Goal',
      });

      const result = await checkGoalOwnership(prisma, userId, goalId);
      expect(result).toBe(false);
    });

    it('目標が存在しない場合、falseを返す', async () => {
      const userId = 'user-123';
      const goalId = 'non-existent';

      prisma.goal.findUnique.mockResolvedValue(null);

      const result = await checkGoalOwnership(prisma, userId, goalId);
      expect(result).toBe(false);
    });

    it('データベースエラーの場合、falseを返す', async () => {
      const userId = 'user-123';
      const goalId = 'goal-456';

      prisma.goal.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await checkGoalOwnership(prisma, userId, goalId);
      expect(result).toBe(false);
    });
  });

  describe('checkSubGoalOwnership', () => {
    it('サブ目標の所有者の場合、trueを返す', async () => {
      const userId = 'user-123';
      const subGoalId = 'subgoal-456';

      prisma.subGoal.findUnique.mockResolvedValue({
        id: subGoalId,
        goal: {
          userId: userId,
        },
      });

      const result = await checkSubGoalOwnership(prisma, userId, subGoalId);
      expect(result).toBe(true);
      expect(prisma.subGoal.findUnique).toHaveBeenCalledWith({
        where: { id: subGoalId },
        include: { goal: { select: { userId: true } } },
      });
    });

    it('サブ目標の所有者でない場合、falseを返す', async () => {
      const userId = 'user-123';
      const subGoalId = 'subgoal-456';

      prisma.subGoal.findUnique.mockResolvedValue({
        id: subGoalId,
        goal: {
          userId: 'other-user',
        },
      });

      const result = await checkSubGoalOwnership(prisma, userId, subGoalId);
      expect(result).toBe(false);
    });

    it('サブ目標が存在しない場合、falseを返す', async () => {
      const userId = 'user-123';
      const subGoalId = 'non-existent';

      prisma.subGoal.findUnique.mockResolvedValue(null);

      const result = await checkSubGoalOwnership(prisma, userId, subGoalId);
      expect(result).toBe(false);
    });
  });

  describe('checkActionOwnership', () => {
    it('アクションの所有者の場合、trueを返す', async () => {
      const userId = 'user-123';
      const actionId = 'action-456';

      prisma.action.findUnique.mockResolvedValue({
        id: actionId,
        subGoal: {
          goal: {
            userId: userId,
          },
        },
      });

      const result = await checkActionOwnership(prisma, userId, actionId);
      expect(result).toBe(true);
      expect(prisma.action.findUnique).toHaveBeenCalledWith({
        where: { id: actionId },
        include: {
          subGoal: {
            include: {
              goal: {
                select: { userId: true },
              },
            },
          },
        },
      });
    });

    it('アクションの所有者でない場合、falseを返す', async () => {
      const userId = 'user-123';
      const actionId = 'action-456';

      prisma.action.findUnique.mockResolvedValue({
        id: actionId,
        subGoal: {
          goal: {
            userId: 'other-user',
          },
        },
      });

      const result = await checkActionOwnership(prisma, userId, actionId);
      expect(result).toBe(false);
    });

    it('アクションが存在しない場合、falseを返す', async () => {
      const userId = 'user-123';
      const actionId = 'non-existent';

      prisma.action.findUnique.mockResolvedValue(null);

      const result = await checkActionOwnership(prisma, userId, actionId);
      expect(result).toBe(false);
    });
  });

  describe('checkEditPermission', () => {
    it('目標の編集権限をチェックする', async () => {
      const userId = 'user-123';
      const entityType = 'goal';
      const entityId = 'goal-456';

      prisma.goal.findUnique.mockResolvedValue({
        id: entityId,
        userId: userId,
      });

      const result = await checkEditPermission(prisma, userId, entityType, entityId);
      expect(result).toBe(true);
    });

    it('サブ目標の編集権限をチェックする', async () => {
      const userId = 'user-123';
      const entityType = 'subgoal';
      const entityId = 'subgoal-456';

      prisma.subGoal.findUnique.mockResolvedValue({
        id: entityId,
        goal: {
          userId: userId,
        },
      });

      const result = await checkEditPermission(prisma, userId, entityType, entityId);
      expect(result).toBe(true);
    });

    it('アクションの編集権限をチェックする', async () => {
      const userId = 'user-123';
      const entityType = 'action';
      const entityId = 'action-456';

      prisma.action.findUnique.mockResolvedValue({
        id: entityId,
        subGoal: {
          goal: {
            userId: userId,
          },
        },
      });

      const result = await checkEditPermission(prisma, userId, entityType, entityId);
      expect(result).toBe(true);
    });

    it('無効なエンティティタイプの場合、falseを返す', async () => {
      const userId = 'user-123';
      const entityType = 'invalid' as any;
      const entityId = 'entity-456';

      const result = await checkEditPermission(prisma, userId, entityType, entityId);
      expect(result).toBe(false);
    });

    it('権限がない場合、falseを返す', async () => {
      const userId = 'user-123';
      const entityType = 'goal';
      const entityId = 'goal-456';

      prisma.goal.findUnique.mockResolvedValue({
        id: entityId,
        userId: 'other-user',
      });

      const result = await checkEditPermission(prisma, userId, entityType, entityId);
      expect(result).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('userIdが空文字列の場合、falseを返す', async () => {
      const result = await checkGoalOwnership(prisma, '', 'goal-456');
      expect(result).toBe(false);
    });

    it('entityIdが空文字列の場合、falseを返す', async () => {
      const result = await checkGoalOwnership(prisma, 'user-123', '');
      expect(result).toBe(false);
    });

    it('userIdがnullの場合、falseを返す', async () => {
      const result = await checkGoalOwnership(prisma, null as any, 'goal-456');
      expect(result).toBe(false);
    });

    it('entityIdがnullの場合、falseを返す', async () => {
      const result = await checkGoalOwnership(prisma, 'user-123', null as any);
      expect(result).toBe(false);
    });
  });

  describe('パフォーマンス', () => {
    it('複数の権限チェックを並列実行できる', async () => {
      const userId = 'user-123';
      const goalIds = ['goal-1', 'goal-2', 'goal-3'];

      prisma.goal.findUnique.mockResolvedValue({
        userId: userId,
      });

      const results = await Promise.all(
        goalIds.map(goalId => checkGoalOwnership(prisma, userId, goalId))
      );

      expect(results).toEqual([true, true, true]);
      expect(prisma.goal.findUnique).toHaveBeenCalledTimes(3);
    });
  });
});
