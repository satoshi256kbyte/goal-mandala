import React from 'react';
import { ValidationMessage } from './ValidationMessage';
import { InlineError, ErrorSummary } from './ErrorDisplay';
import { ApiError, NetworkErrorType } from '../../services/api';

/**
 * 拡張エラー表示のプロパティ
 */
export interface EnhancedErrorDisplayProps {
  /** フィールドエラー */
  fieldErrors?: Record<string, string | string[]>;
  /** ネットワークエラー */
  networkError?: ApiError | null;
  /** 一般的なエラー */
  generalError?: string | null;
  /** エラーの表示モード */
  mode?: 'inline' | 'summary' | 'toast' | 'modal';
  /** 追加のクラス名 */
  className?: string;
  /** エラーの自動非表示時間（ミリ秒） */
  autoHideMs?: number;
  /** エラー非表示のコールバック */
  onErrorHide?: () => void;
  /** フィールドフォーカスのコールバック */
  onFieldFocus?: (fieldName: string) => void;
  /** 再試行のコールバック */
  onRetry?: () => void;
  /** エラー詳細の表示フラグ */
  showDetails?: boolean;
  /** アクセシビリティ設定 */
  accessibility?: {
    announceErrors?: boolean;
    focusOnError?: boolean;
    errorSummaryId?: string;
  };
}

/**
 * エラーの重要度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * フィールド名の日本語マッピング
 */
const FIELD_LABELS: Record<string, string> = {
  title: '目標タイトル',
  description: '目標説明',
  deadline: '達成期限',
  background: '背景',
  constraints: '制約事項',
};

/**
 * ネットワークエラーメッセージのマッピング
 */
const NETWORK_ERROR_MESSAGES: Record<NetworkErrorType, string> = {
  [NetworkErrorType.TIMEOUT]:
    'リクエストがタイムアウトしました。しばらく待ってから再試行してください。',
  [NetworkErrorType.CONNECTION_ERROR]:
    'ネットワークに接続できません。インターネット接続を確認してください。',
  [NetworkErrorType.SERVER_ERROR]:
    'サーバーエラーが発生しました。しばらく待ってから再試行してください。',
  [NetworkErrorType.CLIENT_ERROR]: 'リクエストに問題があります。入力内容を確認してください。',
  [NetworkErrorType.RATE_LIMIT]: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
  [NetworkErrorType.OFFLINE]: 'オフラインです。インターネット接続を確認してください。',
};

/**
 * エラーの重要度を判定
 */
const getErrorSeverity = (error: ApiError): ErrorSeverity => {
  switch (error.code) {
    case NetworkErrorType.OFFLINE:
    case NetworkErrorType.CONNECTION_ERROR:
      return ErrorSeverity.HIGH;
    case NetworkErrorType.SERVER_ERROR:
      return ErrorSeverity.MEDIUM;
    case NetworkErrorType.TIMEOUT:
    case NetworkErrorType.RATE_LIMIT:
      return ErrorSeverity.MEDIUM;
    case NetworkErrorType.CLIENT_ERROR:
      return ErrorSeverity.LOW;
    default:
      return ErrorSeverity.MEDIUM;
  }
};

/**
 * 拡張エラー表示コンポーネント
 */
