import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import {
  DynamicFormField,
  FormFieldConfig,
  ValidationRules,
  FieldPresets,
} from './DynamicFormField';

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{
  field: FormFieldConfig;
  defaultValue?: any;
  onSubmit?: (data: any) => void;
}> = ({ field, defaultValue = '', onSubmit = vi.fn() }) => {
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { [field.name]: defaultValue },
  });

  const [value, setValue] = React.useState(defaultValue);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DynamicFormField
        field={field}
        value={value}
        onChange={setValue}
        error={errors[field.name]?.message}
        register={register}
        watch={watch}
      />
      <button type="submit">Submit</button>
    </form>
  );
};

describe('DynamicFormField', () => {
  const user = userEvent.setup();

  describe('テキスト入力フィールド', () => {
    const textField: FormFieldConfig = {
      name: 'title',
      type: 'text',
      label: 'タイトル',
      placeholder: 'タイトルを入力',
      required: true,
      maxLength: 50,
      showCounter: true,
      showWarning: true,
      validation: [ValidationRules.required(), ValidationRules.maxLength(50)],
    };

    test('基本的なレンダリング', () => {
      render(<TestWrapper field={textField} />);

      expect(screen.getByLabelText('タイトル *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('タイトルを入力')).toBeInTheDocument();
    });

    test('フォーカス時のハイライト表示', async () => {
      render(<TestWrapper field={textField} />);

      const input = screen.getByLabelText('タイトル *');
      await user.click(input);

      expect(input).toHaveFocus();
      expect(input).toHaveClass('ring-2', 'ring-blue-500');
    });

    test('必須フィールドのリアルタイムバリデーション', async () => {
      render(<TestWrapper field={textField} />);

      const input = screen.getByLabelText('タイトル *');

      // 文字を入力してから削除
      await user.type(input, 'test');
      await user.clear(input);

      await waitFor(() => {
        expect(screen.getByText('この項目は必須です')).toBeInTheDocument();
      });
    });

    test('文字数制限の警告表示', async () => {
      render(<TestWrapper field={textField} />);

      const input = screen.getByLabelText('タイトル *');

      // 制限の80%を超える文字数を入力
      const longText = 'a'.repeat(41); // 50文字制限の82%
      await user.type(input, longText);

      await waitFor(() => {
        expect(input).toHaveClass('border-yellow-300');
      });
    });

    test('文字数制限の超過時の切り詰め', async () => {
      render(<TestWrapper field={textField} />);

      const input = screen.getByLabelText('タイトル *');

      // 制限を超える文字数を入力
      const tooLongText = 'a'.repeat(60);
      await user.type(input, tooLongText);

      await waitFor(() => {
        expect(input).toHaveValue('a'.repeat(50));
      });
    });

    test('文字数カウンターの表示', () => {
      render(<TestWrapper field={textField} defaultValue="test" />);

      expect(screen.getByText('4 / 50')).toBeInTheDocument();
    });
  });

  describe('テキストエリアフィールド', () => {
    const textareaField: FormFieldConfig = {
      name: 'description',
      type: 'textarea',
      label: '説明',
      placeholder: '説明を入力',
      required: true,
      maxLength: 200,
      rows: 4,
      showCounter: true,
      validation: [
        ValidationRules.required(),
        ValidationRules.minLength(10),
        ValidationRules.maxLength(200),
      ],
    };

    test('基本的なレンダリング', () => {
      render(<TestWrapper field={textareaField} />);

      const textarea = screen.getByLabelText('説明 *');
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea).toHaveAttribute('rows', '4');
    });

    test('最小文字数バリデーション', async () => {
      render(<TestWrapper field={textareaField} />);

      const textarea = screen.getByLabelText('説明 *');
      await user.type(textarea, 'short');

      await waitFor(() => {
        expect(screen.getByText('10文字以上で入力してください')).toBeInTheDocument();
      });
    });

    test('Enterキーでの改行（保存処理は実行されない）', async () => {
      const onSubmit = vi.fn();
      render(<TestWrapper field={textareaField} onSubmit={onSubmit} />);

      const textarea = screen.getByLabelText('説明 *');
      await user.type(textarea, 'line1{enter}line2');

      expect(textarea).toHaveValue('line1\nline2');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('セレクトフィールド', () => {
    const selectField: FormFieldConfig = {
      name: 'category',
      type: 'select',
      label: 'カテゴリ',
      required: true,
      options: [
        { value: 'work', label: '仕事' },
        { value: 'personal', label: 'プライベート' },
        { value: 'study', label: '学習' },
      ],
      validation: [ValidationRules.required('カテゴリを選択してください')],
    };

    test('基本的なレンダリング', () => {
      render(<TestWrapper field={selectField} />);

      const select = screen.getByLabelText('カテゴリ *');
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe('SELECT');

      expect(screen.getByText('選択してください')).toBeInTheDocument();
      expect(screen.getByText('仕事')).toBeInTheDocument();
      expect(screen.getByText('プライベート')).toBeInTheDocument();
      expect(screen.getByText('学習')).toBeInTheDocument();
    });

    test('選択肢の選択', async () => {
      render(<TestWrapper field={selectField} />);

      const select = screen.getByLabelText('カテゴリ *');
      await user.selectOptions(select, 'work');

      expect(select).toHaveValue('work');
    });
  });

  describe('ラジオボタンフィールド', () => {
    const radioField: FormFieldConfig = {
      name: 'type',
      type: 'radio',
      label: 'タイプ',
      required: true,
      options: [
        { value: 'execution', label: '実行アクション' },
        { value: 'habit', label: '習慣アクション' },
      ],
      validation: [ValidationRules.required('タイプを選択してください')],
    };

    test('基本的なレンダリング', () => {
      render(<TestWrapper field={radioField} />);

      expect(screen.getByText('タイプ *')).toBeInTheDocument();
      expect(screen.getByLabelText('実行アクション')).toBeInTheDocument();
      expect(screen.getByLabelText('習慣アクション')).toBeInTheDocument();
    });

    test('ラジオボタンの選択', async () => {
      render(<TestWrapper field={radioField} />);

      const executionRadio = screen.getByLabelText('実行アクション');
      const habitRadio = screen.getByLabelText('習慣アクション');

      await user.click(executionRadio);
      expect(executionRadio).toBeChecked();
      expect(habitRadio).not.toBeChecked();

      await user.click(habitRadio);
      expect(executionRadio).not.toBeChecked();
      expect(habitRadio).toBeChecked();
    });
  });

  describe('キーボード操作', () => {
    const textField: FormFieldConfig = {
      name: 'title',
      type: 'text',
      label: 'タイトル',
      required: true,
      validation: [ValidationRules.required()],
    };

    test('Enterキーでの保存イベント発火', async () => {
      const saveEventListener = vi.fn();
      document.addEventListener('dynamicFormSave', saveEventListener);

      render(<TestWrapper field={textField} defaultValue="test value" />);

      const input = screen.getByLabelText('タイトル *');
      await user.type(input, '{enter}');

      expect(saveEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            fieldName: 'title',
            value: 'test value',
          },
        })
      );

      document.removeEventListener('dynamicFormSave', saveEventListener);
    });

    test('Tabキーでのフォーカス移動', async () => {
      render(
        <div>
          <TestWrapper field={textField} />
          <input data-testid="next-input" />
        </div>
      );

      const input = screen.getByLabelText('タイトル *');
      const nextInput = screen.getByTestId('next-input');

      await user.click(input);
      await user.tab();

      expect(nextInput).toHaveFocus();
    });
  });

  describe('アクセシビリティ', () => {
    const textField: FormFieldConfig = {
      name: 'title',
      type: 'text',
      label: 'タイトル',
      required: true,
      helpText: 'ヘルプテキスト',
      validation: [ValidationRules.required()],
    };

    test('適切なARIA属性の設定', () => {
      render(<TestWrapper field={textField} />);

      const input = screen.getByLabelText('タイトル *');

      expect(input).toHaveAttribute('aria-invalid', 'false');
      expect(input).toHaveAttribute('aria-describedby');
    });

    test('エラー時のARIA属性の更新', async () => {
      render(<TestWrapper field={textField} />);

      const input = screen.getByLabelText('タイトル *');

      // エラーを発生させる
      await user.type(input, 'test');
      await user.clear(input);

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });

    test('必須フィールドのマーク表示', () => {
      render(<TestWrapper field={textField} />);

      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveAttribute('aria-label', '必須');
    });
  });

  describe('プリセット設定', () => {
    test('タイトルプリセット', () => {
      const titleField = FieldPresets.title();

      expect(titleField.name).toBe('title');
      expect(titleField.type).toBe('text');
      expect(titleField.required).toBe(true);
      expect(titleField.maxLength).toBe(100);
      expect(titleField.showCounter).toBe(true);
    });

    test('説明プリセット', () => {
      const descriptionField = FieldPresets.description();

      expect(descriptionField.name).toBe('description');
      expect(descriptionField.type).toBe('textarea');
      expect(descriptionField.required).toBe(true);
      expect(descriptionField.maxLength).toBe(500);
      expect(descriptionField.rows).toBe(4);
    });

    test('アクション種別プリセット', () => {
      const actionTypeField = FieldPresets.actionType();

      expect(actionTypeField.name).toBe('type');
      expect(actionTypeField.type).toBe('radio');
      expect(actionTypeField.required).toBe(true);
      expect(actionTypeField.options).toHaveLength(2);
    });
  });

  describe('バリデーションルール', () => {
    test('必須バリデーション', () => {
      const rule = ValidationRules.required('カスタムメッセージ');

      expect(rule.type).toBe('required');
      expect(rule.message).toBe('カスタムメッセージ');
    });

    test('最小文字数バリデーション', () => {
      const rule = ValidationRules.minLength(10);

      expect(rule.type).toBe('minLength');
      expect(rule.value).toBe(10);
      expect(rule.message).toBe('10文字以上で入力してください');
    });

    test('最大文字数バリデーション', () => {
      const rule = ValidationRules.maxLength(100, 'カスタムメッセージ');

      expect(rule.type).toBe('maxLength');
      expect(rule.value).toBe(100);
      expect(rule.message).toBe('カスタムメッセージ');
    });

    test('パターンバリデーション', () => {
      const pattern = /^[a-zA-Z]+$/;
      const rule = ValidationRules.pattern(pattern, '英字のみ入力してください');

      expect(rule.type).toBe('pattern');
      expect(rule.value).toBe(pattern);
      expect(rule.message).toBe('英字のみ入力してください');
    });

    test('カスタムバリデーション', () => {
      const validator = (value: string) => value.includes('test');
      const rule = ValidationRules.custom(validator, 'testを含めてください');

      expect(rule.type).toBe('custom');
      expect(rule.validator).toBe(validator);
      expect(rule.message).toBe('testを含めてください');
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なフィールドタイプの処理', () => {
      const invalidField: FormFieldConfig = {
        name: 'invalid',
        type: 'invalid' as any,
        label: '無効なフィールド',
        required: false,
      };

      render(<TestWrapper field={invalidField} />);

      // エラーが発生せず、何も表示されないことを確認
      expect(screen.queryByLabelText('無効なフィールド')).not.toBeInTheDocument();
    });

    test('バリデーションエラーの表示', async () => {
      const fieldWithError: FormFieldConfig = {
        name: 'test',
        type: 'text',
        label: 'テストフィールド',
        required: true,
        validation: [ValidationRules.required('エラーメッセージ')],
      };

      render(<TestWrapper field={fieldWithError} />);

      const input = screen.getByLabelText('テストフィールド *');
      await user.type(input, 'test');
      await user.clear(input);

      await waitFor(() => {
        expect(screen.getByText('エラーメッセージ')).toBeInTheDocument();
      });
    });
  });

  describe('レスポンシブ対応', () => {
    test('テキストフィールドがモバイル用スタイルを適用する', () => {
      // window.innerWidthをモック
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const textField: FormFieldConfig = {
        name: 'title',
        type: 'text',
        label: 'タイトル',
        placeholder: 'タイトルを入力してください',
        required: true,
        maxLength: 100,
      };

      render(<TestWrapper field={textField} />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');
      expect(input).toHaveClass('text-base', 'px-4', 'py-3');
    });

    test('デスクトップでフォーカス表示が適切に動作する', async () => {
      // window.innerWidthをモック
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const textField: FormFieldConfig = {
        name: 'title',
        type: 'text',
        label: 'タイトル',
        placeholder: 'タイトルを入力してください',
        required: true,
      };

      render(<TestWrapper field={textField} />);

      const input = screen.getByPlaceholderText('タイトルを入力してください');

      await user.click(input);
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });
});
