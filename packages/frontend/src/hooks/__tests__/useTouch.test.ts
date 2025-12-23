import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useTouch,
  useLongPress,
  usePinchZoom,
  useIsTouchDevice,
  useVirtualKeyboard,
  type SwipeEvent,
} from '../useTouch';

describe('useTouch', () => {
  let mockOnSwipe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSwipe = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('スワイプ検出', () => {
    it('右スワイプを検出する', () => {
      const { result } = renderHook(() => useTouch(mockOnSwipe));

      // タッチ開始
      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        result.current.onTouchStart(touchStart);
      });

      // タッチ移動
      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 200, clientY: 100 } as Touch],
        });
        result.current.onTouchMove(touchMove);
      });

      // タッチ終了
      act(() => {
        result.current.onTouchEnd();
      });

      expect(mockOnSwipe).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'right',
          distance: expect.any(Number),
          velocity: expect.any(Number),
          duration: expect.any(Number),
        })
      );
    });

    it('左スワイプを検出する', () => {
      const { result } = renderHook(() => useTouch(mockOnSwipe));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 200, clientY: 100 } as Touch],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        result.current.onTouchMove(touchMove);
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(mockOnSwipe).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'left',
        })
      );
    });

    it('上スワイプを検出する', () => {
      const { result } = renderHook(() => useTouch(mockOnSwipe));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 200 } as Touch],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        result.current.onTouchMove(touchMove);
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(mockOnSwipe).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'up',
        })
      );
    });

    it('下スワイプを検出する', () => {
      const { result } = renderHook(() => useTouch(mockOnSwipe));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 100, clientY: 200 } as Touch],
        });
        result.current.onTouchMove(touchMove);
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(mockOnSwipe).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'down',
        })
      );
    });
  });

  describe('スワイプ閾値', () => {
    it('距離が閾値未満の場合はスワイプとして検出しない', () => {
      const { result } = renderHook(() => useTouch(mockOnSwipe, { swipeThreshold: 100 }));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 130, clientY: 100 } as Touch],
        });
        result.current.onTouchMove(touchMove);
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(mockOnSwipe).not.toHaveBeenCalled();
    });

    it('カスタム閾値を設定できる', () => {
      const { result } = renderHook(() => useTouch(mockOnSwipe, { swipeThreshold: 30 }));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 140, clientY: 100 } as Touch],
        });
        result.current.onTouchMove(touchMove);
      });

      act(() => {
        result.current.onTouchEnd();
      });

      expect(mockOnSwipe).toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('onSwipeが未定義の場合でもエラーが発生しない', () => {
      const { result } = renderHook(() => useTouch());

      expect(() => {
        act(() => {
          const touchStart = new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 100 } as Touch],
          });
          result.current.onTouchStart(touchStart);
        });

        act(() => {
          const touchMove = new TouchEvent('touchmove', {
            touches: [{ clientX: 200, clientY: 100 } as Touch],
          });
          result.current.onTouchMove(touchMove);
        });

        act(() => {
          result.current.onTouchEnd();
        });
      }).not.toThrow();
    });

    it('touchMoveなしでtouchEndが呼ばれてもエラーが発生しない', () => {
      const { result } = renderHook(() => useTouch(mockOnSwipe));

      expect(() => {
        act(() => {
          const touchStart = new TouchEvent('touchstart', {
            touches: [{ clientX: 100, clientY: 100 } as Touch],
          });
          result.current.onTouchStart(touchStart);
        });

        act(() => {
          result.current.onTouchEnd();
        });
      }).not.toThrow();

      expect(mockOnSwipe).not.toHaveBeenCalled();
    });
  });
});

describe('useLongPress', () => {
  let mockOnLongPress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnLongPress = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('指定時間長押しするとコールバックが実行される', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress, 500));

      act(() => {
        result.current.onMouseDown();
      });

      expect(mockOnLongPress).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    });

    it('タッチイベントでも動作する', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress, 500));

      act(() => {
        result.current.onTouchStart();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    });

    it('デフォルトの長押し時間は500msである', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress));

      act(() => {
        result.current.onMouseDown();
      });

      act(() => {
        vi.advanceTimersByTime(499);
      });

      expect(mockOnLongPress).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('キャンセル', () => {
    it('時間内にマウスアップするとキャンセルされる', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress, 500));

      act(() => {
        result.current.onMouseDown();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onMouseUp();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockOnLongPress).not.toHaveBeenCalled();
    });

    it('マウスリーブでキャンセルされる', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress, 500));

      act(() => {
        result.current.onMouseDown();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onMouseLeave();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockOnLongPress).not.toHaveBeenCalled();
    });

    it('タッチキャンセルでキャンセルされる', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress, 500));

      act(() => {
        result.current.onTouchStart();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onTouchCancel();
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(mockOnLongPress).not.toHaveBeenCalled();
    });
  });

  describe('戻り値', () => {
    it('長押しが完了した場合trueを返す', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress, 500));

      act(() => {
        result.current.onMouseDown();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      let isLongPress = false;
      act(() => {
        isLongPress = result.current.onMouseUp();
      });

      expect(isLongPress).toBe(true);
    });

    it('長押しが完了していない場合falseを返す', () => {
      const { result } = renderHook(() => useLongPress(mockOnLongPress, 500));

      act(() => {
        result.current.onMouseDown();
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      let isLongPress = false;
      act(() => {
        isLongPress = result.current.onMouseUp();
      });

      expect(isLongPress).toBe(false);
    });
  });
});

