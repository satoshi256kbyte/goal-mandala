import {
  formatDateToJapanese,
  formatDateToISO,
  formatDateForDisplay,
  formatDateForShortDisplay,
  formatDateForInput,
  formatRelativeDate,
  formatDateRange,
  formatDaysUntilDeadline,
  parseDate,
  isValidDate,
  getMonthName,
  getWeekdayName,
  copyDateWithoutTime,
  isSameDay,
  isSameMonth,
  isSameYear,
} from './date-formatter';

import { vi } from 'vitest';

describe('date-formatter', () => {
  beforeEach(() => {
    // 現在の日付を固定（テストの一貫性のため）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDateToJapanese', () => {
    const testDate = new Date('2024-01-15');

    it('デフォルトオプションで日本語形式にフォーマットする', () => {
      const result = formatDateToJapanese(testDate);
      expect(result).toMatch(/2024.*1.*15/);
    });

    it('年のみ表示オプションが動作する', () => {
      const result = formatDateToJapanese(testDate, {
        showYear: true,
        showMonth: false,
        showDay: false,
      });
      expect(result).toBe('2024');
    });

    it('曜日表示オプションが動作する', () => {
      const result = formatDateToJapanese(testDate, {
        showWeekday: true,
      });
      expect(result).toMatch(/月/); // 2024-01-15は月曜日
    });

    it('短縮形式オプションが動作する', () => {
      const result = formatDateToJapanese(testDate, {
        showWeekday: true,
        short: true,
      });
      expect(result).toMatch(/月/);
    });
  });

  describe('formatDateToISO', () => {
    it('DateオブジェクトをISO形式（YYYY-MM-DD）に変換する', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDateToISO(date)).toBe('2024-01-15');
    });

    it('時刻情報を無視する', () => {
      const date = new Date('2024-01-15T23:59:59Z');
      expect(formatDateToISO(date)).toBe('2024-01-15');
    });
  });

  describe('formatDateForDisplay', () => {
    it('表示用の日本語形式にフォーマットする', () => {
      const date = new Date('2024-01-15');
      const result = formatDateForDisplay(date);
      expect(result).toMatch(/2024.*1.*15.*月/);
    });
  });

  describe('formatDateForShortDisplay', () => {
    it('短縮表示用の形式にフォーマットする', () => {
      const date = new Date('2024-01-15');
      const result = formatDateForShortDisplay(date);
      expect(result).toMatch(/2024.*1.*15/);
    });
  });

  describe('formatDateForInput', () => {
    it('入力フィールド用のISO形式にフォーマットする', () => {
      const date = new Date('2024-01-15');
      expect(formatDateForInput(date)).toBe('2024-01-15');
    });
  });

  describe('formatRelativeDate', () => {
    it('今日の日付で「今日」を返す', () => {
      const today = new Date('2024-01-15');
      expect(formatRelativeDate(today)).toBe('今日');
    });

    it('明日の日付で「明日」を返す', () => {
      const tomorrow = new Date('2024-01-16');
      expect(formatRelativeDate(tomorrow)).toBe('明日');
    });

    it('昨日の日付で「昨日」を返す', () => {
      const yesterday = new Date('2024-01-14');
      expect(formatRelativeDate(yesterday)).toBe('昨日');
    });

    it('数日後の日付で「X日後」を返す', () => {
      const futureDate = new Date('2024-01-20');
      expect(formatRelativeDate(futureDate)).toBe('5日後');
    });

    it('数日前の日付で「X日前」を返す', () => {
      const pastDate = new Date('2024-01-10');
      expect(formatRelativeDate(pastDate)).toBe('5日前');
    });

    it('数週間後の日付で「X週間後」を返す', () => {
      const futureDate = new Date('2024-01-29'); // 14日後
      expect(formatRelativeDate(futureDate)).toBe('2週間後');
    });

    it('数ヶ月後の日付で「Xヶ月後」を返す', () => {
      const futureDate = new Date('2024-03-15'); // 約2ヶ月後
      expect(formatRelativeDate(futureDate)).toBe('2ヶ月後');
    });

    it('数年後の日付で「X年後」を返す', () => {
      const futureDate = new Date('2026-01-15'); // 2年後
      expect(formatRelativeDate(futureDate)).toBe('2年後');
    });
  });

  describe('formatDateRange', () => {
    it('異なる日付の範囲を正しくフォーマットする', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-20');
      const result = formatDateRange(startDate, endDate);
      expect(result).toMatch(/2024.*1.*15.*〜.*2024.*1.*20/);
    });

    it('同じ日付の場合は単一の日付を返す', () => {
      const date = new Date('2024-01-15');
      const result = formatDateRange(date, date);
      expect(result).toMatch(/2024.*1.*15/);
      expect(result).not.toMatch(/〜/);
    });
  });

  describe('formatDaysUntilDeadline', () => {
    it('今日が期限の場合', () => {
      const today = new Date('2024-01-15');
      expect(formatDaysUntilDeadline(today)).toBe('今日が期限');
    });

    it('明日が期限の場合', () => {
      const tomorrow = new Date('2024-01-16');
      expect(formatDaysUntilDeadline(tomorrow)).toBe('明日が期限');
    });

    it('数日後が期限の場合', () => {
      const futureDate = new Date('2024-01-20');
      expect(formatDaysUntilDeadline(futureDate)).toBe('あと5日');
    });

    it('期限切れの場合', () => {
      const pastDate = new Date('2024-01-10');
      expect(formatDaysUntilDeadline(pastDate)).toBe('期限切れ（5日前）');
    });

    it('数週間後が期限の場合', () => {
      const futureDate = new Date('2024-01-29'); // 14日後
      expect(formatDaysUntilDeadline(futureDate)).toBe('あと2週間');
    });

    it('数週間と数日後が期限の場合', () => {
      const futureDate = new Date('2024-01-31'); // 16日後
      expect(formatDaysUntilDeadline(futureDate)).toBe('あと2週間2日');
    });

    it('数ヶ月後が期限の場合', () => {
      const futureDate = new Date('2024-03-15'); // 約60日後
      expect(formatDaysUntilDeadline(futureDate)).toBe('あと2ヶ月');
    });

    it('数年後が期限の場合', () => {
      const futureDate = new Date('2026-01-15'); // 2年後
      expect(formatDaysUntilDeadline(futureDate)).toBe('あと2年');
    });
  });

  describe('parseDate', () => {
    it('ISO形式（YYYY-MM-DD）をパースする', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('日本語形式（YYYY年MM月DD日）をパースする', () => {
      const result = parseDate('2024年1月15日');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('スラッシュ区切り（YYYY/MM/DD）をパースする', () => {
      const result = parseDate('2024/1/15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('ドット区切り（YYYY.MM.DD）をパースする', () => {
      const result = parseDate('2024.1.15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('無効な形式でnullを返す', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('')).toBeNull();
      expect(parseDate('2024-13-32')).toBeNull();
    });
  });

  describe('isValidDate', () => {
    it('有効なDateオブジェクトでtrueを返す', () => {
      const date = new Date('2024-01-15');
      expect(isValidDate(date)).toBe(true);
    });

    it('無効なDateオブジェクトでfalseを返す', () => {
      const invalidDate = new Date('invalid');
      expect(isValidDate(invalidDate)).toBe(false);
    });

    it('Date以外のオブジェクトでfalseを返す', () => {
      expect(isValidDate('2024-01-15' as any)).toBe(false);
      expect(isValidDate(null as any)).toBe(false);
      expect(isValidDate(undefined as any)).toBe(false);
    });
  });

  describe('getMonthName', () => {
    it('月の名前を正しく返す', () => {
      expect(getMonthName(0)).toBe('1月');
      expect(getMonthName(11)).toBe('12月');
    });

    it('短縮形式で月の名前を返す', () => {
      expect(getMonthName(0, true)).toBe('1月');
      expect(getMonthName(11, true)).toBe('12月');
    });
  });

  describe('getWeekdayName', () => {
    it('曜日の名前を正しく返す', () => {
      const monday = new Date('2024-01-15'); // 月曜日
      expect(getWeekdayName(monday)).toBe('月曜日');
    });

    it('短縮形式で曜日の名前を返す', () => {
      const monday = new Date('2024-01-15'); // 月曜日
      expect(getWeekdayName(monday, true)).toBe('月');
    });
  });

  describe('copyDateWithoutTime', () => {
    it('時刻をリセットした日付のコピーを返す', () => {
      const date = new Date('2024-01-15T15:30:45.123Z');
      const result = copyDateWithoutTime(date);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);

      // 元のオブジェクトは変更されない
      expect(date.getHours()).toBe(15);
    });
  });

  describe('isSameDay', () => {
    it('同じ日の日付でtrueを返す', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T20:00:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('異なる日の日付でfalseを返す', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-16');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isSameMonth', () => {
    it('同じ月の日付でtrueを返す', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      expect(isSameMonth(date1, date2)).toBe(true);
    });

    it('異なる月の日付でfalseを返す', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-02-15');
      expect(isSameMonth(date1, date2)).toBe(false);
    });

    it('異なる年の同じ月でfalseを返す', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2023-01-15');
      expect(isSameMonth(date1, date2)).toBe(false);
    });
  });

  describe('isSameYear', () => {
    it('同じ年の日付でtrueを返す', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-12-31');
      expect(isSameYear(date1, date2)).toBe(true);
    });

    it('異なる年の日付でfalseを返す', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2023-01-15');
      expect(isSameYear(date1, date2)).toBe(false);
    });
  });
});
