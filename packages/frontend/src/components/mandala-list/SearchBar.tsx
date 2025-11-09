import React, { useRef } from 'react';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * SearchBar - 検索入力フィールドコンポーネント
 *
 * @param value - 検索キーワード
 * @param onChange - 値変更時のコールバック
 * @param onClear - クリア時のコールバック
 * @param placeholder - プレースホルダーテキスト
 * @param disabled - 無効化フラグ
 *
 * 要件:
 * - 5.1: TOP画面が表示される THEN 検索入力フィールドが画面上部に表示される
 * - 5.2: 検索入力フィールドにキーワードを入力する THEN 入力した文字がリアルタイムで表示される
 * - 5.3: 検索キーワードを入力する THEN Systemは目標タイトルと目標説明を対象に部分一致検索を実行する
 * - 5.6: 検索キーワードをクリアする THEN 全てのマンダラチャートが再表示される
 * - 5.7: 検索入力フィールドにフォーカスする THEN プレースホルダー「目標を検索...」が表示される
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = '目標を検索...',
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onClear();
    // クリア後にフォーカスを戻す
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Escapeキーでクリア
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div className="relative w-full">
      {/* 検索アイコン */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* 検索入力フィールド */}
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="マンダラチャートを検索"
        aria-describedby="search-description"
        className={`
          w-full pl-10 pr-10 py-3 sm:py-2
          border border-gray-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          transition-colors duration-200
          min-h-[44px]
          touch-manipulation
        `}
      />

      {/* クリアボタン */}
      {value && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="検索をクリア"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
        >
          <svg
            className="w-5 h-5"
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
      )}

      {/* スクリーンリーダー用の説明 */}
      <span id="search-description" className="sr-only">
        目標タイトルと説明を検索します
      </span>
    </div>
  );
};

SearchBar.displayName = 'SearchBar';
