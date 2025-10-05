import { render, screen, fireEvent, act } from '@testing-library/react';
import { InlineEditor } from './InlineEditor';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('InlineEditor Debounce Tests', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('バリデーションのデバウンス', () => {
    it('連続入力時にバリデーションがデバウンスされること', () => {
      render(<InlineEditor value="" maxLength={10} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByRole('textbox');

      // 連続して入力
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });

      // まだバリデーションエラーは表示されない
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // 300ms経過
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // バリデーションが実行される（有効な入力なのでエラーなし）
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('制限を超える入力でデバウンス後にエラーが表示されること', () => {
      render(<InlineEditor value="" maxLength={5} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByRole('textbox');

      // 制限を超える入力
      fireEvent.change(input, { target: { value: '123456' } });

      // まだエラーは表示されない
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // 300ms経過
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // エラーが表示される
      expect(screen.getByRole('alert')).toHaveTextContent('5文字以内で入力してください');
    });

    it('連続入力の最後の値のみがバリデーションされること', () => {
      render(<InlineEditor value="" maxLength={5} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByRole('textbox');

      // 連続して入力（最初は制限超過、最後は有効）
      fireEvent.change(input, { target: { value: '123456' } }); // 制限超過
      act(() => {
        vi.advanceTimersByTime(100);
      });

      fireEvent.change(input, { target: { value: '12345' } }); // 有効
      act(() => {
        vi.advanceTimersByTime(100);
      });

      fireEvent.change(input, { target: { value: '1234' } }); // 有効

      // 最後の入力から300ms経過
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // エラーは表示されない（最後の値は有効なため）
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    it('大量の連続入力でもパフォーマンスが維持されること', () => {
      render(<InlineEditor value="" maxLength={100} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByRole('textbox');
      const startTime = performance.now();

      // 100回の連続入力
      for (let i = 0; i < 100; i++) {
        fireEvent.change(input, { target: { value: 'a'.repeat(i + 1) } });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      const endTime = performance.now();
      const inputTime = endTime - startTime;

      // 100回の入力が1秒以内に完了すること
      expect(inputTime).toBeLessThan(1000);

      // 最後の入力から300ms経過
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // バリデーションは1回だけ実行される（デバウンスのおかげ）
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