export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  fieldErrors = {},
  networkError,
  generalError,
  mode = 'inline',
  className = '',
  autoHideMs,
  onErrorHide,
  onFieldFocus,
  onRetry,
  showDetails = false,
  accessibility = {},
}) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [dismissedErrors, setDismissedErrors] = React.useState<Set<string>>(new Set());
  const errorRef = React.useRef<HTMLDivElement>(null);

  const {
    announceErrors = true,
    focusOnError = true,
    errorSummaryId = 'error-summary',
  } = accessibility;

  // エラーの存在チェック
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const hasNetworkError = !!networkError;
  const hasGeneralError = !!generalError;
  const hasAnyError = hasFieldErrors || hasNetworkError || hasGeneralError;

  // 自動非表示の処理
  React.useEffect(() => {
    if (autoHideMs && hasAnyError) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onErrorHide?.();
      }, autoHideMs);

      return () => clearTimeout(timer);
    }
  }, [hasAnyError, autoHideMs]);

  // エラーが変更されたら表示状態をリセット
  React.useEffect(() => {
    setIsVisible(true);
    setDismissedErrors(new Set());
  }, [fieldErrors, networkError, generalError]);

  // エラーにフォーカスを移動
  React.useEffect(() => {
    if (focusOnError && hasAnyError && errorRef.current) {
      errorRef.current.focus();
    }
  }, [focusOnError, hasAnyError]);

  // スクリーンリーダー用のアナウンス
  React.useEffect(() => {
    if (announceErrors && hasAnyError) {
      const errorCount =
        Object.keys(fieldErrors).length + (networkError ? 1 : 0) + (generalError ? 1 : 0);

      const announcement = `${errorCount}件のエラーが発生しました`;

      // aria-live領域に一時的にメッセージを設定
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'assertive');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.textContent = announcement;

      document.body.appendChild(liveRegion);

      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 1000);
    }
  }, [announceErrors, hasAnyError, fieldErrors, networkError, generalError]);

  if (!isVisible || !hasAnyError) {
    return null;
  }

  /**
   * エラーを無視
   */
  const dismissError = (errorKey: string) => {
    setDismissedErrors(prev => new Set([...prev, errorKey]));
  };

  /**
   * フィールドエラーを表示
   */
  const renderFieldErrors = () => {
    const errors = Object.entries(fieldErrors).filter(
      ([field]) => !dismissedErrors.has(`field-${field}`)
    );

    if (errors.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-red-800">入力エラー</h4>
        {errors.map(([field, messages]) => {
          const messageArray = Array.isArray(messages) ? messages : [messages];
          const fieldLabel = FIELD_LABELS[field] || field;

          return (
            <div key={field} className="space-y-1">
              {messageArray.map((message, index) => (
                <div key={index} className="flex items-start justify-between gap-2">
                  <ValidationMessage
                    message={showDetails ? `${fieldLabel}: ${message}` : message}
                    type="error"
                    id={`field-error-${field}-${index}`}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => dismissError(`field-${field}`)}
                    className="text-red-400 hover:text-red-600 p-1"
                    aria-label={`${fieldLabel}のエラーを非表示`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              {onFieldFocus && (
                <button
                  type="button"
                  onClick={() => onFieldFocus(field)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {fieldLabel}に移動
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * ネットワークエラーを表示
   */
  const renderNetworkError = () => {
    if (!networkError || dismissedErrors.has('network')) return null;

    const severity = getErrorSeverity(networkError);
    const message =
      NETWORK_ERROR_MESSAGES[networkError.code as NetworkErrorType] || networkError.message;

    return (
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <ValidationMessage message={message} type="error" id="network-error" className="flex-1" />
          <button
            type="button"
            onClick={() => dismissError('network')}
            className="text-red-400 hover:text-red-600 p-1"
            aria-label="ネットワークエラーを非表示"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* 再試行ボタン */}
        {networkError.retryable && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            再試行
          </button>
        )}

        {/* エラー詳細情報 */}
        {showDetails && (
          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer hover:text-gray-800">詳細情報</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs space-y-1">
              <div>
                <strong>エラーコード:</strong> {networkError.code}
              </div>
              <div>
                <strong>重要度:</strong> {severity}
              </div>
              <div>
                <strong>再試行可能:</strong> {networkError.retryable ? 'はい' : 'いいえ'}
              </div>
              <div>
                <strong>発生時刻:</strong> {networkError.timestamp.toLocaleString()}
              </div>
              {networkError.status && (
                <div>
                  <strong>HTTPステータス:</strong> {networkError.status}
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    );
  };

  /**
   * 一般エラーを表示
   */
  const renderGeneralError = () => {
    if (!generalError || dismissedErrors.has('general')) return null;

    return (
      <div className="flex items-start justify-between gap-2">
        <ValidationMessage
          message={generalError}
          type="error"
          id="general-error"
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => dismissError('general')}
          className="text-red-400 hover:text-red-600 p-1"
          aria-label="エラーを非表示"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    );
  };

  /**
   * モード別のレンダリング
   */
  const renderByMode = () => {
    switch (mode) {
      case 'summary':
        return (
          <ErrorSummary
            validationErrors={fieldErrors}
            submissionError={
              networkError
                ? {
                    type: networkError.code as any,
                    message: networkError.message,
                    timestamp: networkError.timestamp,
                  }
                : undefined
            }
            className={className}
            onFieldFocus={onFieldFocus}
          />
        );

      case 'toast':
        return (
          <div
            className={`
            fixed top-4 right-4 z-50 max-w-md p-4 bg-white border border-red-200 rounded-lg shadow-lg
            ${className}
          `}
          >
            {renderFieldErrors()}
            {renderNetworkError()}
            {renderGeneralError()}
          </div>
        );

      case 'modal':
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div
              className={`
              max-w-md w-full mx-4 p-6 bg-white rounded-lg shadow-xl
              ${className}
            `}
            >
              <h2 className="text-lg font-semibold text-red-800 mb-4">エラーが発生しました</h2>
              {renderFieldErrors()}
              {renderNetworkError()}
              {renderGeneralError()}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        );

      case 'inline':
      default:
        return (
          <div className={`space-y-4 ${className}`}>
            {renderFieldErrors()}
            {renderNetworkError()}
            {renderGeneralError()}
          </div>
        );
    }
  };

  return (
    <div
      ref={errorRef}
      id={errorSummaryId}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className="focus:outline-none"
    >
      {renderByMode()}
    </div>
  );
};

/**
 * フィールド専用のインラインエラー表示
 */
export interface FieldErrorDisplayProps {
  /** エラーメッセージ */
  error?: string | string[];
  /** フィールド名 */
  fieldName: string;
  /** 追加のクラス名 */
  className?: string;
  /** エラーの自動非表示時間 */
  autoHideMs?: number;
  /** 詳細表示フラグ */
  showIcon?: boolean;
}

export const FieldErrorDisplay: React.FC<FieldErrorDisplayProps> = ({
  error,
  fieldName,
  className = '',
  autoHideMs,
  showIcon = true,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoHideMs && error) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideMs);

      return () => clearTimeout(timer);
    }
  }, [error, autoHideMs]);

  React.useEffect(() => {
    setIsVisible(true);
  }, [error]);

  if (!error || !isVisible) return null;

  const messages = Array.isArray(error) ? error : [error];

  return (
    <div className={`space-y-1 ${className}`}>
      {messages.map((message, index) => (
        <InlineError
          key={index}
          error={message}
          fieldName={`${fieldName}-${index}`}
          className={showIcon ? '' : 'pl-0'}
        />
      ))}
    </div>
  );
};

export default EnhancedErrorDisplay;
