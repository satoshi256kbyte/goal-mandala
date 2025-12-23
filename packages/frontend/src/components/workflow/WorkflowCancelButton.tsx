/**
 * WorkflowCancelButton Component
 *
 * ワークフローキャンセルボタンと確認ダイアログ
 * Requirements: 9.1
 */

import React, { useState } from 'react';

export interface WorkflowCancelButtonProps {
  /**
   * キャンセル時のコールバック
   */
  onCancel: (reason?: string) => void;

  /**
   * ローディング状態
   */
  isLoading?: boolean;

  /**
   * 無効化状態
   */
  disabled?: boolean;

  /**
   * ボタンテキスト
   */
  buttonText?: string;

  /**
   * 確認ダイアログのタイトル
   */
  confirmTitle?: string;

  /**
   * 確認ダイアログのメッセージ
   */
  confirmMessage?: string;
}

/**
 * ワークフローキャンセルボタン
 */
export const WorkflowCancelButton: React.FC<WorkflowCancelButtonProps> = ({
  onCancel,
  isLoading = false,
  disabled = false,
  buttonText = 'キャンセル',
  confirmTitle = 'キャンセルの確認',
  confirmMessage = 'タスク生成をキャンセルします。生成途中のタスクは保存されません。よろしいですか？',
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [reason, setReason] = useState('');

  const handleButtonClick = () => {
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
        onClick={handleButtonClick}
        disabled={disabled || isLoading}
        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        aria-label={buttonText}
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            処理中...
          </span>
        ) : (
          buttonText
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
            <h2 id="cancel-dialog-title" className="text-xl font-bold mb-4">
              {confirmTitle}
            </h2>
            <p className="text-gray-700 mb-4">{confirmMessage}</p>

            {/* キャンセル理由入力（任意） */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="キャンセルの理由を入力してください（任意）"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="戻る"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
