/**
 * Workflow Demo Page
 *
 * Step Functions統合のUIコンポーネントのデモページです。
 * 実際の実装では、このページをマンダラチャート画面に統合します。
 */

import React from 'react';
import { useWorkflow } from '../hooks/useWorkflow';
import {
  StartActivityButton,
  WorkflowProgress,
  CancelWorkflowButton,
  WorkflowError,
} from '../components/workflow';

/**
 * ワークフローデモページコンポーネント
 */
export const WorkflowDemoPage: React.FC = () => {
  // デモ用の目標ID（実際の実装ではURLパラメータから取得）
  const goalId = 'demo-goal-id';

  // ワークフローフックを使用
  const { isStarting, isCancelling, isPolling, workflowStatus, error, start, cancel, clearError } =
    useWorkflow(
      // 成功時のコールバック
      status => {
        console.log('ワークフロー完了:', status);
        alert('タスク生成が完了しました！');
      },
      // エラー時のコールバック
      err => {
        console.error('ワークフローエラー:', err);
      }
    );

  // ワークフロー開始ハンドラー
  const handleStart = async () => {
    await start(goalId);
  };

  // キャンセルハンドラー
  const handleCancel = async (reason?: string) => {
    await cancel(reason);
  };

  // リトライハンドラー
  const handleRetry = async () => {
    clearError();
    await start(goalId);
  };

  // 実行中かどうか
  const isRunning = workflowStatus?.status === 'RUNNING';

  // 完了したかどうか
  const isCompleted = ['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'ABORTED'].includes(
    workflowStatus?.status || ''
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Step Functions統合デモ</h1>
          <p className="text-gray-600">
            活動開始ボタンをクリックして、タスク生成ワークフローを開始します。
          </p>
        </div>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* エラー表示 */}
          {error && (
            <WorkflowError
              error={error}
              status={workflowStatus}
              onRetry={handleRetry}
              onClose={clearError}
            />
          )}

          {/* 開始前の状態 */}
          {!workflowStatus && !error && (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                タスク生成の準備ができました
              </h2>
              <p className="text-gray-600 mb-6">
                活動を開始すると、マンダラチャートのアクションから
                <br />
                日々のタスクを自動生成します。
              </p>
              <StartActivityButton goalId={goalId} onStart={handleStart} isLoading={isStarting} />
            </div>
          )}

          {/* 進捗表示 */}
          {workflowStatus && !error && (
            <>
              <WorkflowProgress status={workflowStatus} />

              {/* キャンセルボタン（実行中のみ） */}
              {isRunning && (
                <div className="flex justify-center pt-4">
                  <CancelWorkflowButton onCancel={handleCancel} isLoading={isCancelling} />
                </div>
              )}

              {/* 完了後のアクション */}
              {isCompleted && workflowStatus.status === 'SUCCEEDED' && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      alert('タスク一覧ページに遷移します');
                    }}
                    className="
                      px-6 py-3 rounded-lg font-medium
                      bg-green-600 text-white
                      hover:bg-green-700
                      transition-colors duration-200
                    "
                  >
                    タスク一覧を見る
                  </button>
                </div>
              )}
            </>
          )}

          {/* デバッグ情報 */}
          <details className="mt-8 pt-8 border-t border-gray-200">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              デバッグ情報を表示
            </summary>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(
                  {
                    isStarting,
                    isCancelling,
                    isPolling,
                    workflowStatus,
                    error: error
                      ? {
                          message: error.message,
                          statusCode: error.statusCode,
                        }
                      : null,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </details>
        </div>

        {/* 使用方法 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="font-medium text-blue-900 mb-2">使用方法</h3>
          <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
            <li>「活動を開始」ボタンをクリックします</li>
            <li>確認ダイアログで「開始」をクリックします</li>
            <li>進捗バーでタスク生成の進行状況を確認します</li>
            <li>必要に応じて「キャンセル」ボタンで中止できます</li>
            <li>完了後、「タスク一覧を見る」ボタンで生成されたタスクを確認します</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
