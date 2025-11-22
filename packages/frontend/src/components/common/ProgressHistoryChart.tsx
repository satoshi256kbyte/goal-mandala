/**
 * 進捗履歴チャートコンポーネント
 * Rechartsを使用した進捗履歴グラフの表示
 * 要件: 5.2, 5.3
 */

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot,
} from 'recharts';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import { ProgressHistoryEntry } from '../../services/progress-history-service';
import { ProgressDetailModal } from './ProgressDetailModal';

export interface ProgressHistoryChartProps {
  /** 進捗履歴データ */
  data: ProgressHistoryEntry[];
  /** 重要な変化点データ */
  significantChanges?: SignificantChange[];
  /** チャートの幅 */
  width?: number;
  /** チャートの高さ */
  height?: number;
  /** グリッド表示の有無 */
  showGrid?: boolean;
  /** ツールチップ表示の有無 */
  showTooltip?: boolean;
  /** 重要な変化点のハイライト表示 */
  highlightSignificantChanges?: boolean;
  /** カスタムカラー設定 */
  colors?: {
    line?: string;
    grid?: string;
    tooltip?: string;
    significant?: string;
  };
  /** 日付フォーマット */
  dateFormat?: string;
  /** 追加のCSSクラス */
  className?: string;
  /** 特定日付クリック時のコールバック */
  onDateClick?: (date: Date, progress: number) => void;
  /** アクセシビリティ対応 */
  'aria-label'?: string;
  /** エラー状態 */
  error?: {
    hasError: boolean;
    errorMessage?: string;
    onRetry?: () => void;
  };
  /** ローディング状態 */
  loading?: boolean;
}

