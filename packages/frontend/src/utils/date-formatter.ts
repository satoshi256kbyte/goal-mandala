/**
 * 日付フォーマット関連のユーティリティ関数
 */

/**
 * 日付フォーマットのオプション
 */
export interface DateFormatOptions {
  /** 年を表示するか */
  showYear?: boolean;
  /** 月を表示するか */
  showMonth?: boolean;
  /** 日を表示するか */
  showDay?: boolean;
  /** 曜日を表示するか */
  showWeekday?: boolean;
  /** 短縮形式を使用するか */
  short?: boolean;
  /** 数値形式を使用するか */
  numeric?: boolean;
}

/**
 * 日付を日本語形式でフォーマット
 */
export const formatDateToJapanese = (date: Date, options: DateFormatOptions = {}): string => {
  const {
    showYear = true,
    showMonth = true,
    showDay = true,
    showWeekday = false,
    short = false,
    numeric = false,
  } = options;

  const formatOptions: Intl.DateTimeFormatOptions = {};

  if (showYear) {
    formatOptions.year = numeric ? 'numeric' : 'numeric';
  }

  if (showMonth) {
    formatOptions.month = numeric ? 'numeric' : short ? 'short' : 'long';
  }

  if (showDay) {
    formatOptions.day = 'numeric';
  }

  if (showWeekday) {
    formatOptions.weekday = short ? 'short' : 'long';
  }

  return date.toLocaleDateString('ja-JP', formatOptions);
};

/**
 * 日付をISO形式（YYYY-MM-DD）でフォーマット
 */
export const formatDateToISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * 日付を表示用形式でフォーマット
 */
export const formatDateForDisplay = (date: Date): string => {
  return formatDateToJapanese(date, {
    showYear: true,
    showMonth: true,
    showDay: true,
    showWeekday: true,
    short: false,
  });
};

/**
 * 日付を短縮表示用形式でフォーマット
 */
export const formatDateForShortDisplay = (date: Date): string => {
  return formatDateToJapanese(date, {
    showYear: true,
    showMonth: true,
    showDay: true,
    showWeekday: false,
    short: true,
    numeric: true,
  });
};

/**
 * 日付を入力フィールド用形式でフォーマット
 */
export const formatDateForInput = (date: Date): string => {
  return formatDateToISO(date);
};

/**
 * 相対的な日付表現を取得
 */
export const formatRelativeDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今日';
  } else if (diffDays === 1) {
    return '明日';
  } else if (diffDays === -1) {
    return '昨日';
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays}日後`;
  } else if (diffDays < 0 && diffDays >= -7) {
    return `${Math.abs(diffDays)}日前`;
  } else if (diffDays > 7 && diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}週間後`;
  } else if (diffDays < -7 && diffDays >= -30) {
    const weeks = Math.floor(Math.abs(diffDays) / 7);
    return `${weeks}週間前`;
  } else if (diffDays > 30 && diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}ヶ月後`;
  } else if (diffDays < -30 && diffDays >= -365) {
    const months = Math.floor(Math.abs(diffDays) / 30);
    return `${months}ヶ月前`;
  } else if (diffDays > 365) {
    const years = Math.floor(diffDays / 365);
    return `${years}年後`;
  } else {
    const years = Math.floor(Math.abs(diffDays) / 365);
    return `${years}年前`;
  }
};

/**
 * 日付範囲を文字列でフォーマット
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const start = formatDateForShortDisplay(startDate);
  const end = formatDateForShortDisplay(endDate);

  if (start === end) {
    return start;
  }

  return `${start} 〜 ${end}`;
};

/**
 * 期限までの残り日数を表示用にフォーマット
 */
export const formatDaysUntilDeadline = (deadline: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `期限切れ（${Math.abs(diffDays)}日前）`;
  } else if (diffDays === 0) {
    return '今日が期限';
  } else if (diffDays === 1) {
    return '明日が期限';
  } else if (diffDays <= 7) {
    return `あと${diffDays}日`;
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    if (remainingDays === 0) {
      return `あと${weeks}週間`;
    } else {
      return `あと${weeks}週間${remainingDays}日`;
    }
  } else if (diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (remainingDays === 0) {
      return `あと${months}ヶ月`;
    } else {
      return `あと${months}ヶ月${remainingDays}日`;
    }
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingDays = diffDays % 365;
    if (remainingDays === 0) {
      return `あと${years}年`;
    } else {
      const months = Math.floor(remainingDays / 30);
      return `あと${years}年${months}ヶ月`;
    }
  }
};

/**
 * 日付文字列をパース（複数の形式に対応）
 */
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) {
    return null;
  }

  // ISO形式（YYYY-MM-DD）
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // 日本語形式（YYYY年MM月DD日）
  const japaneseMatch = dateString.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (japaneseMatch) {
    const [, year, month, day] = japaneseMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // スラッシュ区切り（YYYY/MM/DD）
  const slashMatch = dateString.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // ドット区切り（YYYY.MM.DD）
  const dotMatch = dateString.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (dotMatch) {
    const [, year, month, day] = dotMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

/**
 * 日付の妥当性をチェック
 */
export const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * 月の名前を取得
 */
export const getMonthName = (month: number, short: boolean = false): string => {
  const date = new Date(2000, month, 1);
  return date.toLocaleDateString('ja-JP', {
    month: short ? 'short' : 'long',
  });
};

/**
 * 曜日の名前を取得
 */
export const getWeekdayName = (date: Date, short: boolean = false): string => {
  return date.toLocaleDateString('ja-JP', {
    weekday: short ? 'short' : 'long',
  });
};

/**
 * 日付を時刻なしでコピー
 */
export const copyDateWithoutTime = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * 日付が同じ日かどうかをチェック
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  const d1 = copyDateWithoutTime(date1);
  const d2 = copyDateWithoutTime(date2);
  return d1.getTime() === d2.getTime();
};

/**
 * 日付が同じ月かどうかをチェック
 */
export const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
};

/**
 * 日付が同じ年かどうかをチェック
 */
export const isSameYear = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear();
};
