import { renderHook, act } from '@testing-library/react';
import { useTimeout, useMultipleTimeouts, useFormTimeout } from './useTimeout';

describe('useTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本機能', () => {
    it('指定時間後にコールバックが実行される', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useTimeout());

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      expect(result.current.isActive).toBe(true);
      expect(mockCallback).not.toHaveBeenCalled();

      // 1秒経過
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(result.current.isActive).toBe(false);
    });

    it('タイムアウトをクリアできる', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useTimeout());

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.clearTimeout();
      });

      expect(result.current.isActive).toBe(false);

      // 1秒経過してもコールバックは実行されない
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('残り時間が正しく計算される', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useTimeout({ progressInterval: 100 }));

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      expect(result.current.remainingTime).toBe(1000);

      // 500ms経過
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.remainingTime).toBeLessThanOrEqual(500);
      expect(result.current.remainingTime).toBeGreaterThan(400);
    });
  });

  describe('コールバック', () => {
    it('開始時のコールバックが実行される', () => {
      const mockOnStart = jest.fn();
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useTimeout({ onStart: mockOnStart }));

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      expect(mockOnStart).toHaveBeenCalledTimes(1);
    });

    it('タイムアウト時のコールバックが実行される', () => {
      const mockOnTimeout = jest.fn();
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useTimeout({ onTimeout: mockOnTimeout }));

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnTimeout).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('キャンセル時のコールバックが実行される', () => {
      const mockOnCancel = jest.fn();
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useTimeout({ onCancel: mockOnCancel }));

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      act(() => {
        result.current.clearTimeout();
      });

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('自動クリーンアップ', () => {
    it('アンマウント時に自動でクリーンアップされる', () => {
      const mockCallback = jest.fn();
      const { result, unmount } = renderHook(() => useTimeout({ autoCleanup: true }));

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      expect(result.current.isActive).toBe(true);

      unmount();

      // アンマウント後にタイマーが進んでもコールバックは実行されない
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('自動クリーンアップを無効にできる', () => {
      const mockCallback = jest.fn();
      const { result, unmount } = renderHook(() => useTimeout({ autoCleanup: false }));

      act(() => {
        result.current.startTimeout(mockCallback, 1000);
      });

      unmount();

      // アンマウント後でもタイマーは動作する
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useMultipleTimeouts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本機能', () => {
    it('複数のタイムアウトを同時に管理できる', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const { result } = renderHook(() => useMultipleTimeouts());

      act(() => {
        result.current.startTimeout('timeout1', mockCallback1, 1000);
        result.current.startTimeout('timeout2', mockCallback2, 2000);
      });

      expect(result.current.isActive('timeout1')).toBe(true);
      expect(result.current.isActive('timeout2')).toBe(true);
      expect(result.current.getActiveTimeouts()).toEqual(['timeout1', 'timeout2']);

      // 1秒経過
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback1).toHaveBeenCalledTimes(1);
      expect(mockCallback2).not.toHaveBeenCalled();
      expect(result.current.isActive('timeout1')).toBe(false);
      expect(result.current.isActive('timeout2')).toBe(true);

      // さらに1秒経過
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback2).toHaveBeenCalledTimes(1);
      expect(result.current.isActive('timeout2')).toBe(false);
    });

    it('特定のタイムアウトをクリアできる', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const { result } = renderHook(() => useMultipleTimeouts());

      act(() => {
        result.current.startTimeout('timeout1', mockCallback1, 1000);
        result.current.startTimeout('timeout2', mockCallback2, 2000);
      });

      act(() => {
        result.current.clearTimeout('timeout1');
      });

      expect(result.current.isActive('timeout1')).toBe(false);
      expect(result.current.isActive('timeout2')).toBe(true);

      // 2秒経過
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalledTimes(1);
    });

    it('全てのタイムアウトをクリアできる', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const { result } = renderHook(() => useMultipleTimeouts());

      act(() => {
        result.current.startTimeout('timeout1', mockCallback1, 1000);
        result.current.startTimeout('timeout2', mockCallback2, 2000);
      });

      act(() => {
        result.current.clearAllTimeouts();
      });

      expect(result.current.getActiveTimeouts()).toEqual([]);

      // 2秒経過してもコールバックは実行されない
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).not.toHaveBeenCalled();
    });

    it('残り時間を取得できる', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useMultipleTimeouts({ progressInterval: 100 }));

      act(() => {
        result.current.startTimeout('timeout1', mockCallback, 1000);
      });

      expect(result.current.getRemainingTime('timeout1')).toBe(1000);

      // 500ms経過
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.getRemainingTime('timeout1')).toBeLessThanOrEqual(500);
      expect(result.current.getRemainingTime('timeout1')).toBeGreaterThan(400);
    });
  });

  describe('同じIDでの上書き', () => {
    it('同じIDで新しいタイムアウトを設定すると前のものがキャンセルされる', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const { result } = renderHook(() => useMultipleTimeouts());

      act(() => {
        result.current.startTimeout('timeout1', mockCallback1, 1000);
      });

      // 500ms経過
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // 同じIDで新しいタイムアウトを設定
      act(() => {
        result.current.startTimeout('timeout1', mockCallback2, 1000);
      });

      // さらに1秒経過
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useFormTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本機能', () => {
    it('フォーム送信タイムアウトが機能する', () => {
      const mockCallback = jest.fn();
      const { result } = renderHook(() => useFormTimeout({ defaultTimeout: 1000 }));

      act(() => {
        result.current.startSubmissionTimeout(mockCallback);
      });

      expect(result.current.isActive).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(result.current.isActive).toBe(false);
    });

    it('デフォルトコールバックが機能する', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const { result } = renderHook(() => useFormTimeout({ defaultTimeout: 1000 }));

      act(() => {
        result.current.startSubmissionTimeout();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(consoleSpy).toHaveBeenCalledWith('フォーム送信がタイムアウトしました');
      consoleSpy.mockRestore();
    });

    it('進捗率が正しく計算される', () => {
      const { result } = renderHook(() =>
        useFormTimeout({
          defaultTimeout: 1000,
          progressInterval: 100,
        })
      );

      act(() => {
        result.current.startSubmissionTimeout();
      });

      expect(result.current.progress).toBe(0);

      // 500ms経過
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.progress).toBeCloseTo(0.5, 1);

      // 1000ms経過
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.progress).toBe(1);
    });
  });

  describe('警告機能', () => {
    it('警告タイムアウトが機能する', () => {
      const mockOnWarning = jest.fn();
      const { result } = renderHook(() =>
        useFormTimeout({
          defaultTimeout: 1000,
          warningTimeout: 500,
          onWarning: mockOnWarning,
        })
      );

      act(() => {
        result.current.startSubmissionTimeout();
      });

      expect(result.current.isWarning).toBe(false);

      // 500ms経過（警告時間）
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockOnWarning).toHaveBeenCalledTimes(1);
      expect(result.current.isWarning).toBe(true);

      // さらに500ms経過（タイムアウト）
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.isWarning).toBe(false);
    });

    it('警告時間がタイムアウト時間以上の場合は警告が発生しない', () => {
      const mockOnWarning = jest.fn();
      const { result } = renderHook(() =>
        useFormTimeout({
          defaultTimeout: 1000,
          warningTimeout: 1500, // タイムアウト時間より長い
          onWarning: mockOnWarning,
        })
      );

      act(() => {
        result.current.startSubmissionTimeout();
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockOnWarning).not.toHaveBeenCalled();
      expect(result.current.isWarning).toBe(false);
    });
  });

  describe('キャンセル処理', () => {
    it('タイムアウトをキャンセルすると警告もクリアされる', () => {
      const mockOnWarning = jest.fn();
      const { result } = renderHook(() =>
        useFormTimeout({
          defaultTimeout: 1000,
          warningTimeout: 500,
          onWarning: mockOnWarning,
        })
      );

      act(() => {
        result.current.startSubmissionTimeout();
      });

      // 500ms経過（警告発生）
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.isWarning).toBe(true);

      // キャンセル
      act(() => {
        result.current.clearTimeout();
      });

      expect(result.current.isWarning).toBe(false);
      expect(result.current.isActive).toBe(false);
    });
  });
});
