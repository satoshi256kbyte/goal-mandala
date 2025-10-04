/**
 * アクションAPI クライアント
 *
 * アクションの取得、更新、並び替え、一括更新機能を提供
 */

import { apiClient } from './api-client';
import type {
  GetActionsResponse,
  UpdateActionRequest,
  UpdateActionResponse,
  ReorderActionsRequest,
  ReorderActionsResponse,
  BulkUpdateActionsRequest,
  BulkUpdateActionsResponse,
  SaveActionDraftRequest,
  SaveActionDraftResponse,
  GetActionDraftResponse,
  ApiErrorResponse,
  ValidationErrorResponse,
} from '../types/subgoal-action-api';
import type { Action } from '../types/mandala';

/**
 * アクションAPIクライアントクラス
 */
export class ActionApiClient {
  /**
   * 指定された目標のアクション一覧を取得
   */
  async getActions(goalId: string): Promise<GetActionsResponse> {
    try {
      const response = await apiClient.get<GetActionsResponse>(`/goals/${goalId}/actions`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch actions:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * 指定されたサブ目標のアクション一覧を取得
   */
  async getActionsBySubGoal(subGoalId: string): Promise<Action[]> {
    try {
      const response = await apiClient.get<{ actions: Action[] }>(`/subgoals/${subGoalId}/actions`);
      return response.data.actions;
    } catch (error) {
      console.error('Failed to fetch actions by subgoal:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * アクションを更新
   */
  async updateAction(id: string, data: UpdateActionRequest): Promise<UpdateActionResponse> {
    try {
      const response = await apiClient.put<UpdateActionResponse>(`/actions/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update action:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * アクションの並び替え
   */
  async reorderActions(
    subGoalId: string,
    data: ReorderActionsRequest
  ): Promise<ReorderActionsResponse> {
    try {
      const response = await apiClient.put<ReorderActionsResponse>(
        `/subgoals/${subGoalId}/actions/reorder`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to reorder actions:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * アクションの一括更新
   */
  async bulkUpdateActions(
    goalId: string,
    data: BulkUpdateActionsRequest
  ): Promise<BulkUpdateActionsResponse> {
    try {
      const response = await apiClient.post<BulkUpdateActionsResponse>(
        `/goals/${goalId}/actions/bulk-update`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to bulk update actions:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * アクションの下書き保存
   */
  async saveDraft(data: SaveActionDraftRequest): Promise<SaveActionDraftResponse> {
    try {
      const response = await apiClient.post<SaveActionDraftResponse>('/drafts/actions', data);
      return response.data;
    } catch (error) {
      console.error('Failed to save action draft:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * アクションの下書き取得
   */
  async getDraft(goalId: string): Promise<GetActionDraftResponse> {
    try {
      const response = await apiClient.get<GetActionDraftResponse>(`/drafts/actions/${goalId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get action draft:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * アクションの下書き削除
   */
  async deleteDraft(goalId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/drafts/actions/${goalId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete action draft:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * APIエラーのハンドリング
   */
  private handleApiError(error: unknown): Error {
    const err = error as any;
    // ネットワークエラーの場合
    if (err.code && err.retryable !== undefined) {
      return new Error(`ネットワークエラー: ${err.message}`);
    }

    // HTTPエラーレスポンスの場合
    if (err.response?.data) {
      const errorData = err.response.data as ApiErrorResponse | ValidationErrorResponse;

      if (errorData.error?.code === 'VALIDATION_ERROR') {
        const validationError = errorData as ValidationErrorResponse;
        const messages = validationError.error.details.validationErrors
          .map(ve => ve.message)
          .join(', ');
        return new Error(`入力エラー: ${messages}`);
      }

      return new Error(errorData.error?.message || 'APIエラーが発生しました');
    }

    // その他のエラー
    return new Error((err as any).message || '不明なエラーが発生しました');
  }
}

/**
 * デフォルトのアクションAPIクライアントインスタンス
 */
export const actionApiClient = new ActionApiClient();

/**
 * アクションAPI サービス関数（従来のAPIとの互換性のため）
 */
export const actionApiService = {
  /**
   * アクション一覧を取得
   */
  getActions: (goalId: string) => actionApiClient.getActions(goalId),

  /**
   * サブ目標別アクション一覧を取得
   */
  getActionsBySubGoal: (subGoalId: string) => actionApiClient.getActionsBySubGoal(subGoalId),

  /**
   * アクションを更新
   */
  updateAction: (id: string, data: UpdateActionRequest) => actionApiClient.updateAction(id, data),

  /**
   * アクションを並び替え
   */
  reorderActions: (subGoalId: string, actions: Action[]) => {
    const data: ReorderActionsRequest = {
      actions: actions.map(action => ({
        id: action.id,
        position: action.position,
      })),
    };
    return actionApiClient.reorderActions(subGoalId, data);
  },

  /**
   * アクションを一括更新
   */
  bulkUpdateActions: (
    goalId: string,
    updates: Array<{ id: string; changes: Partial<Action> }>,
    deletes: string[] = []
  ) => {
    const data: BulkUpdateActionsRequest = {
      updates,
      deletes,
    };
    return actionApiClient.bulkUpdateActions(goalId, data);
  },

  /**
   * 下書きを保存
   */
  saveDraft: (goalId: string, actions: Partial<Action>[]) => {
    const data: SaveActionDraftRequest = {
      goalId,
      actions,
    };
    return actionApiClient.saveDraft(data);
  },

  /**
   * 下書きを取得
   */
  getDraft: (goalId: string) => actionApiClient.getDraft(goalId),

  /**
   * 下書きを削除
   */
  deleteDraft: (goalId: string) => actionApiClient.deleteDraft(goalId),
};

/**
 * 後方互換性のためのエクスポート
 */
export const actionAPI = actionApiService;
export default actionApiService;
