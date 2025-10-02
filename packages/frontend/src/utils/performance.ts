/**
 * パフォーマンス最適化ユーティリティ
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * 深い比較を行うためのユーティリティ
 */
export const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
};

/**
 * 安定したコールバック参照を提供するフック
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, [callback, ...deps]);
};

/**
 * 安定したメモ化値を提供するフック
 */
export const useStableMemo = <T>(factory: () => T, deps: React.DependencyList): T => {
  return useMemo(factory, [factory, ...deps]);
};

/**
 * 前回の値と比較して変更があった場合のみ更新するフック
 */
export const useDeepMemo = <T>(value: T): T => {
  const ref = useRef<T>(value);

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};

/**
 * デバウンス処理を行うフック
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * スロットル処理を行うフック
 */
export const useThrottle = <T extends (...args: any[]) => any>(callback: T, delay: number): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * 仮想スクロール用のアイテム計算フック
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  visibleItems: number;
  totalHeight: number;
  offsetY: number;
}

export const useVirtualScroll = (
  itemCount: number,
  scrollTop: number,
  options: VirtualScrollOptions
): VirtualScrollResult => {
  return useMemo(() => {
    const { itemHeight, containerHeight, overscan = 5 } = options;

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(itemCount - 1, startIndex + visibleItems + overscan * 2);

    const totalHeight = itemCount * itemHeight;
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      visibleItems,
      totalHeight,
      offsetY,
    };
  }, [itemCount, scrollTop, options]);
};

/**
 * レンダリング回数を追跡するフック（開発用）
 */
export const useRenderCount = (componentName: string): number => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    }
  });

  return renderCount.current;
};

/**
 * メモリ使用量を監視するフック（開発用）
 */
export const useMemoryMonitor = (componentName: string): void => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`${componentName} memory usage:`, {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
      });
    }
  });
};

/**
 * パフォーマンス測定フック
 */
export const usePerformanceMeasure = (name: string) => {
  const startTime = useRef<number>();

  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      if (process.env.NODE_ENV === 'development') {
        console.log(`${name} took ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
    return 0;
  }, [name]);

  return { start, end };
};

/**
 * 遅延ローディング用のIntersection Observer フック
 */
export const useLazyLoad = (threshold = 0.1, rootMargin = '50px') => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasLoaded) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, hasLoaded]);

  return { elementRef, isVisible, hasLoaded };
};