/**
 * カスタムツールチップコンポーネント
 * 要件: 5.3 - ツールチップによる日別進捗情報表示機能
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: unknown[];
  label?: string;
  significantChanges?: SignificantChange[];
  progressHistory?: ProgressHistoryEntry[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  significantChanges = [],
  progressHistory = [],
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const date = parseISO(label || '');
  const progress = (payload[0] as any).value;

  // この日付に重要な変化があるかチェック
  const significantChange = significantChanges.find(
    change => format(change.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  );

  // 前日の進捗を取得
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousEntry = progressHistory.find(
    entry => format(entry.timestamp, 'yyyy-MM-dd') === format(previousDay, 'yyyy-MM-dd')
  );

  const progressChange = previousEntry ? progress - previousEntry.progress : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs cursor-pointer hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">
          {format(date, 'yyyy年MM月dd日', { locale: ja })}
        </p>
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">クリックで詳細</div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          進捗: <span className="font-medium text-blue-600">{progress}%</span>
        </p>

        {/* 前日からの変化 */}
        {progressChange !== null && (
          <p className="text-xs text-gray-600">
            前日比:{' '}
            <span
              className={cn(
                'font-medium',
                progressChange > 0
                  ? 'text-green-600'
                  : progressChange < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
              )}
            >
              {progressChange > 0 ? '+' : ''}
              {progressChange.toFixed(1)}%
            </span>
          </p>
        )}

        {/* 重要な変化 */}
        {significantChange && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <p className="text-xs text-amber-600 font-medium">
                大きな変化: {significantChange.change > 0 ? '+' : ''}
                {significantChange.change}%
              </p>
            </div>
            {significantChange.reason && (
              <p className="text-xs text-gray-500 mt-1">{significantChange.reason}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * カスタムドットコンポーネント（重要な変化点用）
 * 要件: 5.3 - 大きな進捗変化があった日のハイライト表示機能
 */
interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
  significantChanges?: SignificantChange[];
  significantColor?: string;
  onDotClick?: (date: Date, progress: number) => void;
}

const CustomDot: React.FC<CustomDotProps> = ({
  cx,
  cy,
  payload,
  significantChanges = [],
  significantColor = '#f59e0b',
  onDotClick,
}) => {
  if (!payload || !cx || !cy) return null;

  const date = parseISO(payload.timestamp);
  const isSignificant = significantChanges.some(
    change => format(change.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
  );

  if (!isSignificant) return null;

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={8}
      fill={significantColor}
      stroke="#ffffff"
      strokeWidth={3}
      className="animate-pulse cursor-pointer hover:r-10 transition-all"
      onClick={() => onDotClick?.(date, payload.progress)}
      style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
    />
  );
};

/**
 * 進捗履歴チャートコンポーネント
 * 要件: 5.3 - 履歴詳細表示とインタラクション機能
 */
export const ProgressHistoryChart: React.FC<ProgressHistoryChartProps> = ({
  data,
  significantChanges = [],
  width,
  height = 300,
  showGrid = true,
  showTooltip = true,
  highlightSignificantChanges = true,
  colors = {},
  dateFormat = 'MM/dd',
  className,
  onDateClick,
  'aria-label': ariaLabel,
  error,
  loading = false,
}) => {
  // 詳細モーダルの状態管理
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProgress, setSelectedProgress] = useState<number | null>(null);

  // 日付クリック時の処理
  const handleDateClick = (date: Date, progress: number) => {
    setSelectedDate(date);
    setSelectedProgress(progress);
    setIsDetailModalOpen(true);

    // 外部のコールバックも呼び出す
    onDateClick?.(date, progress);
  };

  // 詳細モーダルを閉じる
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDate(null);
    setSelectedProgress(null);
  };
  // デフォルトカラー設定
  const defaultColors = {
    line: '#3b82f6', // blue-500
    grid: '#e5e7eb', // gray-200
    tooltip: '#1f2937', // gray-800
    significant: '#f59e0b', // amber-500
  };

  const chartColors = { ...defaultColors, ...colors };

  // チャート用データの変換
  const chartData = useMemo(() => {
    return data.map(entry => ({
      timestamp: entry.timestamp.toISOString(),
      progress: entry.progress,
      date: format(entry.timestamp, dateFormat),
      fullDate: format(entry.timestamp, 'yyyy年MM月dd日', { locale: ja }),
    }));
  }, [data, dateFormat]);

  // ローディング状態の表示
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200',
          className
        )}
        style={{ height }}
        role="img"
        aria-label="進捗履歴データを読み込み中"
      >
        <div className="text-center">
          <div className="text-blue-400 mb-2">
            <svg
              className="w-8 h-8 mx-auto animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600">進捗履歴を読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー状態の表示
  if (error?.hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-red-50 rounded-lg border-2 border-dashed border-red-300',
          className
        )}
        style={{ height }}
        role="img"
        aria-label={`エラー: ${error.errorMessage || '進捗履歴の取得に失敗しました'}`}
      >
        <div className="text-center">
          <div className="text-red-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-sm text-red-600 font-medium">進捗履歴の取得に失敗しました</p>
          {error.errorMessage && <p className="text-xs text-red-500 mt-1">{error.errorMessage}</p>}
          {error.onRetry && (
            <button
              onClick={error.onRetry}
              className="mt-3 px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    );
  }

  // データが空の場合の表示
  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300',
          className
        )}
        style={{ height }}
        role="img"
        aria-label={ariaLabel || '進捗履歴データがありません'}
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500">進捗履歴データがありません</p>
          <p className="text-xs text-gray-400 mt-1">タスクを完了すると履歴が表示されます</p>
        </div>
      </div>
    );
  }

  // 進捗の最小値と最大値を計算（Y軸の範囲設定用）
  const progressValues = data.map(entry => entry.progress);
  const minProgress = Math.max(0, Math.min(...progressValues) - 10);
  const maxProgress = Math.min(100, Math.max(...progressValues) + 10);

  return (
    <div
      className={cn('w-full', className)}
      role="img"
      aria-label={ariaLabel || `進捗履歴チャート。${data.length}個のデータポイント`}
    >
      <ResponsiveContainer width={width || '100%'} height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onClick={(event: any) => {
            if (event && event.activePayload && event.activePayload[0]) {
              const payload = event.activePayload[0].payload;
              const date = parseISO(payload.timestamp);
              const progress = payload.progress;
              handleDateClick(date, progress);
            }
          }}
        >
          {/* グリッド */}
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} opacity={0.5} />
          )}

          {/* X軸（日付） */}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
          />

          {/* Y軸（進捗率） */}
          <YAxis
            domain={[minProgress, maxProgress]}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickFormatter={value => `${value}%`}
          />

          {/* ツールチップ */}
          {showTooltip && (
            <Tooltip
              content={
                <CustomTooltip significantChanges={significantChanges} progressHistory={data} />
              }
              cursor={{ stroke: chartColors.line, strokeWidth: 1, strokeDasharray: '5 5' }}
            />
          )}

          {/* 100%達成ライン */}
          <ReferenceLine
            y={100}
            stroke="#10b981"
            strokeDasharray="5 5"
            strokeWidth={1}
            opacity={0.7}
          />

          {/* 進捗ライン */}
          <Line
            type="monotone"
            dataKey="progress"
            stroke={chartColors.line}
            strokeWidth={2}
            dot={{ fill: chartColors.line, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: chartColors.line, strokeWidth: 2, fill: '#ffffff' }}
            connectNulls={false}
          />

          {/* 重要な変化点のハイライト */}
          {highlightSignificantChanges && significantChanges.length > 0 && (
            <Line
              type="monotone"
              dataKey="progress"
              stroke="transparent"
              dot={
                <CustomDot
                  significantChanges={significantChanges}
                  significantColor={chartColors.significant}
                  onDotClick={handleDateClick}
                />
              }
              activeDot={false}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* 凡例 */}
      {highlightSignificantChanges && significantChanges.length > 0 && (
        <div className="flex items-center justify-center mt-2 space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: chartColors.line }} />
            <span>進捗</span>
          </div>
          <div className="flex items-center space-x-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: chartColors.significant }}
            />
            <span>重要な変化</span>
          </div>
        </div>
      )}

      {/* 進捗詳細モーダル */}
      <ProgressDetailModal
        isOpen={isDetailModalOpen}
        selectedDate={selectedDate}
        selectedProgress={selectedProgress}
        progressHistory={data}
        significantChanges={significantChanges}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default ProgressHistoryChart;
