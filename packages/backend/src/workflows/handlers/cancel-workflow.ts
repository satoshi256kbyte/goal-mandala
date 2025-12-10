import { SFNClient, StopExecutionCommand } from '@aws-sdk/client-sfn';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';

const prisma = new PrismaClient();
const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// 入力スキーマ
const CancelWorkflowInputSchema = z.object({
  executionArn: z.string(),
  reason: z.string().optional().default('User requested cancellation'),
});

// 出力型定義
interface CancelWorkflowOutput {
  executionArn: string;
  status: 'ABORTED';
  stopDate: string;
}

/**
 * Cancel Workflow Lambda Handler
 *
 * 責務:
 * - 実行停止
 * - 部分生成タスククリーンアップ
 * - 目標ステータス更新（draft）
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function handler(event: LambdaEvent): Promise<CancelWorkflowOutput> {
  try {
    // 入力バリデーション
    const input = CancelWorkflowInputSchema.parse(event);
    const { executionArn, reason } = input;

    logger.info('Cancelling workflow', { executionArn, reason });

    // ワークフロー実行情報を取得
    const workflowExecution = await prisma.workflowExecution.findUnique({
      where: { executionArn },
    });

    if (!workflowExecution) {
      throw new Error(`Workflow execution not found: ${executionArn}`);
    }

    const { goalId, userId } = workflowExecution;

    // Step Functions実行を停止
    const stopCommand = new StopExecutionCommand({
      executionArn,
      cause: 'ABORT',
      error: reason,
    });

    await sfnClient.send(stopCommand);

    const stopDate = new Date().toISOString();

    // データベース更新（トランザクション）
    await prisma.$transaction(async (tx: any) => {
      // ワークフロー実行ステータス更新
      await tx.workflowExecution.update({
        where: { executionArn },
        data: {
          status: 'ABORTED',
          stopDate,
          updatedAt: stopDate,
        },
      });

      // 目標ステータスを"draft"に更新
      await tx.goal.update({
        where: { id: goalId },
        data: {
          status: 'draft',
          updatedAt: new Date(),
        },
      });

      // 部分生成タスクのクリーンアップ（オプション）
      // Note: 部分生成されたタスクを削除するかどうかは要件次第
      // 現在は保持する方針とする
    });

    logger.info('Workflow cancelled', {
      executionArn,
      goalId,
      userId,
      reason,
      stopDate,
    });

    return {
      executionArn,
      status: 'ABORTED',
      stopDate,
    };
  } catch (error) {
    logger.error('Failed to cancel workflow', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
