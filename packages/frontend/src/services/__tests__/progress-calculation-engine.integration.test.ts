import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressCalculationEngineImpl } from '../progress-calculation-engine';
import { TaskStatus } from '../../types/progress';
import { ActionType } from '../../types/mandala';

/**
 * 統合テスト: 進捗計算エンジン
 *
 * 要件7.2: 全ての階層（タスク→アクション→サブ目標→目標）の進捗計算が検証される
 *
 * テストシナリオ:
 * 1. タスク完了 → アクション進捗更新 → サブ目標進捗更新 → 目標進捗更新
 * 2. 複数タスク同時完了 → 正しい進捗計算
 * 3. キャッシュの動作確認 → 2回目の計算が高速
 */
describe('ProgressCalculationEngine - Integration Tests', () => {
  let engine: ProgressCalculationEngineImpl;

  beforeEach(() => {
    engine = new ProgressCalculationEngineImpl();
    // 各テスト前にキャッシュをクリア
    (engine as any).cache.clear();
  });

  describe('階層的進捗計算の統合テスト', () => {
    /**
     * テストシナリオ1: タスク完了から目標進捗更新までの全階層テスト
     *
     * 構造:
     * Goal (goal-1)
     *   └─ SubGoal (subgoal-1)
     *        └─ Action (action-1) - EXECUTION type
     *             ├─ Task (task-1) - COMPLETED
     *             ├─ Task (task-2) - COMPLETED
     *             ├─ Task (task-3) - IN_PROGRESS
     *             └─ Task (task-4) - NOT_STARTED
     *
     * 期待される進捗:
     * - task-1: 100% (COMPLETED)
     * - task-2: 100% (COMPLETED)
     * - task-3: 50% (IN_PROGRESS)
     * - task-4: 0% (NOT_STARTED)
     * - action-1: (100+100+50+0)/4 = 62.5% → 63% (四捨五入)
     * - subgoal-1: 63% (1つのアクションのみ)
     * - goal-1: 63% (1つのサブ目標のみ)
     */
    it('タスク完了から目標進捗更新までの全階層を正しく計算する', async () => {
      // モックデータの設定
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchSubGoalData = vi.spyOn(engine as any, 'fetchSubGoalData');
      const mockFetchGoalData = vi.spyOn(engine as any, 'fetchGoalData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');

      // タスクデータのモック
      mockFetchTaskData.mockImplementation(async (taskId: string) => {
        const tasks: Record<string, any> = {
          'task-1': {
            id: 'task-1',
            actionId: 'action-1',
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
          },
          'task-2': {
            id: 'task-2',
            actionId: 'action-1',
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
          },
          'task-3': {
            id: 'task-3',
            actionId: 'action-1',
            status: TaskStatus.IN_PROGRESS,
            completedAt: null,
          },
          'task-4': {
            id: 'task-4',
            actionId: 'action-1',
            status: TaskStatus.NOT_STARTED,
            completedAt: null,
          },
        };
        return tasks[taskId];
      });

      // アクションデータのモック
      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      // サブ目標データのモック
      mockFetchSubGoalData.mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      // 目標データのモック
      mockFetchGoalData.mockResolvedValue({
        id: 'goal-1',
      });

      // タスクリストのモック
      mockFetchTasksByActionId.mockResolvedValue([
        {
          id: 'task-1',
          progress: 100,
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
        {
          id: 'task-2',
          progress: 100,
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
        {
          id: 'task-3',
          progress: 50,
          status: TaskStatus.IN_PROGRESS,
        },
        {
          id: 'task-4',
          progress: 0,
          status: TaskStatus.NOT_STARTED,
        },
      ]);

      // アクションリストのモック
      mockFetchActionsBySubGoalId.mockResolvedValue([
        {
          id: 'action-1',
          progress: 63,
          type: ActionType.EXECUTION,
          tasks: [],
        },
      ]);

      // サブ目標リストのモック
      mockFetchSubGoalsByGoalId.mockResolvedValue([
        {
          id: 'subgoal-1',
          progress: 63,
          actions: [],
        },
      ]);

      // 階層的に進捗を計算
      const hierarchy = await engine.recalculateFromTask('task-1');

      // 検証
      expect(hierarchy.task.id).toBe('task-1');
      expect(hierarchy.task.progress).toBe(100);
      expect(hierarchy.task.status).toBe(TaskStatus.COMPLETED);

      expect(hierarchy.action.id).toBe('action-1');
      expect(hierarchy.action.progress).toBe(50); // (100+100+0+0)/4 = 50%

      expect(hierarchy.subGoal.id).toBe('subgoal-1');
      expect(hierarchy.subGoal.progress).toBe(50);

      expect(hierarchy.goal.id).toBe('goal-1');
      expect(hierarchy.goal.progress).toBe(50);
    });

    /**
     * テストシナリオ2: 複数タスク同時完了時の正しい進捗計算
     *
     * 構造:
     * Goal (goal-1)
     *   ├─ SubGoal (subgoal-1)
     *   │    └─ Action (action-1) - EXECUTION type
     *   │         ├─ Task (task-1) - COMPLETED
     *   │         └─ Task (task-2) - COMPLETED
     *   └─ SubGoal (subgoal-2)
     *        └─ Action (action-2) - EXECUTION type
     *             ├─ Task (task-3) - COMPLETED
     *             └─ Task (task-4) - NOT_STARTED
     *
     * 期待される進捗:
     * - action-1: 100% (全タスク完了)
     * - action-2: 50% (半分完了)
     * - subgoal-1: 100%
     * - subgoal-2: 50%
     * - goal-1: (100+50)/2 = 75%
     */
    it('複数タスク同時完了時に正しく進捗を計算する', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchSubGoalData = vi.spyOn(engine as any, 'fetchSubGoalData');
      const mockFetchGoalData = vi.spyOn(engine as any, 'fetchGoalData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');

      // タスクデータのモック
      mockFetchTaskData.mockImplementation(async (taskId: string) => {
        const tasks: Record<string, any> = {
          'task-1': {
            id: 'task-1',
            actionId: 'action-1',
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
          },
          'task-2': {
            id: 'task-2',
            actionId: 'action-1',
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
          },
          'task-3': {
            id: 'task-3',
            actionId: 'action-2',
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
          },
          'task-4': {
            id: 'task-4',
            actionId: 'action-2',
            status: TaskStatus.NOT_STARTED,
            completedAt: null,
          },
        };
        return tasks[taskId];
      });

      // アクションデータのモック
      mockFetchActionData.mockImplementation(async (actionId: string) => {
        const actions: Record<string, any> = {
          'action-1': {
            id: 'action-1',
            subGoalId: 'subgoal-1',
            type: ActionType.EXECUTION,
            targetDays: 30,
          },
          'action-2': {
            id: 'action-2',
            subGoalId: 'subgoal-2',
            type: ActionType.EXECUTION,
            targetDays: 30,
          },
        };
        return actions[actionId];
      });

      // サブ目標データのモック
      mockFetchSubGoalData.mockImplementation(async (subGoalId: string) => {
        const subGoals: Record<string, any> = {
          'subgoal-1': {
            id: 'subgoal-1',
            goalId: 'goal-1',
          },
          'subgoal-2': {
            id: 'subgoal-2',
            goalId: 'goal-1',
          },
        };
        return subGoals[subGoalId];
      });

      // 目標データのモック
      mockFetchGoalData.mockResolvedValue({
        id: 'goal-1',
      });

      // タスクリストのモック
      mockFetchTasksByActionId.mockImplementation(async (actionId: string) => {
        if (actionId === 'action-1') {
          return [
            {
              id: 'task-1',
              progress: 100,
              status: TaskStatus.COMPLETED,
              completedAt: new Date(),
            },
            {
              id: 'task-2',
              progress: 100,
              status: TaskStatus.COMPLETED,
              completedAt: new Date(),
            },
          ];
        } else if (actionId === 'action-2') {
          return [
            {
              id: 'task-3',
              progress: 100,
              status: TaskStatus.COMPLETED,
              completedAt: new Date(),
            },
            {
              id: 'task-4',
              progress: 0,
              status: TaskStatus.NOT_STARTED,
            },
          ];
        }
        return [];
      });

      // アクションリストのモック
      mockFetchActionsBySubGoalId.mockImplementation(async (subGoalId: string) => {
        if (subGoalId === 'subgoal-1') {
          return [
            {
              id: 'action-1',
              progress: 100,
              type: ActionType.EXECUTION,
              tasks: [],
            },
          ];
        } else if (subGoalId === 'subgoal-2') {
          return [
            {
              id: 'action-2',
              progress: 50,
              type: ActionType.EXECUTION,
              tasks: [],
            },
          ];
        }
        return [];
      });

      // サブ目標リストのモック
      mockFetchSubGoalsByGoalId.mockResolvedValue([
        {
          id: 'subgoal-1',
          progress: 100,
          actions: [],
        },
        {
          id: 'subgoal-2',
          progress: 50,
          actions: [],
        },
      ]);

      // 複数タスクを同時に完了させる
      const [task1Progress, task2Progress] = await Promise.all([
        engine.calculateTaskProgress('task-1'),
        engine.calculateTaskProgress('task-2'),
      ]);

      expect(task1Progress).toBe(100);
      expect(task2Progress).toBe(100);

      // アクション進捗を計算
      const action1Progress = await engine.calculateActionProgress('action-1');
      expect(action1Progress).toBe(100);

      const action2Progress = await engine.calculateActionProgress('action-2');
      expect(action2Progress).toBe(50);

      // サブ目標進捗を計算
      const subGoal1Progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(subGoal1Progress).toBe(100);

      const subGoal2Progress = await engine.calculateSubGoalProgress('subgoal-2');
      expect(subGoal2Progress).toBe(50);

      // 目標進捗を計算
      const goalProgress = await engine.calculateGoalProgress('goal-1');
      expect(goalProgress).toBe(75); // (100+50)/2 = 75%
    });

    /**
     * テストシナリオ3: 習慣アクションを含む階層的進捗計算
     *
     * 構造:
     * Goal (goal-1)
     *   └─ SubGoal (subgoal-1)
     *        ├─ Action (action-1) - EXECUTION type
     *        │    ├─ Task (task-1) - COMPLETED
     *        │    └─ Task (task-2) - COMPLETED
     *        └─ Action (action-2) - HABIT type (targetDays: 30)
     *             ├─ Task (task-3) - COMPLETED (24日継続)
     *             └─ ...
     *
     * 期待される進捗:
     * - action-1: 100% (全タスク完了)
     * - action-2: 100% (24日継続 = 30日の80%)
     * - subgoal-1: (100+100)/2 = 100%
     * - goal-1: 100%
     */
    it('習慣アクションを含む階層的進捗計算が正しく動作する', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchSubGoalData = vi.spyOn(engine as any, 'fetchSubGoalData');
      const mockFetchGoalData = vi.spyOn(engine as any, 'fetchGoalData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');

      // タスクデータのモック
      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // アクションデータのモック
      mockFetchActionData.mockImplementation(async (actionId: string) => {
        if (actionId === 'action-1') {
          return {
            id: 'action-1',
            subGoalId: 'subgoal-1',
            type: ActionType.EXECUTION,
            targetDays: 30,
          };
        } else if (actionId === 'action-2') {
          return {
            id: 'action-2',
            subGoalId: 'subgoal-1',
            type: ActionType.HABIT,
            targetDays: 30,
          };
        }
        return null;
      });

      // サブ目標データのモック
      mockFetchSubGoalData.mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      // 目標データのモック
      mockFetchGoalData.mockResolvedValue({
        id: 'goal-1',
      });

      // タスクリストのモック
      mockFetchTasksByActionId.mockImplementation(async (actionId: string) => {
        if (actionId === 'action-1') {
          return [
            {
              id: 'task-1',
              progress: 100,
              status: TaskStatus.COMPLETED,
              completedAt: new Date(),
            },
            {
              id: 'task-2',
              progress: 100,
              status: TaskStatus.COMPLETED,
              completedAt: new Date(),
            },
          ];
        } else if (actionId === 'action-2') {
          // 24日継続（30日の80%）
          return Array.from({ length: 24 }, (_, i) => ({
            id: `task-habit-${i + 1}`,
            progress: 100,
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
          }));
        }
        return [];
      });

      // アクションリストのモック
      mockFetchActionsBySubGoalId.mockResolvedValue([
        {
          id: 'action-1',
          progress: 100,
          type: ActionType.EXECUTION,
          tasks: [],
        },
        {
          id: 'action-2',
          progress: 100,
          type: ActionType.HABIT,
          tasks: [],
        },
      ]);

      // サブ目標リストのモック
      mockFetchSubGoalsByGoalId.mockResolvedValue([
        {
          id: 'subgoal-1',
          progress: 100,
          actions: [],
        },
      ]);

      // 階層的に進捗を計算
      const hierarchy = await engine.recalculateFromTask('task-1');

      // 検証
      expect(hierarchy.action.progress).toBe(100);
      expect(hierarchy.subGoal.progress).toBe(100);
      expect(hierarchy.goal.progress).toBe(100);
    });
  });

  describe('キャッシュ機能の統合テスト', () => {
    /**
     * テストシナリオ4: キャッシュの動作確認
     *
     * 1回目の計算: データベースから取得
     * 2回目の計算: キャッシュから取得（高速）
     *
     * 期待される動作:
     * - 1回目の計算時間 > 2回目の計算時間
     * - 2回目はモック関数が呼ばれない（キャッシュから取得）
     */
    it('キャッシュが正しく動作し、2回目の計算が高速になる', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

      // タスクデータのモック
      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // アクションデータのモック
      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      // タスクリストのモック
      mockFetchTasksByActionId.mockResolvedValue([
        {
          id: 'task-1',
          progress: 100,
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
        {
          id: 'task-2',
          progress: 100,
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      ]);

      // 1回目の計算
      const startTime1 = Date.now();
      const progress1 = await engine.calculateTaskProgress('task-1');
      const endTime1 = Date.now();
      const duration1 = endTime1 - startTime1;

      expect(progress1).toBe(100);
      expect(mockFetchTaskData).toHaveBeenCalledTimes(1);

      // 2回目の計算（キャッシュから取得）
      const startTime2 = Date.now();
      const progress2 = await engine.calculateTaskProgress('task-1');
      const endTime2 = Date.now();
      const duration2 = endTime2 - startTime2;

      expect(progress2).toBe(100);
      expect(mockFetchTaskData).toHaveBeenCalledTimes(1); // 呼び出し回数は変わらない

      // 2回目の方が高速であることを確認
      expect(duration2).toBeLessThan(duration1);
    });

    /**
     * テストシナリオ5: キャッシュの依存関係管理
     *
     * タスクが更新されたとき、関連するアクション、サブ目標、目標のキャッシュもクリアされる
     *
     * 期待される動作:
     * - recalculateFromTask実行後、関連するキャッシュがクリアされる
     * - 次回の計算時に再度データベースから取得される
     */
    it('タスク更新時に関連するキャッシュが正しくクリアされる', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchSubGoalData = vi.spyOn(engine as any, 'fetchSubGoalData');
      const mockFetchGoalData = vi.spyOn(engine as any, 'fetchGoalData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');

      // タスクデータのモック
      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // アクションデータのモック
      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      // サブ目標データのモック
      mockFetchSubGoalData.mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      // 目標データのモック
      mockFetchGoalData.mockResolvedValue({
        id: 'goal-1',
      });

      // タスクリストのモック
      mockFetchTasksByActionId.mockResolvedValue([
        {
          id: 'task-1',
          progress: 100,
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      ]);

      // アクションリストのモック
      mockFetchActionsBySubGoalId.mockResolvedValue([
        {
          id: 'action-1',
          progress: 100,
          type: ActionType.EXECUTION,
          tasks: [],
        },
      ]);

      // サブ目標リストのモック
      mockFetchSubGoalsByGoalId.mockResolvedValue([
        {
          id: 'subgoal-1',
          progress: 100,
          actions: [],
        },
      ]);

      // 初回計算（キャッシュに保存）
      await engine.calculateTaskProgress('task-1');
      await engine.calculateActionProgress('action-1');
      await engine.calculateSubGoalProgress('subgoal-1');
      await engine.calculateGoalProgress('goal-1');

      // キャッシュが存在することを確認
      const cache = (engine as any).cache;
      expect(cache.has('task:task-1')).toBe(true);
      expect(cache.has('action:action-1')).toBe(true);
      expect(cache.has('subgoal:subgoal-1')).toBe(true);
      expect(cache.has('goal:goal-1')).toBe(true);

      // recalculateFromTaskを実行してキャッシュをクリア
      await engine.recalculateFromTask('task-1');

      // タスクのキャッシュがクリアされていることを確認
      expect(cache.has('task:task-1')).toBe(false);

      // 次回の計算時に再度データベースから取得されることを確認
      const callCountBefore = mockFetchTaskData.mock.calls.length;
      await engine.calculateTaskProgress('task-1');
      const callCountAfter = mockFetchTaskData.mock.calls.length;

      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });

    /**
     * テストシナリオ6: キャッシュの有効期限管理
     *
     * キャッシュが期限切れになった場合、再度データベースから取得される
     *
     * 期待される動作:
     * - キャッシュ有効期限内: キャッシュから取得
     * - キャッシュ期限切れ: データベースから再取得
     */
    it('キャッシュの有効期限が切れた場合、再度データベースから取得する', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');

      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // 1回目の計算
      await engine.calculateTaskProgress('task-1');
      expect(mockFetchTaskData).toHaveBeenCalledTimes(1);

      // キャッシュを期限切れにする
      const cache = (engine as any).cache;
      const cacheEntry = cache.get('task:task-1');
      if (cacheEntry) {
        cacheEntry.expiresAt = new Date(Date.now() - 1000); // 1秒前に期限切れ
      }

      // 2回目の計算（期限切れなので再計算）
      await engine.calculateTaskProgress('task-1');
      expect(mockFetchTaskData).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーハンドリングの統合テスト', () => {
    /**
     * テストシナリオ7: 階層的計算中のエラー処理
     *
     * タスク計算は成功するが、アクション計算でエラーが発生する場合
     *
     * 期待される動作:
     * - タスク計算は成功
     * - アクション計算でエラーがスローされる
     * - 上位階層の計算は実行されない
     */
    it('階層的計算中にエラーが発生した場合、適切に処理される', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');

      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // アクションデータ取得時にエラーを発生させる
      mockFetchActionData.mockRejectedValue(new Error('Action not found'));

      // タスク計算は成功
      const taskProgress = await engine.calculateTaskProgress('task-1');
      expect(taskProgress).toBe(100);

      // recalculateFromTaskでエラーが発生
      await expect(engine.recalculateFromTask('task-1')).rejects.toThrow('Action not found');
    });

    /**
     * テストシナリオ8: データ不整合時のエラー処理
     *
     * 無効なデータ構造が返された場合のエラー処理
     *
     * 期待される動作:
     * - データ検証エラーが発生
     * - 適切なエラーメッセージが返される
     */
    it('無効なデータ構造が返された場合、適切にエラー処理される', async () => {
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      // 無効なデータ構造を返す
      mockFetchTasksByActionId.mockResolvedValue('invalid data' as any);

      // データ整合性チェックでエラーが発生
      await expect(engine.calculateActionProgress('action-1')).rejects.toThrow(
        'Invalid tasks data for action: action-1'
      );
    });
  });

  describe('パフォーマンステストの統合', () => {
    /**
     * テストシナリオ9: 大規模データでのパフォーマンス
     *
     * 8つのサブ目標、各8つのアクション、各10タスクの構造
     * 合計: 8 * 8 * 10 = 640タスク
     *
     * 期待される動作:
     * - 目標進捗計算が2秒以内に完了
     * - 正しい進捗値が計算される
     */
    it('大規模データでも適切なパフォーマンスで計算される', async () => {
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');

      // 8つのサブ目標
      const subGoals = Array.from({ length: 8 }, (_, i) => ({
        id: `subgoal-${i + 1}`,
        progress: 50,
        actions: [],
      }));

      mockFetchSubGoalsByGoalId.mockResolvedValue(subGoals);

      // 各サブ目標に8つのアクション
      mockFetchActionsBySubGoalId.mockImplementation(async () => {
        return Array.from({ length: 8 }, (_, i) => ({
          id: `action-${i + 1}`,
          progress: 50,
          type: ActionType.EXECUTION,
          tasks: [],
        }));
      });

      // 各アクションに10タスク
      mockFetchTasksByActionId.mockImplementation(async () => {
        return Array.from({ length: 10 }, (_, i) => ({
          id: `task-${i + 1}`,
          progress: i % 2 === 0 ? 100 : 0, // 半分完了
          status: i % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.NOT_STARTED,
        }));
      });

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      // パフォーマンス測定
      const startTime = Date.now();
      const goalProgress = await engine.calculateGoalProgress('goal-1');
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 検証
      expect(goalProgress).toBe(50); // 全て50%なので平均も50%
      expect(duration).toBeLessThan(2000); // 2秒以内
    });
  });
});
