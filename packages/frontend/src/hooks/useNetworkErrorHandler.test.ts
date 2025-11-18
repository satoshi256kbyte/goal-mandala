import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useNetworkErrorHandler } from './useNetworkErrorHandler';
import { ApiError, NetworkErrorType } from '../services/api';

// navigator.onLineをモック
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// window.addEventListener/removeEventListenerをモック
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

describe('useNetworkErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (navigator as any).onLine = true;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.maxRetriesReached).toBe(false);
    });

    it('エラーを設定できる', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      const testError: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'テストエラー',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toEqual(testError);
      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isRetryable).toBe(true);
    });

    it('エラーをクリアできる', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      const testError: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'テストエラー',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toEqual(testError);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('エラー分類', () => {
    it('Error型のエラーを正しく変換する', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      const testError = new Error('ネットワークエラー');

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.error).toEqual({
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ネットワークエラー',
        retryable: true,
        timestamp: expect.any(Date),
      });
    });

    it('不明なエラーを正しく処理する', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      act(() => {
        result.current.setError('文字列エラー');
      });

      expect(result.current.error).toEqual({
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ネットワークエラーが発生しました',
        retryable: true,
        timestamp: expect.any(Date),
      });
    });

    it('ネットワークエラーを正しく判定する', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      const networkErrors = [
        NetworkErrorType.CONNECTION_ERROR,
        NetworkErrorType.TIMEOUT,
        NetworkErrorType.OFFLINE,
      ];

      networkErrors.forEach(errorType => {
        act(() => {
          result.current.setError({
            code: errorType,
            message: 'テスト',
            retryable: true,
            timestamp: new Date(),
          });
        });

        expect(result.current.isNetworkError).toBe(true);

        act(() => {
          result.current.clearError();
        });
      });
    });

    it('非ネットワークエラーを正しく判定する', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      act(() => {
        result.current.setError({
          code: NetworkErrorType.CLIENT_ERROR,
          message: 'クライアントエラー',
          retryable: false,
          timestamp: new Date(),
        });
      });

      expect(result.current.isNetworkError).toBe(false);
    });
  });

  describe('再試行機能', () => {
    it('再試行可能なエラーで再試行できる', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useNetworkErrorHandler({ onRetry: mockOnRetry }));

      const testError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(testError);
      });

      expect(result.current.retryCount).toBe(0);

      await act(async () => {
        result.current.retry();
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.retryCount).toBe(1);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('最大再試行回数に達すると再試行しない', () => {
      const mockOnRetry = vi.fn();
      const { result } = renderHook(() =>
        useNetworkErrorHandler({ maxRetries: 2, onRetry: mockOnRetry })
      );

      const testError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(testError);
      });

      // 最大回数まで再試行
      act(() => {
        result.current.retry(); // 1回目
      });
      act(() => {
        result.current.retry(); // 2回目
      });

      expect(result.current.retryCount).toBe(2);
      expect(result.current.maxRetriesReached).toBe(true);

      // 3回目は実行されない
      act(() => {
        result.current.retry();
      });

      expect(result.current.retryCount).toBe(2);
    });

    it('再試行不可能なエラーでは再試行しない', () => {
      const mockOnRetry = vi.fn();
      const { result } = renderHook(() => useNetworkErrorHandler({ onRetry: mockOnRetry }));

      const testError: ApiError = {
        code: NetworkErrorType.CLIENT_ERROR,
        message: 'クライアントエラー',
        retryable: false,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(testError);
      });

      act(() => {
        result.current.retry();
      });

      expect(result.current.retryCount).toBe(0);
      expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('指数バックオフで遅延時間が増加する', () => {
      const { result } = renderHook(() => useNetworkErrorHandler({ retryDelay: 1000 }));

      const testError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(testError);
      });

      // 1回目の再試行: 1000ms * 2^0 = 1000ms
      act(() => {
        result.current.retry();
      });

      // 2回目の再試行: 1000ms * 2^1 = 2000ms
      act(() => {
        result.current.retry();
      });

      expect(result.current.retryCount).toBe(2);
    });
  });

  describe('オフライン検出', () => {
    it('オフライン状態を検出する', () => {
      (navigator as any).onLine = false;

      const { result } = renderHook(() => useNetworkErrorHandler());

      expect(result.current.isOffline).toBe(true);
    });

    it('オンライン復帰を検出する', () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      // オフラインイベントをシミュレート
      const offlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];

      if (offlineHandler) {
        act(() => {
          offlineHandler();
        });
      }

      expect(result.current.isOffline).toBe(true);
      expect(result.current.error?.code).toBe(NetworkErrorType.OFFLINE);

      // オンラインイベントをシミュレート
      const onlineHandler = mockAddEventListener.mock.calls.find(call => call[0] === 'online')?.[1];

      if (onlineHandler) {
        act(() => {
          onlineHandler();
        });
      }

      expect(result.current.isOffline).toBe(false);
    });
  });

  describe('エラー回復', () => {
    it('オフラインエラーからの回復', async () => {
      const mockOnRecovery = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useNetworkErrorHandler({ onRecovery: mockOnRecovery }));

      const offlineError: ApiError = {
        code: NetworkErrorType.OFFLINE,
        message: 'オフライン',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(offlineError);
      });

      (navigator as any).onLine = true;

      const recovered = await act(async () => {
        return await result.current.attemptRecovery();
      });

      expect(recovered).toBe(true);
      expect(result.current.error).toBeNull();
      expect(mockOnRecovery).toHaveBeenCalledTimes(1);
    });

    it('タイムアウトエラーからの回復', async () => {
      const mockOnRetry = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useNetworkErrorHandler({ onRetry: mockOnRetry }));

      const timeoutError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(timeoutError);
      });

      await act(async () => {
        result.current.attemptRecovery();
        vi.advanceTimersByTime(1000);
      });

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('回復不可能なエラーは回復しない', async () => {
      const { result } = renderHook(() => useNetworkErrorHandler());

      const clientError: ApiError = {
        code: NetworkErrorType.CLIENT_ERROR,
        message: 'クライアントエラー',
        retryable: false,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(clientError);
      });

      const recovered = await act(async () => {
        return await result.current.attemptRecovery();
      });

      expect(recovered).toBe(false);
      expect(result.current.error).toEqual(clientError);
    });
  });

  describe('コールバック', () => {
    it('エラー発生時にコールバックが呼ばれる', () => {
      const mockOnError = vi.fn();
      const { result } = renderHook(() => useNetworkErrorHandler({ onError: mockOnError }));

      const testError: ApiError = {
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'テストエラー',
        retryable: true,
        timestamp: new Date(),
      };

      act(() => {
        result.current.setError(testError);
      });

      expect(mockOnError).toHaveBeenCalledWith(testError);
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にイベントリスナーが削除される', () => {
      const { unmount } = renderHook(() => useNetworkErrorHandler());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});
