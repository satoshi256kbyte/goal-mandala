import { Hono } from 'hono';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma-client';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/response';
import { sanitizeInput } from '../utils/sanitize';
import { checkActionOwnership } from '../utils/permissions';

const app = new Hono();
const prisma = new PrismaClient();

// Zodバリデーションスキーマ
const ActionUpdateSchema = z.object({
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
 * アクションを更新する
 * PUT /api/actions/:actionId
 */
app.put('/:actionId', authMiddleware, async c => {
  try {
    const actionId = c.req.param('actionId');
    const userId = c.get('userId');

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    // リクエストボディの取得
    const body = await c.req.json();

    // バリデーション
    const validationResult = ActionUpdateSchema.safeParse(body);
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

    // 既存のアクションを取得（サブ目標と目標情報も含む）
    const existingAction = await prisma.action.findUnique({
      where: { id: actionId },
      include: {
        subGoal: {
          include: {
            goal: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    // アクションの存在チェック
    if (!existingAction) {
      return createResponse(c, 404, 'アクションが見つかりません');
    }

    // 権限チェック（専用関数を使用）
    const hasPermission = await checkActionOwnership(prisma, userId, actionId);
    if (!hasPermission) {
      return createResponse(c, 403, 'このアクションを編集する権限がありません');
    }

    // 楽観的ロックチェック
    const requestUpdatedAt = new Date(updatedAt);
    const currentUpdatedAt = new Date(existingAction.updatedAt);

    if (requestUpdatedAt.getTime() !== currentUpdatedAt.getTime()) {
      logger.warn('Edit conflict detected', {
        actionId,
        userId,
        requestUpdatedAt: requestUpdatedAt.toISOString(),
        currentUpdatedAt: currentUpdatedAt.toISOString(),
      });

      return c.json(
        {
          error: 'EDIT_CONFLICT',
          message: 'データが他のユーザーによって更新されています',
          latestData: {
            id: existingAction.id,
            title: existingAction.title,
            description: existingAction.description,
            background: existingAction.background,
            constraints: existingAction.constraints,
            updatedAt: existingAction.updatedAt,
          },
        },
        409
      );
    }

    // アクションを更新
    const updatedAction = await prisma.action.update({
      where: { id: actionId },
      data: {
        title,
        description,
        background,
        constraints: constraints || null,
      },
    });

    logger.info('Action updated successfully', {
      actionId,
      userId,
      title,
    });

    return c.json(updatedAction, 200);
  } catch (error) {
    logger.error('Error updating action', {
      error: error instanceof Error ? error.message : String(error),
      actionId: c.req.param('actionId'),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

export default app;
