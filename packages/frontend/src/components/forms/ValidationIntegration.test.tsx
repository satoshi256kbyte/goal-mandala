import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { FormField } from './FormField';
import { TextInput } from './TextInput';
import { TextArea } from './TextArea';
import { DateInput } from './DateInput';
import { ErrorDisplay, ErrorSummary } from './ErrorDisplay';
import { useRealtimeValidation, useFormSubmission } from '../../hooks';

// タイマーをモック化
vi.useFakeTimers();

// テスト用のフォームコンポーネント
const TestGoalForm: React.FC = () => {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    deadline: '',
    background: '',
    constraints: '',
  });

  const validation = useRealtimeValidation({
    debounceMs: 300,
    validateOnBlur: true,
    validateOnChange: true,
  });

  const submission = useFormSubmission({
    validateBeforeSubmit: true,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    validation.debouncedValidate(field as any, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await submission.submitForm(formData, async data => {
      // モック送信関数
      return { id: '123', ...data };
    });

    if (result.success) {
      console.log('送信成功:', result.data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ErrorSummary
        validationErrors={submission.validationErrors}
        submissionError={submission.submissionState.isSubmitting ? undefined : undefined}
        onFieldFocus={fieldName => {
          const element = document.getElementById(fieldName);
          element?.focus();
        }}
      />

      <FormField
        label="目標タイトル"
        required
        fieldName="title"
        validationState={validation.getFieldValidation('title')}
        showValidating={true}
      >
        <TextInput
          value={formData.title}
          onChange={e => handleInputChange('title', e.target.value)}
          placeholder="目標を入力してください"
          maxLength={100}
        />
      </FormField>

      <FormField
        label="目標説明"
        required
        fieldName="description"
        validationState={validation.getFieldValidation('description')}
      >
        <TextArea
          value={formData.description}
          onChange={e => handleInputChange('description', e.target.value)}
          placeholder="目標の詳細を入力してください"
          rows={4}
          maxLength={1000}
        />
      </FormField>

      <FormField
        label="達成期限"
        required
        fieldName="deadline"
        validationState={validation.getFieldValidation('deadline')}
      >
        <DateInput
          value={formData.deadline}
          onChange={e => handleInputChange('deadline', e.target.value)}
        />
      </FormField>

      <FormField
        label="背景"
        required
        fieldName="background"
        validationState={validation.getFieldValidation('background')}
      >
        <TextArea
          value={formData.background}
          onChange={e => handleInputChange('background', e.target.value)}
          placeholder="目標設定の背景を入力してください"
          rows={3}
          maxLength={500}
        />
      </FormField>

      <FormField
        label="制約事項"
        fieldName="constraints"
        validationState={validation.getFieldValidation('constraints')}
        helpText="任意項目です"
      >
        <TextArea
          value={formData.constraints}
          onChange={e => handleInputChange('constraints', e.target.value)}
          placeholder="制約事項があれば入力してください"
          rows={2}
          maxLength={500}
        />
      </FormField>

      <ErrorDisplay
        validationErrors={submission.validationErrors}
        submissionError={submission.submissionState.isSubmitting ? undefined : undefined}
        showDetails={true}
      />

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={!submission.canSubmit || validation.hasErrors()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {submission.submissionState.isSubmitting ? '送信中...' : 'AI生成開始'}
        </button>

        <button
          type="button"
          onClick={() => {
            // 下書き保存のモック
            console.log('下書き保存:', formData);
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded"
        >
          下書き保存
        </button>
      </div>
    </form>
  );
};

describe('Validation Integration Tests', () => {
  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    jest.clearAllTimers();
  });

  describe('リアルタイムバリデーション統合', () => {
    it('フィールド入力時にリアルタイムバリデーションが動作する', async () => {
      render(<TestGoalForm />);

      const titleInput = screen.getByPlaceholderText('目標を入力してください');

      // 無効な値を入力
      await user.type(titleInput, 'テスト');
      await user.clear(titleInput);

      // デバウンス時間を進める
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
      });

      // 有効な値を入力
      await user.type(titleInput, 'テスト目標');

      // デバウンス時間を進める
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.queryByText('目標タイトルは必須です')).not.toBeInTheDocument();
      });
    });

    it('複数フィールドのバリデーションが同時に動作する', async () => {
      render(<TestGoalForm />);

      const titleInput = screen.getByPlaceholderText('目標を入力してください');
      const descriptionInput = screen.getByPlaceholderText('目標の詳細を入力してください');

      // 両方のフィールドに無効な値を入力
      await user.click(titleInput);
      await user.tab(); // titleからフォーカスを外す

      await user.click(descriptionInput);
      await user.tab(); // descriptionからフォーカスを外す

      await waitFor(() => {
        expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
        expect(screen.getByText('目標説明は必須です')).toBeInTheDocument();
      });
    });

    it('バリデーション中の状態が表示される', async () => {
      render(<TestGoalForm />);

      const titleInput = screen.getByPlaceholderText('目標を入力してください');

      await user.type(titleInput, 'テスト目標');

      // バリデーション中の表示を確認（デバウンス中）
      expect(screen.getByText('確認中...')).toBeInTheDocument();

      // デバウンス完了後
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.queryByText('確認中...')).not.toBeInTheDocument();
      });
    });
  });

  describe('フォーム送信バリデーション統合', () => {
    it('送信時に全フィールドのバリデーションが実行される', async () => {
      render(<TestGoalForm />);

      const submitButton = screen.getByText('AI生成開始');

      // 空のフォームで送信を試行
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/件のエラーがあります/)).toBeInTheDocument();
        expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
        expect(screen.getByText('目標説明は必須です')).toBeInTheDocument();
        expect(screen.getByText('達成期限は必須です')).toBeInTheDocument();
        expect(screen.getByText('背景は必須です')).toBeInTheDocument();
      });
    });

    it('有効なデータで送信が成功する', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();

      render(<TestGoalForm />);

      // 全フィールドに有効な値を入力
      await user.type(screen.getByPlaceholderText('目標を入力してください'), 'テスト目標');
      await user.type(screen.getByPlaceholderText('目標の詳細を入力してください'), 'テスト説明');

      const deadlineInput = screen.getByDisplayValue('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      await user.type(deadlineInput, tomorrowString);

      await user.type(
        screen.getByPlaceholderText('目標設定の背景を入力してください'),
        'テスト背景'
      );

      // デバウンス時間を進める
      vi.advanceTimersByTime(300);

      const submitButton = screen.getByText('AI生成開始');
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '送信成功:',
          expect.objectContaining({
            id: '123',
            title: 'テスト目標',
            description: 'テスト説明',
            background: 'テスト背景',
          })
        );
      });

      consoleSpy.mockRestore();
    });

    it('送信ボタンの状態が適切に制御される', async () => {
      render(<TestGoalForm />);

      const submitButton = screen.getByText('AI生成開始');

      // 初期状態では送信不可
      expect(submitButton).toBeDisabled();

      // 有効なデータを入力
      await user.type(screen.getByPlaceholderText('目標を入力してください'), 'テスト目標');
      await user.type(screen.getByPlaceholderText('目標の詳細を入力してください'), 'テスト説明');

      const deadlineInput = screen.getByDisplayValue('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];
      await user.type(deadlineInput, tomorrowString);

      await user.type(
        screen.getByPlaceholderText('目標設定の背景を入力してください'),
        'テスト背景'
      );

      // デバウンス時間を進める
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('エラー表示統合', () => {
    it('エラーサマリーからフィールドにフォーカス移動できる', async () => {
      render(<TestGoalForm />);

      const submitButton = screen.getByText('AI生成開始');
      await user.click(submitButton);

      await waitFor(() => {
        const titleErrorLink = screen.getByRole('button', {
          name: /目標タイトル: 目標タイトルは必須です/,
        });
        expect(titleErrorLink).toBeInTheDocument();
      });

      // エラーリンクをクリック
      const titleErrorLink = screen.getByRole('button', {
        name: /目標タイトル: 目標タイトルは必須です/,
      });
      await user.click(titleErrorLink);

      // フィールドにフォーカスが移動することを確認
      const titleInput = screen.getByPlaceholderText('目標を入力してください');
      expect(titleInput).toHaveFocus();
    });

    it('インラインエラーとサマリーエラーが連動する', async () => {
      render(<TestGoalForm />);

      const titleInput = screen.getByPlaceholderText('目標を入力してください');

      // フィールドをフォーカスしてブラーする（空の状態で）
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        // インラインエラーが表示される
        expect(screen.getByText('目標タイトルは必須です')).toBeInTheDocument();
      });

      // フォーム送信を試行
      const submitButton = screen.getByText('AI生成開始');
      await user.click(submitButton);

      await waitFor(() => {
        // サマリーエラーも表示される
        expect(screen.getByText(/件のエラーがあります/)).toBeInTheDocument();
        // 同じエラーメッセージが複数箇所に表示される
        const errorMessages = screen.getAllByText('目標タイトルは必須です');
        expect(errorMessages.length).toBeGreaterThan(1);
      });
    });
  });

  describe('アクセシビリティ統合', () => {
    it('適切なARIA属性が設定される', async () => {
      render(<TestGoalForm />);

      const titleInput = screen.getByPlaceholderText('目標を入力してください');

      // エラー状態でのARIA属性
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
        expect(titleInput).toHaveAttribute('aria-describedby');
      });

      // 有効な値を入力
      await user.type(titleInput, 'テスト目標');

      // デバウンス時間を進める
      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'false');
      });
    });

    it('エラーメッセージが適切にアナウンスされる', async () => {
      render(<TestGoalForm />);

      const submitButton = screen.getByText('AI生成開始');
      await user.click(submitButton);

      await waitFor(() => {
        const errorSummary = screen.getByRole('alert');
        expect(errorSummary).toBeInTheDocument();
        expect(errorSummary).toHaveAttribute('aria-labelledby', 'error-summary-title');
      });
    });
  });

  describe('パフォーマンス統合', () => {
    it('デバウンス機能により不要なバリデーションが抑制される', async () => {
      const validateSpy = vi.fn();

      // バリデーション関数をモック化
      const OriginalFormField = FormField;
      vi.spyOn(React, 'cloneElement').mockImplementation((element, props) => {
        if (props?.onChange) {
          const originalOnChange = props.onChange;
          props.onChange = (...args: any[]) => {
            validateSpy();
            return originalOnChange(...args);
          };
        }
        return React.cloneElement(element, props);
      });

      render(<TestGoalForm />);

      const titleInput = screen.getByPlaceholderText('目標を入力してください');

      // 連続して文字を入力
      await user.type(titleInput, 'テスト');

      // デバウンス時間内では1回のみバリデーションが実行される
      expect(validateSpy).toHaveBeenCalledTimes(4); // 't', 'e', 's', 't'

      // デバウンス時間を進める
      vi.advanceTimersByTime(300);

      // デバウンス後に最終的なバリデーションが実行される
      await waitFor(() => {
        // 実際のバリデーション実行回数は入力文字数と同じ
        expect(validateSpy).toHaveBeenCalledTimes(4);
      });

      vi.restoreAllMocks();
    });
  });
});
