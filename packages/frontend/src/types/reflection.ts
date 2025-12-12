/**
 * 振り返り機能の型定義
 */

export interface Reflection {
  id: string;
  goalId: string;
  summary: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReflectionInput {
  goalId: string;
  summary: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
}

export interface UpdateReflectionInput {
  summary?: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
}

export interface ActionProgress {
  id: string;
  title: string;
  progress: number;
  subGoalTitle: string;
}

export interface CategorizedActions {
  regretful: ActionProgress[];
  slowProgress: ActionProgress[];
  untouched: ActionProgress[];
}

export interface ReflectionFormData {
  summary: string;
  regretfulActions?: string;
  slowProgressActions?: string;
  untouchedActions?: string;
}
