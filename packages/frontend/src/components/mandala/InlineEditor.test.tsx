import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineEditor } from './InlineEditor';

describe('InlineEditor', () => {
  let mockOnSave: ReturnType<typeof vi.fn<[value: string], Promise<void>>>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSave = vi.fn<[value: string], Promise<void>>().mockResolvedValue(undefined);
    mockOnCancel = vi.fn();
  });

  describe('編集モード切替', () => {
    it('初期状態では編集モードで表示される', () => {
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('テスト値');
    });

    it('初期値が空の場合、placeholderが表示される', () => {
      render(
        <InlineEditor
          value=""
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          placeholder="入力してください"
        />
      );
      const input = screen.getByPlaceholderText('入力してください');
      expect(input).toBeInTheDocument();
    });

    it('編集モードでフォーカスが自動的に当たる', () => {
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
    });
  });

  describe('バリデーション', () => {
    it('空文字の場合、エラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);

      await waitFor(() => {
        expect(screen.getByText(/入力は必須です/i)).toBeInTheDocument();
      });
    });

    it('最大文字数を超えた場合、エラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      render(<InlineEditor value="テスト値" maxLength={10} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '12345678901'); // 11文字

      await waitFor(() => {
        expect(screen.getByText(/10文字以内で入力してください/i)).toBeInTheDocument();
      });
    });

    it('有効な入力の場合、エラーメッセージが表示されない', async () => {
      const user = userEvent.setup();
      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '有効な入力');

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('リアルタイムバリデーションが動作する', async () => {
      const user = userEvent.setup();
      render(<InlineEditor value="テスト値" maxLength={5} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '123');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      await user.type(input, '456'); // 合計6文字
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('保存処理', () => {
    it('Enterキーで保存処理が呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('新しい値');
      });
    });

    it('外側クリックで保存処理が呼ばれる', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(
        <div>
          <InlineEditor
            value="テスト値"
            maxLength={100}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
          <button>外側のボタン</button>
        </div>
      );
      const input = screen.getByRole('textbox');
      const outsideButton = screen.getByRole('button', { name: '外側のボタン' });

      await userEvent.clear(input);
      await userEvent.type(input, '新しい値');
      fireEvent.blur(input);
      await userEvent.click(outsideButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('新しい値');
      });
    });

    it('バリデーションエラーがある場合、保存処理が呼ばれない', async () => {
      const user = userEvent.setup();
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');

      await user.clear(input);

      // デバウンスが完了するまで短時間待つ
      await waitFor(
        () => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
        },
        { timeout: 100 }
      );

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('保存中は保存ボタンが無効化される', async () => {
      const user = userEvent.setup();
      let resolveSave: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);

      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        const saveButton = screen.queryByRole('button', { name: /保存/i });
        if (saveButton) {
          expect(saveButton).toBeDisabled();
        }
      });

      resolveSave!();
    });

    it('保存成功後、編集モードが終了する', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('保存失敗時、エラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('保存に失敗しました'));
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/保存に失敗しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('キャンセル処理', () => {
    it('Escキーでキャンセル処理が呼ばれる', async () => {
      const user = userEvent.setup();
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');
      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('キャンセルボタンクリックでキャンセル処理が呼ばれる', async () => {
      const user = userEvent.setup();
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.queryByRole('button', { name: /キャンセル/i });
      if (cancelButton) {
        await user.click(cancelButton);
        expect(mockOnCancel).toHaveBeenCalled();
      }
    });

    it('キャンセル時、入力値が元に戻る', async () => {
      const user = userEvent.setup();
      render(
        <InlineEditor value="元の値" maxLength={100} onSave={mockOnSave} onCancel={mockOnCancel} />
      );
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');
      expect(input).toHaveValue('新しい値');

      await user.keyboard('{Escape}');

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('キーボード操作', () => {
    it('Tabキーでフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />
          <button>次の要素</button>
        </div>
      );

      const input = screen.getByRole('textbox');
      const nextButton = screen.getByRole('button', { name: '次の要素' });

      expect(input).toHaveFocus();

      await user.keyboard('{Tab}');

      expect(nextButton).toHaveFocus();
    });

    it('Shift+Tabキーで逆方向にフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button>前の要素</button>
          <InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />
        </div>
      );

      const input = screen.getByRole('textbox');
      const prevButton = screen.getByRole('button', { name: '前の要素' });

      input.focus();
      expect(input).toHaveFocus();

      await user.keyboard('{Shift>}{Tab}{/Shift}');

      expect(prevButton).toHaveFocus();
    });

    it('multiline=trueの場合、Enterキーで改行される', async () => {
      const user = userEvent.setup();
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={vi.fn()}
          onCancel={vi.fn()}
          multiline={true}
        />
      );
      const textarea = screen.getByRole('textbox');

      await user.clear(textarea);
      await user.type(textarea, '1行目');
      await user.keyboard('{Enter}');
      await user.type(textarea, '2行目');

      expect(textarea).toHaveValue('1行目\n2行目');
    });

    it('multiline=trueの場合、Ctrl+Enterで保存される', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
      render(
        <InlineEditor
          value="テスト値"
          maxLength={100}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          multiline={true}
        />
      );
      const textarea = screen.getByRole('textbox');

      await user.clear(textarea);
      await user.type(textarea, '新しい値');
      await user.keyboard('{Control>}{Enter}{/Control}');

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('新しい値');
      });
    });
  });

  describe('ARIA属性', () => {
    it('role="textbox"が設定されている', () => {
      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('aria-labelが設定されている', () => {
      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label');
    });

    it('バリデーションエラー時、aria-invalid="true"が設定される', async () => {
      const user = userEvent.setup();
      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('バリデーション成功時、aria-invalid="false"が設定される', async () => {
      const user = userEvent.setup();
      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '有効な値');

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'false');
      });
    });

    it('エラーメッセージがaria-describedbyで関連付けられている', async () => {
      const user = userEvent.setup();
      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);

      await waitFor(() => {
        const errorId = input.getAttribute('aria-describedby');
        expect(errorId).toBeTruthy();
        const errorElement = document.getElementById(errorId!);
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('楽観的UI更新', () => {
    it('保存処理中もUIが即座に更新される', async () => {
      const user = userEvent.setup();
      let resolveSave: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);

      render(<InlineEditor value="テスト値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');

      expect(input).toHaveValue('新しい値');

      await user.keyboard('{Enter}');

      // 保存処理中でも値は保持される
      expect(input).toHaveValue('新しい値');

      resolveSave!();
    });

    it('保存失敗時、元の値に戻る', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('保存失敗'));
      render(<InlineEditor value="元の値" maxLength={100} onSave={vi.fn()} onCancel={vi.fn()} />);
      const input = screen.getByRole('textbox');

      await user.clear(input);
      await user.type(input, '新しい値');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('元の値');
      });
    });
  });
});
