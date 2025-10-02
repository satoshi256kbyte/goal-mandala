import { useState, useEffect } from 'react';

// ブレークポイント定義
export const breakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// デバイスタイプ
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// 画面向き
export type Orientation = 'portrait' | 'landscape';

// 入力方式
export type PointerType = 'coarse' | 'fine' | 'none';

export interface ResponsiveState {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  pointerType: PointerType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouch: boolean;
  breakpoint: Breakpoint;
}

/**
 * レスポンシブ状態を管理するフック
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      // SSR対応
      return {
        width: 1024,
        height: 768,
        deviceType: 'desktop',
        orientation: 'landscape',
        pointerType: 'fine',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isPortrait: false,
        isLandscape: true,
        isTouch: false,
        breakpoint: 'lg',
      };
    }

    return getResponsiveState();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setState(getResponsiveState());
    };

    const handleOrientationChange = () => {
      // 向き変更時は少し遅延させて正確な値を取得
      setTimeout(() => {
        setState(getResponsiveState());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return state;
}

/**
 * 現在のレスポンシブ状態を取得
 */
function getResponsiveState(): ResponsiveState {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // デバイスタイプの判定
  const deviceType: DeviceType =
    width < breakpoints.md ? 'mobile' : width < breakpoints.lg ? 'tablet' : 'desktop';

  // 画面向きの判定
  const orientation: Orientation = height > width ? 'portrait' : 'landscape';

  // 入力方式の判定
  const pointerType: PointerType = window.matchMedia('(pointer: coarse)').matches
    ? 'coarse'
    : window.matchMedia('(pointer: fine)').matches
      ? 'fine'
      : 'none';

  // ブレークポイントの判定
  const breakpoint: Breakpoint =
    width >= breakpoints['2xl']
      ? '2xl'
      : width >= breakpoints.xl
        ? 'xl'
        : width >= breakpoints.lg
          ? 'lg'
          : width >= breakpoints.md
            ? 'md'
            : width >= breakpoints.sm
              ? 'sm'
              : 'xs';

  return {
    width,
    height,
    deviceType,
    orientation,
    pointerType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    isTouch: pointerType === 'coarse',
    breakpoint,
  };
}

/**
 * 特定のブレークポイント以上かどうかを判定するフック
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const { width } = useResponsive();
  return width >= breakpoints[breakpoint];
}

/**
 * メディアクエリにマッチするかどうかを判定するフック
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    setMatches(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * ビューポートサイズを取得するフック
 */
export function useViewportSize() {
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768 };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/**
 * セーフエリアの値を取得するフック
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return safeArea;
}

/**
 * 仮想キーボードの表示状態を検出するフック
 */
export function useVirtualKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = initialHeight - currentHeight;

      // 高さの差が100px以上の場合、仮想キーボードが表示されていると判定
      if (heightDiff > 100) {
        setIsVisible(true);
        setHeight(heightDiff);
      } else {
        setIsVisible(false);
        setHeight(0);
      }
    };

    // Visual Viewport APIが利用可能な場合
    if ('visualViewport' in window) {
      const visualViewport = window.visualViewport as VisualViewport;

      const handleViewportChange = () => {
        const heightDiff = window.innerHeight - visualViewport.height;
        setIsVisible(heightDiff > 100);
        setHeight(heightDiff);
      };

      visualViewport.addEventListener('resize', handleViewportChange);

      return () => {
        visualViewport.removeEventListener('resize', handleViewportChange);
      };
    } else if (typeof window !== 'undefined') {
      // フォールバック: window.resizeイベントを使用
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  return { isVisible, height };
}
