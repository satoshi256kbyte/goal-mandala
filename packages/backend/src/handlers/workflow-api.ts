import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/response';
import { handler as startWorkflowHandler } from '../workflows/handlers/start-workflow';
import { handler as getStatusHandler } from '../workflows/handlers/get-status';
import { handler as cancelWorkflowHandler } from '../workflows/handlers/cancel-workflow';
import { PrismaClient } from '../generated/prisma-client';

const app = new Hono();
const prisma = new PrismaClient();

// Zodバリデーションスキーマ
const StartActivitySchema = z.object({
  goalId: z.string().uuid('有効なgoalIdを指定してください'),
});

const CancelWorkflowSchema = z.object({
  reason: z.string().optional(),
});

/**
 * 活動開始（タスク生成ワークフロー開始）
 * POST /api/goals/:goalId/start-activity
 *
 * Requirements: 1.1
 */
app.post('/goals/:goalId/start-activity', authMiddleware, async c => {
  try {
    const goalId = c.req.param('goalId');
    const userId = c.get('userId') as string;

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    logger.info('Start activity request', { goalId, userId });

    // パラメータバリデーション
    const validationResult = StartActivitySchema.safeParse({ goalId });
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return createResponse(c, 400, errors);
    }

    // 目標の存在確認と権限チェック
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return createResponse(c, 404, '目標が見つかりません');
    }

    if (goal.userId !== userId) {
      return createResponse(c, 403, 'この目標にアクセスする権限がありません');
    }

    // 目標のステータスチェック
    if (goal.status === 'processing') {
      return createResponse(c, 409, 'この目標は既に処理中です');
    }

    // Start Workflow Lambda呼び出し
    const result = await startWorkflowHandler({
      goalId,
      userId,
    });

    logger.info('Workflow started successfully', {
      goalId,
      userId,
      executionArn: result.executionArn,
    });

    return c.json(
      {
        executionArn: result.executionArn,
        startDate: result.startDate,
        status: result.status,
        message: 'タスク生成ワークフローを開始しました',
      },
      200
    );
  } catch (error) {
    logger.error('Error starting activity', {
      error: error instanceof Error ? error.message : String(error),
      goalId: c.req.param('goalId'),
    });

    // エラーメッセージの詳細化
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return createResponse(c, 404, error.message);
      }
      if (error.message.includes('does not own')) {
        return createResponse(c, 403, error.message);
      }
      if (error.message.includes('no actions')) {
        return createResponse(c, 400, error.message);
      }
    }

    return createResponse(c, 500, 'ワークフローの開始に失敗しました');
  }
});

/**
 * ワークフロー状態取得
 * GET /api/workflows/:executionArn/status
 *
 * Requirements: 6.3
 */
app.get('/workflows/:executionArn/status', authMiddleware, async c => {
  try {
    const executionArn = c.req.param('executionArn');
    const userId = c.get('userId') as string;

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    logger.info('Get workflow status request', { executionArn, userId });

    // executionArnのデコード（URLエンコードされている場合）
    const decodedExecutionArn = decodeURIComponent(executionArn);

    // ワークフロー実行の権限チェック
    const workflowExecution = await prisma.workflowExecution.findUnique({
      where: { executionArn: decodedExecutionArn },
    });

    if (!workflowExecution) {
      return createResponse(c, 404, 'ワークフロー実行が見つかりません');
    }

    if (workflowExecution.userId !== userId) {
      return createResponse(c, 403, 'このワークフローにアクセスする権限がありません');
    }

    // Get Status Lambda呼び出し
    const result = await getStatusHandler({
      executionArn: decodedExecutionArn,
    });

    logger.info('Workflow status retrieved', {
      executionArn: decodedExecutionArn,
      userId,
      status: result.status,
      progressPercentage: result.progressPercentage,
    });

    return c.json(result, 200);
  } catch (error) {
    logger.error('Error getting workflow status', {
      error: error instanceof Error ? error.message : String(error),
      executionArn: c.req.param('executionArn'),
    });

    if (error instanceof Error && error.message.includes('not found')) {
      return createResponse(c, 404, error.message);
    }

    return createResponse(c, 500, 'ワークフロー状態の取得に失敗しました');
  }
});

/**
 * ワークフローキャンセル
 * POST /api/workflows/:executionArn/cancel
 *
 * Requirements: 9.1
 */
app.post('/workflows/:executionArn/cancel', authMiddleware, async c => {
  try {
    const executionArn = c.req.param('executionArn');
    const userId = c.get('userId') as string;

    // 認証チェック
    if (!userId) {
      return createResponse(c, 401, '認証が必要です');
    }

    logger.info('Cancel workflow request', { executionArn, userId });

    // executionArnのデコード（URLエンコードされている場合）
    const decodedExecutionArn = decodeURIComponent(executionArn);

    // リクエストボディの取得
    const body = await c.req.json().catch(() => ({}));

    // バリデーション
    const validationResult = CancelWorkflowSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => err.message).join(', ');
      return createResponse(c, 400, errors);
    }

    const { reason } = validationResult.data;

    // ワークフロー実行の権限チェック
    const workflowExecution = await prisma.workflowExecution.findUnique({
      where: { executionArn: decodedExecutionArn },
    });

    if (!workflowExecution) {
      return createResponse(c, 404, 'ワークフロー実行が見つかりません');
    }

    if (workflowExecution.userId !== userId) {
      return createResponse(c, 403, 'このワークフローをキャンセルする権限がありません');
    }

    // ワークフローのステータスチェック
    if (workflowExecution.status !== 'RUNNING') {
      return createResponse(c, 409, `ワークフローは既に${workflowExecution.status}状態です`);
    }

    // Cancel Workflow Lambda呼び出し
    const result = await cancelWorkflowHandler({
      executionArn: decodedExecutionArn,
      reason: reason || 'ユーザーによるキャンセル',
    });

    logger.info('Workflow cancelled successfully', {
      executionArn: decodedExecutionArn,
      userId,
      reason,
    });

    return c.json(
      {
        executionArn: result.executionArn,
        status: result.status,
        stopDate: result.stopDate,
        message: 'ワークフローをキャンセルしました',
      },
      200
    );
  } catch (error) {
    logger.error('Error cancelling workflow', {
      error: error instanceof Error ? error.message : String(error),
      executionArn: c.req.param('executionArn'),
    });

    if (error instanceof Error && error.message.includes('not found')) {
      return createResponse(c, 404, error.message);
    }

    return createResponse(c, 500, 'ワークフローのキャンセルに失敗しました');
  }
});

export default app;
