import React from 'react';
import { GoalStatus } from '../../types/mandala';

export interface StatusFilterProps {
  value: GoalStatus | 'all';
  onChange: (status: GoalStatus | 'all') => void;
  disabled?: boolean;
}

const FILTER_OPTIONS = [
  { value: 'all', label: '全て' },
  { value: GoalStatus.DRAFT, label: '下書き' },
  { value: GoalStatus.ACTIVE, label: '活動中' },
  { value: GoalStatus.COMPLETED, label: '完了' },
  { value: GoalStatus.PAUSED, label: '一時停止' },
] as const;

/**
 * StatusFilter - 目標状態によるフィルタードロップダウンコンポーネント
 *
 * @param value - 現在のフィルター値
 * @param onChange - 値変更時のコールバック
 * @param disabled - 無効化フラグ
 *
 * 要件:
 * - 6.1: TOP画面が表示される THEN フィルタードロップダウンが検索フィールドの横に表示される
 * - 6.2: フィルタードロップダウンを開く THEN 以下の選択肢が表示される：「全て」「下書き」「活動中」「完了」「一時停止」「中止」
 * - 6.3: フィルター条件を選択する THEN 選択した状態のマンダラチャートのみが表示される
 * - 6.4: フィルター条件が「全て」である THEN 全てのマンダラチャートが表示される
 * - 6.6: フィルター条件を変更する THEN 一覧が即座に更新される
 */
export const StatusFilter: React.FC<StatusFilterProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as GoalStatus | 'all';
    onChange(newValue);
  };

  const selectedOption = FILTER_OPTIONS.find(option => option.value === value);

  return (
    <div className="relative">
      <label htmlFor="status-filter" className="sr-only">
        目標状態でフィルター
      </label>
      <select
        id="status-filter"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label="目標状態でフィルター"
        aria-describedby="filter-description"
        className={`
          w-full px-4 py-3 sm:py-2
          border border-gray-300 rounded-lg bg-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          transition-colors duration-200
          appearance-none
          pr-10
          min-h-[44px]
          touch-manipulation
        `}
      >
        {FILTER_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* ドロップダウンアイコン */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* スクリーンリーダー用の説明 */}
      <span id="filter-description" className="sr-only">
        {selectedOption?.label}でフィルタリング中
      </span>
    </div>
  );
};

StatusFilter.displayName = 'StatusFilter';
