import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';

// 入力スキーマ
const AggregateResultsInputSchema = z.object({
  goalId: z.string().uuid(),
  userId: z.string().uuid(),
  batches: z.array(
    z.object({
      batchNumber: z.number().int().positive(),
      actions: z.array(
        z.object({
          actionId: z.string().uuid(),
          status: z.enum(['success', 'failed']),
          error: z.string().optional(),
        })
      ),
    })
  ),
});

// 出力型定義
interface AggregateResultsOutput {
  goalId: string;
  userId: string;
  allSuccess: boolean;
  partialSuccess: boolean;
  successCount: number;
  failedCount: number;
  failedActions: string[];
  notificationMessage: string;
}

/**
 * Aggregate Results Lambda Handler
 *
 * 責務:
 * - 結果集約
 * - 成功/失敗カウント
 * - 失敗アクションリスト作成
 *
 * Requirements: 2.5, 14.3
 */
export async function handler(event: LambdaEvent): Promise<AggregateResultsOutput> {
  try {
    // 入力バリデーション
    const input = AggregateResultsInputSchema.parse(event);
    const { goalId, userId, batches } = input;

    logger.info('Aggregating results', { goalId, userId, batchCount: batches.length });

    // 全アクションを集約
    const allActions = batches.flatMap(batch => batch.actions);

    // 成功/失敗カウント
    const successCount = allActions.filter(action => action.status === 'success').length;
    const failedCount = allActions.filter(action => action.status === 'failed').length;

    // 失敗アクションリスト
    const failedActions = allActions
      .filter(action => action.status === 'failed')
      .map(action => action.actionId);

    // 結果判定
    const allSuccess = failedCount === 0;
    const partialSuccess = successCount > 0 && failedCount > 0;

    // 通知メッセージ作成
    let notificationMessage = '';
    if (allSuccess) {
      notificationMessage = `Goal ${goalId}: All ${successCount} actions completed successfully.`;
    } else if (partialSuccess) {
      notificationMessage = `Goal ${goalId}: ${successCount} actions succeeded, ${failedCount} actions failed. Failed actions: ${failedActions.join(', ')}`;
    } else {
      notificationMessage = `Goal ${goalId}: All ${failedCount} actions failed.`;
    }

    logger.info('Results aggregated', {
      goalId,
      userId,
      allSuccess,
      partialSuccess,
      successCount,
      failedCount,
    });

    return {
      goalId,
      userId,
      allSuccess,
      partialSuccess,
      successCount,
      failedCount,
      failedActions,
      notificationMessage,
    };
  } catch (error) {
    logger.error('Failed to aggregate results', { error });
    throw error;
  }
}
