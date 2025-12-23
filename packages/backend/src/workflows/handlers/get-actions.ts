import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent, LambdaResult } from '../types/handler';

const prisma = new PrismaClient();

// 入力スキーマ
const GetActionsInputSchema = z.object({
  goalId: z.string().uuid(),
  userId: z.string().uuid(),
  actionIds: z.array(z.string().uuid()).min(1),
  validated: z.boolean().optional(),
});

// アクションコンテキスト型定義
interface ActionContext {
  actionId: string;
  title: string;
  description: string;
  type: 'execution' | 'habit';
  background: string;
  constraints: string | null;
  subGoalTitle: string;
  subGoalDescription: string;
}

/**
 * Get Actions Lambda Handler
 *
 * 責務:
 * - 目標に紐づくアクション取得
 * - アクションコンテキスト取得
 *
 * Requirements: 2.1
 */
export async function handler(event: LambdaEvent): Promise<LambdaResult> {
  try {
    // 入力バリデーション
    const input = GetActionsInputSchema.parse(event);
    const { goalId, userId, actionIds } = input;

    logger.info('Getting actions', { goalId, userId, actionCount: actionIds.length });

    // 目標情報取得
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        background: true,
        constraints: true,
      },
    });

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    // アクション情報取得（サブ目標情報を含む）
    const actions = await prisma.action.findMany({
      where: {
        id: { in: actionIds },
      },
      include: {
        subGoal: {
          select: {
            id: true,
            title: true,
            description: true,
            background: true,
            constraints: true,
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    if (actions.length !== actionIds.length) {
      throw new Error(`Some actions not found`);
    }

    // アクションコンテキストを構築
    const actionContexts: ActionContext[] = actions.map(action => ({
      actionId: action.id,
      title: action.title,
      description: action.description,
      type: action.type as 'execution' | 'habit',
      background: action.background,
      constraints: action.constraints,
      subGoalTitle: action.subGoal.title,
      subGoalDescription: action.subGoal.description,
    }));

    logger.info('Actions retrieved successfully', {
      goalId,
      userId,
      actionCount: actionContexts.length,
    });

    return {
      ...input,
      goalContext: {
        goalId: goal.id,
        title: goal.title,
        description: goal.description,
        deadline: goal.deadline.toISOString(),
        background: goal.background,
        constraints: goal.constraints,
      },
      actions: actionContexts,
    };
  } catch (error) {
    logger.error('Failed to get actions', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
