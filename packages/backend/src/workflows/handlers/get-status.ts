import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';

const prisma = new PrismaClient();
const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// 入力スキーマ
const GetStatusInputSchema = z.object({
  executionArn: z.string(),
});

// 出力型定義
interface GetStatusOutput {
  executionArn: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  startDate: string;
  stopDate?: string;
  progressPercentage: number;
  processedActions: number;
  totalActions: number;
  failedActions: string[];
  error?: string;
}

/**
 * Get Status Lambda Handler
 *
 * 責務:
 * - 実行状況取得
 * - 進捗情報取得
 *
 * Requirements: 6.3
 */
export async function handler(event: LambdaEvent): Promise<GetStatusOutput> {
  try {
    // 入力バリデーション
    const input = GetStatusInputSchema.parse(event);
    const { executionArn } = input;

    logger.info('Getting workflow status', { executionArn });

    // Step Functionsから実行状況を取得
    const describeCommand = new DescribeExecutionCommand({ executionArn });
    const execution = await sfnClient.send(describeCommand);

    // データベースから進捗情報を取得
    const workflowExecution = await prisma.workflowExecution.findUnique({
      where: { executionArn },
    });

    if (!workflowExecution) {
      throw new Error(`Workflow execution not found: ${executionArn}`);
    }

    // 失敗アクションリストを取得
    const failedActions = workflowExecution.output?.failedActions || [];

    logger.info('Workflow status retrieved', {
      executionArn,
      status: execution.status,
      progressPercentage: workflowExecution.progressPercentage,
    });

    return {
      executionArn,
      status: execution.status as 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED',
      startDate: execution.startDate?.toISOString() || workflowExecution.startDate,
      stopDate: execution.stopDate?.toISOString() || workflowExecution.stopDate || undefined,
      progressPercentage: workflowExecution.progressPercentage,
      processedActions: workflowExecution.processedActions,
      totalActions: workflowExecution.totalActions,
      failedActions,
      error: execution.error,
    };
  } catch (error) {
    logger.error('Failed to get workflow status', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
