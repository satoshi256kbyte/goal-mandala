import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma-client';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/response';
import { sanitizeInput } from '../utils/sanitize';
import { checkSubGoalOwnership } from '../utils/permissions';

const app = new Hono();
const prisma = new PrismaClient();

// Zodバリデーションスキーマ
const SubGoalUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().min(1, '説明は必須です').max(500, '説明は500文字以内で入力してください'),
  background: z.string().min(1, '背景は必須です').max(1000, '背景は1000文字以内で入力してください'),
  constraints: z
    .string()
    .max(1000, '制約事項は1000文字以内で入力してください')
    .optional()
    .nullable(),
  updatedAt: z.string().datetime('更新日時は有効な日時形式で入力してください'),
});

/**
 * サブ目標を更新する
 * PUT /api/subgoals/:subGoalId
 */
app.put('/:subGoalId', authMiddleware, async c => {
  try {
    const subGoalId = c.req.param('subGoalId');
    const userId = c.get('userId') as string;

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    // リクエストボディの取得
    const body = await c.req.json();

    // バリデーション
    const validationResult = SubGoalUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return createResponse(c, 400, errors);
    }

    let { title, description, background, constraints } = validationResult.data;
    const { updatedAt } = validationResult.data;

    // 入力値のサニタイゼーション
    title = sanitizeInput(title);
    description = sanitizeInput(description);
    background = sanitizeInput(background);
    if (constraints) {
      constraints = sanitizeInput(constraints);
    }

    // 既存のサブ目標を取得（目標情報も含む）
    const existingSubGoal = await prisma.subGoal.findUnique({
      where: { id: subGoalId },
      include: {
        goal: {
          select: {
            userId: true,
          },
        },
      },
    });

    // サブ目標の存在チェック
    if (!existingSubGoal) {
      return createResponse(c, 404, 'サブ目標が見つかりません');
    }

    // 権限チェック（専用関数を使用）
    const hasPermission = await checkSubGoalOwnership(prisma, userId, subGoalId);
    if (!hasPermission) {
      return createResponse(c, 403, 'このサブ目標を編集する権限がありません');
    }

    // 楽観的ロックチェック
    const requestUpdatedAt = new Date(updatedAt);
    const currentUpdatedAt = new Date(existingSubGoal.updatedAt);

    if (requestUpdatedAt.getTime() !== currentUpdatedAt.getTime()) {
      logger.warn('Edit conflict detected', {
        subGoalId,
        userId,
        requestUpdatedAt: requestUpdatedAt.toISOString(),
        currentUpdatedAt: currentUpdatedAt.toISOString(),
      });

      return c.json(
        {
          error: 'EDIT_CONFLICT',
          message: 'データが他のユーザーによって更新されています',
          latestData: {
            id: existingSubGoal.id,
            title: existingSubGoal.title,
            description: existingSubGoal.description,
            background: existingSubGoal.background,
            constraints: existingSubGoal.constraints,
            updatedAt: existingSubGoal.updatedAt,
          },
        },
        409
      );
    }

    // サブ目標を更新
    const updatedSubGoal = await prisma.subGoal.update({
      where: { id: subGoalId },
      data: {
        title,
        description,
        background,
        constraints: constraints || null,
      },
    });

    logger.info('SubGoal updated successfully', {
      subGoalId,
      userId,
      title,
    });

    return c.json(updatedSubGoal, 200);
  } catch (error) {
    logger.error('Error updating subgoal', {
      error: error instanceof Error ? error.message : String(error),
      subGoalId: c.req.param('subGoalId'),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

export default app;
