/**
 * 進捗履歴詳細表示コンポーネント
 * 特定日付の詳細情報表示とインタラクション機能
 * 要件: 5.3, 5.4
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { ProgressHistoryEntry, SignificantChange } from '../../services/progress-history-service';
import { Tooltip } from './Tooltip';

export interface ProgressHistoryDetailProps {
  /** 選択された日付 */
  selectedDate?: Date;
  /** 選択された日付の進捗値 */
  selectedProgress?: number;
  /** 進捗履歴データ */
  historyData: ProgressHistoryEntry[];
  /** 重要な変化点データ */
  significantChanges: SignificantChange[];
  /** 詳細表示の表示・非表示 */
  isVisible: boolean;
  /** 詳細表示を閉じる時のコールバック */
  onClose: () => void;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * 日別進捗情報の型定義
 */
interface DayProgressInfo {
  date: Date;
  progress: number;
  previousProgress?: number;
  change?: number;
  changeType: 'increase' | 'decrease' | 'stable';
  isSignificant: boolean;
  significantChange?: SignificantChange;
  reason?: string;
}

/**
 * 進捗変化のアイコンコンポーネント
 */
const ProgressChangeIcon: React.FC<{
  changeType: 'increase' | 'decrease' | 'stable';
  change?: number;
}> = ({ changeType, change }) => {
  const iconClasses = {
    increase: 'text-green-500',
    decrease: 'text-red-500',
    stable: 'text-gray-400',
  };

  const icons = {
    increase: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 17l9.2-9.2M17 17V7m0 10H7"
        />
      </svg>
    ),
    decrease: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 7l-9.2 9.2M7 7v10m0-10h10"
        />
      </svg>
    ),
    stable: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  };

  return (
    <div className={cn('flex items-center space-x-1', iconClasses[changeType])}>
      {icons[changeType]}
      {change !== undefined && (
        <span className="text-xs font-medium">
          {changeType === 'increase' ? '+' : changeType === 'decrease' ? '-' : ''}
          {Math.abs(change)}%
        </span>
      )}
    </div>
  );
};

/**
 * 進捗履歴詳細表示コンポーネント
 */
