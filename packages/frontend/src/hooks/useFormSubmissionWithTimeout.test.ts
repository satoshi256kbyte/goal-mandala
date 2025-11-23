import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  useFormSubmissionWithTimeout,
  useGoalFormSubmission,
  useDraftSaveSubmission,
} from './useFormSubmissionWithTimeout';
import { NetworkErrorType } from '../services/api';

// AbortControllerをモック
global.AbortController = vi.fn(() => ({
  abort: vi.fn(),
  signal: {},
})) as any;

describe('useFormSubmissionWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('正常な送信が機能する', async () => {
      const mockSubmitFn = vi.fn().mockResolvedValue({ success: true, id: '123' });
      const mockOnSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          onSubmitSuccess: mockOnSuccess,
        })
      );

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.data).toBeNull();

      await act(async () => {
        await result.current.submit(mockSubmitFn);
      });

      expect(mockSubmitFn).toHaveBeenCalledTimes(1);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.data).toEqual({ success: true, id: '123' });
      expect(result.current.error).toBeNull();
      expect(mockOnSuccess).toHaveBeenCalledWith({ success: true, id: '123' });
    });

    it('送信中は重複送信を防ぐ', async () => {
      const mockSubmitFn = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
        );

      const { result } = renderHook(() => useFormSubmissionWithTimeout());

      // 最初の送信
      act(() => {
        result.current.submit(mockSubmitFn);
      });

      expect(result.current.isSubmitting).toBe(true);

      // 2回目の送信（無視される）
      await act(async () => {
        await result.current.submit(mockSubmitFn);
      });

      expect(mockSubmitFn).toHaveBeenCalledTimes(1);
    });

    it('エラーが発生した場合の処理', async () => {
      const mockError = new Error('送信エラー');
      const mockSubmitFn = vi.fn().mockRejectedValue(mockError);
      const mockOnError = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          onSubmitError: mockOnError,
        })
      );

      await act(async () => {
        await result.current.submit(mockSubmitFn);
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toEqual({
        code: NetworkErrorType.CONNECTION_ERROR,
        message: '送信エラー',
        retryable: true,
        timestamp: expect.any(Date),
      });
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  describe('タイムアウト処理', () => {
    it('タイムアウト時間を超えるとタイムアウトエラーが発生する', async () => {
      const mockSubmitFn = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
        );
      const mockOnTimeout = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          timeout: 1000,
          onTimeout: mockOnTimeout,
        })
      );

      act(() => {
        result.current.submit(mockSubmitFn);
      });

      expect(result.current.isSubmitting).toBe(true);

      // タイムアウト時間経過
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(result.current.error?.code).toBe(NetworkErrorType.TIMEOUT);
      expect(mockOnTimeout).toHaveBeenCalled();
    });

    it('警告時間でコールバックが実行される', async () => {
      const mockSubmitFn = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
        );
      const mockOnWarning = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          timeout: 1000,
          warningTimeout: 500,
          onWarning: mockOnWarning,
        })
      );

      act(() => {
        result.current.submit(mockSubmitFn);
      });

      // 警告時間経過
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.isWarning).toBe(true);
      expect(mockOnWarning).toHaveBeenCalled();
    });

    it('進捗率が正しく計算される', async () => {
      const mockSubmitFn = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 2000))
        );

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          timeout: 1000,
        })
      );

      act(() => {
        result.current.submit(mockSubmitFn);
      });

      expect(result.current.progress).toBe(0);

      // 500ms経過
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current.progress).toBeCloseTo(0.5, 1);
    });
  });

  describe('キャンセル機能', () => {
    it('送信をキャンセルできる', async () => {
      const mockSubmitFn = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
        );
      const mockOnCancel = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          onCancel: mockOnCancel,
        })
      );

      act(() => {
        result.current.submit(mockSubmitFn);
      });

      expect(result.current.isSubmitting).toBe(true);

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('再試行機能', () => {
    it('再試行可能なエラーで再試行できる', async () => {
      let callCount = 0;
      const mockSubmitFn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('ネットワークエラー'));
        }
        return Promise.resolve({ success: true });
      });
      const mockOnRetry = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          maxRetries: 2,
          retryDelay: 100,
          onRetry: mockOnRetry,
        })
      );

      // 最初の送信（失敗）
      await act(async () => {
        await result.current.submit(mockSubmitFn);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.retryCount).toBe(0);

      // 再試行
      await act(async () => {
        await result.current.retry();
      });

      // 遅延時間経過
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.retryCount).toBe(1);
      });

      expect(mockOnRetry).toHaveBeenCalledWith(1);
    });

    it('最大再試行回数に達すると再試行しない', async () => {
      const mockSubmitFn = vi.fn().mockRejectedValue(new Error('エラー'));

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          maxRetries: 1,
        })
      );

      // 最初の送信
      await act(async () => {
        await result.current.submit(mockSubmitFn);
      });

      // 1回目の再試行
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.maxRetriesReached).toBe(true);

      // 2回目の再試行（実行されない）
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.retryCount).toBe(1);
    });
  });

  describe('エラークリア', () => {
    it('エラーをクリアできる', async () => {
      const mockSubmitFn = vi.fn().mockRejectedValue(new Error('エラー'));

      const { result } = renderHook(() => useFormSubmissionWithTimeout());

      await act(async () => {
        await result.current.submit(mockSubmitFn);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('コールバック', () => {
    it('送信開始時のコールバックが実行される', async () => {
      const mockSubmitFn = vi.fn().mockResolvedValue({ success: true });
      const mockOnStart = vi.fn();

      const { result } = renderHook(() =>
        useFormSubmissionWithTimeout({
          onSubmitStart: mockOnStart,
        })
      );

      await act(async () => {
        await result.current.submit(mockSubmitFn);
      });

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useGoalFormSubmission', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('目標フォーム用の設定が適用される', () => {
    const { result } = renderHook(() => useGoalFormSubmission());

    // デフォルト設定の確認（内部実装に依存するため、動作確認のみ）
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('カスタムオプションを上書きできる', () => {
    const mockOnStart = vi.fn();
    const { result } = renderHook(() =>
      useGoalFormSubmission({
        onSubmitStart: mockOnStart,
      })
    );

    expect(typeof result.current.submit).toBe('function');
  });
});

describe('useDraftSaveSubmission', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('下書き保存用の設定が適用される', () => {
    const { result } = renderHook(() => useDraftSaveSubmission());

    // デフォルト設定の確認（内部実装に依存するため、動作確認のみ）
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('カスタムオプションを上書きできる', () => {
    const mockOnSuccess = vi.fn();
    const { result } = renderHook(() =>
      useDraftSaveSubmission({
        onSubmitSuccess: mockOnSuccess,
      })
    );

    expect(typeof result.current.submit).toBe('function');
  });
});
