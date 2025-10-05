import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma-client';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/response';
import { sanitizeInput } from '../utils/sanitize';
import { checkGoalOwnership } from '../utils/permissions';

const app = new Hono();
const prisma = new PrismaClient();

// Zodバリデーションスキーマ
const GoalUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(100, 'タイトルは100文字以内で入力してください'),
  description: z.string().min(1, '説明は必須です').max(500, '説明は500文字以内で入力してください'),
  deadline: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), '達成期限は有効な日時形式で入力してください'),
  background: z.string().min(1, '背景は必須です').max(1000, '背景は1000文字以内で入力してください'),
  constraints: z
    .string()
    .max(1000, '制約事項は1000文字以内で入力してください')
    .optional()
    .nullable(),
  updatedAt: z.string().datetime('更新日時は有効な日時形式で入力してください'),
});

/**
 * 目標を更新する
 * PUT /api/goals/:goalId
 */
app.put('/:goalId', authMiddleware, async c => {
  try {
    const goalId = c.req.param('goalId');
    const userId = c.get('userId');

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    // リクエストボディの取得
    const body = await c.req.json();

    // バリデーション
    const validationResult = GoalUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return createResponse(c, 400, errors);
    }

    let { title, description, background, constraints } = validationResult.data;
    const { deadline, updatedAt } = validationResult.data;

    // 入力値のサニタイゼーション
    title = sanitizeInput(title);
    description = sanitizeInput(description);
    background = sanitizeInput(background);
    if (constraints) {
      constraints = sanitizeInput(constraints);
    }

    // 既存の目標を取得
    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    // 目標の存在チェック
    if (!existingGoal) {
      return createResponse(c, 404, '目標が見つかりません');
    }

    // 権限チェック（専用関数を使用）
    const hasPermission = await checkGoalOwnership(prisma, userId, goalId);
    if (!hasPermission) {
      return createResponse(c, 403, 'この目標を編集する権限がありません');
    }

    // 楽観的ロックチェック
    const requestUpdatedAt = new Date(updatedAt);
    const currentUpdatedAt = new Date(existingGoal.updatedAt);

    if (requestUpdatedAt.getTime() !== currentUpdatedAt.getTime()) {
      logger.warn('Edit conflict detected', {
        goalId,
        userId,
        requestUpdatedAt: requestUpdatedAt.toISOString(),
        currentUpdatedAt: currentUpdatedAt.toISOString(),
      });

      return c.json(
        {
          error: 'EDIT_CONFLICT',
          message: 'データが他のユーザーによって更新されています',
          latestData: {
            id: existingGoal.id,
            title: existingGoal.title,
            description: existingGoal.description,
            deadline: existingGoal.deadline,
            background: existingGoal.background,
            constraints: existingGoal.constraints,
            updatedAt: existingGoal.updatedAt,
          },
        },
        409
      );
    }

    // 目標を更新
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        title,
        description,
        deadline: new Date(deadline),
        background,
        constraints: constraints || null,
      },
    });

    logger.info('Goal updated successfully', {
      goalId,
      userId,
      title,
    });

    return c.json(updatedGoal, 200);
  } catch (error) {
    logger.error('Error updating goal', {
      error: error instanceof Error ? error.message : String(error),
      goalId: c.req.param('goalId'),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

export default app;
