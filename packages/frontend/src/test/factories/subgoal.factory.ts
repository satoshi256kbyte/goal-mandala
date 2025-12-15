/**
 * SubGoal Factory
 * サブ目標データのテストファクトリー
 */

import { SubGoal } from '../../types/mandala';

export interface SubGoalFactoryOptions {
  id?: string;
  goal_id?: string;
  title?: string;
  description?: string;
  background?: string;
  constraints?: string;
  position?: number;
  progress?: number;
}

/**
 * サブ目標データを生成
 */
export function createMockSubGoal(overrides?: SubGoalFactoryOptions): SubGoal {
  return {
    id: overrides?.id || `subgoal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    goal_id: overrides?.goal_id || 'test-goal-id',
    title: overrides?.title || 'テストサブ目標',
    description: overrides?.description || 'これはテスト用のサブ目標です',
    background: overrides?.background || 'テスト用の背景情報',
    constraints: overrides?.constraints || 'テスト用の制約事項',
    position: overrides?.position ?? 0,
    progress: overrides?.progress ?? 0,
  };
}

/**
 * 複数のサブ目標データを生成（8個）
 */
export function createMockSubGoals(
  goalId: string,
  count: number = 8,
  overrides?: Omit<SubGoalFactoryOptions, 'goal_id' | 'position'>
): SubGoal[] {
  return Array.from({ length: count }, (_, index) =>
    createMockSubGoal({
      ...overrides,
      goal_id: goalId,
      position: index,
      title: overrides?.title || `テストサブ目標 ${index + 1}`,
    })
  );
}

/**
 * 進行中のサブ目標データを生成
 */
export function createActiveSubGoal(overrides?: SubGoalFactoryOptions): SubGoal {
  return createMockSubGoal({
    ...overrides,
    progress: overrides?.progress ?? 50,
  });
}

/**
 * 完了したサブ目標データを生成
 */
export function createCompletedSubGoal(overrides?: SubGoalFactoryOptions): SubGoal {
  return createMockSubGoal({
    ...overrides,
    progress: 100,
  });
}

/**
 * 未着手のサブ目標データを生成
 */
export function createNotStartedSubGoal(overrides?: SubGoalFactoryOptions): SubGoal {
  return createMockSubGoal({
    ...overrides,
    progress: 0,
  });
}
