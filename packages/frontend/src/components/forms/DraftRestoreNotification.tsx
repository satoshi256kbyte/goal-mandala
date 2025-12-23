import React from 'react';
import { DraftData } from '../../services/draftService';
import { draftUtils } from '../../utils/draft-utils';

/**
 * 下書き復元通知のプロパティ
 */
export interface DraftRestoreNotificationProps {
  /** 下書きデータ */
  draftData: DraftData;
  /** 復元ボタンクリック時のコールバック */
  onRestore: () => void;
  /** 拒否ボタンクリック時のコールバック */
  onReject: () => void;
  /** 削除ボタンクリック時のコールバック */
  onDelete?: () => void;
  /** 通知を閉じるコールバック */
  onClose?: () => void;
  /** 表示状態 */
  isVisible?: boolean;
  /** 復元中フラグ */
  isRestoring?: boolean;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * 下書き復元通知コンポーネント
 */
export const DraftRestoreNotification: React.FC<DraftRestoreNotificationProps> = ({
  draftData,
  onRestore,
  onReject,
  onDelete,
  onClose,
  isVisible = true,
  isRestoring = false,
  className = '',
}) => {
  if (!isVisible) {
    return null;
  }

  const savedAt = new Date(draftData.savedAt);
  const summary = draftUtils.getDraftSummary(draftData.formData);
  const timeSinceSave = draftUtils.getTimeSinceSave(savedAt.getTime());

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 ${className}`}>
      <div className="flex items-start">
        {/* アイコン */}
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* メッセージ */}
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">下書きが見つかりました</h3>
          <div className="mt-2 text-sm text-blue-700">
            <p>
              <span className="font-medium">{summary}</span>
              <br />
              <span className="text-blue-600">{timeSinceSave}に保存</span>
            </p>
          </div>

          {/* ボタン */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRestore}
              disabled={isRestoring}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRestoring ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-1 h-3 w-3 text-current"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  復元中...
                </>
              ) : (
                '復元する'
              )}
            </button>

            <button
              type="button"
              onClick={onReject}
              disabled={isRestoring}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              新規作成
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={isRestoring}
                className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                削除
              </button>
            )}
          </div>
        </div>

        {/* 閉じるボタン */}
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex bg-blue-50 rounded-md p-1.5 text-blue-500 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 focus:ring-blue-600"
                aria-label="通知を閉じる"
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 下書き復元通知のメモ化版
 */
export const MemoizedDraftRestoreNotification = React.memo(DraftRestoreNotification);

/**
 * デフォルトエクスポート
 */
export default DraftRestoreNotification;
