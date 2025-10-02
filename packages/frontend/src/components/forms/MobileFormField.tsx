import React, { useRef, useEffect, useState } from 'react';
import { useResponsive, useVirtualKeyboard } from '../../hooks/useResponsive';

interface MobileFormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  autoComplete?: string;
  className?: string;
  scrollIntoView?: boolean;
}

/**
 * モバイル最適化されたフォームフィールド
 */
export function MobileFormField({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  error,
  required = false,
  disabled = false,
  maxLength,
  autoComplete,
  className = '',
  scrollIntoView = true,
}: MobileFormFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isMobile } = useResponsive();
  const { isVisible: keyboardVisible } = useVirtualKeyboard();
  const [isFocused, setIsFocused] = useState(false);

  // フォーカス時にスクロールして表示
  useEffect(() => {
    if (isFocused && keyboardVisible && scrollIntoView && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300); // キーボードアニメーション完了後
    }
  }, [isFocused, keyboardVisible, scrollIntoView]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // モバイル用の入力タイプマッピング
  const getMobileInputType = (inputType: string) => {
    if (!isMobile) return inputType;

    switch (inputType) {
      case 'tel':
        return 'tel';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'search':
        return 'search';
      default:
        return 'text';
    }
  };

  // モバイル用の入力モード
  const getInputMode = (inputType: string) => {
    if (!isMobile) return undefined;

    switch (inputType) {
      case 'tel':
        return 'tel';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'search':
        return 'search';
      default:
        return 'text';
    }
  };

  return (
    <div className={`mobile-form-field ${className}`}>
      {/* ラベル */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* 入力フィールド */}
      <div className="relative">
        <input
          ref={inputRef}
          type={getMobileInputType(type)}
          inputMode={getInputMode(type) as any}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className={`
            w-full px-4 py-3 text-base
            border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${isMobile ? 'touch-target' : ''}
            transition-colors duration-200
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${label}-error` : undefined}
        />

        {/* 文字数カウンター */}
        {maxLength && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
            {value.length}/{maxLength}
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <p id={`${label}-error`} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * モバイル最適化されたテキストエリア
 */
interface MobileTextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
  scrollIntoView?: boolean;
  autoResize?: boolean;
}

export function MobileTextArea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  required = false,
  disabled = false,
  maxLength,
  rows = 4,
  className = '',
  scrollIntoView = true,
  autoResize = false,
}: MobileTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile } = useResponsive();
  const { isVisible: keyboardVisible } = useVirtualKeyboard();
  const [isFocused, setIsFocused] = useState(false);

  // 自動リサイズ
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, autoResize]);

  // フォーカス時にスクロールして表示
  useEffect(() => {
    if (isFocused && keyboardVisible && scrollIntoView && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
  }, [isFocused, keyboardVisible, scrollIntoView]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`mobile-textarea ${className}`}>
      {/* ラベル */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* テキストエリア */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={autoResize ? 1 : rows}
          className={`
            w-full px-4 py-3 text-base
            border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            resize-none
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
            ${isMobile ? 'min-h-touch' : ''}
            transition-colors duration-200
          `}
          style={{
            minHeight: autoResize ? '44px' : undefined,
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${label}-error` : undefined}
        />

        {/* 文字数カウンター */}
        {maxLength && (
          <div className="absolute right-3 bottom-3 text-xs text-gray-500 bg-white px-1">
            {value.length}/{maxLength}
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <p id={`${label}-error`} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * モバイル最適化されたセレクトボックス
 */
interface MobileSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MobileSelect({
  label,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
}: MobileSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`mobile-select ${className}`}>
      {/* ラベル */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* セレクトボックス */}
      <select
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        className={`
          w-full px-4 py-3 text-base
          border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          touch-target
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          transition-colors duration-200
        `}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${label}-error` : undefined}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* エラーメッセージ */}
      {error && (
        <p id={`${label}-error`} className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
