import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import type { FieldError } from 'react-hook-form';
import { CharacterCounter } from './CharacterCounter';
import { CharacterLimitWarning } from './CharacterLimitWarning';
import { useCharacterCounter } from '../../hooks/useCharacterCounter';

export interface TextInputProps {
  name: string;
  placeholder?: string;
  maxLength?: number;
  showCounter?: boolean;
  showWarning?: boolean;
  register?: UseFormRegister<Record<string, unknown>>;
  error?: FieldError;
  type?: 'text' | 'email' | 'password';
  className?: string;
  disabled?: boolean;
  /** 文字数変更時のコールバック */
  onLengthChange?: (length: number, value: string) => void;
  /** 制限到達時のコールバック */
  onLimitReached?: (value: string) => void;
  /** 警告しきい値（パーセンテージ）デフォルト: 80% */
  warningThreshold?: number;
  /** ID属性 */
  id?: string;
  /** aria-describedby属性 */
  'aria-describedby'?: string;
  /** aria-invalid属性 */
  'aria-invalid'?: 'true' | 'false';
  /** フォーカスイベント */
  onFocus?: () => void;
  /** ブラーイベント */
  onBlur?: () => void;
}

/**
 * テキスト入力コンポーネント（文字数カウンター機能付き）
 *
 * 要件3の受入基準に対応:
 * - リアルタイムで文字数カウンターが更新される
 * - 文字数が制限の80%を超えると警告色に変わる
 * - 文字数が制限を超えると文字数表示がエラー色に変わる
 * - 文字数制限に達するとそれ以上の入力を制限する
 */
export const TextInput: React.FC<TextInputProps> = ({
  name,
  placeholder,
  maxLength,
  showCounter = false,
  showWarning = false,
  register,
  error,
  type = 'text',
  className = '',
  disabled = false,
  onLengthChange,
  onLimitReached,
  warningThreshold = 80,
  id,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  onFocus,
  onBlur,
}) => {
  const [inputValue, setInputValue] = React.useState('');

  const { currentLength, updateLength, isError, isWarning } = useCharacterCounter({
    maxLength,
    initialValue: inputValue,
    onChange: onLengthChange,
    onLimitReached,
    warningThreshold,
  });

  // エラー状態に応じたスタイル
  const getInputClassName = (): string => {
    const baseClassName = `
      block w-full px-3 py-2 md:px-4 md:py-3 lg:px-3 lg:py-2 border rounded-md shadow-sm
      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      transition-colors duration-200 text-base md:text-base lg:text-sm
      min-h-[44px] md:min-h-[48px] lg:min-h-[40px]
    `.trim();

    let borderColor = 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    if (error) {
      borderColor = 'border-red-300 focus:border-red-500 focus:ring-red-500';
    } else if (isError) {
      borderColor = 'border-red-300 focus:border-red-500 focus:ring-red-500';
    } else if (isWarning) {
      borderColor = 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500';
    }

    return `${baseClassName} ${borderColor} ${className}`.trim();
  };

  // 入力変更ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // 制限チェックと値の更新
    if (maxLength && newValue.length > maxLength) {
      // 制限を超える場合は制限値で切り詰める
      const truncatedValue = newValue.slice(0, maxLength);
      setInputValue(truncatedValue);
      updateLength(truncatedValue);
      // フォームの値も更新
      e.target.value = truncatedValue;
    } else {
      setInputValue(newValue);
      updateLength(newValue);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className={getInputClassName()}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        {...(register
          ? register(name, {
              onChange: handleChange,
            })
          : { name, onChange: handleChange })}
      />

      {/* 文字数カウンター */}
      {showCounter && maxLength && (
        <CharacterCounter
          currentLength={currentLength}
          maxLength={maxLength}
          position="top-right"
          warningThreshold={warningThreshold}
        />
      )}

      {/* 警告メッセージ */}
      {showWarning && maxLength && (
        <div className="mt-1">
          <CharacterLimitWarning
            currentLength={currentLength}
            maxLength={maxLength}
            warningThreshold={warningThreshold}
          />
        </div>
      )}
    </div>
  );
};
