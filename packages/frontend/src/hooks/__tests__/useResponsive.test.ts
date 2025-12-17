import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useResponsive,
  useBreakpoint,
  useMediaQuery,
  useViewportSize,
  useSafeArea,
  useVirtualKeyboard,
  breakpoints,
} from '../useResponsive';

describe('useResponsive', () => {
  // モックのwindowサイズ
  let mockInnerWidth = 1024;
  let mockInnerHeight = 768;

  beforeEach(() => {
    // windowサイズのモック
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockInnerWidth,
    });

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: mockInnerHeight,
    });

    // matchMediaのモック
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: fine)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('デスクトップサイズで初期化される', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
      expect(result.current.deviceType).toBe('desktop');
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
    });

    it('モバイルサイズで初期化される', () => {
      mockInnerWidth = 375;
      mockInnerHeight = 667;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });
      Object.defineProperty(window, 'innerHeight', { value: mockInnerHeight });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(375);
      expect(result.current.height).toBe(667);
      expect(result.current.deviceType).toBe('mobile');
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.isTablet).toBe(false);
    });

    it('タブレットサイズで初期化される', () => {
      mockInnerWidth = 800;
      mockInnerHeight = 600;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });
      Object.defineProperty(window, 'innerHeight', { value: mockInnerHeight });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(800);
      expect(result.current.height).toBe(600);
      expect(result.current.deviceType).toBe('tablet');
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(false);
    });
  });

  describe('画面向き', () => {
    it('横向き（landscape）を検出する', () => {
      mockInnerWidth = 1024;
      mockInnerHeight = 768;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });
      Object.defineProperty(window, 'innerHeight', { value: mockInnerHeight });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.orientation).toBe('landscape');
      expect(result.current.isLandscape).toBe(true);
      expect(result.current.isPortrait).toBe(false);
    });

    it('縦向き（portrait）を検出する', () => {
      mockInnerWidth = 375;
      mockInnerHeight = 667;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });
      Object.defineProperty(window, 'innerHeight', { value: mockInnerHeight });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.orientation).toBe('portrait');
      expect(result.current.isPortrait).toBe(true);
      expect(result.current.isLandscape).toBe(false);
    });
  });

  describe('入力方式', () => {
    it('fine（マウス）を検出する', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.pointerType).toBe('fine');
      expect(result.current.isTouch).toBe(false);
    });

    it('coarse（タッチ）を検出する', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(pointer: coarse)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.pointerType).toBe('coarse');
      expect(result.current.isTouch).toBe(true);
    });
  });

  describe('ブレークポイント', () => {
    it('xsブレークポイントを検出する', () => {
      mockInnerWidth = 400;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('xs');
    });

    it('smブレークポイントを検出する', () => {
      mockInnerWidth = 640;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('sm');
    });

    it('mdブレークポイントを検出する', () => {
      mockInnerWidth = 768;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('md');
    });

    it('lgブレークポイントを検出する', () => {
      mockInnerWidth = 1024;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('lg');
    });

    it('xlブレークポイントを検出する', () => {
      mockInnerWidth = 1280;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('xl');
    });

    it('2xlブレークポイントを検出する', () => {
      mockInnerWidth = 1536;
      Object.defineProperty(window, 'innerWidth', { value: mockInnerWidth });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.breakpoint).toBe('2xl');
    });
  });

  describe('リサイズイベント', () => {
    it('リサイズイベントで状態が更新される', async () => {
      // 初期値を明示的に設定
      mockInnerWidth = 1024;
      mockInnerHeight = 768;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: mockInnerWidth,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: mockInnerHeight,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(1024);
      expect(result.current.deviceType).toBe('desktop');

      // リサイズイベントをシミュレート
      act(() => {
        mockInnerWidth = 375;
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: mockInnerWidth,
        });
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        expect(result.current.width).toBe(375);
        expect(result.current.deviceType).toBe('mobile');
      });
    });

    it.skip('orientationchangeイベントで状態が更新される', async () => {
      vi.useFakeTimers();

      // 初期値を明示的に設定
      mockInnerWidth = 1024;
      mockInnerHeight = 768;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: mockInnerWidth,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: mockInnerHeight,
      });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.orientation).toBe('landscape');

      // 向き変更イベントをシミュレート
      act(() => {
        mockInnerWidth = 667;
        mockInnerHeight = 375;
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: mockInnerWidth,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: mockInnerHeight,
        });
        window.dispatchEvent(new Event('orientationchange'));
      });

      // 100msの遅延を待つ
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.orientation).toBe('landscape');
      });

      vi.useRealTimers();
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にイベントリスナーが削除される', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useResponsive());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'orientationchange',
        expect.any(Function)
      );
    });
  });
});

