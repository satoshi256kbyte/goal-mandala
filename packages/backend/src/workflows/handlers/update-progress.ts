import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';

const prisma = new PrismaClient();

// 入力スキーマ
const UpdateProgressInputSchema = z.object({
  executionArn: z.string(),
  processedActions: z.number().int().nonnegative(),
  totalActions: z.number().int().positive(),
  currentBatch: z.number().int().nonnegative(),
  totalBatches: z.number().int().positive(),
});

// 出力型定義
interface UpdateProgressOutput {
  executionArn: string;
  progressPercentage: number;
  estimatedTimeRemaining: number;
}

// 平均処理時間（秒/アクション）
const AVERAGE_PROCESSING_TIME_PER_ACTION = 30;

/**
 * Update Progress Lambda Handler
 *
 * 責務:
 * - 進捗率計算
 * - 推定残り時間計算
 * - データベース更新
 *
 * Requirements: 6.2, 6.3, 6.4
 */
export async function handler(event: LambdaEvent): Promise<UpdateProgressOutput> {
  try {
    // 入力バリデーション
    const input = UpdateProgressInputSchema.parse(event);
    const { executionArn, processedActions, totalActions, currentBatch, totalBatches } = input;

    logger.info('Updating progress', {
      executionArn,
      processedActions,
      totalActions,
      currentBatch,
      totalBatches,
    });

    // 進捗率計算
    const progressPercentage = Math.round((processedActions / totalActions) * 100);

    // 推定残り時間計算（秒）
    const remainingActions = totalActions - processedActions;
    const estimatedTimeRemaining = remainingActions * AVERAGE_PROCESSING_TIME_PER_ACTION;

    // データベース更新
    await prisma.workflowExecution.update({
      where: { executionArn },
      data: {
        progressPercentage,
        processedActions,
        currentBatch,
        estimatedTimeRemaining,
        updatedAt: new Date().toISOString(),
      },
    });

    logger.info('Progress updated', {
      executionArn,
      progressPercentage,
      estimatedTimeRemaining,
    });

    return {
      executionArn,
      progressPercentage,
      estimatedTimeRemaining,
    };
  } catch (error) {
    logger.error('Failed to update progress', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
