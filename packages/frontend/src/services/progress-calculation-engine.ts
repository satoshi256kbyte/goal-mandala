import {
  ProgressCalculationEngine,
  ProgressHierarchy,
  TaskProgress,
  ActionProgress,
  SubGoalProgress,
  TaskStatus,
  ProgressCache,
} from '../types/progress';
import { ActionType } from '../types/mandala';
import { progressErrorHandler } from './progress-error-handler';
import { progressDataValidator, ValidationResult } from './progress-data-validator';
import { progressSecurityManager } from './progress-security-manager';

/**
 * 進捗計算エンジン
 * 階層的な進捗計算（タスク→アクション→サブ目標→目標）を実行する
 */
export class ProgressCalculationEngineImpl implements ProgressCalculationEngine {
  private cache: Map<string, ProgressCache> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5分

  /**
   * タスクの進捗を計算する
   * タスクは完了/未完了の2値なので、完了していれば100%、そうでなければ0%
   */
  async calculateTaskProgress(taskId: string): Promise<number> {
    return this.executeWithErrorHandling(
      async () => {
        const cacheKey = `task:${taskId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // 入力検証
        if (!taskId || typeof taskId !== 'string') {
          throw new Error('Invalid task ID provided');
        }

        // 実際の実装では、APIからタスクデータを取得する
        // ここではモックデータを使用
        const taskData = await this.fetchTaskData(taskId);

        if (!taskData) {
          throw new Error(`Task not found: ${taskId}`);
        }

        const progress = (taskData as any).status === TaskStatus.COMPLETED ? 100 : 0;

        this.setCache(cacheKey, progress, []);
        return progress;
      },
      taskId,
      'task'
    );
  }

  /**
   * アクションの進捗を計算する
   * 実行アクション: 完了タスク数/総タスク数 * 100
   * 習慣アクション: 継続日数ベース（80%継続で達成）
   */
  async calculateActionProgress(actionId: string): Promise<number> {
    return this.executeWithErrorHandling(
      async () => {
        const cacheKey = `action:${actionId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // 入力検証
        if (!actionId || typeof actionId !== 'string') {
          throw new Error('Invalid action ID provided');
        }

        const actionData = await this.fetchActionData(actionId);
        const tasks = await this.fetchTasksByActionId(actionId);

        if (!actionData) {
          throw new Error(`Action not found: ${actionId}`);
        }

        // データ整合性チェック
        if (!Array.isArray(tasks)) {
          throw new Error(`Invalid tasks data for action: ${actionId}`);
        }

        let progress: number;

        if ((actionData as any).type === ActionType.EXECUTION) {
          // 実行アクション: 完了タスク数/総タスク数
          progress = this.calculateExecutionActionProgress(tasks);
        } else {
          // 習慣アクション: 継続日数ベース
          progress = this.calculateHabitActionProgress(tasks, (actionData as any).targetDays || 30);
        }

        // 進捗値の妥当性チェック
        if (isNaN(progress) || progress < 0 || progress > 100) {
          throw new Error(`Invalid progress value calculated: ${progress} for action: ${actionId}`);
        }

        const taskIds = tasks.map(task => task.id);
        const dependencies = taskIds.map(id => `task:${id}`);
        this.setCache(cacheKey, progress, dependencies);

        return progress;
      },
      actionId,
      'action'
    );
  }

  /**
   * サブ目標の進捗を計算する
   * 8つのアクションの平均進捗率
   */
  async calculateSubGoalProgress(subGoalId: string): Promise<number> {
    return this.executeWithErrorHandling(
      async () => {
        const cacheKey = `subgoal:${subGoalId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // 入力検証
        if (!subGoalId || typeof subGoalId !== 'string') {
          throw new Error('Invalid subgoal ID provided');
        }

        const actions = await this.fetchActionsBySubGoalId(subGoalId);

        if (!Array.isArray(actions)) {
          throw new Error(`Invalid actions data for subgoal: ${subGoalId}`);
        }

        if (actions.length === 0) {
          return 0;
        }

        // マンダラチャートでは8つのアクションが必要
        if (actions.length !== 8) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(
              `Expected 8 actions for subgoal ${subGoalId}, but found ${actions.length}`
            );
          }
        }

        const actionProgresses = await Promise.all(
          actions.map(action => this.calculateActionProgress(action.id))
        );

        // 無効な進捗値をフィルタリング
        const validProgresses = actionProgresses.filter(
          progress => !isNaN(progress) && progress >= -2 && progress <= 100
        );

        if (validProgresses.length === 0) {
          throw new Error(`No valid action progress values for subgoal: ${subGoalId}`);
        }

        const progress = this.calculateAverageProgress(validProgresses);

        const dependencies = actions.map(action => `action:${action.id}`);
        this.setCache(cacheKey, progress, dependencies);

        return progress;
      },
      subGoalId,
      'subgoal'
    );
  }

  /**
   * 目標の進捗を計算する
   * 8つのサブ目標の平均進捗率
   */
  async calculateGoalProgress(goalId: string): Promise<number> {
    return this.executeWithErrorHandling(
      async () => {
        const cacheKey = `goal:${goalId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached !== null) {
          return cached;
        }

        // 入力検証
        if (!goalId || typeof goalId !== 'string') {
          throw new Error('Invalid goal ID provided');
        }

        const subGoals = await this.fetchSubGoalsByGoalId(goalId);

        if (!Array.isArray(subGoals)) {
          throw new Error(`Invalid subgoals data for goal: ${goalId}`);
        }

        if (subGoals.length === 0) {
          return 0;
        }

        // マンダラチャートでは8つのサブ目標が必要
        if (subGoals.length !== 8) {
          if (process.env.NODE_ENV !== 'test') {
            console.warn(`Expected 8 subgoals for goal ${goalId}, but found ${subGoals.length}`);
          }
        }

        const subGoalProgresses = await Promise.all(
          subGoals.map(subGoal => this.calculateSubGoalProgress(subGoal.id))
        );

        // 無効な進捗値をフィルタリング
        const validProgresses = subGoalProgresses.filter(
          progress => !isNaN(progress) && progress >= -2 && progress <= 100
        );

        if (validProgresses.length === 0) {
          throw new Error(`No valid subgoal progress values for goal: ${goalId}`);
        }

        const progress = this.calculateAverageProgress(validProgresses);

        const dependencies = subGoals.map(subGoal => `subgoal:${subGoal.id}`);
        this.setCache(cacheKey, progress, dependencies);

        return progress;
      },
      goalId,
      'goal'
    );
  }

  /**
   * タスクから上位階層まで全ての進捗を再計算する
   */
  async recalculateFromTask(taskId: string): Promise<ProgressHierarchy> {
    // キャッシュをクリアして強制再計算
    this.clearRelatedCache(taskId);

    const taskData = await this.fetchTaskData(taskId);
    const actionData = await this.fetchActionData((taskData as any).actionId);
    const subGoalData = await this.fetchSubGoalData((actionData as any).subGoalId);
    const goalData = await this.fetchGoalData((subGoalData as any).goalId);

    const [taskProgress, actionProgress, subGoalProgress, goalProgress] = await Promise.all([
      this.calculateTaskProgress(taskId),
      this.calculateActionProgress((actionData as any).id),
      this.calculateSubGoalProgress((subGoalData as any).id),
      this.calculateGoalProgress((goalData as any).id),
    ]);

    return {
      task: {
        id: taskId,
        progress: taskProgress,
        status: (taskData as any).status,
        completedAt: (taskData as any).completedAt,
      },
      action: {
        id: (actionData as any).id,
        progress: actionProgress,
        type: (actionData as any).type,
        tasks: await this.fetchTasksByActionId((actionData as any).id),
      },
      subGoal: {
        id: (subGoalData as any).id,
        progress: subGoalProgress,
        actions: await this.fetchActionsBySubGoalId((subGoalData as any).id),
      },
      goal: {
        id: (goalData as any).id,
        progress: goalProgress,
        subGoals: await this.fetchSubGoalsByGoalId((goalData as any).id),
      },
    };
  }

  /**
   * 実行アクションの進捗を計算する
   * 完了タスク数 / 総タスク数 * 100
   */
  private calculateExecutionActionProgress(tasks: TaskProgress[]): number {
    if (tasks.length === 0) {
      return 0;
    }

    const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    return Math.round((completedTasks / tasks.length) * 100);
  }

  /**
   * 習慣アクションの進捗を計算する
   * 継続日数ベース（80%継続で達成）
   */
  private calculateHabitActionProgress(tasks: TaskProgress[], targetDays: number): number {
    if (tasks.length === 0) {
      return 0;
    }

    // 習慣アクションの場合、継続日数を計算
    const continuousDays = this.calculateContinuousDays(tasks);
    const requiredDays = Math.ceil(targetDays * 0.8); // 80%継続で達成

    return Math.min(Math.round((continuousDays / requiredDays) * 100), 100);
  }

  /**
   * 継続日数を計算する
   */
  private calculateContinuousDays(tasks: TaskProgress[]): number {
    // 完了したタスクの日数をカウント
    // 実際の実装では、タスクの完了日時から継続日数を計算する
    const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED);
    return completedTasks.length;
  }

