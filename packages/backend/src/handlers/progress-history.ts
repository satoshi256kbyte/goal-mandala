import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma-client';
import { PrismaProgressDataStore, ProgressHistoryQuery } from '../services/progress-data-store';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/response';

const app = new Hono();
const prisma = new PrismaClient();
const progressDataStore = new PrismaProgressDataStore(prisma);

/**
 * 進捗履歴を記録する
 * POST /api/progress-history
 */
app.post('/', async c => {
  try {
    const body = await c.req.json();
    const { entityType, entityId, progress, changeReason } = body;

    // バリデーション
    if (!entityType || !entityId || typeof progress !== 'number') {
      return createResponse(c, 400, 'Missing required fields: entityType, entityId, progress');
    }

    if (!['goal', 'subgoal', 'action', 'task'].includes(entityType)) {
      return createResponse(
        c,
        400,
        'Invalid entityType. Must be one of: goal, subgoal, action, task'
      );
    }

    if (progress < 0 || progress > 100) {
      return createResponse(c, 400, 'Progress must be between 0 and 100');
    }

    // 進捗履歴を記録
    await progressDataStore.recordProgressHistory({
      entityType: entityType as 'goal' | 'subgoal' | 'action' | 'task',
      entityId,
      progress,
      changeReason,
    });

    logger.info(`Progress history recorded for ${entityType}:${entityId}`, {
      entityType,
      entityId,
      progress,
      changeReason,
    });

    return createResponse(c, 201, 'Progress history recorded successfully');
  } catch (error) {
    logger.error('Error recording progress history:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

/**
 * 進捗履歴を取得する
 * GET /api/progress-history?entityId=xxx&entityType=xxx&startDate=xxx&endDate=xxx&granularity=xxx
 */
app.get('/', async c => {
  try {
    const { entityId, entityType, startDate, endDate, granularity } = c.req.query();

    // バリデーション
    if (!entityId || !entityType || !startDate || !endDate) {
      return createResponse(
        c,
        400,
        'Missing required query parameters: entityId, entityType, startDate, endDate'
      );
    }

    if (!['goal', 'subgoal', 'action', 'task'].includes(entityType)) {
      return createResponse(
        c,
        400,
        'Invalid entityType. Must be one of: goal, subgoal, action, task'
      );
    }

    const query: ProgressHistoryQuery = {
      entityId,
      entityType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      granularity: granularity as 'day' | 'week' | 'month' | undefined,
    };

    // 日付の妥当性チェック
    if (isNaN(query.startDate.getTime()) || isNaN(query.endDate.getTime())) {
      return createResponse(
        c,
        400,
        'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)'
      );
    }

    if (query.startDate > query.endDate) {
      return createResponse(c, 400, 'startDate must be before endDate');
    }

    // 進捗履歴を取得
    const history = await progressDataStore.getProgressHistoryEntries(query);

    logger.info(
      `Retrieved ${history.length} progress history entries for ${entityType}:${entityId}`
    );

    return c.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Error fetching progress history:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

/**
 * 進捗トレンドを取得する
 * GET /api/progress-history/trend?entityId=xxx&entityType=xxx&days=xxx
 */
app.get('/trend', async c => {
  try {
    const { entityId, entityType, days } = c.req.query();

    // バリデーション
    if (!entityId || !entityType || !days) {
      return createResponse(
        c,
        400,
        'Missing required query parameters: entityId, entityType, days'
      );
    }

    if (!['goal', 'subgoal', 'action', 'task'].includes(entityType)) {
      return createResponse(
        c,
        400,
        'Invalid entityType. Must be one of: goal, subgoal, action, task'
      );
    }

    const daysNumber = parseInt(days, 10);
    if (isNaN(daysNumber) || daysNumber <= 0 || daysNumber > 365) {
      return createResponse(c, 400, 'Days must be a positive number between 1 and 365');
    }

    // 進捗トレンドを取得
    const trend = await progressDataStore.getProgressTrend(entityId, entityType, daysNumber);

    logger.info(`Retrieved progress trend for ${entityType}:${entityId}`, {
      entityType,
      entityId,
      days: daysNumber,
      trend,
    });

    return c.json({
      success: true,
      data: trend,
    });
  } catch (error) {
    logger.error('Error fetching progress trend:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

/**
 * 重要な変化点を取得する
 * GET /api/progress-history/significant-changes?entityId=xxx&entityType=xxx&threshold=xxx
 */
app.get('/significant-changes', async c => {
  try {
    const { entityId, entityType, threshold } = c.req.query();

    // バリデーション
    if (!entityId || !entityType) {
      return createResponse(c, 400, 'Missing required query parameters: entityId, entityType');
    }

    if (!['goal', 'subgoal', 'action', 'task'].includes(entityType)) {
      return createResponse(
        c,
        400,
        'Invalid entityType. Must be one of: goal, subgoal, action, task'
      );
    }

    const thresholdNumber = threshold ? parseInt(threshold, 10) : 10;
    if (isNaN(thresholdNumber) || thresholdNumber < 1 || thresholdNumber > 100) {
      return createResponse(c, 400, 'Threshold must be a number between 1 and 100');
    }

    // 重要な変化点を取得
    const significantChanges = await progressDataStore.getSignificantChanges(
      entityId,
      entityType,
      thresholdNumber
    );

    logger.info(
      `Retrieved ${significantChanges.length} significant changes for ${entityType}:${entityId}`,
      {
        entityType,
        entityId,
        threshold: thresholdNumber,
      }
    );

    return c.json({
      success: true,
      data: significantChanges,
      count: significantChanges.length,
    });
  } catch (error) {
    logger.error('Error fetching significant changes:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

/**
 * 古い履歴データをクリーンアップする
 * DELETE /api/progress-history/cleanup
 */
app.delete('/cleanup', async c => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { cutoffDate } = body;

    // cutoffDateが指定されている場合は管理者権限が必要（実装は省略）
    if (cutoffDate) {
      // 将来的には管理者権限チェックを実装
      logger.warn('Manual cleanup with custom cutoff date requested', { cutoffDate });
    }

    // 古い履歴データをクリーンアップ
    const result = await progressDataStore.cleanupOldHistory();

    logger.info(`Cleaned up ${result.deletedCount} old progress history entries`);

    return c.json({
      success: true,
      message: 'Old history data cleaned up successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    logger.error('Error cleaning up old history:', {
      error: error instanceof Error ? error.message : String(error),
    });
    return createResponse(c, 500, 'Internal server error');
  }
});

export default app;
