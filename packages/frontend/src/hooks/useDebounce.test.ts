import { renderHook, act } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from './useDebounce';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初期値を返すこと', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('指定した遅延時間後に値が更新されること', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    expect(result.current).toBe('initial');

    // 値を更新
    rerender({ value: 'updated', delay: 500 });

    // まだ更新されていない
    expect(result.current).toBe('initial');

    // 時間を進める
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 更新された
    expect(result.current).toBe('updated');
  });

  it('連続して値が変更された場合、最後の値のみが反映されること', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    // 連続して値を更新
    rerender({ value: 'update1', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'update2', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'update3', delay: 500 });

    // まだ更新されていない
    expect(result.current).toBe('initial');

    // 最後の更新から500ms経過
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 最後の値のみが反映される
    expect(result.current).toBe('update3');
  });

  it('遅延時間を変更できること', async () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    rerender({ value: 'updated', delay: 1000 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // まだ更新されていない（1000msに変更されたため）
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 更新された
    expect(result.current).toBe('updated');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('指定した遅延時間後にコールバックが実行されること', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    result.current('arg1', 'arg2');

    // まだ実行されていない
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 実行された
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('連続して呼び出された場合、最後の呼び出しのみが実行されること', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));

    result.current('call1');
    act(() => {
      vi.advanceTimersByTime(100);
    });

    result.current('call2');
    act(() => {
      vi.advanceTimersByTime(100);
    });

    result.current('call3');

    // まだ実行されていない
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 最後の呼び出しのみが実行される
    expect(callback).toHaveBeenCalledWith('call3');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('コールバックが更新された場合、最新のコールバックが実行されること', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebouncedCallback(callback, delay),
      {
        initialProps: { callback: callback1, delay: 500 },
      }
    );

    result.current('arg');

    // コールバックを更新
    rerender({ callback: callback2, delay: 500 });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 最新のコールバックが実行される
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledWith('arg');
  });

  it('アンマウント時にタイマーがクリアされること', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500));

    result.current('arg');

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // アンマウント後は実行されない
    expect(callback).not.toHaveBeenCalled();
  });

  it('遅延時間を変更できること', () => {
    const callback = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback, delay }) => useDebouncedCallback(callback, delay),
      {
        initialProps: { callback, delay: 500 },
      }
    );

    result.current('arg1');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 最初の遅延時間で実行された
    expect(callback).toHaveBeenCalledWith('arg1');
    expect(callback).toHaveBeenCalledTimes(1);

    // 遅延時間を変更
    rerender({ callback, delay: 1000 });

    result.current('arg2');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // まだ実行されていない（1000msに変更されたため）
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // 新しい遅延時間で実行された
    expect(callback).toHaveBeenCalledWith('arg2');
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
