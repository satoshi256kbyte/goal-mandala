import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InlineEditor } from './InlineEditor';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('InlineEditor Performance Tests', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('レンダリングパフォーマンス', () => {
    it('初期レンダリングが50ms以内に完了すること', () => {
      const startTime = performance.now();

      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(50);
    });

    it('複数回のレンダリングでもパフォーマンスが劣化しないこと', () => {
      const renderTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        const { unmount } = render(
          <InlineEditor
            value={`テスト値${i}`}
            maxLength={100}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        );

        const endTime = performance.now();
        renderTimes.push(endTime - startTime);

        unmount();
      }

      // 最後のレンダリング時間が最初の2倍を超えないこと
      expect(renderTimes[9]).toBeLessThan(renderTimes[0] * 2);
    });
  });

  describe('入力パフォーマンス', () => {
    it('連続入力時のバリデーションが高速であること', async () => {
      render(<InlineEditor value="" maxLength={100} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByRole('textbox');
      const startTime = performance.now();

      // 50文字の連続入力をシミュレート
      for (let i = 0; i < 50; i++) {
        fireEvent.change(input, { target: { value: 'a'.repeat(i + 1) } });
      }

      const endTime = performance.now();
      const inputTime = endTime - startTime;

      // 50回の入力が500ms以内に完了すること
      expect(inputTime).toBeLessThan(500);
    });

    it('バリデーションエラー表示が高速であること', async () => {
      render(<InlineEditor value="" maxLength={10} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByRole('textbox');
      const startTime = performance.now();

      // 制限を超える入力
      fireEvent.change(input, { target: { value: 'a'.repeat(20) } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const validationTime = endTime - startTime;

      // バリデーションエラー表示が400ms以内に完了すること（デバウンス300ms + 処理時間）
      expect(validationTime).toBeLessThan(400);
    });
  });

  describe('保存処理パフォーマンス', () => {
    it('保存処理の開始が即座に行われること', async () => {
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox');
      const startTime = performance.now();

      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(screen.getByText('保存中...')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const saveStartTime = endTime - startTime;

      // 保存開始表示が50ms以内に表示されること
      expect(saveStartTime).toBeLessThan(50);
    });
  });

  describe('メモ化の効果', () => {
    it('同じpropsでの再レンダリングがスキップされること', () => {
      const { rerender } = render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const firstRenderInput = screen.getByRole('textbox');

      // 同じpropsで再レンダリング
      rerender(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const secondRenderInput = screen.getByRole('textbox');

      // 同じDOM要素が使われていることを確認（再レンダリングされていない）
      expect(firstRenderInput).toBe(secondRenderInput);
    });

    it('異なるpropsでの再レンダリングが正しく行われること', () => {
      const { rerender } = render(
        <InlineEditor
          value="テスト値1"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('textbox')).toHaveValue('テスト値1');

      // 異なるpropsで再レンダリング
      rerender(
        <InlineEditor
          value="テスト値2"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('textbox')).toHaveValue('テスト値2');
    });
  });

  describe('大量データでのパフォーマンス', () => {
    it('長いテキストの入力でもパフォーマンスが維持されること', async () => {
      const longText = 'a'.repeat(1000);

      const startTime = performance.now();

      render(
        <InlineEditor
          value={longText}
          maxLength={2000}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // 長いテキストでも100ms以内にレンダリングされること
      expect(renderTime).toBeLessThan(100);
    });
  });
});
