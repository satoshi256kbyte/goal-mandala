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

    it('キャンセル時のエラーを処理する', async () => {
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

      const mockError = new Error('キャンセルエラー');

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockResolvedValue(
        mockStatusResponse
      );
      vi.mocked(workflowApiModule.workflowApi.cancelWorkflow).mockRejectedValue(mockError);

      const onError = vi.fn();
      const { result } = renderHook(() => useWorkflow({ onError }));

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      await act(async () => {
        await result.current.cancelWorkflow('テスト理由');
      });

      expect(result.current.error).toBeDefined();
      expect(onError).toHaveBeenCalledWith(mockError);
    });

    it('ポーリング中のエラーを処理する', async () => {
      vi.useRealTimers(); // 実際のタイマーを使用

      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockRejectedValue(
        new Error('ポーリングエラー')
      );

      const onError = vi.fn();
      const { result } = renderHook(() => useWorkflow({ onError, pollingInterval: 100 }));

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      // ポーリングエラーが発生するまで待機
      await waitFor(
        () => {
          expect(onError).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      expect(result.current.error).toBeDefined();

      vi.useFakeTimers(); // 元に戻す
    }, 10000);
  });

  describe('edge cases', () => {
    it('空のgoalIdでワークフローを開始しようとした場合', async () => {
      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.startWorkflow('');
      });

      expect(workflowApiModule.workflowApi.startWorkflow).toHaveBeenCalledWith('');
    });

    it('既にワークフローが実行中の場合に再度開始しようとした場合', async () => {
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

      // 1回目の開始
      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      expect(result.current.isRunning).toBe(true);

      // 2回目の開始（既に実行中）
      await act(async () => {
        await result.current.startWorkflow('goal-456');
      });

      // 2回目の呼び出しも実行される
      expect(workflowApiModule.workflowApi.startWorkflow).toHaveBeenCalledTimes(2);
    });

    it('ワークフローがTIMED_OUTステータスの場合', async () => {
      vi.useRealTimers(); // 実際のタイマーを使用

      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      const mockTimedOutStatus = {
        executionArn: 'arn:aws:states:test',
        status: 'TIMED_OUT' as const,
        startDate: '2025-12-09T10:00:00.000Z',
        stopDate: '2025-12-09T10:15:00.000Z',
        progressPercentage: 50,
        processedActions: 5,
        totalActions: 10,
        failedActions: [],
        error: 'タイムアウトしました',
      };

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockResolvedValue(
        mockTimedOutStatus
      );

      const onError = vi.fn();
      const { result } = renderHook(() => useWorkflow({ onError, pollingInterval: 100 }));

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      await waitFor(
        () => {
          expect(result.current.status?.status).toBe('TIMED_OUT');
        },
        { timeout: 5000 }
      );

      expect(result.current.isFailed).toBe(true);
      expect(onError).toHaveBeenCalled();

      vi.useFakeTimers(); // 元に戻す
    }, 10000);

    it('ワークフローがABORTEDステータスの場合', async () => {
      vi.useRealTimers(); // 実際のタイマーを使用

      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      const mockAbortedStatus = {
        executionArn: 'arn:aws:states:test',
        status: 'ABORTED' as const,
        startDate: '2025-12-09T10:00:00.000Z',
        stopDate: '2025-12-09T10:05:00.000Z',
        progressPercentage: 20,
        processedActions: 2,
        totalActions: 10,
        failedActions: [],
      };

      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockResolvedValue(
        mockAbortedStatus
      );

      const { result } = renderHook(() => useWorkflow({ pollingInterval: 100 }));

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      await waitFor(
        () => {
          expect(result.current.status?.status).toBe('ABORTED');
        },
        { timeout: 5000 }
      );

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isCompleted).toBe(false);
      // ABORTEDステータスはisFailedがtrueになる
      expect(result.current.isFailed).toBe(true);

      vi.useFakeTimers(); // 元に戻す
    }, 10000);

    it('進捗が0%から100%まで更新される', async () => {
      vi.useRealTimers(); // 実際のタイマーを使用

      const mockStartResponse = {
        executionArn: 'arn:aws:states:test',
        startDate: '2025-12-09T10:00:00.000Z',
        status: 'RUNNING' as const,
      };

      let callCount = 0;
      vi.mocked(workflowApiModule.workflowApi.startWorkflow).mockResolvedValue(mockStartResponse);
      vi.mocked(workflowApiModule.workflowApi.getWorkflowStatus).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            executionArn: 'arn:aws:states:test',
            status: 'RUNNING' as const,
            startDate: '2025-12-09T10:00:00.000Z',
            progressPercentage: 0,
            processedActions: 0,
            totalActions: 10,
            failedActions: [],
          };
        } else if (callCount === 2) {
          return {
            executionArn: 'arn:aws:states:test',
            status: 'RUNNING' as const,
            startDate: '2025-12-09T10:00:00.000Z',
            progressPercentage: 50,
            processedActions: 5,
            totalActions: 10,
            failedActions: [],
          };
        } else {
          return {
            executionArn: 'arn:aws:states:test',
            status: 'SUCCEEDED' as const,
            startDate: '2025-12-09T10:00:00.000Z',
            stopDate: '2025-12-09T10:10:00.000Z',
            progressPercentage: 100,
            processedActions: 10,
            totalActions: 10,
            failedActions: [],
          };
        }
      });

      const { result } = renderHook(() => useWorkflow({ pollingInterval: 100 }));

      await act(async () => {
        await result.current.startWorkflow('goal-123');
      });

      // 進捗が更新されるまで待機
      await waitFor(
        () => {
          expect(result.current.status?.progressPercentage).toBe(100);
        },
        { timeout: 5000 }
      );

      expect(result.current.isCompleted).toBe(true);

      vi.useFakeTimers(); // 元に戻す
    }, 10000);
  });
});
