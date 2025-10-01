/**
 * 日付バリデーション関連のユーティリティ関数
 */

/**
 * 日付範囲の設定
 */
export interface DateRange {
  /** 最小日付 */
  minDate: Date;
  /** 最大日付 */
  maxDate: Date;
}

/**
 * 日付バリデーション結果
 */
export interface DateValidationResult {
  /** バリデーション結果 */
  isValid: boolean;
  /** エラーメッセージ */
  errorMessage?: string;
  /** エラーコード */
  errorCode?: 'PAST_DATE' | 'FUTURE_DATE' | 'INVALID_FORMAT' | 'OUT_OF_RANGE';
}

/**
 * デフォルトの日付範囲を取得
 * 要件: 現在日以降、1年以内の日付のみ選択可能
 */
export const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 時刻をリセット

  const oneYearLater = new Date();
  oneYearLater.setFullYear(today.getFullYear() + 1);
  oneYearLater.setHours(23, 59, 59, 999); // 1年後の終了時刻

  return {
    minDate: today,
    maxDate: oneYearLater,
  };
};

/**
 * 日付が指定された範囲内かどうかをチェック
 */
export const isDateInRange = (date: Date, range: DateRange): boolean => {
  return date >= range.minDate && date <= range.maxDate;
};

/**
 * 日付文字列が有効な形式（YYYY-MM-DD）かどうかをチェック
 */
export const isValidDateFormat = (dateString: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateString);
};

/**
 * 日付文字列をDateオブジェクトに変換（UTC時刻で）
 */
export const parseISODateString = (dateString: string): Date | null => {
  if (!isValidDateFormat(dateString)) {
    return null;
  }

  const date = new Date(dateString + 'T00:00:00.000Z');

  // 無効な日付の場合はnullを返す
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
};

/**
 * DateオブジェクトをISO日付文字列（YYYY-MM-DD）に変換
 */
export const formatDateToISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * 日付の包括的なバリデーション
 */
export const validateDate = (dateString: string, range?: DateRange): DateValidationResult => {
  // 空文字列の場合は有効とする（必須チェックは別で行う）
  if (!dateString.trim()) {
    return { isValid: true };
  }

  // フォーマットチェック
  if (!isValidDateFormat(dateString)) {
    return {
      isValid: false,
      errorMessage: '日付は YYYY-MM-DD 形式で入力してください',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // 日付オブジェクトに変換
  const date = parseISODateString(dateString);
  if (!date) {
    return {
      isValid: false,
      errorMessage: '有効な日付を入力してください',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // 範囲チェック（範囲が指定されている場合）
  if (range) {
    if (date < range.minDate) {
      return {
        isValid: false,
        errorMessage: '達成期限は今日以降の日付を選択してください',
        errorCode: 'PAST_DATE',
      };
    }

    if (date > range.maxDate) {
      return {
        isValid: false,
        errorMessage: '達成期限は1年以内の日付を選択してください',
        errorCode: 'FUTURE_DATE',
      };
    }
  }

  return { isValid: true };
};

/**
 * 日付ピッカーで選択可能な日付かどうかをチェック
 * react-datepickerのfilterDate関数で使用
 */
export const createDateFilter = (range: DateRange) => {
  return (date: Date): boolean => {
    return isDateInRange(date, range);
  };
};

/**
 * 今日の日付を取得（時刻をリセット）
 */
export const getToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * 指定した日数後の日付を取得
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * 指定した月数後の日付を取得
 */
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * 指定した年数後の日付を取得
 */
export const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

/**
 * 2つの日付の差を日数で取得
 */
export const getDaysDifference = (date1: Date, date2: Date): number => {
  const timeDifference = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
};

/**
 * 日付が過去かどうかをチェック
 */
export const isPastDate = (date: Date): boolean => {
  const today = getToday();
  return date < today;
};

/**
 * 日付が未来かどうかをチェック
 */
export const isFutureDate = (date: Date): boolean => {
  const today = getToday();
  return date > today;
};

/**
 * 日付が今日かどうかをチェック
 */
export const isToday = (date: Date): boolean => {
  const today = getToday();
  return date.getTime() === today.getTime();
};

/**
 * 日付を日本語形式でフォーマット
 */
export const formatDateToJapanese = (date: Date): string => {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
};

/**
 * 相対的な日付表現を取得（例：「3日後」「1週間後」）
 */
export const getRelativeDateString = (date: Date): string => {
  const today = getToday();
  const daysDiff = getDaysDifference(today, date);

  if (isToday(date)) {
    return '今日';
  }

  if (daysDiff === 1) {
    return isFutureDate(date) ? '明日' : '昨日';
  }

  if (daysDiff <= 7) {
    return isFutureDate(date) ? `${daysDiff}日後` : `${daysDiff}日前`;
  }

  if (daysDiff <= 30) {
    const weeks = Math.floor(daysDiff / 7);
    return isFutureDate(date) ? `${weeks}週間後` : `${weeks}週間前`;
  }

  if (daysDiff <= 365) {
    const months = Math.floor(daysDiff / 30);
    return isFutureDate(date) ? `${months}ヶ月後` : `${months}ヶ月前`;
  }

  const years = Math.floor(daysDiff / 365);
  return isFutureDate(date) ? `${years}年後` : `${years}年前`;
};
