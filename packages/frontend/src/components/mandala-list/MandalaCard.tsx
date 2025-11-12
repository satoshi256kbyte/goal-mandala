import React, { useMemo, useCallback } from 'react';
import { MandalaChartSummary } from '../../types/mandala-list';
import { GoalStatus } from '../../types/mandala';
import { StatusBadge } from './StatusBadge';
import { ProgressCircle } from './ProgressCircle';

export interface MandalaCardProps {
  mandala: MandalaChartSummary;
  onClick: (id: string) => void;
  className?: string;
}

/**
 * MandalaCard - マンダラチャートカードコンポーネント
 *
 * マンダラチャートの概要を表示するカードコンポーネント
 *
 * @param mandala - マンダラチャートサマリー
 * @param onClick - カードクリック時のコールバック
 * @param className - 追加のCSSクラス
 *
 * 要件:
 * - 2.1: カード形式で表示される
 * - 2.2: 進捗率が円形プログレスバーで視覚的に表示される
 * - 2.3-2.5: 進捗率に応じた色分け（ProgressCircleで実装）
 * - 2.6-2.10: 状態バッジの表示（StatusBadgeで実装）
 * - 2.11: 期限切れ警告アイコンの表示
 * - 3.1: カードクリックで詳細画面に遷移
 * - 3.2-3.3: ホバー・フォーカス効果
 * - 3.4: キーボード操作対応（Enter/Space）
 * - 15.1-15.5: パフォーマンス最適化（メモ化）
 */
const MandalaCardComponent: React.FC<MandalaCardProps> = ({ mandala, onClick, className = '' }) => {
  // 期限切れ判定（メモ化）
  const isOverdue = useMemo(
    () => mandala.status === GoalStatus.ACTIVE && new Date(mandala.deadline) < new Date(),
    [mandala.status, mandala.deadline]
  );

  // クリックハンドラー（メモ化）
  const handleClick = useCallback(() => {
    onClick(mandala.id);
  }, [onClick, mandala.id]);

  // キーボードイベントハンドラー（Enter/Space）（メモ化）
  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(mandala.id);
      }
    },
    [onClick, mandala.id]
  );

  // 日付フォーマット（メモ化）
  const formatDate = useCallback((date: Date): string => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, []);

  // フォーマット済み日付（メモ化）
  const formattedDeadline = useMemo(
    () => formatDate(mandala.deadline),
    [formatDate, mandala.deadline]
  );
  const formattedCreatedAt = useMemo(
    () => formatDate(mandala.createdAt),
    [formatDate, mandala.createdAt]
  );
  const formattedUpdatedAt = useMemo(
    () => formatDate(mandala.updatedAt),
    [formatDate, mandala.updatedAt]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${mandala.title}のマンダラチャート、進捗率${mandala.progress}%`}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      className={`
        bg-white rounded-lg shadow-sm border border-gray-200
        hover:shadow-md hover:border-blue-300
        focus:outline-none focus:ring-2 focus:ring-blue-500
        transition-all duration-200 cursor-pointer
        touch-manipulation
        active:scale-[0.98]
        ${className}
      `}
    >
      {/* カードヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100" role="banner">
        <StatusBadge status={mandala.status} />
        {isOverdue && (
          <div
            className="flex items-center text-red-600"
            role="alert"
            aria-live="polite"
            aria-atomic="true"
            aria-label="期限切れ"
            title="期限切れ"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* カードボディ */}
      <div className="p-4" role="article">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-4">
            {/* タイトル（最大2行、省略記号） */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {mandala.title}
            </h3>
            {/* 説明（最大3行、省略記号） */}
            <p className="text-sm text-gray-600 line-clamp-3">{mandala.description}</p>
          </div>
          {/* 進捗円グラフ */}
          <div className="flex-shrink-0" role="img" aria-label={`進捗率 ${mandala.progress}%`}>
            <ProgressCircle progress={mandala.progress} size="md" showLabel={true} />
          </div>
        </div>
      </div>

      {/* カードフッター */}
      <div
        className="px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg"
        role="contentinfo"
      >
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            {/* 達成期限 */}
            <div className="flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>期限: {formattedDeadline}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* 作成日時 */}
            <span>作成: {formattedCreatedAt}</span>
            {/* 更新日時 */}
            <span>更新: {formattedUpdatedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

MandalaCardComponent.displayName = 'MandalaCard';

// メモ化されたコンポーネントをエクスポート
export const MandalaCard = React.memo(MandalaCardComponent);
