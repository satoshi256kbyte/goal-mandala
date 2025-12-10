/**
 * Workflow Progress Component
 *
 * ワークフローの進捗状況を表示します。
 */

import React from 'react';
import type { WorkflowStatusResponse } from '../../services/workflowApi';

/**
 * WorkflowProgressのプロパティ
 */
export interface WorkflowProgressProps {
  /** ワークフロー状態 */
  status: WorkflowStatusResponse | null;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 進捗率を計算します
 */
function calculateProgress(status: WorkflowStatusResponse | null): number {
  if (!status) return 0;

  if (status.progress) {
    return status.progress.percentage;
  }

  // 状態に基づいて進捗率を推定
  switch (status.status) {
    case 'RUNNING':
      return 50; // 実行中は50%と表示
    case 'SUCCEEDED':
      return 100;
    case 'FAILED':
    case 'TIMED_OUT':
    case 'ABORTED':
      return 0;
    default:
      return 0;
  }
}

/**
 * 推定残り時間をフォーマットします
 */
function formatEstimatedTime(seconds: number | undefined): string {
  if (!seconds) return '計算中...';

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 1) return '1分未満';
  if (minutes === 1) return '約1分';
  return `約${minutes}分`;
}

/**
 * 状態メッセージを取得します
 */
function getStatusMessage(status: WorkflowStatusResponse | null): string {
  if (!status) return 'ワークフローを開始しています...';

  switch (status.status) {
    case 'RUNNING':
      if (status.progress) {
        return `タスクを生成中... (${status.progress.processedActions}/${status.progress.totalActions} アクション処理済み)`;
      }
      return 'タスクを生成中...';
    case 'SUCCEEDED':
      return 'タスク生成が完了しました！';
    case 'FAILED':
      return 'タスク生成に失敗しました';
    case 'TIMED_OUT':
      return 'タスク生成がタイムアウトしました';
    case 'ABORTED':
      return 'タスク生成がキャンセルされました';
    default:
      return 'ワークフローを開始しています...';
  }
}

/**
 * 状態に応じた色を取得します
 */
function getProgressColor(status: WorkflowStatusResponse | null): string {
  if (!status) return 'bg-blue-600';

  switch (status.status) {
    case 'RUNNING':
      return 'bg-blue-600';
    case 'SUCCEEDED':
      return 'bg-green-600';
    case 'FAILED':
    case 'TIMED_OUT':
      return 'bg-red-600';
    case 'ABORTED':
      return 'bg-gray-600';
    default:
      return 'bg-blue-600';
  }
}

/**
 * ワークフロー進捗表示コンポーネント
 */
export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ status, className = '' }) => {
  const progress = calculateProgress(status);
  const statusMessage = getStatusMessage(status);
  const progressColor = getProgressColor(status);

  return (
    <div className={`space-y-4 ${className}`} role="status" aria-live="polite">
      {/* 状態メッセージ */}
      <div className="text-center">
        <p className="text-lg font-medium text-gray-900">{statusMessage}</p>
        {status?.status === 'RUNNING' && status.progress?.estimatedTimeRemaining && (
          <p className="text-sm text-gray-600 mt-1">
            残り時間: {formatEstimatedTime(status.progress.estimatedTimeRemaining)}
          </p>
        )}
      </div>

      {/* プログレスバー */}
      <div className="w-full">
        <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${progressColor} transition-all duration-500 ease-out`}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="タスク生成の進捗"
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-gray-600">0%</span>
          <span className="text-sm font-medium text-gray-900">{progress}%</span>
          <span className="text-sm text-gray-600">100%</span>
        </div>
      </div>

      {/* 詳細情報 */}
      {status?.progress && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">処理済みアクション:</span>
              <span className="ml-2 font-medium text-gray-900">
                {status.progress.processedActions}
              </span>
            </div>
            <div>
              <span className="text-gray-600">総アクション数:</span>
              <span className="ml-2 font-medium text-gray-900">{status.progress.totalActions}</span>
            </div>
          </div>
        </div>
      )}

      {/* 成功時の詳細 */}
      {status?.status === 'SUCCEEDED' && status.output && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">生成結果</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-green-700">成功したアクション:</span>
              <span className="ml-2 font-medium text-green-900">
                {status.output.successfulActions}
              </span>
            </div>
            <div>
              <span className="text-green-700">生成されたタスク:</span>
              <span className="ml-2 font-medium text-green-900">{status.output.totalTasks}</span>
            </div>
          </div>
        </div>
      )}

      {/* 失敗時の詳細 */}
      {['FAILED', 'TIMED_OUT'].includes(status?.status || '') && status?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-2">エラー詳細</h3>
          <p className="text-sm text-red-700">{status.error.error}</p>
          {status.error.cause && <p className="text-xs text-red-600 mt-2">{status.error.cause}</p>}
        </div>
      )}
    </div>
  );
};
