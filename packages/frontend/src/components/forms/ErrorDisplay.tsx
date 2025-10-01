import React from 'react';
import { ValidationMessage } from './ValidationMessage';
import { SubmissionError, SubmissionErrorType } from '../../hooks/useFormSubmission';

/**
 * エラー表示のプロパティ
 */
export interface ErrorDisplayProps {
  /** バリデーションエラー（フィールド別） */
  validationErrors?: Record<string, string>;
  /** 送信エラー */
  submissionError?: SubmissionError;
  /** 追加のクラス名 */
  className?: string;
  /** エラー表示の最大数 */
  maxErrors?: number;
  /** エラーの自動非表示時間（ミリ秒） */
  autoHideMs?: number;
  /** エラー非表示のコールバック */
  onErrorHide?: () => void;
  /** エラーの詳細表示フラグ */
  showDetails?: boolean;
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
 * エラータイプ別のメッセージテンプレート
 */
const ERROR_MESSAGES: Record<SubmissionErrorType, string> = {
  [SubmissionErrorType.VALIDATION_ERROR]: 'フォームの入力内容に問題があります',
  [SubmissionErrorType.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
  [SubmissionErrorType.SERVER_ERROR]: 'サーバーエラーが発生しました',
  [SubmissionErrorType.TIMEOUT_ERROR]: '送信がタイムアウトしました',
  [SubmissionErrorType.UNKNOWN_ERROR]: '予期しないエラーが発生しました',
};

/**
 * エラー表示コンポーネント
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  validationErrors = {},
  submissionError,
  className = '',
  maxErrors = 5,
  autoHideMs,
  onErrorHide,
  showDetails = false,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  // 自動非表示の処理
  React.useEffect(() => {
    if (autoHideMs && (Object.keys(validationErrors).length > 0 || submissionError)) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onErrorHide?.();
      }, autoHideMs);

      return () => clearTimeout(timer);
    }
  }, [validationErrors, submissionError, autoHideMs, onErrorHide]);

  // エラーが変更されたら表示状態をリセット
  React.useEffect(() => {
    setIsVisible(true);
  }, [validationErrors, submissionError]);

  if (!isVisible) return null;

  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const hasSubmissionError = !!submissionError;

  if (!hasValidationErrors && !hasSubmissionError) {
    return null;
  }

  /**
   * バリデーションエラーのリストを生成
   */
  const renderValidationErrors = () => {
    const errors = Object.entries(validationErrors).slice(0, maxErrors);

    return errors.map(([field, message]) => {
      const fieldLabel = FIELD_LABELS[field] || field;
      const displayMessage = showDetails ? `${fieldLabel}: ${message}` : message;

      return (
        <ValidationMessage
          key={field}
          message={displayMessage}
          type="error"
          id={`validation-error-${field}`}
          className="mb-2 last:mb-0"
        />
      );
    });
  };

  /**
   * 送信エラーを表示
   */
  const renderSubmissionError = () => {
    if (!submissionError) return null;

    const baseMessage = ERROR_MESSAGES[submissionError.type] || submissionError.message;

    return (
      <div className="space-y-2">
        <ValidationMessage message={baseMessage} type="error" id="submission-error" />

        {/* 詳細エラー情報の表示 */}
        {showDetails && submissionError.details && (
          <div className="ml-6 space-y-1">
            {Object.entries(submissionError.details).map(([key, value]) => (
              <ValidationMessage
                key={key}
                message={`${FIELD_LABELS[key] || key}: ${value}`}
                type="error"
                className="text-xs"
              />
            ))}
          </div>
        )}

        {/* 技術的詳細情報（開発環境のみ） */}
        {showDetails && submissionError.originalError && process.env.NODE_ENV === 'development' && (
          <details className="ml-6 text-xs text-gray-600">
            <summary className="cursor-pointer hover:text-gray-800">技術的詳細情報</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {submissionError.originalError.stack || submissionError.originalError.message}
            </pre>
          </details>
        )}
      </div>
    );
  };

  /**
   * エラー数の表示
   */
  const renderErrorCount = () => {
    const totalErrors = Object.keys(validationErrors).length;
    const hiddenErrors = Math.max(0, totalErrors - maxErrors);

    if (hiddenErrors > 0) {
      return (
        <div className="text-sm text-gray-600 mt-2">他に {hiddenErrors} 件のエラーがあります</div>
      );
    }

    return null;
  };

  /**
   * エラー解決のヒントを表示
   */
  const renderErrorHints = () => {
    if (!submissionError) return null;

    const hints: Record<SubmissionErrorType, string> = {
      [SubmissionErrorType.VALIDATION_ERROR]: '入力内容を確認して、必須項目を入力してください。',
      [SubmissionErrorType.NETWORK_ERROR]: 'インターネット接続を確認して、再度お試しください。',
      [SubmissionErrorType.SERVER_ERROR]: 'しばらく時間をおいて再度お試しください。',
      [SubmissionErrorType.TIMEOUT_ERROR]: 'しばらく時間をおいて再度お試しください。',
      [SubmissionErrorType.UNKNOWN_ERROR]: 'ページを再読み込みして再度お試しください。',
    };

    const hint = hints[submissionError.type];
    if (!hint) return null;

    return <ValidationMessage message={hint} type="info" className="mt-2" />;
  };

  return (
    <div className={`space-y-2 ${className}`} role="alert" aria-live="assertive">
      {/* バリデーションエラーの表示 */}
      {hasValidationErrors && (
        <div>
          {renderValidationErrors()}
          {renderErrorCount()}
        </div>
      )}

      {/* 送信エラーの表示 */}
      {hasSubmissionError && renderSubmissionError()}

      {/* エラー解決のヒント */}
      {renderErrorHints()}
    </div>
  );
};

/**
 * インラインエラー表示コンポーネント（フィールド直下用）
 */
export interface InlineErrorProps {
  /** エラーメッセージ */
  error?: string;
  /** フィールド名（アクセシビリティ用） */
  fieldName?: string;
  /** 追加のクラス名 */
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ error, fieldName, className = '' }) => {
  if (!error) return null;

  return (
    <div
      className={`text-sm text-red-600 mt-1 ${className}`}
      id={fieldName ? `${fieldName}-error` : undefined}
      role="alert"
      aria-live="polite"
    >
      <span className="flex items-center gap-1">
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
        {error}
      </span>
    </div>
  );
};

