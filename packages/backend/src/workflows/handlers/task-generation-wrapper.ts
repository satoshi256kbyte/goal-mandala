import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';
import { TaskGenerationService } from '../../services/task-generation.service';
import { ContextService } from '../../services/context.service';
import { BedrockService } from '../../services/bedrock.service';
import { TaskQualityValidator } from '../../services/task-quality-validator.service';
import { TaskDatabaseService } from '../../services/task-database.service';
import { prisma } from '../../config/database';

// 入力スキーマ
const TaskGenerationInputSchema = z.object({
  actionId: z.string().uuid(),
  goalContext: z.object({
    goalId: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    deadline: z.string(),
    background: z.string(),
    constraints: z.string().nullable(),
  }),
  actionContext: z.object({
    title: z.string(),
    description: z.string(),
    type: z.enum(['execution', 'habit']),
    background: z.string(),
    constraints: z.string().nullable(),
    subGoalTitle: z.string(),
    subGoalDescription: z.string(),
  }),
});

// 出力型定義
interface TaskGenerationOutput {
  actionId: string;
  tasks: Array<{
    title: string;
    description: string;
    type: 'execution' | 'habit';
    estimatedMinutes: number;
  }>;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Task Generation Lambda Wrapper
 *
 * 責務:
 * - 既存Lambda関数の再利用
 * - 入力フォーマット調整
 * - 出力フォーマット調整
 *
 * Requirements: 15.1, 15.2, 15.3
 */
export async function handler(event: LambdaEvent): Promise<TaskGenerationOutput> {
  try {
    // 入力バリデーション
    const input = TaskGenerationInputSchema.parse(event);
    const { actionId, goalContext } = input;

    logger.info('Task generation started', { actionId });

    // サービスのインスタンス化
    const contextService = new ContextService(prisma);
    const bedrockService = new BedrockService();
    const qualityValidator = new TaskQualityValidator();
    const databaseService = new TaskDatabaseService();
    const taskGenerationService = new TaskGenerationService(
      contextService,
      bedrockService,
      qualityValidator,
      databaseService
    );

    // タスク生成（既存サービスを再利用）
    // Note: userIdは目標から取得されるため、ここでは不要
    const result = await taskGenerationService.generateAndSaveTasks(
      goalContext.goalId, // userIdの代わりにgoalIdを使用
      actionId,
      false // regenerate = false
    );

    // 出力フォーマット調整
    const tasks = result.tasks.map(task => ({
      title: task.title,
      description: task.description || '',
      type: (task.type === 'EXECUTION' ? 'execution' : 'habit') as 'execution' | 'habit',
      estimatedMinutes: task.estimatedMinutes,
    }));

    logger.info('Task generation completed', {
      actionId,
      taskCount: tasks.length,
    });

    return {
      actionId,
      tasks,
      status: 'success',
    };
  } catch (error) {
    logger.error('Task generation failed', { error });

    // エラーの場合でも構造化された出力を返す
    return {
      actionId: event.actionId || 'unknown',
      tasks: [],
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
