import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // navigator.onLineをモック
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('初期状態', () => {
    it('オンライン状態で初期化される', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);
    });

    it('オフライン状態で初期化される', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });
  });

  describe('オンライン/オフライン切り替え', () => {
    it('オフラインイベントを検出する', () => {
      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('オンラインイベントを検出する', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });

    it('オフラインから復帰したフラグが3秒後にリセットされる', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.wasOffline).toBe(true);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.wasOffline).toBe(false);
    });

    it('オンライン→オフライン→オンラインの切り替えを正しく処理する', () => {
      const { result } = renderHook(() => useNetworkStatus());

      // 初期状態: オンライン
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);

      // オフラインに切り替え
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);

      // オンラインに復帰
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);

      // 3秒後にwasOfflineがリセット
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.wasOffline).toBe(false);
    });
  });

  describe('イベントリスナーのクリーンアップ', () => {
    it('アンマウント時にイベントリスナーが削除される', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useNetworkStatus());

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('エッジケース', () => {
    it('連続してオフラインイベントが発生しても正しく処理する', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it('連続してオンラインイベントが発生しても正しく処理する', () => {
      const { result } = renderHook(() => useNetworkStatus());

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('wasOfflineリセット前に再度オフラインになった場合', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useNetworkStatus());

      // オンラインに復帰
      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.wasOffline).toBe(true);

      // 3秒経過前に再度オフライン
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('複数回のオンライン復帰を正しく処理する', () => {
      const { result } = renderHook(() => useNetworkStatus());

      for (let i = 0; i < 3; i++) {
        // オフライン
        act(() => {
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false,
          });
          window.dispatchEvent(new Event('offline'));
        });

        expect(result.current.isOnline).toBe(false);

        // オンライン復帰
        act(() => {
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true,
          });
          window.dispatchEvent(new Event('online'));
        });

        expect(result.current.isOnline).toBe(true);
        expect(result.current.wasOffline).toBe(true);

        // wasOfflineリセット
        act(() => {
          vi.advanceTimersByTime(3000);
        });

        expect(result.current.wasOffline).toBe(false);
      }
    });
  });
});
