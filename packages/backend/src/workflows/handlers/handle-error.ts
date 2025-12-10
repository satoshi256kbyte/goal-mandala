import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent, LambdaResult } from '../types/handler';

const prisma = new PrismaClient();

// 入力スキーマ
const HandleErrorInputSchema = z.object({
  executionArn: z.string().optional(),
  goalId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  error: z.object({
    Error: z.string(),
    Cause: z.string(),
  }),
});

/**
 * Handle Error Lambda Handler
 *
 * 責務:
 * - エラーログ記録
 * - エラー通知準備
 *
 * Requirements: 3.5, 7.4
 */
export async function handler(event: LambdaEvent): Promise<LambdaResult> {
  try {
    // 入力バリデーション
    const input = HandleErrorInputSchema.parse(event);
    const { executionArn, goalId, userId, error } = input;

    logger.error('Workflow error occurred', {
      executionArn,
      goalId,
      userId,
      errorType: error.Error,
      errorCause: error.Cause,
    });

    // エラー情報をデータベースに記録
    if (executionArn) {
      try {
        await prisma.workflowExecution.update({
          where: { executionArn },
          data: {
            status: 'FAILED',
            stopDate: new Date().toISOString(),
            output: {
              error: {
                type: error.Error,
                message: error.Cause,
              },
            },
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (dbError) {
        logger.error('Failed to update workflow execution with error', { dbError });
      }
    }

    // エラー通知準備（SNSトピックへの発行は State Machine定義で実施）
    const notificationMessage = {
      executionArn,
      goalId,
      userId,
      errorType: error.Error,
      errorMessage: error.Cause,
      timestamp: new Date().toISOString(),
    };

    logger.info('Error notification prepared', { notificationMessage });

    return {
      ...event,
      errorHandled: true,
      notificationMessage: JSON.stringify(notificationMessage),
    };
  } catch (handlerError) {
    logger.error('Failed to handle error', { handlerError });
    // エラーハンドラー自体がエラーになった場合でも、元のエラー情報を返す
    return {
      ...event,
      errorHandled: false,
      handlerError: handlerError instanceof Error ? handlerError.message : 'Unknown error',
    };
  } finally {
    await prisma.$disconnect();
  }
}
