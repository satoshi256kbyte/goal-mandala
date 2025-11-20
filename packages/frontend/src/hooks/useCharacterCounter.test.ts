import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useCharacterCounter } from './useCharacterCounter';

describe('useCharacterCounter', () => {
  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() =>
        useCharacterCounter({ maxLength: 100, initialValue: 'test' })
      );

      expect(result.current.currentLength).toBe(4);
      expect(result.current.currentValue).toBe('test');
      expect(result.current.remainingLength).toBe(96);
      expect(result.current.percentage).toBe(4);
      expect(result.current.isAtLimit).toBe(false);
      expect(result.current.isWarning).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('文字数が正しく更新される', () => {
      const { result } = renderHook(() => useCharacterCounter({ maxLength: 100 }));

      act(() => {
        result.current.updateLength('hello world');
      });

      expect(result.current.currentLength).toBe(11);
      expect(result.current.currentValue).toBe('hello world');
      expect(result.current.remainingLength).toBe(89);
      expect(result.current.percentage).toBe(11);
    });
  });

  describe('制限処理', () => {
    it('制限を超える入力が切り詰められる', () => {
      const { result } = renderHook(() => useCharacterCounter({ maxLength: 5 }));

      act(() => {
        result.current.updateLength('hello world');
      });

      expect(result.current.currentLength).toBe(5);
      expect(result.current.currentValue).toBe('hello');
      expect(result.current.isAtLimit).toBe(true);
      expect(result.current.remainingLength).toBe(0);
    });

    it('制限到達時にコールバックが呼ばれる', () => {
      const onLimitReached = vi.fn();
      const { result } = renderHook(() =>
        useCharacterCounter({
          maxLength: 5,
          onLimitReached,
        })
      );

      act(() => {
        result.current.updateLength('hello world');
      });

      expect(onLimitReached).toHaveBeenCalledWith('hello');
    });
  });

  describe('警告・エラー状態', () => {
    it('80%を超えると警告状態になる', () => {
      const { result } = renderHook(() => useCharacterCounter({ maxLength: 100 }));

      act(() => {
        result.current.updateLength('a'.repeat(81));
      });

      expect(result.current.isWarning).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.percentage).toBe(81);
    });

    it('100%に達するとエラー状態になる', () => {
      const { result } = renderHook(() => useCharacterCounter({ maxLength: 100 }));

      act(() => {
        result.current.updateLength('a'.repeat(100));
      });

      expect(result.current.isWarning).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.isAtLimit).toBe(true);
      expect(result.current.percentage).toBe(100);
    });

    it('カスタム警告しきい値が適用される', () => {
      const { result } = renderHook(() =>
        useCharacterCounter({
          maxLength: 100,
          warningThreshold: 70,
        })
      );

      act(() => {
        result.current.updateLength('a'.repeat(71));
      });

      expect(result.current.isWarning).toBe(true);
      expect(result.current.percentage).toBe(71);
    });
  });

  describe('コールバック', () => {
    it('onChange コールバックが呼ばれる', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useCharacterCounter({
          maxLength: 100,
          onChange,
        })
      );

      act(() => {
        result.current.updateLength('test');
      });

      expect(onChange).toHaveBeenCalledWith(4, 'test');
    });

    it('制限内での変更時はonLimitReachedが呼ばれない', () => {
      const onLimitReached = vi.fn();
      const { result } = renderHook(() =>
        useCharacterCounter({
          maxLength: 100,
          onLimitReached,
        })
      );

      act(() => {
        result.current.updateLength('test');
      });

      expect(onLimitReached).not.toHaveBeenCalled();
    });
  });

  describe('エッジケース', () => {
    it('maxLengthが0の場合でも動作する', () => {
      const { result } = renderHook(() => useCharacterCounter({ maxLength: 0 }));

      act(() => {
        result.current.updateLength('test');
      });

      expect(result.current.currentLength).toBe(4);
      expect(result.current.remainingLength).toBe(Infinity);
      expect(result.current.percentage).toBe(0);
    });

    it('maxLengthが未設定の場合でも動作する', () => {
      const { result } = renderHook(() => useCharacterCounter());

      act(() => {
        result.current.updateLength('test');
      });

      expect(result.current.currentLength).toBe(4);
      expect(result.current.remainingLength).toBe(Infinity);
      expect(result.current.percentage).toBe(0);
    });

    it('空文字列の処理が正しく行われる', () => {
      const { result } = renderHook(() => useCharacterCounter({ maxLength: 100 }));

      act(() => {
        result.current.updateLength('');
      });

      expect(result.current.currentLength).toBe(0);
      expect(result.current.currentValue).toBe('');
      expect(result.current.remainingLength).toBe(100);
      expect(result.current.percentage).toBe(0);
    });
  });

  describe('初期値の変更', () => {
    it('initialValueが変更されると同期される', () => {
      const { result, rerender } = renderHook(
        ({ initialValue }) => useCharacterCounter({ maxLength: 100, initialValue }),
        { initialProps: { initialValue: 'initial' } }
      );

      expect(result.current.currentValue).toBe('initial');
      expect(result.current.currentLength).toBe(7);

      rerender({ initialValue: 'updated' });

      expect(result.current.currentValue).toBe('updated');
      expect(result.current.currentLength).toBe(7);
    });
  });
});
