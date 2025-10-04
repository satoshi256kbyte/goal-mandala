/**
 * 進捗計算エンジンのパフォーマンステスト
 * 大量データでの進捗計算パフォーマンスとメモリ使用量をテスト
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '../../generated/prisma-client';
import { ProgressCalculationEngine } from '../progress-calculation';
import { InMemoryProgressDataStore } from '../progress-data-store';

// パフォーマンス測定ヘルパー
const measurePerformance = async (operation: () => Promise<void> | void): Promise<number> => {
  const start = process.hrtime.bigint();
  await operation();
  const end = process.hrtime.bigint();
  return Number(end - start) / 1_000_000; // ナノ秒をミリ秒に変換
};

// メモリ使用量測定ヘルパー
const measureMemoryUsage = (): number => {
  const memUsage = process.memoryUsage();
  return memUsage.heapUsed;
};

// 大量データ生成ヘルパー
const generateLargeDataset = async (
  prisma: PrismaClient,
  goalCount: number = 10,
  subGoalsPerGoal: number = 8,
  actionsPerSubGoal: number = 8,
  tasksPerAction: number = 10
) => {
  const goals = [];

  for (let g = 0; g < goalCount; g++) {
    const goal = await prisma.goal.create({
      data: {
        id: `perf-goal-${g}`,
        userId: `perf-user-${g}`,
        title: `Performance Test Goal ${g}`,
        description: `Goal for performance testing ${g}`,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        background: `Background for goal ${g}`,
        status: 'ACTIVE',
        progress: 0,
      },
    });
    goals.push(goal);

    const subGoals = [];
    for (let sg = 0; sg < subGoalsPerGoal; sg++) {
      const subGoal = await prisma.subGoal.create({
        data: {
          id: `perf-subgoal-${g}-${sg}`,
          goalId: goal.id,
          title: `SubGoal ${g}-${sg}`,
          description: `SubGoal for performance testing ${g}-${sg}`,
          background: `Background for subgoal ${g}-${sg}`,
          position: sg,
          progress: 0,
        },
      });
      subGoals.push(subGoal);

      const actions = [];
      for (let a = 0; a < actionsPerSubGoal; a++) {
        const action = await prisma.action.create({
          data: {
            id: `perf-action-${g}-${sg}-${a}`,
            subGoalId: subGoal.id,
            title: `Action ${g}-${sg}-${a}`,
            description: `Action for performance testing ${g}-${sg}-${a}`,
            background: `Background for action ${g}-${sg}-${a}`,
            type: a % 3 === 0 ? 'HABIT' : 'EXECUTION',
            position: a,
            progress: 0,
          },
        });
        actions.push(action);

        // タスクを作成
        for (let t = 0; t < tasksPerAction; t++) {
          await prisma.task.create({
            data: {
              id: `perf-task-${g}-${sg}-${a}-${t}`,
              actionId: action.id,
              title: `Task ${g}-${sg}-${a}-${t}`,
              description: `Task for performance testing ${g}-${sg}-${a}-${t}`,
              type: action.type === 'HABIT' ? 'HABIT' : 'EXECUTION',
              status: Math.random() > 0.5 ? 'COMPLETED' : 'NOT_STARTED',
              estimatedMinutes: 30,
            },
          });
        }
      }
    }
  }

  return goals;
};

// テスト用のPrismaクライアント（インメモリSQLite）
const createTestPrisma = (): PrismaClient => {
  return new PrismaClient({
    datasources: {
      db: {
        url: 'file:./test-performance.db',
      },
    },
  });
};

describe('進捗計算エンジンパフォーマンステスト', () => {
  let prisma: PrismaClient;
  let progressDataStore: InMemoryProgressDataStore;
  let engine: ProgressCalculationEngine;
  let initialMemory: number;

  beforeEach(async () => {
    prisma = createTestPrisma();
    progressDataStore = new InMemoryProgressDataStore();
    engine = new ProgressCalculationEngine(prisma, progressDataStore);
    initialMemory = measureMemoryUsage();

    // テスト用のデータベーススキーマを作成
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Goal" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "deadline" DATETIME NOT NULL,
        "background" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "progress" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SubGoal" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "goalId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "background" TEXT NOT NULL,
        "position" INTEGER NOT NULL,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Action" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "subGoalId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "background" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'EXECUTION',
        "position" INTEGER NOT NULL,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("subGoalId") REFERENCES "SubGoal"("id") ON DELETE CASCADE
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Task" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "actionId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "type" TEXT NOT NULL DEFAULT 'EXECUTION',
        "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
        "estimatedMinutes" INTEGER NOT NULL,
        "completedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE
      )
    `;

    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ProgressHistory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "progress" INTEGER NOT NULL,
        "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;
  });

  afterEach(async () => {
    await prisma.$disconnect();

    // ガベージコレクションを強制実行
    if (global.gc) {
      global.gc();
    }
  });

  describe('大量データでの進捗計算パフォーマンス', () => {
    it('小規模データセット（1目標）の進捗計算が100ms以内で完了する', async () => {
      const goals = await generateLargeDataset(prisma, 1, 8, 8, 5);
      const goalId = goals[0].id;

      const calculationTime = await measurePerformance(async () => {
        await engine.calculateGoalProgress(goalId);
      });

      expect(calculationTime).toBeLessThan(100);
    });

    it('中規模データセット（5目標）の進捗計算が500ms以内で完了する', async () => {
      const goals = await generateLargeDataset(prisma, 5, 8, 8, 5);

      const calculationTime = await measurePerformance(async () => {
        for (const goal of goals) {
          await engine.calculateGoalProgress(goal.id);
        }
      });

      expect(calculationTime).toBeLessThan(500);
    });

    it('大規模データセット（10目標）の進捗計算が2秒以内で完了する', async () => {
      const goals = await generateLargeDataset(prisma, 10, 8, 8, 10);

      const calculationTime = await measurePerformance(async () => {
        for (const goal of goals) {
          await engine.calculateGoalProgress(goal.id);
        }
      });

      expect(calculationTime).toBeLessThan(2000);
    });

    it('階層的進捗再計算が効率的に実行される', async () => {
      const goals = await generateLargeDataset(prisma, 3, 8, 8, 8);
      const goalId = goals[0].id;

      // 最初のタスクを取得
      const firstTask = await prisma.task.findFirst({
        where: {
          action: {
            subGoal: {
              goalId: goalId,
            },
          },
        },
      });

      expect(firstTask).toBeTruthy();

      const recalculationTime = await measurePerformance(async () => {
        await engine.recalculateFromTask(firstTask!.id);
      });

      // 階層的再計算が300ms以内で完了
      expect(recalculationTime).toBeLessThan(300);
    });

    it('並列進捗計算が効率的に実行される', async () => {
      const goals = await generateLargeDataset(prisma, 5, 8, 8, 5);

      const parallelCalculationTime = await measurePerformance(async () => {
        // 全ての目標の進捗を並列計算
        await Promise.all(goals.map(goal => engine.calculateGoalProgress(goal.id)));
      });

      // 並列計算が1秒以内で完了
      expect(parallelCalculationTime).toBeLessThan(1000);
    });
  });

  describe('キャッシュ性能', () => {
    it('キャッシュヒット時の計算が10ms以内で完了する', async () => {
      const goals = await generateLargeDataset(prisma, 1, 8, 8, 5);
      const goalId = goals[0].id;

      // 初回計算（キャッシュなし）
      await engine.calculateGoalProgress(goalId);

      // キャッシュヒット時の計算時間を測定
      const cachedCalculationTime = await measurePerformance(async () => {
        await engine.calculateGoalProgress(goalId);
      });

      expect(cachedCalculationTime).toBeLessThan(10);
    });

    it('大量のキャッシュエントリでも性能が劣化しない', async () => {
      const goals = await generateLargeDataset(prisma, 5, 8, 8, 5);

      // 大量のキャッシュエントリを作成
      for (const goal of goals) {
        await engine.calculateGoalProgress(goal.id);
      }

      const cacheStats = engine.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(100); // 大量のキャッシュエントリ

      // キャッシュが大量にある状態での計算時間
      const calculationTime = await measurePerformance(async () => {
        await engine.calculateGoalProgress(goals[0].id);
      });

      expect(calculationTime).toBeLessThan(20);
    });

    it('キャッシュ無効化が効率的に実行される', async () => {
      const goals = await generateLargeDataset(prisma, 2, 8, 8, 5);
      const goalId = goals[0].id;

      // キャッシュを構築
      await engine.calculateGoalProgress(goalId);

      // 最初のタスクを取得
      const firstTask = await prisma.task.findFirst({
        where: {
          action: {
            subGoal: {
              goalId: goalId,
            },
          },
        },
      });

      const invalidationTime = await measurePerformance(async () => {
        // タスク状態変更によるキャッシュ無効化
        await engine.recalculateFromTask(firstTask!.id);
      });

      // キャッシュ無効化と再計算が200ms以内で完了
      expect(invalidationTime).toBeLessThan(200);
    });

    it('キャッシュサイズ制限が適切に動作する', async () => {
      const goals = await generateLargeDataset(prisma, 20, 8, 8, 5);

      // 大量の計算でキャッシュサイズ制限をテスト
      for (const goal of goals) {
        await engine.calculateGoalProgress(goal.id);
      }

      const cacheStats = engine.getCacheStats();

      // キャッシュサイズが制限内（1000エントリ以下）
      expect(cacheStats.size).toBeLessThanOrEqual(1000);

      // キャッシュヒット率が適切（50%以上）
      expect(cacheStats.hitRate).toBeGreaterThan(50);
    });
  });

  describe('メモリ使用量とリソース管理', () => {
    it('大量データ処理でメモリリークが発生しない', async () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const goals = await generateLargeDataset(prisma, 2, 8, 8, 5);

        // 全ての目標の進捗を計算
        for (const goal of goals) {
          await engine.calculateGoalProgress(goal.id);
        }

        // データをクリーンアップ
        await prisma.task.deleteMany();
        await prisma.action.deleteMany();
        await prisma.subGoal.deleteMany();
        await prisma.goal.deleteMany();

        // キャッシュをクリア
        engine.clearCache();
        progressDataStore.clear();
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      // メモリ増加が10MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('長時間実行でもパフォーマンスが劣化しない', async () => {
      const goals = await generateLargeDataset(prisma, 3, 8, 8, 5);
      const iterations = 100;
      const calculationTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const calculationTime = await measurePerformance(async () => {
          await engine.calculateGoalProgress(goals[i % goals.length].id);
        });
        calculationTimes.push(calculationTime);
      }

      // 最初の10回と最後の10回の平均時間を比較
      const initialAverage =
        calculationTimes.slice(0, 10).reduce((sum, time) => sum + time, 0) / 10;
      const finalAverage = calculationTimes.slice(-10).reduce((sum, time) => sum + time, 0) / 10;

      // パフォーマンス劣化が20%以下であることを確認
      expect(finalAverage).toBeLessThan(initialAverage * 1.2);
    });

    it('データベース接続が効率的に管理される', async () => {
      const goals = await generateLargeDataset(prisma, 5, 8, 8, 5);

      const dbOperationTime = await measurePerformance(async () => {
        // 大量のデータベース操作
        for (const goal of goals) {
          await engine.calculateGoalProgress(goal.id);
          await engine.validateDataIntegrity(goal.id);
        }
      });

      // データベース操作が3秒以内で完了
      expect(dbOperationTime).toBeLessThan(3000);
    });
  });

  describe('データ整合性検証性能', () => {
    it('データ整合性検証が効率的に実行される', async () => {
      const goals = await generateLargeDataset(prisma, 3, 8, 8, 8);

      const validationTime = await measurePerformance(async () => {
        for (const goal of goals) {
          const result = await engine.validateDataIntegrity(goal.id);
          expect(result.isValid).toBe(true);
        }
      });

      // 3つの目標の整合性検証が1秒以内で完了
      expect(validationTime).toBeLessThan(1000);
    });

    it('データ修復が効率的に実行される', async () => {
      const goals = await generateLargeDataset(prisma, 2, 8, 8, 5);

      // 意図的にデータ不整合を作成
      await prisma.goal.update({
        where: { id: goals[0].id },
        data: { progress: 999 }, // 無効な進捗値
      });

      const repairTime = await measurePerformance(async () => {
        const result = await engine.repairDataIntegrity(goals[0].id);
        expect(result.repaired).toBe(true);
      });

      // データ修復が500ms以内で完了
      expect(repairTime).toBeLessThan(500);
    });

    it('バッチ更新が効率的に実行される', async () => {
      const goals = await generateLargeDataset(prisma, 5, 8, 8, 5);
      const goalIds = goals.map(g => g.id);

      const batchUpdateTime = await measurePerformance(async () => {
        const result = await engine.batchUpdateProgress(goalIds);
        expect(result.updated).toBe(goalIds.length);
      });

      // 5つの目標のバッチ更新が2秒以内で完了
      expect(batchUpdateTime).toBeLessThan(2000);
    });
  });

  describe('エラーハンドリング性能', () => {
    it('存在しないエンティティのエラーハンドリングが高速で実行される', async () => {
      const errorHandlingTime = await measurePerformance(async () => {
        try {
          await engine.calculateGoalProgress('non-existent-goal');
        } catch (error) {
          expect(error).toBeTruthy();
        }
      });

      // エラーハンドリングが50ms以内で完了
      expect(errorHandlingTime).toBeLessThan(50);
    });

    it('大量のエラーケースでもパフォーマンスが劣化しない', async () => {
      const errorCases = Array.from({ length: 100 }, (_, i) => `non-existent-${i}`);

      const massErrorHandlingTime = await measurePerformance(async () => {
        for (const invalidId of errorCases) {
          try {
            await engine.calculateGoalProgress(invalidId);
          } catch (error) {
            // エラーを無視
          }
        }
      });

      // 100個のエラーケース処理が1秒以内で完了
      expect(massErrorHandlingTime).toBeLessThan(1000);
    });
  });

  describe('同時実行性能', () => {
    it('同時進捗計算が効率的に実行される', async () => {
      const goals = await generateLargeDataset(prisma, 10, 8, 8, 5);

      const concurrentCalculationTime = await measurePerformance(async () => {
        // 10個の目標を同時に計算
        const promises = goals.map(goal => engine.calculateGoalProgress(goal.id));
        await Promise.all(promises);
      });

      // 同時計算が2秒以内で完了
      expect(concurrentCalculationTime).toBeLessThan(2000);
    });

    it('同時キャッシュアクセスが正常に動作する', async () => {
      const goals = await generateLargeDataset(prisma, 5, 8, 8, 5);
      const goalId = goals[0].id;

      // 初回計算でキャッシュを構築
      await engine.calculateGoalProgress(goalId);

      const concurrentCacheTime = await measurePerformance(async () => {
        // 同じ目標を同時に複数回計算（キャッシュヒット）
        const promises = Array.from({ length: 20 }, () => engine.calculateGoalProgress(goalId));
        await Promise.all(promises);
      });

      // 20回の同時キャッシュアクセスが100ms以内で完了
      expect(concurrentCacheTime).toBeLessThan(100);
    });
  });

  describe('統合パフォーマンステスト', () => {
    it('実際の使用シナリオでの総合パフォーマンス', async () => {
      // 実際のマンダラチャートシステムを模擬
      const goals = await generateLargeDataset(prisma, 3, 8, 8, 10);

      const totalTime = await measurePerformance(async () => {
        for (const goal of goals) {
          // 1. 初期進捗計算
          await engine.calculateGoalProgress(goal.id);

          // 2. いくつかのタスクを完了状態に変更
          const tasks = await prisma.task.findMany({
            where: {
              action: {
                subGoal: {
                  goalId: goal.id,
                },
              },
            },
            take: 10,
          });

          for (const task of tasks.slice(0, 5)) {
            await prisma.task.update({
              where: { id: task.id },
              data: { status: 'COMPLETED' },
            });

            // 3. タスク変更による階層的再計算
            await engine.recalculateFromTask(task.id);
          }

          // 4. データ整合性検証
          await engine.validateDataIntegrity(goal.id);
        }
      });

      // 実際の使用シナリオが10秒以内で完了
      expect(totalTime).toBeLessThan(10000);
    });
  });
});
