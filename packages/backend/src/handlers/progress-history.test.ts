import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// モックを最初に設定
const mockRecordProgressHistory = jest.fn();
const mockGetProgressHistoryEntries = jest.fn();
const mockGetProgressTrend = jest.fn();
const mockGetSignificantChanges = jest.fn();
const mockCleanupOldHistory = jest.fn();

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

const mockCreateResponse = jest.fn((c, status, message) => {
  return c.json({ error: message }, status);
});

// PrismaClientをモック
jest.mock('../generated/prisma-client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    progressHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  })),
}));

// PrismaProgressDataStoreをモック
jest.mock('../services/progress-data-store', () => ({
  PrismaProgressDataStore: jest.fn().mockImplementation(() => ({
    recordProgressHistory: mockRecordProgressHistory,
    getProgressHistoryEntries: mockGetProgressHistoryEntries,
    getProgressTrend: mockGetProgressTrend,
    getSignificantChanges: mockGetSignificantChanges,
    cleanupOldHistory: mockCleanupOldHistory,
  })),
}));

// ロガーをモック
jest.mock('../utils/logger', () => ({
  logger: mockLogger,
}));

// レスポンスユーティリティをモック
jest.mock('../utils/response', () => ({
  createResponse: mockCreateResponse,
}));

// 動的インポートでハンドラーを読み込み
let progressHistoryHandler: any;

