/**
 * フォーム関連のヘルパー関数
 */

/**
 * フィールドのスタイルクラスを生成する
 */
export const getFieldClassName = (
  baseClassName: string,
  hasError: boolean,
  isValid?: boolean,
  isFocused?: boolean
): string => {
  if (hasError) {
    return `${baseClassName} border-red-300 focus:border-red-500 focus:ring-red-500`;
  }

  if (isValid === true && !isFocused) {
    return `${baseClassName} border-green-300 focus:border-green-500 focus:ring-green-500`;
  }

  return `${baseClassName} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
};

/**
 * バリデーション状態に応じたアイコンを取得する
 */
export const getValidationIcon = (
  isValidating: boolean,
  hasError: boolean,
  isValid?: boolean,
  isFocused?: boolean
) => {
  if (isValidating) {
    return {
      type: 'loading',
      className: 'w-4 h-4 text-gray-400 animate-spin',
      ariaLabel: '確認中',
    };
  }

  if (isValid === true && !hasError && !isFocused) {
    return {
      type: 'success',
      className: 'w-4 h-4 text-green-500',
      ariaLabel: '入力完了',
    };
  }

  if (hasError) {
    return {
      type: 'error',
      className: 'w-4 h-4 text-red-500',
      ariaLabel: 'エラー',
    };
  }

  return null;
};

/**
 * aria-describedby属性の値を生成する
 */
export const generateAriaDescribedBy = (
  fieldId: string,
  hasError: boolean,
  hasHelp: boolean,
  isValidating: boolean,
  errorDisplay: 'inline' | 'tooltip' | 'none' = 'inline'
): string | undefined => {
  const ids: string[] = [];

  if (hasError && errorDisplay !== 'none') {
    ids.push(`${fieldId}-error`);
  }

  if (hasHelp && !hasError) {
    ids.push(`${fieldId}-help`);
  }

  if (isValidating) {
    ids.push(`${fieldId}-validating`);
  }

  return ids.length > 0 ? ids.join(' ') : undefined;
};

/**
 * レスポンシブテキストサイズクラスを生成する
 */
export const getResponsiveTextClass = (size: 'xs' | 'sm' | 'base' | 'lg' = 'sm'): string => {
  const sizeMap = {
    xs: 'text-xs md:text-xs lg:text-sm',
    sm: 'text-sm md:text-sm lg:text-base',
    base: 'text-base md:text-base lg:text-lg',
    lg: 'text-lg md:text-lg lg:text-xl',
  };

  return sizeMap[size];
};

/**
 * フォームフィールドの共通プロパティ型
 */
export interface BaseFieldProps {
  /** フィールドID */
  id?: string;
  /** フィールド名 */
  name?: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** 読み取り専用フラグ */
  readOnly?: boolean;
  /** 必須フラグ */
  required?: boolean;
  /** プレースホルダー */
  placeholder?: string;
  /** 追加のクラス名 */
  className?: string;
  /** aria-describedby */
  'aria-describedby'?: string;
  /** aria-invalid */
  'aria-invalid'?: boolean | 'false' | 'true';
  /** フォーカス時のコールバック */
  onFocus?: (event: React.FocusEvent) => void;
  /** ブラー時のコールバック */
  onBlur?: (event: React.FocusEvent) => void;
}

/**
 * 共通のフィールドプロパティを生成する
 */
export const generateFieldProps = (
  fieldId: string,
  hasError: boolean,
  baseProps: Partial<BaseFieldProps> = {}
): BaseFieldProps => {
  return {
    id: fieldId,
    'aria-invalid': hasError ? 'true' : 'false',
    ...baseProps,
  };
};
