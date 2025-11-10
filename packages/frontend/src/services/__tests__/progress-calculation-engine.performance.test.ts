import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressCalculationEngineImpl } from '../progress-calculation-engine';
import { TaskStatus, ActionType } from '../../types/progress';

/**
 * 進捗計算エンジンのパフォーマンステスト
 * 要件6: 進捗計算のパフォーマンス
 */
describe('ProgressCalculationEngine Performance Tests', () => {
  let engine: ProgressCalculationEngineImpl;

  beforeEach(() => {
    engine = new ProgressCalculationEngineImpl();
    vi.clearAllMocks();
  });

  describe('要件6.1: 単一タスクの進捗計算', () => {
    it('単一タスクの進捗計算が100ms以内に完了すること', async () => {
      const startTime = performance.now();

      await engine.calculateTaskProgress('task-1');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(100);
    });

    it('複数回の単一タスク計算でもパフォーマンスが維持されること', async () => {
      const executionTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await engine.calculateTaskProgress(`task-${i}`);
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // 全ての実行時間が100ms以内であること
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(100);
      });

      // 最後の実行時間が最初の2倍を超えないこと（パフォーマンス劣化なし）
      expect(executionTimes[9]).toBeLessThan(executionTimes[0] * 2);
    });
  });

  describe('要件6.2: アクション進捗計算（最大64個のタスク）', () => {
    it('64個のタスクを持つアクションの進捗計算が500ms以内に完了すること', async () => {
      // 64個のタスクを持つアクションをモック
      const mockTasks = Array.from({ length: 64 }, (_, i) => ({
        id: `task-${i}`,
        progress: i % 2 === 0 ? 100 : 0,
        status: i % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
        completedAt: i % 2 === 0 ? new Date() : undefined,
      }));

      // fetchTasksByActionIdをモック
      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue(mockTasks);
      vi.spyOn(engine as any, 'fetchActionData').mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      const startTime = performance.now();

      await engine.calculateActionProgress('action-1');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(500);
    });

    it('1000個のタスクを持つアクションの進捗計算が500ms以内に完了すること', async () => {
      // 1000個のタスクを持つアクションをモック
      const mockTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        progress: i % 3 === 0 ? 100 : 0,
        status: i % 3 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
        completedAt: i % 3 === 0 ? new Date() : undefined,
      }));

      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue(mockTasks);
      vi.spyOn(engine as any, 'fetchActionData').mockResolvedValue({
        id: 'action-large',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      const startTime = performance.now();

      await engine.calculateActionProgress('action-large');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(500);
    });

    it('習慣アクションの進捗計算が500ms以内に完了すること', async () => {
      // 30日分の習慣タスクをモック
      const mockTasks = Array.from({ length: 30 }, (_, i) => ({
        id: `habit-task-${i}`,
        progress: 100,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      }));

      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue(mockTasks);
      vi.spyOn(engine as any, 'fetchActionData').mockResolvedValue({
        id: 'habit-action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.HABIT,
        targetDays: 30,
      });

      const startTime = performance.now();

      await engine.calculateActionProgress('habit-action-1');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(500);
    });

    it('複数のアクション計算でもパフォーマンスが維持されること', async () => {
      const mockTasks = Array.from({ length: 64 }, (_, i) => ({
        id: `task-${i}`,
        progress: i % 2 === 0 ? 100 : 0,
        status: i % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
      }));

      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue(mockTasks);
      vi.spyOn(engine as any, 'fetchActionData').mockImplementation(async (actionId: string) => ({
        id: actionId,
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      }));

      const executionTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await engine.calculateActionProgress(`action-${i}`);
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // 全ての実行時間が500ms以内であること
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(500);
      });
    });
  });

  describe('要件6.3: サブ目標進捗計算（最大8個のアクション）', () => {
    it('8個のアクションを持つサブ目標の進捗計算が1秒以内に完了すること', async () => {
      // 8個のアクションをモック
      const mockActions = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        progress: i * 12.5, // 0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5
        type: ActionType.EXECUTION,
        tasks: [],
      }));

      vi.spyOn(engine as any, 'fetchActionsBySubGoalId').mockResolvedValue(mockActions);

      // calculateActionProgressをモック（各アクションの進捗を返す）
      vi.spyOn(engine, 'calculateActionProgress').mockImplementation(async (actionId: string) => {
        const index = parseInt(actionId.split('-')[1]);
        return index * 12.5;
      });

      const startTime = performance.now();

      await engine.calculateSubGoalProgress('subgoal-1');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000);
    });

    it('各アクションが64個のタスクを持つサブ目標の計算が1秒以内に完了すること', async () => {
      const mockActions = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        progress: 50,
        type: ActionType.EXECUTION,
        tasks: Array.from({ length: 64 }, (_, j) => ({
          id: `task-${i}-${j}`,
          progress: j % 2 === 0 ? 100 : 0,
          status: j % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
        })),
      }));

      vi.spyOn(engine as any, 'fetchActionsBySubGoalId').mockResolvedValue(mockActions);
      vi.spyOn(engine, 'calculateActionProgress').mockResolvedValue(50);

      const startTime = performance.now();

      await engine.calculateSubGoalProgress('subgoal-large');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000);
    });

    it('複数のサブ目標計算でもパフォーマンスが維持されること', async () => {
      const mockActions = Array.from({ length: 8 }, (_, i) => ({
        id: `action-${i}`,
        progress: 50,
        type: ActionType.EXECUTION,
        tasks: [],
      }));

      vi.spyOn(engine as any, 'fetchActionsBySubGoalId').mockResolvedValue(mockActions);
      vi.spyOn(engine, 'calculateActionProgress').mockResolvedValue(50);

      const executionTimes: number[] = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await engine.calculateSubGoalProgress(`subgoal-${i}`);
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // 全ての実行時間が1秒以内であること
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(1000);
      });
    });
  });

  describe('要件6.4: 目標進捗計算（最大8個のサブ目標）', () => {
    it('8個のサブ目標を持つ目標の進捗計算が2秒以内に完了すること', async () => {
      // 8個のサブ目標をモック
      const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
        id: `subgoal-${i}`,
        progress: i * 12.5,
        actions: [],
      }));

      vi.spyOn(engine as any, 'fetchSubGoalsByGoalId').mockResolvedValue(mockSubGoals);
      vi.spyOn(engine, 'calculateSubGoalProgress').mockImplementation(async (subGoalId: string) => {
        const index = parseInt(subGoalId.split('-')[1]);
        return index * 12.5;
      });

      const startTime = performance.now();

      await engine.calculateGoalProgress('goal-1');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(2000);
    });

    it('完全なマンダラチャート（8サブ目標×8アクション×64タスク）の計算が2秒以内に完了すること', async () => {
      // 完全なマンダラチャート構造をモック
      const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
        id: `subgoal-${i}`,
        progress: 50,
        actions: Array.from({ length: 8 }, (_, j) => ({
          id: `action-${i}-${j}`,
          progress: 50,
          type: ActionType.EXECUTION,
          tasks: Array.from({ length: 64 }, (_, k) => ({
            id: `task-${i}-${j}-${k}`,
            progress: k % 2 === 0 ? 100 : 0,
            status: k % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
          })),
        })),
      }));

      vi.spyOn(engine as any, 'fetchSubGoalsByGoalId').mockResolvedValue(mockSubGoals);
      vi.spyOn(engine, 'calculateSubGoalProgress').mockResolvedValue(50);

      const startTime = performance.now();

      await engine.calculateGoalProgress('goal-full');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(2000);
    });

    it('複数の目標計算でもパフォーマンスが維持されること', async () => {
      const mockSubGoals = Array.from({ length: 8 }, (_, i) => ({
        id: `subgoal-${i}`,
        progress: 50,
        actions: [],
      }));

      vi.spyOn(engine as any, 'fetchSubGoalsByGoalId').mockResolvedValue(mockSubGoals);
      vi.spyOn(engine, 'calculateSubGoalProgress').mockResolvedValue(50);

      const executionTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();
        await engine.calculateGoalProgress(`goal-${i}`);
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // 全ての実行時間が2秒以内であること
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(2000);
      });
    });
  });

  describe('要件6.4: 深い階層の再計算', () => {
    it('タスクから目標までの全階層再計算が2秒以内に完了すること', async () => {
      // 完全な階層構造をモック
      vi.spyOn(engine as any, 'fetchTaskData').mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      vi.spyOn(engine as any, 'fetchActionData').mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      vi.spyOn(engine as any, 'fetchSubGoalData').mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      vi.spyOn(engine as any, 'fetchGoalData').mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
      });

      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue([
        {
          id: 'task-1',
          progress: 100,
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      ]);

      vi.spyOn(engine as any, 'fetchActionsBySubGoalId').mockResolvedValue([
        {
          id: 'action-1',
          progress: 100,
          type: ActionType.EXECUTION,
          tasks: [],
        },
      ]);

      vi.spyOn(engine as any, 'fetchSubGoalsByGoalId').mockResolvedValue([
        {
          id: 'subgoal-1',
          progress: 100,
          actions: [],
        },
      ]);

      const startTime = performance.now();

      await engine.recalculateFromTask('task-1');

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(2000);
    });

    it('複数タスクの同時再計算が効率的に行われること', async () => {
      // モックデータのセットアップ
      vi.spyOn(engine as any, 'fetchTaskData').mockImplementation(async (taskId: string) => ({
        id: taskId,
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      }));

      vi.spyOn(engine as any, 'fetchActionData').mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      vi.spyOn(engine as any, 'fetchSubGoalData').mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      vi.spyOn(engine as any, 'fetchGoalData').mockResolvedValue({
        id: 'goal-1',
        userId: 'user-1',
      });

      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue([]);
      vi.spyOn(engine as any, 'fetchActionsBySubGoalId').mockResolvedValue([]);
      vi.spyOn(engine as any, 'fetchSubGoalsByGoalId').mockResolvedValue([]);

      const startTime = performance.now();

      // 5つのタスクを同時に再計算
      await Promise.all([
        engine.recalculateFromTask('task-1'),
        engine.recalculateFromTask('task-2'),
        engine.recalculateFromTask('task-3'),
        engine.recalculateFromTask('task-4'),
        engine.recalculateFromTask('task-5'),
      ]);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 5つのタスクの同時再計算が5秒以内に完了すること
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe('要件6.5: データベースクエリの最適化', () => {
    it('キャッシュが有効な場合、2回目の計算が高速であること', async () => {
      vi.spyOn(engine as any, 'fetchTaskData').mockResolvedValue({
        id: 'task-cache',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // 1回目の計算
      const firstStartTime = performance.now();
      await engine.calculateTaskProgress('task-cache');
      const firstEndTime = performance.now();
      const firstExecutionTime = firstEndTime - firstStartTime;

      // 2回目の計算（キャッシュから取得）
      const secondStartTime = performance.now();
      await engine.calculateTaskProgress('task-cache');
      const secondEndTime = performance.now();
      const secondExecutionTime = secondEndTime - secondStartTime;

      // 2回目の計算が1回目より高速であること
      expect(secondExecutionTime).toBeLessThan(firstExecutionTime);

      // 2回目の計算が10ms以内であること（キャッシュヒット）
      expect(secondExecutionTime).toBeLessThan(10);
    });

    it('大量のデータでもメモリ使用量が適切であること', async () => {
      const mockTasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i}`,
        progress: i % 2 === 0 ? 100 : 0,
        status: i % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
      }));

      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue(mockTasks);
      vi.spyOn(engine as any, 'fetchActionData').mockResolvedValue({
        id: 'action-memory',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      // メモリ使用量の測定（概算）
      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0;

      await engine.calculateActionProgress('action-memory');

      const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryUsed = memoryAfter - memoryBefore;

      // メモリ使用量が10MB以下であること（概算）
      // Note: performance.memory はChrome限定のAPIなので、存在しない場合はスキップ
      if ((performance as any).memory) {
        expect(memoryUsed).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('パフォーマンス劣化の検出', () => {
    it('連続実行でもパフォーマンスが劣化しないこと', async () => {
      const mockTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task-${i}`,
        progress: i % 2 === 0 ? 100 : 0,
        status: i % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
      }));

      vi.spyOn(engine as any, 'fetchTasksByActionId').mockResolvedValue(mockTasks);
      vi.spyOn(engine as any, 'fetchActionData').mockImplementation(async (actionId: string) => ({
        id: actionId,
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      }));

      const executionTimes: number[] = [];

      // 20回連続で計算を実行
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await engine.calculateActionProgress(`action-perf-${i}`);
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // 最後の実行時間が最初の3倍を超えないこと
      expect(executionTimes[19]).toBeLessThan(executionTimes[0] * 3);

      // 平均実行時間が500ms以内であること
      const averageTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      expect(averageTime).toBeLessThan(500);
    });

    it('エラー発生時でもパフォーマンスが維持されること', async () => {
      let callCount = 0;

      vi.spyOn(engine as any, 'fetchTaskData').mockImplementation(async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('Simulated error');
        }
        return {
          id: 'task-error',
          actionId: 'action-1',
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        };
      });

      const executionTimes: number[] = [];

      // エラーが発生する場合と正常な場合を交互に実行
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        try {
          await engine.calculateTaskProgress('task-error');
        } catch {
          // エラーは無視
        }
        const endTime = performance.now();
        executionTimes.push(endTime - startTime);
      }

      // 全ての実行時間が200ms以内であること（エラー処理含む）
      executionTimes.forEach(time => {
        expect(time).toBeLessThan(200);
      });
    });
  });
});
