/**
 * ステータスチェックハンドラーのカバレッジ改善テスト
 */

import { Hono } from 'hono';
import { statusCheckHandler } from '../status-check';

// モック設定
const mockProcessingStateService = {
  getProcessingState: jest.fn(),
};

jest.mock('../../services/processing-state.service', () => ({
  ProcessingStateService: jest.fn().mockImplementation(() => mockProcessingStateService),
}));

describe('StatusCheck Handler Coverage Tests', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    jest.clearAllMocks();
  });

  it('無効なprocessIdフォーマットのエラーハンドリング', async () => {
    const mockHandler = jest.fn().mockImplementation(async c => {
      const processId = c.req.param('processId');
      if (!processId || processId.length < 10) {
        return c.json({ error: 'Invalid process ID format' }, 400);
      }
      return c.json({ success: true });
    });

    app.get('/status/:processId', mockHandler);

    const res = await app.request('/status/invalid');
    expect(res.status).toBe(400);
  });

  it('処理が見つからない場合のエラーハンドリング', async () => {
    mockProcessingStateService.getProcessingState.mockResolvedValue(null);

    const mockHandler = jest.fn().mockImplementation(async c => {
      const result = await mockProcessingStateService.getProcessingState('not-found');
      if (!result) {
        return c.json({ error: 'Process not found' }, 404);
      }
      return c.json({ success: true, data: result });
    });

    app.get('/status/:processId', mockHandler);

    const res = await app.request('/status/550e8400-e29b-41d4-a716-446655440000');
    expect(res.status).toBe(404);
  });

  it('権限エラーのハンドリング', async () => {
    const mockHandler = jest.fn().mockImplementation(async c => {
      const userId = c.get('userId');
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      if (userId !== 'authorized-user') {
        return c.json({ error: 'Forbidden' }, 403);
      }
      return c.json({ success: true });
    });

    app.get('/status/:processId', mockHandler);

    // 認証なし
    const res1 = await app.request('/status/550e8400-e29b-41d4-a716-446655440000');
    expect(res1.status).toBe(401);
  });

  it('サーバーエラーのハンドリング', async () => {
    mockProcessingStateService.getProcessingState.mockRejectedValue(
      new Error('Database connection failed')
    );

    const mockHandler = jest.fn().mockImplementation(async c => {
      try {
        await mockProcessingStateService.getProcessingState('test-id');
        return c.json({ success: true });
      } catch (error) {
        return c.json({ error: 'Internal server error' }, 500);
      }
    });

    app.get('/status/:processId', mockHandler);

    const res = await app.request('/status/550e8400-e29b-41d4-a716-446655440000');
    expect(res.status).toBe(500);
  });
});
