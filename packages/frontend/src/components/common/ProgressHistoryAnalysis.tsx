/**
 * 進捗履歴分析コンポーネント
 * 進捗トレンド分析、重要な変化点の自動検出、履歴データ分析機能
 * 要件: 5.4, 5.5
 */

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '../../utils/cn';
import {
  ProgressHistoryEntry,
  ProgressTrend,
  SignificantChange,
} from '../../services/progress-history-service';

export interface ProgressHistoryAnalysisProps {
  /** 進捗履歴データ */
  historyData: ProgressHistoryEntry[];
  /** 重要な変化点データ */
  significantChanges: SignificantChange[];
  /** 進捗トレンド */
  trend: ProgressTrend;
  /** エンティティID */
  entityId: string;
  /** 分析期間（日数） */
  analysisPeriod?: number;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * トレンド方向のアイコンコンポーネント
 */
const TrendIcon: React.FC<{ direction: 'increasing' | 'decreasing' | 'stable' }> = ({
  direction,
}) => {
  const iconConfig = {
    increasing: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    decreasing: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
          />
        </svg>
      ),
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    stable: {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
        </svg>
      ),
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
    },
  };

  const config = iconConfig[direction];

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-full border',
        config.color,
        config.bgColor,
        config.borderColor
      )}
    >
      {config.icon}
    </div>
  );
};

/**
 * 信頼度インジケーターコンポーネント
 */
const ConfidenceIndicator: React.FC<{ confidence: number }> = ({ confidence }) => {
  const confidencePercentage = Math.round(confidence * 100);
  const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';

  const levelConfig = {
    high: { color: 'bg-green-500', text: '高', textColor: 'text-green-700' },
    medium: { color: 'bg-yellow-500', text: '中', textColor: 'text-yellow-700' },
    low: { color: 'bg-red-500', text: '低', textColor: 'text-red-700' },
  };

  const config = levelConfig[confidenceLevel];

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1">
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', config.color)}
            style={{ width: `${confidencePercentage}%` }}
          />
        </div>
        <span className={cn('text-xs font-medium', config.textColor)}>{confidencePercentage}%</span>
      </div>
      <span className={cn('text-xs px-2 py-1 rounded-full bg-gray-100', config.textColor)}>
        信頼度{config.text}
      </span>
    </div>
  );
};

/**
 * 進捗統計情報の計算
 */
interface ProgressStats {
  totalDays: number;
  activeDays: number;
  averageProgress: number;
  maxProgress: number;
  minProgress: number;
  totalChange: number;
  averageDailyChange: number;
  bestDay: { date: Date; progress: number; change: number } | null;
  worstDay: { date: Date; progress: number; change: number } | null;
}

const calculateProgressStats = (historyData: ProgressHistoryEntry[]): ProgressStats => {
  if (historyData.length === 0) {
    return {
      totalDays: 0,
      activeDays: 0,
      averageProgress: 0,
      maxProgress: 0,
      minProgress: 0,
      totalChange: 0,
      averageDailyChange: 0,
      bestDay: null,
      worstDay: null,
    };
  }

  const progresses = historyData.map(entry => entry.progress);
  const totalDays = historyData.length;
  const activeDays = historyData.filter(entry => entry.progress > 0).length;
  const averageProgress = progresses.reduce((sum, p) => sum + p, 0) / totalDays;
  const maxProgress = Math.max(...progresses);
  const minProgress = Math.min(...progresses);
  const totalChange =
    historyData.length > 1
      ? historyData[historyData.length - 1].progress - historyData[0].progress
      : 0;

  // 日次変化を計算
  const dailyChanges: { date: Date; progress: number; change: number }[] = [];
  for (let i = 1; i < historyData.length; i++) {
    const change = historyData[i].progress - historyData[i - 1].progress;
    dailyChanges.push({
      date: historyData[i].timestamp,
      progress: historyData[i].progress,
      change,
    });
  }

  const averageDailyChange =
    dailyChanges.length > 0
      ? dailyChanges.reduce((sum, d) => sum + d.change, 0) / dailyChanges.length
      : 0;

  const bestDay =
    dailyChanges.length > 0
      ? dailyChanges.reduce((best, current) => (current.change > best.change ? current : best))
      : null;

  const worstDay =
    dailyChanges.length > 0
      ? dailyChanges.reduce((worst, current) => (current.change < worst.change ? current : worst))
      : null;

  return {
    totalDays,
    activeDays,
    averageProgress: Math.round(averageProgress),
    maxProgress,
    minProgress,
    totalChange: Math.round(totalChange),
    averageDailyChange: Math.round(averageDailyChange * 10) / 10,
    bestDay,
    worstDay,
  };
};

/**
 * 進捗履歴分析コンポーネント
 */
