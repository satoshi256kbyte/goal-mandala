import React, { useState, useEffect, useRef } from 'react';
import { UseFormRegister, UseFormSetValue, FieldError } from 'react-hook-form';
import { GoalFormData } from '../../types/goal-form';
import {
  validateDate,
  parseISODateString,
  DateRange,
  getDefaultDateRange,
  isDateInRange,
} from '../../utils/date-validation';
import { formatDateToISO, parseDate } from '../../utils/date-formatter';

export interface DateInputProps {
  /** フィールド名 */
  name: keyof GoalFormData;
  /** 最小日付 */
  minDate?: Date;
  /** 最大日付 */
  maxDate?: Date;
  /** React Hook Formのregister関数 */
  register: UseFormRegister<GoalFormData>;
  /** エラー情報 */
  error?: FieldError;
  /** React Hook FormのsetValue関数 */
  setValue: UseFormSetValue<GoalFormData>;
  /** プレースホルダー */
  placeholder?: string;
  /** 追加のCSSクラス */
  className?: string;
  /** 入力値変更時のコールバック */
  onChange?: (value: string, isValid: boolean) => void;
}

/**
 * 手動入力対応の日付入力コンポーネント
 *
 * 要件4.5の受入基準に対応:
 * - ユーザーが手動で日付を入力できる（YYYY-MM-DD形式）
 * - 複数の日付形式をサポート（YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY年MM月DD日）
 * - リアルタイムバリデーション
 * - 入力補助機能
 */
