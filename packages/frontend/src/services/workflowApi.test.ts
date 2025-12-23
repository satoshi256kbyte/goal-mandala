/**
 * Workflow API Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workflowApi } from './workflowApi';
import * as apiClientModule from './api-client';

// apiClientをモック
vi.mock('./api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('workflowApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startWorkflow', () => {
    it('正常にワークフローを開始できる', async () => {
      const mockResponse = {
        data: {
          executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test',
          startDate: '2025-12-09T10:00:00.000Z',
          status: 'RUNNING' as const,
        },
      };

      vi.mocked(apiClientModule.apiClient.post).mockResolvedValue(mockResponse);

      const result = await workflowApi.startWorkflow('goal-123');

      expect(apiClientModule.apiClient.post).toHaveBeenCalledWith('/goals/goal-123/start-activity');
      expect(result).toEqual(mockResponse.data);
    });

    it('エラー時にエラーをスローする', async () => {
      const mockError = new Error('目標が見つかりません');

      vi.mocked(apiClientModule.apiClient.post).mockRejectedValue(mockError);

      await expect(workflowApi.startWorkflow('invalid-goal')).rejects.toThrow(
        '目標が見つかりません'
      );
    });

    it('不明なエラー時にエラーをスローする', async () => {
      vi.mocked(apiClientModule.apiClient.post).mockRejectedValue(new Error('Network error'));

      await expect(workflowApi.startWorkflow('goal-123')).rejects.toThrow('Network error');
    });
  });

  describe('getWorkflowStatus', () => {
    it('正常にワークフロー状態を取得できる', async () => {
      const mockResponse = {
        data: {
          executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test',
          status: 'RUNNING' as const,
          startDate: '2025-12-09T10:00:00.000Z',
          progressPercentage: 50,
          processedActions: 5,
          totalActions: 10,
          failedActions: [],
        },
      };

      vi.mocked(apiClientModule.apiClient.get).mockResolvedValue(mockResponse);

      const executionArn = 'arn:aws:states:ap-northeast-1:123456789012:execution:test';
      const result = await workflowApi.getWorkflowStatus(executionArn);

      expect(apiClientModule.apiClient.get).toHaveBeenCalledWith(
        `/workflows/${encodeURIComponent(executionArn)}/status`
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('エラー時にエラーをスローする', async () => {
      const mockError = new Error('ワークフローが見つかりません');

      vi.mocked(apiClientModule.apiClient.get).mockRejectedValue(mockError);

      await expect(workflowApi.getWorkflowStatus('invalid-arn')).rejects.toThrow(
        'ワークフローが見つかりません'
      );
    });
  });

  describe('cancelWorkflow', () => {
    it('正常にワークフローをキャンセルできる', async () => {
      const mockResponse = {
        data: {
          executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test',
          stopDate: '2025-12-09T10:05:00.000Z',
          message: 'ワークフローをキャンセルしました',
        },
      };

      vi.mocked(apiClientModule.apiClient.post).mockResolvedValue(mockResponse);

      const executionArn = 'arn:aws:states:ap-northeast-1:123456789012:execution:test';
      const result = await workflowApi.cancelWorkflow(executionArn);

      expect(apiClientModule.apiClient.post).toHaveBeenCalledWith(
        `/workflows/${encodeURIComponent(executionArn)}/cancel`,
        { reason: undefined }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('理由を指定してキャンセルできる', async () => {
      const mockResponse = {
        data: {
          executionArn: 'arn:aws:states:ap-northeast-1:123456789012:execution:test',
          stopDate: '2025-12-09T10:05:00.000Z',
          status: 'ABORTED' as const,
        },
      };

      vi.mocked(apiClientModule.apiClient.post).mockResolvedValue(mockResponse);

      const executionArn = 'arn:aws:states:ap-northeast-1:123456789012:execution:test';
      const reason = '目標を変更したい';
      await workflowApi.cancelWorkflow(executionArn, reason);

      expect(apiClientModule.apiClient.post).toHaveBeenCalledWith(
        `/workflows/${encodeURIComponent(executionArn)}/cancel`,
        { reason }
      );
    });

    it('エラー時にエラーをスローする', async () => {
      const mockError = new Error('ワークフローは既に完了しています');

      vi.mocked(apiClientModule.apiClient.post).mockRejectedValue(mockError);

      await expect(workflowApi.cancelWorkflow('completed-arn')).rejects.toThrow(
        'ワークフローは既に完了しています'
      );
    });
  });
});
