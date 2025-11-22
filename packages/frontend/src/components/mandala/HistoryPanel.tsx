import React, { useState, useEffect } from 'react';
import './HistoryPanel.css';

// 型定義
export interface HistoryChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface HistoryEntry {
  id: string;
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  userId: string;
  userName: string;
  changedAt: Date;
  changes: HistoryChange[];
}

export interface HistoryPanelProps {
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  isAdmin: boolean;
  history: HistoryEntry[];
  total: number;
  limit?: number;
  offset?: number;
  onPageChange?: (newOffset: number) => void;
  onRollback?: (historyId: string) => Promise<void>;
  onClose: () => void;
}

// フィールド名の日本語マッピング
const fieldNameMap: Record<string, string> = {
  title: 'タイトル',
  description: '説明',
  deadline: '達成期限',
  background: '背景',
  constraints: '制約事項',
  type: '種別',
  status: 'ステータス',
  progress: '進捗',
};

// 日時フォーマット関数
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  entityType: _entityType,
  entityId: _entityId,
  isAdmin,
  history,
  total,
  limit = 20,
  offset = 0,
  onPageChange,
  onRollback,
  onClose,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Escキーでパネルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmDialog) {
          setShowConfirmDialog(false);
        } else if (selectedEntry) {
          setSelectedEntry(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmDialog, selectedEntry, onClose]);

  // 履歴エントリをクリック
  const handleEntryClick = (entry: HistoryEntry) => {
    setSelectedEntry(entry);
  };

  // 詳細モーダルを閉じる
  const handleCloseDetail = () => {
    setSelectedEntry(null);
  };

  // ロールバックボタンをクリック
  const handleRollbackClick = () => {
    setShowConfirmDialog(true);
  };

  // ロールバック確認
  const handleConfirmRollback = async () => {
    if (!selectedEntry || !onRollback) return;

    setIsRollingBack(true);
    try {
      await onRollback(selectedEntry.id);
      setShowConfirmDialog(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('ロールバックエラー:', error);
    } finally {
      setIsRollingBack(false);
    }
  };

  // ロールバックキャンセル
  const handleCancelRollback = () => {
    setShowConfirmDialog(false);
  };

  // ページネーション
  const handlePrevPage = () => {
    if (onPageChange && offset > 0) {
      onPageChange(Math.max(0, offset - limit));
    }
  };

  const handleNextPage = () => {
    if (onPageChange && offset + limit < total) {
      onPageChange(offset + limit);
    }
  };

  const isPrevDisabled = offset === 0;
  const isNextDisabled = offset + limit >= total;

  return (
    <div
      role="region"
      aria-label="変更履歴パネル"
      className="history-panel fixed inset-y-0 right-0 w-96 bg-white shadow-lg border-l border-gray-200 overflow-hidden flex flex-col"
    >
      {/* ヘッダー */}
      <div className="history-panel-header p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="history-panel-title">変更履歴</h2>
        <button
          onClick={onClose}
          className="history-panel-close-button"
          aria-label="パネルを閉じる"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* 履歴一覧 */}
      <div className="history-panel-list flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="history-panel-empty">変更履歴がありません</div>
        ) : (
          <div className="space-y-2">
            {history.map(entry => (
              <button
                key={entry.id}
                onClick={() => handleEntryClick(entry)}
                className="history-entry w-full text-left"
              >
                <div className="history-entry-header">
                  <span className="history-entry-user">{entry.userName}</span>
                  <span className="history-entry-date">{formatDate(entry.changedAt)}</span>
                </div>
                <div className="history-entry-changes">{entry.changes.length}件の変更</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ページネーション */}
      {total > limit && (
        <div className="history-panel-pagination">
          <button
            onClick={handlePrevPage}
            disabled={isPrevDisabled}
            className="history-pagination-button"
          >
            前へ
          </button>
          <span className="history-pagination-info">
            {offset + 1} - {Math.min(offset + limit, total)} / {total}
          </span>
          <button
            onClick={handleNextPage}
            disabled={isNextDisabled}
            className="history-pagination-button"
          >
            次へ
          </button>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedEntry && (
        <div
          className="history-detail-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseDetail}
          role="presentation"
        >
          <div
            role="dialog"
            aria-labelledby="history-detail-title"
            aria-modal="true"
            tabIndex={-1}
            className="history-detail-modal bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                handleCloseDetail();
              }
            }}
          >
            {/* モーダルヘッダー */}
            <div className="history-detail-header p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 id="history-detail-title" className="history-detail-title">
                    変更詳細
                  </h3>
                  <div className="history-detail-meta">
                    <div className="history-detail-meta-item">変更者: {selectedEntry.userName}</div>
                    <div className="history-detail-meta-item">
                      変更日時: {formatDate(selectedEntry.changedAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="モーダルを閉じる"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 変更内容 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="history-changes-list">
                {selectedEntry.changes.map((change, index) => (
                  <div key={index} className="history-change-item">
                    <div className="history-change-field">
                      {fieldNameMap[change.field] || change.field}
                    </div>
                    <div className="history-change-diff">
                      <div className="history-diff-old">
                        <div className="history-diff-old-label">削除</div>
                        <div className="history-diff-old-value">{change.oldValue}</div>
                      </div>
                      <div className="history-diff-new">
                        <div className="history-diff-new-label">追加</div>
                        <div className="history-diff-new-value">{change.newValue}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* モーダルフッター */}
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={handleCloseDetail}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                閉じる
              </button>
              {isAdmin && onRollback && (
                <button onClick={handleRollbackClick} className="history-rollback-button">
                  ロールバック
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ロールバック確認ダイアログ */}
      {showConfirmDialog && (
        <div className="history-detail-modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            role="dialog"
            aria-labelledby="confirm-dialog-title"
            className="history-confirm-dialog bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
          >
            <h3 id="confirm-dialog-title" className="history-confirm-title">
              ロールバックの確認
            </h3>
            <p className="history-confirm-message">
              この変更をロールバックしますか？この操作は元に戻せません。
            </p>
            {isRollingBack ? (
              <div className="history-confirm-loading">
                <div className="history-confirm-spinner"></div>
                <div className="history-confirm-loading-text">ロールバック中...</div>
              </div>
            ) : (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelRollback}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConfirmRollback}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  はい
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
