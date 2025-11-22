/**
 * 認証状態監視フックのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStateMonitor } from './useAuthStateMonitor';
import { authStateMonitor, type AuthState } from '../services/auth-state-monitor';

// モック
vi.mock('../services/auth-state-monitor', () => ({
  authStateMonitor: {
    getCurrentState: vi.fn(),
    isActive: vi.fn(),
    getListenerCount: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    updateConfig: vi.fn(),
    checkAuthState: vi.fn(),
  },
}));

describe('useAuthStateMonitor', () => {
  const mockAuthStateMonitor = authStateMonitor as {
    getCurrentState: Mock;
    isActive: Mock;
    getListenerCount: Mock;
    addListener: Mock;
    removeListener: Mock;
    startMonitoring: Mock;
    stopMonitoring: Mock;
    updateConfig: Mock;
    checkAuthState: Mock;
  };

  const mockState: AuthState = {
    isAuthenticated: true,
    isLoading: false,
    user: { id: '1', email: 'test@example.com' },
    error: null,
    tokenExpirationTime: new Date(Date.now() + 3600000),
    lastActivity: new Date(),
    sessionId: 'session-123',
  };

  beforeEach(() => {
    // デフォルトのモック設定
    mockAuthStateMonitor.getCurrentState.mockReturnValue(null);
    mockAuthStateMonitor.isActive.mockReturnValue(false);
    mockAuthStateMonitor.getListenerCount.mockReturnValue(0);
    mockAuthStateMonitor.addListener.mockReturnValue(() => {});
    mockAuthStateMonitor.checkAuthState.mockResolvedValue(mockState);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('基本機能', () => {
    it('初期状態を正しく設定する', () => {
      mockAuthStateMonitor.getCurrentState.mockReturnValue(mockState);
      mockAuthStateMonitor.isActive.mockReturnValue(true);
      mockAuthStateMonitor.getListenerCount.mockReturnValue(1);

      const { result } = renderHook(() => useAuthStateMonitor());

      expect(result.current.currentState).toEqual(mockState);
      expect(result.current.isMonitoring).toBe(true);
      expect(result.current.listenerCount).toBe(1);
      expect(result.current.lastError).toBeNull();
    });

    it('リスナーを正しく登録する', () => {
      const { result } = renderHook(() => useAuthStateMonitor());

      expect(mockAuthStateMonitor.addListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.stringMatching(/^listener-\d+-/),
          onAuthStateChange: expect.any(Function),
          onTokenExpired: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('アンマウント時にリスナーを削除する', () => {
      const removeListener = vi.fn();
      mockAuthStateMonitor.addListener.mockReturnValue(removeListener);

      const { unmount } = renderHook(() => useAuthStateMonitor());

      unmount();

      expect(removeListener).toHaveBeenCalled();
    });
  });

  describe('監視の開始と停止', () => {
    it('監視を開始できる', () => {
      const { result } = renderHook(() => useAuthStateMonitor());

      act(() => {
        result.current.startMonitoring();
      });

      expect(mockAuthStateMonitor.startMonitoring).toHaveBeenCalledWith(undefined);
    });

    it('初期状態を指定して監視を開始できる', () => {
      const { result } = renderHook(() => useAuthStateMonitor());

      act(() => {
        result.current.startMonitoring(mockState);
      });

      expect(mockAuthStateMonitor.startMonitoring).toHaveBeenCalledWith(mockState);
    });

    it('監視を停止できる', () => {
      const { result } = renderHook(() => useAuthStateMonitor());

      act(() => {
        result.current.stopMonitoring();
      });

      expect(mockAuthStateMonitor.stopMonitoring).toHaveBeenCalled();
    });

    it('設定を指定して監視を開始できる', () => {
      const config = {
        checkInterval: 30000,
        tokenRefreshBuffer: 10 * 60 * 1000,
      };

      const { result } = renderHook(() => useAuthStateMonitor({ config }));

      act(() => {
        result.current.startMonitoring();
      });

      expect(mockAuthStateMonitor.updateConfig).toHaveBeenCalledWith(config);
      expect(mockAuthStateMonitor.startMonitoring).toHaveBeenCalled();
    });
  });

  describe('自動開始', () => {
    it('autoStart=trueの場合は自動で監視を開始する', () => {
      renderHook(() => useAuthStateMonitor({ autoStart: true }));

      expect(mockAuthStateMonitor.startMonitoring).toHaveBeenCalled();
    });

    it('autoStart=falseの場合は自動で監視を開始しない', () => {
      renderHook(() => useAuthStateMonitor({ autoStart: false }));

      expect(mockAuthStateMonitor.startMonitoring).not.toHaveBeenCalled();
    });

    it('既に監視中の場合は自動開始しない', () => {
      mockAuthStateMonitor.isActive.mockReturnValue(true);

      renderHook(() => useAuthStateMonitor({ autoStart: true }));

      expect(mockAuthStateMonitor.startMonitoring).not.toHaveBeenCalled();
    });
  });

  describe('認証状態チェック', () => {
    it('認証状態を手動チェックできる', async () => {
      const { result } = renderHook(() => useAuthStateMonitor());

      let checkResult: AuthState;
      await act(async () => {
        checkResult = await result.current.checkAuthState();
      });

      expect(mockAuthStateMonitor.checkAuthState).toHaveBeenCalled();
      expect(checkResult!).toEqual(mockState);
    });

    it('認証状態チェックでエラーが発生した場合はエラーを設定する', async () => {
      const error = new Error('Check failed');
      mockAuthStateMonitor.checkAuthState.mockRejectedValue(error);

      const onError = vi.fn();
      const { result } = renderHook(() => useAuthStateMonitor({ onError }));

      await act(async () => {
        try {
          await result.current.checkAuthState();
        } catch {
          // エラーは期待される
        }
      });

      expect(result.current.lastError).toEqual(
        expect.objectContaining({
          code: 'MANUAL_CHECK_FAILED',
          message: '認証状態チェックに失敗しました',
        })
      );
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('コールバック', () => {
    it('認証状態変更コールバックが呼ばれる', () => {
      const onAuthStateChange = vi.fn();
      const removeListener = vi.fn();

      let registeredListener: any;
      mockAuthStateMonitor.addListener.mockImplementation(listener => {
        registeredListener = listener;
        return removeListener;
      });

      renderHook(() => useAuthStateMonitor({ onAuthStateChange }));

      // リスナーが登録されたことを確認
      expect(registeredListener).toBeDefined();

      // 認証状態変更をシミュレート
      act(() => {
        registeredListener.onAuthStateChange(mockState);
      });

      expect(onAuthStateChange).toHaveBeenCalledWith(mockState);
    });

    it('トークン期限切れコールバックが呼ばれる', () => {
      const onTokenExpired = vi.fn();
      const removeListener = vi.fn();

      let registeredListener: any;
      mockAuthStateMonitor.addListener.mockImplementation(listener => {
        registeredListener = listener;
        return removeListener;
      });

      renderHook(() => useAuthStateMonitor({ onTokenExpired }));

      // トークン期限切れをシミュレート
      act(() => {
        registeredListener.onTokenExpired();
      });

      expect(onTokenExpired).toHaveBeenCalled();
    });

    it('エラーコールバックが呼ばれる', () => {
      const onError = vi.fn();
      const removeListener = vi.fn();

      let registeredListener: any;
      mockAuthStateMonitor.addListener.mockImplementation(listener => {
        registeredListener = listener;
        return removeListener;
      });

      renderHook(() => useAuthStateMonitor({ onError }));

      const error: AuthError = {
        code: 'TEST_ERROR',
        message: 'テストエラー',
        timestamp: new Date(),
        retryable: false,
      };

      // エラーをシミュレート
      act(() => {
        registeredListener.onError(error);
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('エラー処理', () => {
    it('監視開始でエラーが発生した場合はエラーを設定する', () => {
      mockAuthStateMonitor.startMonitoring.mockImplementation(() => {
        throw new Error('Start failed');
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useAuthStateMonitor({ onError }));

      act(() => {
        result.current.startMonitoring();
      });

      expect(result.current.lastError).toEqual(
        expect.objectContaining({
          code: 'MONITOR_START_FAILED',
          message: '認証状態監視の開始に失敗しました',
        })
      );
      expect(onError).toHaveBeenCalled();
    });

    it('監視停止でエラーが発生した場合はエラーを設定する', () => {
      mockAuthStateMonitor.stopMonitoring.mockImplementation(() => {
        throw new Error('Stop failed');
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useAuthStateMonitor({ onError }));

      act(() => {
        result.current.stopMonitoring();
      });

      expect(result.current.lastError).toEqual(
        expect.objectContaining({
          code: 'MONITOR_STOP_FAILED',
          message: '認証状態監視の停止に失敗しました',
        })
      );
      expect(onError).toHaveBeenCalled();
    });

    it('エラーをクリアできる', () => {
      const { result } = renderHook(() => useAuthStateMonitor());

      // エラーを設定
      act(() => {
        try {
          result.current.startMonitoring();
        } catch {
          // エラーは期待される
        }
      });

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.lastError).toBeNull();
    });
  });
});

describe('useSimpleAuthStateMonitor', () => {
  const mockAuthStateMonitor = authStateMonitor as {
    getCurrentState: Mock;
    isActive: Mock;
    addListener: Mock;
  };

  const mockState: AuthState = {
    isAuthenticated: true,
    isLoading: false,
    user: { id: '1', email: 'test@example.com' },
    error: null,
    tokenExpirationTime: new Date(Date.now() + 3600000),
    lastActivity: new Date(),
    sessionId: 'session-123',
  };

  beforeEach(() => {
    mockAuthStateMonitor.getCurrentState.mockReturnValue(null);
    mockAuthStateMonitor.isActive.mockReturnValue(false);
    mockAuthStateMonitor.addListener.mockReturnValue(() => {});

    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('基本的な状態を提供する', () => {
    mockAuthStateMonitor.getCurrentState.mockReturnValue(mockState);
    mockAuthStateMonitor.isActive.mockReturnValue(true);

    const { result } = renderHook(() => useSimpleAuthStateMonitor());

    expect(result.current.currentState).toEqual(mockState);
    expect(result.current.isMonitoring).toBe(true);
  });

  it('リスナーを登録する', () => {
    renderHook(() => useSimpleAuthStateMonitor());

    expect(mockAuthStateMonitor.addListener).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^simple-listener-\d+-/),
        onAuthStateChange: expect.any(Function),
        onTokenExpired: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it('定期的に状態を同期する', () => {
    const { result } = renderHook(() => useSimpleAuthStateMonitor());

    // 初期状態
    expect(result.current.isMonitoring).toBe(false);

    // 監視状態を変更
    mockAuthStateMonitor.isActive.mockReturnValue(true);
    mockAuthStateMonitor.getCurrentState.mockReturnValue(mockState);

    // 1秒進める
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isMonitoring).toBe(true);
    expect(result.current.currentState).toEqual(mockState);
  });

  it('アンマウント時にリスナーを削除する', () => {
    const removeListener = vi.fn();
    mockAuthStateMonitor.addListener.mockReturnValue(removeListener);

    const { unmount } = renderHook(() => useSimpleAuthStateMonitor());

    unmount();

    expect(removeListener).toHaveBeenCalled();
  });
});
