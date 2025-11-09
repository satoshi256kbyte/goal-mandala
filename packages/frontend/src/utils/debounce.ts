/**
 * デバウンス関数
 *
 * 指定された遅延時間内に複数回呼び出された場合、最後の呼び出しのみを実行します。
 *
 * @param func - デバウンスする関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた関数
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((keyword: string) => {
 *   console.log('Searching:', keyword);
 * }, 300);
 *
 * debouncedSearch('test'); // 300ms後に実行
 * debouncedSearch('test2'); // 前の呼び出しはキャンセルされ、300ms後に実行
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    // 既存のタイマーをクリア
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // 新しいタイマーを設定
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}
