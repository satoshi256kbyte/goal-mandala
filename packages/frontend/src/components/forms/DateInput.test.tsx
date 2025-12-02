import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
}> = ({ initialValue = '', minDate, maxDate, onChange = vi.fn() }) => {
  const {
    register,
    setValue,
    formState: { errors },
  } = useForm<GoalFormData>({
    defaultValues: {
      deadline: initialValue,
    },
  });

  return (
    <DateInput
      name="deadline"
      register={register}
      setValue={setValue}
      error={errors.deadline}
      minDate={minDate}
      maxDate={maxDate}
      onChange={onChange}
    />
  );
};

describe('DateInput', () => {
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
    it('YYYY-MM-DD形式で入力できる', () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      fireEvent.change(input, { target: { value: '2024-06-15' } });

      expect(onChange).toHaveBeenLastCalledWith('2024-06-15', true);
    });

    it('YYYY/MM/DD形式で入力できる', () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      fireEvent.change(input, { target: { value: '2024/06/15' } });

      expect(onChange).toHaveBeenLastCalledWith('2024/06/15', true);
    });

    it('YYYY.MM.DD形式で入力できる', () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      fireEvent.change(input, { target: { value: '2024.06.15' } });

      expect(onChange).toHaveBeenLastCalledWith('2024.06.15', true);
    });

    it('YYYY年MM月DD日形式で入力できる', () => {
      const onChange = vi.fn();
      render(<TestWrapper onChange={onChange} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      fireEvent.change(input, { target: { value: '2024年06月15日' } });

      expect(onChange).toHaveBeenLastCalledWith('2024年06月15日', true);
    });

    it('数字のみの入力で自動フォーマットされる', () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      fireEvent.change(input, { target: { value: '20240615' } });

      expect(input).toHaveValue('2024-06-15');
    });

    it('無効な日付でバリデーションエラーが表示される', () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      fireEvent.change(input, { target: { value: 'invalid-date' } }); // 完全に無効な形式

      expect(screen.getByText(/有効な日付を入力してください/)).toBeInTheDocument();
    });

    it('範囲外の日付でバリデーションエラーが表示される', () => {
      const minDate = new Date('2024-06-01');
      const maxDate = new Date('2024-12-31');

      render(<TestWrapper minDate={minDate} maxDate={maxDate} />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      fireEvent.change(input, { target: { value: '2025-01-01' } }); // 範囲外

      expect(screen.getByText(/日付は .* から .* の範囲で入力してください/)).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切な属性が設定されている', () => {
      render(<TestWrapper />);

      const input = screen.getByPlaceholderText('YYYY-MM-DD形式で入力');
      expect(input).toHaveAttribute('autoComplete', 'off');
      expect(input).toHaveAttribute('type', 'text');
    });
  });
});
