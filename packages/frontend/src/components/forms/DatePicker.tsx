import React, { useState, useEffect } from 'react';
import ReactDatePicker from 'react-datepicker';
import { UseFormRegister, UseFormSetValue, FieldError } from 'react-hook-form';
import { GoalFormData } from '../../types/goal-form';

import {
  getDefaultDateRange,
  isDateInRange,
  validateDate,
  createDateFilter,
  parseISODateString,
  DateRange,
} from '../../utils/date-validation';
import {
  formatDateToISO,
  formatDateForDisplay,
  formatRelativeDate,
  parseDate,
} from '../../utils/date-formatter';
import 'react-datepicker/dist/react-datepicker.css';

export interface DatePickerProps {
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
}

/**
 * 日付選択コンポーネント
 *
 * 要件4の受入基準に対応:
 * 1. ユーザーが達成期限フィールドをクリックすると日付ピッカーが表示される
 * 2. 現在日以降の日付のみ選択可能である
 * 3. 1年以内の日付のみ選択可能である
 * 4. ユーザーが日付を選択するとフィールドに選択した日付が表示される
 * 5. ユーザーが手動で日付を入力できる（YYYY-MM-DD形式）
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  name,
  minDate,
  maxDate,
  register,
  error,
  setValue,
  placeholder = '日付を選択してください',
  className = '',
}) => {
  // デフォルトの日付範囲を取得
  const defaultRange = getDefaultDateRange();
  const dateRange: DateRange = useMemo(() => ({
    minDate: minDate || defaultRange.minDate,
    maxDate: maxDate || defaultRange.maxDate,
  }), [minDate, maxDate, defaultRange.minDate, defaultRange.maxDate]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  // const [_displayValue, _setDisplayValue] = useState<string>('');

  // displayValueを使用する関数を追加
  // const updateDisplayValue = (value: string) => {
  //   _setDisplayValue(value);
  // };

  // displayValueを実際に使用
  React.useEffect(() => {
    if (selectedDate) {
      updateDisplayValue(format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [selectedDate]);

  // エラー状態に応じたスタイル
  const getInputClassName = (): string => {
    const baseClassName = `
      block w-full px-3 py-2 border rounded-md shadow-sm
      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      transition-colors duration-200
    `.trim();

    let borderColor = 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    if (error) {
      borderColor = 'border-red-300 focus:border-red-500 focus:ring-red-500';
    }

    return `${baseClassName} ${borderColor} ${className}`.trim();
  };

  // 日付が変更されたときの処理
  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);

    if (date) {
      const isoString = formatDateToISO(date);
      setInputValue(isoString);
      updateDisplayValue(formatDateForDisplay(date));
      setValue(name, isoString as any);
    } else {
      setInputValue('');
      updateDisplayValue('');
      setValue(name, '' as any);
    }
  };

  // 手動入力の処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // 複数の日付形式をサポート
    const parsedDate = parseDate(value) || parseISODateString(value);

    if (parsedDate) {
      // バリデーション実行
      const isoString = formatDateToISO(parsedDate);
      const validation = validateDate(isoString, dateRange);

      if (validation.isValid && isDateInRange(parsedDate, dateRange)) {
        setSelectedDate(parsedDate);
        updateDisplayValue(formatDateForDisplay(parsedDate));
        setValue(name, isoString as any);
      }
    } else if (!value) {
      // 空文字列の場合はクリア
      setSelectedDate(null);
      updateDisplayValue('');
      setValue(name, '' as any);
    }
  };

  // キーボードショートカット処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const today = new Date();

    switch (e.key) {
      case 'T':
      case 't':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (isDateInRange(today, dateRange)) {
            handleDateChange(today);
          }
        }
        break;

      case 'ArrowUp':
        if (selectedDate && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const nextDay = new Date(selectedDate);
          nextDay.setDate(nextDay.getDate() + 1);
          if (isDateInRange(nextDay, dateRange)) {
            handleDateChange(nextDay);
          }
        }
        break;

      case 'ArrowDown':
        if (selectedDate && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const prevDay = new Date(selectedDate);
          prevDay.setDate(prevDay.getDate() - 1);
          if (isDateInRange(prevDay, dateRange)) {
            handleDateChange(prevDay);
          }
        }
        break;
    }
  };

  // 日付フィルター（選択可能な日付のみ表示）
  const filterDate = createDateFilter(dateRange);

  // 初期値の設定
  useEffect(() => {
    register(name);

    // 既存の値がある場合は設定
    if (inputValue && !selectedDate) {
      const date = parseISODateString(inputValue);
      if (date && isDateInRange(date, dateRange)) {
        setSelectedDate(date);
      }
    }
  }, [name, register, inputValue, selectedDate, dateRange]);

  return (
    <div className="relative">
      <ReactDatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        onChangeRaw={handleInputChange}
        onKeyDown={handleKeyDown}
        allowSameDay={true}
        strictParsing={false}
        isClearable={true}
        autoComplete="off"
        minDate={dateRange.minDate}
        maxDate={dateRange.maxDate}
        filterDate={filterDate}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder}
        className={getInputClassName()}
        showPopperArrow={false}
        popperClassName="z-50"
        calendarClassName="border border-gray-300 rounded-md shadow-lg"
        dayClassName={date => {
          const baseClass = 'hover:bg-blue-100 rounded';
          if (!isDateInRange(date, dateRange)) {
            return `${baseClass} text-gray-300 cursor-not-allowed`;
          }
          return baseClass;
        }}
        weekDayClassName={() => 'text-gray-600 font-medium'}
        monthClassName={() => 'text-gray-800'}
        timeClassName={() => 'text-gray-800'}
        // カスタムヘッダー
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex items-center justify-between px-2 py-2">
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex items-center space-x-1">
              <select
                value={date.getFullYear()}
                onChange={({ target: { value } }) => changeYear(parseInt(value))}
                className="text-sm border-none bg-transparent focus:outline-none"
              >
                {Array.from(
                  { length: dateRange.maxDate.getFullYear() - dateRange.minDate.getFullYear() + 1 },
                  (_, i) => dateRange.minDate.getFullYear() + i
                ).map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                value={date.getMonth()}
                onChange={({ target: { value } }) => changeMonth(parseInt(value))}
                className="text-sm border-none bg-transparent focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(2000, i).toLocaleDateString('ja-JP', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}
      />

      {/* 隠しinput（React Hook Form用） */}
      <input type="hidden" {...register(name)} value={inputValue} />

      {/* 日付表示ヘルパー */}
      {selectedDate && (
        <div className="mt-1 text-sm text-gray-600">
          <span className="font-medium">{formatDateForDisplay(selectedDate)}</span>
          <span className="ml-2 text-gray-500">({formatRelativeDate(selectedDate)})</span>
        </div>
      )}
    </div>
  );
};