describe('Progress History Handler', () => {
  let app: any;

  beforeEach(async () => {
    // モックをクリア
    jest.clearAllMocks();

    // ハンドラーを動的にインポート（モックが適用された後）
    const { Hono } = await import('hono');
    progressHistoryHandler = (await import('./progress-history')).default;

    app = new Hono();
    app.route('/progress-history', progressHistoryHandler);
  });

  describe('POST /progress-history', () => {
    it('有効なデータで進捗履歴を記録する', async () => {
      mockRecordProgressHistory.mockResolvedValue(undefined);

      const requestBody = {
        entityType: 'goal',
        entityId: 'goal-1',
        progress: 50,
        changeReason: 'Test update',
      };

      const res = await app.request('/progress-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(res.status).toBe(201);
      expect(mockRecordProgressHistory).toHaveBeenCalledWith({
        entityType: 'goal',
        entityId: 'goal-1',
        progress: 50,
        changeReason: 'Test update',
      });
    });

    it('必須フィールドが不足している場合は400エラーを返す', async () => {
      const requestBody = {
        entityType: 'goal',
        // entityIdが不足
        progress: 50,
      };

      const res = await app.request('/progress-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(res.status).toBe(400);
      expect(mockRecordProgressHistory).not.toHaveBeenCalled();
    });

    it('無効なentityTypeの場合は400エラーを返す', async () => {
      const requestBody = {
        entityType: 'invalid',
        entityId: 'goal-1',
        progress: 50,
      };

      const res = await app.request('/progress-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(res.status).toBe(400);
      expect(mockRecordProgressHistory).not.toHaveBeenCalled();
    });

    it('進捗値が範囲外の場合は400エラーを返す', async () => {
      const requestBody = {
        entityType: 'goal',
        entityId: 'goal-1',
        progress: 150, // 100を超える
      };

      const res = await app.request('/progress-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(res.status).toBe(400);
      expect(mockRecordProgressHistory).not.toHaveBeenCalled();
    });
  });

  describe('GET /progress-history', () => {
    it('有効なクエリパラメータで進捗履歴を取得する', async () => {
      const mockHistory = [
        {
          id: '1',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 25,
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: '2',
          entityId: 'goal-1',
          entityType: 'goal',
          progress: 50,
          timestamp: new Date('2024-01-02T00:00:00Z'),
        },
      ];

      mockGetProgressHistoryEntries.mockResolvedValue(mockHistory);

      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T23:59:59Z',
      });

      const res = await app.request(`/progress-history?${queryParams}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockHistory);
      expect(data.count).toBe(2);
    });

    it('必須クエリパラメータが不足している場合は400エラーを返す', async () => {
      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        // entityTypeが不足
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T23:59:59Z',
      });

      const res = await app.request(`/progress-history?${queryParams}`);

      expect(res.status).toBe(400);
      expect(mockGetProgressHistoryEntries).not.toHaveBeenCalled();
    });

    it('無効な日付形式の場合は400エラーを返す', async () => {
      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: 'invalid-date',
        endDate: '2024-01-02T23:59:59Z',
      });

      const res = await app.request(`/progress-history?${queryParams}`);

      expect(res.status).toBe(400);
      expect(mockGetProgressHistoryEntries).not.toHaveBeenCalled();
    });

    it('開始日が終了日より後の場合は400エラーを返す', async () => {
      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: '2024-01-02T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
      });

      const res = await app.request(`/progress-history?${queryParams}`);

      expect(res.status).toBe(400);
      expect(mockGetProgressHistoryEntries).not.toHaveBeenCalled();
    });
  });

  describe('GET /progress-history/trend', () => {
    it('有効なパラメータで進捗トレンドを取得する', async () => {
      const mockTrend = {
        direction: 'increasing' as const,
        rate: 5.2,
        confidence: 0.8,
      };

      mockGetProgressTrend.mockResolvedValue(mockTrend);

      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        days: '7',
      });

      const res = await app.request(`/progress-history/trend?${queryParams}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockTrend);
    });

    it('必須パラメータが不足している場合は400エラーを返す', async () => {
      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        // entityTypeとdaysが不足
      });

      const res = await app.request(`/progress-history/trend?${queryParams}`);

      expect(res.status).toBe(400);
      expect(mockGetProgressTrend).not.toHaveBeenCalled();
    });

    it('無効な日数の場合は400エラーを返す', async () => {
      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        days: '400', // 365を超える
      });

      const res = await app.request(`/progress-history/trend?${queryParams}`);

      expect(res.status).toBe(400);
      expect(mockGetProgressTrend).not.toHaveBeenCalled();
    });
  });

  describe('GET /progress-history/significant-changes', () => {
    it('有効なパラメータで重要な変化点を取得する', async () => {
      const mockChanges = [
        {
          date: new Date('2024-01-01T00:00:00Z'),
          progress: 75,
          change: 25,
          reason: 'Major milestone achieved',
        },
      ];

      mockGetSignificantChanges.mockResolvedValue(mockChanges);

      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        threshold: '20',
      });

      const res = await app.request(`/progress-history/significant-changes?${queryParams}`);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockChanges);
      expect(data.count).toBe(1);
    });

    it('閾値が指定されていない場合はデフォルト値を使用する', async () => {
      mockGetSignificantChanges.mockResolvedValue([]);

      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        // thresholdなし
      });

      const res = await app.request(`/progress-history/significant-changes?${queryParams}`);

      expect(res.status).toBe(200);
      expect(mockGetSignificantChanges).toHaveBeenCalledWith('goal-1', 'goal', 10);
    });

    it('無効な閾値の場合は400エラーを返す', async () => {
      const queryParams = new URLSearchParams({
        entityId: 'goal-1',
        entityType: 'goal',
        threshold: '150', // 100を超える
      });

      const res = await app.request(`/progress-history/significant-changes?${queryParams}`);

      expect(res.status).toBe(400);
      expect(mockGetSignificantChanges).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /progress-history/cleanup', () => {
    it('古い履歴データをクリーンアップする', async () => {
      mockCleanupOldHistory.mockResolvedValue({ deletedCount: 5 });

      const res = await app.request('/progress-history/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(5);
      expect(mockCleanupOldHistory).toHaveBeenCalled();
    });

    it('カスタム削除日時が指定された場合は警告ログを出力する', async () => {
      mockCleanupOldHistory.mockResolvedValue({ deletedCount: 10 });

      const res = await app.request('/progress-history/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutoffDate: '2024-01-01T00:00:00Z',
        }),
      });

      expect(res.status).toBe(200);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Manual cleanup with custom cutoff date requested',
        { cutoffDate: '2024-01-01T00:00:00Z' }
      );
    });

    it('JSONパースエラーが発生しても処理を継続する', async () => {
      mockCleanupOldHistory.mockResolvedValue({ deletedCount: 0 });

      const res = await app.request('/progress-history/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      expect(res.status).toBe(200);
      expect(mockCleanupOldHistory).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('データストアエラーが発生した場合は500エラーを返す', async () => {
      mockRecordProgressHistory.mockRejectedValue(new Error('Database error'));

      const requestBody = {
        entityType: 'goal',
        entityId: 'goal-1',
        progress: 50,
      };

      const res = await app.request('/progress-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      expect(res.status).toBe(500);
    });
  });
});