  /**
   * 平均進捗率を計算する
   */
  private calculateAverageProgress(progresses: number[]): number {
    if (progresses.length === 0) {
      return 0;
    }

    const sum = progresses.reduce((acc, progress) => acc + progress, 0);
    return Math.round(sum / progresses.length);
  }

  /**
   * キャッシュから値を取得する
   */
  private getFromCache(key: string): number | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (new Date() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * キャッシュに値を設定する
   */
  private setCache(key: string, data: number, dependencies: string[]): void {
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION_MS);
    this.cache.set(key, {
      key,
      data,
      expiresAt,
      dependencies,
    });
  }

  /**
   * 関連するキャッシュをクリアする
   */
  private clearRelatedCache(taskId: string): void {
    // タスクに関連するキャッシュをクリア
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (cached.dependencies.includes(`task:${taskId}`) || key === `task:${taskId}`) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // モックデータ取得メソッド（実際の実装ではAPIクライアントを使用）
  private async fetchTaskData(taskId: string): Promise<unknown> {
    // セキュリティチェック
    const accessCheck = progressSecurityManager.checkDataAccess('task', taskId, 'user-1', 'read');
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason || 'Access denied');
    }

    // 実際の実装では、APIからタスクデータを取得
    const taskData = {
      id: taskId,
      actionId: 'action-1',
      status: TaskStatus.PENDING,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // データ整合性チェック
    const integrityCheck = progressSecurityManager.checkDataIntegrity(taskData);
    if (!integrityCheck.isValid) {
      throw new Error(`Data integrity check failed: ${integrityCheck.errors.join(', ')}`);
    }

    return taskData;
  }

