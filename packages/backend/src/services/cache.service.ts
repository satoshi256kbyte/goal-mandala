/**
 * キャッシュサービス
 * タスク一覧、進捗計算結果、保存済みビューのキャッシュを管理
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * キャッシュにデータを保存
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
    };
    this.cache.set(key, entry);
  }

  /**
   * キャッシュからデータを取得
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * キャッシュからデータを削除
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * パターンに一致するキーのキャッシュを削除
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 期限切れのキャッシュエントリを削除
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 全キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }

  // タスク関連のキャッシュキー生成
  static getTaskListKey(userId: string, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `tasks:${userId}:${filterStr}`;
  }

  static getTaskDetailKey(taskId: string): string {
    return `task:${taskId}`;
  }

  static getProgressKey(entityType: string, entityId: string): string {
    return `progress:${entityType}:${entityId}`;
  }

  static getSavedViewsKey(userId: string): string {
    return `saved-views:${userId}`;
  }

  // キャッシュ無効化パターン
  static getUserTasksPattern(userId: string): string {
    return `tasks:${userId}:.*`;
  }

  static getProgressPattern(entityId: string): string {
    return `progress:.*:${entityId}`;
  }
}

/**
 * キャッシュ付きタスクサービス
 */
import { TaskService, TaskFilters } from './task.service';
import { Task, TaskStatus } from '../generated/prisma-client';

export class CachedTaskService extends TaskService {
  private cacheService: CacheService;

  constructor(prisma: any, cacheService?: CacheService) {
    super(prisma);
    this.cacheService = cacheService || new CacheService();
  }

  /**
   * キャッシュ付きタスク一覧取得
   */
  async getTasks(userId: string, filters?: TaskFilters): Promise<Task[]> {
    const cacheKey = CacheService.getTaskListKey(userId, filters);

    // キャッシュから取得を試行
    const cached = this.cacheService.get<Task[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // キャッシュにない場合はDBから取得
    const tasks = await super.getTasks(userId, filters);

    // キャッシュに保存（5分間）
    this.cacheService.set(cacheKey, tasks, 5 * 60 * 1000);

    return tasks;
  }

  /**
   * キャッシュ付きタスク詳細取得
   */
  async getTaskById(taskId: string): Promise<Task | null> {
    const cacheKey = CacheService.getTaskDetailKey(taskId);

    // キャッシュから取得を試行
    const cached = this.cacheService.get<Task>(cacheKey);
    if (cached) {
      return cached;
    }

    // キャッシュにない場合はDBから取得
    const task = await super.getTaskById(taskId);

    if (task) {
      // キャッシュに保存（5分間）
      this.cacheService.set(cacheKey, task, 5 * 60 * 1000);
    }

    return task;
  }

  /**
   * タスク状態更新（キャッシュ無効化付き）
   */
  async updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<Task> {
    const task = await super.updateTaskStatus(taskId, status, userId);

    // 関連キャッシュを無効化
    this.invalidateTaskCaches(userId, taskId);

    return task;
  }

  /**
   * 一括状態更新（キャッシュ無効化付き）
   */
  async bulkUpdateStatus(taskIds: string[], status: TaskStatus, userId: string): Promise<void> {
    await super.bulkUpdateStatus(taskIds, status, userId);

    // 関連キャッシュを無効化
    this.invalidateTaskCaches(userId);
    taskIds.forEach(taskId => {
      this.cacheService.delete(CacheService.getTaskDetailKey(taskId));
    });
  }

  /**
   * タスク関連キャッシュの無効化
   */
  private invalidateTaskCaches(userId: string, taskId?: string): void {
    // ユーザーのタスク一覧キャッシュを無効化
    this.cacheService.deletePattern(CacheService.getUserTasksPattern(userId));

    // 特定のタスク詳細キャッシュを無効化
    if (taskId) {
      this.cacheService.delete(CacheService.getTaskDetailKey(taskId));
    }
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * キャッシュクリーンアップ
   */
  cleanupCache(): void {
    this.cacheService.cleanup();
  }
}

/**
 * キャッシュ付き進捗サービス
 */
import { ProgressService } from './progress.service';

export class CachedProgressService extends ProgressService {
  private cacheService: CacheService;

  constructor(prisma: any, cacheService?: CacheService) {
    super(prisma);
    this.cacheService = cacheService || new CacheService();
  }

  /**
   * キャッシュ付き進捗計算
   */
  async calculateActionProgress(actionId: string): Promise<number> {
    const cacheKey = CacheService.getProgressKey('action', actionId);

    // キャッシュから取得を試行
    const cached = this.cacheService.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // キャッシュにない場合は計算
    const progress = await super.calculateActionProgress(actionId);

    // キャッシュに保存（1分間）
    this.cacheService.set(cacheKey, progress, 1 * 60 * 1000);

    return progress;
  }

  /**
   * 進捗更新（キャッシュ無効化付き）
   */
  async updateProgress(taskId: string): Promise<void> {
    await super.updateProgress(taskId);

    // 関連する進捗キャッシュを無効化
    // タスクから上位エンティティの進捗キャッシュを無効化する必要がある
    // 実装では、タスクのactionId、subGoalId、goalIdを取得して無効化
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        action: {
          include: {
            subGoal: {
              include: {
                goal: true,
              },
            },
          },
        },
      },
    });

    if (task) {
      this.cacheService.delete(CacheService.getProgressKey('action', task.actionId));
      this.cacheService.delete(CacheService.getProgressKey('subgoal', task.action.subGoalId));
      this.cacheService.delete(CacheService.getProgressKey('goal', task.action.subGoal.goalId));
    }
  }
}
