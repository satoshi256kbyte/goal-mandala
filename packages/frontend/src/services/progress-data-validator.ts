/**
 * 進捗データの整合性検証サービス
 * 要件: 全要件 - データ整合性とセキュリティ
 */

import { TaskStatus } from '../types/progress';
import { ActionType } from '../types/mandala';

/**
 * データ検証結果
 */
export interface ValidationResult {
  /** 検証が成功したかどうか */
  isValid: boolean;
  /** エラーメッセージ */
  errors: string[];
  /** 警告メッセージ */
  warnings: string[];
  /** 修正された値（自動修正が可能な場合） */
  correctedValue?: any;
}

/**
 * タスクデータの検証
 */
export interface TaskValidationData {
  id: string;
  actionId: string;
  title: string;
  status: TaskStatus;
  estimatedMinutes?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * アクションデータの検証
 */
export interface ActionValidationData {
  id: string;
  subGoalId: string;
  title: string;
  type: ActionType;
  position: number;
  progress: number;
  tasks: TaskValidationData[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * サブ目標データの検証
 */
export interface SubGoalValidationData {
  id: string;
  goalId: string;
  title: string;
  position: number;
  progress: number;
  actions: ActionValidationData[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 目標データの検証
 */
export interface GoalValidationData {
  id: string;
  userId: string;
  title: string;
  deadline: Date;
  progress: number;
  subGoals: SubGoalValidationData[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 進捗データ検証クラス
 */
export class ProgressDataValidator {
  /**
   * タスクデータを検証する
   */
  validateTask(task: TaskValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールドの検証
    if (!task.id || typeof task.id !== 'string') {
      errors.push('Task ID is required and must be a string');
    }

    if (!task.actionId || typeof task.actionId !== 'string') {
      errors.push('Action ID is required and must be a string');
    }

    if (!task.title || typeof task.title !== 'string') {
      errors.push('Task title is required and must be a string');
    } else if (task.title.length > 200) {
      errors.push('Task title must be 200 characters or less');
    }

    // ステータスの検証
    if (!Object.values(TaskStatus).includes(task.status)) {
      errors.push(`Invalid task status: ${task.status}`);
    }

    // 推定時間の検証
    if (task.estimatedMinutes !== undefined) {
      if (typeof task.estimatedMinutes !== 'number' || task.estimatedMinutes <= 0) {
        errors.push('Estimated minutes must be a positive number');
      } else if (task.estimatedMinutes > 480) {
        // 8時間以上
        warnings.push('Estimated minutes is unusually high (over 8 hours)');
      }
    }

    // 完了日時の検証
    if (task.completedAt) {
      if (!(task.completedAt instanceof Date) || isNaN(task.completedAt.getTime())) {
        errors.push('Completed date must be a valid Date object');
      } else if (task.status !== TaskStatus.COMPLETED) {
        warnings.push('Task has completed date but status is not COMPLETED');
      } else if (task.completedAt > new Date()) {
        errors.push('Completed date cannot be in the future');
      }
    } else if (task.status === TaskStatus.COMPLETED) {
      warnings.push('Task is marked as completed but has no completed date');
    }

    // 作成日時・更新日時の検証
    if (!(task.createdAt instanceof Date) || isNaN(task.createdAt.getTime())) {
      errors.push('Created date must be a valid Date object');
    }

    if (!(task.updatedAt instanceof Date) || isNaN(task.updatedAt.getTime())) {
      errors.push('Updated date must be a valid Date object');
    }

    if (task.createdAt && task.updatedAt && task.createdAt > task.updatedAt) {
      errors.push('Created date cannot be after updated date');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * アクションデータを検証する
   */
  validateAction(action: ActionValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールドの検証
    if (!action.id || typeof action.id !== 'string') {
      errors.push('Action ID is required and must be a string');
    }

    if (!action.subGoalId || typeof action.subGoalId !== 'string') {
      errors.push('SubGoal ID is required and must be a string');
    }

    if (!action.title || typeof action.title !== 'string') {
      errors.push('Action title is required and must be a string');
    } else if (action.title.length > 200) {
      errors.push('Action title must be 200 characters or less');
    }

    // アクションタイプの検証
    if (!Object.values(ActionType).includes(action.type)) {
      errors.push(`Invalid action type: ${action.type}`);
    }

    // 位置の検証（マンダラチャートでは0-7）
    if (typeof action.position !== 'number' || action.position < 0 || action.position > 7) {
      errors.push('Action position must be a number between 0 and 7');
    }

    // 進捗値の検証
    if (typeof action.progress !== 'number' || action.progress < 0 || action.progress > 100) {
      errors.push('Action progress must be a number between 0 and 100');
    }

    // タスクの検証
    if (!Array.isArray(action.tasks)) {
      errors.push('Action tasks must be an array');
    } else {
      // 各タスクを検証
      action.tasks.forEach((task, index) => {
        const taskValidation = this.validateTask(task);
        if (!taskValidation.isValid) {
          errors.push(`Task ${index}: ${taskValidation.errors.join(', ')}`);
        }
        warnings.push(...taskValidation.warnings.map(w => `Task ${index}: ${w}`));
      });

      // タスクとアクション進捗の整合性チェック
      if (action.tasks.length > 0) {
        const completedTasks = action.tasks.filter(
          task => task.status === TaskStatus.COMPLETED
        ).length;
        const expectedProgress = Math.round((completedTasks / action.tasks.length) * 100);

        if (
          action.type === ActionType.EXECUTION &&
          Math.abs(action.progress - expectedProgress) > 5
        ) {
          warnings.push(
            `Action progress (${action.progress}%) does not match calculated progress (${expectedProgress}%)`
          );
        }
      }
    }

    // 作成日時・更新日時の検証
    if (!(action.createdAt instanceof Date) || isNaN(action.createdAt.getTime())) {
      errors.push('Created date must be a valid Date object');
    }

    if (!(action.updatedAt instanceof Date) || isNaN(action.updatedAt.getTime())) {
      errors.push('Updated date must be a valid Date object');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * サブ目標データを検証する
   */
  validateSubGoal(subGoal: SubGoalValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールドの検証
    if (!subGoal.id || typeof subGoal.id !== 'string') {
      errors.push('SubGoal ID is required and must be a string');
    }

    if (!subGoal.goalId || typeof subGoal.goalId !== 'string') {
      errors.push('Goal ID is required and must be a string');
    }

    if (!subGoal.title || typeof subGoal.title !== 'string') {
      errors.push('SubGoal title is required and must be a string');
    } else if (subGoal.title.length > 200) {
      errors.push('SubGoal title must be 200 characters or less');
    }

    // 位置の検証（マンダラチャートでは0-7）
    if (typeof subGoal.position !== 'number' || subGoal.position < 0 || subGoal.position > 7) {
      errors.push('SubGoal position must be a number between 0 and 7');
    }

    // 進捗値の検証
    if (typeof subGoal.progress !== 'number' || subGoal.progress < 0 || subGoal.progress > 100) {
      errors.push('SubGoal progress must be a number between 0 and 100');
    }

    // アクションの検証
    if (!Array.isArray(subGoal.actions)) {
      errors.push('SubGoal actions must be an array');
    } else {
      // マンダラチャートでは8つのアクションが必要
      if (subGoal.actions.length !== 8) {
        warnings.push(`SubGoal should have 8 actions, but has ${subGoal.actions.length}`);
      }

      // 各アクションを検証
      subGoal.actions.forEach((action, index) => {
        const actionValidation = this.validateAction(action);
        if (!actionValidation.isValid) {
          errors.push(`Action ${index}: ${actionValidation.errors.join(', ')}`);
        }
        warnings.push(...actionValidation.warnings.map(w => `Action ${index}: ${w}`));
      });

      // 位置の重複チェック
      const positions = subGoal.actions.map(action => action.position);
      const uniquePositions = new Set(positions);
      if (positions.length !== uniquePositions.size) {
        errors.push('Action positions must be unique within a subgoal');
      }

      // アクション進捗とサブ目標進捗の整合性チェック
      if (subGoal.actions.length > 0) {
        const validProgresses = subGoal.actions
          .map(action => action.progress)
          .filter(progress => progress >= 0 && progress <= 100);

        if (validProgresses.length > 0) {
          const expectedProgress = Math.round(
            validProgresses.reduce((sum, progress) => sum + progress, 0) / validProgresses.length
          );

          if (Math.abs(subGoal.progress - expectedProgress) > 5) {
            warnings.push(
              `SubGoal progress (${subGoal.progress}%) does not match calculated progress (${expectedProgress}%)`
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 目標データを検証する
   */
  validateGoal(goal: GoalValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 必須フィールドの検証
    if (!goal.id || typeof goal.id !== 'string') {
      errors.push('Goal ID is required and must be a string');
    }

    if (!goal.userId || typeof goal.userId !== 'string') {
      errors.push('User ID is required and must be a string');
    }

    if (!goal.title || typeof goal.title !== 'string') {
      errors.push('Goal title is required and must be a string');
    } else if (goal.title.length > 200) {
      errors.push('Goal title must be 200 characters or less');
    }

    // 期限の検証
    if (!(goal.deadline instanceof Date) || isNaN(goal.deadline.getTime())) {
      errors.push('Goal deadline must be a valid Date object');
    } else if (goal.deadline < new Date()) {
      warnings.push('Goal deadline is in the past');
    }

    // 進捗値の検証
    if (typeof goal.progress !== 'number' || goal.progress < 0 || goal.progress > 100) {
      errors.push('Goal progress must be a number between 0 and 100');
    }

    // サブ目標の検証
    if (!Array.isArray(goal.subGoals)) {
      errors.push('Goal subGoals must be an array');
    } else {
      // マンダラチャートでは8つのサブ目標が必要
      if (goal.subGoals.length !== 8) {
        warnings.push(`Goal should have 8 subgoals, but has ${goal.subGoals.length}`);
      }

      // 各サブ目標を検証
      goal.subGoals.forEach((subGoal, index) => {
        const subGoalValidation = this.validateSubGoal(subGoal);
        if (!subGoalValidation.isValid) {
          errors.push(`SubGoal ${index}: ${subGoalValidation.errors.join(', ')}`);
        }
        warnings.push(...subGoalValidation.warnings.map(w => `SubGoal ${index}: ${w}`));
      });

      // 位置の重複チェック
      const positions = goal.subGoals.map(subGoal => subGoal.position);
      const uniquePositions = new Set(positions);
      if (positions.length !== uniquePositions.size) {
        errors.push('SubGoal positions must be unique within a goal');
      }

      // サブ目標進捗と目標進捗の整合性チェック
      if (goal.subGoals.length > 0) {
        const validProgresses = goal.subGoals
          .map(subGoal => subGoal.progress)
          .filter(progress => progress >= 0 && progress <= 100);

        if (validProgresses.length > 0) {
          const expectedProgress = Math.round(
            validProgresses.reduce((sum, progress) => sum + progress, 0) / validProgresses.length
          );

          if (Math.abs(goal.progress - expectedProgress) > 5) {
            warnings.push(
              `Goal progress (${goal.progress}%) does not match calculated progress (${expectedProgress}%)`
            );
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 進捗値の妥当性を検証する
   */
  validateProgressValue(progress: number, entityType: string, entityId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof progress !== 'number') {
      errors.push(`Progress value must be a number for ${entityType} ${entityId}`);
      return { isValid: false, errors, warnings };
    }

    if (isNaN(progress)) {
      errors.push(`Progress value is NaN for ${entityType} ${entityId}`);
      return { isValid: false, errors, warnings };
    }

    // 特別な値の処理
    if (progress === -1) {
      // 計算中を示す値
      return { isValid: true, errors, warnings };
    }

    if (progress === -2) {
      // エラー状態を示す値
      warnings.push(`Progress value indicates error state for ${entityType} ${entityId}`);
      return { isValid: true, errors, warnings };
    }

    // 通常の進捗値の範囲チェック
    if (progress < 0 || progress > 100) {
      errors.push(
        `Progress value must be between 0 and 100 for ${entityType} ${entityId}, got ${progress}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 循環依存をチェックする
   */
  checkCircularDependency(
    entityId: string,
    dependencies: string[],
    visitedIds: Set<string> = new Set()
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (visitedIds.has(entityId)) {
      errors.push(
        `Circular dependency detected: ${entityId} -> ${Array.from(visitedIds).join(' -> ')} -> ${entityId}`
      );
      return { isValid: false, errors, warnings };
    }

    const newVisitedIds = new Set(visitedIds);
    newVisitedIds.add(entityId);

    for (const dependency of dependencies) {
      const dependencyCheck = this.checkCircularDependency(dependency, [], newVisitedIds);
      if (!dependencyCheck.isValid) {
        errors.push(...dependencyCheck.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * データの整合性を包括的にチェックする
   */
  validateDataIntegrity(goal: GoalValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本的な目標データの検証
    const goalValidation = this.validateGoal(goal);
    errors.push(...goalValidation.errors);
    warnings.push(...goalValidation.warnings);

    // マンダラチャート構造の検証
    if (goal.subGoals.length === 8) {
      // 各サブ目標が8つのアクションを持つかチェック
      goal.subGoals.forEach((subGoal, subGoalIndex) => {
        if (subGoal.actions.length !== 8) {
          warnings.push(
            `SubGoal ${subGoalIndex} should have 8 actions, but has ${subGoal.actions.length}`
          );
        }

        // 各アクションがタスクを持つかチェック
        subGoal.actions.forEach((action, actionIndex) => {
          if (action.tasks.length === 0) {
            warnings.push(`Action ${actionIndex} in SubGoal ${subGoalIndex} has no tasks`);
          }
        });
      });
    }

    // 進捗の一貫性チェック
    this.validateProgressConsistency(goal, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 進捗の一貫性をチェックする
   */
  private validateProgressConsistency(
    goal: GoalValidationData,
    errors: string[],
    warnings: string[]
  ): void {
    // 目標レベルの進捗一貫性
    const subGoalProgresses = goal.subGoals.map(sg => sg.progress).filter(p => p >= 0 && p <= 100);

    if (subGoalProgresses.length > 0) {
      const calculatedGoalProgress = Math.round(
        subGoalProgresses.reduce((sum, p) => sum + p, 0) / subGoalProgresses.length
      );

      if (Math.abs(goal.progress - calculatedGoalProgress) > 10) {
        warnings.push(
          `Goal progress inconsistency: reported ${goal.progress}%, calculated ${calculatedGoalProgress}%`
        );
      }
    }

    // サブ目標レベルの進捗一貫性
    goal.subGoals.forEach((subGoal, sgIndex) => {
      const actionProgresses = subGoal.actions.map(a => a.progress).filter(p => p >= 0 && p <= 100);

      if (actionProgresses.length > 0) {
        const calculatedSubGoalProgress = Math.round(
          actionProgresses.reduce((sum, p) => sum + p, 0) / actionProgresses.length
        );

        if (Math.abs(subGoal.progress - calculatedSubGoalProgress) > 10) {
          warnings.push(
            `SubGoal ${sgIndex} progress inconsistency: reported ${subGoal.progress}%, calculated ${calculatedSubGoalProgress}%`
          );
        }
      }
    });
  }
}

// シングルトンインスタンスをエクスポート
export const progressDataValidator = new ProgressDataValidator();
