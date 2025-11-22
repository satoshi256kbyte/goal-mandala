import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 最適化されたデバウンスフック
 * メモリリークを防ぎ、パフォーマンスを向上させる
 */
export function useOptimizedDebounce<T>(
  value: T,
  delay: number,
  options?: {
    leading?: boolean; // 最初の呼び出しを即座に実行するか
    maxWait?: number; // 最大待機時間
  }
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastValueRef = useRef<T>(value);

  const { leading = false, maxWait } = options || {};

  const updateValue = useCallback((newValue: T) => {
    setDebouncedValue(newValue);
    lastValueRef.current = newValue;
  }, []);

  useEffect(() => {
    const now = Date.now();

    // 値が変更されていない場合は何もしない
    if (lastValueRef.current === value) {
      return;
    }

    // 最初の呼び出しで即座に実行する場合
    if (leading && now - lastCallTimeRef.current > delay) {
      updateValue(value);
      lastCallTimeRef.current = now;
      return;
    }

    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 最大待機時間のタイマーを設定
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        updateValue(value);
        lastCallTimeRef.current = Date.now();
        maxTimeoutRef.current = null;

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }, maxWait);
    }

    // 通常のデバウンスタイマーを設定
    timeoutRef.current = setTimeout(() => {
      updateValue(value);
      lastCallTimeRef.current = Date.now();
      timeoutRef.current = null;

      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
    }, delay);

    // クリーンアップ
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
        maxTimeoutRef.current = null;
      }
    };
  }, [value, delay, leading, maxWait, updateValue]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

/**
 * デバウンスされたコールバック関数フック
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // コールバック関数を最新に保つ
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [delay, ...deps]
  ) as T;

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * スロットル（throttle）フック
 * 指定した間隔でのみ関数を実行する
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const callbackRef = useRef<T>(callback);

  // コールバック関数を最新に保つ
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTimeRef.current;

      if (timeSinceLastCall >= delay) {
        // 即座に実行
        callbackRef.current(...args);
        lastCallTimeRef.current = now;
      } else {
        // 遅延実行
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args);
          lastCallTimeRef.current = Date.now();
          timeoutRef.current = null;
        }, delay - timeSinceLastCall);
      }
    },
    [delay, ...deps]
  ) as T;

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * 検索用の最適化されたデバウンスフック
 * 検索クエリに特化した設定
 */
export function useSearchDebounce(searchQuery: string, delay: number = 300): string {
  return useOptimizedDebounce(searchQuery, delay, {
    leading: false,
    maxWait: 1000, // 最大1秒で実行
  });
}

/**
 * フィルター用の最適化されたデバウンスフック
 * フィルター変更に特化した設定
 */
export function useFilterDebounce<T>(filters: T, delay: number = 200): T {
  return useOptimizedDebounce(filters, delay, {
    leading: false,
    maxWait: 500, // 最大500msで実行
  });
}
