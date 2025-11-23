import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { vi } from 'vitest';
import { DateInput } from './DateInput';
import { GoalFormData } from '../../types/goal-form';

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{
  initialValue?: string;
  minDate?: Date;
  maxDate?: Date;
  onChange?: (value: string, isValid: boolean) => void;
  onSubmit?: (data: GoalFormData) => void;
}> = ({ initialValue = '', minDate, maxDate, onChange = vi.fn(), onSubmit = vi.fn() }) => {
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormData>({
    defaultValues: {
      deadline: initialValue,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DateInput
        name="deadline"
        register={register}
        setValue={setValue}
        error={errors.deadline}
        minDate={minDate}
        maxDate={maxDate}
        onChange={onChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
};

describe('DateInput', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // 現在の日付を固定（テストの一貫性のため）
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('基本表示', () => {
    it('入力フィールドが正しく表示される', () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('入力ヒントが表示される', () => {
      render(<TestWrapper />);

      expect(
        screen.getByText('対応形式: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY年MM月DD日')
      ).toBeInTheDocument();
    });

    it('エラー状態で正しいスタイルが適用される', () => {
      const TestWrapperWithError: React.FC = () => {
        const { register, setValue } = useForm<GoalFormData>();
        const error = { type: 'required', message: 'Required field' };

        return (
          <DateInput name="deadline" register={register} setValue={setValue} error={error as any} />
        );
      };

      render(<TestWrapperWithError />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      expect(input).toHaveClass('border-red-300');
    });
  });

  describe('手動入力機能', () => {
    it('YYYY-MM-DD形式で入力できる', async () => {
      const onChange = vi.fn();
      const onSubmit = vi.fn();
      render(<TestWrapper onChange={onChange} onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '2024-06-15');

      expect(onChange).toHaveBeenLastCalledWith('2024-06-15', true);

      // フォームを送信
      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          deadline: '2024-06-15',
        });
      });
    });

    it('YYYY/MM/DD形式で入力できる', async () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '2024/06/15');

      expect(onChange).toHaveBeenLastCalledWith('2024/06/15', true);
    });

    it('YYYY.MM.DD形式で入力できる', async () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '2024.06.15');

      expect(onChange).toHaveBeenLastCalledWith('2024.06.15', true);
    });

    it('YYYY年MM月DD日形式で入力できる', async () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '2024年06月15日');

      expect(onChange).toHaveBeenLastCalledWith('2024年06月15日', true);
    });

    it('数字のみの入力で自動フォーマットされる', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '20240615');

      expect(input).toHaveValue('2024-06-15');
    });

    it('無効な日付でバリデーションエラーが表示される', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '2024-13-32'); // 無効な月日

      await waitFor(() => {
        expect(screen.getByText(/日付は YYYY-MM-DD 形式で入力してください/)).toBeInTheDocument();
      });
    });

    it('範囲外の日付でバリデーションエラーが表示される', async () => {
      const minDate = new Date('2024-06-01');
      const maxDate = new Date('2024-12-31');

      render(<TestWrapper minDate={minDate} maxDate={maxDate} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      // 範囲外の日付を入力
      await user.type(input, '2024-05-31');

      await waitFor(() => {
        expect(screen.getByText(/達成期限は今日以降の日付を選択してください/)).toBeInTheDocument();
      });
    });
  });

  describe('入力候補機能', () => {
    it('フォーカス時に候補が表示される', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.click(input);

      // 候補が表示されることを確認
      await waitFor(() => {
        const suggestions = screen.getAllByText(/2024-/);
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    it('部分入力時に適切な候補が表示される', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '2024');

      // 年に基づく候補が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('2024-01-01')).toBeInTheDocument();
      });
    });

    it('候補をクリックして選択できる', async () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.click(input);

      // 候補をクリック
      await waitFor(() => {
        const suggestion = screen.getByText('2024-01-15'); // 今日の日付
        return user.click(suggestion);
      });

      expect(input).toHaveValue('2024-01-15');
      expect(onChange).toHaveBeenLastCalledWith('2024-01-15', true);
    });

    it('キーボードで候補を選択できる', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.click(input);

      // ArrowDownで候補を選択
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // 候補が選択されることを確認
      expect(input.value).toMatch(/2024-\d{2}-\d{2}/);
    });

    it('Escapeキーで候補を閉じることができる', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.click(input);

      // 候補が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      });

      // Escapeキーを押下
      await user.keyboard('{Escape}');

      // 候補が非表示になることを確認
      await waitFor(() => {
        expect(screen.queryByText('2024-01-15')).not.toBeInTheDocument();
      });
    });
  });

  describe('バリデーション機能', () => {
    it('空文字列は有効として扱われる', async () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, 'test');
      await user.clear(input);

      expect(onChange).toHaveBeenLastCalledWith('', true);
      expect(screen.queryByText(/エラー/)).not.toBeInTheDocument();
    });

    it('リアルタイムバリデーションが動作する', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      // 無効な入力
      await user.type(input, 'invalid');

      await waitFor(() => {
        expect(screen.getByText(/日付は YYYY-MM-DD 形式で入力してください/)).toBeInTheDocument();
      });

      // 有効な入力に修正
      await user.clear(input);
      await user.type(input, '2024-06-15');

      await waitFor(() => {
        expect(
          screen.queryByText(/日付は YYYY-MM-DD 形式で入力してください/)
        ).not.toBeInTheDocument();
      });
    });

    it('日付範囲のバリデーションが動作する', async () => {
      const minDate = new Date('2024-06-01');
      const maxDate = new Date('2024-12-31');

      render(<TestWrapper minDate={minDate} maxDate={maxDate} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      // 範囲外（過去）
      await user.type(input, '2024-05-31');

      await waitFor(() => {
        expect(screen.getByText(/達成期限は今日以降の日付を選択してください/)).toBeInTheDocument();
      });

      await user.clear(input);

      // 範囲外（未来）
      await user.type(input, '2025-01-01');

      await waitFor(() => {
        expect(screen.getByText(/達成期限は1年以内の日付を選択してください/)).toBeInTheDocument();
      });
    });
  });

  describe('フォーム統合', () => {
    it('React Hook Formと正しく統合される', async () => {
      const onSubmit = vi.fn();
      render(<TestWrapper onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.type(input, '2024-06-15');

      const submitButton = screen.getByText('Submit');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          deadline: '2024-06-15',
        });
      });
    });

    it('初期値が正しく設定される', () => {
      const initialValue = '2024-06-15';
      render(<TestWrapper initialValue={initialValue} />);

      const hiddenInput = document.querySelector('input[type="hidden"]') as HTMLInputElement;
      expect(hiddenInput?.value).toBe(initialValue);
    });
  });

  describe('アクセシビリティ', () => {
    it('適切な属性が設定されている', () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('候補リストが適切なaria属性を持つ', async () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');

      await user.click(input);

      await waitFor(() => {
        const suggestionsList = screen.getByRole('listbox', { hidden: true });
        expect(suggestionsList).toBeInTheDocument();
      });
    });
  });
});
