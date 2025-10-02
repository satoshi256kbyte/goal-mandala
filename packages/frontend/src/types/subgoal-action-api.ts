/**
 * サブ目標・アクション API 関連の型定義
 */

import { SubGoal, Action, ActionType } from './mandala';

/**
 * サブ目標API関連の型定義
 */

// GET /api/goals/{goalId}/subgoals
export interface GetSubGoalsResponse {
  subGoals: SubGoal[];
  total: number;
}

// PUT /api/subgoals/{id}
export interface UpdateSubGoalRequest {
  title: string;
  description: string;
  background: string;
  constraints?: string;
  position: number;
}

export interface UpdateSubGoalResponse {
  success: boolean;
  subGoal: SubGoal;
}

// PUT /api/goals/{goalId}/subgoals/reorder
export interface ReorderSubGoalsRequest {
  subGoals: Array<{
    id: string;
    position: number;
  }>;
}

export interface ReorderSubGoalsResponse {
  success: boolean;
  subGoals: SubGoal[];
}

// POST /api/goals/{goalId}/subgoals/bulk-update
export interface BulkUpdateSubGoalsRequest {
  updates: Array<{
    id: string;
    changes: Partial<SubGoal>;
  }>;
  deletes: string[];
}

export interface BulkUpdateSubGoalsResponse {
  success: boolean;
  updated: SubGoal[];
  deleted: string[];
}

// POST /api/goals/{goalId}/subgoals/regenerate
export interface RegenerateSubGoalsRequest {
  goalId: string;
  preserveCustomizations: boolean;
}

export interface RegenerateSubGoalsResponse {
  success: boolean;
  processingId: string;
}

/**
 * アクションAPI関連の型定義
 */

// GET /api/goals/{goalId}/actions
export interface GetActionsResponse {
  actions: Action[];
  total: number;
  groupedBySubGoal: Record<string, Action[]>;
}

// PUT /api/actions/{id}
export interface UpdateActionRequest {
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type: ActionType;
  position: number;
}

export interface UpdateActionResponse {
  success: boolean;
  action: Action;
}

// PUT /api/subgoals/{subGoalId}/actions/reorder
export interface ReorderActionsRequest {
  actions: Array<{
    id: string;
    position: number;
  }>;
}

export interface ReorderActionsResponse {
  success: boolean;
  actions: Action[];
}

// POST /api/goals/{goalId}/actions/bulk-update
export interface BulkUpdateActionsRequest {
  updates: Array<{
    id: string;
    changes: Partial<Action>;
  }>;
  deletes: string[];
}

export interface BulkUpdateActionsResponse {
  success: boolean;
  updated: Action[];
  deleted: string[];
}

/**
 * 下書き保存API関連の型定義
 */

// POST /api/drafts/subgoals
export interface SaveSubGoalDraftRequest {
  goalId: string;
  subGoals: Partial<SubGoal>[];
}

export interface SaveSubGoalDraftResponse {
  success: boolean;
  draftId: string;
  savedAt: string;
}

// GET /api/drafts/subgoals/{goalId}
export interface GetSubGoalDraftResponse {
  success: boolean;
  draftData: Partial<SubGoal>[] | null;
  savedAt: string | null;
}

// POST /api/drafts/actions
export interface SaveActionDraftRequest {
  goalId: string;
  actions: Partial<Action>[];
}

export interface SaveActionDraftResponse {
  success: boolean;
  draftId: string;
  savedAt: string;
}

// GET /api/drafts/actions/{goalId}
export interface GetActionDraftResponse {
  success: boolean;
  draftData: Partial<Action>[] | null;
  savedAt: string | null;
}

/**
 * 一括編集用の型定義
 */
export interface BulkEditChanges {
  commonFields: Record<string, any>;
  individualChanges: Record<string, Record<string, any>>;
  deleteItems: string[];
}

/**
 * エラーレスポンス
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse extends ApiErrorResponse {
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      validationErrors: ValidationError[];
    };
  };
}
