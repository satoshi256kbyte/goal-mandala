/**
 * Goal Factory
 * 目標データのテストファクトリー
 */

import { Goal, GoalStatus } from '../../types/mandala';

export interface GoalFactoryOptions {
  id?: string;
  title?: string;
  description?: string;
  deadline?: Date;
  background?: string;
  constraints?: string;
  status?: GoalStatus;
  progress?: number;
}

/**
 * 目標データを生成
 */
export function createMockGoal(overrides?: GoalFactoryOptions): Goal {
  const now = new Date();
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 3); // 3ヶ月後

  return {
    id: overrides?.id || `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: overrides?.title || 'テスト目標',
    description: overrides?.description || 'これはテスト用の目標です',
    deadline: overrides?.deadline || deadline,
    background: overrides?.background || 'テスト用の背景情報',
    constraints: overrides?.constraints || 'テスト用の制約事項',
    status: overrides?.status || GoalStatus.ACTIVE,
    progress: overrides?.progress ?? 0,
  };
}

/**
 * 複数の目標データを生成
 */
export function createMockGoals(count: number, overrides?: GoalFactoryOptions): Goal[] {
  return Array.from({ length: count }, (_, index) =>
    createMockGoal({
      ...overrides,
      title: overrides?.title || `テスト目標 ${index + 1}`,
    })
  );
}

/**
 * 進行中の目標データを生成
 */
export function createActiveGoal(overrides?: GoalFactoryOptions): Goal {
  return createMockGoal({
    ...overrides,
    status: GoalStatus.ACTIVE,
    progress: overrides?.progress ?? 50,
  });
}

/**
 * 完了した目標データを生成
 */
export function createCompletedGoal(overrides?: GoalFactoryOptions): Goal {
  return createMockGoal({
    ...overrides,
    status: GoalStatus.COMPLETED,
    progress: 100,
  });
}

/**
 * 下書きの目標データを生成
 */
export function createDraftGoal(overrides?: GoalFactoryOptions): Goal {
  return createMockGoal({
    ...overrides,
    status: GoalStatus.DRAFT,
    progress: 0,
  });
}

/**
 * 一時停止中の目標データを生成
 */
export function createPausedGoal(overrides?: GoalFactoryOptions): Goal {
  return createMockGoal({
    ...overrides,
    status: GoalStatus.PAUSED,
  });
}

/**
 * キャンセルされた目標データを生成
 */
export function createCancelledGoal(overrides?: GoalFactoryOptions): Goal {
  return createMockGoal({
    ...overrides,
    status: GoalStatus.CANCELLED,
  });
}
