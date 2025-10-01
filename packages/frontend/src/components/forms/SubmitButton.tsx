import React from 'react';

/**
 * 送信ボタンのプロパティ
 */
export interface SubmitButtonProps {
  /** 送信中フラグ */
  isSubmitting?: boolean;
  /** 無効状態 */
  disabled?: boolean;
  /** ボタンのサイズ */
  size?: 'sm' | 'md' | 'lg';
  /** ボタンのバリアント */
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  /** 送信時のコールバック */
  onSubmit?: () => void;
  /** カスタムクラス名 */
  className?: string;
  /** ボタンのテキスト */
  children?: React.ReactNode;
  /** ボタンのタイプ */
  type?: 'button' | 'submit';
  /** フォームが有効かどうか */
  isFormValid?: boolean;
}

/**
 * 送信ボタンコンポーネント
 */
export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting = false,
  disabled = false,
  size = 'md',
  variant = 'primary',
  onSubmit,
  className = '',
  children,
  type = 'submit',
  isFormValid = true,
}) => {
  /**
   * ボタンクリック時の処理
   */
  const handleClick = () => {
    if (!isSubmitting && !disabled && isFormValid && onSubmit) {
      onSubmit();
    }
  };

  /**
   * ボタンのスタイルクラス
   */
  const getButtonClasses = () => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // サイズクラス
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    // バリアントクラス
    const variantClasses = {
      primary:
        'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:hover:bg-blue-600',
      secondary:
        'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:hover:bg-gray-600',
      success:
        'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:hover:bg-green-600',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:hover:bg-red-600',
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  /**
   * ボタンのテキスト
   */
  const getButtonText = () => {
    if (children) {
      return children;
    }

    if (isSubmitting) {
      return (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          AI生成中...
        </>
      );
    }

    return 'AI生成開始';
  };

  /**
   * ボタンが無効かどうか
   */
  const isDisabled = disabled || isSubmitting || !isFormValid;

  /**
   * ARIA属性
   */
  const getAriaAttributes = () => {
    const attributes: Record<string, string | boolean> = {
      'aria-label': 'フォームを送信してAI生成を開始',
    };

    if (isSubmitting) {
      attributes['aria-busy'] = true;
      attributes['aria-describedby'] = 'submit-status';
    }

    if (!isFormValid) {
      attributes['aria-describedby'] = 'form-validation-error';
    }

    return attributes;
  };

  return (
    <div className="relative">
      <button
        type={type}
        onClick={type === 'button' ? handleClick : undefined}
        disabled={isDisabled}
        className={getButtonClasses()}
        {...getAriaAttributes()}
      >
        {getButtonText()}
      </button>

      {/* 送信中の状態表示 */}
      {isSubmitting && (
        <div id="submit-status" className="sr-only">
          AI生成処理を実行中です。しばらくお待ちください。
        </div>
      )}

      {/* フォーム無効時の説明 */}
      {!isFormValid && !isSubmitting && (
        <div id="form-validation-error" className="sr-only">
          必須項目をすべて入力してください。
        </div>
      )}
    </div>
  );
};

/**
 * 送信ボタンのメモ化版
 */
export const MemoizedSubmitButton = React.memo(SubmitButton);

/**
 * デフォルトエクスポート
 */
export default SubmitButton;
