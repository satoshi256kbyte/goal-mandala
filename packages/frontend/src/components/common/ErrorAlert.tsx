import React from 'react';
import { LoadingButton } from './LoadingButton';

/**
 * エラーアラートコンポーネントのProps
 */
export interface ErrorAlertProps {
  /** エラーメッセージ */
  error?: string | null;
  /** 再試行可能かどうか */
  isRetryable?: boolean;
  /** ネットワークエラーかどうか */
  isNetworkError?: boolean;
  /** 再試行ボタンのローディング状態 */
  isRetrying?: boolean;
  /** 再試行ボタンのクリックハンドラー */
  onRetry?: () => void;
  /** エラーを閉じるハンドラー */
  onClose?: () => void;
  /** 追加のCSSクラス */
  className?: string;
  /** エラーのタイトル */
  title?: string;
  /** 自動で閉じるまでの時間（ミリ秒）。0の場合は自動で閉じない */
  autoCloseDelay?: number;
}

/**
 * エラーアラートコンポーネント
 *
 * エラーメッセージを視覚的に目立つ形で表示し、
 * 必要に応じて再試行ボタンや閉じるボタンを提供します。
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  isRetryable = false,
  isNetworkError = false,
  isRetrying = false,
  onRetry,
  onClose,
  className = '',
  title,
  autoCloseDelay = 0,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // 自動クローズ機能
  React.useEffect(() => {
    if (autoCloseDelay > 0 && error) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoCloseDelay, onClose]);

  // エラーが変更されたら表示状態をリセット
  React.useEffect(() => {
    if (error) {
      setIsVisible(true);
    }
  }, [error]);

  if (!error || !isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleRetry = () => {
    onRetry?.();
  };

  // エラーの種類に応じたアイコンとスタイル
  const getErrorIcon = () => {
    if (isNetworkError) {
      return (
        <svg
          className="h-5 w-5 text-orange-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg
        className="h-5 w-5 text-red-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const alertStyles = isNetworkError
    ? 'bg-orange-50 border-orange-200'
    : 'bg-red-50 border-red-200';

  return (
    <div
      className={`rounded-md border p-4 ${alertStyles} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex">
        <div className="flex-shrink-0">{getErrorIcon()}</div>
        <div className="ml-3 flex-1">
          {title && (
            <h3
              className={`text-sm font-medium ${isNetworkError ? 'text-orange-800' : 'text-red-800'}`}
            >
              {title}
            </h3>
          )}
          <div
            className={`${title ? 'mt-2' : ''} text-sm ${isNetworkError ? 'text-orange-700' : 'text-red-700'}`}
          >
            <p className="text-current">{error}</p>
          </div>

          {(isRetryable || onClose) && (
            <div className="mt-4">
              <div className="flex space-x-2">
                {isRetryable && onRetry && (
                  <LoadingButton
                    isLoading={isRetrying}
                    onClick={handleRetry}
                    variant="secondary"
                    size="sm"
                    className={`${
                      isNetworkError
                        ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 focus:ring-orange-500'
                        : 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-red-500'
                    }`}
                    loadingText="再試行中..."
                  >
                    再試行
                  </LoadingButton>
                )}
                {onClose && (
                  <button
                    type="button"
                    onClick={handleClose}
                    className={`text-sm font-medium ${
                      isNetworkError
                        ? 'text-orange-800 hover:text-orange-900'
                        : 'text-red-800 hover:text-red-900'
                    } focus:outline-none focus:underline`}
                  >
                    閉じる
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={handleClose}
                className={`inline-flex rounded-md p-1.5 ${
                  isNetworkError
                    ? 'text-orange-500 hover:bg-orange-100 focus:ring-orange-500'
                    : 'text-red-500 hover:bg-red-100 focus:ring-red-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                aria-label="エラーメッセージを閉じる"
              >
                <svg
                  className="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;
