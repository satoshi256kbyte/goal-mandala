/**
 * 目標の編集権限をチェックする
 */
export function canEditGoal(
  goal: { userId?: string } | undefined,
  currentUserId: string | undefined
): boolean {
  // 入力値の検証
  if (!goal || !currentUserId || !goal.userId) {
    return false;
  }

  return goal.userId === currentUserId;
}

/**
 * サブ目標の編集権限をチェックする
 */
export function canEditSubGoal(
  subGoal: { goalId?: string } | undefined,
  goal: { userId?: string } | undefined,
  currentUserId: string | undefined
): boolean {
  // 入力値の検証
  if (!subGoal || !goal || !currentUserId) {
    return false;
  }

  // 親の目標の所有者かどうかをチェック
  return canEditGoal(goal, currentUserId);
}

/**
 * アクションの編集権限をチェックする
 */
export function canEditAction(
  action: { subGoalId?: string } | undefined,
  goal: { userId?: string } | undefined,
  currentUserId: string | undefined
): boolean {
  // 入力値の検証
  if (!action || !goal || !currentUserId) {
    return false;
  }

  // 親の目標の所有者かどうかをチェック
  return canEditGoal(goal, currentUserId);
}

/**
 * エンティティの編集権限をチェックする
 */
export function hasEditPermission(
  entityType: 'goal' | 'subgoal' | 'action',
  entity: any,
  currentUserId: string | undefined,
  goal?: { userId?: string }
): boolean {
  switch (entityType) {
    case 'goal':
      return canEditGoal(entity, currentUserId);
    case 'subgoal':
      return canEditSubGoal(entity, goal, currentUserId);
    case 'action':
      return canEditAction(entity, goal, currentUserId);
    default:
      return false;
  }
}
