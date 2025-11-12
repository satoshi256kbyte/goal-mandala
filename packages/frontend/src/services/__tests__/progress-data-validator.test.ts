/**
 * 進捗データ検証サービスのテスト
 * 要件: 全要件 - データ整合性検証
 */

import { ProgressDataValidator } from '../progress-data-validator';
import { TaskStatus } from '../../types/progress';
import { ActionType } from '../../types/mandala';

describe('ProgressDataValidator', () => {
  let validator: ProgressDataValidator;

  beforeEach(() => {
    validator = new ProgressDataValidator();
  });

  describe('タスクデータの検証', () => {
    const validTask = {
      id: 'task-123',
      actionId: 'action-456',
      title: 'Test Task',
      status: TaskStatus.PENDING,
      estimatedMinutes: 60,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('有効なタスクデータを正しく検証する', () => {
      const result = validator.validateTask(validTask);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('必須フィールドが不足している場合にエラーを返す', () => {
      const invalidTask = { ...validTask, id: '' };
      const result = validator.validateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task ID is required and must be a string');
    });

    it('無効なステータスの場合にエラーを返す', () => {
      const invalidTask = { ...validTask, status: 'invalid' as TaskStatus };
      const result = validator.validateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid task status'))).toBe(true);
    });

    it('推定時間が負の値の場合にエラーを返す', () => {
      const invalidTask = { ...validTask, estimatedMinutes: -10 };
      const result = validator.validateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Estimated minutes must be a positive number');
    });

    it('推定時間が異常に大きい場合に警告を返す', () => {
      const taskWithLongTime = { ...validTask, estimatedMinutes: 500 };
      const result = validator.validateTask(taskWithLongTime);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Estimated minutes is unusually high (over 8 hours)');
    });

    it('完了日時が未来の場合にエラーを返す', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const invalidTask = {
        ...validTask,
        status: TaskStatus.COMPLETED,
        completedAt: futureDate,
      };
      const result = validator.validateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Completed date cannot be in the future');
    });

    it('作成日時が更新日時より後の場合にエラーを返す', () => {
      const invalidTask = {
        ...validTask,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-01'),
      };
      const result = validator.validateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Created date cannot be after updated date');
    });
  });

  describe('アクションデータの検証', () => {
    const validAction = {
      id: 'action-123',
      subGoalId: 'subgoal-456',
      title: 'Test Action',
      type: ActionType.EXECUTION,
      position: 3,
      progress: 50,
      tasks: [],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('有効なアクションデータを正しく検証する', () => {
      const result = validator.validateAction(validAction);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('位置が範囲外の場合にエラーを返す', () => {
      const invalidAction = { ...validAction, position: 10 };
      const result = validator.validateAction(invalidAction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action position must be a number between 0 and 7');
    });

    it('進捗値が範囲外の場合にエラーを返す', () => {
      const invalidAction = { ...validAction, progress: 150 };
      const result = validator.validateAction(invalidAction);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action progress must be a number between 0 and 100');
    });

    it('無効なアクションタイプの場合にエラーを返す', () => {
      const invalidAction = { ...validAction, type: 'invalid' as ActionType };
      const result = validator.validateAction(invalidAction);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid action type'))).toBe(true);
    });
  });

  describe('サブ目標データの検証', () => {
    const validSubGoal = {
      id: 'subgoal-123',
      goalId: 'goal-456',
      title: 'Test SubGoal',
      position: 2,
      progress: 75,
      actions: Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        subGoalId: 'subgoal-123',
        title: `Action ${i}`,
        type: ActionType.EXECUTION,
        position: i,
        progress: 75,
        tasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('有効なサブ目標データを正しく検証する', () => {
      const result = validator.validateSubGoal(validSubGoal);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('アクション数が8個でない場合に警告を返す', () => {
      const subGoalWithFewActions = {
        ...validSubGoal,
        actions: validSubGoal.actions.slice(0, 5),
      };
      const result = validator.validateSubGoal(subGoalWithFewActions);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('SubGoal should have 8 actions, but has 5');
    });

    it('アクションの位置が重複している場合にエラーを返す', () => {
      const subGoalWithDuplicatePositions = {
        ...validSubGoal,
        actions: [
          ...validSubGoal.actions.slice(0, 7),
          { ...validSubGoal.actions[7], position: 0 }, // 位置0を重複
        ],
      };
      const result = validator.validateSubGoal(subGoalWithDuplicatePositions);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action positions must be unique within a subgoal');
    });
  });

  describe('目標データの検証', () => {
    const validGoal = {
      id: 'goal-123',
      userId: 'user-456',
      title: 'Test Goal',
      deadline: new Date('2024-12-31'),
      progress: 60,
      subGoals: Array.from({ length: 8 }, (_, i) => ({
        id: `subgoal-${i}`,
        goalId: 'goal-123',
        title: `SubGoal ${i}`,
        position: i,
        progress: 60,
        actions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('有効な目標データを正しく検証する', () => {
      const result = validator.validateGoal(validGoal);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('期限が過去の場合に警告を返す', () => {
      const goalWithPastDeadline = {
        ...validGoal,
        deadline: new Date('2020-01-01'),
      };
      const result = validator.validateGoal(goalWithPastDeadline);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Goal deadline is in the past');
    });

    it('サブ目標数が8個でない場合に警告を返す', () => {
      const goalWithFewSubGoals = {
        ...validGoal,
        subGoals: validGoal.subGoals.slice(0, 5),
      };
      const result = validator.validateGoal(goalWithFewSubGoals);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Goal should have 8 subgoals, but has 5');
    });
  });

  describe('進捗値の検証', () => {
    it('有効な進捗値を正しく検証する', () => {
      const result = validator.validateProgressValue(75, 'task', 'task-123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('NaNの進捗値の場合にエラーを返す', () => {
      const result = validator.validateProgressValue(NaN, 'task', 'task-123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Progress value is NaN for task task-123');
    });

    it('範囲外の進捗値の場合にエラーを返す', () => {
      const result = validator.validateProgressValue(150, 'task', 'task-123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Progress value must be between 0 and 100 for task task-123, got 150'
      );
    });

    it('特別な値（-1, -2）を正しく処理する', () => {
      const result1 = validator.validateProgressValue(-1, 'task', 'task-123');
      expect(result1.isValid).toBe(true);

      const result2 = validator.validateProgressValue(-2, 'task', 'task-123');
      expect(result2.isValid).toBe(true);
      expect(result2.warnings).toContain('Progress value indicates error state for task task-123');
    });

    describe('境界値テスト', () => {
      it('進捗値0%を正しく検証する', () => {
        const result = validator.validateProgressValue(0, 'task', 'task-123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('進捗値100%を正しく検証する', () => {
        const result = validator.validateProgressValue(100, 'task', 'task-123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('進捗値-1%でエラーを返す（特別な値以外）', () => {
        const result = validator.validateProgressValue(-3, 'task', 'task-123');
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => error.includes('must be between'))).toBe(true);
      });

      it('進捗値101%でエラーを返す', () => {
        const result = validator.validateProgressValue(101, 'task', 'task-123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Progress value must be between 0 and 100 for task task-123, got 101'
        );
      });

      it('進捗値-1（特別な値）を正しく処理する', () => {
        const result = validator.validateProgressValue(-1, 'task', 'task-123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('進捗値-2（エラー状態）を正しく処理する', () => {
        const result = validator.validateProgressValue(-2, 'task', 'task-123');
        expect(result.isValid).toBe(true);
        expect(result.warnings).toContain('Progress value indicates error state for task task-123');
      });

      it('小数点を含む進捗値を正しく検証する', () => {
        const result = validator.validateProgressValue(50.5, 'task', 'task-123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('非常に小さい正の値を正しく検証する', () => {
        const result = validator.validateProgressValue(0.1, 'task', 'task-123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('100に非常に近い値を正しく検証する', () => {
        const result = validator.validateProgressValue(99.9, 'task', 'task-123');
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('無効な進捗値のエラーハンドリング', () => {
      it('文字列の進捗値でエラーを返す', () => {
        const result = validator.validateProgressValue('50' as any, 'task', 'task-123');
        expect(result.isValid).toBe(false);
      });

      it('nullの進捗値でエラーを返す', () => {
        const result = validator.validateProgressValue(null as any, 'task', 'task-123');
        expect(result.isValid).toBe(false);
      });

      it('undefinedの進捗値でエラーを返す', () => {
        const result = validator.validateProgressValue(undefined as any, 'task', 'task-123');
        expect(result.isValid).toBe(false);
      });

      it('Infinityの進捗値でエラーを返す', () => {
        const result = validator.validateProgressValue(Infinity, 'task', 'task-123');
        expect(result.isValid).toBe(false);
      });

      it('-Infinityの進捗値でエラーを返す', () => {
        const result = validator.validateProgressValue(-Infinity, 'task', 'task-123');
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('循環依存のチェック', () => {
    it('循環依存がない場合に成功を返す', () => {
      const result = validator.checkCircularDependency('entity-1', ['entity-2', 'entity-3']);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('循環依存がある場合にエラーを返す', () => {
      const result = validator.checkCircularDependency('entity-1', ['entity-1']);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Circular dependency detected'))).toBe(
        true
      );
    });
  });

  describe('データ整合性の包括的チェック', () => {
    const completeGoal = {
      id: 'goal-123',
      userId: 'user-456',
      title: 'Complete Goal',
      deadline: new Date('2024-12-31'),
      progress: 50,
      subGoals: Array.from({ length: 8 }, (_, i) => ({
        id: `subgoal-${i}`,
        goalId: 'goal-123',
        title: `SubGoal ${i}`,
        position: i,
        progress: 50,
        actions: Array.from({ length: 8 }, (_, j) => ({
          id: `action-${i}-${j}`,
          subGoalId: `subgoal-${i}`,
          title: `Action ${i}-${j}`,
          type: ActionType.EXECUTION,
          position: j,
          progress: 50,
          tasks: [
            {
              id: `task-${i}-${j}-1`,
              actionId: `action-${i}-${j}`,
              title: `Task ${i}-${j}-1`,
              status: TaskStatus.COMPLETED,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              id: `task-${i}-${j}-2`,
              actionId: `action-${i}-${j}`,
              title: `Task ${i}-${j}-2`,
              status: TaskStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('完全なマンダラチャート構造を正しく検証する', () => {
      const result = validator.validateDataIntegrity(completeGoal);
      expect(result.isValid).toBe(true);
    });

    it('進捗の不整合を検出する', () => {
      const goalWithInconsistentProgress = {
        ...completeGoal,
        progress: 90, // サブ目標の進捗（50%）と大きく異なる
      };
      const result = validator.validateDataIntegrity(goalWithInconsistentProgress);
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('progress inconsistency'))).toBe(
        true
      );
    });
  });
});
