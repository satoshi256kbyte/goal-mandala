import React from 'react';

export type SortOption =
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'deadline_asc'
  | 'deadline_desc'
  | 'progress_desc'
  | 'progress_asc';

export interface SortDropdownProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
  disabled?: boolean;
}

const SORT_OPTIONS = [
  { value: 'created_at_desc' as const, label: '作成日時（新しい順）' },
  { value: 'created_at_asc' as const, label: '作成日時（古い順）' },
  { value: 'updated_at_desc' as const, label: '更新日時（新しい順）' },
  { value: 'updated_at_asc' as const, label: '更新日時（古い順）' },
  { value: 'deadline_asc' as const, label: '達成期限（近い順）' },
  { value: 'deadline_desc' as const, label: '達成期限（遠い順）' },
  { value: 'progress_desc' as const, label: '進捗率（高い順）' },
  { value: 'progress_asc' as const, label: '進捗率（低い順）' },
] as const;

/**
 * SortDropdown - ソート条件選択ドロップダウンコンポーネント
 *
 * @param value - 現在のソート条件
 * @param onChange - 値変更時のコールバック
 * @param disabled - 無効化フラグ
 *
 * 要件:
 * - 7.1: TOP画面が表示される THEN ソートドロップダウンがフィルタードロップダウンの横に表示される
 * - 7.2: ソートドロップダウンを開く THEN 以下の選択肢が表示される：「作成日時（新しい順）」「作成日時（古い順）」「更新日時（新しい順）」「更新日時（古い順）」「達成期限（近い順）」「達成期限（遠い順）」「進捗率（高い順）」「進捗率（低い順）」
 * - 7.3: ソート条件を選択する THEN 選択した条件でマンダラチャートが並び替えられる
 * - 7.4: ソート条件が「作成日時（新しい順）」である THEN 作成日時の降順で表示される
 * - 7.5: ソート条件が「達成期限（近い順）」である THEN 達成期限の昇順で表示される
 * - 7.6: ソート条件を変更する THEN 一覧が即座に更新される
 */
export const SortDropdown: React.FC<SortDropdownProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as SortOption;
    onChange(newValue);
  };

  const selectedOption = SORT_OPTIONS.find(option => option.value === value);

  return (
    <div className="relative">
      <label htmlFor="sort-dropdown" className="sr-only">
        並び替え
      </label>
      <select
        id="sort-dropdown"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label="並び替え"
        aria-describedby="sort-description"
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
        {SORT_OPTIONS.map(option => (
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
      <span id="sort-description" className="sr-only">
        {selectedOption?.label}で並び替え中
      </span>
    </div>
  );
};

SortDropdown.displayName = 'SortDropdown';
