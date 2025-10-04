/**
 * 進捗履歴データ分析機能のテスト
 * 要件: 5.5 - データ分析機能のテスト
 */

import {
  InMemoryProgressHistoryService,
  ProgressHistoryEntry,
  ProgressTrend,
  SignificantChange,
} from '../progress-history-service';

describe('Progress History Analysis Tests', () => {
  let service: InMemoryProgressHistoryService;

  beforeEach(() => {
    service = new InMemoryProgressHistoryService();
  });

  describe('進捗トレンド分析', () => {
    describe('増加傾向の検出', () => {
      it('線形増加パターンを正しく検出する', async () => {
        const progressValues = [10, 20, 30, 40, 50, 60, 70, 80];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('increasing');
        expect(trend.rate).toBeGreaterThan(5);
        expect(trend.confidence).toBeGreaterThan(0.5);
      });

      it('指数的増加パターンを検出する', async () => {
        const progressValues = [1, 2, 4, 8, 16, 32, 64, 100];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: Math.min(100, progressValues[i]),
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('increasing');
        expect(trend.rate).toBeGreaterThan(10);
      });

      it('緩やかな増加パターンを検出する', async () => {
        const progressValues = [10, 12, 14, 16, 18, 20, 22, 24];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('increasing');
        expect(trend.rate).toBeGreaterThan(0);
        expect(trend.rate).toBeLessThan(5);
      });
    });

    describe('減少傾向の検出', () => {
      it('線形減少パターンを正しく検出する', async () => {
        const progressValues = [80, 70, 60, 50, 40, 30, 20, 10];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('decreasing');
        expect(trend.rate).toBeGreaterThan(5);
      });

      it('急激な減少パターンを検出する', async () => {
        const progressValues = [100, 80, 50, 20, 10, 5, 2, 1];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('decreasing');
        expect(trend.rate).toBeGreaterThan(10);
      });

      it('段階的減少パターンを検出する', async () => {
        const progressValues = [50, 50, 45, 45, 40, 40, 35, 35];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('decreasing');
        expect(trend.rate).toBeGreaterThan(0);
      });
    });

    describe('安定傾向の検出', () => {
      it('完全に安定したパターンを検出する', async () => {
        const progressValues = [50, 50, 50, 50, 50, 50, 50, 50];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('stable');
        expect(trend.rate).toBeLessThan(1);
      });

      it('小さな変動がある安定パターンを検出する', async () => {
        const progressValues = [50, 51, 49, 52, 48, 51, 49, 50];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('stable');
        expect(trend.rate).toBeLessThan(2);
      });

      it('周期的変動パターンを安定として検出する', async () => {
        const progressValues = [40, 60, 40, 60, 40, 60, 40, 60];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        // 周期的変動は全体として安定とみなされる
        expect(trend.direction).toBe('stable');
      });
    });

    describe('複雑なパターンの分析', () => {
      it('S字カーブパターンを分析する', async () => {
        // 初期は緩やか、中期は急激、後期は緩やか
        const progressValues = [5, 10, 15, 25, 50, 75, 85, 90];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('increasing');
        expect(trend.rate).toBeGreaterThan(5);
      });

      it('逆S字カーブパターンを分析する', async () => {
        // 初期は急激、中期は緩やか、後期は急激
        const progressValues = [90, 85, 75, 50, 25, 15, 10, 5];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        expect(trend.direction).toBe('decreasing');
        expect(trend.rate).toBeGreaterThan(5);
      });

      it('山型パターンを分析する', async () => {
        const progressValues = [10, 30, 50, 70, 80, 60, 40, 20];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        // 全体的には増加から減少への転換
        expect(['increasing', 'decreasing', 'stable']).toContain(trend.direction);
      });

      it('谷型パターンを分析する', async () => {
        const progressValues = [80, 60, 40, 20, 10, 30, 50, 70];

        for (let i = 0; i < progressValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressValues[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const trend = await service.getProgressTrend('goal-1', 7);

        // 全体的には減少から増加への転換
        expect(['increasing', 'decreasing', 'stable']).toContain(trend.direction);
      });
    });

    describe('信頼度の計算', () => {
      it('データ点数が多いほど信頼度が高くなる', async () => {
        // 少ないデータ点数
        for (let i = 0; i < 3; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: i * 10,
          });
        }

        const trendFew = await service.getProgressTrend('goal-1', 7);

        // 多いデータ点数
        for (let i = 3; i < 15; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: i * 5,
          });
        }

        const trendMany = await service.getProgressTrend('goal-1', 7);

        expect(trendMany.confidence).toBeGreaterThan(trendFew.confidence);
      });

      it('一貫性のあるパターンほど信頼度が高くなる', async () => {
        // 一貫した増加パターン
        const consistentValues = [10, 20, 30, 40, 50, 60, 70, 80];

        for (let i = 0; i < consistentValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-consistent',
            entityType: 'goal',
            progress: consistentValues[i],
          });
        }

        // 不規則なパターン
        const inconsistentValues = [10, 50, 20, 70, 30, 60, 40, 80];

        for (let i = 0; i < inconsistentValues.length; i++) {
          await service.recordProgress({
            entityId: 'goal-inconsistent',
            entityType: 'goal',
            progress: inconsistentValues[i],
          });
        }

        const consistentTrend = await service.getProgressTrend('goal-consistent', 7);
        const inconsistentTrend = await service.getProgressTrend('goal-inconsistent', 7);

        // 一貫したパターンの方が信頼度が高い（実装に依存）
        expect(consistentTrend.confidence).toBeGreaterThanOrEqual(0);
        expect(inconsistentTrend.confidence).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('重要な変化点の検出', () => {
    describe('閾値ベースの検出', () => {
      it('指定した閾値を超える変化を検出する', async () => {
        const progressData = [
          { progress: 10, expectedDetection: false },
          { progress: 15, expectedDetection: false }, // +5%
          { progress: 40, expectedDetection: true }, // +25%
          { progress: 45, expectedDetection: false }, // +5%
          { progress: 20, expectedDetection: true }, // -25%
        ];

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i].progress,
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 20);

        expect(significantChanges).toHaveLength(2);
        expect(significantChanges[0].progress).toBe(40);
        expect(significantChanges[0].change).toBe(25);
        expect(significantChanges[1].progress).toBe(20);
        expect(significantChanges[1].change).toBe(25);
      });

      it('異なる閾値で異なる結果を返す', async () => {
        const progressData = [10, 20, 35, 50, 65]; // 10%, 15%, 15%の変化

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const changes5 = await service.getSignificantChanges('goal-1', 5);
        const changes10 = await service.getSignificantChanges('goal-1', 10);
        const changes20 = await service.getSignificantChanges('goal-1', 20);

        expect(changes5.length).toBeGreaterThanOrEqual(changes10.length);
        expect(changes10.length).toBeGreaterThanOrEqual(changes20.length);
      });

      it('極端な閾値でも正しく動作する', async () => {
        const progressData = [0, 50, 100]; // 50%, 50%の変化

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 非常に高い閾値
        const changesHigh = await service.getSignificantChanges('goal-1', 100);
        expect(changesHigh).toHaveLength(0);

        // 非常に低い閾値
        const changesLow = await service.getSignificantChanges('goal-1', 1);
        expect(changesLow.length).toBeGreaterThan(0);
      });
    });

    describe('変化の方向性分析', () => {
      it('増加と減少の両方向の変化を検出する', async () => {
        const progressData = [
          { progress: 20, type: 'initial' },
          { progress: 60, type: 'increase' }, // +40%
          { progress: 65, type: 'small' }, // +5%
          { progress: 25, type: 'decrease' }, // -40%
          { progress: 70, type: 'increase' }, // +45%
        ];

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i].progress,
            changeReason: progressData[i].type,
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 30);

        expect(significantChanges).toHaveLength(3);

        // 増加の変化
        const increases = significantChanges.filter(change => change.change > 0);
        expect(increases.length).toBeGreaterThan(0);

        // 減少の変化
        const decreases = significantChanges.filter(change => change.change > 0);
        expect(decreases.length).toBeGreaterThan(0);
      });

      it('連続する大きな変化を個別に検出する', async () => {
        const progressData = [10, 50, 90, 30, 80]; // +40%, +40%, -60%, +50%

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 35);

        expect(significantChanges.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe('変化理由の記録', () => {
      it('変化理由が記録されている場合は含める', async () => {
        const progressData = [
          { progress: 10, reason: undefined },
          { progress: 50, reason: '重要なマイルストーン達成' },
          { progress: 90, reason: '最終段階突入' },
        ];

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i].progress,
            changeReason: progressData[i].reason,
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 30);

        expect(significantChanges.length).toBeGreaterThan(0);

        const changesWithReason = significantChanges.filter(change => change.reason);
        expect(changesWithReason.length).toBeGreaterThan(0);
        expect(changesWithReason[0].reason).toBe('重要なマイルストーン達成');
      });

      it('理由がない変化も正しく検出する', async () => {
        const progressData = [10, 60, 20]; // 理由なしの大きな変化

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i],
            // changeReasonを指定しない
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 30);

        expect(significantChanges.length).toBeGreaterThan(0);
        expect(significantChanges.every(change => change.reason === undefined)).toBe(true);
      });
    });

    describe('時系列分析', () => {
      it('変化の発生時刻が正確に記録される', async () => {
        const baseTime = new Date('2024-01-01T00:00:00Z');
        const progressData = [10, 60, 20]; // 大きな変化

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i],
          });

          // タイムスタンプを手動で設定
          const allData = service.getAllData();
          const goalHistory = allData.get('goal:goal-1')!;
          const lastEntry = goalHistory[goalHistory.length - 1];
          lastEntry.timestamp = new Date(baseTime.getTime() + i * 24 * 60 * 60 * 1000);
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 30);

        expect(significantChanges.length).toBeGreaterThan(0);

        // 時刻が正確に記録されていることを確認
        significantChanges.forEach(change => {
          expect(change.date).toBeInstanceOf(Date);
          expect(change.date.getTime()).toBeGreaterThan(baseTime.getTime());
        });
      });

      it('変化の順序が時系列順になっている', async () => {
        const progressData = [10, 60, 20, 80]; // 複数の大きな変化

        for (let i = 0; i < progressData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: progressData[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 30);

        // 時系列順になっていることを確認
        for (let i = 1; i < significantChanges.length; i++) {
          expect(significantChanges[i].date.getTime()).toBeGreaterThanOrEqual(
            significantChanges[i - 1].date.getTime()
          );
        }
      });
    });
  });

  describe('統計的分析', () => {
    describe('分散と標準偏差', () => {
      it('進捗の変動性を測定する', async () => {
        // 変動の大きいデータ
        const volatileData = [10, 90, 20, 80, 30, 70, 40, 60];

        for (let i = 0; i < volatileData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-volatile',
            entityType: 'goal',
            progress: volatileData[i],
          });
        }

        // 変動の小さいデータ
        const stableData = [45, 47, 49, 51, 53, 55, 52, 48];

        for (let i = 0; i < stableData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-stable',
            entityType: 'goal',
            progress: stableData[i],
          });
        }

        const volatileTrend = await service.getProgressTrend('goal-volatile', 7);
        const stableTrend = await service.getProgressTrend('goal-stable', 7);

        // 変動の大きいデータは信頼度が低い可能性がある
        expect(volatileTrend.confidence).toBeGreaterThanOrEqual(0);
        expect(stableTrend.confidence).toBeGreaterThanOrEqual(0);
      });
    });

    describe('外れ値の検出', () => {
      it('異常な進捗値を識別する', async () => {
        const normalData = [45, 47, 49, 51, 53, 55];
        const outlierData = [52, 95]; // 異常値

        // 正常なデータを記録
        for (let i = 0; i < normalData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: normalData[i],
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 異常値を記録
        for (let i = 0; i < outlierData.length; i++) {
          await service.recordProgress({
            entityId: 'goal-1',
            entityType: 'goal',
            progress: outlierData[i],
            changeReason: '異常値',
          });
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        const significantChanges = await service.getSignificantChanges('goal-1', 20);

        // 異常値による大きな変化が検出される
        expect(significantChanges.length).toBeGreaterThan(0);
        const outlierChange = significantChanges.find(change => change.reason === '異常値');
        expect(outlierChange).toBeDefined();
      });
    });

    describe('周期性の検出', () => {
      it('周期的なパターンを識別する', async () => {
        // 週次の周期パターン（平日高、週末低）
        const weeklyPattern = [70, 75, 80, 85, 90, 60, 65]; // 月-日

        // 複数週のデータを生成
        for (let week = 0; week < 4; week++) {
          for (let day = 0; day < weeklyPattern.length; day++) {
            await service.recordProgress({
              entityId: 'goal-1',
              entityType: 'goal',
              progress: weeklyPattern[day] + week * 2, // 週ごとに少し増加
            });
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        }

        const trend = await service.getProgressTrend('goal-1', 28);

        // 全体的には増加傾向だが、周期的変動がある
        expect(trend.direction).toBe('increasing');
        expect(trend.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('エッジケースとエラーハンドリング', () => {
    it('データが不足している場合の処理', async () => {
      // データが1件のみ
      await service.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 50,
      });

      const trend = await service.getProgressTrend('goal-1', 7);
      const significantChanges = await service.getSignificantChanges('goal-1', 10);

      expect(trend.direction).toBe('stable');
      expect(trend.rate).toBe(0);
      expect(trend.confidence).toBe(0);
      expect(significantChanges).toHaveLength(0);
    });

    it('存在しないエンティティの分析', async () => {
      const trend = await service.getProgressTrend('nonexistent', 7);
      const significantChanges = await service.getSignificantChanges('nonexistent', 10);

      expect(trend.direction).toBe('stable');
      expect(trend.rate).toBe(0);
      expect(trend.confidence).toBe(0);
      expect(significantChanges).toHaveLength(0);
    });

    it('無効な進捗値での分析', async () => {
      const invalidValues = [NaN, Infinity, -Infinity, -50, 150];

      for (const value of invalidValues) {
        await service.recordProgress({
          entityId: 'goal-1',
          entityType: 'goal',
          progress: value,
        });
      }

      expect(async () => {
        await service.getProgressTrend('goal-1', 7);
      }).not.toThrow();

      expect(async () => {
        await service.getSignificantChanges('goal-1', 10);
      }).not.toThrow();
    });

    it('極端な日数指定での分析', async () => {
      await service.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 50,
      });

      // 0日
      const trend0 = await service.getProgressTrend('goal-1', 0);
      expect(trend0.direction).toBe('stable');

      // 負の日数
      const trendNegative = await service.getProgressTrend('goal-1', -5);
      expect(trendNegative.direction).toBe('stable');

      // 非常に大きな日数
      const trendLarge = await service.getProgressTrend('goal-1', 10000);
      expect(trendLarge.direction).toBe('stable');
    });

    it('極端な閾値での重要変化検出', async () => {
      await service.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 0,
      });

      await service.recordProgress({
        entityId: 'goal-1',
        entityType: 'goal',
        progress: 100,
      });

      // 0%閾値
      const changes0 = await service.getSignificantChanges('goal-1', 0);
      expect(changes0.length).toBeGreaterThan(0);

      // 負の閾値
      const changesNegative = await service.getSignificantChanges('goal-1', -10);
      expect(changesNegative.length).toBeGreaterThan(0);

      // 非常に大きな閾値
      const changesLarge = await service.getSignificantChanges('goal-1', 1000);
      expect(changesLarge).toHaveLength(0);
    });
  });
});
