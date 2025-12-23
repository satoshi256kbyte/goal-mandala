/**
 * Reflection Factory
 * 振り返りデータのテストファクトリー
 */

export interface Reflection {
  id: string;
  goalId: string;
  summary: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReflectionFactoryOptions {
  id?: string;
  goalId?: string;
  summary?: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 振り返りデータを生成
 */
export function createMockReflection(overrides?: ReflectionFactoryOptions): Reflection {
  const now = new Date();

  return {
    id: overrides?.id || `reflection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    goalId: overrides?.goalId || 'test-goal-id',
    summary: overrides?.summary || 'これはテスト用の振り返り総括です',
    regretfulActions: overrides?.regretfulActions,
    slowProgressActions: overrides?.slowProgressActions,
    untouchedActions: overrides?.untouchedActions,
    createdAt: overrides?.createdAt || now,
    updatedAt: overrides?.updatedAt || now,
  };
}

/**
 * 複数の振り返りデータを生成
 */
export function createMockReflections(
  goalId: string,
  count: number = 3,
  overrides?: Omit<ReflectionFactoryOptions, 'goalId'>
): Reflection[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index * 7); // 1週間ごと

    return createMockReflection({
      ...overrides,
      goalId,
      summary: overrides?.summary || `振り返り ${index + 1}`,
      createdAt: date,
      updatedAt: date,
    });
  });
}

/**
 * 詳細な振り返りデータを生成
 */
export function createDetailedReflection(overrides?: ReflectionFactoryOptions): Reflection {
  return createMockReflection({
    ...overrides,
    summary: overrides?.summary || '目標に向けて順調に進んでいます',
    regretfulActions:
      overrides?.regretfulActions || 'アクション1は80%まで進んだが、最後の詰めができなかった',
    slowProgressActions:
      overrides?.slowProgressActions || 'アクション2は思ったより時間がかかっている',
    untouchedActions: overrides?.untouchedActions || 'アクション3はまだ着手できていない',
  });
}

/**
 * 簡潔な振り返りデータを生成
 */
export function createSimpleReflection(overrides?: ReflectionFactoryOptions): Reflection {
  return createMockReflection({
    ...overrides,
    summary: overrides?.summary || '今週は順調でした',
  });
}

/**
 * 最近の振り返りデータを生成
 */
export function createRecentReflection(overrides?: ReflectionFactoryOptions): Reflection {
  const now = new Date();

  return createMockReflection({
    ...overrides,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * 過去の振り返りデータを生成
 */
export function createPastReflection(
  daysAgo: number,
  overrides?: ReflectionFactoryOptions
): Reflection {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  return createMockReflection({
    ...overrides,
    createdAt: date,
    updatedAt: date,
  });
}
