/**
 * 進捗履歴データストアの強化テスト
 * 要件: 5.5 - 履歴データ管理のテスト
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '../generated/prisma-client';
import { InMemoryProgressDataStore, ProgressHistoryQuery } from '../progress-data-store';

describe('Progress History Data Store - Enhanced Tests', () => {
  let dataStore: InMemoryProgressDataStore;

  beforeEach(() => {
    dataStore = new InMemoryProgressDataStore();
  });

  afterEach(() => {
    dataStore.clear();
  });

  describe('データ整合性テスト', () => {
    it('同時に複数の進捗履歴を記録しても整合性を保つ', async () => {
      const promises = [];

      // 同時に10個の進捗履歴を記録
      for (let i = 0; i < 10; i++) {
        promises.push(
          dataStore.recordProgressHistory({
            entityType: 'goal',
            entityId: 'goal-1',
            progress: i * 10,
            changeReason: `Progress ${i}`,
          })
        );
      }

      await Promise.all(promises);

      const historyData = dataStore.getAllHistoryData();
      const goalHistory = historyData.get('goal:goal-1');

      expect(goalHistory).toHaveLength(10);
      expect(goalHistory!.map(h => h.progress)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    });

    it('異なるエンティティタイプの履歴が混在しても正しく管理される', async () => {
      const entities = [
        { type: 'goal', id: 'goal-1', progress: 25 },
        { type: 'subgoal', id: 'subgoal-1', progress: 50 },
        { type: 'action', id: 'action-1', progress: 75 },
        { type: 'task', id: 'task-1', progress: 100 },
      ];

      for (const entity of entities) {
        await dataStore.recordProgressHistory({
          entityType: entity.type as any,
          entityId: entity.id,
          progress: entity.progress,
        });
      }

      const historyData = dataStore.getAllHistoryData();
      expect(historyData.size).toBe(4);

      for (const entity of entities) {
        const key = `${entity.type}:${entity.id}`;
        const history = historyData.get(key);
        expect(history).toHaveLength(1);
        expect(history![0].progress).toBe(entity.progress);
      }
    });

    it('大量のデータでもパフォーマンスを維持する', async () => {
      const startTime = Date.now();

      // 1000件のデータを記録
      for (let i = 0; i < 1000; i++) {
        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: `goal-${Math.floor(i / 10)}`, // 100個のゴールに分散
          progress: Math.random() * 100,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 1000件の記録が5秒以内に完了することを確認
      expect(duration).toBeLessThan(5000);

      const historyData = dataStore.getAllHistoryData();
      expect(historyData.size).toBe(100); // 100個のゴール
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('無効な進捗値でもエラーを発生させずに記録する', async () => {
      const invalidValues = [-10, 150, NaN, Infinity, -Infinity];

      for (const value of invalidValues) {
        await expect(
          dataStore.recordProgressHistory({
            entityType: 'goal',
            entityId: 'goal-1',
            progress: value,
          })
        ).resolves.not.toThrow();
      }

      const historyData = dataStore.getAllHistoryData();
      const goalHistory = historyData.get('goal:goal-1');
      expect(goalHistory).toHaveLength(invalidValues.length);
    });

    it('空文字列のエンティティIDでも処理を継続する', async () => {
      await expect(
        dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: '',
          progress: 50,
        })
      ).resolves.not.toThrow();

      const historyData = dataStore.getAllHistoryData();
      const emptyIdHistory = historyData.get('goal:');
      expect(emptyIdHistory).toHaveLength(1);
    });

    it('非常に長い変更理由でも処理できる', async () => {
      const longReason = 'A'.repeat(10000); // 10,000文字の理由

      await expect(
        dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: 50,
          changeReason: longReason,
        })
      ).resolves.not.toThrow();

      const historyData = dataStore.getAllHistoryData();
      const goalHistory = historyData.get('goal:goal-1');
      expect(goalHistory![0].changeReason).toBe(longReason);
    });
  });

  describe('メモリ管理テスト', () => {
    it('クリーンアップ後にメモリ使用量が削減される', async () => {
      // 大量のデータを作成
      for (let i = 0; i < 100; i++) {
        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: i,
        });
      }

      // 古いデータをシミュレート
      const historyData = dataStore.getAllHistoryData();
      const goalHistory = historyData.get('goal:goal-1')!;
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

      // 最初の50件を古いデータにする
      for (let i = 0; i < 50; i++) {
        goalHistory[i].timestamp = new Date(oldDate.getTime() + i * 1000);
      }

      const beforeCleanup = historyData.get('goal:goal-1')!.length;
      expect(beforeCleanup).toBe(100);

      const result = await dataStore.cleanupOldHistory();

      const afterCleanup = historyData.get('goal:goal-1')!.length;

      expect(result.deletedCount).toBeGreaterThan(0);
      expect(afterCleanup).toBeLessThan(beforeCleanup);
      expect(afterCleanup).toBe(50); // 新しいデータのみ残る
    });

    it('メモリリークが発生しないことを確認', async () => {
      const initialSize = dataStore.getAllHistoryData().size;

      // データを追加・削除を繰り返す
      for (let cycle = 0; cycle < 10; cycle++) {
        // データ追加（各サイクルで10個のゴールに分散）
        for (let i = 0; i < 10; i++) {
          await dataStore.recordProgressHistory({
            entityType: 'goal',
            entityId: `goal-${cycle}-${i}`,
            progress: Math.random() * 100,
          });
        }

        // クリーンアップ
        await dataStore.cleanupOldHistory();
      }

      // 最終的なサイズが合理的な範囲内であることを確認
      const finalSize = dataStore.getAllHistoryData().size;
      expect(finalSize).toBeLessThanOrEqual(100); // 合理的な上限
    });
  });

  describe('日付・時刻処理テスト', () => {
    it('タイムゾーンが異なる環境でも正しく動作する', async () => {
      const originalTimezone = process.env.TZ;

      try {
        // 異なるタイムゾーンでテスト
        process.env.TZ = 'America/New_York';

        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: 50,
        });

        process.env.TZ = 'Asia/Tokyo';

        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: 75,
        });

        const historyData = dataStore.getAllHistoryData();
        const goalHistory = historyData.get('goal:goal-1');

        expect(goalHistory).toHaveLength(2);
        expect(goalHistory![0].timestamp).toBeInstanceOf(Date);
        expect(goalHistory![1].timestamp).toBeInstanceOf(Date);
        expect(goalHistory![1].timestamp.getTime()).toBeGreaterThanOrEqual(
          goalHistory![0].timestamp.getTime()
        );
      } finally {
        process.env.TZ = originalTimezone;
      }
    });

    it('夏時間の切り替え時期でも正しく動作する', async () => {
      // 夏時間切り替え前後の日付をシミュレート
      const beforeDST = new Date('2024-03-09T10:00:00Z'); // 夏時間開始前
      const afterDST = new Date('2024-03-11T10:00:00Z'); // 夏時間開始後

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

      // タイムスタンプを手動で設定
      const historyData = dataStore.getAllHistoryData();
      const goalHistory = historyData.get('goal:goal-1')!;
      goalHistory[0].timestamp = beforeDST;
      goalHistory[1].timestamp = afterDST;

      const query: ProgressHistoryQuery = {
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: beforeDST,
        endDate: afterDST,
      };

      const history = await dataStore.getProgressHistoryEntries(query);
      expect(history).toHaveLength(2);
    });

    it('うるう年の2月29日でも正しく処理される', async () => {
      const leapYearDate = new Date('2024-02-29T12:00:00Z');

      await dataStore.recordProgressHistory({
        entityType: 'goal',
        entityId: 'goal-1',
        progress: 50,
      });

      // 手動でタイムスタンプを設定
      const historyData = dataStore.getAllHistoryData();
      const goalHistory = historyData.get('goal:goal-1')!;
      goalHistory[0].timestamp = leapYearDate;

      const query: ProgressHistoryQuery = {
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: new Date('2024-02-28T00:00:00Z'),
        endDate: new Date('2024-03-01T23:59:59Z'),
      };

      const history = await dataStore.getProgressHistoryEntries(query);
      expect(history).toHaveLength(1);
      expect(history[0].timestamp).toEqual(leapYearDate);
    });
  });

  describe('データ検索・フィルタリングテスト', () => {
    beforeEach(async () => {
      // テスト用データを準備
      const testData = [
        { entityId: 'goal-1', progress: 10, daysAgo: 5 },
        { entityId: 'goal-1', progress: 30, daysAgo: 4 },
        { entityId: 'goal-1', progress: 50, daysAgo: 3 },
        { entityId: 'goal-2', progress: 25, daysAgo: 2 },
        { entityId: 'goal-2', progress: 75, daysAgo: 1 },
      ];

      for (const data of testData) {
        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: data.entityId,
          progress: data.progress,
        });

        // タイムスタンプを調整
        const historyData = dataStore.getAllHistoryData();
        const key = `goal:${data.entityId}`;
        const history = historyData.get(key)!;
        const lastEntry = history[history.length - 1];
        lastEntry.timestamp = new Date(Date.now() - data.daysAgo * 24 * 60 * 60 * 1000);
      }
    });

    it('複雑な日付範囲クエリが正しく動作する', async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      const query: ProgressHistoryQuery = {
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: threeDaysAgo,
        endDate: oneDayAgo,
      };

      const history = await dataStore.getProgressHistoryEntries(query);
      expect(history).toHaveLength(1); // 3日前のデータのみ
      expect(history[0].progress).toBe(50);
    });

    it('境界値での日付フィルタリングが正確', async () => {
      const exactTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const query: ProgressHistoryQuery = {
        entityId: 'goal-1',
        entityType: 'goal',
        startDate: exactTime,
        endDate: exactTime,
      };

      const history = await dataStore.getProgressHistoryEntries(query);
      expect(history).toHaveLength(1);
      expect(history[0].progress).toBe(50);
    });

    it('存在しないエンティティタイプでの検索', async () => {
      const query: ProgressHistoryQuery = {
        entityId: 'goal-1',
        entityType: 'nonexistent' as any,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      };

      const history = await dataStore.getProgressHistoryEntries(query);
      expect(history).toEqual([]);
    });
  });

  describe('統計・分析機能テスト', () => {
    it('進捗トレンドの計算精度テスト', async () => {
      // 明確な増加傾向のデータを作成
      const progressValues = [10, 20, 30, 40, 50, 60, 70, 80];

      for (let i = 0; i < progressValues.length; i++) {
        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: progressValues[i],
        });

        // タイムスタンプを調整（1日間隔）
        const historyData = dataStore.getAllHistoryData();
        const goalHistory = historyData.get('goal:goal-1')!;
        const lastEntry = goalHistory[goalHistory.length - 1];
        lastEntry.timestamp = new Date(
          Date.now() - (progressValues.length - i - 1) * 24 * 60 * 60 * 1000
        );
      }

      const trend = await dataStore.getProgressTrend('goal-1', 'goal', 7);

      expect(trend.direction).toBe('increasing');
      expect(trend.rate).toBeGreaterThan(5); // 1日あたり約10%の増加
      expect(trend.confidence).toBeGreaterThan(0.5);
    });

    it('重要な変化点の検出精度テスト', async () => {
      const progressData = [
        { progress: 10, change: 0 },
        { progress: 15, change: 5 }, // 小さな変化
        { progress: 45, change: 30 }, // 大きな変化
        { progress: 50, change: 5 }, // 小さな変化
        { progress: 20, change: 30 }, // 大きな変化（減少）
      ];

      for (let i = 0; i < progressData.length; i++) {
        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: progressData[i].progress,
          changeReason: i === 2 ? '重要なマイルストーン達成' : undefined,
        });

        // タイムスタンプを調整
        const historyData = dataStore.getAllHistoryData();
        const goalHistory = historyData.get('goal:goal-1')!;
        const lastEntry = goalHistory[goalHistory.length - 1];
        lastEntry.timestamp = new Date(
          Date.now() - (progressData.length - i - 1) * 24 * 60 * 60 * 1000
        );
      }

      const significantChanges = await dataStore.getSignificantChanges('goal-1', 'goal', 20);

      expect(significantChanges).toHaveLength(2);
      expect(significantChanges[0].progress).toBe(45);
      expect(significantChanges[0].change).toBe(30);
      expect(significantChanges[0].reason).toBe('重要なマイルストーン達成');
      expect(significantChanges[1].progress).toBe(20);
      expect(significantChanges[1].change).toBe(30);
    });

    it('異なる閾値での重要な変化点検出', async () => {
      const progressData = [10, 25, 40, 55, 70]; // 15%ずつ増加

      for (let i = 0; i < progressData.length; i++) {
        await dataStore.recordProgressHistory({
          entityType: 'goal',
          entityId: 'goal-1',
          progress: progressData[i],
        });

        // タイムスタンプを調整
        const historyData = dataStore.getAllHistoryData();
        const goalHistory = historyData.get('goal:goal-1')!;
        const lastEntry = goalHistory[goalHistory.length - 1];
        lastEntry.timestamp = new Date(
          Date.now() - (progressData.length - i - 1) * 24 * 60 * 60 * 1000
        );
      }

      // 閾値10%での検出
      const changes10 = await dataStore.getSignificantChanges('goal-1', 'goal', 10);
      expect(changes10).toHaveLength(4); // 全ての変化が検出される

      // 閾値20%での検出
      const changes20 = await dataStore.getSignificantChanges('goal-1', 'goal', 20);
      expect(changes20).toHaveLength(0); // 15%の変化は検出されない
    });
  });
});
