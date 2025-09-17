// Mandala Chart component types

export interface Position {
  row: number;
  col: number;
}

export interface CellData {
  id: string;
  type: 'goal' | 'subgoal' | 'action' | 'empty';
  title: string;
  description?: string;
  progress: number;
  status?: string;
  deadline?: Date;
  position: Position;
}

export interface GridData {
  goal: Goal;
  cells: CellData[][];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  progress: number;
  status: GoalStatus;
}

export interface SubGoal {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  position: number;
  progress: number;
}

export interface Action {
  id: string;
  sub_goal_id: string;
  title: string;
  description: string;
  type: ActionType;
  position: number;
  progress: number;
}

export enum GoalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum ActionType {
  EXECUTION = 'execution',
  HABIT = 'habit',
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
