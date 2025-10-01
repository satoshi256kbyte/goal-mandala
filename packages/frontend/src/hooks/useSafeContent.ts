import { useMemo } from 'react';
import { sanitizeForDisplay, sanitizeFormValue, logXSSAttempt } from '../utils/xss-protection';

/**
 * 安全なコンテンツ表示のためのカスタムフック
 */
export const useSafeContent = (content: string, source?: string) => {
  return useMemo(() => {
    if (!content) return '';

    // XSS攻撃の試行を検出してログ記録
    logXSSAttempt(content, source);

    // 安全なコンテンツとして返す
    return sanitizeForDisplay(content);
  }, [content, source]);
};

/**
 * フォーム入力値の安全な処理のためのカスタムフック
 */
export const useSafeFormValue = (value: unknown, source?: string) => {
  return useMemo(() => {
    if (typeof value !== 'string') return '';

    // XSS攻撃の試行を検出してログ記録
    logXSSAttempt(value, source);

    // 安全なフォーム値として返す
    return sanitizeFormValue(value);
  }, [value, source]);
};

/**
 * 複数の値を安全に処理するためのカスタムフック
 */
export const useSafeMultipleValues = (values: Record<string, string>, source?: string) => {
  return useMemo(() => {
    const safeValues: Record<string, string> = {};

    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // XSS攻撃の試行を検出してログ記録
        logXSSAttempt(value, `${source}-${key}`);

        // 安全な値として保存
        safeValues[key] = sanitizeForDisplay(value);
      }
    });

    return safeValues;
  }, [values, source]);
};
