import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent, LambdaResult } from '../types/handler';

// 入力スキーマ
const CreateBatchesInputSchema = z.object({
  goalId: z.string().uuid(),
  userId: z.string().uuid(),
  actionIds: z.array(z.string().uuid()).min(1),
  goalContext: z.object({
    goalId: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    deadline: z.string(),
    background: z.string(),
    constraints: z.string().nullable(),
  }),
  actions: z.array(
    z.object({
      actionId: z.string().uuid(),
      title: z.string(),
      description: z.string(),
      type: z.enum(['execution', 'habit']),
      background: z.string(),
      constraints: z.string().nullable(),
      subGoalTitle: z.string(),
      subGoalDescription: z.string(),
    })
  ),
});

const BATCH_SIZE = 8;

/**
 * Create Batches Lambda Handler
 *
 * 責務:
 * - アクションをバッチに分割（最大8/バッチ）
 * - バッチ順序の維持
 *
 * Requirements: 2.1, 2.4
 */
export async function handler(event: LambdaEvent): Promise<LambdaResult> {
  try {
    // 入力バリデーション
    const input = CreateBatchesInputSchema.parse(event);
    const { goalId, userId, actions, goalContext } = input;

    logger.info('Creating batches', { goalId, userId, actionCount: actions.length });

    // アクションをバッチに分割
    const batches = [];
    for (let i = 0; i < actions.length; i += BATCH_SIZE) {
      const batchActions = actions.slice(i, i + BATCH_SIZE);
      batches.push({
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        actions: batchActions,
      });
    }

    logger.info('Batches created', {
      goalId,
      userId,
      totalBatches: batches.length,
      batchSize: BATCH_SIZE,
    });

    return {
      goalId,
      userId,
      goalContext,
      batches,
      totalBatches: batches.length,
      totalActions: actions.length,
    };
  } catch (error) {
    logger.error('Failed to create batches', { error });
    throw error;
  }
}
