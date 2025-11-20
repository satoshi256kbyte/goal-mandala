import React, { useRef, useEffect } from 'react';
import { useFocusVisible } from '../../hooks/useAccessibility';

/**
 * ローディングボタンコンポーネントのProps
 */
export interface LoadingButtonProps {
  /** ローディング状態 */
  isLoading: boolean;
  /** ボタンの子要素 */
  children: React.ReactNode;
  /** ボタンのタイプ */
  type?: 'button' | 'submit' | 'reset';
  /** 追加のCSSクラス */
  className?: string;
  /** クリックイベントハンドラー */
  onClick?: () => void;
  /** ボタンの無効状態 */
  disabled?: boolean;
  /** ボタンのバリアント */
  variant?: 'primary' | 'secondary' | 'danger';
  /** ボタンのサイズ */
  size?: 'sm' | 'md' | 'lg';
  /** ローディング時のテキスト */
  loadingText?: string;
  /** ボタンの説明（アクセシビリティ用） */
  ariaLabel?: string;
  /** ボタンの詳細説明 */
  ariaDescribedBy?: string;
}

/**
 * ローディングボタンコンポーネント
 *
 * 非同期処理中にローディング状態を表示するボタンコンポーネントです。
 * アクセシビリティを考慮し、ローディング中は適切な状態を伝えます。
 * キーボードナビゲーション、フォーカス管理、色覚対応を含みます。
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  type = 'button',
  className = '',
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  loadingText,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { focusVisibleClasses } = useFocusVisible();
  const { announce } = useLiveRegion();

  // ローディング状態の変更をアナウンス
  useEffect(() => {
    if (isLoading) {
      announce('処理を開始しました。しばらくお待ちください。', 'polite');
    }
  }, [isLoading, announce]);

  // バリアント別のスタイル（色覚対応を含む）
  const variantStyles = {
    primary: `
      bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white
      border-2 border-blue-600 hover:border-blue-700
      disabled:bg-blue-300 disabled:border-blue-300
    `,
    secondary: `
      bg-white hover:bg-gray-50 focus:ring-gray-500 text-gray-700
      border-2 border-gray-300 hover:border-gray-400
      disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-400
    `,
    danger: `
      bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white
      border-2 border-red-600 hover:border-red-700
      disabled:bg-red-300 disabled:border-red-300
    `,
  };

  // サイズ別のスタイル
  const sizeStyles = {
    sm: 'px-3 py-2 text-sm min-h-[2rem]',
    md: 'px-4 py-2 text-base min-h-[2.5rem]',
    lg: 'px-6 py-3 text-lg min-h-[3rem]',
  };

  // 基本スタイル
  const baseStyles = `
    relative flex justify-center items-center
    font-medium rounded-md
    focus:outline-none focus:ring-2 focus:ring-offset-2
    transition-all duration-200
    disabled:cursor-not-allowed
    ${focusVisibleClasses}
  `;

  const buttonStyles = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `;

  const isDisabled = disabled || isLoading;

  // キーボードイベントハンドラー
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    // Enterキーでの実行
    if (event.key === 'Enter' && !isDisabled && onClick) {
      event.preventDefault();
      onClick();
    }

    // Spaceキーでの実行
    if (event.key === ' ' && !isDisabled && onClick) {
      event.preventDefault();
      onClick();
    }
  };

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={buttonStyles}
      aria-busy={isLoading}
      aria-disabled={isDisabled}
      aria-label={ariaLabel || (isLoading ? `${loadingText || children} - 処理中` : undefined)}
      aria-describedby={ariaDescribedBy}
      tabIndex={isDisabled ? -1 : 0}
    >
      {isLoading && (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
            role="img"
            aria-label="読み込み中"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {/* スクリーンリーダー用の説明 */}
          <span className="sr-only">処理中です。しばらくお待ちください。</span>
        </>
      )}

      <span className={isLoading ? 'opacity-75' : ''}>
        {isLoading ? loadingText || children : children}
      </span>

      {/* 高コントラストモード用の追加スタイル */}
      <style>{`
        @media (prefers-contrast: high) {
          button {
            border-width: 3px !important;
          }

          button:focus {
            outline: 3px solid currentColor !important;
            outline-offset: 2px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-spin {
            animation: none !important;
          }

          .transition-all {
            transition: none !important;
          }
        }
      `}</style>
    </button>
  );
};

export default LoadingButton;