describe('useBreakpoint', () => {
  beforeEach(() => {
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

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: fine)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('指定したブレークポイント以上の場合trueを返す', () => {
    const { result } = renderHook(() => useBreakpoint('md'));

    expect(result.current).toBe(true);
  });

  it('指定したブレークポイント未満の場合falseを返す', () => {
    const { result } = renderHook(() => useBreakpoint('xl'));

    expect(result.current).toBe(false);
  });
});

describe('useMediaQuery', () => {
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia,
    });
  });

  it('メディアクエリにマッチする場合trueを返す', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('メディアクエリにマッチしない場合falseを返す', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(result.current).toBe(false);
  });

  it.skip('メディアクエリの変更を検出する', async () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (event: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    expect(result.current).toBe(false);

    // メディアクエリの変更をシミュレート
    await waitFor(
      () => {
        if (changeHandler) {
          act(() => {
            changeHandler!({ matches: true } as MediaQueryListEvent);
          });
          expect(result.current).toBe(true);
        }
      },
      { timeout: 5000 }
    );
  });

  it('アンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.fn();

    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerSpy,
      dispatchEvent: vi.fn(),
    }));

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('useViewportSize', () => {
  beforeEach(() => {
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
  });

  it('初期ビューポートサイズを返す', () => {
    const { result } = renderHook(() => useViewportSize());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  it.skip('リサイズイベントでビューポートサイズが更新される', async () => {
    const { result } = renderHook(() => useViewportSize());

    expect(result.current.width).toBe(1024);

    // リサイズイベントをシミュレート
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(
      () => {
        expect(result.current.width).toBe(1280);
        expect(result.current.height).toBe(800);
      },
      { timeout: 5000 }
    );
  });

  it('アンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useViewportSize());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});

describe('useSafeArea', () => {
  beforeEach(() => {
    // getComputedStyleのモック
    global.getComputedStyle = vi.fn().mockReturnValue({
      getPropertyValue: vi.fn((prop: string) => {
        if (prop === 'env(safe-area-inset-top)') return '20';
        if (prop === 'env(safe-area-inset-right)') return '0';
        if (prop === 'env(safe-area-inset-bottom)') return '34';
        if (prop === 'env(safe-area-inset-left)') return '0';
        return '0';
      }),
    });
  });

  it('初期セーフエリアを返す', () => {
    const { result } = renderHook(() => useSafeArea());

    expect(result.current.top).toBe(20);
    expect(result.current.right).toBe(0);
    expect(result.current.bottom).toBe(34);
    expect(result.current.left).toBe(0);
  });

  it('アンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useSafeArea());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('orientationchange', expect.any(Function));
  });
});

describe('useVirtualKeyboard', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  it('初期状態では仮想キーボードが非表示', () => {
    const { result } = renderHook(() => useVirtualKeyboard());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.height).toBe(0);
  });

  it.skip('高さの差が100px以上の場合、仮想キーボードが表示されていると判定', async () => {
    const { result } = renderHook(() => useVirtualKeyboard());

    // リサイズイベントをシミュレート（キーボード表示）
    act(() => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 500,
      });
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(
      () => {
        expect(result.current.isVisible).toBe(true);
        expect(result.current.height).toBe(300);
      },
      { timeout: 5000 }
    );
  });

  it.skip('高さの差が100px未満の場合、仮想キーボードが非表示と判定', async () => {
    const { result } = renderHook(() => useVirtualKeyboard());

    // リサイズイベントをシミュレート（キーボード非表示）
    act(() => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 750,
      });
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(
      () => {
        expect(result.current.isVisible).toBe(false);
        expect(result.current.height).toBe(0);
      },
      { timeout: 5000 }
    );
  });

  it('アンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useVirtualKeyboard());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