describe('usePinchZoom', () => {
  let mockOnPinch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnPinch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('ピンチズームを検出する', () => {
      const { result } = renderHook(() => usePinchZoom(mockOnPinch));

      // 2本指でタッチ開始
      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 100 } as Touch,
            { clientX: 200, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchStart(touchStart);
      });

      // 指を広げる（ズームイン）
      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [
            { clientX: 50, clientY: 100 } as Touch,
            { clientX: 250, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchMove(touchMove);
      });

      expect(mockOnPinch).toHaveBeenCalledWith(
        expect.any(Number), // scale
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        })
      );
    });

    it('スケールが正しく計算される', () => {
      const { result } = renderHook(() => usePinchZoom(mockOnPinch));

      // 初期距離: 100px
      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 100 } as Touch,
            { clientX: 200, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchStart(touchStart);
      });

      // 距離を2倍に（200px）
      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [
            { clientX: 50, clientY: 100 } as Touch,
            { clientX: 250, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchMove(touchMove);
      });

      expect(mockOnPinch).toHaveBeenCalledWith(
        2, // scale = 200 / 100
        expect.any(Object)
      );
    });

    it('中心点が正しく計算される', () => {
      const { result } = renderHook(() => usePinchZoom(mockOnPinch));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 100 } as Touch,
            { clientX: 200, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [
            { clientX: 100, clientY: 100 } as Touch,
            { clientX: 200, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchMove(touchMove);
      });

      expect(mockOnPinch).toHaveBeenCalledWith(expect.any(Number), {
        x: 150, // (100 + 200) / 2
        y: 100,
      });
    });
  });

  describe('エッジケース', () => {
    it('1本指のタッチでは動作しない', () => {
      const { result } = renderHook(() => usePinchZoom(mockOnPinch));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [{ clientX: 100, clientY: 100 } as Touch],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [{ clientX: 200, clientY: 100 } as Touch],
        });
        result.current.onTouchMove(touchMove);
      });

      expect(mockOnPinch).not.toHaveBeenCalled();
    });

    it('onPinchが未定義の場合でもエラーが発生しない', () => {
      const { result } = renderHook(() => usePinchZoom());

      expect(() => {
        act(() => {
          const touchStart = new TouchEvent('touchstart', {
            touches: [
              { clientX: 100, clientY: 100 } as Touch,
              { clientX: 200, clientY: 100 } as Touch,
            ],
          });
          result.current.onTouchStart(touchStart);
        });

        act(() => {
          const touchMove = new TouchEvent('touchmove', {
            touches: [
              { clientX: 50, clientY: 100 } as Touch,
              { clientX: 250, clientY: 100 } as Touch,
            ],
          });
          result.current.onTouchMove(touchMove);
        });
      }).not.toThrow();
    });

    it('タッチ終了後は状態がリセットされる', () => {
      const { result } = renderHook(() => usePinchZoom(mockOnPinch));

      act(() => {
        const touchStart = new TouchEvent('touchstart', {
          touches: [
            { clientX: 100, clientY: 100 } as Touch,
            { clientX: 200, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchStart(touchStart);
      });

      act(() => {
        result.current.onTouchEnd();
      });

      // 再度タッチ移動してもコールバックは呼ばれない
      act(() => {
        const touchMove = new TouchEvent('touchmove', {
          touches: [
            { clientX: 50, clientY: 100 } as Touch,
            { clientX: 250, clientY: 100 } as Touch,
          ],
        });
        result.current.onTouchMove(touchMove);
      });

      expect(mockOnPinch).not.toHaveBeenCalled();
    });
  });
});

describe('useIsTouchDevice', () => {
  beforeEach(() => {
    // matchMediaのモック
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
  });

  it('タッチデバイスを検出する', () => {
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: {},
    });

    const { result } = renderHook(() => useIsTouchDevice());

    expect(result.current).toBe(true);
  });

  it('非タッチデバイスを検出する', () => {
    delete (window as any).ontouchstart;
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      value: 0,
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useIsTouchDevice());

    expect(result.current).toBe(false);
  });

  it('リサイズイベントで再チェックする', () => {
    const { result } = renderHook(() => useIsTouchDevice());

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBeDefined();
  });

  it('アンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useIsTouchDevice());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
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

  it('アンマウント時にイベントリスナーが削除される', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useVirtualKeyboard());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
