import {
  getDefaultDateRange,
  isDateInRange,
  isValidDateFormat,
  parseISODateString,
  formatDateToISO,
  validateDate,
  createDateFilter,
  getToday,
  addDays,
  addMonths,
  addYears,
  getDaysDifference,
  isPastDate,
  isFutureDate,
  isToday,
  DateRange,
} from './date-validation';

import { vi } from 'vitest';

describe('date-validation', () => {
  beforeEach(() => {
    // 現在の日付を固定（テストの一貫性のため）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getDefaultDateRange', () => {
    it('デフォルトの日付範囲を正しく返す', () => {
      const range = getDefaultDateRange();

      expect(range.minDate).toBeInstanceOf(Date);
      expect(range.maxDate).toBeInstanceOf(Date);
      expect(range.maxDate.getTime()).toBeGreaterThan(range.minDate.getTime());

      // 最小日付は今日
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(range.minDate.getTime()).toBe(today.getTime());

      // 最大日付は1年後
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      oneYearLater.setHours(23, 59, 59, 999);
      expect(range.maxDate.getTime()).toBe(oneYearLater.getTime());
    });
  });

  describe('isDateInRange', () => {
    const range: DateRange = {
      minDate: new Date('2024-01-01'),
      maxDate: new Date('2024-12-31'),
    };

    it('範囲内の日付でtrueを返す', () => {
      const date = new Date('2024-06-15');
      expect(isDateInRange(date, range)).toBe(true);
    });

    it('範囲外（過去）の日付でfalseを返す', () => {
      const date = new Date('2023-12-31');
      expect(isDateInRange(date, range)).toBe(false);
    });

    it('範囲外（未来）の日付でfalseを返す', () => {
      const date = new Date('2025-01-01');
      expect(isDateInRange(date, range)).toBe(false);
    });

    it('境界値（最小日付）でtrueを返す', () => {
      expect(isDateInRange(range.minDate, range)).toBe(true);
    });

    it('境界値（最大日付）でtrueを返す', () => {
      expect(isDateInRange(range.maxDate, range)).toBe(true);
    });
  });

  describe('isValidDateFormat', () => {
    it('有効なYYYY-MM-DD形式でtrueを返す', () => {
      expect(isValidDateFormat('2024-01-15')).toBe(true);
      expect(isValidDateFormat('2024-12-31')).toBe(true);
    });

    it('無効な形式でfalseを返す', () => {
      expect(isValidDateFormat('24-01-15')).toBe(false);
      expect(isValidDateFormat('2024/01/15')).toBe(false);
      expect(isValidDateFormat('2024-1-15')).toBe(false);
      expect(isValidDateFormat('invalid')).toBe(false);
      expect(isValidDateFormat('')).toBe(false);
    });
  });

  describe('parseISODateString', () => {
    it('有効なISO日付文字列をDateオブジェクトに変換する', () => {
      const date = parseISODateString('2024-01-15');
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
      expect(date?.getMonth()).toBe(0); // 0-indexed
      expect(date?.getDate()).toBe(15);
    });

    it('無効な形式でnullを返す', () => {
      expect(parseISODateString('invalid')).toBeNull();
      expect(parseISODateString('2024/01/15')).toBeNull();
      expect(parseISODateString('')).toBeNull();
    });

    it('無効な日付でnullを返す', () => {
      expect(parseISODateString('2024-13-32')).toBeNull();
      expect(parseISODateString('2024-02-30')).toBeNull();
    });
  });

  describe('formatDateToISO', () => {
    it('DateオブジェクトをISO形式の文字列に変換する', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDateToISO(date)).toBe('2024-01-15');
    });

    it('時刻情報を無視してISO形式に変換する', () => {
      const date = new Date('2024-01-15T23:59:59Z');
      expect(formatDateToISO(date)).toBe('2024-01-15');
    });
  });

  describe('validateDate', () => {
    const range: DateRange = {
      minDate: new Date('2024-01-01'),
      maxDate: new Date('2024-12-31'),
    };

    it('空文字列で有効な結果を返す', () => {
      const result = validateDate('', range);
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('有効な日付で有効な結果を返す', () => {
      const result = validateDate('2024-06-15', range);
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('無効な形式でエラーを返す', () => {
      const result = validateDate('invalid', range);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('日付は YYYY-MM-DD 形式で入力してください');
      expect(result.errorCode).toBe('INVALID_FORMAT');
    });

    it('過去の日付でエラーを返す', () => {
      const result = validateDate('2023-12-31', range);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('達成期限は今日以降の日付を選択してください');
      expect(result.errorCode).toBe('PAST_DATE');
    });

    it('未来すぎる日付でエラーを返す', () => {
      const result = validateDate('2025-01-01', range);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('達成期限は1年以内の日付を選択してください');
      expect(result.errorCode).toBe('FUTURE_DATE');
    });

    it('範囲が指定されていない場合は範囲チェックをスキップする', () => {
      const result = validateDate('2024-06-15');
      expect(result.isValid).toBe(true);
    });
  });

  describe('createDateFilter', () => {
    const range: DateRange = {
      minDate: new Date('2024-01-01'),
      maxDate: new Date('2024-12-31'),
    };

    it('範囲内の日付でtrueを返すフィルター関数を作成する', () => {
      const filter = createDateFilter(range);
      expect(filter(new Date('2024-06-15'))).toBe(true);
    });

    it('範囲外の日付でfalseを返すフィルター関数を作成する', () => {
      const filter = createDateFilter(range);
      expect(filter(new Date('2023-12-31'))).toBe(false);
      expect(filter(new Date('2025-01-01'))).toBe(false);
    });
  });

  describe('getToday', () => {
    it('時刻をリセットした今日の日付を返す', () => {
      const today = getToday();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
    });
  });

  describe('addDays', () => {
    it('指定した日数を加算した日付を返す', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });

    it('負の日数で過去の日付を返す', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });

    it('元の日付オブジェクトを変更しない', () => {
      const date = new Date('2024-01-15');
      const originalDate = date.getDate();
      addDays(date, 5);
      expect(date.getDate()).toBe(originalDate);
    });
  });

  describe('addMonths', () => {
    it('指定した月数を加算した日付を返す', () => {
      const date = new Date('2024-01-15');
      const result = addMonths(date, 2);
      expect(result.getMonth()).toBe(2); // 0-indexed (March)
    });

    it('年をまたぐ場合も正しく処理する', () => {
      const date = new Date('2024-11-15');
      const result = addMonths(date, 2);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
    });
  });

  describe('addYears', () => {
    it('指定した年数を加算した日付を返す', () => {
      const date = new Date('2024-01-15');
      const result = addYears(date, 1);
      expect(result.getFullYear()).toBe(2025);
    });
  });

  describe('getDaysDifference', () => {
    it('2つの日付の差を日数で返す', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      expect(getDaysDifference(date1, date2)).toBe(5);
    });

    it('順序に関係なく絶対値を返す', () => {
      const date1 = new Date('2024-01-20');
      const date2 = new Date('2024-01-15');
      expect(getDaysDifference(date1, date2)).toBe(5);
    });
  });

  describe('isPastDate', () => {
    it('過去の日付でtrueを返す', () => {
      const pastDate = new Date('2024-01-14');
      expect(isPastDate(pastDate)).toBe(true);
    });

    it('今日の日付でfalseを返す', () => {
      const today = new Date('2024-01-15');
      expect(isPastDate(today)).toBe(false);
    });

    it('未来の日付でfalseを返す', () => {
      const futureDate = new Date('2024-01-16');
      expect(isPastDate(futureDate)).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('未来の日付でtrueを返す', () => {
      const futureDate = new Date('2024-01-16');
      expect(isFutureDate(futureDate)).toBe(true);
    });

    it('今日の日付でfalseを返す', () => {
      const today = new Date('2024-01-15');
      expect(isFutureDate(today)).toBe(false);
    });

    it('過去の日付でfalseを返す', () => {
      const pastDate = new Date('2024-01-14');
      expect(isFutureDate(pastDate)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('今日の日付でtrueを返す', () => {
      const today = new Date('2024-01-15');
      expect(isToday(today)).toBe(true);
    });

    it('時刻が異なっても同じ日ならtrueを返す', () => {
      const todayWithTime = new Date('2024-01-15T15:30:00Z');
      expect(isToday(todayWithTime)).toBe(true);
    });

    it('異なる日付でfalseを返す', () => {
      const otherDate = new Date('2024-01-16');
      expect(isToday(otherDate)).toBe(false);
    });
  });
});
