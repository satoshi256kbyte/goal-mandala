/**
 * デバウンス関数
 *
 * @description
 * 指定された遅延時間内に複数回呼び出された場合、最後の呼び出しのみを実行する。
 * パフォーマンス最適化のために使用される。
 *
 * @param func - デバウンスする関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた関数
 *
 * @example
 * ```typescript
 * const debouncedValidate = debounce((field: string) => {
 *   validateField(field);
 * }, 300);
 * ```
 *
 * 要件: 11.3 - バリデーションのデバウンス
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * デバウンスのキャンセル機能付きバージョン
 *
 * @param func - デバウンスする関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた関数とキャンセル関数
 */
export function debounceWithCancel<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { debounced, cancel };
}
