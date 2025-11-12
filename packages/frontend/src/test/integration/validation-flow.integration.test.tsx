import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { GoalInputForm } from '../../components/forms/GoalInputForm';
import { GoalFormProvider } from '../../contexts/GoalFormContext';
import { goalFormSchema } from '../../schemas/goal-form';

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <GoalFormProvider>{children}</GoalFormProvider>
  </BrowserRouter>
);

describe('バリデーションフロー統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('リアルタイムバリデーション', () => {
    it('目標タイトルの文字数制限バリデーションが動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/);

      // 文字数制限を超える入力
      const longTitle = 'a'.repeat(101); // 100文字制限を超える
      await user.type(titleInput, longTitle);

      // リアルタイムバリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/100文字以内で入力してください/)).toBeInTheDocument();
      });

      // 文字数カウンターがエラー状態になる
      const characterCounter = screen.getByTestId('title-character-counter');
      expect(characterCounter).toHaveClass('text-red-500');
      expect(characterCounter).toHaveTextContent('101/100');

      // 送信ボタンが無効化される
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();

      // 正しい長さに修正
      await user.clear(titleInput);
      await user.type(titleInput, 'プログラミングスキル向上');

      // エラーが消える
      await waitFor(() => {
        expect(screen.queryByText(/100文字以内で入力してください/)).not.toBeInTheDocument();
      });

      // 文字数カウンターが正常状態に戻る
      expect(characterCounter).toHaveClass('text-gray-500');
      expect(characterCounter).toHaveTextContent('15/100');
    });

    it('目標説明の文字数制限バリデーションが動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      const descriptionInput = screen.getByLabelText(/目標説明/);

      // 文字数制限を超える入力
      const longDescription = 'a'.repeat(1001); // 1000文字制限を超える
      await user.type(descriptionInput, longDescription);

      // リアルタイムバリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/1000文字以内で入力してください/)).toBeInTheDocument();
      });

      // 文字数カウンターがエラー状態になる
      const characterCounter = screen.getByTestId('description-character-counter');
      expect(characterCounter).toHaveClass('text-red-500');
      expect(characterCounter).toHaveTextContent('1001/1000');

      // 入力が制限される（1000文字で停止）
      expect(descriptionInput).toHaveValue('a'.repeat(1000));
    });

    it('達成期限の日付バリデーションが動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      const deadlineInput = screen.getByLabelText(/達成期限/);

      // 過去の日付を入力
      const pastDate = '2020-01-01';
      await user.type(deadlineInput, pastDate);

      // バリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/今日から1年以内の日付を選択してください/)).toBeInTheDocument();
      });

      // 1年以上先の日付を入力
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);
      const futureDateString = futureDate.toISOString().split('T')[0];

      await user.clear(deadlineInput);
      await user.type(deadlineInput, futureDateString);

      // バリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/今日から1年以内の日付を選択してください/)).toBeInTheDocument();
      });

      // 正しい日付を入力
      const validDate = new Date();
      validDate.setMonth(validDate.getMonth() + 6);
      const validDateString = validDate.toISOString().split('T')[0];

      await user.clear(deadlineInput);
      await user.type(deadlineInput, validDateString);

      // エラーが消える
      await waitFor(() => {
        expect(
          screen.queryByText(/今日から1年以内の日付を選択してください/)
        ).not.toBeInTheDocument();
      });
    });

    it('背景フィールドの文字数制限バリデーションが動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      const backgroundInput = screen.getByLabelText(/背景/);

      // 文字数制限を超える入力
      const longBackground = 'a'.repeat(501); // 500文字制限を超える
      await user.type(backgroundInput, longBackground);

      // リアルタイムバリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/500文字以内で入力してください/)).toBeInTheDocument();
      });

      // 文字数カウンターがエラー状態になる
      const characterCounter = screen.getByTestId('background-character-counter');
      expect(characterCounter).toHaveClass('text-red-500');
      expect(characterCounter).toHaveTextContent('501/500');
    });

    it('制約事項フィールドの文字数制限バリデーションが動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      const constraintsInput = screen.getByLabelText(/制約事項/);

      // 文字数制限を超える入力
      const longConstraints = 'a'.repeat(501); // 500文字制限を超える
      await user.type(constraintsInput, longConstraints);

      // リアルタイムバリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/500文字以内で入力してください/)).toBeInTheDocument();
      });

      // 文字数カウンターがエラー状態になる
      const characterCounter = screen.getByTestId('constraints-character-counter');
      expect(characterCounter).toHaveClass('text-red-500');
      expect(characterCounter).toHaveTextContent('501/500');
    });
  });

  describe('送信時バリデーション', () => {
    it('必須フィールドが未入力の場合にバリデーションエラーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm onSubmitSuccess={() => {}} onSubmitError={() => {}} />
        </TestWrapper>
      );

      // 送信ボタンは無効状態のはず
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();

      // 一部のフィールドのみ入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');

      // まだ送信ボタンは無効
      expect(submitButton).toBeDisabled();

      // 全ての必須フィールドを入力
      await user.type(screen.getByLabelText(/目標説明/), 'テスト説明');
      await user.type(screen.getByLabelText(/達成期限/), '2024-12-31');
      await user.type(screen.getByLabelText(/背景/), 'テスト背景');

      // 送信ボタンが有効になる
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('複数のバリデーションエラーが同時に表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      // 複数のフィールドに無効な値を入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'a'.repeat(101)); // 文字数制限超過
      await user.type(screen.getByLabelText(/達成期限/), '2020-01-01'); // 過去の日付
      await user.type(screen.getByLabelText(/背景/), 'a'.repeat(501)); // 文字数制限超過

      // 複数のエラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/100文字以内で入力してください/)).toBeInTheDocument();
        expect(screen.getByText(/今日から1年以内の日付を選択してください/)).toBeInTheDocument();
        expect(screen.getByText(/500文字以内で入力してください/)).toBeInTheDocument();
      });

      // 送信ボタンが無効状態
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();
    });

    it('バリデーションエラーの修正により送信ボタンが有効になる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      // 無効な値を入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'a'.repeat(101));
      await user.type(screen.getByLabelText(/目標説明/), 'テスト説明');
      await user.type(screen.getByLabelText(/達成期限/), '2024-12-31');
      await user.type(screen.getByLabelText(/背景/), 'テスト背景');

      // エラーが表示され、送信ボタンが無効
      await waitFor(() => {
        expect(screen.getByText(/100文字以内で入力してください/)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();

      // エラーを修正
      await user.clear(screen.getByLabelText(/目標タイトル/));
      await user.type(screen.getByLabelText(/目標タイトル/), 'プログラミングスキル向上');

      // エラーが消え、送信ボタンが有効になる
      await waitFor(() => {
        expect(screen.queryByText(/100文字以内で入力してください/)).not.toBeInTheDocument();
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('カスタムバリデーション', () => {
    it('カスタムバリデーションルールが適用される', async () => {
      const user = userEvent.setup();

      const customValidationRules = {
        title: (value: string) => {
          if (value.includes('禁止語')) {
            return '禁止されている語句が含まれています';
          }
          return null;
        },
      };

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            customValidationRules={customValidationRules}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      // 禁止語を含むタイトルを入力
      await user.type(screen.getByLabelText(/目標タイトル/), '禁止語を含む目標');

      // カスタムバリデーションエラーが表示される
      await waitFor(() => {
        expect(screen.getByText(/禁止されている語句が含まれています/)).toBeInTheDocument();
      });

      // 送信ボタンが無効化される
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeDisabled();

      // 正しいタイトルに修正
      await user.clear(screen.getByLabelText(/目標タイトル/));
      await user.type(screen.getByLabelText(/目標タイトル/), '適切な目標');

      // エラーが消える
      await waitFor(() => {
        expect(screen.queryByText(/禁止されている語句が含まれています/)).not.toBeInTheDocument();
      });
    });

    it('非同期バリデーションが動作する', async () => {
      const user = userEvent.setup();

      const asyncValidationRules = {
        title: async (value: string) => {
          // 非同期バリデーション（重複チェックなど）をシミュレート
          await new Promise(resolve => setTimeout(resolve, 500));
          if (value === '重複する目標') {
            return '同じ目標が既に存在します';
          }
          return null;
        },
      };

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            asyncValidationRules={asyncValidationRules}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      // 重複する目標タイトルを入力
      await user.type(screen.getByLabelText(/目標タイトル/), '重複する目標');

      // バリデーション中のインジケーターが表示される
      expect(screen.getByTestId('title-validation-spinner')).toBeInTheDocument();

      // 非同期バリデーション完了後にエラーが表示される
      await waitFor(
        () => {
          expect(screen.getByText(/同じ目標が既に存在します/)).toBeInTheDocument();
        },
        { timeout: 100 }
      );

      // バリデーションスピナーが消える
      expect(screen.queryByTestId('title-validation-spinner')).not.toBeInTheDocument();
    });
  });

  describe('バリデーションの最適化', () => {
    it('デバウンス機能が正しく動作する', async () => {
      const user = userEvent.setup();
      const mockValidationFunction = vi.fn().mockReturnValue(null);

      const customValidationRules = {
        title: mockValidationFunction,
      };

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            customValidationRules={customValidationRules}
            enableRealTimeValidation={true}
            validationDebounceMs={300}
          />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/);

      // 連続して文字を入力
      await user.type(titleInput, 'テスト');

      // デバウンス期間中はバリデーションが実行されない
      expect(mockValidationFunction).not.toHaveBeenCalled();

      // デバウンス期間経過後にバリデーションが実行される
      await waitFor(
        () => {
          expect(mockValidationFunction).toHaveBeenCalledWith('テスト');
        },
        { timeout: 100 }
      );

      // 1回だけ実行される（デバウンスが効いている）
      expect(mockValidationFunction).toHaveBeenCalledTimes(1);
    });

    it('フィールドフォーカス時のバリデーションが動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
            validateOnBlur={true}
          />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/);

      // 無効な値を入力
      await user.type(titleInput, 'a'.repeat(101));

      // フォーカスを外す
      await user.tab();

      // onBlurバリデーションが実行される
      await waitFor(() => {
        expect(screen.getByText(/100文字以内で入力してください/)).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ対応', () => {
    it('バリデーションエラーが適切なARIA属性で表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText(/目標タイトル/);

      // 無効な値を入力
      await user.type(titleInput, 'a'.repeat(101));

      // エラーメッセージが表示される
      await waitFor(() => {
        const errorMessage = screen.getByText(/100文字以内で入力してください/);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      });

      // 入力フィールドにaria-describedbyが設定される
      expect(titleInput).toHaveAttribute('aria-describedby');
      expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('エラーサマリーが適切に表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            enableRealTimeValidation={true}
            showErrorSummary={true}
          />
        </TestWrapper>
      );

      // 複数のフィールドに無効な値を入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'a'.repeat(101));
      await user.type(screen.getByLabelText(/達成期限/), '2020-01-01');

      // エラーサマリーが表示される
      await waitFor(() => {
        const errorSummary = screen.getByRole('alert', { name: /入力エラーがあります/ });
        expect(errorSummary).toBeInTheDocument();
        expect(errorSummary).toHaveAttribute('aria-live', 'assertive');
      });

      // エラー数が表示される
      expect(screen.getByText(/2件のエラーがあります/)).toBeInTheDocument();
    });
  });

  describe('Zodスキーマ統合', () => {
    it('Zodスキーマのバリデーションが正しく動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            validationSchema={goalFormSchema}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      // Zodスキーマに基づくバリデーション
      await user.type(screen.getByLabelText(/目標タイトル/), ''); // 必須フィールド

      await waitFor(() => {
        expect(screen.getByText(/目標タイトルは必須です/)).toBeInTheDocument();
      });

      // 正しい値を入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'プログラミングスキル向上');

      // エラーが消える
      await waitFor(() => {
        expect(screen.queryByText(/目標タイトルは必須です/)).not.toBeInTheDocument();
      });
    });

    it('Zodスキーマのカスタムバリデーションが動作する', async () => {
      const user = userEvent.setup();

      // カスタムZodスキーマ
      const customSchema = goalFormSchema.extend({
        title: goalFormSchema.shape.title.refine(value => !value.includes('テスト'), {
          message: 'タイトルに「テスト」を含めることはできません',
        }),
      });

      render(
        <TestWrapper>
          <GoalInputForm
            onSubmitSuccess={() => {}}
            onSubmitError={() => {}}
            validationSchema={customSchema}
            enableRealTimeValidation={true}
          />
        </TestWrapper>
      );

      // カスタムバリデーションに引っかかる値を入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト目標');

      // カスタムエラーメッセージが表示される
      await waitFor(() => {
        expect(
          screen.getByText(/タイトルに「テスト」を含めることはできません/)
        ).toBeInTheDocument();
      });
    });
  });
});
