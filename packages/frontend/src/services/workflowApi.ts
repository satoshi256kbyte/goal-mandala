/**
 * Workflow API Service
 *
 * Step Functions統合のワークフロー管理API
 * Requirements: 1.1, 6.3, 9.1
 */

import { apiClient } from './api-client';

/**
 * ワークフロー実行状態
 */
export type WorkflowStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';

/**
 * ワークフロー開始レスポンス
 */
export interface StartWorkflowResponse {
  executionArn: string;
  startDate: string;
  status: 'RUNNING';
}

/**
 * ワークフロー状態レスポンス
 */
export interface WorkflowStatusResponse {
  executionArn: string;
  status: WorkflowStatus;
  startDate: string;
  stopDate?: string;
  progressPercentage: number;
  processedActions: number;
  totalActions: number;
  failedActions: string[];
  error?: string;
}

/**
 * ワークフローキャンセルレスポンス
 */
export interface CancelWorkflowResponse {
  executionArn: string;
  status: 'ABORTED';
  stopDate: string;
}

/**
 * ワークフローAPI
 */
export const workflowApi = {
  /**
   * ワークフロー開始
   * POST /api/goals/{goalId}/start-activity
   *
   * @param goalId - 目標ID
   * @returns ワークフロー実行情報
   */
  async startWorkflow(goalId: string): Promise<StartWorkflowResponse> {
    const response = await apiClient.post<StartWorkflowResponse>(`/goals/${goalId}/start-activity`);
    return response.data;
  },

  /**
   * ワークフロー状態取得
   * GET /api/workflows/{executionArn}/status
   *
   * @param executionArn - 実行ARN
   * @returns ワークフロー状態
   */
  async getWorkflowStatus(executionArn: string): Promise<WorkflowStatusResponse> {
    // executionArnをURLエンコード
    const encodedArn = encodeURIComponent(executionArn);
    const response = await apiClient.get<WorkflowStatusResponse>(`/workflows/${encodedArn}/status`);
    return response.data;
  },

  /**
   * ワークフローキャンセル
   * POST /api/workflows/{executionArn}/cancel
   *
   * @param executionArn - 実行ARN
   * @param reason - キャンセル理由（任意）
   * @returns キャンセル結果
   */
  async cancelWorkflow(executionArn: string, reason?: string): Promise<CancelWorkflowResponse> {
    // executionArnをURLエンコード
    const encodedArn = encodeURIComponent(executionArn);
    const response = await apiClient.post<CancelWorkflowResponse>(
      `/workflows/${encodedArn}/cancel`,
      { reason }
    );
    return response.data;
  },
};
