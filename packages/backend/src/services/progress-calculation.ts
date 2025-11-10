import { PrismaClient, TaskStatus as PrismaTaskStatus } from '../generated/prisma-client';
import { ExtendedProgressDataStore } from './progress-data-store';
import { ProgressValidator } from './progress-validator';

// Prisma の TaskStatus を再エクスポート
export type TaskStatus = PrismaTaskStatus;
export const TaskStatus = {
  PENDING: 'PENDING' as const,
  IN_PROGRESS: 'IN_PROGRESS' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
};

export enum ActionType {
  EXECUTION = 'execution',
  HABIT = 'habit',
}

export interface TaskProgress {
  id: string;
  progress: number;
  status: TaskStatus;
}

export interface ActionProgress {
  id: string;
  progress: number;
  type: ActionType;
  taskCount: number;
  completedTaskCount: number;
}

export interface SubGoalProgress {
  id: string;
  progress: number;
  actionProgresses: ActionProgress[];
}

export interface GoalProgress {
  id: string;
  progress: number;
  subGoalProgresses: SubGoalProgress[];
}

export interface ProgressHierarchy {
  task: TaskProgress;
  action: ActionProgress;
  subGoal: SubGoalProgress;
  goal: GoalProgress;
}

// 進捗計算エンジンのインターフェース
export interface IProgressCalculationEngine {
  calculateTaskProgress(taskId: string): Promise<number>;
  calculateActionProgress(actionId: string): Promise<number>;
  calculateSubGoalProgress(subGoalId: string): Promise<number>;
  calculateGoalProgress(goalId: string): Promise<number>;
  recalculateFromTask(taskId: string): Promise<ProgressHierarchy>;
  recalculateFromAction(actionId: string): Promise<Omit<ProgressHierarchy, 'task'>>;
  recalculateFromSubGoal(subGoalId: string): Promise<Omit<ProgressHierarchy, 'task' | 'action'>>;
}

// 進捗計算エンジンの実装
// キャッシュエントリの型定義
interface CacheEntry {
  value: number;
  timestamp: number;
  dependencies: string[]; // 依存するエンティティのID
}

// 進捗データの永続化用インターフェース（後方互換性のため残す）
export interface ProgressDataStore {
  saveProgress(entityType: string, entityId: string, progress: number): Promise<void>;
  getProgress(entityType: string, entityId: string): Promise<number | null>;
  getProgressHistory(
    entityType: string,
    entityId: string,
    days: number
  ): Promise<{ date: Date; progress: number }[]>;
  getSignificantProgressChanges?(
    entityType: string,
    entityId: string,
    days: number,
    threshold?: number
  ): Promise<{ date: Date; progress: number; change: number }[]>;
  getProgressTrend?(
    entityType: string,
    entityId: string,
    days: number
  ): Promise<{
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    confidence: number;
  }>;
}

export class ProgressCalculationEngine implements IProgressCalculationEngine {
  private prisma: PrismaClient;
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分
  private readonly MAX_CACHE_SIZE = 1000; // 最大キャッシュサイズ
  private progressDataStore?: ProgressDataStore | ExtendedProgressDataStore;
  private autoUpdateEnabled: boolean = true; // 自動更新機能の有効/無効
  private cacheHits: number = 0; // キャッシュヒット数
  private cacheRequests: number = 0; // キャッシュリクエスト総数

  constructor(
    prisma: PrismaClient,
    progressDataStore?: ProgressDataStore | ExtendedProgressDataStore
  ) {
    this.prisma = prisma;
    this.cache = new Map();
    this.progressDataStore = progressDataStore;
  }

  /**
   * 自動更新機能の有効/無効を設定する
   */
  public setAutoUpdateEnabled(enabled: boolean): void {
    this.autoUpdateEnabled = enabled;
  }

