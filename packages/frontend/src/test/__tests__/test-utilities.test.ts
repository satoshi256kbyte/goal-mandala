/**
 * Test Utilities Test
 * テストユーティリティの動作確認
 */

import { describe, it, expect } from 'vitest';
import {
  createMockGoal,
  createMockGoals,
  createActiveGoal,
  createCompletedGoal,
  createDraftGoal,
} from '../factories/goal.factory';
import {
  createMockSubGoal,
  createMockSubGoals,
  createActiveSubGoal,
  createCompletedSubGoal,
} from '../factories/subgoal.factory';
import {
  createMockAction,
  createMockActions,
  createExecutionAction,
  createHabitAction,
} from '../factories/action.factory';
import {
  createMockTask,
  createMockTasks,
  createExecutionTask,
  createHabitTask,
  createCompletedTask,
} from '../factories/task.factory';
import {
  createMockReflection,
  createMockReflections,
  createDetailedReflection,
} from '../factories/reflection.factory';
import { GoalStatus } from '../../types/mandala';
import { ActionType } from '../../types/mandala';
import { TaskStatus } from '../factories/task.factory';

describe('Test Factories', () => {
  describe('Goal Factory', () => {
    it('should create a mock goal with default values', () => {
      const goal = createMockGoal();

      expect(goal).toBeValidGoal();
      expect(goal.title).toBe('テスト目標');
      expect(goal.status).toBe(GoalStatus.ACTIVE);
      expect(goal.progress).toBe(0);
    });

    it('should create a mock goal with overrides', () => {
      const goal = createMockGoal({
        title: 'カスタム目標',
        progress: 50,
      });

      expect(goal).toBeValidGoal();
      expect(goal.title).toBe('カスタム目標');
      expect(goal.progress).toBe(50);
    });

    it('should create multiple mock goals', () => {
      const goals = createMockGoals(3);

      expect(goals).toHaveLength(3);
      goals.forEach(goal => {
        expect(goal).toBeValidGoal();
      });
    });

    it('should create an active goal', () => {
      const goal = createActiveGoal();

      expect(goal).toBeValidGoal();
      expect(goal.status).toBe(GoalStatus.ACTIVE);
      expect(goal.progress).toBe(50);
    });

    it('should create a completed goal', () => {
      const goal = createCompletedGoal();

      expect(goal).toBeValidGoal();
      expect(goal.status).toBe(GoalStatus.COMPLETED);
      expect(goal.progress).toBe(100);
    });

    it('should create a draft goal', () => {
      const goal = createDraftGoal();

      expect(goal).toBeValidGoal();
      expect(goal.status).toBe(GoalStatus.DRAFT);
      expect(goal.progress).toBe(0);
    });
  });

  describe('SubGoal Factory', () => {
    it('should create a mock subgoal with default values', () => {
      const subGoal = createMockSubGoal();

      expect(subGoal).toBeValidSubGoal();
      expect(subGoal.title).toBe('テストサブ目標');
      expect(subGoal.position).toBe(0);
      expect(subGoal.progress).toBe(0);
    });

    it('should create a mock subgoal with overrides', () => {
      const subGoal = createMockSubGoal({
        title: 'カスタムサブ目標',
        position: 3,
        progress: 75,
      });

      expect(subGoal).toBeValidSubGoal();
      expect(subGoal.title).toBe('カスタムサブ目標');
      expect(subGoal.position).toBe(3);
      expect(subGoal.progress).toBe(75);
    });

    it('should create 8 mock subgoals', () => {
      const subGoals = createMockSubGoals('test-goal-id');

      expect(subGoals).toHaveLength(8);
      subGoals.forEach((subGoal, index) => {
        expect(subGoal).toBeValidSubGoal();
        expect(subGoal.position).toBe(index);
      });
    });

    it('should create an active subgoal', () => {
      const subGoal = createActiveSubGoal();

      expect(subGoal).toBeValidSubGoal();
      expect(subGoal.progress).toBe(50);
    });

    it('should create a completed subgoal', () => {
      const subGoal = createCompletedSubGoal();

      expect(subGoal).toBeValidSubGoal();
      expect(subGoal.progress).toBe(100);
    });
  });

  describe('Action Factory', () => {
    it('should create a mock action with default values', () => {
      const action = createMockAction();

      expect(action).toBeValidAction();
      expect(action.title).toBe('テストアクション');
      expect(action.type).toBe(ActionType.EXECUTION);
      expect(action.position).toBe(0);
      expect(action.progress).toBe(0);
    });

    it('should create a mock action with overrides', () => {
      const action = createMockAction({
        title: 'カスタムアクション',
        type: ActionType.HABIT,
        position: 5,
        progress: 80,
      });

      expect(action).toBeValidAction();
      expect(action.title).toBe('カスタムアクション');
      expect(action.type).toBe(ActionType.HABIT);
      expect(action.position).toBe(5);
      expect(action.progress).toBe(80);
    });

    it('should create 8 mock actions', () => {
      const actions = createMockActions('test-subgoal-id');

      expect(actions).toHaveLength(8);
      actions.forEach((action, index) => {
        expect(action).toBeValidAction();
        expect(action.position).toBe(index);
      });
    });

    it('should create an execution action', () => {
      const action = createExecutionAction();

      expect(action).toBeValidAction();
      expect(action.type).toBe(ActionType.EXECUTION);
    });

    it('should create a habit action', () => {
      const action = createHabitAction();

      expect(action).toBeValidAction();
      expect(action.type).toBe(ActionType.HABIT);
    });
  });

  describe('Task Factory', () => {
    it('should create a mock task with default values', () => {
      const task = createMockTask();

      expect(task).toBeValidTask();
      expect(task.title).toBe('テストタスク');
      expect(task.status).toBe(TaskStatus.NOT_STARTED);
      expect(task.estimatedMinutes).toBe(30);
    });

    it('should create a mock task with overrides', () => {
      const task = createMockTask({
        title: 'カスタムタスク',
        status: TaskStatus.COMPLETED,
        estimatedMinutes: 60,
      });

      expect(task).toBeValidTask();
      expect(task.title).toBe('カスタムタスク');
      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.estimatedMinutes).toBe(60);
    });

    it('should create multiple mock tasks', () => {
      const tasks = createMockTasks('test-action-id', 3);

      expect(tasks).toHaveLength(3);
      tasks.forEach(task => {
        expect(task).toBeValidTask();
      });
    });

    it('should create an execution task', () => {
      const task = createExecutionTask();

      expect(task).toBeValidTask();
      expect(task.type).toBe('execution');
    });

    it('should create a habit task', () => {
      const task = createHabitTask();

      expect(task).toBeValidTask();
      expect(task.type).toBe('habit');
    });

    it('should create a completed task', () => {
      const task = createCompletedTask();

      expect(task).toBeValidTask();
      expect(task.status).toBe(TaskStatus.COMPLETED);
      expect(task.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Reflection Factory', () => {
    it('should create a mock reflection with default values', () => {
      const reflection = createMockReflection();

      expect(reflection).toBeValidReflection();
      expect(reflection.summary).toBe('これはテスト用の振り返り総括です');
    });

    it('should create a mock reflection with overrides', () => {
      const reflection = createMockReflection({
        summary: 'カスタム振り返り',
        regretfulActions: '惜しかったアクション',
      });

      expect(reflection).toBeValidReflection();
      expect(reflection.summary).toBe('カスタム振り返り');
      expect(reflection.regretfulActions).toBe('惜しかったアクション');
    });

    it('should create multiple mock reflections', () => {
      const reflections = createMockReflections('test-goal-id', 3);

      expect(reflections).toHaveLength(3);
      reflections.forEach(reflection => {
        expect(reflection).toBeValidReflection();
      });
    });

    it('should create a detailed reflection', () => {
      const reflection = createDetailedReflection();

      expect(reflection).toBeValidReflection();
      expect(reflection.regretfulActions).toBeDefined();
      expect(reflection.slowProgressActions).toBeDefined();
      expect(reflection.untouchedActions).toBeDefined();
    });
  });
});

describe('Custom Matchers', () => {
  describe('toBeValidProgress', () => {
    it('should validate progress values', () => {
      expect(0).toBeValidProgress();
      expect(50).toBeValidProgress();
      expect(100).toBeValidProgress();
    });

    it('should reject invalid progress values', () => {
      expect(() => expect(-1).toBeValidProgress()).toThrow();
      expect(() => expect(101).toBeValidProgress()).toThrow();
      expect(() => expect(NaN).toBeValidProgress()).toThrow();
    });
  });

  describe('toBeFutureDate', () => {
    it('should validate future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(futureDate).toBeFutureDate();
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(() => expect(pastDate).toBeFutureDate()).toThrow();
    });
  });

  describe('toBePastDate', () => {
    it('should validate past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(pastDate).toBePastDate();
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(() => expect(futureDate).toBePastDate()).toThrow();
    });
  });
});
