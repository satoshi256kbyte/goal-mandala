/**
 * useDebounce フックのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('初期値を返す', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));

      expect(result.current).toBe('initial');
    });

    it('指定時間後に値が更新される', async () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 500 },
      });

      expect(result.current).toBe('initial');

      // 値を変更
      rerender({ value: 'updated', delay: 500 });

      // まだ更新されていない
      expect(result.current).toBe('initial');

      // タイマーを進める
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // 値が更新される
      expect(result.current).toBe('updated');
    });

    it('遅延時間内に値が変更された場合、タイマーがリセットされる', async () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 500 },
      });

      // 値を変更
      rerender({ value: 'updated1', delay: 500 });

      // 300ms進める
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // まだ更新されていない
      expect(result.current).toBe('initial');

      // 再度値を変更（タイマーリセット）
      rerender({ value: 'updated2', delay: 500 });

      // さらに300ms進める（合計600ms）
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // まだ更新されていない（タイマーがリセットされたため）
      expect(result.current).toBe('initial');

      // さらに200ms進める（リセット後500ms）
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // 最後の値に更新される
      expect(result.current).toBe('updated2');
    });
  });

  describe('エッジケース', () => {
    it('delay が 0 の場合、即座に更新される', async () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 0 },
      });

      rerender({ value: 'updated', delay: 0 });

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });

    it('delay が変更された場合、新しい delay が適用される', async () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: 'initial', delay: 500 },
      });

      // 値とdelayを変更
      rerender({ value: 'updated', delay: 1000 });

      // 500ms進める
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // まだ更新されていない（新しいdelayは1000ms）
      expect(result.current).toBe('initial');

      // さらに500ms進める（合計1000ms）
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // 値が更新される
      expect(result.current).toBe('updated');
    });

    it('異なる型の値をデバウンスできる', async () => {
      const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
        initialProps: { value: { count: 0 }, delay: 500 },
      });

      expect(result.current).toEqual({ count: 0 });

      rerender({ value: { count: 1 }, delay: 500 });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toEqual({ count: 1 });
    });

    it('アンマウント時にタイマーがクリアされる', async () => {
      const { result, rerender, unmount } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        }
      );

      rerender({ value: 'updated', delay: 500 });

      // アンマウント
      unmount();

      // タイマーを進める
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // 値は更新されない（アンマウント済み）
      expect(result.current).toBe('initial');
    });
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本機能', () => {
    it('指定時間後にコールバックが実行される', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      // コールバックを実行
      act(() => {
        result.current('arg1', 'arg2');
      });

      // まだ実行されていない
      expect(callback).not.toHaveBeenCalled();

      // タイマーを進める
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // コールバックが実行される
      expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('遅延時間内に複数回呼ばれた場合、最後の呼び出しのみ実行される', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      // 複数回呼び出し
      act(() => {
        result.current('call1');
        result.current('call2');
        result.current('call3');
      });

      // まだ実行されていない
      expect(callback).not.toHaveBeenCalled();

      // タイマーを進める
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // 最後の呼び出しのみ実行される
      expect(callback).toHaveBeenCalledWith('call3');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('遅延時間内に再度呼ばれた場合、タイマーがリセットされる', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      // 最初の呼び出し
      act(() => {
        result.current('call1');
      });

      // 300ms進める
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // まだ実行されていない
      expect(callback).not.toHaveBeenCalled();

      // 再度呼び出し（タイマーリセット）
      act(() => {
        result.current('call2');
      });

      // さらに300ms進める（合計600ms）
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // まだ実行されていない（タイマーがリセットされたため）
      expect(callback).not.toHaveBeenCalled();

      // さらに200ms進める（リセット後500ms）
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // 最後の呼び出しが実行される
      expect(callback).toHaveBeenCalledWith('call2');
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('エッジケース', () => {
    it('delay が 0 の場合、即座に実行される', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 0));

      act(() => {
        result.current('arg');
      });

      await act(async () => {
        vi.advanceTimersByTime(0);
      });

      expect(callback).toHaveBeenCalledWith('arg');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('callback が変更された場合、新しい callback が実行される', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { result, rerender } = renderHook(
        ({ callback, delay }) => useDebouncedCallback(callback, delay),
        {
          initialProps: { callback: callback1, delay: 500 },
        }
      );

      // 最初のコールバックで呼び出し
      act(() => {
        result.current('arg');
      });

      // コールバックを変更
      rerender({ callback: callback2, delay: 500 });

      // タイマーを進める
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // 新しいコールバックが実行される
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('arg');
    });

    it('delay が変更された場合、既存のタイマーがクリアされる', async () => {
      const callback = vi.fn();

      const { result, rerender } = renderHook(
        ({ callback, delay }) => useDebouncedCallback(callback, delay),
        {
          initialProps: { callback, delay: 500 },
        }
      );

      // 呼び出し
      act(() => {
        result.current('arg1');
      });

      // 300ms進める
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // delayを変更
      rerender({ callback, delay: 1000 });

      // さらに200ms進める（元のdelayなら実行されるタイミング）
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // まだ実行されていない（タイマーがクリアされたため）
      expect(callback).not.toHaveBeenCalled();

      // 再度呼び出し
      act(() => {
        result.current('arg2');
      });

      // 新しいdelay分進める
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      // 新しいコールバックが実行される
      expect(callback).toHaveBeenCalledWith('arg2');
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('アンマウント時にタイマーがクリアされる', async () => {
      const callback = vi.fn();
      const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500));

      act(() => {
        result.current('arg');
      });

      // アンマウント
      unmount();

      // タイマーを進める
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // コールバックは実行されない（アンマウント済み）
      expect(callback).not.toHaveBeenCalled();
    });

    it('複数の引数を正しく渡せる', async () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      act(() => {
        result.current('arg1', 'arg2', 'arg3');
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });
  });
});
