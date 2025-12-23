import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';

const prisma = new PrismaClient();
const sfnClient = new SFNClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

// 入力スキーマ
const StartWorkflowInputSchema = z.object({
  goalId: z.string().uuid(),
  userId: z.string().uuid(),
});

// 出力型定義
interface StartWorkflowOutput {
  executionArn: string;
  startDate: string;
  status: 'RUNNING';
}

/**
 * Start Workflow Lambda Handler
 *
 * 責務:
 * - 入力バリデーション（goalId、userId）
 * - 目標の存在確認
 * - Step Functions実行開始
 * - 実行ARNをデータベースに保存
 * - 目標ステータスを"processing"に更新
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function handler(event: LambdaEvent): Promise<StartWorkflowOutput> {
  try {
    // 1. 入力バリデーション
    const input = StartWorkflowInputSchema.parse(event);
    const { goalId, userId } = input;

    logger.info('Starting workflow', { goalId, userId });

    // 2. 目標の存在確認
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        subGoals: {
          include: {
            actions: true,
          },
        },
      },
    });

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    if (goal.userId !== userId) {
      throw new Error(`User ${userId} does not own goal ${goalId}`);
    }

    // アクションIDを収集
    const actionIds = goal.subGoals.flatMap((subGoal: any) =>
      subGoal.actions.map(action => action.id)
    );

    if (actionIds.length === 0) {
      throw new Error(`Goal ${goalId} has no actions`);
    }

    // 3. Step Functions実行開始
    const stateMachineArn = process.env.STATE_MACHINE_ARN;
    if (!stateMachineArn) {
      throw new Error('STATE_MACHINE_ARN environment variable is not set');
    }

    const executionInput = {
      goalId,
      userId,
      actionIds,
    };

    const startExecutionCommand = new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(executionInput),
      name: `task-generation-${goalId}-${Date.now()}`,
    });

    const executionResult = await sfnClient.send(startExecutionCommand);

    if (!executionResult.executionArn) {
      throw new Error('Failed to start Step Functions execution');
    }

    const executionArn = executionResult.executionArn;
    const startDate = executionResult.startDate?.toISOString() || new Date().toISOString();

    logger.info('Step Functions execution started', {
      executionArn,
      goalId,
      userId,
      actionCount: actionIds.length,
    });

    // 4. 実行ARNをデータベースに保存
    await prisma.workflowExecution.create({
      data: {
        executionArn,
        goalId,
        userId,
        status: 'RUNNING',
        startDate,
        input: executionInput,
        progressPercentage: 0,
        processedActions: 0,
        totalActions: actionIds.length,
        currentBatch: 0,
        totalBatches: Math.ceil(actionIds.length / 8),
        estimatedTimeRemaining: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    // 5. 目標ステータスを"processing"に更新
    await prisma.goal.update({
      where: { id: goalId },
      data: { status: 'processing' },
    });

    logger.info('Workflow execution record created', { executionArn, goalId });

    return {
      executionArn,
      startDate,
      status: 'RUNNING',
    };
  } catch (error) {
    logger.error('Failed to start workflow', { error });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
