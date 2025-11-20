import { canEditGoal, canEditSubGoal, canEditAction } from './permissions';

describe('Frontend 権限チェック', () => {
  describe('canEditGoal', () => {
    it('目標の所有者の場合、trueを返す', () => {
      const currentUserId = 'user-123';
      const goal = {
        id: 'goal-456',
        userId: 'user-123',
        title: 'Test Goal',
      };

      const result = canEditGoal(goal, currentUserId);
      expect(result).toBe(true);
    });

    it('目標の所有者でない場合、falseを返す', () => {
      const currentUserId = 'user-123';
      const goal = {
        id: 'goal-456',
        userId: 'other-user',
        title: 'Test Goal',
      };

      const result = canEditGoal(goal, currentUserId);
      expect(result).toBe(false);
    });

    it('currentUserIdが未定義の場合、falseを返す', () => {
      const goal = {
        id: 'goal-456',
        userId: 'user-123',
        title: 'Test Goal',
      };

      const result = canEditGoal(goal, undefined);
      expect(result).toBe(false);
    });

    it('goalが未定義の場合、falseを返す', () => {
      const currentUserId = 'user-123';
      const result = canEditGoal(undefined as any, currentUserId);
      expect(result).toBe(false);
    });

    it('goal.userIdが未定義の場合、falseを返す', () => {
      const currentUserId = 'user-123';
      const goal = {
        id: 'goal-456',
        userId: undefined as any,
        title: 'Test Goal',
      };

      const result = canEditGoal(goal, currentUserId);
      expect(result).toBe(false);
    });
  });

  describe('canEditSubGoal', () => {
    it('サブ目標の所有者の場合、trueを返す', () => {
      const currentUserId = 'user-123';
      const subGoal = {
        id: 'subgoal-456',
        goalId: 'goal-789',
        title: 'Test SubGoal',
      };
      const goal = {
        id: 'goal-789',
        userId: 'user-123',
        title: 'Test Goal',
      };

      const result = canEditSubGoal(subGoal, goal, currentUserId);
      expect(result).toBe(true);
    });

    it('サブ目標の所有者でない場合、falseを返す', () => {
      const currentUserId = 'user-123';
      const subGoal = {
        id: 'subgoal-456',
        goalId: 'goal-789',
        title: 'Test SubGoal',
      };
      const goal = {
        id: 'goal-789',
        userId: 'other-user',
        title: 'Test Goal',
      };

      const result = canEditSubGoal(subGoal, goal, currentUserId);
      expect(result).toBe(false);
    });

    it('goalが未定義の場合、falseを返す', () => {
      const currentUserId = 'user-123';
      const subGoal = {
        id: 'subgoal-456',
        goalId: 'goal-789',
        title: 'Test SubGoal',
      };

      const result = canEditSubGoal(subGoal, undefined as any, currentUserId);
      expect(result).toBe(false);
    });
  });

  describe('canEditAction', () => {
    it('アクションの所有者の場合、trueを返す', () => {
      const currentUserId = 'user-123';
      const action = {
        id: 'action-456',
        subGoalId: 'subgoal-789',
        title: 'Test Action',
      };
      const goal = {
        id: 'goal-999',
        userId: 'user-123',
        title: 'Test Goal',
      };

      const result = canEditAction(action, goal, currentUserId);
      expect(result).toBe(true);
    });

    it('アクションの所有者でない場合、falseを返す', () => {
      const currentUserId = 'user-123';
      const action = {
        id: 'action-456',
        subGoalId: 'subgoal-789',
        title: 'Test Action',
      };
      const goal = {
        id: 'goal-999',
        userId: 'other-user',
        title: 'Test Goal',
      };

      const result = canEditAction(action, goal, currentUserId);
      expect(result).toBe(false);
    });
  });

  describe('hasEditPermission', () => {
    const currentUserId = 'user-123';
    const goal = {
      id: 'goal-456',
      userId: 'user-123',
      title: 'Test Goal',
    };

    it('目標の編集権限をチェックする', () => {
      const result = hasEditPermission('goal', goal, currentUserId);
      expect(result).toBe(true);
    });

    it('サブ目標の編集権限をチェックする', () => {
      const subGoal = {
        id: 'subgoal-456',
        goalId: 'goal-456',
        title: 'Test SubGoal',
      };

      const result = hasEditPermission('subgoal', subGoal, currentUserId, goal);
      expect(result).toBe(true);
    });

    it('アクションの編集権限をチェックする', () => {
      const action = {
        id: 'action-456',
        subGoalId: 'subgoal-456',
        title: 'Test Action',
      };

      const result = hasEditPermission('action', action, currentUserId, goal);
      expect(result).toBe(true);
    });

    it('無効なエンティティタイプの場合、falseを返す', () => {
      const result = hasEditPermission('invalid' as any, goal, currentUserId);
      expect(result).toBe(false);
    });

    it('権限がない場合、falseを返す', () => {
      const otherUserGoal = {
        id: 'goal-456',
        userId: 'other-user',
        title: 'Test Goal',
      };

      const result = hasEditPermission('goal', otherUserGoal, currentUserId);
      expect(result).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('空文字列のuserIdを処理する', () => {
      const goal = {
        id: 'goal-456',
        userId: '',
        title: 'Test Goal',
      };

      const result = canEditGoal(goal, '');
      expect(result).toBe(false);
    });

    it('nullのuserIdを処理する', () => {
      const goal = {
        id: 'goal-456',
        userId: null as any,
        title: 'Test Goal',
      };

      const result = canEditGoal(goal, 'user-123');
      expect(result).toBe(false);
    });

    it('大文字小文字を区別する', () => {
      const goal = {
        id: 'goal-456',
        userId: 'User-123',
        title: 'Test Goal',
      };

      const result = canEditGoal(goal, 'user-123');
      expect(result).toBe(false);
    });
  });

  describe('パフォーマンス', () => {
    it('複数の権限チェックを効率的に実行できる', () => {
      const currentUserId = 'user-123';
      const goals = Array.from({ length: 100 }, (_, i) => ({
        id: `goal-${i}`,
        userId: i % 2 === 0 ? 'user-123' : 'other-user',
        title: `Goal ${i}`,
      }));

      const start = performance.now();
      const results = goals.map(goal => canEditGoal(goal, currentUserId));
      const end = performance.now();

      expect(results.filter(r => r).length).toBe(50);
      expect(end - start).toBeLessThan(10); // 10ms以内
    });
  });
});
