import React, { useEffect, useState, useCallback } from 'react';

export interface ErrorDisplayProps {
  /** エラーメッセージ */
  message: string;
  /** エラータイプ */
  type?: 'api' | 'network' | 'auth' | 'unknown';
  /** 再試行コールバック */
  onRetry?: () => void;
  /** 閉じるコールバック */
  onClose?: () => void;
  /** 自動非表示までの時間（ミリ秒）、0の場合は自動非表示しない */
  autoHideDuration?: number;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * ErrorDisplay - エラー表示コンポーネント
 *
 * エラーメッセージを表示し、再試行や閉じる機能を提供します。
 *
 * @param message - エラーメッセージ
 * @param type - エラータイプ（api/network/auth/unknown）
 * @param onRetry - 再試行コールバック
 * @param onClose - 閉じるコールバック
 * @param autoHideDuration - 自動非表示までの時間（ミリ秒）
 * @param className - 追加のCSSクラス
 *
 * 要件:
 * - 16.1: データ取得に失敗する THEN エラーメッセージが表示される
 * - 16.2: ネットワークエラーが発生する THEN 「ネットワークエラーが発生しました」と表示される
 * - 16.3: APIエラーが発生する THEN エラーの詳細メッセージが表示される
 * - 16.4: 認証エラーが発生する THEN 「認証エラーが発生しました」と表示される
 * - 16.5: エラーメッセージが表示される THEN 「再試行」ボタンが表示される
 * - 16.6: 「再試行」ボタンをクリックする THEN データの再取得が実行される
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  type = 'unknown',
  onRetry,
  onClose,
  autoHideDuration = 0,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // エラータイプに応じたアイコンとスタイルを取得
  const getErrorConfig = useCallback(() => {
    switch (type) {
      case 'network':
        return {
          icon: (
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
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          ),
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
        };
      case 'auth':
        return {
          icon: (
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          ),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
        };
      case 'api':
      case 'unknown':
      default:
        return {
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
        };
    }
  }, [type]);

  const config = getErrorConfig();

  // 自動非表示タイマー
  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          onClose();
        }
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onClose]);

  // 閉じるハンドラー
  const handleClose = useCallback(() => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // 再試行ハンドラー
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`p-4 ${config.bgColor} border ${config.borderColor} rounded-lg ${className}`}
    >
      <div className="flex items-start">
        {/* エラーアイコン */}
        <div className={`${config.iconColor} mt-0.5 mr-3 flex-shrink-0`}>{config.icon}</div>

        {/* エラーメッセージと操作ボタン */}
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.textColor}`}>{message}</p>

          {/* 操作ボタン */}
          <div className="mt-3 flex gap-3">
            {onRetry && (
              <button
                onClick={handleRetry}
                className={`text-sm ${config.textColor} hover:${config.textColor}/80 underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'network' ? 'orange' : type === 'auth' ? 'yellow' : 'red'}-500`}
                aria-label="再試行"
              >
                再試行
              </button>
            )}
            {onClose && (
              <button
                onClick={handleClose}
                className={`text-sm ${config.textColor} hover:${config.textColor}/80 underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'network' ? 'orange' : type === 'auth' ? 'yellow' : 'red'}-500`}
                aria-label="閉じる"
              >
                閉じる
              </button>
            )}
          </div>
        </div>

        {/* 閉じるボタン（右上） */}
        {onClose && (
          <button
            onClick={handleClose}
            className={`${config.iconColor} hover:${config.iconColor}/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'network' ? 'orange' : type === 'auth' ? 'yellow' : 'red'}-500 rounded`}
            aria-label="エラーメッセージを閉じる"
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
      </div>
    </div>
  );
};

ErrorDisplay.displayName = 'ErrorDisplay';
