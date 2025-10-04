import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '../generated/prisma-client';
import {
  PrismaProgressDataStore,
  InMemoryProgressDataStore,
  ProgressHistoryQuery,
} from './progress-data-store';

describe('Progress History Data Store', () => {
  describe('InMemoryProgressDataStore', () => {
    let dataStore: InMemoryProgressDataStore;

    beforeEach(() => {
      dataStore = new InMemoryProgressDataStore();
    });

    afterEach(() => {
      dataStore.clear();
    });

    describe('recordProgressHistory', () => {
      it('進捗履歴を正しく記録する', async () => {
        const entry = {
          entityType: 'goal' as const,
          entityId: 'goal-1',
          progress: 50,
          changeReason: 'Test progress update',
        };

        await dataStore.recordProgressHistory(entry);

        const historyData = dataStore.getAllHistoryData();
        const goalHistory = historyData.get('goal:goal-1');

        expect(goalHistory).toBeDefined();
        expect(goalHistory).toHaveLength(1);
        expect(goalHistory![0]).toMatchObject({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: 50,
          changeReason: 'Test progress update',
        });
        expect(goalHistory![0].id).toBeDefined();
        expect(goalHistory![0].timestamp).toBeInstanceOf(Date);
      });

      it('複数の進捗履歴を記録できる', async () => {
        const entries = [
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 25 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 50 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 75 },
        ];

        for (const entry of entries) {
          await dataStore.recordProgressHistory(entry);
        }

        const historyData = dataStore.getAllHistoryData();
        const goalHistory = historyData.get('goal:goal-1');

        expect(goalHistory).toHaveLength(3);
        expect(goalHistory!.map(h => h.progress)).toEqual([25, 50, 75]);
      });
    });

    describe('getProgressHistoryEntries', () => {
      beforeEach(async () => {
        // テストデータを準備
        const baseDate = new Date('2024-01-01T00:00:00Z');
        const entries = [
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 25 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 50 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 75 },
          { entityType: 'action' as const, entityId: 'action-1', progress: 100 },
        ];

        for (let i = 0; i < entries.length; i++) {
          await dataStore.recordProgressHistory(entries[i]);
          // タイムスタンプを調整（テスト用）
          const historyData = dataStore.getAllHistoryData();
          const key = `${entries[i].entityType}:${entries[i].entityId}`;
          const history = historyData.get(key);
          if (history && history.length > 0) {
            history[history.length - 1].timestamp = new Date(
              baseDate.getTime() + i * 24 * 60 * 60 * 1000
            );
          }
        }
      });

      it('指定した期間の進捗履歴を取得する', async () => {
        const query: ProgressHistoryQuery = {
          entityId: 'goal-1',
          entityType: 'goal',
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-03T23:59:59Z'),
        };

        const history = await dataStore.getProgressHistoryEntries(query);

        expect(history).toHaveLength(3);
        expect(history.map(h => h.progress)).toEqual([25, 50, 75]);
      });

      it('期間外のデータは除外される', async () => {
        const query: ProgressHistoryQuery = {
          entityId: 'goal-1',
          entityType: 'goal',
          startDate: new Date('2024-01-02T00:00:00Z'),
          endDate: new Date('2024-01-02T23:59:59Z'),
        };

        const history = await dataStore.getProgressHistoryEntries(query);

        expect(history).toHaveLength(1);
        expect(history[0].progress).toBe(50);
      });

      it('存在しないエンティティの場合は空配列を返す', async () => {
        const query: ProgressHistoryQuery = {
          entityId: 'nonexistent',
          entityType: 'goal',
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-03T23:59:59Z'),
        };

        const history = await dataStore.getProgressHistoryEntries(query);

        expect(history).toHaveLength(0);
      });
    });

    describe('getProgressTrend', () => {
      beforeEach(async () => {
        // 増加傾向のテストデータを準備
        const entries = [
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 10 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 30 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 50 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 70 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 90 },
        ];

        const baseDate = new Date();
        for (let i = 0; i < entries.length; i++) {
          await dataStore.recordProgressHistory(entries[i]);
          // タイムスタンプを調整
          const historyData = dataStore.getAllHistoryData();
          const history = historyData.get('goal:goal-1');
          if (history && history.length > 0) {
            history[history.length - 1].timestamp = new Date(
              baseDate.getTime() - (entries.length - i - 1) * 24 * 60 * 60 * 1000
            );
          }
        }
      });

      it('増加傾向を正しく検出する', async () => {
        const trend = await dataStore.getProgressTrend('goal-1', 'goal', 7);

        expect(trend.direction).toBe('increasing');
        expect(trend.rate).toBeGreaterThan(0);
        expect(trend.confidence).toBeGreaterThan(0);
      });

      it('データが不足している場合は安定を返す', async () => {
        const trend = await dataStore.getProgressTrend('nonexistent', 'goal', 7);

        expect(trend.direction).toBe('stable');
        expect(trend.rate).toBe(0);
        expect(trend.confidence).toBe(0);
      });
    });

    describe('getSignificantChanges', () => {
      beforeEach(async () => {
        // 大きな変化を含むテストデータを準備
        const entries = [
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 10 },
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 15 }, // 小さな変化
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 40 }, // 大きな変化 (+25)
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 45 }, // 小さな変化
          { entityType: 'goal' as const, entityId: 'goal-1', progress: 20 }, // 大きな変化 (-25)
        ];

        const baseDate = new Date();
        for (let i = 0; i < entries.length; i++) {
          await dataStore.recordProgressHistory(entries[i]);
          // タイムスタンプを調整
          const historyData = dataStore.getAllHistoryData();
          const history = historyData.get('goal:goal-1');
          if (history && history.length > 0) {
            history[history.length - 1].timestamp = new Date(
              baseDate.getTime() - (entries.length - i - 1) * 24 * 60 * 60 * 1000
            );
          }
        }
      });

      it('閾値を超える変化を検出する', async () => {
        const significantChanges = await dataStore.getSignificantChanges('goal-1', 'goal', 20);

        expect(significantChanges).toHaveLength(2);
        expect(significantChanges[0].progress).toBe(40);
        expect(significantChanges[0].change).toBe(25);
        expect(significantChanges[1].progress).toBe(20);
        expect(significantChanges[1].change).toBe(25);
      });

      it('閾値以下の変化は除外される', async () => {
        const significantChanges = await dataStore.getSignificantChanges('goal-1', 'goal', 30);

        expect(significantChanges).toHaveLength(0);
      });
    });

    describe('cleanupOldHistory', () => {
      beforeEach(async () => {
        // 古いデータと新しいデータを準備
        const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35日前
        const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5日前

        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: 25,
        });

        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: 75,
        });

        // タイムスタンプを調整
        const historyData = dataStore.getAllHistoryData();
        const history = historyData.get('goal:goal-1');
        if (history && history.length >= 2) {
          history[0].timestamp = oldDate;
          history[1].timestamp = recentDate;
        }

        // 通常の進捗データも追加（直接データを操作）
        const progressData = dataStore.getAllData();
        const progressKey = 'goal:goal-1';
        const existingProgress = progressData.get(progressKey) || [];
        existingProgress.push({ progress: 50, timestamp: oldDate });
        progressData.set(progressKey, existingProgress);
      });

      it('古いデータを削除し、新しいデータを保持する', async () => {
        const result = await dataStore.cleanupOldHistory();

        expect(result.deletedCount).toBeGreaterThan(0);

        // 履歴データの確認
        const historyData = dataStore.getAllHistoryData();
        const history = historyData.get('goal:goal-1');
        expect(history).toHaveLength(1); // 新しいデータのみ残る

        // 残ったデータが新しいデータ（5日前）であることを確認
        const remainingEntry = history![0];
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        expect(remainingEntry.timestamp.getTime()).toBeGreaterThan(fiveDaysAgo.getTime() - 1000); // 1秒の誤差を許容
        expect(remainingEntry.progress).toBe(75);

        // 通常の進捗データの確認
        const progressData = dataStore.getAllData();
        const progress = progressData.get('goal:goal-1');
        expect(progress || []).toHaveLength(0); // 古いデータは削除される
      });
    });

    describe('saveProgress integration', () => {
      it('進捗保存時に履歴が自動記録される', async () => {
        await dataStore.saveProgress('goal', 'goal-1', 25);
        await dataStore.saveProgress('goal', 'goal-1', 50);

        const historyData = dataStore.getAllHistoryData();
        const history = historyData.get('goal:goal-1');

        expect(history).toHaveLength(2);
        expect(history![0].progress).toBe(25);
        expect(history![0].changeReason).toBe('Initial progress');
        expect(history![1].progress).toBe(50);
        expect(history![1].changeReason).toBe('Progress updated');
      });

      it('進捗に変化がない場合は履歴を記録しない', async () => {
        await dataStore.saveProgress('goal', 'goal-1', 50);
        await dataStore.saveProgress('goal', 'goal-1', 50); // 同じ値

        const historyData = dataStore.getAllHistoryData();
        const history = historyData.get('goal:goal-1');

        expect(history).toHaveLength(1); // 最初の記録のみ
        expect(history![0].progress).toBe(50);
      });

      it('1%未満の変化は履歴を記録しない', async () => {
        await dataStore.saveProgress('goal', 'goal-1', 50.2);
        await dataStore.saveProgress('goal', 'goal-1', 50.4); // 0.2%の変化（四捨五入で同じ値）

        const historyData = dataStore.getAllHistoryData();
        const history = historyData.get('goal:goal-1');

        expect(history).toHaveLength(1); // 最初の記録のみ（四捨五入で同じ値）
        expect(history![0].progress).toBe(50);
      });
    });
  });

  // PrismaProgressDataStoreのテストは実際のデータベース接続が必要なため、
  // 統合テストとして別途実装することを推奨
  describe('PrismaProgressDataStore', () => {
    it('should be tested in integration tests', () => {
      // このテストは統合テスト環境で実装する
      expect(true).toBe(true);
    });
  });
});
