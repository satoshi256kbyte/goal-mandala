import { PrismaClient } from '../generated/prisma-client';
import { logger } from './logger';

/**
 * 目標の所有権をチェックする
 */
export async function checkGoalOwnership(
  prisma: PrismaClient,
  userId: string,
  goalId: string
): Promise<boolean> {
  try {
    // 入力値の検証
    if (!userId || !goalId) {
      return false;
    }

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { userId: true },
    });

    if (!goal) {
      return false;
    }

    return goal.userId === userId;
  } catch (error) {
    logger.error('Error checking goal ownership', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      goalId,
    });
    return false;
  }
}

/**
 * サブ目標の所有権をチェックする
 */
export async function checkSubGoalOwnership(
  prisma: PrismaClient,
  userId: string,
  subGoalId: string
): Promise<boolean> {
  try {
    // 入力値の検証
    if (!userId || !subGoalId) {
      return false;
    }

    const subGoal = await prisma.subGoal.findUnique({
      where: { id: subGoalId },
      include: {
        goal: {
          select: { userId: true },
        },
      },
    });

    if (!subGoal || !subGoal.goal) {
      return false;
    }

    return subGoal.goal.userId === userId;
  } catch (error) {
    logger.error('Error checking subgoal ownership', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      subGoalId,
    });
    return false;
  }
}

/**
 * アクションの所有権をチェックする
 */
export async function checkActionOwnership(
  prisma: PrismaClient,
  userId: string,
  actionId: string
): Promise<boolean> {
  try {
    // 入力値の検証
    if (!userId || !actionId) {
      return false;
    }

    const action = await prisma.action.findUnique({
      where: { id: actionId },
      include: {
        subGoal: {
          include: {
            goal: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!action || !action.subGoal || !action.subGoal.goal) {
      return false;
    }

    return action.subGoal.goal.userId === userId;
  } catch (error) {
    logger.error('Error checking action ownership', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      actionId,
    });
    return false;
  }
}

/**
 * エンティティの編集権限をチェックする
 */
export async function checkEditPermission(
  prisma: PrismaClient,
  userId: string,
  entityType: 'goal' | 'subgoal' | 'action',
  entityId: string
): Promise<boolean> {
  try {
    switch (entityType) {
      case 'goal':
        return await checkGoalOwnership(prisma, userId, entityId);
      case 'subgoal':
        return await checkSubGoalOwnership(prisma, userId, entityId);
      case 'action':
        return await checkActionOwnership(prisma, userId, entityId);
      default:
        logger.warn('Invalid entity type', { entityType });
        return false;
    }
  } catch (error) {
    logger.error('Error checking edit permission', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      entityType,
      entityId,
    });
    return false;
  }
}
