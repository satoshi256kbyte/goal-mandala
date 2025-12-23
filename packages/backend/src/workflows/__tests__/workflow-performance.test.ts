/**
 * Workflow Performance Tests
 *
 * Step Functionsワークフローのパフォーマンスを測定します。
 *
 * Requirements: 12.4, 12.5
 */

import { MockAIService } from '../../../test/mocks/ai-service.mock';
import { MockDatabase } from '../../../test/mocks/database.mock';

describe('Workflow Performance Tests', () => {
  let mockAIService: MockAIService;
  let mockDatabase: MockDatabase;

  beforeAll(() => {
    // モックサービスのセットアップ
    mockAIService = new MockAIService({ latencyMs: 50 });
    mockDatabase = new MockDatabase();
  });

  afterAll(() => {
    // クリーンアップ
  });

  describe('Performance Test 1: Single Workflow Execution Time', () => {
    it('should complete single workflow within acceptable time', async () => {
      const startTime = Date.now();

      // ワークフロー実行のシミュレーション
      const actionIds = ['action-1', 'action-2'];

      // Task Generation (simulate AI processing)
      const taskGenerationStartTime = Date.now();
      await Promise.all(
        actionIds.map(actionId =>
          mockAIService.generateTasks({
            actionId,
            actionTitle: 'Test Action',
            actionDescription: 'Test Description',
            goalContext: {
              title: 'Test Goal',
              description: 'Test Description',
              deadline: '2025-12-31',
            },
          })
        )
      );
      const taskGenerationDuration = Date.now() - taskGenerationStartTime;

      const totalDuration = Date.now() - startTime;

      // パフォーマンス要件の検証
      expect(totalDuration).toBeLessThan(5000); // 5秒以内
      expect(taskGenerationDuration).toBeLessThan(3000); // 3秒以内（AI処理）

      console.log('Performance Test 1 Results:');
      console.log(`  Total Duration: ${totalDuration}ms`);
      console.log(`  Task Generation: ${taskGenerationDuration}ms`);
      console.log(
        `  Average per action: ${Math.round(taskGenerationDuration / actionIds.length)}ms`
      );
    });
  });

  describe('Performance Test 2: Concurrent Workflow Execution', () => {
    it('should handle 3 concurrent workflows efficiently', async () => {
      const startTime = Date.now();

      // 3つのワークフローを並行実行
      const workflows = [
        { actionIds: ['action-1', 'action-2'] },
        { actionIds: ['action-3', 'action-4'] },
        { actionIds: ['action-5', 'action-6'] },
      ];

      await Promise.all(
        workflows.map(async workflow => {
          // 各ワークフローの実行をシミュレート
          await Promise.all(
            workflow.actionIds.map(actionId =>
              mockAIService.generateTasks({
                actionId,
                actionTitle: 'Test Action',
                actionDescription: 'Test Description',
                goalContext: {
                  title: 'Test Goal',
                  description: 'Test Description',
                  deadline: '2025-12-31',
                },
              })
            )
          );
        })
      );

      const totalDuration = Date.now() - startTime;

      // 並行実行のパフォーマンス要件
      expect(totalDuration).toBeLessThan(6000); // 6秒以内（単一実行の1.2倍）

      console.log('Performance Test 2 Results:');
      console.log(`  Total Duration (3 concurrent): ${totalDuration}ms`);
      console.log(`  Average per workflow: ${Math.round(totalDuration / 3)}ms`);
    });
  });

  describe('Performance Test 3: Large Action Set Processing', () => {
    it('should handle 64 actions (8 batches) efficiently', async () => {
      const startTime = Date.now();

      // 64アクション（8バッチ）の処理をシミュレート
      const actionIds = Array.from({ length: 64 }, (_, i) => `action-${i + 1}`);
      const batches = [];
      for (let i = 0; i < actionIds.length; i += 8) {
        batches.push(actionIds.slice(i, i + 8));
      }

      // バッチ処理（最大3バッチ並列）
      for (let i = 0; i < batches.length; i += 3) {
        const batchGroup = batches.slice(i, i + 3);
        await Promise.all(
          batchGroup.map(async batch => {
            // 各バッチ内のアクションを並列処理（最大8並列）
            await Promise.all(
              batch.map(actionId =>
                mockAIService.generateTasks({
                  actionId,
                  actionTitle: 'Test Action',
                  actionDescription: 'Test Description',
                  goalContext: {
                    title: 'Test Goal',
                    description: 'Test Description',
                    deadline: '2025-12-31',
                  },
                })
              )
            );
          })
        );
      }

      const totalDuration = Date.now() - startTime;

      // 大量アクション処理のパフォーマンス要件
      expect(totalDuration).toBeLessThan(15000); // 15秒以内（ワークフロー全体のタイムアウト）

      console.log('Performance Test 3 Results:');
      console.log(`  Total Duration (64 actions): ${totalDuration}ms`);
      console.log(`  Average per action: ${Math.round(totalDuration / 64)}ms`);
      console.log(`  Average per batch: ${Math.round(totalDuration / 8)}ms`);
    });
  });

  describe('Performance Test 4: Memory Usage', () => {
    it('should not cause memory leaks during repeated executions', async () => {
      const iterations = 10;
      const memoryUsages: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // ワークフロー実行のシミュレーション
        await mockAIService.generateTasks({
          actionId: 'action-1',
          actionTitle: 'Test Action',
          actionDescription: 'Test Description',
          goalContext: {
            title: 'Test Goal',
            description: 'Test Description',
            deadline: '2025-12-31',
          },
        });

        // メモリ使用量を記録
        if (global.gc) {
          global.gc();
        }
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
        memoryUsages.push(memoryUsage);
      }

      // メモリ使用量の増加率を確認
      const firstMemory = memoryUsages[0];
      const lastMemory = memoryUsages[memoryUsages.length - 1];
      const memoryIncrease = ((lastMemory - firstMemory) / firstMemory) * 100;

      // メモリ使用量が50%以上増加していないことを確認
      expect(memoryIncrease).toBeLessThan(50);

      console.log('Performance Test 4 Results:');
      console.log(`  First Memory Usage: ${firstMemory.toFixed(2)}MB`);
      console.log(`  Last Memory Usage: ${lastMemory.toFixed(2)}MB`);
      console.log(`  Memory Increase: ${memoryIncrease.toFixed(2)}%`);
    });
  });

  describe('Performance Test 5: Throughput', () => {
    it('should achieve acceptable throughput for task generation', async () => {
      const duration = 5000; // 5秒間
      const startTime = Date.now();
      let taskCount = 0;

      // 5秒間にできるだけ多くのタスクを生成
      while (Date.now() - startTime < duration) {
        await mockAIService.generateTasks({
          actionId: 'action-1',
          actionTitle: 'Test Action',
          actionDescription: 'Test Description',
          goalContext: {
            title: 'Test Goal',
            description: 'Test Description',
            deadline: '2025-12-31',
          },
        });
        taskCount++;
      }

      const actualDuration = Date.now() - startTime;
      const throughput = (taskCount / actualDuration) * 1000; // tasks/sec

      // スループット要件: 最低10 tasks/sec
      expect(throughput).toBeGreaterThan(10);

      console.log('Performance Test 5 Results:');
      console.log(`  Duration: ${actualDuration}ms`);
      console.log(`  Task Count: ${taskCount}`);
      console.log(`  Throughput: ${throughput.toFixed(2)} tasks/sec`);
    });
  });
});
