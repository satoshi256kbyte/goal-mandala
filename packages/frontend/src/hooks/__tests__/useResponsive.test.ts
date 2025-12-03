import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { vi } from 'vitest';
import {
  useResponsive,
  useBreakpoint,
  useMediaQuery,
  useViewportSize,
  useSafeArea,
  useVirtualKeyboard,
} from '../useResponsive';

// モックオブジェクト
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// window.matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => mockMatchMedia(false)),
});

// window.innerWidthとinnerHeightのモック
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

describe('useResponsive', () => {
  beforeEach(() => {
    // デフォルト値にリセット
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
  });

  it('デスクトップサイズで正しい状態を返す', () => {
    const { result } = renderHook(() => useResponsive());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
    expect(result.current.deviceType).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isLandscape).toBe(true);
    expect(result.current.isPortrait).toBe(false);
    expect(result.current.breakpoint).toBe('lg');
  });

  it('モバイルサイズで正しい状態を返す', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });

    const { result } = renderHook(() => useResponsive());

    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(667);
    expect(result.current.deviceType).toBe('mobile');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.breakpoint).toBe('xs');
  });

  it('タブレットサイズで正しい状態を返す', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 });
    Object.defineProperty(window, 'innerHeight', { value: 1024 });

    const { result } = renderHook(() => useResponsive());

    expect(result.current.width).toBe(768);
    expect(result.current.height).toBe(1024);
    expect(result.current.deviceType).toBe('tablet');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
    expect(result.current.breakpoint).toBe('md');
  });

  it('ウィンドウリサイズ時に状態が更新される', () => {
    const { result } = renderHook(() => useResponsive());

    // 初期状態の確認
    expect(result.current.deviceType).toBe('desktop');

    // ウィンドウサイズを変更
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.deviceType).toBe('mobile');
  });

  it('タッチデバイスを正しく検出する', () => {
    // タッチデバイスのモック
    window.matchMedia = vi.fn().mockImplementation(query => {
      if (query === '(pointer: coarse)') {
        return mockMatchMedia(true);
      }
      return mockMatchMedia(false);
    });

    const { result } = renderHook(() => useResponsive());

    expect(result.current.isTouch).toBe(true);
    expect(result.current.pointerType).toBe('coarse');
  });
});

describe('useBreakpoint', () => {
  it('指定されたブレークポイント以上の場合にtrueを返す', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });

    const { result } = renderHook(() => useBreakpoint('lg'));

    expect(result.current).toBe(true);
  });

  it('指定されたブレークポイント未満の場合にfalseを返す', () => {
    Object.defineProperty(window, 'innerWidth', { value: 640 });

    const { result } = renderHook(() => useBreakpoint('lg'));

    expect(result.current).toBe(false);
  });
});

describe('useMediaQuery', () => {
  it('メディアクエリにマッチする場合にtrueを返す', () => {
    window.matchMedia = vi.fn().mockImplementation(() => mockMatchMedia(true));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('メディアクエリにマッチしない場合にfalseを返す', () => {
    window.matchMedia = vi.fn().mockImplementation(() => mockMatchMedia(false));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);
  });
});

describe('useViewportSize', () => {
  it('現在のビューポートサイズを返す', () => {
    const { result } = renderHook(() => useViewportSize());

    // テスト環境のデフォルトサイズを確認
    expect(result.current.width).toBe(window.innerWidth);
    expect(result.current.height).toBe(window.innerHeight);
  });

  it('ウィンドウリサイズ時にサイズが更新される', () => {
    const { result } = renderHook(() => useViewportSize());

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1280 });
      Object.defineProperty(window, 'innerHeight', { value: 720 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.width).toBe(1280);
    expect(result.current.height).toBe(720);
  });
});

describe('useSafeArea', () => {
  it('セーフエリアの値を返す', () => {
    // getComputedStyleのモック
    const mockGetComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: vi.fn().mockImplementation(prop => {
        switch (prop) {
          case 'env(safe-area-inset-top)':
            return '44px';
          case 'env(safe-area-inset-bottom)':
            return '34px';
          default:
            return '0px';
        }
      }),
    });

    Object.defineProperty(window, 'getComputedStyle', {
      value: mockGetComputedStyle,
    });

    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(44);
    expect(result.current.bottom).toBe(34);
    expect(result.current.left).toBe(0);
    expect(result.current.right).toBe(0);
  });
});

describe('useVirtualKeyboard', () => {
  it('仮想キーボードが表示されていない場合', () => {
    const { result } = renderHook(() => useVirtualKeyboard());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.height).toBe(0);
  });

  it('仮想キーボードが表示された場合', () => {
    const { result } = renderHook(() => useVirtualKeyboard());

    const initialHeight = window.innerHeight;

    // 画面の高さが減少（仮想キーボード表示）
    act(() => {
      Object.defineProperty(window, 'innerHeight', { value: 400 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.height).toBe(initialHeight - 400);
  });

  it('Visual Viewport APIが利用可能な場合', () => {
    const initialHeight = window.innerHeight;

    // Visual Viewport APIのモック
    const mockVisualViewport = {
      height: 400,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, 'visualViewport', {
      value: mockVisualViewport,
      configurable: true,
    });

    const { result } = renderHook(() => useVirtualKeyboard());

    expect(result.current.isVisible).toBe(true);
    expect(result.current.height).toBe(initialHeight - 400);
  });
});
