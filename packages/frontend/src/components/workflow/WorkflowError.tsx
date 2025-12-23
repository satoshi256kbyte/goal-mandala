/**
 * WorkflowError Component
 *
 * ワークフローエラー表示コンポーネント
 * Requirements: 14.4
 */

import React from 'react';
import { WorkflowStatusResponse } from '../../services/workflowApi';

export interface WorkflowErrorProps {
  /**
   * ワークフロー状態
   */
  status: WorkflowStatusResponse | null;

  /**
   * エラー
   */
  error: Error | null;

  /**
   * リトライボタンのコールバック
   */
  onRetry?: () => void;

  /**
   * 閉じるボタンのコールバック
   */
  onClose?: () => void;
}

/**
 * ワークフローエラー表示
 */
export const WorkflowError: React.FC<WorkflowErrorProps> = ({
  status,
  error,
  onRetry,
  onClose,
}) => {
  // エラーがない場合は何も表示しない
  if (!error && (!status || (status.status !== 'FAILED' && status.status !== 'TIMED_OUT'))) {
    return null;
  }

  const errorMessage = error?.message || status?.error || 'エラーが発生しました';
  const failedActions = status?.failedActions || [];
  const hasFailedActions = failedActions.length > 0;

  return (
    <div
      className="bg-red-50 border-2 border-red-200 rounded-lg p-6"
      role="alert"
      aria-live="assertive"
    >
      {/* エラーヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 text-red-600 flex-shrink-0"
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-bold text-red-900">
              {status?.status === 'TIMED_OUT' ? 'タイムアウト' : 'エラー'}
            </h3>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-red-600 hover:text-red-800 transition-colors"
            aria-label="閉じる"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 失敗したアクションリスト */}
      {hasFailedActions && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-red-900 mb-2">
            失敗したアクション ({failedActions.length}件)
          </h4>
          <div className="bg-white rounded-lg border border-red-200 max-h-40 overflow-y-auto">
            <ul className="divide-y divide-red-100">
              {failedActions.map((actionId, index) => (
                <li key={index} className="px-3 py-2 text-sm text-red-800">
                  {actionId}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            aria-label="リトライ"
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
            リトライ
          </button>
        )}
      </div>

      {/* ヘルプテキスト */}
      <div className="mt-4 text-sm text-red-700">
        <p>問題が解決しない場合は、以下をお試しください：</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>ページを再読み込みする</li>
          <li>しばらく時間をおいてから再度お試しください</li>
          <li>問題が続く場合は、サポートにお問い合わせください</li>
        </ul>
      </div>
    </div>
  );
};
