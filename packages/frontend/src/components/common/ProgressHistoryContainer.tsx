/**
 * 進捗履歴コンテナコンポーネント
 * 進捗履歴の表示、分析、インタラクション機能を統合
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../utils/cn';
import {
  ProgressHistoryEntry,
  ProgressTrend,
  SignificantChange,
  progressHistoryService,
  ProgressHistoryQuery,
} from '../../services/progress-history-service';
import { ProgressHistoryChart } from './ProgressHistoryChart';
import { ProgressHistoryDetail } from './ProgressHistoryDetail';
import { ProgressHistoryAnalysis } from './ProgressHistoryAnalysis';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

export interface ProgressHistoryContainerProps {
  /** エンティティID */
  entityId: string;
  /** エンティティタイプ */
  entityType: 'goal' | 'subgoal' | 'action' | 'task';
  /** 表示期間（日数） */
  displayPeriod?: number;
  /** 初期表示タブ */
  defaultTab?: 'chart' | 'analysis';
  /** 追加のCSSクラス */
  className?: string;
  /** エラー時のコールバック */
  onError?: (error: Error) => void;
}

/**
 * タブの種類
 */
type TabType = 'chart' | 'analysis';

/**
 * ローディング状態の管理
 */
interface LoadingState {
  history: boolean;
  trend: boolean;
  significantChanges: boolean;
}

/**
 * 進捗履歴コンテナコンポーネント
 */
export const ProgressHistoryContainer: React.FC<ProgressHistoryContainerProps> = ({
  entityId,
  entityType,
  displayPeriod = 30,
  defaultTab = 'chart',
  className,
  onError,
}) => {
  // 状態管理
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [historyData, setHistoryData] = useState<ProgressHistoryEntry[]>([]);
  const [trend, setTrend] = useState<ProgressTrend>({
    direction: 'stable',
    rate: 0,
    confidence: 0,
  });
  const [significantChanges, setSignificantChanges] = useState<SignificantChange[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    history: true,
    trend: true,
    significantChanges: true,
  });
  const [error, setError] = useState<string | null>(null);

  // 詳細表示の状態
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedProgress, setSelectedProgress] = useState<number | undefined>();
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  /**
   * エラーハンドリング
   */
  const handleError = useCallback(
    (err: Error, context: string) => {
      console.error(`Progress history error (${context}):`, err);
      setError(`${context}でエラーが発生しました: ${err.message}`);
      if (onError) {
        onError(err);
      }
    },
    [onError]
  );

  /**
   * 進捗履歴データの取得
   */
  const fetchHistoryData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, history: true }));
      setError(null);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - displayPeriod * 24 * 60 * 60 * 1000);

      const query: ProgressHistoryQuery = {
        entityId,
        entityType,
        startDate,
        endDate,
      };

      const data = await progressHistoryService.getProgressHistory(query);
      setHistoryData(data);
    } catch (err) {
      handleError(err as Error, '履歴データの取得');
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  }, [entityId, entityType, displayPeriod, handleError]);

  /**
   * 進捗トレンドの取得
   */
  const fetchTrendData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, trend: true }));

      const trendData = await progressHistoryService.getProgressTrend(entityId, displayPeriod);
      setTrend(trendData);
    } catch (err) {
      handleError(err as Error, 'トレンド分析');
    } finally {
      setLoading(prev => ({ ...prev, trend: false }));
    }
  }, [entityId, displayPeriod, handleError]);

  /**
   * 重要な変化点の取得
   */
  const fetchSignificantChanges = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, significantChanges: true }));

      const changes = await progressHistoryService.getSignificantChanges(entityId, 10);
      setSignificantChanges(changes);
    } catch (err) {
      handleError(err as Error, '重要な変化点の取得');
    } finally {
      setLoading(prev => ({ ...prev, significantChanges: false }));
    }
  }, [entityId, handleError]);

  /**
   * 全データの取得
   */
  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchHistoryData(), fetchTrendData(), fetchSignificantChanges()]);
  }, [fetchHistoryData, fetchTrendData, fetchSignificantChanges]);

  /**
   * データの再取得
   */
  const refreshData = useCallback(() => {
    fetchAllData();
  }, [fetchAllData]);

  /**
   * 日付クリック時の処理
   */
  const handleDateClick = useCallback((date: Date, progress: number) => {
    setSelectedDate(date);
    setSelectedProgress(progress);
    setIsDetailVisible(true);
  }, []);

  /**
   * 詳細表示を閉じる処理
   */
  const handleCloseDetail = useCallback(() => {
    setIsDetailVisible(false);
    setSelectedDate(undefined);
    setSelectedProgress(undefined);
  }, []);

  /**
   * 初期データ取得
   */
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /**
   * 全体のローディング状態
   */
  const isLoading = loading.history || loading.trend || loading.significantChanges;

  /**
   * タブの設定
   */
  const tabs = [
    { id: 'chart' as const, label: 'チャート', icon: '📊' },
    { id: 'analysis' as const, label: '分析', icon: '📈' },
  ];

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200', className)}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">進捗履歴</h2>

        <div className="flex items-center space-x-2">
          {/* 更新ボタン */}
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="データを更新"
          >
            <svg
              className={cn('w-4 h-4', isLoading && 'animate-spin')}
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
          </button>

          {/* 期間表示 */}
          <span className="text-sm text-gray-500">過去{displayPeriod}日間</span>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-4 border-b border-gray-200">
          <ErrorMessage error={error} />
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* コンテンツエリア */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <>
            {/* チャートタブ */}
            {activeTab === 'chart' && (
              <div className="space-y-4">
                <ProgressHistoryChart
                  data={historyData}
                  significantChanges={significantChanges}
                  height={300}
                  showGrid={true}
                  showTooltip={true}
                  highlightSignificantChanges={true}
                  onDateClick={handleDateClick}
                  aria-label={`${entityType}の進捗履歴チャート`}
                />

                {/* データサマリー */}
                {historyData.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {historyData.length}
                        </div>
                        <div className="text-sm text-gray-500">記録日数</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-blue-600">
                          {historyData[historyData.length - 1]?.progress || 0}%
                        </div>
                        <div className="text-sm text-gray-500">現在の進捗</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-green-600">
                          {Math.max(...historyData.map(h => h.progress))}%
                        </div>
                        <div className="text-sm text-gray-500">最高進捗</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-amber-600">
                          {significantChanges.length}
                        </div>
                        <div className="text-sm text-gray-500">重要な変化</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 分析タブ */}
            {activeTab === 'analysis' && (
              <ProgressHistoryAnalysis
                historyData={historyData}
                significantChanges={significantChanges}
                trend={trend}
                entityId={entityId}
                analysisPeriod={displayPeriod}
              />
            )}
          </>
        )}
      </div>

      {/* 詳細表示モーダル */}
      <ProgressHistoryDetail
        selectedDate={selectedDate}
        selectedProgress={selectedProgress}
        historyData={historyData}
        significantChanges={significantChanges}
        isVisible={isDetailVisible}
        onClose={handleCloseDetail}
      />
    </div>
  );
};

export default ProgressHistoryContainer;
