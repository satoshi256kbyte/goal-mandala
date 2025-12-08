/**
 * 進捗履歴サービスのテスト
 */

import {
  InMemoryProgressHistoryService,
  ProgressHistoryEntry,
  ProgressHistoryQuery,
  ProgressTrend,
  SignificantChange,
} from '../progress-history-service';

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('ProgressHistoryService', () => {
  let service: InMemoryProgressHistoryService;

  beforeEach(() => {
    service = new InMemoryProgressHistoryService();
  });

  describe('recordProgress', () => {
    it('進捗履歴を正しく記録する', async () => {
      const entry = {
        entityId: 'goal-1',
        entityType: 'goal' as const,
        progress: 50,
        changeReason: 'タスク完了',
      };

      await service.recordProgress(entry);

      const history = await service.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(history).toHaveLength(1);
      expect(history[0].entityId).toBe('goal-1');
      expect(history[0].progress).toBe(50);
      expect(history[0].changeReason).toBe('タスク完了');
      expect(history[0].id).toBeDefined();
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('複数の進捗履歴を記録できる', async () => {
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 25 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 50 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 75 },
      ];

      for (const entry of entries) {
        await service.recordProgress(entry);
      }

      const history = await service.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(history).toHaveLength(3);
      expect(history.map(h => h.progress)).toEqual([25, 50, 75]);
    });
  });

  describe('getProgressHistory', () => {
    beforeEach(async () => {
      // テストデータを準備
      const baseDate = new Date('2024-01-01T00:00:00Z');
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 0 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 25 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 50 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 75 },
        { entityId: 'goal-2', entityType: 'goal' as const, progress: 30 },
      ];

      for (let i = 0; i < entries.length; i++) {
        await service.recordProgress(entries[i]);
        // 時間差を作るために少し待機
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('指定したエンティティの履歴を取得する', async () => {
      const history = await service.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(history).toHaveLength(4);
      expect(history.map(h => h.progress)).toEqual([0, 25, 50, 75]);
      expect(history.every(h => h.entityId === 'goal-1')).toBe(true);
    });

    it('日付範囲でフィルタリングする', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // 1時間前以降のデータのみ取得
      const history = await service.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: oneHourAgo,
        endDate: now,
      });

      // すべてのエントリが1時間前以降に作成されているはず
      expect(history.every(h => h.timestamp >= oneHourAgo)).toBe(true);
    });

    it('存在しないエンティティの場合は空配列を返す', async () => {
      const history = await service.getProgressHistory({
        entityId: 'non-existent',
        entityType: 'goal',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });

      expect(history).toEqual([]);
    });
  });

  describe('getProgressTrend', () => {
    it('増加傾向を正しく検出する', async () => {
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 10 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 30 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 50 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 70 },
      ];

      for (const entry of entries) {
        await service.recordProgress(entry);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const trend = await service.getProgressTrend('goal-1', 7);

      expect(trend.direction).toBe('increasing');
      expect(trend.rate).toBeGreaterThan(0);
      expect(trend.confidence).toBeGreaterThan(0);
    });

    it('減少傾向を正しく検出する', async () => {
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 80 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 60 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 40 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 20 },
      ];

      for (const entry of entries) {
        await service.recordProgress(entry);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const trend = await service.getProgressTrend('goal-1', 7);

      expect(trend.direction).toBe('decreasing');
      expect(trend.rate).toBeGreaterThan(0);
    });

    it('安定傾向を正しく検出する', async () => {
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 50 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 51 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 49 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 50 },
      ];

      for (const entry of entries) {
        await service.recordProgress(entry);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const trend = await service.getProgressTrend('goal-1', 7);

      expect(trend.direction).toBe('stable');
      expect(trend.rate).toBeLessThan(1);
    });

    it('データが不十分な場合は安定を返す', async () => {
      await service.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 50,
      });

      const trend = await service.getProgressTrend('goal-1', 7);

      expect(trend.direction).toBe('stable');
      expect(trend.rate).toBe(0);
      expect(trend.confidence).toBe(0);
    });
  });

  describe('getSignificantChanges', () => {
    it('大きな変化を正しく検出する', async () => {
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 10 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 15 }, // +5 (小さな変化)
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 40 }, // +25 (大きな変化)
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 45 }, // +5 (小さな変化)
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 20 }, // -25 (大きな変化)
      ];

      for (const entry of entries) {
        await service.recordProgress(entry);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const significantChanges = await service.getSignificantChanges('goal-1', 10);

      expect(significantChanges).toHaveLength(2);
      expect(significantChanges[0].change).toBe(25); // 15 -> 40
      expect(significantChanges[0].progress).toBe(40);
      expect(significantChanges[1].change).toBe(25); // 45 -> 20
      expect(significantChanges[1].progress).toBe(20);
    });

    it('閾値以下の変化は検出しない', async () => {
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 10 },
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 15 }, // +5
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 18 }, // +3
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 20 }, // +2
      ];

      for (const entry of entries) {
        await service.recordProgress(entry);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const significantChanges = await service.getSignificantChanges('goal-1', 10);

      expect(significantChanges).toHaveLength(0);
    });

    it('変更理由が記録されている場合は含める', async () => {
      const entries = [
        { entityId: 'goal-1', entityType: 'goal' as const, progress: 10 },
        {
          entityId: 'goal-1',
          entityType: 'goal' as const,
          progress: 50,
          changeReason: '重要なマイルストーン達成',
        },
      ];

      for (const entry of entries) {
        await service.recordProgress(entry);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const significantChanges = await service.getSignificantChanges('goal-1', 10);

      expect(significantChanges).toHaveLength(1);
      expect(significantChanges[0].reason).toBe('重要なマイルストーン達成');
    });
  });

  describe('cleanupOldHistory', () => {
    it('古いデータを削除する', async () => {
      // 現在のデータを追加
      await service.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 50,
      });

      // 古いデータをシミュレート（直接内部データを操作）
      const allData = service.getAllData();
      const goalHistory = allData.get('goal:goal-1') || [];

      // 31日前のデータを追加
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      goalHistory.unshift({
        id: 'old-entry',
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 25,
        timestamp: oldDate,
      });

      allData.set('goal:goal-1', goalHistory);

      // クリーンアップ前の確認
      const historyBefore = await service.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });
      expect(historyBefore).toHaveLength(2);

      // クリーンアップ実行
      await service.cleanupOldHistory();

      // クリーンアップ後の確認
      const historyAfter = await service.getProgressHistory({
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      });
      expect(historyAfter).toHaveLength(1);
      expect(historyAfter[0].progress).toBe(50); // 新しいデータのみ残る
    });
  });

  describe('clear', () => {
    it('全てのデータをクリアする', async () => {
      await service.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 50,
      });

      await service.recordProgress({
        entityId: 'goal-2',
        entityType: 'goal',
        progress: 75,
      });

      // データが存在することを確認
      const allData = service.getAllData();
      expect(allData.size).toBeGreaterThan(0);

      // クリア実行
      service.clear();

      // データがクリアされたことを確認
      const clearedData = service.getAllData();
      expect(clearedData.size).toBe(0);
    });
  });
});