export const ProgressHistoryAnalysis: React.FC<ProgressHistoryAnalysisProps> = ({
  historyData,
  significantChanges,
  trend,
  className,
}) => {
  // 進捗統計を計算
  const stats = useMemo(() => calculateProgressStats(historyData), [historyData]);

  // トレンドの説明文を生成
  const trendDescription = useMemo(() => {
    const { direction, rate, confidence } = trend;

    if (confidence < 0.3) {
      return 'データが不十分なため、明確なトレンドを判定できません。';
    }

    const rateText = rate > 5 ? '急激に' : rate > 2 ? '着実に' : 'ゆっくりと';

    switch (direction) {
      case 'increasing':
        return `進捗は${rateText}向上しています。このペースを維持しましょう。`;
      case 'decreasing':
        return `進捗が${rateText}低下しています。原因を確認し、対策を検討しましょう。`;
      case 'stable':
        return '進捗は安定しています。継続的な取り組みが重要です。';
      default:
        return '進捗の傾向を分析中です。';
    }
  }, [trend]);

  // データが存在しない場合の表示
  if (historyData.length === 0) {
    return (
      <div className={cn('bg-gray-50 rounded-lg p-6 text-center', className)}>
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">履歴データがありません</h3>
        <p className="text-sm text-gray-500">タスクを完了すると進捗分析が表示されます</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* トレンド分析 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">進捗トレンド分析</h3>

        <div className="flex items-start space-x-4">
          <TrendIcon direction={trend.direction} />

          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-sm font-medium text-gray-700">
                {trend.direction === 'increasing'
                  ? '上昇傾向'
                  : trend.direction === 'decreasing'
                    ? '下降傾向'
                    : '安定'}
              </span>
              <span className="text-sm text-gray-500">変化率: {trend.rate.toFixed(1)}%/日</span>
            </div>

            <p className="text-sm text-gray-600 mb-3">{trendDescription}</p>

            <ConfidenceIndicator confidence={trend.confidence} />
          </div>
        </div>
      </div>

      {/* 進捗統計 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">進捗統計</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div>
            <div className="text-sm text-gray-500">記録日数</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.averageProgress}%</div>
            <div className="text-sm text-gray-500">平均進捗</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.maxProgress}%</div>
            <div className="text-sm text-gray-500">最高進捗</div>
          </div>

          <div className="text-center">
            <div
              className={cn(
                'text-2xl font-bold',
                stats.totalChange >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {stats.totalChange >= 0 ? '+' : ''}
              {stats.totalChange}%
            </div>
            <div className="text-sm text-gray-500">総変化</div>
          </div>
        </div>
      </div>

      {/* 重要な変化点 */}
      {significantChanges.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">重要な変化点</h3>

          <div className="space-y-3">
            {significantChanges.slice(0, 5).map((change, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200"
              >
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-amber-800">
                      {format(change.date, 'MM月dd日', { locale: ja })}
                    </span>
                    <span className="text-sm text-amber-600">
                      {change.change > 0 ? '+' : ''}
                      {change.change}%の変化
                    </span>
                  </div>
                  {change.reason && <p className="text-sm text-amber-700">{change.reason}</p>}
                </div>
                <div className="text-lg font-bold text-amber-800">{change.progress}%</div>
              </div>
            ))}

            {significantChanges.length > 5 && (
              <div className="text-center">
                <span className="text-sm text-gray-500">
                  他 {significantChanges.length - 5} 件の重要な変化
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ベスト・ワーストデイ */}
      {(stats.bestDay || stats.worstDay) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">注目すべき日</h3>

          <div className="grid md:grid-cols-2 gap-4">
            {stats.bestDay && stats.bestDay.change > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  <span className="text-sm font-medium text-green-800">最も進捗した日</span>
                </div>
                <div className="text-lg font-bold text-green-900">
                  {format(stats.bestDay.date, 'MM月dd日', { locale: ja })}
                </div>
                <div className="text-sm text-green-700">
                  +{stats.bestDay.change}% ({stats.bestDay.progress}%に到達)
                </div>
              </div>
            )}

            {stats.worstDay && stats.worstDay.change < 0 && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="w-5 h-5 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-800">最も後退した日</span>
                </div>
                <div className="text-lg font-bold text-red-900">
                  {format(stats.worstDay.date, 'MM月dd日', { locale: ja })}
                </div>
                <div className="text-sm text-red-700">
                  {stats.worstDay.change}% ({stats.worstDay.progress}%に低下)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 推奨アクション */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">推奨アクション</h3>

        <div className="space-y-3">
          {trend.direction === 'increasing' && trend.confidence > 0.5 && (
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-blue-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-blue-800">
                良いペースで進捗しています。現在の取り組みを継続しましょう。
              </p>
            </div>
          )}

          {trend.direction === 'decreasing' && trend.confidence > 0.5 && (
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-blue-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <p className="text-sm text-blue-800">
                進捗が低下しています。タスクの見直しや優先順位の調整を検討しましょう。
              </p>
            </div>
          )}

          {trend.direction === 'stable' && (
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-blue-500 mt-0.5"
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
              <p className="text-sm text-blue-800">
                進捗は安定しています。新しいアプローチで加速を図ることを検討しましょう。
              </p>
            </div>
          )}

          {stats.activeDays / stats.totalDays < 0.5 && (
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-blue-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-blue-800">
                活動日数が少ないようです。定期的な取り組みを心がけましょう。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressHistoryAnalysis;