/**
 * エラーサマリーコンポーネント（フォーム上部用）
 */
export interface ErrorSummaryProps {
  /** バリデーションエラー */
  validationErrors?: Record<string, string>;
  /** 送信エラー */
  submissionError?: SubmissionError;
  /** 追加のクラス名 */
  className?: string;
  /** エラーフィールドへのフォーカス移動コールバック */
  onFieldFocus?: (fieldName: string) => void;
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  validationErrors = {},
  submissionError,
  className = '',
  onFieldFocus,
}) => {
  const hasErrors = Object.keys(validationErrors).length > 0 || !!submissionError;

  if (!hasErrors) return null;

  const errorCount = Object.keys(validationErrors).length + (submissionError ? 1 : 0);

  return (
    <div
      className={`
        p-4 border border-red-200 bg-red-50 rounded-md
        ${className}
      `}
      role="alert"
      aria-labelledby="error-summary-title"
    >
      <h3 id="error-summary-title" className="text-sm font-medium text-red-800 mb-2">
        {errorCount} 件のエラーがあります
      </h3>

      <ul className="text-sm text-red-700 space-y-1">
        {/* バリデーションエラーのリスト */}
        {Object.entries(validationErrors).map(([field, message]) => (
          <li key={field}>
            <button
              type="button"
              className="text-left underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              onClick={() => onFieldFocus?.(field)}
            >
              {FIELD_LABELS[field] || field}: {message}
            </button>
          </li>
        ))}

        {/* 送信エラー */}
        {submissionError && (
          <li>{ERROR_MESSAGES[submissionError.type] || submissionError.message}</li>
        )}
      </ul>
    </div>
  );
};
