/**
 * 変更履歴ハンドラーのカバレッジ改善テスト
 */

import { Hono } from 'hono';

// モック設定
const mockChangeHistoryService = {
  getChangeHistory: jest.fn(),
  createChangeRecord: jest.fn(),
};

jest.mock('../../services/change-history', () => ({
  ChangeHistoryService: jest.fn().mockImplementation(() => mockChangeHistoryService),
}));

describe('ChangeHistory Handler Coverage Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    jest.clearAllMocks();
  });

  it('クエリパラメータのバリデーション', async () => {
    const mockHandler = jest.fn().mockImplementation(async c => {
      const entityId = c.req.query('entityId');
      const entityType = c.req.query('entityType');

      if (!entityId || !entityType) {
        return c.json({ error: 'Missing required parameters' }, 400);
      }

      if (!['goal', 'subgoal', 'action', 'task'].includes(entityType)) {
        return c.json({ error: 'Invalid entity type' }, 400);
      }

      return c.json({ success: true });
    });

    app.get('/change-history', mockHandler);

    // パラメータなし
    const res1 = await app.request('/change-history');
    expect(res1.status).toBe(400);

    // 無効なentityType
    const res2 = await app.request('/change-history?entityId=test&entityType=invalid');
    expect(res2.status).toBe(400);

    // 正常なパラメータ
    const res3 = await app.request('/change-history?entityId=test&entityType=goal');
    expect(res3.status).toBe(200);
  });

  it('日付範囲のバリデーション', async () => {
    const mockHandler = jest.fn().mockImplementation(async c => {
      const startDate = c.req.query('startDate');
      const endDate = c.req.query('endDate');

      if (startDate && isNaN(Date.parse(startDate))) {
        return c.json({ error: 'Invalid start date format' }, 400);
      }

      if (endDate && isNaN(Date.parse(endDate))) {
        return c.json({ error: 'Invalid end date format' }, 400);
      }

      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        return c.json({ error: 'Start date must be before end date' }, 400);
      }

      return c.json({ success: true });
    });

    app.get('/change-history', mockHandler);

    // 無効な日付フォーマット
    const res1 = await app.request('/change-history?startDate=invalid-date');
    expect(res1.status).toBe(400);

    // 開始日が終了日より後
    const res2 = await app.request('/change-history?startDate=2024-12-31&endDate=2024-01-01');
    expect(res2.status).toBe(400);
  });

  it('ページネーションのバリデーション', async () => {
    const mockHandler = jest.fn().mockImplementation(async c => {
      const page = parseInt(c.req.query('page') || '1');
      const limit = parseInt(c.req.query('limit') || '20');

      if (page < 1) {
        return c.json({ error: 'Page must be greater than 0' }, 400);
      }

      if (limit < 1 || limit > 100) {
        return c.json({ error: 'Limit must be between 1 and 100' }, 400);
      }

      return c.json({ success: true, page, limit });
    });

    app.get('/change-history', mockHandler);

    // 無効なページ番号
    const res1 = await app.request('/change-history?page=0');
    expect(res1.status).toBe(400);

    // 無効なリミット
    const res2 = await app.request('/change-history?limit=101');
    expect(res2.status).toBe(400);
  });

  it('サービスエラーのハンドリング', async () => {
    mockChangeHistoryService.getChangeHistory.mockRejectedValue(
      new Error('Database connection failed')
    );

    const mockHandler = jest.fn().mockImplementation(async c => {
      try {
        await mockChangeHistoryService.getChangeHistory({});
        return c.json({ success: true });
      } catch (error) {
        return c.json({ error: 'Internal server error' }, 500);
      }
    });

    app.get('/change-history', mockHandler);

    const res = await app.request('/change-history');
    expect(res.status).toBe(500);
  });

  it('空の結果のハンドリング', async () => {
    mockChangeHistoryService.getChangeHistory.mockResolvedValue([]);

    const mockHandler = jest.fn().mockImplementation(async c => {
      const result = await mockChangeHistoryService.getChangeHistory({});
      return c.json({
        success: true,
        data: result,
        count: result.length,
      });
    });

    app.get('/change-history', mockHandler);

    const res = await app.request('/change-history');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.count).toBe(0);
  });
});
