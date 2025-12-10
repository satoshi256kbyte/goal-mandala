/**
 * useWorkflow Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from './useWorkflow';
import * as workflowApiModule from '../services/workflowApi';

// workflowApiをモック
vi.mock('../services/workflowApi', () => ({
  workflowApi: {
    startWorkflow: vi.fn(),
    getWorkflowStatus: vi.fn(),
    cancelWorkflow: vi.fn(),
  },
}));

describe('useWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('正常にワークフローを開始できる', async () => {
      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      const mockStatusResponse = {
        executionArn: 'arn:aws:states:test',
        status: 'RUNNING' as const,
        startDate: '2025-12-09T10:00:00.000Z',
        progressPercentage: 0,
        processedActions: 0,
        totalActions: 10,
        failedActions: [],
      };

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockResolvedValue(
        mockStatusResponse
      );

      const { result } = renderHook(() => useWorkflow());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.status).toBeNull();

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      expect(workflowApiModule.workflowApi.startWorkflow).toHaveBeenCalledWith('goal-123');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRunning).toBe(true);
      expect(result.current.status).toBeDefined();
    });

    it('エラー時にonErrorコールバックを呼び出す', async () => {
      const mockError = new Error('エラー');
      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockRejectedValue(mockError);

      const onError = vi.fn();
      const { result } = renderHook(() => useWorkflow({ onError }));

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      expect(result.current.error).toBeDefined();
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('cancel', () => {
    it('正常にワークフローをキャンセルできる', async () => {
      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      const mockStatusResponse = {
        executionArn: 'arn:aws:states:test',
        status: 'RUNNING' as const,
        startDate: '2025-12-09T10:00:00.000Z',
        progressPercentage: 0,
        processedActions: 0,
        totalActions: 10,
        failedActions: [],
      };

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockResolvedValue(
        mockStatusResponse
      );
      vi.mocked(workflowApiModule.workflowApi.cancelWorkflow).mockResolvedValue({
        executionArn: 'arn:aws:states:test',
        stopDate: '2025-12-09T10:05:00.000Z',
        status: 'ABORTED' as const,
      });

      const { result } = renderHook(() => useWorkflow());

      // ワークフローを開始
      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      // キャンセル
      await act(async () => {
        await result.current.cancelWorkflow('テスト理由');
      });

      expect(workflowApiModule.workflowApi.cancelWorkflow).toHaveBeenCalledWith(
        'arn:aws:states:test',
        'テスト理由'
      );
      expect(result.current.isRunning).toBe(false);
      expect(result.current.status?.status).toBe('ABORTED');
    });

    it('実行ARNがない場合は何もしない', async () => {
      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.cancelWorkflow();
      });

      expect(workflowApiModule.workflowApi.cancelWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      vi.useRealTimers(); // ポーリングテストでは実際のタイマーを使用
    });

    afterEach(() => {
      vi.useFakeTimers(); // 他のテストのために戻す
    });

    it('ワークフロー完了時にポーリングを停止する', async () => {
      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      const mockSucceededStatus = {
        executionArn: 'arn:aws:states:test',
        status: 'SUCCEEDED' as const,
        startDate: '2025-12-09T10:00:00.000Z',
        stopDate: '2025-12-09T10:10:00.000Z',
        progressPercentage: 100,
        processedActions: 10,
        totalActions: 10,
        failedActions: [],
      };

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockResolvedValue(
        mockSucceededStatus
      );

      const onComplete = vi.fn();
      const { result } = renderHook(() => useWorkflow({ onComplete, pollingInterval: 100 }));

      // ワークフローを開始
      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      // ポーリングが完了するまで待機
      await waitFor(
        () => {
          expect(result.current.status?.status).toBe('SUCCEEDED');
        },
        { timeout: 5000 }
      );

      expect(result.current.isCompleted).toBe(true);
      expect(onComplete).toHaveBeenCalledWith(mockSucceededStatus);
    }, 10000);

    it('ワークフロー失敗時にonErrorコールバックを呼び出す', async () => {
      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      const mockFailedStatus = {
        executionArn: 'arn:aws:states:test',
        status: 'FAILED' as const,
        startDate: '2025-12-09T10:00:00.000Z',
        stopDate: '2025-12-09T10:05:00.000Z',
        progressPercentage: 30,
        processedActions: 3,
        totalActions: 10,
        failedActions: ['action-1', 'action-2'],
        error: 'タスク生成に失敗しました',
      };

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockResolvedValue(
        mockFailedStatus
      );

      const onError = vi.fn();
      const { result } = renderHook(() => useWorkflow({ onError, pollingInterval: 100 }));

      // ワークフローを開始
      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      // ポーリングが完了するまで待機
      await waitFor(
        () => {
          expect(result.current.status?.status).toBe('FAILED');
        },
        { timeout: 5000 }
      );

      expect(result.current.isFailed).toBe(true);
      expect(onError).toHaveBeenCalled();
    }, 10000);
  });

  describe('error handling', () => {
    it('エラーが発生した場合にエラー状態を保持する', async () => {
      const mockError = new Error('エラー');
      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockRejectedValue(mockError);

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('エラー');
    });
  });
});
