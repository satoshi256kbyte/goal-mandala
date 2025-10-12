import { Hono, Context } from 'hono';
import { PrismaClient } from '../generated/prisma-client';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/response';

const app = new Hono();
const prisma = new PrismaClient();

/**
 * 変更履歴を取得する共通関数
 */
async function getChangeHistory(
  c: Context,
  entityType: 'goal' | 'subgoal' | 'action',
  entityId: string
) {
  try {
    const userId = c.get('userId') as string;

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    // ページネーションパラメータの取得
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    // 変更履歴を取得
    const [history, total] = await Promise.all([
      prisma.changeHistory.findMany({
        where: {
          entityType,
          entityId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          changedAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.changeHistory.count({
        where: {
          entityType,
          entityId,
        },
      }),
    ]);

    // レスポンスの整形
    const formattedHistory = history.map(entry => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      userId: entry.userId,
      userName: entry.user.name,
      changedAt: entry.changedAt,
      changes: entry.changes,
    }));

    logger.info('Change history retrieved', {
      entityType,
      entityId,
      userId,
      count: formattedHistory.length,
      total,
    });

    return c.json(
      {
        history: formattedHistory,
        total,
        limit,
        offset,
      },
      200
    );
  } catch (error) {
    logger.error('Error retrieving change history', {
      error: error instanceof Error ? error.message : String(error),
      entityType,
      entityId,
    });
    return createResponse(c, 500, 'Internal server error');
  }
}

/**
 * 目標の変更履歴を取得する
 * GET /api/goals/:goalId/history
 */
app.get('/goals/:goalId/history', authMiddleware, async c => {
  const goalId = c.req.param('goalId');
  return getChangeHistory(c, 'goal', goalId);
});

/**
 * サブ目標の変更履歴を取得する
 * GET /api/subgoals/:subGoalId/history
 */
app.get('/subgoals/:subGoalId/history', authMiddleware, async c => {
  const subGoalId = c.req.param('subGoalId');
  return getChangeHistory(c, 'subgoal', subGoalId);
});

/**
 * アクションの変更履歴を取得する
 * GET /api/actions/:actionId/history
 */
app.get('/actions/:actionId/history', authMiddleware, async c => {
  const actionId = c.req.param('actionId');
  return getChangeHistory(c, 'action', actionId);
});

export default app;

/**
 * 目標を特定の履歴バージョンにロールバックする（管理者のみ）
 * POST /api/goals/:goalId/rollback
 */
app.post('/goals/:goalId/rollback', authMiddleware, async c => {
  try {
    const goalId = c.req.param('goalId');
    const userId = c.get('userId') as string;
    const isAdmin = c.get('isAdmin') as boolean;

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    // 管理者権限チェック
    // TODO: 実際の管理者権限チェックロジックを実装
    // 現時点では、isAdminフラグで判定（将来的にはUserモデルにroleフィールドを追加）
    if (!isAdmin) {
      return createResponse(c, 403, '管理者権限が必要です');
    }

    // リクエストボディの取得
    const body = await c.req.json();
    const { historyId } = body;

    // historyIdのバリデーション
    if (!historyId) {
      return createResponse(c, 400, 'historyIdは必須です');
    }

    // 変更履歴を取得
    const history = await prisma.changeHistory.findUnique({
      where: { id: historyId },
    });

    // 履歴の存在チェック
    if (!history) {
      return createResponse(c, 404, '変更履歴が見つかりません');
    }

    // エンティティタイプとIDの一致チェック
    if (history.entityType !== 'goal' || history.entityId !== goalId) {
      return createResponse(c, 400, '指定された履歴は対象の目標のものではありません');
    }

    // 現在の目標を取得
    const currentGoal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!currentGoal) {
      return createResponse(c, 404, '目標が見つかりません');
    }

    // 変更内容から古い値を抽出してロールバック
    const changes = history.changes as Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
    const rollbackData: Record<string, unknown> = {};

    for (const change of changes) {
      rollbackData[change.field] = change.oldValue;
    }

    // 目標を更新（ロールバック）
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: rollbackData,
    });

    logger.info('Goal rolled back successfully', {
      goalId,
      userId,
      historyId,
      changes: changes.length,
    });

    return c.json(updatedGoal, 200);
  } catch (error) {
    logger.error('Error rolling back goal', {
      error: error instanceof Error ? error.message : String(error),
      goalId: c.req.param('goalId'),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

/**
 * サブ目標を特定の履歴バージョンにロールバックする（管理者のみ）
 * POST /api/subgoals/:subGoalId/rollback
 */
app.post('/subgoals/:subGoalId/rollback', authMiddleware, async c => {
  try {
    const subGoalId = c.req.param('subGoalId');
    const userId = c.get('userId') as string;
    const isAdmin = c.get('isAdmin') as boolean;

    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    if (!isAdmin) {
      return createResponse(c, 403, '管理者権限が必要です');
    }

    const body = await c.req.json();
    const { historyId } = body;

    if (!historyId) {
      return createResponse(c, 400, 'historyIdは必須です');
    }

    const history = await prisma.changeHistory.findUnique({
      where: { id: historyId },
    });

    if (!history) {
      return createResponse(c, 404, '変更履歴が見つかりません');
    }

    if (history.entityType !== 'subgoal' || history.entityId !== subGoalId) {
      return createResponse(c, 400, '指定された履歴は対象のサブ目標のものではありません');
    }

    const currentSubGoal = await prisma.subGoal.findUnique({
      where: { id: subGoalId },
    });

    if (!currentSubGoal) {
      return createResponse(c, 404, 'サブ目標が見つかりません');
    }

    const changes = history.changes as Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
    const rollbackData: Record<string, unknown> = {};

    for (const change of changes) {
      rollbackData[change.field] = change.oldValue;
    }

    const updatedSubGoal = await prisma.subGoal.update({
      where: { id: subGoalId },
      data: rollbackData,
    });

    logger.info('SubGoal rolled back successfully', {
      subGoalId,
      userId,
      historyId,
      changes: changes.length,
    });

    return c.json(updatedSubGoal, 200);
  } catch (error) {
    logger.error('Error rolling back subgoal', {
      error: error instanceof Error ? error.message : String(error),
      subGoalId: c.req.param('subGoalId'),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

/**
 * アクションを特定の履歴バージョンにロールバックする（管理者のみ）
 * POST /api/actions/:actionId/rollback
 */
app.post('/actions/:actionId/rollback', authMiddleware, async c => {
  try {
    const actionId = c.req.param('actionId');
    const userId = c.get('userId') as string;
    const isAdmin = c.get('isAdmin') as boolean;

    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    if (!isAdmin) {
      return createResponse(c, 403, '管理者権限が必要です');
    }

    const body = await c.req.json();
    const { historyId } = body;

    if (!historyId) {
      return createResponse(c, 400, 'historyIdは必須です');
    }

    const history = await prisma.changeHistory.findUnique({
      where: { id: historyId },
    });

    if (!history) {
      return createResponse(c, 404, '変更履歴が見つかりません');
    }

    if (history.entityType !== 'action' || history.entityId !== actionId) {
      return createResponse(c, 400, '指定された履歴は対象のアクションのものではありません');
    }

    const currentAction = await prisma.action.findUnique({
      where: { id: actionId },
    });

    if (!currentAction) {
      return createResponse(c, 404, 'アクションが見つかりません');
    }

    const changes = history.changes as Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
    const rollbackData: Record<string, unknown> = {};

    for (const change of changes) {
      rollbackData[change.field] = change.oldValue;
    }

    const updatedAction = await prisma.action.update({
      where: { id: actionId },
      data: rollbackData,
    });

    logger.info('Action rolled back successfully', {
      actionId,
      userId,
      historyId,
      changes: changes.length,
    });

    return c.json(updatedAction, 200);
  } catch (error) {
    logger.error('Error rolling back action', {
      error: error instanceof Error ? error.message : String(error),
      actionId: c.req.param('actionId'),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});