  /**
   * タスクの進捗を計算する
   * タスクの状態に応じて進捗を返す
   * - COMPLETED: 100%
   * - IN_PROGRESS: 50%
   * - PENDING: 0%
   * - CANCELLED: 0%
   */
  async calculateTaskProgress(taskId: string): Promise<number> {
    const cacheKey = `task:${taskId}`;
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const progress = this.calculateTaskProgressByStatus(task.status);
    this.setCachedValue(cacheKey, progress, [taskId]);

    // 進捗データを永続化
    if (this.progressDataStore) {
      await this.progressDataStore.saveProgress('task', taskId, progress);
    }

    return progress;
  }

  /**
   * タスクの状態から進捗を計算する
   * @param status タスクの状態
   * @returns 進捗率（0-100）
   */
  private calculateTaskProgressByStatus(status: TaskStatus): number {
    switch (status) {
      case 'COMPLETED':
        return 100;
      case 'IN_PROGRESS':
        return 50;
      case 'PENDING':
      case 'CANCELLED':
      default:
        return 0;
    }
  }

  /**
   * アクションの進捗を計算する
   * 実行アクション: 完了タスク数 / 総タスク数 * 100
   * 習慣アクション: 継続日数ベース（80%継続で達成）
   */
  async calculateActionProgress(actionId: string): Promise<number> {
    const cacheKey = `action:${actionId}`;
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const action = await this.prisma.action.findUnique({
      where: { id: actionId },
      include: {
        tasks: {
          select: {
            status: true,
            type: true,
            completedAt: true,
            createdAt: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    let progress: number;

    // 現在のスキーマではTaskTypeにHABITがないため、
    // タスクのタイトルや説明で習慣タスクを判断する。将来的にはTaskTypeを拡張する予定
    const hasHabitTasks = action.tasks.some(
      task =>
        task.title?.toLowerCase().includes('習慣') ||
        task.title?.toLowerCase().includes('継続') ||
        task.description?.toLowerCase().includes('習慣') ||
        task.description?.toLowerCase().includes('継続')
    );

    if (hasHabitTasks) {
      // 習慣アクション: 継続日数ベースの計算
      progress = this.calculateHabitActionProgress(action.tasks);
    } else {
      // 実行アクション: 完了タスク数ベースの計算
      progress = this.calculateExecutionActionProgress(action.tasks);
    }

    this.setCachedValue(cacheKey, progress, [actionId]);

    // 進捗データを永続化
    if (this.progressDataStore) {
      await this.progressDataStore.saveProgress('action', actionId, progress);
    }

    return progress;
  }

  /**
   * サブ目標の進捗を計算する
   * 8つのアクションの平均進捗
   */
  async calculateSubGoalProgress(subGoalId: string): Promise<number> {
    const cacheKey = `subgoal:${subGoalId}`;
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const subGoal = await this.prisma.subGoal.findUnique({
      where: { id: subGoalId },
      include: {
        actions: {
          select: { id: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    if (subGoal.actions.length === 0) {
      return 0;
    }

    // 各アクションの進捗を計算
    const actionProgresses = await Promise.all(
      subGoal.actions.map(action => this.calculateActionProgress(action.id))
    );

    // ProgressValidatorを使用して無効な進捗値をフィルタリング
    const validator = new ProgressValidator();

    // 無効な進捗値がある場合は警告ログを出力
    const invalidProgresses = actionProgresses.filter(
      progress => !validator.isValidProgress(progress)
    );
    if (invalidProgresses.length > 0) {
      console.warn(`Invalid progress values detected for subgoal ${subGoalId}:`, invalidProgresses);
    }

    // 有効な進捗値のみで平均を計算
    const progress = validator.calculateAverage(actionProgresses);
    const roundedProgress = Math.round(progress * 100) / 100; // 小数点以下2桁で丸める

    // 依存関係を正しく設定（サブ目標は全てのアクションに依存）
    const dependencies = [subGoalId, ...subGoal.actions.map(a => a.id)];
    this.setCachedValue(cacheKey, roundedProgress, dependencies);

    // 進捗データを永続化
    if (this.progressDataStore) {
      await this.progressDataStore.saveProgress('subgoal', subGoalId, roundedProgress);
    }

    return roundedProgress;
  }

  /**
   * 目標の進捗を計算する
   * 8つのサブ目標の平均進捗
   */
  async calculateGoalProgress(goalId: string): Promise<number> {
    const cacheKey = `goal:${goalId}`;
    const cached = this.getCachedValue(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const goal = await this.prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        subGoals: {
          select: { id: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    if (goal.subGoals.length === 0) {
      return 0;
    }

    // 各サブ目標の進捗を計算
    const subGoalProgresses = await Promise.all(
      goal.subGoals.map(subGoal => this.calculateSubGoalProgress(subGoal.id))
    );

    // ProgressValidatorを使用して無効な進捗値をフィルタリング
    const validator = new ProgressValidator();

    // 無効な進捗値がある場合は警告ログを出力
    const invalidProgresses = subGoalProgresses.filter(
      progress => !validator.isValidProgress(progress)
    );
    if (invalidProgresses.length > 0) {
      console.warn(`Invalid progress values detected for goal ${goalId}:`, invalidProgresses);
    }

    // 有効な進捗値のみで平均を計算
    const progress = validator.calculateAverage(subGoalProgresses);
    const roundedProgress = Math.round(progress * 100) / 100; // 小数点以下2桁で丸める

    // 依存関係を正しく設定（目標は全てのサブ目標に依存）
    const dependencies = [goalId, ...goal.subGoals.map(sg => sg.id)];
    this.setCachedValue(cacheKey, roundedProgress, dependencies);

    // 進捗データを永続化
    if (this.progressDataStore) {
      await this.progressDataStore.saveProgress('goal', goalId, roundedProgress);
    }

    return roundedProgress;
  }

  /**
   * タスクから階層的に進捗を再計算する
   * 下位レベルの変更時に上位レベルを自動更新する
   */
  async recalculateFromTask(taskId: string): Promise<ProgressHierarchy> {
    // タスクの情報を取得
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        action: {
          include: {
            tasks: {
              select: { id: true, status: true, type: true, title: true, description: true },
            },
            subGoal: {
              include: {
                actions: {
                  select: { id: true },
                  orderBy: { position: 'asc' },
                },
                goal: {
                  include: {
                    subGoals: {
                      select: { id: true },
                      orderBy: { position: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // 階層的にキャッシュを無効化（下位から上位へ）
    this.invalidateHierarchicalCache('task', taskId);
    this.invalidateHierarchicalCache('action', task.action.id);
    this.invalidateHierarchicalCache('subgoal', task.action.subGoal.id);
    this.invalidateHierarchicalCache('goal', task.action.subGoal.goal.id);

    // 各レベルの進捗を階層的に計算（下位から上位へ）
    const taskProgress = await this.calculateTaskProgress(taskId);
    const actionProgress = await this.calculateActionProgress(task.action.id);
    const subGoalProgress = await this.calculateSubGoalProgress(task.action.subGoal.id);
    const goalProgress = await this.calculateGoalProgress(task.action.subGoal.goal.id);

    // データベースの進捗値を更新
    await this.updateProgressInDatabase(
      task.action.id,
      task.action.subGoal.id,
      task.action.subGoal.goal.id,
      actionProgress,
      subGoalProgress,
      goalProgress
    );

    // 詳細な進捗情報を構築
    const actionProgresses = await this.buildActionProgresses(task.action.subGoal.actions);
    const subGoalProgresses = await this.buildSubGoalProgresses(task.action.subGoal.goal.subGoals);

    return {
      task: {
        id: taskId,
        progress: taskProgress,
        status: task.status,
      },
      action: {
        id: task.action.id,
        progress: actionProgress,
        type: this.determineActionType(task.action.tasks),
        taskCount: task.action.tasks.length,
        completedTaskCount: task.action.tasks.filter(t => t.status === 'COMPLETED').length,
      },
      subGoal: {
        id: task.action.subGoal.id,
        progress: subGoalProgress,
        actionProgresses,
      },
      goal: {
        id: task.action.subGoal.goal.id,
        progress: goalProgress,
        subGoalProgresses,
      },
    };
  }

  /**
   * アクションから階層的に進捗を再計算する
   */
  async recalculateFromAction(actionId: string): Promise<Omit<ProgressHierarchy, 'task'>> {
    const action = await this.prisma.action.findUnique({
      where: { id: actionId },
      include: {
        subGoal: {
          include: {
            actions: {
              select: { id: true },
              orderBy: { position: 'asc' },
            },
            goal: {
              include: {
                subGoals: {
                  select: { id: true },
                  orderBy: { position: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    // キャッシュを無効化
    this.invalidateRelatedCache(action.subGoal.goal.id);

    // 各レベルの進捗を計算
    const actionProgress = await this.calculateActionProgress(actionId);
    const subGoalProgress = await this.calculateSubGoalProgress(action.subGoal.id);
    const goalProgress = await this.calculateGoalProgress(action.subGoal.goal.id);

    // データベースの進捗値を更新
    await this.updateProgressInDatabase(
      actionId,
      action.subGoal.id,
      action.subGoal.goal.id,
      actionProgress,
      subGoalProgress,
      goalProgress
    );

    // 詳細な進捗情報を構築
    const actionProgresses = await this.buildActionProgresses(action.subGoal.actions);
    const subGoalProgresses = await this.buildSubGoalProgresses(action.subGoal.goal.subGoals);

    return {
      action: {
        id: actionId,
        progress: actionProgress,
        type: ActionType.EXECUTION, // デフォルト値
        taskCount: 0,
        completedTaskCount: 0,
      },
      subGoal: {
        id: action.subGoal.id,
        progress: subGoalProgress,
        actionProgresses,
      },
      goal: {
        id: action.subGoal.goal.id,
        progress: goalProgress,
        subGoalProgresses,
      },
    };
  }

  /**
   * サブ目標から階層的に進捗を再計算する
   */
  async recalculateFromSubGoal(
    subGoalId: string
  ): Promise<Omit<ProgressHierarchy, 'task' | 'action'>> {
    const subGoal = await this.prisma.subGoal.findUnique({
      where: { id: subGoalId },
      include: {
        actions: {
          select: { id: true },
          orderBy: { position: 'asc' },
        },
        goal: {
          include: {
            subGoals: {
              select: { id: true },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!subGoal) {
      throw new Error(`SubGoal not found: ${subGoalId}`);
    }

    // キャッシュを無効化
    this.invalidateRelatedCache(subGoal.goal.id);

    // 各レベルの進捗を計算
    const subGoalProgress = await this.calculateSubGoalProgress(subGoalId);
    const goalProgress = await this.calculateGoalProgress(subGoal.goal.id);

    // データベースの進捗値を更新
    await this.prisma.$transaction([
      this.prisma.subGoal.update({
        where: { id: subGoalId },
        data: { progress: Math.round(subGoalProgress) },
      }),
      this.prisma.goal.update({
        where: { id: subGoal.goal.id },
        data: { progress: Math.round(goalProgress) },
      }),
    ]);

    // 詳細な進捗情報を構築
    const actionProgresses = await this.buildActionProgresses(subGoal.actions);
    const subGoalProgresses = await this.buildSubGoalProgresses(subGoal.goal.subGoals);

    return {
      subGoal: {
        id: subGoalId,
        progress: subGoalProgress,
        actionProgresses,
      },
      goal: {
        id: subGoal.goal.id,
        progress: goalProgress,
        subGoalProgresses,
      },
    };
  }

  /**
   * 実行アクションの進捗を計算する
   * 各タスクの進捗を合計して平均を計算する
   */
  private calculateExecutionActionProgress(tasks: Array<{ status: string }>): number {
    if (tasks.length === 0) {
      return 0;
    }

    // 各タスクの進捗を合計
    const totalProgress = tasks.reduce((sum, task) => {
      return sum + this.calculateTaskProgressByStatus(task.status as TaskStatus);
    }, 0);

    // 平均進捗を計算
    return Math.round(totalProgress / tasks.length);
  }

  /**
   * 習慣アクションの進捗を計算する
   * 連続日数ベース、目標期間の80%以上継続で達成（100%）
   */
  private calculateHabitActionProgress(
    tasks: Array<{
      status: string;
      title?: string | null;
      description?: string | null;
      createdAt: Date;
      completedAt?: Date | null;
    }>
  ): number {
    if (tasks.length === 0) {
      return 0;
    }

    // 習慣タスクの継続日数を計算
    const habitTasks = tasks.filter(
      task =>
        task.title?.toLowerCase().includes('習慣') ||
        task.title?.toLowerCase().includes('継続') ||
        task.description?.toLowerCase().includes('習慣') ||
        task.description?.toLowerCase().includes('継続')
    );
    if (habitTasks.length === 0) {
      return this.calculateExecutionActionProgress(tasks);
    }

    // 連続日数を計算
    const continuousDays = this.calculateContinuousDays(habitTasks);

    // 目標期間を30日と仮定（将来的にはアクションに目標期間を持たせる）
    const targetDays = 30;

    // 80%以上継続で100%達成
    const requiredDays = Math.ceil(targetDays * 0.8); // 24日

    if (continuousDays >= requiredDays) {
      return 100;
    }

    // 80%未満の場合は進捗率を計算
    return Math.round((continuousDays / requiredDays) * 100);
  }

  /**
   * 連続日数を計算する
   * 完了日時でソートし、日付の連続性をチェックして最新の連続日数を返す
   */
  private calculateContinuousDays(
    tasks: Array<{
      status: string;
      completedAt?: Date | null;
    }>
  ): number {
    // 完了日時でソート
    const sortedTasks = [...tasks]
      .filter(task => task.completedAt)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateA - dateB;
      });

    if (sortedTasks.length === 0) {
      return 0;
    }

    // 連続日数を計算（最新の連続日数を返す）
    let continuousDays = 1;
    let maxContinuousDays = 1;
    let currentDate = new Date(sortedTasks[0].completedAt!);
    currentDate.setHours(0, 0, 0, 0); // 時刻を0時に正規化

    for (let i = 1; i < sortedTasks.length; i++) {
      const taskDate = new Date(sortedTasks[i].completedAt!);
      taskDate.setHours(0, 0, 0, 0); // 時刻を0時に正規化

      const daysDiff = Math.floor(
        (taskDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        // 連続している
        continuousDays++;
        maxContinuousDays = Math.max(maxContinuousDays, continuousDays);
        currentDate = taskDate;
      } else if (daysDiff > 1) {
        // 連続が途切れた場合、最新の連続日数をリセット
        continuousDays = 1;
        currentDate = taskDate;
      }
      // daysDiff === 0 の場合は同じ日なのでカウントしない
    }

    // 最新の連続日数を返す（最後の連続が最新）
    return continuousDays;
  }

  /**
   * キャッシュから値を取得する
   */
  private getCachedValue(key: string): number | null {
    this.cacheRequests++;

    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.cacheHits++;
      return cached.value;
    }

    // 期限切れのエントリを削除
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * キャッシュに値を設定する
   */
  private setCachedValue(key: string, value: number, dependencies: string[] = []): void {
    // キャッシュサイズ制限をチェック
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestEntries();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      dependencies,
    });
  }

  /**
   * 古いキャッシュエントリを削除する
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // 古い25%のエントリを削除（最低1個は削除）
    const entriesToRemove = Math.max(1, Math.floor(entries.length * 0.25));
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * 依存関係に基づいてキャッシュを無効化する
   */
  private invalidateDependentCache(entityId: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (entry.dependencies.includes(entityId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * エンティティの変更時に依存する上位レベルのキャッシュを無効化する
   */
  private invalidateHierarchicalCache(entityType: string, entityId: string): void {
    // 下位レベルの変更時に上位レベルのキャッシュを無効化
    switch (entityType) {
      case 'task':
        // タスクが変更された場合、そのアクション、サブ目標、目標のキャッシュを無効化
        this.invalidateDependentCache(entityId);
        break;
      case 'action':
        // アクションが変更された場合、そのサブ目標、目標のキャッシュを無効化
        this.invalidateDependentCache(entityId);
        break;
      case 'subgoal':
        // サブ目標が変更された場合、その目標のキャッシュを無効化
        this.invalidateDependentCache(entityId);
        break;
      case 'goal':
        // 目標が変更された場合、そのキャッシュのみ無効化
        this.cache.delete(`goal:${entityId}`);
        break;
    }
  }

  /**
   * キャッシュ統計を取得する
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: Date | null;
    totalRequests: number;
    totalHits: number;
  } {
    let oldestTimestamp = Date.now();
    let hasEntries = false;

    for (const [, entry] of this.cache) {
      hasEntries = true;
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }

    const hitRate = this.cacheRequests > 0 ? (this.cacheHits / this.cacheRequests) * 100 : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100, // 小数点以下2桁
      oldestEntry: hasEntries ? new Date(oldestTimestamp) : null,
      totalRequests: this.cacheRequests,
      totalHits: this.cacheHits,
    };
  }

  /**
   * キャッシュをクリアする
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }

  /**
   * キャッシュ統計をリセットする
   */
  public resetCacheStats(): void {
    this.cacheHits = 0;
    this.cacheRequests = 0;
  }

  /**
   * 関連するキャッシュを無効化する
   */
  private invalidateCache(
    taskId: string,
    actionId: string,
    subGoalId: string,
    goalId: string
  ): void {
    this.cache.delete(`task:${taskId}`);
    this.cache.delete(`action:${actionId}`);
    this.cache.delete(`subgoal:${subGoalId}`);
    this.cache.delete(`goal:${goalId}`);
  }

  /**
   * 目標に関連する全てのキャッシュを無効化する
   */
  private invalidateRelatedCache(goalId: string): void {
    // 目標に関連する全てのキャッシュエントリを削除
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (
        key.includes(goalId) ||
        key.startsWith('goal:') ||
        key.startsWith('subgoal:') ||
        key.startsWith('action:') ||
        key.startsWith('task:')
      ) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * アクションの種類を判定する
   */
  private determineActionType(
    tasks: Array<{ title?: string | null; description?: string | null }>
  ): ActionType {
    const hasHabitTasks = tasks.some(
      task =>
        task.title?.toLowerCase().includes('習慣') ||
        task.title?.toLowerCase().includes('継続') ||
        task.description?.toLowerCase().includes('習慣') ||
        task.description?.toLowerCase().includes('継続')
    );
    return hasHabitTasks ? ActionType.HABIT : ActionType.EXECUTION;
  }

  /**
   * アクション進捗の詳細情報を構築する
   */
  private async buildActionProgresses(actions: { id: string }[]): Promise<ActionProgress[]> {
    return Promise.all(
      actions.map(async action => {
        const progress = await this.calculateActionProgress(action.id);

        // アクションの詳細情報を取得
        const actionDetail = await this.prisma.action.findUnique({
          where: { id: action.id },
          include: {
            tasks: {
              select: { status: true, type: true, title: true, description: true },
            },
          },
        });

        const taskCount = actionDetail?.tasks.length || 0;
        const completedTaskCount =
          actionDetail?.tasks.filter(t => t.status === 'COMPLETED').length || 0;
        const actionType = this.determineActionType(actionDetail?.tasks || []);

        return {
          id: action.id,
          progress,
          type: actionType,
          taskCount,
          completedTaskCount,
        };
      })
    );
  }

  /**
   * サブ目標進捗の詳細情報を構築する
   */
  private async buildSubGoalProgresses(subGoals: { id: string }[]): Promise<SubGoalProgress[]> {
    return Promise.all(
      subGoals.map(async subGoal => {
        const progress = await this.calculateSubGoalProgress(subGoal.id);

        // サブ目標のアクション情報を取得
        const subGoalDetail = await this.prisma.subGoal.findUnique({
          where: { id: subGoal.id },
          include: {
            actions: {
              select: { id: true },
              orderBy: { position: 'asc' },
            },
          },
        });

        const actionProgresses = await this.buildActionProgresses(subGoalDetail?.actions || []);

        return {
          id: subGoal.id,
          progress,
          actionProgresses,
        };
      })
    );
  }

  /**
   * データベースの進捗値を更新する
   */
  private async updateProgressInDatabase(
    actionId: string,
    subGoalId: string,
    goalId: string,
    actionProgress: number,
    subGoalProgress: number,
    goalProgress: number
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.action.update({
        where: { id: actionId },
        data: { progress: Math.round(actionProgress) },
      }),
      this.prisma.subGoal.update({
        where: { id: subGoalId },
        data: { progress: Math.round(subGoalProgress) },
      }),
      this.prisma.goal.update({
        where: { id: goalId },
        data: { progress: Math.round(goalProgress) },
      }),
    ]);
  }

  /**
   * タスクの状態変更時に自動的に上位レベルの進捗を更新する
   */
  public async onTaskStatusChanged(taskId: string): Promise<void> {
    if (!this.autoUpdateEnabled) {
      return;
    }

    try {
      await this.recalculateFromTask(taskId);
    } catch (error) {
      console.error(`Failed to auto-update progress for task ${taskId}:`, error);
      // エラーが発生しても処理を継続する（ログのみ出力）
    }
  }

  /**
   * アクションの変更時に自動的に上位レベルの進捗を更新する
   */
  public async onActionChanged(actionId: string): Promise<void> {
    if (!this.autoUpdateEnabled) {
      return;
    }

    try {
      await this.recalculateFromAction(actionId);
    } catch (error) {
      console.error(`Failed to auto-update progress for action ${actionId}:`, error);
    }
  }

  /**
   * サブ目標の変更時に自動的に上位レベルの進捗を更新する
   */
  public async onSubGoalChanged(subGoalId: string): Promise<void> {
    if (!this.autoUpdateEnabled) {
      return;
    }

    try {
      await this.recalculateFromSubGoal(subGoalId);
    } catch (error) {
      console.error(`Failed to auto-update progress for subgoal ${subGoalId}:`, error);
    }
  }

  /**
   * データ整合性を検証する
   */
  public async validateDataIntegrity(
    goalId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // 目標の基本情報を取得
      const goal = await this.prisma.goal.findUnique({
        where: { id: goalId },
        include: {
          subGoals: {
            include: {
              actions: {
                include: {
                  tasks: true,
                },
              },
            },
          },
        },
      });

      if (!goal) {
        errors.push(`Goal not found: ${goalId}`);
        return { isValid: false, errors };
      }

      // サブ目標数の検証（8個であることを確認）
      if (goal.subGoals.length !== 8) {
        errors.push(`Goal ${goalId} should have 8 sub-goals, but has ${goal.subGoals.length}`);
      }

      // 各サブ目標のアクション数の検証（8個であることを確認）
      for (const subGoal of goal.subGoals) {
        if (subGoal.actions.length !== 8) {
          errors.push(
            `SubGoal ${subGoal.id} should have 8 actions, but has ${subGoal.actions.length}`
          );
        }

        // アクションの進捗計算の整合性を検証
        for (const action of subGoal.actions) {
          const calculatedProgress = await this.calculateActionProgress(action.id);
          const storedProgress = action.progress;

          if (Math.abs(calculatedProgress - storedProgress) > 1) {
            // 1%の誤差を許容
            errors.push(
              `Action ${action.id} progress mismatch: calculated=${calculatedProgress}, stored=${storedProgress}`
            );
          }
        }

        // サブ目標の進捗計算の整合性を検証
        const calculatedSubGoalProgress = await this.calculateSubGoalProgress(subGoal.id);
        const storedSubGoalProgress = subGoal.progress;

        if (Math.abs(calculatedSubGoalProgress - storedSubGoalProgress) > 1) {
          errors.push(
            `SubGoal ${subGoal.id} progress mismatch: calculated=${calculatedSubGoalProgress}, stored=${storedSubGoalProgress}`
          );
        }
      }

      // 目標の進捗計算の整合性を検証
      const calculatedGoalProgress = await this.calculateGoalProgress(goalId);
      const storedGoalProgress = goal.progress;

      if (Math.abs(calculatedGoalProgress - storedGoalProgress) > 1) {
        errors.push(
          `Goal ${goalId} progress mismatch: calculated=${calculatedGoalProgress}, stored=${storedGoalProgress}`
        );
      }
    } catch (error) {
      errors.push(
        `Error during integrity validation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * データ整合性の問題を修復する
   */
  public async repairDataIntegrity(
    goalId: string
  ): Promise<{ repaired: boolean; repairedItems: string[] }> {
    const repairedItems: string[] = [];

    try {
      // まず整合性を検証
      const validation = await this.validateDataIntegrity(goalId);

      if (validation.isValid) {
        return { repaired: true, repairedItems: [] };
      }

      // キャッシュをクリアして再計算
      this.clearCache();

      // 目標から階層的に進捗を再計算
      const goal = await this.prisma.goal.findUnique({
        where: { id: goalId },
        include: {
          subGoals: {
            include: {
              actions: {
                include: {
                  tasks: true,
                },
              },
            },
          },
        },
      });

      if (!goal) {
        throw new Error(`Goal not found: ${goalId}`);
      }

      // 各レベルの進捗を再計算して更新
      for (const subGoal of goal.subGoals) {
        for (const action of subGoal.actions) {
          const correctProgress = await this.calculateActionProgress(action.id);
          if (Math.abs(correctProgress - action.progress) > 1) {
            await this.prisma.action.update({
              where: { id: action.id },
              data: { progress: Math.round(correctProgress) },
            });
            repairedItems.push(
              `Action ${action.id} progress updated to ${Math.round(correctProgress)}%`
            );
          }
        }

        const correctSubGoalProgress = await this.calculateSubGoalProgress(subGoal.id);
        if (Math.abs(correctSubGoalProgress - subGoal.progress) > 1) {
          await this.prisma.subGoal.update({
            where: { id: subGoal.id },
            data: { progress: Math.round(correctSubGoalProgress) },
          });
          repairedItems.push(
            `SubGoal ${subGoal.id} progress updated to ${Math.round(correctSubGoalProgress)}%`
          );
        }
      }

      const correctGoalProgress = await this.calculateGoalProgress(goalId);
      if (Math.abs(correctGoalProgress - goal.progress) > 1) {
        await this.prisma.goal.update({
          where: { id: goalId },
          data: { progress: Math.round(correctGoalProgress) },
        });
        repairedItems.push(
          `Goal ${goalId} progress updated to ${Math.round(correctGoalProgress)}%`
        );
      }

      return { repaired: true, repairedItems };
    } catch (error) {
      console.error(`Error during data integrity repair for goal ${goalId}:`, error);
      return { repaired: false, repairedItems };
    }
  }

  /**
   * 進捗データの一括更新（バッチ処理用）
   */
  public async batchUpdateProgress(
    goalIds: string[]
  ): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];

    for (const goalId of goalIds) {
      try {
        const repair = await this.repairDataIntegrity(goalId);
        if (repair.repaired) {
          updated++;
        } else {
          errors.push(`Failed to update progress for goal ${goalId}`);
        }
      } catch (error) {
        errors.push(
          `Error updating goal ${goalId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return { updated, errors };
  }
}
