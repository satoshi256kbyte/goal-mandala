/**
 * useNetworkStatus フックのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '../useNetworkStatus';

describe('useNetworkStatus', () => {
  let onlineGetter: vi.SpyInstance;

  beforeEach(() => {
    vi.useFakeTimers();
    // navigator.onLineをモック
    onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
  });

  afterEach(() => {
    vi.useRealTimers();
    onlineGetter.mockRestore();
  });

  describe('基本機能', () => {
    it('初期状態でオンライン状態を返す', () => {
      onlineGetter.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);
    });

    it('初期状態でオフライン状態を返す', () => {
      onlineGetter.mockReturnValue(false);

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('オフラインイベントでオフライン状態になる', () => {
      onlineGetter.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);

      // オフラインイベントを発火
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('オンラインイベントでオンライン状態になる', () => {
      onlineGetter.mockReturnValue(false);

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);

      // オンラインイベントを発火
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });

    it('オフラインから復帰した場合、wasOfflineがtrueになる', () => {
      onlineGetter.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkStatus());

      // オフラインにする
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);

      // オンラインに復帰
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });

    it('オンライン復帰後、3秒後にwasOfflineがfalseになる', async () => {
      onlineGetter.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkStatus());

      // オフラインにする
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      // オンラインに復帰
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.wasOffline).toBe(true);

      // 3秒進める
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.wasOffline).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('複数回オフライン/オンラインを繰り返しても正しく動作する', async () => {
      onlineGetter.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkStatus());

      // 1回目: オフライン → オンライン
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);

      // 3秒待つ
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.wasOffline).toBe(false);

      // 2回目: オフライン → オンライン
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });
      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });
      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);

      // 3秒待つ
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(result.current.wasOffline).toBe(false);
    });

    it('オンライン状態でオンラインイベントが発火してもwasOfflineがtrueになる', () => {
      onlineGetter.mockReturnValue(true);

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(false);

      // オンライン状態でオンラインイベントを発火
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.wasOffline).toBe(true);
    });

    it('オフライン状態でオフラインイベントが発火してもwasOfflineはfalseのまま', () => {
      onlineGetter.mockReturnValue(false);

      const { result } = renderHook(() => useNetworkStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);

      // オフライン状態でオフラインイベントを発火
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.wasOffline).toBe(false);
    });

    it('アンマウント時にイベントリスナーがクリーンアップされる', () => {
      onlineGetter.mockReturnValue(true);

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useNetworkStatus());

      // アンマウント
      unmount();

      // イベントリスナーが削除されたことを確認
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('wasOfflineリセット前にアンマウントされてもエラーが発生しない', () => {
      onlineGetter.mockReturnValue(true);

      const { result, unmount } = renderHook(() => useNetworkStatus());

      // オフライン → オンライン
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.wasOffline).toBe(true);

      // アンマウント（タイマーがクリアされる）
      unmount();

      // タイマーを進めてもエラーが発生しない
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(3000);
        });
      }).not.toThrow();
    });
  });
});
