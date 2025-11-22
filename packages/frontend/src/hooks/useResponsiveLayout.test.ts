import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useResponsiveLayout, useResponsiveLayoutConfig } from './useResponsiveLayout';

// window.innerWidthをモック
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

// resizeイベントをトリガー
const triggerResize = (width: number) => {
  mockInnerWidth(width);
  window.dispatchEvent(new Event('resize'));
};

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    // デフォルトでデスクトップサイズに設定
    mockInnerWidth(1200);
  });

  afterEach(() => {
    // イベントリスナーをクリーンアップ
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('デスクトップサイズで初期化される', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.deviceType).toBe('desktop');
      expect(result.current.windowWidth).toBe(1200);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
    });

    it('タブレットサイズで初期化される', () => {
      mockInnerWidth(800);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.deviceType).toBe('tablet');
      expect(result.current.windowWidth).toBe(800);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });

    it('モバイルサイズで初期化される', () => {
      mockInnerWidth(400);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.deviceType).toBe('mobile');
      expect(result.current.windowWidth).toBe(400);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });
  });

  describe('リサイズ対応', () => {
    it('デスクトップからタブレットにリサイズされる', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.deviceType).toBe('desktop');

      act(() => {
        triggerResize(800);
      });

      expect(result.current.deviceType).toBe('tablet');
      expect(result.current.windowWidth).toBe(800);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('タブレットからモバイルにリサイズされる', () => {
      mockInnerWidth(800);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.deviceType).toBe('tablet');

      act(() => {
        triggerResize(400);
      });

      expect(result.current.deviceType).toBe('mobile');
      expect(result.current.windowWidth).toBe(400);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
    });

    it('モバイルからデスクトップにリサイズされる', () => {
      mockInnerWidth(400);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.deviceType).toBe('mobile');

      act(() => {
        triggerResize(1200);
      });

      expect(result.current.deviceType).toBe('desktop');
      expect(result.current.windowWidth).toBe(1200);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
    });
  });

  describe('ブレークポイント判定', () => {
    it('isAbove関数が正しく動作する', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.isAbove('mobile')).toBe(true);
      expect(result.current.isAbove('tablet')).toBe(true);
      expect(result.current.isAbove('desktop')).toBe(true);
    });

    it('isBelow関数が正しく動作する', () => {
      mockInnerWidth(400);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.isBelow('tablet')).toBe(true);
      expect(result.current.isBelow('desktop')).toBe(true);
      expect(result.current.isBelow('mobile')).toBe(false);
    });

    it('isBetween関数が正しく動作する', () => {
      mockInnerWidth(800);
      const { result } = renderHook(() => useResponsiveLayout());

      expect(result.current.isBetween('tablet', 'desktop')).toBe(true);
      expect(result.current.isBetween('mobile', 'tablet')).toBe(false);
      expect(result.current.isBetween('desktop', 'desktop')).toBe(false);
    });
  });

  describe('レスポンシブクラス生成', () => {
    it('モバイル用のクラスが生成される', () => {
      mockInnerWidth(400);
      const { result } = renderHook(() => useResponsiveLayout());

      const classes = result.current.getResponsiveClasses({
        base: 'base-class',
        mobile: 'mobile-class',
        tablet: 'tablet-class',
        desktop: 'desktop-class',
      });

      expect(classes).toBe('base-class mobile-class');
    });

    it('タブレット用のクラスが生成される', () => {
      mockInnerWidth(800);
      const { result } = renderHook(() => useResponsiveLayout());

      const classes = result.current.getResponsiveClasses({
        base: 'base-class',
        mobile: 'mobile-class',
        tablet: 'tablet-class',
        desktop: 'desktop-class',
      });

      expect(classes).toBe('base-class tablet-class');
    });

    it('デスクトップ用のクラスが生成される', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      const classes = result.current.getResponsiveClasses({
        base: 'base-class',
        mobile: 'mobile-class',
        tablet: 'tablet-class',
        desktop: 'desktop-class',
      });

      expect(classes).toBe('base-class desktop-class');
    });

    it('空のクラスが正しく処理される', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      const classes = result.current.getResponsiveClasses({
        base: 'base-class',
        desktop: '',
      });

      expect(classes).toBe('base-class');
    });
  });

  describe('条件付きレンダリング', () => {
    it('モバイル用のコンポーネントが返される', () => {
      mockInnerWidth(400);
      const { result } = renderHook(() => useResponsiveLayout());

      const component = result.current.renderForDevice({
        mobile: 'mobile-component',
        tablet: 'tablet-component',
        desktop: 'desktop-component',
      });

      expect(component).toBe('mobile-component');
    });

    it('タブレット用のコンポーネントが返される', () => {
      mockInnerWidth(800);
      const { result } = renderHook(() => useResponsiveLayout());

      const component = result.current.renderForDevice({
        mobile: 'mobile-component',
        tablet: 'tablet-component',
        desktop: 'desktop-component',
      });

      expect(component).toBe('tablet-component');
    });

    it('デスクトップ用のコンポーネントが返される', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      const component = result.current.renderForDevice({
        mobile: 'mobile-component',
        tablet: 'tablet-component',
        desktop: 'desktop-component',
      });

      expect(component).toBe('desktop-component');
    });

    it('デフォルトコンポーネントが返される', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      const component = result.current.renderForDevice({
        mobile: 'mobile-component',
        default: 'default-component',
      });

      expect(component).toBe('default-component');
    });

    it('該当するコンポーネントがない場合nullが返される', () => {
      mockInnerWidth(1200);
      const { result } = renderHook(() => useResponsiveLayout());

      const component = result.current.renderForDevice({
        mobile: 'mobile-component',
        tablet: 'tablet-component',
      });

      expect(component).toBeNull();
    });
  });
});

describe('useResponsiveLayoutConfig', () => {
  it('デフォルト設定が返される', () => {
    mockInnerWidth(1200);
    const { result } = renderHook(() => useResponsiveLayoutConfig());

    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.columns).toBe(2);
    expect(result.current.spacing).toBe('space-y-8');
    expect(result.current.padding).toBe('p-8');
  });

  it('カスタム設定が適用される', () => {
    mockInnerWidth(800);
    const customConfig = {
      tablet: {
        columns: 3,
        spacing: 'space-y-10',
        padding: 'p-10',
      },
    };

    const { result } = renderHook(() => useResponsiveLayoutConfig(customConfig));

    expect(result.current.deviceType).toBe('tablet');
    expect(result.current.columns).toBe(3);
    expect(result.current.spacing).toBe('space-y-10');
    expect(result.current.padding).toBe('p-10');
  });

  it('部分的なカスタム設定が適用される', () => {
    mockInnerWidth(400);
    const customConfig = {
      mobile: {
        columns: 1,
        spacing: 'space-y-2',
        padding: 'p-2',
      },
    };

    const { result } = renderHook(() => useResponsiveLayoutConfig(customConfig));

    expect(result.current.deviceType).toBe('mobile');
    expect(result.current.columns).toBe(1);
    expect(result.current.spacing).toBe('space-y-2');
    expect(result.current.padding).toBe('p-2');
  });
});

describe('BREAKPOINTS定数', () => {
  it('正しいブレークポイント値が定義されている', () => {
    expect(BREAKPOINTS.mobile).toBe(0);
    expect(BREAKPOINTS.tablet).toBe(768);
    expect(BREAKPOINTS.desktop).toBe(1024);
  });
});
