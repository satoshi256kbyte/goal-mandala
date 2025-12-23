/**
 * useWorkflow Hook
 *
 * ワークフロー管理のためのカスタムフック
 * Requirements: 1.1, 6.2, 6.3, 9.1
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { workflowApi, WorkflowStatusResponse } from '../services/workflowApi';

export interface UseWorkflowOptions {
  /**
   * ポーリング間隔（ミリ秒）
   * デフォルト: 3000ms (3秒)
   */
  pollingInterval?: number;

  /**
   * 自動ポーリングを有効にするか
   * デフォルト: true
   */
  enablePolling?: boolean;

  /**
   * ワークフロー完了時のコールバック
   */
  onComplete?: (status: WorkflowStatusResponse) => void;

  /**
   * ワークフロー失敗時のコールバック
   */
  onError?: (error: Error) => void;
}

export interface UseWorkflowReturn {
  /**
   * ワークフロー開始
   */
  startWorkflow: (goalId: string) => Promise<void>;

  /**
   * ワークフローキャンセル
   */
  cancelWorkflow: (reason?: string) => Promise<void>;

  /**
   * ワークフロー状態を手動で更新
   */
  refreshStatus: () => Promise<void>;

  /**
   * 現在のワークフロー状態
   */
  status: WorkflowStatusResponse | null;

  /**
   * ローディング状態
   */
  isLoading: boolean;

  /**
   * エラー
   */
  error: Error | null;

  /**
   * ワークフローが実行中かどうか
   */
  isRunning: boolean;

  /**
   * ワークフローが完了したかどうか
   */
  isCompleted: boolean;

  /**
   * ワークフローが失敗したかどうか
   */
  isFailed: boolean;
}

/**
 * ワークフロー管理フック
 */
export function useWorkflow(options: UseWorkflowOptions = {}): UseWorkflowReturn {
  const { pollingInterval = 3000, enablePolling = true, onComplete, onError } = options;

  const [status, setStatus] = useState<WorkflowStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executionArnRef = useRef<string | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  // コールバックの最新参照を保持
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  /**
   * ポーリングを停止
   */
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  /**
   * ワークフロー状態を取得
   * @returns ワークフローが実行中かどうか
   */
  const fetchStatus = useCallback(async (): Promise<boolean> => {
    if (!executionArnRef.current) {
      return false;
    }

    try {
      const statusData = await workflowApi.getWorkflowStatus(executionArnRef.current);
      setStatus(statusData);
      setError(null);

      // ワークフローが完了した場合
      if (
        statusData.status === 'SUCCEEDED' ||
        statusData.status === 'FAILED' ||
        statusData.status === 'TIMED_OUT' ||
        statusData.status === 'ABORTED'
      ) {
        stopPolling();

        if (statusData.status === 'SUCCEEDED' && onCompleteRef.current) {
          onCompleteRef.current(statusData);
        } else if (
          (statusData.status === 'FAILED' || statusData.status === 'TIMED_OUT') &&
          onErrorRef.current
        ) {
          onErrorRef.current(new Error(statusData.error || 'ワークフローが失敗しました'));
        }

        return false; // ワークフロー完了
      }

      return true; // ワークフロー実行中
    } catch (err) {
      const error = err instanceof Error ? err : new Error('ワークフロー状態の取得に失敗しました');
      setError(error);

      if (onErrorRef.current) {
        onErrorRef.current(error);
      }

      return false; // エラー時はポーリング停止
    }
  }, [stopPolling]);

  /**
   * ポーリングを開始
   */
  const startPolling = useCallback(() => {
    if (!enablePolling || !executionArnRef.current) {
      return;
    }

    stopPolling();

    const poll = async () => {
      const isRunning = await fetchStatus();

      // ワークフローが実行中の場合のみ次のポーリングをスケジュール
      if (isRunning) {
        pollingTimerRef.current = setTimeout(poll, pollingInterval);
      }
    };

    poll();
  }, [enablePolling, fetchStatus, pollingInterval, stopPolling]);

  /**
   * ワークフロー開始
   */
  const startWorkflow = useCallback(
    async (goalId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await workflowApi.startWorkflow(goalId);
        executionArnRef.current = result.executionArn;
        setStatus({
          executionArn: result.executionArn,
          status: result.status,
          startDate: result.startDate,
          progressPercentage: 0,
          processedActions: 0,
          totalActions: 0,
          failedActions: [],
        });

        // ポーリング開始
        startPolling();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('ワークフローの開始に失敗しました');
        setError(error);

        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [startPolling]
  );

  /**
   * ワークフローキャンセル
   */
  const cancelWorkflow = useCallback(
    async (reason?: string) => {
      if (!executionArnRef.current) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await workflowApi.cancelWorkflow(executionArnRef.current, reason);
        setStatus(prev =>
          prev
            ? {
                ...prev,
                status: result.status,
                stopDate: result.stopDate,
              }
            : null
        );

        stopPolling();
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('ワークフローのキャンセルに失敗しました');
        setError(error);

        if (onErrorRef.current) {
          onErrorRef.current(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [stopPolling]
  );

  /**
   * ワークフロー状態を手動で更新
   */
  const refreshStatus = useCallback(async () => {
    await fetchStatus();
  }, [fetchStatus]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // 派生状態
  const isRunning = status?.status === 'RUNNING';
  const isCompleted = status?.status === 'SUCCEEDED';
  const isFailed =
    status?.status === 'FAILED' || status?.status === 'TIMED_OUT' || status?.status === 'ABORTED';

  return {
    startWorkflow,
    cancelWorkflow,
    refreshStatus,
    status,
    isLoading,
    error,
    isRunning,
    isCompleted,
    isFailed,
  };
}
