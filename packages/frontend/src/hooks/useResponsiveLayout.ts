import { useState, useEffect } from 'react';

/**
 * デバイスタイプの定義
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * ブレークポイントの定義
 */
export const BREAKPOINTS = {
  mobile: 0, // 0px - 767px
  tablet: 768, // 768px - 1023px
  desktop: 1024, // 1024px以上
} as const;

/**
 * レスポンシブレイアウト管理フック
 */
export const useResponsiveLayout = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  /**
   * ウィンドウ幅からデバイスタイプを判定
   */
  const getDeviceType = (width: number): DeviceType => {
    if (width < BREAKPOINTS.tablet) {
      return 'mobile';
    } else if (width < BREAKPOINTS.desktop) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  };

  /**
   * ウィンドウリサイズハンドラー
   */
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    setWindowWidth(width);
    setDeviceType(getDeviceType(width));
  }, []);

  /**
   * 初期化とイベントリスナーの設定
   */
  useEffect(() => {
    // 初期値の設定
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      setWindowWidth(width);
      setDeviceType(getDeviceType(width));

      // リサイズイベントリスナーの追加
      window.addEventListener('resize', handleResize);

      // クリーンアップ
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [handleResize]);

  /**
   * デバイスタイプ判定ヘルパー
   */
  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';
  const isDesktop = deviceType === 'desktop';

  /**
   * ブレークポイント判定ヘルパー
   */
  const isAbove = (breakpoint: keyof typeof BREAKPOINTS): boolean => {
    return windowWidth >= BREAKPOINTS[breakpoint];
  };

  const isBelow = (breakpoint: keyof typeof BREAKPOINTS): boolean => {
    return windowWidth < BREAKPOINTS[breakpoint];
  };

  const isBetween = (
    minBreakpoint: keyof typeof BREAKPOINTS,
    maxBreakpoint: keyof typeof BREAKPOINTS
  ): boolean => {
    return windowWidth >= BREAKPOINTS[minBreakpoint] && windowWidth < BREAKPOINTS[maxBreakpoint];
  };

  /**
   * レスポンシブクラス名生成ヘルパー
   */
  const getResponsiveClasses = (classes: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    base?: string;
  }): string => {
    const { mobile = '', tablet = '', desktop = '', base = '' } = classes;

    let result = base;

    if (isMobile && mobile) {
      result += ` ${mobile}`;
    } else if (isTablet && tablet) {
      result += ` ${tablet}`;
    } else if (isDesktop && desktop) {
      result += ` ${desktop}`;
    }

    return result.trim();
  };

  /**
   * 条件付きレンダリングヘルパー
   */
  const renderForDevice = <T>(components: {
    mobile?: T;
    tablet?: T;
    desktop?: T;
    default?: T;
  }): T | null => {
    const { mobile, tablet, desktop, default: defaultComponent } = components;

    if (isMobile && mobile !== undefined) {
      return mobile;
    } else if (isTablet && tablet !== undefined) {
      return tablet;
    } else if (isDesktop && desktop !== undefined) {
      return desktop;
    } else if (defaultComponent !== undefined) {
      return defaultComponent;
    }

    return null;
  };

  return {
    // 状態
    deviceType,
    windowWidth,

    // デバイスタイプ判定
    isMobile,
    isTablet,
    isDesktop,

    // ブレークポイント判定
    isAbove,
    isBelow,
    isBetween,

    // ヘルパー関数
    getResponsiveClasses,
    renderForDevice,
  };
};

/**
 * レスポンシブレイアウト設定の型定義
 */
export interface ResponsiveLayoutConfig {
  /** モバイル用の設定 */
  mobile: {
    columns: number;
    spacing: string;
    padding: string;
  };
  /** タブレット用の設定 */
  tablet: {
    columns: number;
    spacing: string;
    padding: string;
  };
  /** デスクトップ用の設定 */
  desktop: {
    columns: number;
    spacing: string;
    padding: string;
  };
}

/**
 * デフォルトのレスポンシブレイアウト設定
 */
export const DEFAULT_LAYOUT_CONFIG: ResponsiveLayoutConfig = {
  mobile: {
    columns: 1,
    spacing: 'space-y-4',
    padding: 'p-4',
  },
  tablet: {
    columns: 1,
    spacing: 'space-y-6',
    padding: 'p-6',
  },
  desktop: {
    columns: 2,
    spacing: 'space-y-8',
    padding: 'p-8',
  },
};

/**
 * レスポンシブレイアウト設定フック
 */
export const useResponsiveLayoutConfig = (customConfig?: Partial<ResponsiveLayoutConfig>) => {
  const { deviceType } = useResponsiveLayout();

  const config = {
    ...DEFAULT_LAYOUT_CONFIG,
    ...customConfig,
  };

  const currentConfig = config[deviceType];

  return {
    ...currentConfig,
    deviceType,
    config,
  };
};
