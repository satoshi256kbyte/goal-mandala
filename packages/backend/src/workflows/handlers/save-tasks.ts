import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { LambdaEvent } from '../types/handler';

const prisma = new PrismaClient();

// 入力スキーマ
const SaveTasksInputSchema = z.object({
  actionId: z.string().uuid(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(['execution', 'habit']),
      estimatedMinutes: z.number().int().positive(),
    })
  ),
});

// 出力型定義
interface SaveTasksOutput {
  actionId: string;
  savedTaskIds: string[];
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Save Tasks Lambda Handler
 *
 * 責務:
 * - トランザクション処理
 * - バッチインサート
 * - エラーハンドリング
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export async function handler(event: LambdaEvent): Promise<SaveTasksOutput> {
  try {
    // 入力バリデーション
    const input = SaveTasksInputSchema.parse(event);
    const { actionId, tasks } = input;

    logger.info('Saving tasks', { actionId, taskCount: tasks.length });

    // トランザクション内でタスクを保存
    const savedTaskIds = await prisma.$transaction(async (tx: any) => {
      // 既存のタスクを削除（再生成の場合）
      await tx.task.deleteMany({
        where: { actionId },
      });

      // 新しいタスクを一括作成
      const createResults = await Promise.all(
        tasks.map(task =>
          tx.task.create({
            data: {
              actionId,
              title: task.title,
              description: task.description,
              type: task.type,
              status: 'not_started',
              estimatedMinutes: task.estimatedMinutes,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            select: {
              id: true,
            },
          })
        )
      );

      return createResults.map(result => result.id);
    });

    logger.info('Tasks saved successfully', {
      actionId,
      savedTaskCount: savedTaskIds.length,
    });

    return {
      actionId,
      savedTaskIds,
      status: 'success',
    };
  } catch (error) {
    logger.error('Failed to save tasks', { error });

    // エラーの場合でも構造化された出力を返す
    return {
      actionId: event.actionId || 'unknown',
      savedTaskIds: [],
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    await prisma.$disconnect();
  }
}
