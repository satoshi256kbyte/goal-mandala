import { renderHook, act } from '@testing-library/react';
import { useErrorRecovery, RecoveryStrategy, RecoveryAction } from './useErrorRecovery';
import { ApiError, NetworkErrorType } from '../services/api';

// navigator.onLineをモック
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// window.location.reloadをモック
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn(),
  },
  writable: true,
});

// cachesをモック
Object.defineProperty(window, 'caches', {
  value: {
    keys: jest.fn().mockResolvedValue(['cache1', 'cache2']),
    delete: jest.fn().mockResolvedValue(true),
  },
  writable: true,
});

describe('useErrorRecovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (navigator as any).onLine = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useErrorRecovery());

      expect(result.current.recoveryState).toEqual({
        isRecovering: false,
        strategy: null,
        recommendedActions: [],
        recoveryAttempts: 0,
        lastRecoveryAttempt: null,
        recoverySuccessful: false,
      });
      expect(result.current.recoveryProgress).toBe(0);
    });

    it('回復可能なエラーを正しく判定する', () => {
      const { result } = renderHook(() => useErrorRecovery());

      const recoverableError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      const unrecoverableError: ApiError = {
        code: NetworkErrorType.CLIENT_ERROR,
        message: 'クライアントエラー',
        retryable: false,
        timestamp: new Date(),
      };

      expect(result.current.isRecoverable(recoverableError)).toBe(true);
      expect(result.current.isRecoverable(unrecoverableError)).toBe(true); // CLIENT_ERRORも回復可能として扱う
    });

    it('推奨回復戦略を正しく取得する', () => {
      const { result } = renderHook(() => useErrorRecovery());

      const timeoutError: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      const offlineError: ApiError = {
        code: NetworkErrorType.OFFLINE,
        message: 'オフライン',
        retryable: true,
        timestamp: new Date(),
      };

      expect(result.current.getRecoveryStrategy(timeoutError)).toBe(RecoveryStrategy.AUTO_RETRY);
      expect(result.current.getRecoveryStrategy(offlineError)).toBe(RecoveryStrategy.WAIT_ONLINE);
    });
  });

  describe('自動回復', () => {
    it('自動回復が成功する', async () => {
      const mockRetryFunction = jest.fn().mockResolvedValue('success');
      const mockOnRecoverySuccess = jest.fn();

      const { result } = renderHook(() =>
        useErrorRecovery({
          enableAutoRecovery: true,
          recoveryInterval: 100,
          onRecoverySuccess: mockOnRecoverySuccess,
        })
      );

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      const recoveryPromise = act(async () => {
        return await result.current.startRecovery(error, {
          retryFunction: mockRetryFunction,
        });
      });

      // 遅延時間を進める
      act(() => {
        jest.advanceTimersByTime(100);
      });

      const success = await recoveryPromise;

      expect(success).toBe(true);
      expect(mockRetryFunction).toHaveBeenCalledTimes(1);
      expect(mockOnRecoverySuccess).toHaveBeenCalledWith(RecoveryStrategy.AUTO_RETRY);
      expect(result.current.recoveryState.recoverySuccessful).toBe(true);
    });

    it('自動回復が失敗する', async () => {
      const mockRetryFunction = jest.fn().mockRejectedValue(new Error('再試行失敗'));
      const mockOnRecoveryFailure = jest.fn();

      const { result } = renderHook(() =>
        useErrorRecovery({
          enableAutoRecovery: true,
          recoveryInterval: 100,
          onRecoveryFailure: mockOnRecoveryFailure,
        })
      );

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      const recoveryPromise = act(async () => {
        return await result.current.startRecovery(error, {
          retryFunction: mockRetryFunction,
        });
      });

      // 遅延時間を進める
      act(() => {
        jest.advanceTimersByTime(100);
      });

      const success = await recoveryPromise;

      expect(success).toBe(false);
      expect(mockOnRecoveryFailure).toHaveBeenCalled();
      expect(result.current.recoveryState.recoverySuccessful).toBe(false);
    });
  });

  describe('オフライン回復', () => {
    it('オンライン復帰を待つ', async () => {
      const mockOnRecoverySuccess = jest.fn();

      const { result } = renderHook(() =>
        useErrorRecovery({
          enableOfflineDetection: true,
          onRecoverySuccess: mockOnRecoverySuccess,
        })
      );

      const error: ApiError = {
        code: NetworkErrorType.OFFLINE,
        message: 'オフライン',
        retryable: true,
        timestamp: new Date(),
      };

      // オフライン状態に設定
      (navigator as any).onLine = false;

      const recoveryPromise = act(async () => {
        return await result.current.startRecovery(error);
      });

      // しばらく待つ
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // オンライン復帰
      (navigator as any).onLine = true;

      // さらに待つ
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const success = await recoveryPromise;

      expect(success).toBe(true);
      expect(mockOnRecoverySuccess).toHaveBeenCalledWith(RecoveryStrategy.WAIT_ONLINE);
    });
  });

  describe('手動回復アクション', () => {
    it('再試行アクションが機能する', async () => {
      const mockRetryFunction = jest.fn().mockResolvedValue('success');

      const { result } = renderHook(() => useErrorRecovery());

      // コンテキストを設定
      await act(async () => {
        await result.current.startRecovery(
          {
            code: NetworkErrorType.CLIENT_ERROR,
            message: 'クライアントエラー',
            retryable: false,
            timestamp: new Date(),
          },
          { retryFunction: mockRetryFunction }
        );
      });

      const success = await act(async () => {
        return await result.current.executeRecoveryAction(RecoveryAction.RETRY);
      });

      expect(success).toBe(true);
      expect(mockRetryFunction).toHaveBeenCalledTimes(1);
    });

    it('リロードアクションが機能する', async () => {
      const { result } = renderHook(() => useErrorRecovery());

      const success = await act(async () => {
        return await result.current.executeRecoveryAction(RecoveryAction.RELOAD);
      });

      expect(success).toBe(true);
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it('キャッシュクリアアクションが機能する', async () => {
      const { result } = renderHook(() => useErrorRecovery());

      const success = await act(async () => {
        return await result.current.executeRecoveryAction(RecoveryAction.CLEAR_CACHE);
      });

      expect(success).toBe(true);
      expect(window.caches.keys).toHaveBeenCalledTimes(1);
      expect(window.caches.delete).toHaveBeenCalledTimes(2);
    });

    it('ストレージクリアアクションが機能する', async () => {
      const mockLocalStorageClear = jest.fn();
      const mockSessionStorageClear = jest.fn();

      Object.defineProperty(window, 'localStorage', {
        value: { clear: mockLocalStorageClear },
        writable: true,
      });

      Object.defineProperty(window, 'sessionStorage', {
        value: { clear: mockSessionStorageClear },
        writable: true,
      });

      const { result } = renderHook(() => useErrorRecovery());

      const success = await act(async () => {
        return await result.current.executeRecoveryAction(RecoveryAction.CLEAR_STORAGE);
      });

      expect(success).toBe(true);
      expect(mockLocalStorageClear).toHaveBeenCalledTimes(1);
      expect(mockSessionStorageClear).toHaveBeenCalledTimes(1);
    });

    it('代替手段の提案アクションが機能する', async () => {
      const mockFallbackFunction = jest.fn().mockResolvedValue('fallback success');

      const { result } = renderHook(() => useErrorRecovery());

      // コンテキストを設定
      await act(async () => {
        await result.current.startRecovery(
          {
            code: NetworkErrorType.SERVER_ERROR,
            message: 'サーバーエラー',
            retryable: true,
            timestamp: new Date(),
          },
          { fallbackFunction: mockFallbackFunction }
        );
      });

      const success = await act(async () => {
        return await result.current.executeRecoveryAction(RecoveryAction.SUGGEST_ALTERNATIVE);
      });

      expect(success).toBe(true);
      expect(mockFallbackFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('回復状態管理', () => {
    it('回復状態をリセットできる', async () => {
      const { result } = renderHook(() => useErrorRecovery());

      // 回復を開始
      await act(async () => {
        await result.current.startRecovery({
          code: NetworkErrorType.TIMEOUT,
          message: 'タイムアウト',
          retryable: true,
          timestamp: new Date(),
        });
      });

      expect(result.current.recoveryState.recoveryAttempts).toBe(1);

      // リセット
      act(() => {
        result.current.resetRecovery();
      });

      expect(result.current.recoveryState).toEqual({
        isRecovering: false,
        strategy: null,
        recommendedActions: [],
        recoveryAttempts: 0,
        lastRecoveryAttempt: null,
        recoverySuccessful: false,
      });
      expect(result.current.recoveryProgress).toBe(0);
    });

    it('回復試行回数が正しく記録される', async () => {
      const { result } = renderHook(() => useErrorRecovery());

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      // 1回目の回復
      await act(async () => {
        await result.current.startRecovery(error);
      });

      expect(result.current.recoveryState.recoveryAttempts).toBe(1);

      // 2回目の回復
      await act(async () => {
        await result.current.startRecovery(error);
      });

      expect(result.current.recoveryState.recoveryAttempts).toBe(2);
    });
  });

  describe('コールバック', () => {
    it('回復開始時のコールバックが実行される', async () => {
      const mockOnRecoveryStart = jest.fn();

      const { result } = renderHook(() =>
        useErrorRecovery({
          onRecoveryStart: mockOnRecoveryStart,
        })
      );

      await act(async () => {
        await result.current.startRecovery({
          code: NetworkErrorType.TIMEOUT,
          message: 'タイムアウト',
          retryable: true,
          timestamp: new Date(),
        });
      });

      expect(mockOnRecoveryStart).toHaveBeenCalledWith(RecoveryStrategy.AUTO_RETRY);
    });

    it('回復進捗のコールバックが実行される', async () => {
      const mockOnRecoveryProgress = jest.fn();
      const mockRetryFunction = jest.fn().mockResolvedValue('success');

      const { result } = renderHook(() =>
        useErrorRecovery({
          onRecoveryProgress: mockOnRecoveryProgress,
          recoveryInterval: 100,
        })
      );

      const recoveryPromise = act(async () => {
        return await result.current.startRecovery(
          {
            code: NetworkErrorType.TIMEOUT,
            message: 'タイムアウト',
            retryable: true,
            timestamp: new Date(),
          },
          { retryFunction: mockRetryFunction }
        );
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await recoveryPromise;

      expect(mockOnRecoveryProgress).toHaveBeenCalledWith(0.3);
      expect(mockOnRecoveryProgress).toHaveBeenCalledWith(0.6);
      expect(mockOnRecoveryProgress).toHaveBeenCalledWith(1);
    });
  });

  describe('オプション設定', () => {
    it('自動回復を無効にできる', () => {
      const { result } = renderHook(() => useErrorRecovery({ enableAutoRecovery: false }));

      const error: ApiError = {
        code: NetworkErrorType.TIMEOUT,
        message: 'タイムアウト',
        retryable: true,
        timestamp: new Date(),
      };

      const strategy = result.current.getRecoveryStrategy(error);
      expect(strategy).toBe(RecoveryStrategy.MANUAL_RETRY);
    });

    it('オフライン検出を無効にできる', async () => {
      const { result } = renderHook(() => useErrorRecovery({ enableOfflineDetection: false }));

      const error: ApiError = {
        code: NetworkErrorType.OFFLINE,
        message: 'オフライン',
        retryable: true,
        timestamp: new Date(),
      };

      const success = await act(async () => {
        return await result.current.startRecovery(error);
      });

      // オフライン検出が無効なので回復しない
      expect(success).toBe(false);
    });
  });
});