export const ProgressHistoryDetail: React.FC<ProgressHistoryDetailProps> = ({
  selectedDate,
  selectedProgress,
  historyData,
  significantChanges,
  isVisible,
  onClose,
  className,
}) => {
  const [dayInfo, setDayInfo] = useState<DayProgressInfo | null>(null);

  // 選択された日付の詳細情報を計算
  useEffect(() => {
    if (!selectedDate || !isVisible) {
      setDayInfo(null);
      return;
    }

    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

    // 選択された日付のエントリを検索
    const selectedEntry = historyData.find(
      entry => format(entry.timestamp, 'yyyy-MM-dd') === selectedDateStr
    );

    if (!selectedEntry) {
      setDayInfo(null);
      return;
    }

    // 前日のエントリを検索
    const entryIndex = historyData.findIndex(entry => entry.id === selectedEntry.id);
    const previousEntry = entryIndex > 0 ? historyData[entryIndex - 1] : null;

    // 変化量を計算
    const change = previousEntry ? selectedEntry.progress - previousEntry.progress : 0;
    const changeType: 'increase' | 'decrease' | 'stable' =
      Math.abs(change) < 1 ? 'stable' : change > 0 ? 'increase' : 'decrease';

    // 重要な変化かどうかを判定
    const significantChange = significantChanges.find(
      sc => format(sc.date, 'yyyy-MM-dd') === selectedDateStr
    );

    const info: DayProgressInfo = {
      date: selectedEntry.timestamp,
      progress: selectedEntry.progress,
      previousProgress: previousEntry?.progress,
      change: Math.abs(change),
      changeType,
      isSignificant: !!significantChange,
      significantChange,
      reason: selectedEntry.changeReason || significantChange?.reason,
    };

    setDayInfo(info);
  }, [selectedDate, selectedProgress, historyData, significantChanges, isVisible]);

  // 表示されていない場合は何も表示しない
  if (!isVisible || !dayInfo) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50',
        className
      )}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">進捗詳細</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="詳細を閉じる"
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

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* 日付情報 */}
          <div className="text-center">
            <h4 className="text-xl font-bold text-gray-900">
              {format(dayInfo.date, 'yyyy年MM月dd日', { locale: ja })}
            </h4>
            <p className="text-sm text-gray-500">{format(dayInfo.date, 'EEEE', { locale: ja })}</p>
          </div>

          {/* 進捗情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">進捗率</span>
              <span className="text-2xl font-bold text-blue-600">{dayInfo.progress}%</span>
            </div>

            {/* 進捗変化 */}
            {dayInfo.previousProgress !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">前回から</span>
                <div className="flex items-center space-x-2">
                  <ProgressChangeIcon changeType={dayInfo.changeType} change={dayInfo.change} />
                  <span className="text-sm text-gray-600">
                    ({dayInfo.previousProgress}% → {dayInfo.progress}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 重要な変化の詳細 */}
          {dayInfo.isSignificant && dayInfo.significantChange && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-amber-800">重要な変化</span>
              </div>
              <p className="text-sm text-amber-700">
                この日は{dayInfo.significantChange.change}%の大きな変化がありました。
              </p>
              {dayInfo.reason && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-sm text-amber-600">
                    <span className="font-medium">理由: </span>
                    {dayInfo.reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 通常の変更理由 */}
          {!dayInfo.isSignificant && dayInfo.reason && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <svg
                  className="w-4 h-4 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-blue-800">変更理由</span>
              </div>
              <p className="text-sm text-blue-700">{dayInfo.reason}</p>
            </div>
          )}

          {/* 進捗状況の評価 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">進捗評価</h5>
            <div className="space-y-2">
              {dayInfo.progress === 100 && (
                <div className="flex items-center space-x-2 text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm font-medium">目標達成！</span>
                </div>
              )}

              {dayInfo.progress >= 80 && dayInfo.progress < 100 && (
                <div className="flex items-center space-x-2 text-green-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  <span className="text-sm">順調に進捗しています</span>
                </div>
              )}

              {dayInfo.progress >= 50 && dayInfo.progress < 80 && (
                <div className="flex items-center space-x-2 text-yellow-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm">中程度の進捗です</span>
                </div>
              )}

              {dayInfo.progress < 50 && dayInfo.progress > 0 && (
                <div className="flex items-center space-x-2 text-red-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <span className="text-sm">進捗が遅れています</span>
                </div>
              )}

              {dayInfo.progress === 0 && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm">まだ開始されていません</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 日別進捗情報ツールチップコンポーネント
 * チャート上でホバー時に表示される簡易版
 */
export interface ProgressDayTooltipProps {
  date: Date;
  progress: number;
  previousProgress?: number;
  significantChange?: SignificantChange;
  children: React.ReactNode;
}

export const ProgressDayTooltip: React.FC<ProgressDayTooltipProps> = ({
  date,
  progress,
  previousProgress,
  significantChange,
  children,
}) => {
  const change = previousProgress !== undefined ? progress - previousProgress : 0;
  const changeType: 'increase' | 'decrease' | 'stable' =
    Math.abs(change) < 1 ? 'stable' : change > 0 ? 'increase' : 'decrease';

  const tooltipContent = (
    <div className="max-w-xs">
      <div className="font-medium text-white mb-1">
        {format(date, 'yyyy年MM月dd日', { locale: ja })}
      </div>
      <div className="text-sm text-gray-200 mb-2">
        進捗: <span className="font-medium text-white">{progress}%</span>
      </div>

      {previousProgress !== undefined && Math.abs(change) >= 1 && (
        <div className="text-sm text-gray-200 mb-2 flex items-center space-x-1">
          <span>変化:</span>
          <ProgressChangeIcon changeType={changeType} change={Math.abs(change)} />
        </div>
      )}

      {significantChange && (
        <div className="text-sm text-yellow-200 border-t border-gray-600 pt-2">
          <div className="font-medium">重要な変化</div>
          {significantChange.reason && (
            <div className="text-xs mt-1">{significantChange.reason}</div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-300 mt-2 border-t border-gray-600 pt-1">
        クリックで詳細を表示
      </div>
    </div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      position="top"
      delay={300}
      touchEnabled={true}
      theme="dark"
      animation={{ duration: 200, easing: 'ease-out', scale: true, fade: true }}
    >
      {children}
    </Tooltip>
  );
};

export default ProgressHistoryDetail;
