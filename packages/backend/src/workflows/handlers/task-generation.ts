import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';
import { BedrockService } from '../../services/bedrock.service';
import { TaskOutput as AITaskOutput } from '../../types/ai-generation.types';

// 入力スキーマ
const TaskGenerationInputSchema = z.object({
  actionId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  type: z.enum(['execution', 'habit']),
  background: z.string(),
  constraints: z.string().nullable(),
  subGoalTitle: z.string(),
  subGoalDescription: z.string(),
  goalContext: z.object({
    goalId: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    deadline: z.string(),
    background: z.string(),
    constraints: z.string().nullable(),
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
 * Task Generation Lambda Handler
 *
 * 責務:
 * - アクションからタスクを生成（既存Lambda関数を再利用）
 * - 入力フォーマット調整
 * - 出力フォーマット調整
 *
 * Requirements: 15.1, 15.2, 15.3
 */
export async function handler(event: LambdaEvent): Promise<TaskGenerationOutput> {
  const bedrockService = new BedrockService();

  try {
    // 入力バリデーション
    const input = TaskGenerationInputSchema.parse(event);
    const { actionId, title, description, type, background, constraints } = input;

    logger.info('Generating tasks for action', { actionId, type });

    // AI生成用の入力フォーマット調整
    const actionInput = {
      actionTitle: title,
      actionDescription: description,
      actionType: type,
      background,
      constraints: constraints || undefined,
    };

    // AI生成実行
    const aiGeneratedTasks: AITaskOutput[] = await bedrockService.generateTasks(actionInput);

    logger.info('AI generation completed', {
      actionId,
      taskCount: aiGeneratedTasks.length,
    });

    // 品質検証（簡易版 - AI生成結果の基本チェック）
    if (aiGeneratedTasks.length === 0) {
      throw new Error('No tasks generated');
    }

    // 出力フォーマット調整
    const tasks = aiGeneratedTasks.map(task => ({
      title: task.title,
      description: task.description,
      type: type, // アクションのtypeを使用
      estimatedMinutes: task.estimatedMinutes,
    }));

    logger.info('Task generation successful', {
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
    return {
      actionId: event.actionId || 'unknown',
      tasks: [],
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
