/**
 * WorkflowContainer Component
 *
 * ワークフロー管理の統合コンテナコンポーネント
 * Requirements: 1.1, 6.2, 6.3, 9.1, 14.4
 */

import React from 'react';
import { useWorkflow } from '../../hooks/useWorkflow';
import { WorkflowStartButton } from './WorkflowStartButton';
import { WorkflowProgress } from './WorkflowProgress';
import { WorkflowCancelButton } from './WorkflowCancelButton';
import { WorkflowError } from './WorkflowError';

export interface WorkflowContainerProps {
  /**
   * 目標ID
   */
  goalId: string;

  /**
   * ワークフロー完了時のコールバック
   */
  onComplete?: () => void;

  /**
   * ワークフローエラー時のコールバック
   */
  onError?: (error: Error) => void;

  /**
   * 自動ポーリングを有効にするか
   * デフォルト: true
   */
  enablePolling?: boolean;

  /**
   * ポーリング間隔（ミリ秒）
   * デフォルト: 3000ms (3秒)
   */
  pollingInterval?: number;
}

/**
 * ワークフロー管理コンテナ
 */
export const WorkflowContainer: React.FC<WorkflowContainerProps> = ({
  goalId,
  onComplete,
  onError,
  enablePolling = true,
  pollingInterval = 3000,
}) => {
  const {
    startWorkflow,
    cancelWorkflow,
    refreshStatus,
    status,
    isLoading,
    error,
    isRunning,
    isCompleted,
    isFailed,
  } = useWorkflow({
    enablePolling,
    pollingInterval,
    onComplete: () => {
      if (onComplete) {
        onComplete();
      }
    },
    onError: err => {
      if (onError) {
        onError(err);
      }
    },
  });

  const handleStart = async () => {
    await startWorkflow(goalId);
  };

  const handleCancel = async (reason?: string) => {
    await cancelWorkflow(reason);
  };

  const handleRetry = async () => {
    await startWorkflow(goalId);
  };

  return (
    <div className="space-y-6">
      {/* エラー表示 */}
      {(error || isFailed) && <WorkflowError status={status} error={error} onRetry={handleRetry} />}

      {/* 進捗表示 */}
      {(isRunning || isCompleted) && <WorkflowProgress status={status} isLoading={isLoading} />}

      {/* アクションボタン */}
      <div className="flex gap-4 items-center">
        {/* 開始ボタン */}
        {!isRunning && !isCompleted && (
          <WorkflowStartButton
            goalId={goalId}
            onStart={handleStart}
            isLoading={isLoading}
            disabled={isLoading}
          />
        )}

        {/* キャンセルボタン */}
        {isRunning && (
          <WorkflowCancelButton
            onCancel={handleCancel}
            isLoading={isLoading}
            disabled={isLoading}
          />
        )}

        {/* 更新ボタン */}
        {isRunning && (
          <button
            type="button"
            onClick={refreshStatus}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            aria-label="状態を更新"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            更新
          </button>
        )}
      </div>

      {/* 完了メッセージ */}
      {isCompleted && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg
              className="h-6 w-6 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-bold text-green-900">完了</h3>
              <p className="text-sm text-green-700 mt-1">
                タスクの生成が完了しました。活動を開始できます。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
