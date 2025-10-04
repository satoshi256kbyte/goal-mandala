// 進捗計算関連の型定義

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ActionTypeはmandala.tsで定義されているため、再エクスポートする
export { ActionType } from './mandala';

export interface TaskProgress {
  id: string;
  progress: number;
  status: TaskStatus;
  completedAt?: Date;
}

export interface ActionProgress {
  id: string;
  progress: number;
  type: import('./mandala').ActionType;
  tasks: TaskProgress[];
}

export interface SubGoalProgress {
  id: string;
  progress: number;
  actions: ActionProgress[];
}

export interface GoalProgress {
  id: string;
  progress: number;
  subGoals: SubGoalProgress[];
}

export interface ProgressHierarchy {
  task: TaskProgress;
  action: ActionProgress;
  subGoal: SubGoalProgress;
  goal: GoalProgress;
}

export interface ProgressCalculationEngine {
  calculateTaskProgress(taskId: string): Promise<number>;
  calculateActionProgress(actionId: string): Promise<number>;
  calculateSubGoalProgress(subGoalId: string): Promise<number>;
  calculateGoalProgress(goalId: string): Promise<number>;
  recalculateFromTask(taskId: string): Promise<ProgressHierarchy>;
}

export interface ProgressCalculationOptions {
  useCache?: boolean;
  forceRecalculate?: boolean;
}

export interface ProgressCache {
  key: string;
  data: number;
  expiresAt: Date;
  dependencies: string[];
}
