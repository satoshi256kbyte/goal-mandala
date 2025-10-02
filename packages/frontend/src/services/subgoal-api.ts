/**
 * サブ目標API クライアント
 *
 * サブ目標の取得、更新、並び替え、一括更新機能を提供
 */

import { apiClient } from './api-client';
import type {
  GetSubGoalsResponse,
  UpdateSubGoalRequest,
  UpdateSubGoalResponse,
  ReorderSubGoalsRequest,
  ReorderSubGoalsResponse,
  BulkUpdateSubGoalsRequest,
  BulkUpdateSubGoalsResponse,
  RegenerateSubGoalsRequest,
  RegenerateSubGoalsResponse,
  SaveSubGoalDraftRequest,
  SaveSubGoalDraftResponse,
  GetSubGoalDraftResponse,
  ApiErrorResponse,
  ValidationErrorResponse,
} from '../types/subgoal-action-api';
import type { SubGoal } from '../types/mandala';

/**
 * サブ目標APIクライアントクラス
 */
export class SubGoalApiClient {
  /**
   * 指定された目標のサブ目標一覧を取得
   */
  async getSubGoals(goalId: string): Promise<GetSubGoalsResponse> {
    try {
      const response = await apiClient.get<GetSubGoalsResponse>(`/goals/${goalId}/subgoals`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch subgoals:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * サブ目標を更新
   */
  async updateSubGoal(id: string, data: UpdateSubGoalRequest): Promise<UpdateSubGoalResponse> {
    try {
      const response = await apiClient.put<UpdateSubGoalResponse>(`/subgoals/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update subgoal:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * サブ目標の並び替え
   */
  async reorderSubGoals(
    goalId: string,
    data: ReorderSubGoalsRequest
  ): Promise<ReorderSubGoalsResponse> {
    try {
      const response = await apiClient.put<ReorderSubGoalsResponse>(
        `/goals/${goalId}/subgoals/reorder`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to reorder subgoals:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * サブ目標の一括更新
   */
  async bulkUpdateSubGoals(
    goalId: string,
    data: BulkUpdateSubGoalsRequest
  ): Promise<BulkUpdateSubGoalsResponse> {
    try {
      const response = await apiClient.post<BulkUpdateSubGoalsResponse>(
        `/goals/${goalId}/subgoals/bulk-update`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to bulk update subgoals:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * サブ目標の再生成
   */
  async regenerateSubGoals(data: RegenerateSubGoalsRequest): Promise<RegenerateSubGoalsResponse> {
    try {
      const response = await apiClient.post<RegenerateSubGoalsResponse>(
        `/goals/${data.goalId}/subgoals/regenerate`,
        data
      );
      return response.data;
    } catch (error) {
      console.error('Failed to regenerate subgoals:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * サブ目標の下書き保存
   */
  async saveDraft(data: SaveSubGoalDraftRequest): Promise<SaveSubGoalDraftResponse> {
    try {
      const response = await apiClient.post<SaveSubGoalDraftResponse>('/drafts/subgoals', data);
      return response.data;
    } catch (error) {
      console.error('Failed to save subgoal draft:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * サブ目標の下書き取得
   */
  async getDraft(goalId: string): Promise<GetSubGoalDraftResponse> {
    try {
      const response = await apiClient.get<GetSubGoalDraftResponse>(`/drafts/subgoals/${goalId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get subgoal draft:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * サブ目標の下書き削除
   */
  async deleteDraft(goalId: string): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.delete<{ success: boolean }>(`/drafts/subgoals/${goalId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to delete subgoal draft:', error);
      throw this.handleApiError(error);
    }
  }

  /**
   * APIエラーのハンドリング
   */
  private handleApiError(error: unknown): Error {
    // ネットワークエラーの場合
    if (error.code && error.retryable !== undefined) {
      return new Error(`ネットワークエラー: ${error.message}`);
    }

    // HTTPエラーレスポンスの場合
    if (error.response?.data) {
      const errorData = error.response.data as ApiErrorResponse | ValidationErrorResponse;

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
    return new Error(error.message || '不明なエラーが発生しました');
  }
}

/**
 * デフォルトのサブ目標APIクライアントインスタンス
 */
export const subGoalApiClient = new SubGoalApiClient();

/**
 * サブ目標API サービス関数（従来のAPIとの互換性のため）
 */
export const subGoalApiService = {
  /**
   * サブ目標一覧を取得
   */
  getSubGoals: (goalId: string) => subGoalApiClient.getSubGoals(goalId),

  /**
   * サブ目標を更新
   */
  updateSubGoal: (id: string, data: UpdateSubGoalRequest) =>
    subGoalApiClient.updateSubGoal(id, data),

  /**
   * サブ目標を並び替え
   */
  reorderSubGoals: (goalId: string, subGoals: SubGoal[]) => {
    const data: ReorderSubGoalsRequest = {
      subGoals: subGoals.map(sg => ({
        id: sg.id,
        position: sg.position,
      })),
    };
    return subGoalApiClient.reorderSubGoals(goalId, data);
  },

  /**
   * サブ目標を一括更新
   */
  bulkUpdateSubGoals: (
    goalId: string,
    updates: Array<{ id: string; changes: Partial<SubGoal> }>,
    deletes: string[] = []
  ) => {
    const data: BulkUpdateSubGoalsRequest = {
      updates,
      deletes,
    };
    return subGoalApiClient.bulkUpdateSubGoals(goalId, data);
  },

  /**
   * サブ目標を再生成
   */
  regenerateSubGoals: (goalId: string, preserveCustomizations = true) => {
    const data: RegenerateSubGoalsRequest = {
      goalId,
      preserveCustomizations,
    };
    return subGoalApiClient.regenerateSubGoals(data);
  },

  /**
   * 下書きを保存
   */
  saveDraft: (goalId: string, subGoals: Partial<SubGoal>[]) => {
    const data: SaveSubGoalDraftRequest = {
      goalId,
      subGoals,
    };
    return subGoalApiClient.saveDraft(data);
  },

  /**
   * 下書きを取得
   */
  getDraft: (goalId: string) => subGoalApiClient.getDraft(goalId),

  /**
   * 下書きを削除
   */
  deleteDraft: (goalId: string) => subGoalApiClient.deleteDraft(goalId),
};

export default subGoalApiService;
