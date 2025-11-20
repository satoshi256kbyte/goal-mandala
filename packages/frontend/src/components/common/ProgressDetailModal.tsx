/**
 * 進捗詳細モーダルコンポーネント
 * 特定日付の進捗詳細情報を表示
 * 要件: 5.3
 */

import React, { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { ProgressHistoryEntry } from '../../services/progress-history-service';
import { useFocusTrap } from '../../hooks/useAccessibility';
import { getDialogAria } from '../../utils/screen-reader';

export interface ProgressDetailModalProps {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** 選択された日付 */
  selectedDate: Date | null;
  /** 選択された日付の進捗値 */
  selectedProgress: number | null;
  /** 進捗履歴データ */
  progressHistory: ProgressHistoryEntry[];
  /** 重要な変化点データ */
  significantChanges: SignificantChange[];
  /** モーダルを閉じる */
  onClose: () => void;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * 進捗詳細モーダルコンポーネント
 */
export const ProgressDetailModal: React.FC<ProgressDetailModalProps> = ({
  isOpen,
  selectedDate,
  selectedProgress,
  progressHistory,
  significantChanges,
  onClose,
  className,
}) => {
  // アクセシビリティ
  const { announce } = useLiveRegion();
  const modalRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef);

  const titleId = React.useId();
  const descriptionId = React.useId();

  // 選択された日付の詳細情報を計算
  const dateDetails = useMemo(() => {
    if (!selectedDate || selectedProgress === null) return null;

    // 選択された日付の履歴エントリを検索
    const selectedEntry = progressHistory.find(
      entry => format(entry.timestamp, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );

    // 前日の進捗を取得
    const previousDay = new Date(selectedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousEntry = progressHistory.find(
      entry => format(entry.timestamp, 'yyyy-MM-dd') === format(previousDay, 'yyyy-MM-dd')
    );

    // 重要な変化があるかチェック
    const significantChange = significantChanges.find(
      change => format(change.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );

    // 進捗変化を計算
    const progressChange = previousEntry ? selectedProgress - previousEntry.progress : null;

    return {
      date: selectedDate,
      progress: selectedProgress,
      entry: selectedEntry,
      previousProgress: previousEntry?.progress || null,
      progressChange,
      significantChange,
      isSignificant: !!significantChange,
    };
  }, [selectedDate, selectedProgress, progressHistory, significantChanges]);

  // 進捗変化の分析
  const progressAnalysis = useMemo(() => {
    if (!dateDetails || dateDetails.progressChange === null) return null;

    const change = dateDetails.progressChange;
    const absChange = Math.abs(change);

    let changeType: 'increase' | 'decrease' | 'stable';
    let changeDescription: string;
    let changeColor: string;

    if (absChange < 1) {
      changeType = 'stable';
      changeDescription = '変化なし';
      changeColor = 'text-gray-600';
    } else if (change > 0) {
      changeType = 'increase';
      changeDescription = `+${change.toFixed(1)}% 向上`;
      changeColor = 'text-green-600';
    } else {
      changeType = 'decrease';
      changeDescription = `${change.toFixed(1)}% 低下`;
      changeColor = 'text-red-600';
    }

    return {
      type: changeType,
      description: changeDescription,
      color: changeColor,
      magnitude: absChange,
    };
  }, [dateDetails]);

  // モーダルが開かれた時の処理
  useEffect(() => {
    if (isOpen && dateDetails) {
      const dateStr = format(dateDetails.date, 'yyyy年MM月dd日', { locale: ja });
      announce(
        `${dateStr}の進捗詳細モーダルが開きました。進捗: ${dateDetails.progress}%`,
        'polite'
      );
    }
  }, [isOpen, dateDetails, announce]);

  // ARIA属性を生成
  const dialogAria = getDialogAria({
    titleId,
    descriptionId,
    isModal: true,
  });

  // モーダルが閉じている場合やデータがない場合は何も表示しない
  if (!isOpen || !dateDetails) return null;

  const formattedDate = format(dateDetails.date, 'yyyy年MM月dd日（E）', { locale: ja });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={cn(
          'bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden',
          className
        )}
        {...dialogAria}
      >
        {/* ヘッダー */}
        <header className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 id={titleId} className="text-xl font-semibold text-gray-900">
                進捗詳細
              </h2>
              <p className="text-sm text-gray-600 mt-1">{formattedDate}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded p-1"
              aria-label="モーダルを閉じる"
              title="Escape キーでも閉じることができます"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* メインコンテンツ */}
        <div className="px-6 py-6 overflow-y-auto">
          <div className="space-y-6">
            {/* 進捗情報 */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4">進捗情報</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 現在の進捗 */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {dateDetails.progress}%
                    </div>
                    <div className="text-sm text-gray-600">現在の進捗</div>
                  </div>

                  {/* 前日からの変化 */}
                  {progressAnalysis && (
                    <div className="text-center">
                      <div className={cn('text-2xl font-semibold mb-1', progressAnalysis.color)}>
                        {progressAnalysis.description}
                      </div>
                      <div className="text-sm text-gray-600">前日からの変化</div>
                    </div>
                  )}
                </div>

                {/* 前日の進捗 */}
                {dateDetails.previousProgress !== null && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">前日の進捗:</span>
                      <span className="font-medium">{dateDetails.previousProgress}%</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 重要な変化 */}
            {dateDetails.isSignificant && dateDetails.significantChange && (
              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4">重要な変化</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800 mb-2">
                        大きな進捗変化が検出されました
                      </h4>
                      <p className="text-amber-700 mb-2">
                        変化量:{' '}
                        <span className="font-semibold">
                          {dateDetails.significantChange.change > 0 ? '+' : ''}
                          {dateDetails.significantChange.change}%
                        </span>
                      </p>
                      {dateDetails.significantChange.reason && (
                        <p className="text-amber-700">
                          理由: {dateDetails.significantChange.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 詳細情報 */}
            {dateDetails.entry && (
              <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4">詳細情報</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">エンティティID:</span>
                      <span className="ml-2 font-mono text-xs bg-gray-200 px-2 py-1 rounded">
                        {dateDetails.entry.entityId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">エンティティタイプ:</span>
                      <span className="ml-2 font-medium">{dateDetails.entry.entityType}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">記録時刻:</span>
                      <span className="ml-2 font-medium">
                        {format(dateDetails.entry.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                  </div>

                  {dateDetails.entry.changeReason && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-sm">
                        <span className="text-gray-600">変更理由:</span>
                        <p className="mt-1 text-gray-800">{dateDetails.entry.changeReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 進捗レベル表示 */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4">進捗レベル</h3>
              <div className="space-y-3">
                {/* プログレスバー */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={cn(
                        'h-3 rounded-full transition-all duration-300',
                        dateDetails.progress === 0 && 'bg-gray-400',
                        dateDetails.progress > 0 && dateDetails.progress < 50 && 'bg-red-400',
                        dateDetails.progress >= 50 && dateDetails.progress < 80 && 'bg-yellow-400',
                        dateDetails.progress >= 80 && 'bg-green-400'
                      )}
                      style={{ width: `${dateDetails.progress}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700">
                      {dateDetails.progress}%
                    </span>
                  </div>
                </div>

                {/* レベル説明 */}
                <div className="text-sm text-gray-600">
                  {dateDetails.progress === 0 && '未開始'}
                  {dateDetails.progress > 0 && dateDetails.progress < 50 && '開始段階'}
                  {dateDetails.progress >= 50 && dateDetails.progress < 80 && '進行中'}
                  {dateDetails.progress >= 80 && dateDetails.progress < 100 && '完成間近'}
                  {dateDetails.progress === 100 && '完了'}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* フッター */}
        <footer className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
            >
              閉じる
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProgressDetailModal;