export const DateInput: React.FC<DateInputProps> = ({
  name,
  minDate,
  maxDate,
  register,
  error,
  setValue,
  placeholder = 'YYYY-MM-DD形式で入力',
  className = '',
  onChange,
}) => {
  // デフォルトの日付範囲を取得
  const defaultRange = getDefaultDateRange();
  const dateRange: DateRange = {
    minDate: minDate || defaultRange.minDate,
    maxDate: maxDate || defaultRange.maxDate,
  };

  const [inputValue, setInputValue] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean>(true);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 入力補助のための日付候補を生成
  const generateDateSuggestions = (input: string): string[] => {
    const suggestions: string[] = [];
    const today = new Date();

    if (!input) {
      // 空の場合は一般的な候補を表示
      suggestions.push(formatDateToISO(today)); // 今日
      suggestions.push(formatDateToISO(new Date(today.getTime() + 24 * 60 * 60 * 1000))); // 明日
      suggestions.push(formatDateToISO(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000))); // 1週間後
      suggestions.push(formatDateToISO(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))); // 1ヶ月後
      return suggestions.slice(0, 4);
    }

    // 部分入力に基づく候補生成
    if (input.length >= 4) {
      const year = parseInt(input.substring(0, 4));
      if (
        !isNaN(year) &&
        year >= dateRange.minDate.getFullYear() &&
        year <= dateRange.maxDate.getFullYear()
      ) {
        if (input.length === 4) {
          // 年のみ入力された場合、月の候補を生成
          for (let month = 1; month <= 12; month++) {
            const monthStr = month.toString().padStart(2, '0');
            suggestions.push(`${year}-${monthStr}-01`);
            if (suggestions.length >= 4) break;
          }
        } else if (input.length >= 6) {
          const monthPart = input.substring(5, 7);
          const month = parseInt(monthPart);

          if (!isNaN(month) && month >= 1 && month <= 12) {
            if (input.length === 7) {
              // 年月まで入力された場合、日の候補を生成
              const daysInMonth = new Date(year, month, 0).getDate();
              for (let day = 1; day <= Math.min(daysInMonth, 10); day++) {
                const dayStr = day.toString().padStart(2, '0');
                const candidate = `${year}-${monthPart}-${dayStr}`;
                const candidateDate = parseISODateString(candidate);
                if (candidateDate && isDateInRange(candidateDate, dateRange)) {
                  suggestions.push(candidate);
                }
                if (suggestions.length >= 4) break;
              }
            }
          }
        }
      }
    }

    return suggestions;
  };

  // 入力値の検証
  const validateInput = (value: string): { isValid: boolean; message: string } => {
    if (!value.trim()) {
      return { isValid: true, message: '' };
    }

    const validation = validateDate(value, dateRange);
    return {
      isValid: validation.isValid,
      message: validation.errorMessage || '',
    };
  };

  // 入力値の正規化（自動フォーマット）
  const normalizeInput = (value: string): string => {
    // 数字のみを抽出
    const numbers = value.replace(/\D/g, '');

    if (numbers.length === 0) return '';
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 6) return `${numbers.substring(0, 4)}-${numbers.substring(4)}`;

    return `${numbers.substring(0, 4)}-${numbers.substring(4, 6)}-${numbers.substring(6, 8)}`;
  };

  // 入力変更ハンドラー
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    let processedValue = rawValue;

    // 自動フォーマット（数字のみの入力の場合）
    if (/^\d+$/.test(rawValue) && rawValue.length > 4) {
      processedValue = normalizeInput(rawValue);
    }

    setInputValue(processedValue);

    // バリデーション
    const { isValid: valid, message } = validateInput(processedValue);
    setIsValid(valid);
    setValidationMessage(message);

    // 候補生成
    const newSuggestions = generateDateSuggestions(processedValue);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    setSelectedSuggestionIndex(-1);

    // 有効な日付の場合はフォームに設定
    if (valid && processedValue) {
      const parsedDate = parseDate(processedValue) || parseISODateString(processedValue);
      if (parsedDate && isDateInRange(parsedDate, dateRange)) {
        const isoString = formatDateToISO(parsedDate);
        setValue(name, isoString as any);
      }
    } else if (!processedValue) {
      setValue(name, '' as any);
    }

    // コールバック実行
    onChange?.(processedValue, valid);
  };

  // キーボードイベントハンドラー
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // 候補選択ハンドラー
  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    const { isValid: valid, message } = validateInput(suggestion);
    setIsValid(valid);
    setValidationMessage(message);

    if (valid) {
      setValue(name, suggestion as any);
    }

    onChange?.(suggestion, valid);
    inputRef.current?.focus();
  };

  // フォーカス処理
  const handleFocus = () => {
    const newSuggestions = generateDateSuggestions(inputValue);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleBlur = () => {
    // 少し遅延させて候補選択を可能にする
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 200);
  };

  // エラー状態に応じたスタイル
  const getInputClassName = (): string => {
    const baseClassName = `
      block w-full px-3 py-2 border rounded-md shadow-sm
      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      transition-colors duration-200
    `.trim();

    let borderColor = 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    if (error || (!isValid && inputValue)) {
      borderColor = 'border-red-300 focus:border-red-500 focus:ring-red-500';
    }

    return `${baseClassName} ${borderColor} ${className}`.trim();
  };

  // 初期値の設定
  useEffect(() => {
    register(name);
  }, [name, register]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={getInputClassName()}
        autoComplete="off"
      />

      {/* 入力候補 */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => {
            const date = parseISODateString(suggestion);
            return (
              <div
                key={suggestion}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                  index === selectedSuggestionIndex ? 'bg-blue-100' : ''
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handleSuggestionSelect(suggestion)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSuggestionSelect(suggestion);
                  }
                }}
              >
                <div className="text-sm font-medium text-gray-900">{suggestion}</div>
                {date && <div className="text-xs text-gray-500">{formatDateForDisplay(date)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* バリデーションメッセージ */}
      {!isValid && inputValue && validationMessage && (
        <div className="mt-1 text-sm text-red-600">{validationMessage}</div>
      )}

      {/* 入力ヒント */}
      {!inputValue && (
        <div className="mt-1 text-xs text-gray-500">
          対応形式: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY年MM月DD日
        </div>
      )}

      {/* 隠しinput（React Hook Form用） */}
      <input type="hidden" {...register(name)} value={inputValue} />
    </div>
  );
};
