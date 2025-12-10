import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent, LambdaResult } from '../types/handler';

const prisma = new PrismaClient();

// 入力スキーマ
const UpdateGoalStatusInputSchema = z.object({
  goalId: z.string().uuid(),
  status: z.enum(['active', 'partial', 'failed', 'draft']),
});

/**
 * Update Goal Status Lambda Handler
 *
 * 責務:
 * - 目標ステータス更新（active/partial/failed）
 * - 完了時刻記録
 *
 * Requirements: 1.5, 14.2
 */
export async function handler(event: LambdaEvent): Promise<LambdaResult> {
  try {
    // 入力バリデーション
    const input = UpdateGoalStatusInputSchema.parse(event);
    const { goalId, status } = input;

    logger.info('Updating goal status', { goalId, status });

    // 目標ステータス更新
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    logger.info('Goal status updated', {
      goalId,
      status,
      updatedAt: updatedGoal.updatedAt,
    });

    return {
      ...event,
      goalStatus: status,
      updatedAt: updatedGoal.updatedAt.toISOString(),
    };
  } catch (error) {
    logger.error('Failed to update goal status', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
