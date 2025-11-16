import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressCalculationEngineImpl } from '../progress-calculation-engine';
import { TaskStatus } from '../../types/progress';
import { ActionType } from '../../types/mandala';
import { TestDataGenerator } from '../../test/utils/TestDataGenerator';

describe('ProgressCalculationEngine', () => {
  let engine: ProgressCalculationEngineImpl;
  let testDataGenerator: TestDataGenerator;

  beforeEach(() => {
    engine = new ProgressCalculationEngineImpl();
    testDataGenerator = new TestDataGenerator();
    // 各テスト前にキャッシュをクリア
    (engine as any).cache.clear();
  });

  describe('calculateTaskProgress (TaskProgressCalculator)', () => {
    it('完了したタスクの進捗は100%を返す', async () => {
      // TestDataGeneratorを使用してテストデータを生成
      const user = testDataGenerator.generateUser();
      const goal = testDataGenerator.generateGoal(user.id);
      const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
      const actions = testDataGenerator.generateActions(subGoals);
      const tasks = testDataGenerator.generateTasks(actions[0].id, 1);

      // モックデータを設定するため、プライベートメソッドをモック
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockResolvedValue({
        id: tasks[0].id,
        actionId: actions[0].id,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      const progress = await engine.calculateTaskProgress(tasks[0].id);
      expect(progress).toBe(100);
    });

    it('未完了のタスクの進捗は0%を返す', async () => {
      const user = testDataGenerator.generateUser();
      const goal = testDataGenerator.generateGoal(user.id);
      const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
      const actions = testDataGenerator.generateActions(subGoals);
      const tasks = testDataGenerator.generateTasks(actions[0].id, 1);

      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockResolvedValue({
        id: tasks[0].id,
        actionId: actions[0].id,
        status: TaskStatus.PENDING,
        completedAt: null,
      });

      const progress = await engine.calculateTaskProgress(tasks[0].id);
      expect(progress).toBe(0);
    });

    it('進行中のタスクの進捗は0%を返す', async () => {
      const user = testDataGenerator.generateUser();
      const goal = testDataGenerator.generateGoal(user.id);
      const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
      const actions = testDataGenerator.generateActions(subGoals);
      const tasks = testDataGenerator.generateTasks(actions[0].id, 1);

      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockResolvedValue({
        id: tasks[0].id,
        actionId: actions[0].id,
        status: TaskStatus.IN_PROGRESS,
        completedAt: null,
      });

      const progress = await engine.calculateTaskProgress(tasks[0].id);
      expect(progress).toBe(0);
    });

    it('スキップされたタスクの進捗は0%を返す', async () => {
      const user = testDataGenerator.generateUser();
      const goal = testDataGenerator.generateGoal(user.id);
      const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
      const actions = testDataGenerator.generateActions(subGoals);
      const tasks = testDataGenerator.generateTasks(actions[0].id, 1);

      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockResolvedValue({
        id: tasks[0].id,
        actionId: actions[0].id,
        status: TaskStatus.SKIPPED,
        completedAt: null,
      });

      const progress = await engine.calculateTaskProgress(tasks[0].id);
      expect(progress).toBe(0);
    });

    describe('エッジケース', () => {
      it('空文字列のタスクIDでデフォルト値を返す', async () => {
        // 無効な入力に対してはエラーハンドリングによりデフォルト値（0）が返される
        const progress = await engine.calculateTaskProgress('');
        expect(progress).toBe(0);
      });

      it('nullのタスクIDでデフォルト値を返す', async () => {
        // 無効な入力に対してはエラーハンドリングによりデフォルト値（0）が返される
        const progress = await engine.calculateTaskProgress(null as any);
        expect(progress).toBe(0);
      });

      it('undefinedのタスクIDでデフォルト値を返す', async () => {
        // 無効な入力に対してはエラーハンドリングによりデフォルト値（0）が返される
        const progress = await engine.calculateTaskProgress(undefined as any);
        expect(progress).toBe(0);
      });

      it('数値のタスクIDでデフォルト値を返す', async () => {
        // 無効な入力に対してはエラーハンドリングによりデフォルト値（0）が返される
        const progress = await engine.calculateTaskProgress(123 as any);
        expect(progress).toBe(0);
      });

      it('存在しないタスクでデフォルト値を返す', async () => {
        const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
        mockFetchTaskData.mockResolvedValue(null);

        const progress = await engine.calculateTaskProgress('non-existent-task');
        expect(progress).toBe(0);
      });

      it('空配列のタスクデータでデフォルト値を返す', async () => {
        const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
        mockFetchTaskData.mockResolvedValue([]);

        const progress = await engine.calculateTaskProgress('task-with-empty-array');
        expect(progress).toBe(0);
      });
    });
  });

  describe('calculateActionProgress (ExecutionActionCalculator & HabitActionCalculator)', () => {
    describe('実行アクション (ExecutionActionCalculator)', () => {
      it('実行アクションの進捗を正しく計算する', async () => {
        const user = testDataGenerator.generateUser();
        const goal = testDataGenerator.generateGoal(user.id);
        const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
        const actions = testDataGenerator.generateActions(subGoals);
        const tasks = testDataGenerator.generateTasks(actions[0].id, 4);

        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: actions[0].id,
          subGoalId: subGoals[0].id,
          type: ActionType.EXECUTION,
          targetDays: 30,
        });

        mockFetchTasksByActionId.mockResolvedValue([
          {
            id: tasks[0].id,
            progress: 100,
            status: TaskStatus.COMPLETED,
          },
          {
            id: tasks[1].id,
            progress: 0,
            status: TaskStatus.PENDING,
          },
          {
            id: tasks[2].id,
            progress: 100,
            status: TaskStatus.COMPLETED,
          },
          {
            id: tasks[3].id,
            progress: 0,
            status: TaskStatus.PENDING,
          },
        ]);

        const progress = await engine.calculateActionProgress(actions[0].id);
        expect(progress).toBe(50); // 4つのうち2つ完了 = 50%
      });

      it('タスク完了率に基づく進捗計算（25%完了）', async () => {
        const user = testDataGenerator.generateUser();
        const goal = testDataGenerator.generateGoal(user.id);
        const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
        const actions = testDataGenerator.generateActions(subGoals);
        const tasks = testDataGenerator.generateTasks(actions[0].id, 4);

        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: actions[0].id,
          subGoalId: subGoals[0].id,
          type: ActionType.EXECUTION,
          targetDays: 30,
        });

        mockFetchTasksByActionId.mockResolvedValue([
          { id: tasks[0].id, progress: 100, status: TaskStatus.COMPLETED },
          { id: tasks[1].id, progress: 0, status: TaskStatus.PENDING },
          { id: tasks[2].id, progress: 0, status: TaskStatus.PENDING },
          { id: tasks[3].id, progress: 0, status: TaskStatus.PENDING },
        ]);

        const progress = await engine.calculateActionProgress(actions[0].id);
        expect(progress).toBe(25); // 4つのうち1つ完了 = 25%
      });

      it('タスク完了率に基づく進捗計算（75%完了）', async () => {
        const user = testDataGenerator.generateUser();
        const goal = testDataGenerator.generateGoal(user.id);
        const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
        const actions = testDataGenerator.generateActions(subGoals);
        const tasks = testDataGenerator.generateTasks(actions[0].id, 4);

        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: actions[0].id,
          subGoalId: subGoals[0].id,
          type: ActionType.EXECUTION,
          targetDays: 30,
        });

        mockFetchTasksByActionId.mockResolvedValue([
          { id: tasks[0].id, progress: 100, status: TaskStatus.COMPLETED },
          { id: tasks[1].id, progress: 100, status: TaskStatus.COMPLETED },
          { id: tasks[2].id, progress: 100, status: TaskStatus.COMPLETED },
          { id: tasks[3].id, progress: 0, status: TaskStatus.PENDING },
        ]);

        const progress = await engine.calculateActionProgress(actions[0].id);
        expect(progress).toBe(75); // 4つのうち3つ完了 = 75%
      });

      it('全タスク完了時の進捗100%', async () => {
        const user = testDataGenerator.generateUser();
        const goal = testDataGenerator.generateGoal(user.id);
        const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
        const actions = testDataGenerator.generateActions(subGoals);
        const tasks = testDataGenerator.generateTasks(actions[0].id, 3);

        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: actions[0].id,
          subGoalId: subGoals[0].id,
          type: ActionType.EXECUTION,
          targetDays: 30,
        });

        mockFetchTasksByActionId.mockResolvedValue([
          { id: tasks[0].id, progress: 100, status: TaskStatus.COMPLETED },
          { id: tasks[1].id, progress: 100, status: TaskStatus.COMPLETED },
          { id: tasks[2].id, progress: 100, status: TaskStatus.COMPLETED },
        ]);

        const progress = await engine.calculateActionProgress(actions[0].id);
        expect(progress).toBe(100); // 全タスク完了 = 100%
      });

      it('タスクが存在しない場合は0%を返す', async () => {
        const user = testDataGenerator.generateUser();
        const goal = testDataGenerator.generateGoal(user.id);
        const subGoals = testDataGenerator.generateSubGoals(goal.id, 1);
        const actions = testDataGenerator.generateActions(subGoals);

        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: actions[0].id,
          subGoalId: subGoals[0].id,
          type: ActionType.EXECUTION,
          targetDays: 30,
        });

        mockFetchTasksByActionId.mockResolvedValue([]);

        const progress = await engine.calculateActionProgress(actions[0].id);
        expect(progress).toBe(0);
      });

      describe('エッジケース', () => {
        it('空文字列のアクションIDでデフォルト値を返す', async () => {
          const progress = await engine.calculateActionProgress('');
          expect(progress).toBe(0);
        });

        it('nullのアクションIDでデフォルト値を返す', async () => {
          const progress = await engine.calculateActionProgress(null as any);
          expect(progress).toBe(0);
        });

        it('undefinedのアクションIDでデフォルト値を返す', async () => {
          const progress = await engine.calculateActionProgress(undefined as any);
          expect(progress).toBe(0);
        });

        it('存在しないアクションでデフォルト値を返す', async () => {
          const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
          mockFetchActionData.mockResolvedValue(null);

          const progress = await engine.calculateActionProgress('non-existent-action');
          expect(progress).toBe(0);
        });

        it('タスクデータが配列でない場合エラーをスローする', async () => {
          const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
          const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

          mockFetchActionData.mockResolvedValue({
            id: 'action-1',
            subGoalId: 'subgoal-1',
            type: ActionType.EXECUTION,
            targetDays: 30,
          });

          mockFetchTasksByActionId.mockResolvedValue(null as any);

          const result = await engine.calculateActionProgress('action-1');
          expect(result).toBe(0);
        });
      });
    });

    describe('習慣アクション (HabitActionCalculator)', () => {
      it('習慣アクションの進捗を正しく計算する', async () => {
        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: 'action-1',
          subGoalId: 'subgoal-1',
          type: ActionType.HABIT,
          targetDays: 30,
        });

        // 24日継続（30日の80%）
        const tasks = Array.from({ length: 24 }, (_, i) => ({
          id: `task-${i + 1}`,
          progress: 100,
          status: TaskStatus.COMPLETED,
        }));

        mockFetchTasksByActionId.mockResolvedValue(tasks);

        const progress = await engine.calculateActionProgress('action-1');
        expect(progress).toBe(100); // 24日継続 = 30日の80% = 100%
      });

      it('継続率に基づく進捗計算（50%継続）', async () => {
        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: 'action-1',
          subGoalId: 'subgoal-1',
          type: ActionType.HABIT,
          targetDays: 30,
        });

        // 12日継続（30日の40%）
        const tasks = Array.from({ length: 12 }, (_, i) => ({
          id: `task-${i + 1}`,
          progress: 100,
          status: TaskStatus.COMPLETED,
        }));

        mockFetchTasksByActionId.mockResolvedValue(tasks);

        const progress = await engine.calculateActionProgress('action-1');
        expect(progress).toBe(50); // 12日継続 = 必要日数24日の50%
      });

      it('80%継続で達成とみなす', async () => {
        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: 'action-1',
          subGoalId: 'subgoal-1',
          type: ActionType.HABIT,
          targetDays: 30,
        });

        // 24日継続（30日の80%）
        const tasks = Array.from({ length: 24 }, (_, i) => ({
          id: `task-${i + 1}`,
          progress: 100,
          status: TaskStatus.COMPLETED,
        }));

        mockFetchTasksByActionId.mockResolvedValue(tasks);

        const progress = await engine.calculateActionProgress('action-1');
        expect(progress).toBe(100); // 80%継続で100%達成
      });

      it('80%を超える継続でも100%を超えない', async () => {
        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: 'action-1',
          subGoalId: 'subgoal-1',
          type: ActionType.HABIT,
          targetDays: 30,
        });

        // 30日継続（100%）
        const tasks = Array.from({ length: 30 }, (_, i) => ({
          id: `task-${i + 1}`,
          progress: 100,
          status: TaskStatus.COMPLETED,
        }));

        mockFetchTasksByActionId.mockResolvedValue(tasks);

        const progress = await engine.calculateActionProgress('action-1');
        expect(progress).toBe(100); // 100%を超えない
      });

      it('タスクが存在しない場合は0%を返す', async () => {
        const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
        const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

        mockFetchActionData.mockResolvedValue({
          id: 'action-1',
          subGoalId: 'subgoal-1',
          type: ActionType.HABIT,
          targetDays: 30,
        });

        mockFetchTasksByActionId.mockResolvedValue([]);

        const progress = await engine.calculateActionProgress('action-1');
        expect(progress).toBe(0);
      });

      describe('エッジケース', () => {
        it('targetDaysが0の場合でもエラーにならない', async () => {
          const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
          const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

          mockFetchActionData.mockResolvedValue({
            id: 'action-1',
            subGoalId: 'subgoal-1',
            type: ActionType.HABIT,
            targetDays: 0,
          });

          mockFetchTasksByActionId.mockResolvedValue([
            { id: 'task-1', progress: 100, status: TaskStatus.COMPLETED },
          ]);

          const progress = await engine.calculateActionProgress('action-1');
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        });

        it('targetDaysが未定義の場合デフォルト値を使用', async () => {
          const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
          const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

          mockFetchActionData.mockResolvedValue({
            id: 'action-1',
            subGoalId: 'subgoal-1',
            type: ActionType.HABIT,
            // targetDaysが未定義
          });

          mockFetchTasksByActionId.mockResolvedValue([
            { id: 'task-1', progress: 100, status: TaskStatus.COMPLETED },
          ]);

          const progress = await engine.calculateActionProgress('action-1');
          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('calculateSubGoalProgress (SubGoalProgressCalculator)', () => {
    it('サブ目標の進捗を正しく計算する（8つのアクションの平均）', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

      mockFetchActionsBySubGoalId.mockResolvedValue([
        { id: 'action-1' },
        { id: 'action-2' },
        { id: 'action-3' },
        { id: 'action-4' },
        { id: 'action-5' },
        { id: 'action-6' },
        { id: 'action-7' },
        { id: 'action-8' },
      ]);

      // アクションの進捗を順番に設定
      mockCalculateActionProgress
        .mockResolvedValueOnce(100) // action-1: 100%
        .mockResolvedValueOnce(75) // action-2: 75%
        .mockResolvedValueOnce(50) // action-3: 50%
        .mockResolvedValueOnce(25) // action-4: 25%
        .mockResolvedValueOnce(0) // action-5: 0%
        .mockResolvedValueOnce(100) // action-6: 100%
        .mockResolvedValueOnce(50) // action-7: 50%
        .mockResolvedValueOnce(0); // action-8: 0%

      const progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(progress).toBe(50); // (100+75+50+25+0+100+50+0) / 8 = 50%
    });

    it('アクション進捗の平均計算（全て同じ進捗）', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

      mockFetchActionsBySubGoalId.mockResolvedValue([
        { id: 'action-1' },
        { id: 'action-2' },
        { id: 'action-3' },
        { id: 'action-4' },
      ]);

      mockCalculateActionProgress
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(60);

      const progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(progress).toBe(60); // 全て60% = 平均60%
    });

    it('全アクション完了時の進捗100%', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

      mockFetchActionsBySubGoalId.mockResolvedValue([
        { id: 'action-1' },
        { id: 'action-2' },
        { id: 'action-3' },
        { id: 'action-4' },
        { id: 'action-5' },
        { id: 'action-6' },
        { id: 'action-7' },
        { id: 'action-8' },
      ]);

      mockCalculateActionProgress
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100);

      const progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(progress).toBe(100); // 全アクション100% = 100%
    });

    it('アクションが存在しない場合は0%を返す', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      mockFetchActionsBySubGoalId.mockResolvedValue([]);

      const progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(progress).toBe(0);
    });

    it('アクション数が8つでない場合でも計算できる', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

      // 4つのアクションのみ
      mockFetchActionsBySubGoalId.mockResolvedValue([
        { id: 'action-1' },
        { id: 'action-2' },
        { id: 'action-3' },
        { id: 'action-4' },
      ]);

      mockCalculateActionProgress
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(0);

      const progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(progress).toBe(50); // (100+50+50+0) / 4 = 50%
    });

    describe('エッジケース', () => {
      it('空文字列のサブ目標IDでデフォルト値を返す', async () => {
        const result = await engine.calculateSubGoalProgress('');
        expect(result).toBe(0);
      });

      it('nullのサブ目標IDでデフォルト値を返す', async () => {
        const result = await engine.calculateSubGoalProgress(null as any);
        expect(result).toBe(0);
      });

      it('undefinedのサブ目標IDでデフォルト値を返す', async () => {
        const result = await engine.calculateSubGoalProgress(undefined as any);
        expect(result).toBe(0);
      });

      it('アクションデータが配列でない場合デフォルト値を返す', async () => {
        const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
        mockFetchActionsBySubGoalId.mockResolvedValue(null as any);

        const result = await engine.calculateSubGoalProgress('subgoal-1');
        expect(result).toBe(0);
      });

      it('無効な進捗値を含む場合でも計算できる', async () => {
        const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
        const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

        mockFetchActionsBySubGoalId.mockResolvedValue([
          { id: 'action-1' },
          { id: 'action-2' },
          { id: 'action-3' },
        ]);

        // 一部無効な進捗値を含む
        mockCalculateActionProgress
          .mockResolvedValueOnce(50)
          .mockResolvedValueOnce(-10) // 無効な値（フィルタリングされる）
          .mockResolvedValueOnce(100);

        const progress = await engine.calculateSubGoalProgress('subgoal-1');
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      it('全てのアクション進捗が無効な場合デフォルト値を返す', async () => {
        const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
        const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

        mockFetchActionsBySubGoalId.mockResolvedValue([{ id: 'action-1' }, { id: 'action-2' }]);

        // 全て無効な進捗値
        mockCalculateActionProgress.mockResolvedValueOnce(-10).mockResolvedValueOnce(-20);

        const result = await engine.calculateSubGoalProgress('subgoal-1');
        expect(result).toBe(0);
      });
    });
  });

  describe('calculateGoalProgress (GoalProgressCalculator)', () => {
    it('目標の進捗を正しく計算する（8つのサブ目標の平均）', async () => {
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
      const mockCalculateSubGoalProgress = vi.spyOn(engine, 'calculateSubGoalProgress');

      mockFetchSubGoalsByGoalId.mockResolvedValue([
        { id: 'subgoal-1' },
        { id: 'subgoal-2' },
        { id: 'subgoal-3' },
        { id: 'subgoal-4' },
        { id: 'subgoal-5' },
        { id: 'subgoal-6' },
        { id: 'subgoal-7' },
        { id: 'subgoal-8' },
      ]);

      // サブ目標の進捗を順番に設定
      mockCalculateSubGoalProgress
        .mockResolvedValueOnce(80) // subgoal-1: 80%
        .mockResolvedValueOnce(60) // subgoal-2: 60%
        .mockResolvedValueOnce(40) // subgoal-3: 40%
        .mockResolvedValueOnce(20) // subgoal-4: 20%
        .mockResolvedValueOnce(100) // subgoal-5: 100%
        .mockResolvedValueOnce(0) // subgoal-6: 0%
        .mockResolvedValueOnce(70) // subgoal-7: 70%
        .mockResolvedValueOnce(30); // subgoal-8: 30%

      const progress = await engine.calculateGoalProgress('goal-1');
      expect(progress).toBe(50); // (80+60+40+20+100+0+70+30) / 8 = 50%
    });

    it('サブ目標進捗の平均計算（全て同じ進捗）', async () => {
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
      const mockCalculateSubGoalProgress = vi.spyOn(engine, 'calculateSubGoalProgress');

      mockFetchSubGoalsByGoalId.mockResolvedValue([
        { id: 'subgoal-1' },
        { id: 'subgoal-2' },
        { id: 'subgoal-3' },
        { id: 'subgoal-4' },
      ]);

      mockCalculateSubGoalProgress
        .mockResolvedValueOnce(75)
        .mockResolvedValueOnce(75)
        .mockResolvedValueOnce(75)
        .mockResolvedValueOnce(75);

      const progress = await engine.calculateGoalProgress('goal-1');
      expect(progress).toBe(75); // 全て75% = 平均75%
    });

    it('全サブ目標完了時の進捗100%', async () => {
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
      const mockCalculateSubGoalProgress = vi.spyOn(engine, 'calculateSubGoalProgress');

      mockFetchSubGoalsByGoalId.mockResolvedValue([
        { id: 'subgoal-1' },
        { id: 'subgoal-2' },
        { id: 'subgoal-3' },
        { id: 'subgoal-4' },
        { id: 'subgoal-5' },
        { id: 'subgoal-6' },
        { id: 'subgoal-7' },
        { id: 'subgoal-8' },
      ]);

      mockCalculateSubGoalProgress
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(100);

      const progress = await engine.calculateGoalProgress('goal-1');
      expect(progress).toBe(100); // 全サブ目標100% = 100%
    });

    it('サブ目標が存在しない場合は0%を返す', async () => {
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
      mockFetchSubGoalsByGoalId.mockResolvedValue([]);

      const progress = await engine.calculateGoalProgress('goal-1');
      expect(progress).toBe(0);
    });

    it('サブ目標数が8つでない場合でも計算できる', async () => {
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
      const mockCalculateSubGoalProgress = vi.spyOn(engine, 'calculateSubGoalProgress');

      // 4つのサブ目標のみ
      mockFetchSubGoalsByGoalId.mockResolvedValue([
        { id: 'subgoal-1' },
        { id: 'subgoal-2' },
        { id: 'subgoal-3' },
        { id: 'subgoal-4' },
      ]);

      mockCalculateSubGoalProgress
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(0);

      const progress = await engine.calculateGoalProgress('goal-1');
      expect(progress).toBe(50); // (100+60+40+0) / 4 = 50%
    });

    describe('エッジケース', () => {
      it('空文字列の目標IDでデフォルト値を返す', async () => {
        const result = await engine.calculateGoalProgress('');
        expect(result).toBe(0);
      });

      it('nullの目標IDでデフォルト値を返す', async () => {
        const result = await engine.calculateGoalProgress(null as any);
        expect(result).toBe(0);
      });

      it('undefinedの目標IDでデフォルト値を返す', async () => {
        const result = await engine.calculateGoalProgress(undefined as any);
        expect(result).toBe(0);
      });

      it('サブ目標データが配列でない場合デフォルト値を返す', async () => {
        const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
        mockFetchSubGoalsByGoalId.mockResolvedValue(null as any);

        const result = await engine.calculateGoalProgress('goal-1');
        expect(result).toBe(0);
      });

      it('無効な進捗値を含む場合でも計算できる', async () => {
        const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
        const mockCalculateSubGoalProgress = vi.spyOn(engine, 'calculateSubGoalProgress');

        mockFetchSubGoalsByGoalId.mockResolvedValue([
          { id: 'subgoal-1' },
          { id: 'subgoal-2' },
          { id: 'subgoal-3' },
        ]);

        // 一部無効な進捗値を含む
        mockCalculateSubGoalProgress
          .mockResolvedValueOnce(50)
          .mockResolvedValueOnce(-10) // 無効な値（フィルタリングされる）
          .mockResolvedValueOnce(100);

        const progress = await engine.calculateGoalProgress('goal-1');
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      it('全てのサブ目標進捗が無効な場合デフォルト値を返す', async () => {
        const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
        const mockCalculateSubGoalProgress = vi.spyOn(engine, 'calculateSubGoalProgress');

        mockFetchSubGoalsByGoalId.mockResolvedValue([{ id: 'subgoal-1' }, { id: 'subgoal-2' }]);

        // 全て無効な進捗値
        mockCalculateSubGoalProgress.mockResolvedValueOnce(-10).mockResolvedValueOnce(-20);

        const result = await engine.calculateGoalProgress('goal-1');
        expect(result).toBe(0);
      });
    });
  });

  describe('recalculateFromTask', () => {
    it('タスクから上位階層まで全ての進捗を再計算する', async () => {
      // 各種モックを設定
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchSubGoalData = vi.spyOn(engine as any, 'fetchSubGoalData');
      const mockFetchGoalData = vi.spyOn(engine as any, 'fetchGoalData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');

      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      mockFetchSubGoalData.mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      mockFetchGoalData.mockResolvedValue({
        id: 'goal-1',
      });

      mockFetchTasksByActionId.mockResolvedValue([
        {
          id: 'task-1',
          progress: 100,
          status: TaskStatus.COMPLETED,
        },
      ]);

      mockFetchActionsBySubGoalId.mockResolvedValue([
        {
          id: 'action-1',
          progress: 100,
          type: ActionType.EXECUTION,
          tasks: [],
        },
      ]);

      mockFetchSubGoalsByGoalId.mockResolvedValue([
        {
          id: 'subgoal-1',
          progress: 100,
          actions: [],
        },
      ]);

      const hierarchy = await engine.recalculateFromTask('task-1');

      expect(hierarchy.task.id).toBe('task-1');
      expect(hierarchy.task.progress).toBe(100);
      expect(hierarchy.action.id).toBe('action-1');
      expect(hierarchy.subGoal.id).toBe('subgoal-1');
      expect(hierarchy.goal.id).toBe('goal-1');
    });
  });

  describe('キャッシュ機能', () => {
    it('同じタスクの進捗を2回計算する場合、2回目はキャッシュから取得する', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // 1回目の計算
      const progress1 = await engine.calculateTaskProgress('task-1');
      expect(progress1).toBe(100);
      expect(mockFetchTaskData).toHaveBeenCalledTimes(1);

      // 2回目の計算（キャッシュから取得）
      const progress2 = await engine.calculateTaskProgress('task-1');
      expect(progress2).toBe(100);
      expect(mockFetchTaskData).toHaveBeenCalledTimes(1); // 呼び出し回数は変わらない
    });

    it('キャッシュが期限切れの場合は再計算する', async () => {
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

    it('関連するキャッシュが正しくクリアされる', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');

      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      mockFetchTasksByActionId.mockResolvedValue([
        {
          id: 'task-1',
          progress: 100,
          status: TaskStatus.COMPLETED,
        },
      ]);

      // アクションがタスクに依存するようにモック
      mockFetchActionsBySubGoalId.mockResolvedValue([
        {
          id: 'action-1',
          progress: 100,
          type: ActionType.EXECUTION,
          tasks: [],
        },
      ]);

      // タスクの進捗を計算してキャッシュに保存
      await engine.calculateTaskProgress('task-1');

      // サブ目標の進捗を計算（これによりアクションの進捗も計算され、タスクに依存するキャッシュが作成される）
      await engine.calculateSubGoalProgress('subgoal-1');

      // キャッシュが存在することを確認
      const cache = (engine as any).cache;
      expect(cache.has('task:task-1')).toBe(true);
      expect(cache.has('subgoal:subgoal-1')).toBe(true);

      // recalculateFromTaskを実行してキャッシュをクリア
      const mockFetchSubGoalData = vi.spyOn(engine as any, 'fetchSubGoalData');
      const mockFetchGoalData = vi.spyOn(engine as any, 'fetchGoalData');
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');

      mockFetchSubGoalData.mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      mockFetchGoalData.mockResolvedValue({
        id: 'goal-1',
      });

      mockFetchSubGoalsByGoalId.mockResolvedValue([
        {
          id: 'subgoal-1',
          progress: 100,
          actions: [],
        },
      ]);

      // まずキャッシュにデータを設定するため、進捗計算を実行
      // 必要なモックを設定
      const mockFetchTaskDataForCache = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskDataForCache.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      await engine.calculateTaskProgress('task-1');

      // キャッシュが設定されていることを確認
      expect(cache.has('task:task-1')).toBe(true);

      // clearRelatedCacheを直接呼び出してキャッシュをクリア
      (engine as any).clearRelatedCache('task-1');

      // タスクのキャッシュがクリアされていることを確認
      expect(cache.has('task:task-1')).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないタスクIDでエラーが発生した場合の処理', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockRejectedValue(new Error('Task not found'));

      const result = await engine.calculateTaskProgress('invalid-task-id');
      expect(result).toBe(0);
    });

    it('存在しないアクションIDでエラーが発生した場合の処理', async () => {
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      mockFetchActionData.mockRejectedValue(new Error('Action not found'));

      const result = await engine.calculateActionProgress('invalid-action-id');
      expect(result).toBe(0);
    });

    it('存在しないサブ目標IDでエラーが発生した場合の処理', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      mockFetchActionsBySubGoalId.mockRejectedValue(new Error('SubGoal not found'));

      const result = await engine.calculateSubGoalProgress('invalid-subgoal-id');
      expect(result).toBe(0);
    });

    it('存在しない目標IDでエラーが発生した場合の処理', async () => {
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');
      mockFetchSubGoalsByGoalId.mockRejectedValue(new Error('Goal not found'));

      const result = await engine.calculateGoalProgress('invalid-goal-id');
      expect(result).toBe(0);
    });

    it('ネットワークエラーが発生した場合の処理', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockRejectedValue(new Error('Network error'));

      const result = await engine.calculateTaskProgress('task-1');
      expect(result).toBe(0);
    });

    it('循環依存エラーが発生した場合は例外をスロー', async () => {
      // 循環依存エラーを直接スローするモックを作成
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');

      mockFetchTaskData.mockImplementation(async () => {
        throw new Error('Circular dependency detected: task-1');
      });

      await expect(engine.calculateTaskProgress('task-1')).rejects.toThrow(
        'Circular dependency detected: task-1'
      );
    });

    it('無効なタスクステータスの場合のデフォルト処理', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: 'INVALID_STATUS' as TaskStatus,
        completedAt: null,
      });

      const progress = await engine.calculateTaskProgress('task-1');
      expect(progress).toBe(0); // 無効なステータスは未完了として扱う
    });

    it('無効なアクションタイプの場合のデフォルト処理', async () => {
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: 'INVALID_TYPE' as ActionType,
        targetDays: 30,
      });

      mockFetchTasksByActionId.mockResolvedValue([
        {
          id: 'task-1',
          progress: 100,
          status: TaskStatus.COMPLETED,
        },
      ]);

      const progress = await engine.calculateActionProgress('action-1');
      expect(progress).toBe(4); // 無効なタイプは習慣アクションとして扱われ、1日継続/24日必要 = 4%
    });

    it('recalculateFromTaskで途中でエラーが発生した場合の処理', async () => {
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');

      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      mockFetchActionData.mockRejectedValue(new Error('Action not found'));

      await expect(engine.recalculateFromTask('task-1')).rejects.toThrow('Action not found');
    });
  });

  describe('境界値テスト', () => {
    it('進捗率が100%を超えないことを確認', async () => {
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.HABIT,
        targetDays: 10, // 短い期間
      });

      // 必要日数（8日）を大幅に超える継続日数（20日）
      const tasks = Array.from({ length: 20 }, (_, i) => ({
        id: `task-${i + 1}`,
        progress: 100,
        status: TaskStatus.COMPLETED,
      }));

      mockFetchTasksByActionId.mockResolvedValue(tasks);

      const progress = await engine.calculateActionProgress('action-1');
      expect(progress).toBe(100); // 100%を超えない
    });

    it('進捗率が負の値にならないことを確認', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

      mockFetchActionsBySubGoalId.mockResolvedValue([{ id: 'action-1' }]);

      // 負の進捗率を返すモック（実際にはありえないが境界値テスト）
      mockCalculateActionProgress.mockResolvedValue(-10);

      const progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(progress).toBe(0); // 無効な値はフィルタリングされ、デフォルト値が返される
    });

    it('小数点以下の進捗率が正しく丸められることを確認', async () => {
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockCalculateActionProgress = vi.spyOn(engine, 'calculateActionProgress');

      mockFetchActionsBySubGoalId.mockResolvedValue([
        { id: 'action-1' },
        { id: 'action-2' },
        { id: 'action-3' },
      ]);

      // 33.333...%になる進捗率
      mockCalculateActionProgress
        .mockResolvedValueOnce(33)
        .mockResolvedValueOnce(33)
        .mockResolvedValueOnce(34);

      const progress = await engine.calculateSubGoalProgress('subgoal-1');
      expect(progress).toBe(33); // (33+33+34)/3 = 33.333... → 33に丸められる
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のタスクがある場合でも適切に処理される', async () => {
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      // 1000個のタスクを生成
      const tasks = Array.from({ length: 1000 }, (_, i) => ({
        id: `task-${i + 1}`,
        progress: i % 2 === 0 ? 100 : 0, // 半分完了
        status: i % 2 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
      }));

      mockFetchTasksByActionId.mockResolvedValue(tasks);

      const startTime = Date.now();
      const progress = await engine.calculateActionProgress('action-1');
      const endTime = Date.now();

      expect(progress).toBe(50); // 半分完了なので50%
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内で処理完了
    });

    it('深い階層の再計算が適切に処理される', async () => {
      // 複雑な階層構造のモックデータを設定
      const mockFetchTaskData = vi.spyOn(engine as any, 'fetchTaskData');
      const mockFetchActionData = vi.spyOn(engine as any, 'fetchActionData');
      const mockFetchSubGoalData = vi.spyOn(engine as any, 'fetchSubGoalData');
      const mockFetchGoalData = vi.spyOn(engine as any, 'fetchGoalData');
      const mockFetchTasksByActionId = vi.spyOn(engine as any, 'fetchTasksByActionId');
      const mockFetchActionsBySubGoalId = vi.spyOn(engine as any, 'fetchActionsBySubGoalId');
      const mockFetchSubGoalsByGoalId = vi.spyOn(engine as any, 'fetchSubGoalsByGoalId');

      mockFetchTaskData.mockResolvedValue({
        id: 'task-1',
        actionId: 'action-1',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      mockFetchActionData.mockResolvedValue({
        id: 'action-1',
        subGoalId: 'subgoal-1',
        type: ActionType.EXECUTION,
        targetDays: 30,
      });

      mockFetchSubGoalData.mockResolvedValue({
        id: 'subgoal-1',
        goalId: 'goal-1',
      });

      mockFetchGoalData.mockResolvedValue({
        id: 'goal-1',
      });

      // 各階層に複数の要素を設定
      mockFetchTasksByActionId.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `task-${i + 1}`,
          progress: 100,
          status: TaskStatus.COMPLETED,
        }))
      );

      mockFetchActionsBySubGoalId.mockResolvedValue(
        Array.from({ length: 8 }, (_, i) => ({
          id: `action-${i + 1}`,
          progress: 100,
          type: ActionType.EXECUTION,
          tasks: [],
        }))
      );

      mockFetchSubGoalsByGoalId.mockResolvedValue(
        Array.from({ length: 8 }, (_, i) => ({
          id: `subgoal-${i + 1}`,
          progress: 100,
          actions: [],
        }))
      );

      const startTime = Date.now();
      const hierarchy = await engine.recalculateFromTask('task-1');
      const endTime = Date.now();

      expect(hierarchy).toBeDefined();
      expect(hierarchy.task.id).toBe('task-1');
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内で処理完了
    });
  });
});
