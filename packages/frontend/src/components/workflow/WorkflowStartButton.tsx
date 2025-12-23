/**
 * WorkflowStartButton Component
 *
 * ワークフロー開始ボタンと確認ダイアログ
 * Requirements: 1.1
 */

import React, { useState } from 'react';

export interface WorkflowStartButtonProps {
  /**
   * 目標ID
   */
  goalId: string;

  /**
   * ワークフロー開始時のコールバック
   */
  onStart: (goalId: string) => void;

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
 * ワークフロー開始ボタン
 */
export const WorkflowStartButton: React.FC<WorkflowStartButtonProps> = ({
  goalId,
  onStart,
  isLoading = false,
  disabled = false,
  buttonText = '活動を開始',
  confirmTitle = '活動開始の確認',
  confirmMessage = 'タスク生成を開始します。この処理には数分かかる場合があります。よろしいですか？',
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleButtonClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    onStart(goalId);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isLoading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        aria-label={buttonText}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
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
          aria-labelledby="confirm-dialog-title"
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 id="confirm-dialog-title" className="text-xl font-bold mb-4">
              {confirmTitle}
            </h2>
            <p className="text-gray-700 mb-6">{confirmMessage}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                aria-label="キャンセル"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                aria-label="開始"
              >
                開始
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
