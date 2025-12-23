/**
 * Action Factory
 * アクションデータのテストファクトリー
 */

import { Action, ActionType } from '../../types/mandala';

export interface ActionFactoryOptions {
  id?: string;
  sub_goal_id?: string;
  title?: string;
  description?: string;
  background?: string;
  constraints?: string;
  type?: ActionType;
  position?: number;
  progress?: number;
}

/**
 * アクションデータを生成
 */
export function createMockAction(overrides?: ActionFactoryOptions): Action {
  return {
    id: overrides?.id || `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sub_goal_id: overrides?.sub_goal_id || 'test-subgoal-id',
    title: overrides?.title || 'テストアクション',
    description: overrides?.description || 'これはテスト用のアクションです',
    background: overrides?.background || 'テスト用の背景情報',
    constraints: overrides?.constraints || 'テスト用の制約事項',
    type: overrides?.type || ActionType.EXECUTION,
    position: overrides?.position ?? 0,
    progress: overrides?.progress ?? 0,
  };
}

/**
 * 複数のアクションデータを生成（8個）
 */
export function createMockActions(
  subGoalId: string,
  count: number = 8,
  overrides?: Omit<ActionFactoryOptions, 'sub_goal_id' | 'position'>
): Action[] {
  return Array.from({ length: count }, (_, index) =>
    createMockAction({
      ...overrides,
      sub_goal_id: subGoalId,
      position: index,
      title: overrides?.title || `テストアクション ${index + 1}`,
      type: index % 2 === 0 ? ActionType.EXECUTION : ActionType.HABIT,
    })
  );
}

/**
 * 実行アクションデータを生成
 */
export function createExecutionAction(overrides?: ActionFactoryOptions): Action {
  return createMockAction({
    ...overrides,
    type: ActionType.EXECUTION,
  });
}

/**
 * 習慣アクションデータを生成
 */
export function createHabitAction(overrides?: ActionFactoryOptions): Action {
  return createMockAction({
    ...overrides,
    type: ActionType.HABIT,
  });
}

/**
 * 進行中のアクションデータを生成
 */
export function createActiveAction(overrides?: ActionFactoryOptions): Action {
  return createMockAction({
    ...overrides,
    progress: overrides?.progress ?? 50,
  });
}

/**
 * 完了したアクションデータを生成
 */
export function createCompletedAction(overrides?: ActionFactoryOptions): Action {
  return createMockAction({
    ...overrides,
    progress: 100,
  });
}

/**
 * 未着手のアクションデータを生成
 */
export function createNotStartedAction(overrides?: ActionFactoryOptions): Action {
  return createMockAction({
    ...overrides,
    progress: 0,
  });
}
