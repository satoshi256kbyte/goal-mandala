import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent, LambdaResult } from '../types/handler';

const prisma = new PrismaClient();

// 入力スキーマ
const ValidateInputSchema = z.object({
  goalId: z.string().uuid(),
  userId: z.string().uuid(),
  actionIds: z.array(z.string().uuid()).min(1),
});

/**
 * Validate Input Lambda Handler
 *
 * 責務:
 * - goalId検証
 * - userId検証
 * - アクション存在確認
 *
 * Requirements: 1.2
 */
export async function handler(event: LambdaEvent): Promise<LambdaResult> {
  try {
    // 入力バリデーション
    const input = ValidateInputSchema.parse(event);
    const { goalId, userId, actionIds } = input;

    logger.info('Validating workflow input', { goalId, userId, actionCount: actionIds.length });

    // goalId検証
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // userId検証
    if (goal.userId !== userId) {
      throw new Error(`User ${userId} does not own goal ${goalId}`);
    }

    // アクション存在確認
    const actions = await prisma.action.findMany({
      where: {
        id: { in: actionIds },
      },
    });

    if (actions.length !== actionIds.length) {
      const foundIds = actions.map(a => a.id);
      const missingIds = actionIds.filter(id => !foundIds.includes(id));
      throw new Error(`Actions not found: ${missingIds.join(', ')}`);
    }

    // 全てのアクションが目標に属していることを確認
    const subGoalIds = await prisma.subGoal.findMany({
      where: { goalId },
      select: { id: true },
    });

    const validSubGoalIds = new Set(subGoalIds.map(sg => sg.id));
    const invalidActions = actions.filter(action => !validSubGoalIds.has(action.subGoalId));

    if (invalidActions.length > 0) {
      throw new Error(
        `Actions do not belong to goal ${goalId}: ${invalidActions.map(a => a.id).join(', ')}`
      );
    }

    logger.info('Input validation successful', { goalId, userId, actionCount: actionIds.length });

    return {
      ...input,
      validated: true,
    };
  } catch (error) {
    logger.error('Input validation failed', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
