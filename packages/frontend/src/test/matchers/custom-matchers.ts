/**
 * Custom Matchers
 * カスタムマッチャーの定義
 */

import { expect } from 'vitest';
import { Goal, GoalStatus } from '../../types/mandala';
import { SubGoal } from '../../types/mandala';
import { Action, ActionType } from '../../types/mandala';
import { Task, TaskStatus } from '../factories/task.factory';
import { Reflection } from '../factories/reflection.factory';

/**
 * 目標データが有効かどうかを検証
 */
function toBeValidGoal(received: unknown) {
  const isValid =
    typeof received === 'object' &&
    received !== null &&
    'id' in received &&
    'title' in received &&
    'description' in received &&
    'deadline' in received &&
    'status' in received &&
    'progress' in received &&
    typeof (received as Goal).id === 'string' &&
    typeof (received as Goal).title === 'string' &&
    typeof (received as Goal).description === 'string' &&
    (received as Goal).deadline instanceof Date &&
    Object.values(GoalStatus).includes((received as Goal).status) &&
    typeof (received as Goal).progress === 'number' &&
    (received as Goal).progress >= 0 &&
    (received as Goal).progress <= 100;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${JSON.stringify(received)} not to be a valid goal`
        : `Expected ${JSON.stringify(received)} to be a valid goal`,
  };
}

/**
 * サブ目標データが有効かどうかを検証
 */
function toBeValidSubGoal(received: unknown) {
  const isValid =
    typeof received === 'object' &&
    received !== null &&
    'id' in received &&
    'goal_id' in received &&
    'title' in received &&
    'description' in received &&
    'position' in received &&
    'progress' in received &&
    typeof (received as SubGoal).id === 'string' &&
    typeof (received as SubGoal).goal_id === 'string' &&
    typeof (received as SubGoal).title === 'string' &&
    typeof (received as SubGoal).description === 'string' &&
    typeof (received as SubGoal).position === 'number' &&
    (received as SubGoal).position >= 0 &&
    (received as SubGoal).position <= 7 &&
    typeof (received as SubGoal).progress === 'number' &&
    (received as SubGoal).progress >= 0 &&
    (received as SubGoal).progress <= 100;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${JSON.stringify(received)} not to be a valid subgoal`
        : `Expected ${JSON.stringify(received)} to be a valid subgoal`,
  };
}

/**
 * アクションデータが有効かどうかを検証
 */
function toBeValidAction(received: unknown) {
  const isValid =
    typeof received === 'object' &&
    received !== null &&
    'id' in received &&
    'sub_goal_id' in received &&
    'title' in received &&
    'description' in received &&
    'type' in received &&
    'position' in received &&
    'progress' in received &&
    typeof (received as Action).id === 'string' &&
    typeof (received as Action).sub_goal_id === 'string' &&
    typeof (received as Action).title === 'string' &&
    typeof (received as Action).description === 'string' &&
    Object.values(ActionType).includes((received as Action).type) &&
    typeof (received as Action).position === 'number' &&
    (received as Action).position >= 0 &&
    (received as Action).position <= 7 &&
    typeof (received as Action).progress === 'number' &&
    (received as Action).progress >= 0 &&
    (received as Action).progress <= 100;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${JSON.stringify(received)} not to be a valid action`
        : `Expected ${JSON.stringify(received)} to be a valid action`,
  };
}

/**
 * タスクデータが有効かどうかを検証
 */
function toBeValidTask(received: unknown) {
  const isValid =
    typeof received === 'object' &&
    received !== null &&
    'id' in received &&
    'actionId' in received &&
    'title' in received &&
    'type' in received &&
    'status' in received &&
    'estimatedMinutes' in received &&
    typeof (received as Task).id === 'string' &&
    typeof (received as Task).actionId === 'string' &&
    typeof (received as Task).title === 'string' &&
    typeof (received as Task).type === 'string' &&
    Object.values(TaskStatus).includes((received as Task).status) &&
    typeof (received as Task).estimatedMinutes === 'number' &&
    (received as Task).estimatedMinutes > 0;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${JSON.stringify(received)} not to be a valid task`
        : `Expected ${JSON.stringify(received)} to be a valid task`,
  };
}

/**
 * 振り返りデータが有効かどうかを検証
 */
function toBeValidReflection(received: unknown) {
  const isValid =
    typeof received === 'object' &&
    received !== null &&
    'id' in received &&
    'goalId' in received &&
    'summary' in received &&
    typeof (received as Reflection).id === 'string' &&
    typeof (received as Reflection).goalId === 'string' &&
    typeof (received as Reflection).summary === 'string' &&
    (received as Reflection).summary.length > 0;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${JSON.stringify(received)} not to be a valid reflection`
        : `Expected ${JSON.stringify(received)} to be a valid reflection`,
  };
}

/**
 * 進捗率が有効範囲内かどうかを検証
 */
function toBeValidProgress(received: unknown) {
  const isValid =
    typeof received === 'number' && received >= 0 && received <= 100 && !isNaN(received);

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${received} not to be a valid progress value`
        : `Expected ${received} to be a valid progress value (0-100)`,
  };
}

/**
 * 日付が未来かどうかを検証
 */
function toBeFutureDate(received: unknown) {
  const now = new Date();
  const isValid = received instanceof Date && received > now;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${received} not to be a future date`
        : `Expected ${received} to be a future date`,
  };
}

/**
 * 日付が過去かどうかを検証
 */
function toBePastDate(received: unknown) {
  const now = new Date();
  const isValid = received instanceof Date && received < now;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected ${received} not to be a past date`
        : `Expected ${received} to be a past date`,
  };
}

/**
 * 配列が指定された長さかどうかを検証
 */
function toHaveLength(received: unknown, expected: number) {
  const isValid = Array.isArray(received) && received.length === expected;

  return {
    pass: isValid,
    message: () =>
      isValid
        ? `Expected array not to have length ${expected}`
        : `Expected array to have length ${expected}, but got ${Array.isArray(received) ? received.length : 'not an array'}`,
  };
}

/**
 * カスタムマッチャーを登録
 */
export function setupCustomMatchers() {
  expect.extend({
    toBeValidGoal,
    toBeValidSubGoal,
    toBeValidAction,
    toBeValidTask,
    toBeValidReflection,
    toBeValidProgress,
    toBeFutureDate,
    toBePastDate,
    toHaveLength,
  });
}

/**
 * TypeScript型定義の拡張
 */
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidGoal(): T;
    toBeValidSubGoal(): T;
    toBeValidAction(): T;
    toBeValidTask(): T;
    toBeValidReflection(): T;
    toBeValidProgress(): T;
    toBeFutureDate(): T;
    toBePastDate(): T;
    toHaveLength(expected: number): T;
  }
}
