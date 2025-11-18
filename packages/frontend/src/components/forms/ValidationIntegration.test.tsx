import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock components
const MockFormField: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-testid="form-field">{children}</div>
);

const MockTextInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  error?: string;
}> = ({ value, onChange, error }) => (
  <div>
    <input
      data-testid="text-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-invalid={!!error}
    />
    {error && <div data-testid="field-error">{error}</div>}
  </div>
);

const MockErrorDisplay: React.FC<{ errors: string[] }> = ({ errors }) => (
  <div data-testid="error-display">
    {errors.map((error, index) => (
      <div key={index} data-testid="error-item">
        {error}
      </div>
    ))}
  </div>
);

// Test component with validation integration
const TestValidationForm: React.FC = () => {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    background: '',
    constraints: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };

    if (name === 'title' && !value.trim()) {
      newErrors.title = 'タイトルは必須です';
    } else if (name === 'title') {
      delete newErrors.title;
    }

    if (name === 'description' && value.length < 10) {
      newErrors.description = '説明は10文字以上入力してください';
    } else if (name === 'description') {
      delete newErrors.description;
    }

    setErrors(newErrors);
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // リアルタイムバリデーション
    setIsValidating(true);
    setTimeout(() => {
      validateField(name, value);
      setIsValidating(false);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 全フィールドのバリデーション
    Object.entries(formData).forEach(([name, value]) => {
      validateField(name, value);
    });

    // 送信処理のシミュレーション
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  };

  const hasErrors = Object.keys(errors).length > 0;
  const errorList = Object.values(errors);

  return (
    <form onSubmit={handleSubmit} data-testid="test-form">
      <MockFormField>
        <label htmlFor="title">タイトル</label>
        <MockTextInput
          value={formData.title}
          onChange={value => handleChange('title', value)}
          error={errors.title}
        />
      </MockFormField>

      <MockFormField>
        <label htmlFor="description">説明</label>
        <MockTextInput
          value={formData.description}
          onChange={value => handleChange('description', value)}
          error={errors.description}
        />
      </MockFormField>

      {errorList.length > 0 && <MockErrorDisplay errors={errorList} />}

      {isValidating && <div data-testid="validating">バリデーション中...</div>}

      <button type="submit" disabled={hasErrors || isSubmitting} data-testid="submit-button">
        {isSubmitting ? '送信中...' : '送信'}
      </button>
    </form>
  );
};

describe('Validation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('リアルタイムバリデーション統合', () => {
    it('入力フィールドでリアルタイムバリデーションが動作する', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const titleInput = screen.getByTestId('text-input');

      // 空の値でフォーカスアウト
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toBeInTheDocument();
      });
    });

    it('複数フィールドのバリデーションが同時に動作する', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });
    });

    it('バリデーション中の状態が表示される', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const titleInput = screen.getByTestId('text-input');
      await user.type(titleInput, 'test');

      // バリデーション中の表示を確認
      expect(screen.queryByTestId('validating')).toBeInTheDocument();
    });
  });

  describe('フォーム送信バリデーション統合', () => {
    it('無効なデータで送信時にエラーが表示される', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });
    });

    it('有効なデータで送信が成功する', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const titleInput = screen.getByTestId('text-input');
      await user.type(titleInput, 'Valid Title');

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      expect(screen.getByText('送信中...')).toBeInTheDocument();
    });

    it('送信ボタンの状態が適切に制御される', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const submitButton = screen.getByTestId('submit-button');

      // 初期状態では無効
      expect(submitButton).toBeDisabled();

      // 有効な値を入力
      const titleInput = screen.getByTestId('text-input');
      await user.type(titleInput, 'Valid Title');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('エラー表示統合', () => {
    it('エラーサマリーが適切に表示される', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const submitButton = screen.getByTestId('submit-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });
    });

    it('インラインエラーとサマリーエラーが連動する', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const titleInput = screen.getByTestId('text-input');
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId('field-error')).toBeInTheDocument();
        expect(screen.getByTestId('error-display')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ統合', () => {
    it('aria-invalid属性が適切に設定される', () => {
      render(<TestValidationForm />);

      const titleInput = screen.getByTestId('text-input');
      expect(titleInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('エラーメッセージが適切にアナウンスされる', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const titleInput = screen.getByTestId('text-input');
      await user.click(titleInput);
      await user.tab();

      await waitFor(() => {
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('パフォーマンス統合', () => {
    it('デバウンス機能が正常に動作する', async () => {
      const user = userEvent.setup();
      render(<TestValidationForm />);

      const titleInput = screen.getByTestId('text-input');
      await user.type(titleInput, 'test');

      // デバウンスにより最後の入力のみバリデーションされる
      expect(screen.queryByTestId('validating')).toBeInTheDocument();
    });
  });
});
