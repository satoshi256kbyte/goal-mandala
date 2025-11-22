/**
 * エラー表示コンポーネント
 *
 * 機能:
 * - インラインエラー表示
 * - エラーサマリー表示
 * - 復旧オプション表示
 *
 * 要件: 要件1, 要件2, 要件3
 */

import React from 'react';
import { FormError, FormErrorSeverity } from '../../types/form-error';

/**
 * エラー表示コンポーネントのProps
 */
export interface ErrorDisplayProps {
  /** 表示するエラー */
  error?: FormError;
  /** エラーのレコード形式 */
  errors?: Record<string, string>;
  /** タイトル */
  title?: string;
  /** 表示タイプ */
  displayType?: 'inline' | 'summary' | 'toast' | 'modal';
  /** 復旧オプションを表示するか */
  showRecoveryOptions?: boolean;
  /** 復旧オプションのコールバック */
  onRetry?: () => void;
  onReload?: () => void;
  onDismiss?: () => void;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * エラーアイコンコンポーネント
 */
const ErrorIcon: React.FC<{ severity: FormErrorSeverity; className?: string }> = ({
  severity,
  className = '',
}) => {
  const getIconColor = () => {
    switch (severity) {
      case FormErrorSeverity.CRITICAL:
        return 'text-red-600';
      case FormErrorSeverity.HIGH:
        return 'text-red-500';
      case FormErrorSeverity.MEDIUM:
        return 'text-yellow-500';
      case FormErrorSeverity.LOW:
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <svg
      className={`w-5 h-5 ${getIconColor()} ${className}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      {severity === FormErrorSeverity.CRITICAL || severity === FormErrorSeverity.HIGH ? (
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      ) : (
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      )}
    </svg>
  );
};

/**
 * 復旧オプションコンポーネント
 */
const RecoveryOptions: React.FC<{
  error: FormError;
  onRetry?: () => void;
  onReload?: () => void;
  onDismiss?: () => void;
}> = ({ error, onRetry, onReload, onDismiss }) => {
  if (!error.retryable && error.type !== FormErrorType.NETWORK_ERROR) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {error.retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          再試行
        </button>
      )}

      {error.type === FormErrorType.NETWORK_ERROR && onReload && (
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          ページを再読み込み
        </button>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          閉じる
        </button>
      )}
    </div>
  );
};

/**
 * エラー表示コンポーネント
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errors,
  title,
  displayType = 'inline',
  showRecoveryOptions = true,
  onRetry,
  onReload,
  onDismiss,
  className = '',
}) => {
  // エラーがない場合は何も表示しない
  if (!error && (!errors || Object.keys(errors).length === 0)) {
    return null;
  }

  const getContainerClasses = () => {
    const baseClasses = 'rounded-md p-4';
    const severityClasses = {
      [FormErrorSeverity.CRITICAL]: 'bg-red-50 border border-red-200',
      [FormErrorSeverity.HIGH]: 'bg-red-50 border border-red-200',
      [FormErrorSeverity.MEDIUM]: 'bg-yellow-50 border border-yellow-200',
      [FormErrorSeverity.LOW]: 'bg-blue-50 border border-blue-200',
    };

    const displayClasses = {
      inline: 'mb-4',
      summary: 'mb-6',
      toast: 'fixed top-4 right-4 z-50 max-w-sm shadow-lg',
      modal: 'bg-white rounded-lg shadow-xl max-w-md mx-auto',
    };

    return `${baseClasses} ${error?.severity ? severityClasses[error.severity] : severityClasses[FormErrorSeverity.MEDIUM]} ${displayClasses[displayType]} ${className}`;
  };

  const getTextClasses = () => {
    const severityClasses = {
      [FormErrorSeverity.CRITICAL]: 'text-red-800',
      [FormErrorSeverity.HIGH]: 'text-red-800',
      [FormErrorSeverity.MEDIUM]: 'text-yellow-800',
      [FormErrorSeverity.LOW]: 'text-blue-800',
    };

    return error?.severity
      ? severityClasses[error.severity]
      : severityClasses[FormErrorSeverity.MEDIUM];
  };

  // errorsプロパティが提供された場合のレンダリング
  if (errors && Object.keys(errors).length > 0) {
    return (
      <div className={getContainerClasses()} role="alert" aria-live="polite" aria-atomic="true">
        <div className="flex">
          <div className="flex-shrink-0">
            <ErrorIcon severity={FormErrorSeverity.MEDIUM} />
          </div>
          <div className="ml-3 flex-1">
            {title && <div className={`text-sm font-medium ${getTextClasses()} mb-2`}>{title}</div>}
            <ul className={`text-sm ${getTextClasses()} space-y-1`}>
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>• {message}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={getContainerClasses()} role="alert" aria-live="polite" aria-atomic="true">
      <div className="flex">
        <div className="flex-shrink-0">
          <ErrorIcon severity={error?.severity || FormErrorSeverity.MEDIUM} />
        </div>
        <div className="ml-3 flex-1">
          <div className={`text-sm font-medium ${getTextClasses()}`}>
            {error?.message || 'エラーが発生しました'}
          </div>

          {error?.code && displayType !== 'inline' && (
            <div className={`mt-1 text-xs ${getTextClasses()} opacity-75`}>
              エラーコード: {error.code}
            </div>
          )}

          {error?.field && displayType === 'summary' && (
            <div className={`mt-1 text-xs ${getTextClasses()} opacity-75`}>
              フィールド: {error.field}
            </div>
          )}

          {showRecoveryOptions && error && (
            <RecoveryOptions
              error={error}
              onRetry={onRetry}
              onReload={onReload}
              onDismiss={onDismiss}
            />
          )}
        </div>

        {displayType === 'toast' && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${getTextClasses()} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600`}
              >
                <span className="sr-only">閉じる</span>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
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

/**
 * エラーサマリーコンポーネント
 */
export interface ErrorSummaryProps {
  /** 表示するエラー一覧 */
  errors?: FormError[];
  /** バリデーションエラー */
  validationErrors?: Record<string, string | string[]>;
  /** 送信エラー */
  submissionError?: {
    type: any;
    message: string;
    timestamp: Date;
  };
  /** タイトル */
  title?: string;
  /** 復旧オプションを表示するか */
  showRecoveryOptions?: boolean;
  /** 復旧オプションのコールバック */
  onRetryAll?: () => void;
  onClearAll?: () => void;
  /** フィールドフォーカス時のコールバック */
  onFieldFocus?: (fieldName: string) => void;
  /** カスタムクラス名 */
  className?: string;
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors = [],
  validationErrors = {},
  submissionError,
  title = 'エラーが発生しました',
  showRecoveryOptions = true,
  onRetryAll,
  onClearAll,
  onFieldFocus: _onFieldFocus,
  className = '',
}) => {
  const hasFormErrors = errors.length > 0;
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const hasSubmissionError = !!submissionError;

  if (!hasFormErrors && !hasValidationErrors && !hasSubmissionError) {
    return null;
  }

  // const criticalErrors = errors.filter(
  //   e => e.severity === FormErrorSeverity.CRITICAL || e.severity === FormErrorSeverity.HIGH
  // ); // 将来使用予定
  const hasRetryableErrors = errors.some(e => e.retryable);

  return (
    <div className={`rounded-md bg-red-50 border border-red-200 p-4 mb-6 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <ErrorIcon severity={FormErrorSeverity.HIGH} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {title} ({errors.length}件)
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>
                  {error.field && <span className="font-medium">{error.field}: </span>}
                  {error.message}
                </li>
              ))}
            </ul>
          </div>

          {showRecoveryOptions && (hasRetryableErrors || onClearAll) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {hasRetryableErrors && onRetryAll && (
                <button
                  type="button"
                  onClick={onRetryAll}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  全て再試行
                </button>
              )}

              {onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  全てクリア
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * インラインエラー表示コンポーネントのProps
 */
export interface InlineErrorProps {
  /** エラーメッセージ */
  message?: string;
  /** エラーメッセージ（別名） */
  error?: string;
  /** エラーの重要度 */
  severity?: FormErrorSeverity;
  /** 追加のCSSクラス */
  className?: string;
  /** フィールド名 */
  fieldName?: string;
}

/**
 * インラインエラー表示コンポーネント
 */
export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  error,
  severity = 'error',
  className = '',
  fieldName,
}) => {
  const errorMessage = message || error || '';

  // エラーメッセージがない場合は何も表示しない
  if (!errorMessage) {
    return null;
  }

  const severityClasses = {
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  };

  const errorId = fieldName ? `${fieldName}-error` : undefined;

  return (
    <div
      id={errorId}
      role="alert"
      aria-live="polite"
      className={`text-sm p-2 border rounded ${severityClasses[severity]} ${className}`}
    >
      {errorMessage}
    </div>
  );
};

export default ErrorDisplay;
