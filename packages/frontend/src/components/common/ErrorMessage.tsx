import React from 'react';
import { useColorAccessibility } from '../../hooks/useAccessibility';

/**
 * エラーメッセージコンポーネントのProps
 */
export interface ErrorMessageProps {
  /** エラーメッセージ */
  error?: string;
  /** エラーメッセージ（別名） */
  message?: string;
  /** 追加のCSSクラス */
  className?: string;
  /** エラーメッセージのID（アクセシビリティ用） */
  id?: string;
  /** エラーの種類 */
  type?: 'error' | 'warning' | 'info';
  /** アイコンを表示するかどうか */
  showIcon?: boolean;
}

/**
 * エラーメッセージコンポーネント
 *
 * フォームのバリデーションエラーや認証エラーなどを表示するために使用します。
 * アクセシビリティを考慮し、適切なARIA属性を設定しています。
 * 色覚対応とコントラスト比の確保も行っています。
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  message,
  className = '',
  id,
  type = 'error',
  showIcon = true,
}) => {
  const errorMessage = error || message;
  const { getAccessibleColors } = useColorAccessibility();

  if (!errorMessage) return null;

  const colors = getAccessibleColors();
  const colorScheme = colors[type];

  // エラータイプに応じたアイコン
  const getIcon = () => {
    if (!showIcon) return null;

    switch (type) {
      case 'error':
        return (
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'info':
        return (
          <svg
            className="h-4 w-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // エラータイプに応じたARIAラベル
  const getAriaLabel = () => {
    switch (type) {
      case 'error':
        return 'エラー';
      case 'warning':
        return '警告';
      case 'info':
        return '情報';
      default:
        return 'メッセージ';
    }
  };

  return (
    <div
      id={id}
      role="alert"
      className={`flex items-start space-x-2 text-sm mt-1 p-2 rounded-md border ${colorScheme.bg} ${colorScheme.border} ${colorScheme.text} ${className}`}
      aria-live="polite"
      aria-label={getAriaLabel()}
    >
      {showIcon && <span className={`${colorScheme.icon} mt-0.5`}>{getIcon()}</span>}
      <span className="flex-1">
        <span className="sr-only">{getAriaLabel()}: </span>
        {errorMessage}
      </span>
    </div>
  );
};

export default ErrorMessage;
