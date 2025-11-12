import {
  checkGoalOwnership,
  checkSubGoalOwnership,
  checkActionOwnership,
  checkEditPermission,
} from '../permissions';

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

describe('Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkGoalOwnership', () => {
    it('入力値が空の場合はfalseを返す', async () => {
      expect(await checkGoalOwnership(mockPrisma as any, '', 'goal1')).toBe(false);
      expect(await checkGoalOwnership(mockPrisma as any, 'user1', '')).toBe(false);
    });

    it('目標が存在しない場合はfalseを返す', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);
      expect(await checkGoalOwnership(mockPrisma as any, 'user1', 'goal1')).toBe(false);
    });

    it('所有者が一致する場合はtrueを返す', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ userId: 'user1' });
      expect(await checkGoalOwnership(mockPrisma as any, 'user1', 'goal1')).toBe(true);
    });

    it('所有者が一致しない場合はfalseを返す', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ userId: 'user2' });
      expect(await checkGoalOwnership(mockPrisma as any, 'user1', 'goal1')).toBe(false);
    });

    it('エラーが発生した場合はfalseを返す', async () => {
      mockPrisma.goal.findUnique.mockRejectedValue(new Error('Database error'));
      expect(await checkGoalOwnership(mockPrisma as any, 'user1', 'goal1')).toBe(false);
    });
  });

  describe('checkSubGoalOwnership', () => {
    it('入力値が空の場合はfalseを返す', async () => {
      expect(await checkSubGoalOwnership(mockPrisma as any, '', 'subgoal1')).toBe(false);
      expect(await checkSubGoalOwnership(mockPrisma as any, 'user1', '')).toBe(false);
    });

    it('サブ目標が存在しない場合はfalseを返す', async () => {
      mockPrisma.subGoal.findUnique.mockResolvedValue(null);
      expect(await checkSubGoalOwnership(mockPrisma as any, 'user1', 'subgoal1')).toBe(false);
    });

    it('goalが存在しない場合はfalseを返す', async () => {
      mockPrisma.subGoal.findUnique.mockResolvedValue({ goal: null });
      expect(await checkSubGoalOwnership(mockPrisma as any, 'user1', 'subgoal1')).toBe(false);
    });

    it('所有者が一致する場合はtrueを返す', async () => {
      mockPrisma.subGoal.findUnique.mockResolvedValue({ goal: { userId: 'user1' } });
      expect(await checkSubGoalOwnership(mockPrisma as any, 'user1', 'subgoal1')).toBe(true);
    });

    it('エラーが発生した場合はfalseを返す', async () => {
      mockPrisma.subGoal.findUnique.mockRejectedValue(new Error('Database error'));
      expect(await checkSubGoalOwnership(mockPrisma as any, 'user1', 'subgoal1')).toBe(false);
    });
  });

  describe('checkActionOwnership', () => {
    it('入力値が空の場合はfalseを返す', async () => {
      expect(await checkActionOwnership(mockPrisma as any, '', 'action1')).toBe(false);
      expect(await checkActionOwnership(mockPrisma as any, 'user1', '')).toBe(false);
    });

    it('アクションが存在しない場合はfalseを返す', async () => {
      mockPrisma.action.findUnique.mockResolvedValue(null);
      expect(await checkActionOwnership(mockPrisma as any, 'user1', 'action1')).toBe(false);
    });

    it('subGoalが存在しない場合はfalseを返す', async () => {
      mockPrisma.action.findUnique.mockResolvedValue({ subGoal: null });
      expect(await checkActionOwnership(mockPrisma as any, 'user1', 'action1')).toBe(false);
    });

    it('goalが存在しない場合はfalseを返す', async () => {
      mockPrisma.action.findUnique.mockResolvedValue({ subGoal: { goal: null } });
      expect(await checkActionOwnership(mockPrisma as any, 'user1', 'action1')).toBe(false);
    });

    it('所有者が一致する場合はtrueを返す', async () => {
      mockPrisma.action.findUnique.mockResolvedValue({
        subGoal: { goal: { userId: 'user1' } },
      });
      expect(await checkActionOwnership(mockPrisma as any, 'user1', 'action1')).toBe(true);
    });

    it('エラーが発生した場合はfalseを返す', async () => {
      mockPrisma.action.findUnique.mockRejectedValue(new Error('Database error'));
      expect(await checkActionOwnership(mockPrisma as any, 'user1', 'action1')).toBe(false);
    });
  });

  describe('checkEditPermission', () => {
    it('goalタイプの場合はcheckGoalOwnershipを呼び出す', async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({ userId: 'user1' });
      const result = await checkEditPermission(mockPrisma as any, 'user1', 'goal', 'goal1');
      expect(result).toBe(true);
    });

    it('subgoalタイプの場合はcheckSubGoalOwnershipを呼び出す', async () => {
      mockPrisma.subGoal.findUnique.mockResolvedValue({ goal: { userId: 'user1' } });
      const result = await checkEditPermission(mockPrisma as any, 'user1', 'subgoal', 'subgoal1');
      expect(result).toBe(true);
    });

    it('actionタイプの場合はcheckActionOwnershipを呼び出す', async () => {
      mockPrisma.action.findUnique.mockResolvedValue({
        subGoal: { goal: { userId: 'user1' } },
      });
      const result = await checkEditPermission(mockPrisma as any, 'user1', 'action', 'action1');
      expect(result).toBe(true);
    });

    it('無効なentityTypeの場合はfalseを返す', async () => {
      const result = await checkEditPermission(
        mockPrisma as any,
        'user1',
        'invalid' as any,
        'entity1'
      );
      expect(result).toBe(false);
    });

    it('エラーが発生した場合はfalseを返す', async () => {
      mockPrisma.goal.findUnique.mockRejectedValue(new Error('Database error'));
      const result = await checkEditPermission(mockPrisma as any, 'user1', 'goal', 'goal1');
      expect(result).toBe(false);
    });
  });
});
