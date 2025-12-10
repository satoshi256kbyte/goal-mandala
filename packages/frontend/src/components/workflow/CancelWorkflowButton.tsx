/**
 * Cancel Workflow Button Component
 *
 * ワークフローキャンセルボタンと確認ダイアログを提供します。
 */

import React, { useState } from 'react';

/**
 * CancelWorkflowButtonのプロパティ
 */
export interface CancelWorkflowButtonProps {
  /** キャンセル時のコールバック */
  onCancel: (reason?: string) => void;
  /** ローディング状態 */
  isLoading?: boolean;
  /** 無効化状態 */
  disabled?: boolean;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * ワークフローキャンセルボタンコンポーネント
 */
export const CancelWorkflowButton: React.FC<CancelWorkflowButtonProps> = ({
  onCancel,
  isLoading = false,
  disabled = false,
  className = '',
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reason, setReason] = useState('');

  const handleClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onCancel(reason || undefined);
    setReason('');
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setReason('');
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`
          px-4 py-2 rounded-lg font-medium
          bg-red-600 text-white
          hover:bg-red-700
          disabled:bg-gray-300 disabled:cursor-not-allowed
          transition-colors duration-200
          ${className}
        `}
        aria-label="タスク生成をキャンセル"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.04824 3 7.938l3-2.647z"
              />
            </svg>
            キャンセル中...
          </span>
        ) : (
          'キャンセル'
        )}
      </button>

      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 id="cancel-dialog-title" className="text-xl font-bold mb-4 text-gray-900">
              タスク生成をキャンセルしますか？
            </h2>
            <p className="text-gray-700 mb-4">
              進行中のタスク生成を中止します。 生成済みのタスクは削除されます。
            </p>

            {/* キャンセル理由入力（オプション） */}
            <div className="mb-6">
              <label
                htmlFor="cancel-reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                キャンセル理由（任意）
              </label>
              <textarea
                id="cancel-reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="例: 目標を変更したい"
                rows={3}
                className="
                  w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                  resize-none
                "
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{reason.length}/200文字</p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="
                  px-4 py-2 rounded-lg font-medium
                  bg-gray-200 text-gray-700
                  hover:bg-gray-300
                  transition-colors duration-200
                "
                aria-label="戻る"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="
                  px-4 py-2 rounded-lg font-medium
                  bg-red-600 text-white
                  hover:bg-red-700
                  transition-colors duration-200
                "
                aria-label="キャンセル実行"
              >
                キャンセル実行
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