  private async fetchActionData(actionId: string): Promise<unknown> {
    // セキュリティチェック
    const accessCheck = progressSecurityManager.checkDataAccess(
      'action',
      actionId,
      'user-1',
      'read'
    );
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason || 'Access denied');
    }

    // 実際の実装では、APIからアクションデータを取得
    const actionData = {
      id: actionId,
      subGoalId: 'subgoal-1',
      type: ActionType.EXECUTION,
      targetDays: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // データ整合性チェック
    const integrityCheck = progressSecurityManager.checkDataIntegrity(actionData);
    if (!integrityCheck.isValid) {
      throw new Error(`Data integrity check failed: ${integrityCheck.errors.join(', ')}`);
    }

    return actionData;
  }

  private async fetchSubGoalData(subGoalId: string): Promise<unknown> {
    // セキュリティチェック
    const accessCheck = progressSecurityManager.checkDataAccess(
      'subgoal',
      subGoalId,
      'user-1',
      'read'
    );
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason || 'Access denied');
    }

    // 実際の実装では、APIからサブ目標データを取得
    const subGoalData = {
      id: subGoalId,
      goalId: 'goal-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // データ整合性チェック
    const integrityCheck = progressSecurityManager.checkDataIntegrity(subGoalData);
    if (!integrityCheck.isValid) {
      throw new Error(`Data integrity check failed: ${integrityCheck.errors.join(', ')}`);
    }

    return subGoalData;
  }

  private async fetchGoalData(goalId: string): Promise<unknown> {
    // セキュリティチェック
    const accessCheck = progressSecurityManager.checkDataAccess('goal', goalId, 'user-1', 'read');
    if (!accessCheck.allowed) {
      throw new Error(accessCheck.reason || 'Access denied');
    }

    // 実際の実装では、APIから目標データを取得
    const goalData = {
      id: goalId,
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // データ整合性チェック
    const integrityCheck = progressSecurityManager.checkDataIntegrity(goalData);
    if (!integrityCheck.isValid) {
      throw new Error(`Data integrity check failed: ${integrityCheck.errors.join(', ')}`);
    }

    return goalData;
  }

  private async fetchTasksByActionId(_actionId: string): Promise<TaskProgress[]> {
    // 実際の実装では、APIからタスクリストを取得
    return [
      {
        id: 'task-1',
        progress: 0,
        status: TaskStatus.PENDING,
      },
      {
        id: 'task-2',
        progress: 100,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
    ];
  }

  private async fetchActionsBySubGoalId(_subGoalId: string): Promise<ActionProgress[]> {
    // 実際の実装では、APIからアクションリストを取得
    return [
      {
        id: 'action-1',
        progress: 50,
        type: ActionType.EXECUTION,
        tasks: [],
      },
    ];
  }

  private async fetchSubGoalsByGoalId(_goalId: string): Promise<SubGoalProgress[]> {
    // 実際の実装では、APIからサブ目標リストを取得
    return [
      {
        id: 'subgoal-1',
        progress: 25,
        actions: [],
      },
    ];
  }

  /**
   * エラーハンドリング付きで処理を実行する
   * 要件5.1, 5.3: エラー時のフォールバック値を0%に統一
   */
  private async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    entityId?: string,
    entityType?: 'task' | 'action' | 'subgoal' | 'goal'
  ): Promise<T> {
    try {
      // タイムアウト設定（30秒）
      // 要件5.5: タイムアウトが発生したとき、計算を中断し、タイムアウトエラーを返す
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Calculation timeout'));
        }, 30000);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (error) {
      // エラーハンドラーで処理
      // 要件5.1: エラーログを記録し、適切なエラーメッセージを返す
      if (process.env.NODE_ENV !== 'test') {
        console.error(`Error calculating progress for ${entityType} ${entityId}:`, error);
      }

      // 循環依存エラーの場合は例外をスロー
      // 要件5.4: 循環参照が検出されたとき、エラーを返し、計算を中断する
      if (error instanceof Error && error.message.includes('Circular dependency')) {
        throw error;
      }

      // エラー時は0%を返す（安全側に倒す）
      // 要件5.3: 計算中に予期しないエラーが発生したとき、エラーをキャッチし、デフォルト値（0%）を返す
      const defaultValue = progressErrorHandler.getDefaultProgressValue(entityType);
      return defaultValue as T;
    }
  }

  /**
   * 循環依存をチェックする
   */
  private checkCircularDependency(entityId: string, visitedIds: Set<string>): void {
    if (visitedIds.has(entityId)) {
      throw new Error(`Circular dependency detected: ${entityId}`);
    }
  }

  /**
   * データ整合性を検証する
   */
  private validateDataIntegrity(data: any, entityType: string, entityId: string): void {
    if (!data) {
      throw new Error(`${entityType} data is null or undefined: ${entityId}`);
    }

    if (typeof data !== 'object') {
      throw new Error(`${entityType} data is not an object: ${entityId}`);
    }

    if (!data.id) {
      throw new Error(`${entityType} data missing ID: ${entityId}`);
    }
  }

  /**
   * キャッシュエラーを処理する
   */
  private handleCacheError(error: Error, key: string): void {
    console.warn(`Cache error for key ${key}:`, error);
    // キャッシュエラーは致命的ではないので、キャッシュをクリアして続行
    this.cache.delete(key);
  }

  /**
   * 進捗値の妥当性を検証する
   */
  private validateProgressValue(progress: number, entityId: string): number {
    const validation = progressDataValidator.validateProgressValue(progress, 'entity', entityId);

    if (!validation.isValid) {
      throw new Error(`Progress validation failed: ${validation.errors.join(', ')}`);
    }

    // 警告がある場合はログに記録
    if (validation.warnings.length > 0) {
      console.warn(`Progress validation warnings for ${entityId}:`, validation.warnings);
    }

    if (isNaN(progress)) {
      throw new Error(`Progress value is NaN for entity: ${entityId}`);
    }

    if (progress < -2) {
      console.warn(`Progress value ${progress} is below minimum (-2) for entity: ${entityId}`);
      return -2; // エラー状態の最小値
    }

    if (progress > 100) {
      console.warn(`Progress value ${progress} exceeds maximum (100) for entity: ${entityId}`);
      return 100; // 最大値に制限
    }

    return progress;
  }

  /**
   * データの整合性を検証する
   */
  private validateDataConsistency(data: any, entityType: string): ValidationResult {
    switch (entityType) {
      case 'task':
        return progressDataValidator.validateTask(data);
      case 'action':
        return progressDataValidator.validateAction(data);
      case 'subgoal':
        return progressDataValidator.validateSubGoal(data);
      case 'goal':
        return progressDataValidator.validateGoal(data);
      default:
        return {
          isValid: false,
          errors: [`Unknown entity type: ${entityType}`],
          warnings: [],
        };
    }
  }

  /**
   * セキュリティチェックを実行する
   */
  private performSecurityCheck(
    entityType: 'task' | 'action' | 'subgoal' | 'goal',
    entityId: string,
    ownerId: string,
    action: 'read' | 'write' = 'read'
  ): void {
    const accessCheck = progressSecurityManager.checkDataAccess(
      entityType,
      entityId,
      ownerId,
      action
    );
    if (!accessCheck.allowed) {
      const error = new Error(accessCheck.reason || 'Access denied');
      if ((accessCheck as any).errorCode) {
        (error as any).code = (accessCheck as any).errorCode;
      }
      throw error;
    }
  }

  /**
   * データの改ざんチェックを実行する
   */
  private checkDataTampering(data: any, expectedChecksum?: string): void {
    const integrityCheck = progressSecurityManager.checkDataIntegrity(data, expectedChecksum);
    if (!integrityCheck.isValid) {
      throw new Error(`Data integrity check failed: ${integrityCheck.errors.join(', ')}`);
    }

    // 疑わしいフィールドがある場合は警告
    if (integrityCheck.suspiciousFields.length > 0) {
      console.warn(`Suspicious fields detected:`, integrityCheck.suspiciousFields);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const progressCalculationEngine = new ProgressCalculationEngineImpl();
