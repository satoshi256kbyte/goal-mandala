import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * Debounce hook for performance optimization
 */
export const useDebounce = <T extends (...args: any[]) => any>(callback: T, delay: number): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
};

/**
 * Throttle hook for performance optimization
 */
export const useThrottle = <T extends (...args: any[]) => any>(callback: T, delay: number): T => {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
};

/**
 * Stable callback hook - prevents unnecessary re-renders
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(((...args: Parameters<T>) => callbackRef.current(...args)) as T, []);
};

/**
 * Stable memo hook - prevents unnecessary re-computations
 */
export const useStableMemo = <T>(factory: () => T, deps: React.DependencyList): T => {
  return useMemo(factory, deps);
};

/**
 * Deep equality check utility
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

/**
 * Memoized validation function
 */
export const useMemoizedValidation = <T>(data: T, validationFn: (data: T) => any) => {
  return useMemo(() => validationFn(data), [data, validationFn]);
};

/**
 * Lazy loading hook
 */
export const useLazyLoad = (threshold = 0.1, onLoad?: () => void) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          if (onLoad) {
            onLoad();
          }
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, onLoad]);

  return { elementRef, isVisible, hasLoaded };
};

/**
 * Lazy image loading utility
 */
export const useLazyImage = (src: string, placeholder?: string) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  const setupLazyLoading = useCallback(() => {
    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src;
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src]);

  return {
    imgRef,
    setupLazyLoading,
    src: placeholder || '',
  };
};

/**
 * Virtual scroll hook
 */
export const useVirtualScroll = <T>(items: T[], itemHeight: number, containerHeight: number) => {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    offsetY,
    totalHeight: items.length * itemHeight,
    startIndex,
    endIndex,
    onScroll: (e: React.UIEvent<HTMLElement>) => setScrollTop(e.currentTarget.scrollTop),
  };
};

/**
 * Performance measurement hook
 */
export const usePerformanceMeasure = (name: string, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);

      const measure = performance.getEntriesByName(name)[0];
      if (measure && process.env.NODE_ENV === 'development') {
        console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
      }

      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(name);
    };
  }, [name, enabled]);
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Measure component render time
   */
  measureRenderTime: (componentName: string) => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }

      return renderTime;
    };
  },

  /**
   * Measure API call time
   */
  measureApiCall: async <T>(apiCall: () => Promise<T>, apiName: string): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const endTime = performance.now();
      const callTime = endTime - startTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(`${apiName} API call time: ${callTime.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      const callTime = endTime - startTime;

      if (process.env.NODE_ENV === 'development') {
        console.log(`${apiName} API call failed after: ${callTime.toFixed(2)}ms`);
      }

      throw error;
    }
  },
};
