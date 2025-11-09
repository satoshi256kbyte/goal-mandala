import React from 'react';
import { GoalStatus } from '../../types/mandala';

export interface StatusBadgeProps {
  status: GoalStatus;
  className?: string;
}

const STATUS_CONFIG = {
  [GoalStatus.DRAFT]: {
    label: '下書き',
    className: 'bg-gray-100 text-gray-800',
  },
  [GoalStatus.ACTIVE]: {
    label: '活動中',
    className: 'bg-blue-100 text-blue-800',
  },
  [GoalStatus.COMPLETED]: {
    label: '完了',
    className: 'bg-green-100 text-green-800',
  },
  [GoalStatus.PAUSED]: {
    label: '一時停止',
    className: 'bg-orange-100 text-orange-800',
  },
} as const;

/**
 * StatusBadge - 目標状態を表示するバッジコンポーネント
 *
 * @param status - 目標の状態（draft/active/completed/paused）
 * @param className - 追加のCSSクラス
 *
 * 要件:
 * - 2.6: 目標状態が「下書き」である THEN グレーのバッジで「下書き」と表示される
 * - 2.7: 目標状態が「活動中」である THEN 青色のバッジで「活動中」と表示される
 * - 2.8: 目標状態が「完了」である THEN 緑色のバッジで「完了」と表示される
 * - 2.9: 目標状態が「一時停止」である THEN オレンジ色のバッジで「一時停止」と表示される
 * - 15.1-15.5: パフォーマンス最適化（メモ化）
 */
const StatusBadgeComponent: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status];

  if (!config) {
    console.warn(`Unknown status: ${status}`);
    return null;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
      role="status"
      aria-label={`状態: ${config.label}`}
    >
      {config.label}
    </span>
  );
};

StatusBadgeComponent.displayName = 'StatusBadge';

// メモ化されたコンポーネントをエクスポート
export const StatusBadge = React.memo(StatusBadgeComponent);
