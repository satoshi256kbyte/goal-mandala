import { PrismaClient } from '../generated/prisma-client';
import { ProgressCalculationEngine, TaskStatus, ActionType } from './progress-calculation';

// Prismaクライアントのモック
const mockPrisma = {
  task: {
    findUnique: jest.fn(),
  },
  action: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  subGoal: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  goal: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

describe('ProgressCalculationEngine', () => {
  let engine: ProgressCalculationEngine;

  beforeEach(() => {
    engine = new ProgressCalculationEngine(mockPrisma);
    jest.clearAllMocks();
  });

  describe('calculateTaskProgress', () => {
    it('完了したタスクの進捗は100%を返す', async () => {
      // Arrange
      const taskId = 'task-1';
      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        status: 'COMPLETED',
      });

      // Act
      const progress = await engine.calculateTaskProgress(taskId);

      // Assert
      expect(progress).toBe(100);
      expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: taskId },
        select: { status: true },
      });
    });

    it('未完了のタスクの進捗は0%を返す', async () => {
      // Arrange
      const taskId = 'task-1';
      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        status: 'PENDING',
      });

      // Act
      const progress = await engine.calculateTaskProgress(taskId);

      // Assert
      expect(progress).toBe(0);
    });

    it('存在しないタスクの場合はエラーを投げる', async () => {
      // Arrange
      const taskId = 'non-existent-task';
      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(engine.calculateTaskProgress(taskId)).rejects.toThrow(
        'Task not found: non-existent-task'
      );
    });
  });

  describe('calculateSubGoalProgress', () => {
    it('サブ目標の進捗を正しく計算する（アクションの平均）', async () => {
      // Arrange
      const subGoalId = 'subgoal-1';
      (mockPrisma.subGoal.findUnique as jest.Mock).mockResolvedValue({
        id: subGoalId,
        actions: [{ id: 'action-1' }, { id: 'action-2' }, { id: 'action-3' }],
      });

      // アクションの進捗をモック
      const originalCalculateActionProgress = engine.calculateActionProgress;
      engine.calculateActionProgress = jest
        .fn()
        .mockResolvedValueOnce(60) // action-1: 60%
        .mockResolvedValueOnce(80) // action-2: 80%
        .mockResolvedValueOnce(40); // action-3: 40%

      // Act
      const progress = await engine.calculateSubGoalProgress(subGoalId);

      // Assert
      expect(progress).toBe(60); // (60 + 80 + 40) / 3 = 60
      expect(engine.calculateActionProgress).toHaveBeenCalledTimes(3);
    });

    it('サブ目標の進捗が8つのアクションの平均として正しく計算される', async () => {
      // Arrange
      const subGoalId = 'subgoal-1';
      const actionProgresses = [10, 20, 30, 40, 50, 60, 70, 80]; // 8つのアクション

      (mockPrisma.subGoal.findUnique as jest.Mock).mockResolvedValue({
        id: subGoalId,
        actions: actionProgresses.map((_, index) => ({ id: `action-${index + 1}` })),
      });

      // 各アクションの進捗をモック
      engine.calculateActionProgress = jest.fn();
      actionProgresses.forEach((progress, index) => {
        (engine.calculateActionProgress as jest.Mock).mockResolvedValueOnce(progress);
      });

      // Act
      const progress = await engine.calculateSubGoalProgress(subGoalId);

      // Assert
      const expectedProgress =
        actionProgresses.reduce((sum, p) => sum + p, 0) / actionProgresses.length;
      expect(progress).toBe(expectedProgress); // (10+20+30+40+50+60+70+80)/8 = 45
      expect(engine.calculateActionProgress).toHaveBeenCalledTimes(8);
    });
  });

  describe('calculateGoalProgress', () => {
    it('目標の進捗が8つのサブ目標の平均として正しく計算される', async () => {
      // Arrange
      const goalId = 'goal-1';
      const subGoalProgresses = [15, 25, 35, 45, 55, 65, 75, 85]; // 8つのサブ目標

      (mockPrisma.goal.findUnique as jest.Mock).mockResolvedValue({
        id: goalId,
        subGoals: subGoalProgresses.map((_, index) => ({ id: `subgoal-${index + 1}` })),
      });

      // 各サブ目標の進捗をモック
      engine.calculateSubGoalProgress = jest.fn();
      subGoalProgresses.forEach((progress, index) => {
        (engine.calculateSubGoalProgress as jest.Mock).mockResolvedValueOnce(progress);
      });

      // Act
      const progress = await engine.calculateGoalProgress(goalId);

      // Assert
      const expectedProgress =
        subGoalProgresses.reduce((sum, p) => sum + p, 0) / subGoalProgresses.length;
      expect(progress).toBe(expectedProgress); // (15+25+35+45+55+65+75+85)/8 = 50
      expect(engine.calculateSubGoalProgress).toHaveBeenCalledTimes(8);
    });
  });

  describe('階層的進捗計算', () => {
    it('下位レベルの変更時に上位レベルが自動更新される', async () => {
      // Arrange
      const taskId = 'task-1';
      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        id: taskId,
        status: 'COMPLETED',
        action: {
          id: 'action-1',
          tasks: [
            {
              id: 'task-1',
              status: 'COMPLETED',
              type: 'ACTION',
              title: 'タスク1',
              description: '',
            },
            { id: 'task-2', status: 'PENDING', type: 'ACTION', title: 'タスク2', description: '' },
          ],
          subGoal: {
            id: 'subgoal-1',
            actions: [{ id: 'action-1' }, { id: 'action-2' }],
            goal: {
              id: 'goal-1',
              subGoals: [{ id: 'subgoal-1' }, { id: 'subgoal-2' }],
            },
          },
        },
      });

      // モック関数を設定
      engine.calculateTaskProgress = jest.fn().mockResolvedValue(100);
      engine.calculateActionProgress = jest.fn().mockResolvedValue(50);
      engine.calculateSubGoalProgress = jest.fn().mockResolvedValue(40);
      engine.calculateGoalProgress = jest.fn().mockResolvedValue(35);
      (engine as any).buildActionProgresses = jest.fn().mockResolvedValue([]);
      (engine as any).buildSubGoalProgresses = jest.fn().mockResolvedValue([]);
      (engine as any).updateProgressInDatabase = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await engine.recalculateFromTask(taskId);

      // Assert
      expect(result.task.progress).toBe(100);
      expect(result.action.progress).toBe(50);
      expect(result.subGoal.progress).toBe(40);
      expect(result.goal.progress).toBe(35);

      // 階層的に計算されることを確認
      expect(engine.calculateTaskProgress).toHaveBeenCalledWith(taskId);
      expect(engine.calculateActionProgress).toHaveBeenCalledWith('action-1');
      expect(engine.calculateSubGoalProgress).toHaveBeenCalledWith('subgoal-1');
      expect(engine.calculateGoalProgress).toHaveBeenCalledWith('goal-1');
    });
  });

  describe('自動更新機能', () => {
    it('タスク状態変更時に自動更新が実行される', async () => {
      // Arrange
      const taskId = 'task-1';
      engine.recalculateFromTask = jest.fn().mockResolvedValue({});

      // Act
      await engine.onTaskStatusChanged(taskId);

      // Assert
      expect(engine.recalculateFromTask).toHaveBeenCalledWith(taskId);
    });

    it('自動更新が無効の場合は更新されない', async () => {
      // Arrange
      const taskId = 'task-1';
      engine.setAutoUpdateEnabled(false);
      engine.recalculateFromTask = jest.fn().mockResolvedValue({});

      // Act
      await engine.onTaskStatusChanged(taskId);

      // Assert
      expect(engine.recalculateFromTask).not.toHaveBeenCalled();
    });

    it('自動更新でエラーが発生してもプロセスが継続する', async () => {
      // Arrange
      const taskId = 'task-1';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      engine.recalculateFromTask = jest.fn().mockRejectedValue(new Error('Test error'));

      // Act & Assert - エラーが投げられないことを確認
      await expect(engine.onTaskStatusChanged(taskId)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        `Failed to auto-update progress for task ${taskId}:`,
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('進捗データ管理とキャッシュ', () => {
    it('進捗計算時の依存関係が正しく設定される', async () => {
      // Arrange
      const subGoalId = 'subgoal-1';
      const actionIds = ['action-1', 'action-2', 'action-3'];

      (mockPrisma.subGoal.findUnique as jest.Mock).mockResolvedValue({
        id: subGoalId,
        actions: actionIds.map(id => ({ id })),
      });

      engine.calculateActionProgress = jest
        .fn()
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(90);

      // Act
      await engine.calculateSubGoalProgress(subGoalId);

      // Assert - キャッシュに正しい依存関係が設定されているかチェック
      const cacheEntry = (engine as any).cache.get(`subgoal:${subGoalId}`);
      expect(cacheEntry).toBeDefined();
      expect(cacheEntry.dependencies).toEqual([subGoalId, ...actionIds]);
    });

    it('キャッシュヒット率が正しく計算される', async () => {
      // Arrange
      const taskId = 'task-1';
      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        status: 'COMPLETED',
      });

      // Act - 最初の呼び出し（キャッシュミス）
      await engine.calculateTaskProgress(taskId);

      // 2回目の呼び出し（キャッシュヒット）
      await engine.calculateTaskProgress(taskId);

      // 3回目の呼び出し（キャッシュヒット）
      await engine.calculateTaskProgress(taskId);

      // Assert
      const stats = engine.getCacheStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalHits).toBe(2);
      expect(stats.hitRate).toBe(66.67); // 2/3 * 100 = 66.67%
    });

    it('キャッシュクリア時に統計もリセットされる', async () => {
      // Arrange
      const taskId = 'task-1';
      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        status: 'COMPLETED',
      });

      // Act
      await engine.calculateTaskProgress(taskId);
      await engine.calculateTaskProgress(taskId); // キャッシュヒット

      engine.clearCache();

      // Assert
      const stats = engine.getCacheStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('キャッシュサイズ制限が正しく動作する', async () => {
      // Arrange - MAX_CACHE_SIZEを小さく設定したエンジンを作成
      const smallCacheEngine = new ProgressCalculationEngine(mockPrisma);
      (smallCacheEngine as any).MAX_CACHE_SIZE = 3;

      (mockPrisma.task.findUnique as jest.Mock).mockResolvedValue({
        status: 'COMPLETED',
      });

      // Act - キャッシュサイズを超える数のエントリを追加
      await smallCacheEngine.calculateTaskProgress('task-1');
      await smallCacheEngine.calculateTaskProgress('task-2');
      await smallCacheEngine.calculateTaskProgress('task-3');

      // キャッシュサイズが制限に達していることを確認
      let stats = smallCacheEngine.getCacheStats();
      expect(stats.size).toBe(3);

      // さらにエントリを追加
      await smallCacheEngine.calculateTaskProgress('task-4');

      // Assert - キャッシュサイズが制限を超えていないことを確認
      // evictOldestEntriesは最低1個削除するので、3-1+1=3個になる
      stats = smallCacheEngine.getCacheStats();
      expect(stats.size).toBe(3);
    });
  });

  describe('データ整合性検証', () => {
    it('データ整合性が正常な場合はvalidを返す', async () => {
      // Arrange
      const goalId = 'goal-1';
      (mockPrisma.goal.findUnique as jest.Mock).mockResolvedValue({
        id: goalId,
        progress: 50,
        subGoals: Array.from({ length: 8 }, (_, i) => ({
          id: `subgoal-${i + 1}`,
          progress: 50,
          actions: Array.from({ length: 8 }, (_, j) => ({
            id: `action-${i + 1}-${j + 1}`,
            progress: 50,
            tasks: [{ status: 'COMPLETED' }, { status: 'PENDING' }],
          })),
        })),
      });

      // 進捗計算をモック
      engine.calculateActionProgress = jest.fn().mockResolvedValue(50);
      engine.calculateSubGoalProgress = jest.fn().mockResolvedValue(50);
      engine.calculateGoalProgress = jest.fn().mockResolvedValue(50);

      // Act
      const result = await engine.validateDataIntegrity(goalId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('サブ目標数が8個でない場合はエラーを返す', async () => {
      // Arrange
      const goalId = 'goal-1';
      (mockPrisma.goal.findUnique as jest.Mock).mockResolvedValue({
        id: goalId,
        progress: 50,
        subGoals: Array.from({ length: 6 }, (_, i) => ({
          // 6個しかない
          id: `subgoal-${i + 1}`,
          progress: 50,
          actions: Array.from({ length: 8 }, (_, j) => ({
            id: `action-${i + 1}-${j + 1}`,
            progress: 50,
            tasks: [],
          })),
        })),
      });

      // Act
      const result = await engine.validateDataIntegrity(goalId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Goal ${goalId} should have 8 sub-goals, but has 6`);
    });

    it('進捗値に不整合がある場合はエラーを返す', async () => {
      // Arrange
      const goalId = 'goal-1';
      (mockPrisma.goal.findUnique as jest.Mock).mockResolvedValue({
        id: goalId,
        progress: 50, // 保存されている値
        subGoals: Array.from({ length: 8 }, (_, i) => ({
          id: `subgoal-${i + 1}`,
          progress: 50,
          actions: Array.from({ length: 8 }, (_, j) => ({
            id: `action-${i + 1}-${j + 1}`,
            progress: 50,
            tasks: [],
          })),
        })),
      });

      // 計算値を異なる値に設定
      engine.calculateActionProgress = jest.fn().mockResolvedValue(50);
      engine.calculateSubGoalProgress = jest.fn().mockResolvedValue(50);
      engine.calculateGoalProgress = jest.fn().mockResolvedValue(75); // 計算値は75%

      // Act
      const result = await engine.validateDataIntegrity(goalId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(error => error.includes('Goal') && error.includes('progress mismatch'))
      ).toBe(true);
    });
  });

  describe('データ整合性修復', () => {
    it('不整合なデータを正しく修復する', async () => {
      // Arrange
      const goalId = 'goal-1';
      (mockPrisma.goal.findUnique as jest.Mock).mockResolvedValue({
        id: goalId,
        progress: 30, // 不正な値
        subGoals: [
          {
            id: 'subgoal-1',
            progress: 40, // 不正な値
            actions: [
              {
                id: 'action-1',
                progress: 50, // 不正な値
                tasks: [],
              },
            ],
          },
        ],
      });

      // 正しい計算値を設定
      engine.calculateActionProgress = jest.fn().mockResolvedValue(75);
      engine.calculateSubGoalProgress = jest.fn().mockResolvedValue(80);
      engine.calculateGoalProgress = jest.fn().mockResolvedValue(85);

      // データベース更新をモック
      (mockPrisma.action.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.subGoal.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.goal.update as jest.Mock).mockResolvedValue({});

      // Act
      const result = await engine.repairDataIntegrity(goalId);

      // Assert
      expect(result.repaired).toBe(true);
      expect(result.repairedItems).toHaveLength(3);
      expect(result.repairedItems).toContain('Action action-1 progress updated to 75%');
      expect(result.repairedItems).toContain('SubGoal subgoal-1 progress updated to 80%');
      expect(result.repairedItems).toContain('Goal goal-1 progress updated to 85%');

      // データベース更新が呼ばれたことを確認
      expect(mockPrisma.action.update).toHaveBeenCalledWith({
        where: { id: 'action-1' },
        data: { progress: 75 },
      });
      expect(mockPrisma.subGoal.update).toHaveBeenCalledWith({
        where: { id: 'subgoal-1' },
        data: { progress: 80 },
      });
      expect(mockPrisma.goal.update).toHaveBeenCalledWith({
        where: { id: goalId },
        data: { progress: 85 },
      });
    });
  });
});
