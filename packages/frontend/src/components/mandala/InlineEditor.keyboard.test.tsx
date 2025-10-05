import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InlineEditor } from './InlineEditor';

describe('InlineEditor - キーボード操作', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab/Shift+Tab対応', () => {
    it('Tabキーでフォーカスが移動できる', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>前のボタン</button>
          <InlineEditor
            value="テスト"
            maxLength={100}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
          <button>次のボタン</button>
        </div>
      );

      const input = screen.getByRole('textbox', { name: '編集中' });
      const nextButton = screen.getByText('次のボタン');

      // 入力フィールドにフォーカス
      input.focus();
      expect(input).toHaveFocus();

      // Tabキーで次の要素にフォーカス移動
      await user.tab();
      expect(nextButton).toHaveFocus();
    });

    it('Shift+Tabキーで逆方向にフォーカスが移動できる', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>前のボタン</button>
          <InlineEditor
            value="テスト"
            maxLength={100}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
          <button>次のボタン</button>
        </div>
      );

      const input = screen.getByRole('textbox', { name: '編集中' });
      const prevButton = screen.getByText('前のボタン');

      // 入力フィールドにフォーカス
      input.focus();
      expect(input).toHaveFocus();

      // Shift+Tabキーで前の要素にフォーカス移動
      await user.tab({ shift: true });
      expect(prevButton).toHaveFocus();
    });
  });

  describe('Enter対応', () => {
    it('Enterキーで保存される（単一行）', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <InlineEditor
          value="テスト"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          multiline={false}
        />
      );

      const input = screen.getByRole('textbox', { name: '編集中' });

      // 入力を変更
      fireEvent.change(input, { target: { value: '新しいテキスト' } });

      // Enterキーを押下
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('新しいテキスト');
      });
    });

    it('Ctrl+Enterキーで保存される（複数行）', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <InlineEditor
          value="テスト"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          multiline={true}
        />
      );

      const textarea = screen.getByRole('textbox', { name: '編集中' });

      // 入力を変更
      fireEvent.change(textarea, { target: { value: '新しいテキスト' } });

      // Ctrl+Enterキーを押下
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('新しいテキスト');
      });
    });

    it('Meta+Enterキーで保存される（複数行・Mac）', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <InlineEditor
          value="テスト"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          multiline={true}
        />
      );

      const textarea = screen.getByRole('textbox', { name: '編集中' });

      // 入力を変更
      fireEvent.change(textarea, { target: { value: '新しいテキスト' } });

      // Meta+Enterキーを押下（Mac）
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('新しいテキスト');
      });
    });

    it('複数行モードで通常のEnterキーは改行される', () => {
      render(
        <InlineEditor
          value="テスト"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          multiline={true}
        />
      );

      const textarea = screen.getByRole('textbox', { name: '編集中' });

      // 入力を変更
      fireEvent.change(textarea, { target: { value: '1行目' } });

      // 通常のEnterキーを押下
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

      // 保存は呼ばれない
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Esc対応', () => {
    it('Escキーでキャンセルされる', () => {
      render(
        <InlineEditor
          value="元のテキスト"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox', { name: '編集中' });

      // 入力を変更
      fireEvent.change(input, { target: { value: '新しいテキスト' } });

      // Escキーを押下
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('Escキーで元の値に戻る', () => {
      render(
        <InlineEditor
          value="元のテキスト"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const input = screen.getByRole('textbox', { name: '編集中' }) as HTMLInputElement;

      // 入力を変更
      fireEvent.change(input, { target: { value: '新しいテキスト' } });
      expect(input.value).toBe('新しいテキスト');

      // Escキーを押下
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      // 元の値に戻る
      expect(input.value).toBe('元のテキスト');
    });
  });

  describe('バリデーションエラー時のキーボード操作', () => {
    it('バリデーションエラー時はEnterキーで保存されない', async () => {
      render(
        <InlineEditor value="初期値" maxLength={100} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const input = screen.getByRole('textbox', { name: '編集中' });

      // 空の入力（バリデーションエラー）
      fireEvent.change(input, { target: { value: '' } });

      // バリデーションエラーが表示されるまで待つ
      await waitFor(() => {
        expect(screen.getByText('入力は必須です')).toBeInTheDocument();
      });

      // Enterキーを押下
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 保存は呼ばれない
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('文字数超過時はEnterキーで保存されない', async () => {
      render(
        <InlineEditor value="テスト" maxLength={5} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const input = screen.getByRole('textbox', { name: '編集中' });

      // 文字数超過
      fireEvent.change(input, { target: { value: '123456' } });

      // バリデーションエラーが表示されるまで待つ
      await waitFor(() => {
        expect(screen.getByText('5文字以内で入力してください')).toBeInTheDocument();
      });

      // Enterキーを押下
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 保存は呼ばれない
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('保存中のキーボード操作', () => {
    it('保存中はEnterキーが無効化される', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);

      render(
        <InlineEditor value="テスト" maxLength={100} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const input = screen.getByRole('textbox', { name: '編集中' });

      // 入力を変更
      fireEvent.change(input, { target: { value: '新しいテキスト' } });

      // 最初のEnterキーで保存開始
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });

      // 保存中に再度Enterキーを押下
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // 2回目の保存は呼ばれない
      expect(mockOnSave).toHaveBeenCalledTimes(1);

      // 保存完了
      resolvePromise!();
    });
  });
});
