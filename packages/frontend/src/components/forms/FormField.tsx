import React from 'react';
import { InlineError } from './ErrorDisplay';

/**
 * バリデーション状態の型定義
 */
export interface ValidationState {
  isValid: boolean;
  error?: string;
  isValidating?: boolean;
}

/**
 * フォームフィールドのプロパティ
 */
export interface FormFieldProps {
  /** フィールドのラベル */
  label: string;
  /** 必須フィールドかどうか */
  required?: boolean;
  /** エラーメッセージ */
  error?: string;
  /** ヘルプテキスト */
  helpText?: string;
  /** 子要素（入力コンポーネント） */
  children: React.ReactNode;
  /** 追加のクラス名 */
  className?: string;
  /** フィールド名（バリデーション用） */
  fieldName?: string;
  /** バリデーション状態 */
  validationState?: ValidationState;
  /** バリデーション中の表示フラグ */
  showValidating?: boolean;
  /** フォーカス時のコールバック */
  onFocus?: () => void;
  /** ブラー時のコールバック */
  onBlur?: () => void;
  /** ラベルID */
  labelId?: string;
  /** ヘルプテキストID */
  helpTextId?: string;
  /** エラーID */
  errorId?: string;
  /** エラー表示のカスタマイズ */
  errorDisplay?: 'inline' | 'tooltip' | 'none';
}

/**
 * フォームフィールドコンポーネント
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helpText,
  children,
  className = '',
  fieldName,
  validationState,
  showValidating = true,
  errorDisplay = 'inline',
  onFocus,
  onBlur,
}) => {
  const fieldId = React.useId();
  const [isFocused, setIsFocused] = React.useState(false);

  // エラー状態の判定
  const hasError = !!(error || validationState?.error);
  const errorMessage = error || validationState?.error;
  const isValidating = validationState?.isValidating && showValidating;

  // 説明要素のIDを生成
  const getDescribedBy = () => {
    const ids: string[] = [];

    if (hasError && errorDisplay !== 'none') {
      ids.push(`${fieldId}-error`);
    }

    if (helpText && !hasError) {
      ids.push(`${fieldId}-help`);
    }

    if (isValidating) {
      ids.push(`${fieldId}-validating`);
    }

    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  // フィールドのスタイルクラスを生成
  const getFieldClassName = () => {
    if (!children || !React.isValidElement(children)) {
      return '';
    }

    const baseClasses = children.props?.className || '';

    if (hasError) {
      return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500`;
    }

    if (validationState?.isValid === true && !isFocused) {
      return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-500`;
    }

    return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
  };

  // フォーカスイベントハンドラー
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  // バリデーション状態インジケーター
  const renderValidationIndicator = () => {
    if (isValidating) {
      return (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="w-4 h-4 text-gray-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        </div>
      );
    }

    if (validationState?.isValid === true && !hasError && !isFocused) {
      return (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="w-4 h-4 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.53 10.53a.75.75 0 00-1.06 1.061l2.03 2.03a.75.75 0 001.137-.089l3.857-5.401z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="w-4 h-4 text-red-500"
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
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* ラベル */}
      <label
        htmlFor={fieldId}
        className="block text-sm md:text-sm lg:text-base font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="必須">
            *
          </span>
        )}
      </label>

      {/* 入力フィールド */}
      <div className="relative">
        {React.isValidElement(children) ? (
          React.cloneElement(children, {
            id: fieldId,
            'aria-describedby': getDescribedBy(),
            'aria-invalid': hasError ? 'true' : 'false',
            className: getFieldClassName(),
            onFocus: handleFocus,
            onBlur: handleBlur,
          })
        ) : (
          <div className="text-red-500 text-sm">無効なフィールドコンポーネントです</div>
        )}

        {/* バリデーション状態インジケーター */}
        {renderValidationIndicator()}
      </div>

      {/* バリデーション中メッセージ */}
      {isValidating && (
        <div
          id={`${fieldId}-validating`}
          className="text-sm text-gray-500 flex items-center gap-1"
          aria-live="polite"
        >
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
          確認中...
        </div>
      )}

      {/* ヘルプテキスト */}
      {helpText && !hasError && !isValidating && (
        <p id={`${fieldId}-help`} className="text-xs md:text-sm lg:text-sm text-gray-500">
          {helpText}
        </p>
      )}

      {/* エラーメッセージ */}
      {hasError && errorDisplay === 'inline' && (
        <InlineError error={errorMessage} fieldName={fieldName || fieldId} />
      )}
    </div>
  );
};

/**
 * フォームフィールドグループコンポーネント
 */
export interface FormFieldGroupProps {
  /** グループのタイトル */
  title?: string;
  /** グループの説明 */
  description?: string;
  /** 子要素（FormFieldコンポーネント） */
  children: React.ReactNode;
  /** 追加のクラス名 */
  className?: string;
  /** グループのエラー状態 */
  hasError?: boolean;
}

export const FormFieldGroup: React.FC<FormFieldGroupProps> = ({
  title,
  description,
  children,
  className = '',
  hasError = false,
}) => {
  return (
    <fieldset
      className={`
        space-y-4 p-4 border rounded-lg
        ${hasError ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}
        ${className}
      `}
    >
      {title && <legend className="text-sm font-medium text-gray-900 px-2">{title}</legend>}

      {description && <p className="text-sm text-gray-600 -mt-2">{description}</p>}

      <div className="space-y-4">{children}</div>
    </fieldset>
  );
};
