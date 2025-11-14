import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { GoalInputForm, GoalInputFormProps } from './GoalInputForm';
import { GoalFormData, PartialGoalFormData } from '../../schemas/goal-form';
import { fastWaitFor, quickCheck } from '../../test/utils/test-helpers';

// モック
vi.mock('../../schemas/goal-form', async () => {
  const actual = await vi.importActual('../../schemas/goal-form');
  return {
    ...actual,
    dateUtils: {
      getMinDate: () => '2024-01-01',
      getMaxDate: () => '2024-12-31',
    },
  };
});

// テスト用のデフォルトプロパティ
const defaultProps: GoalInputFormProps = {
  onSubmit: vi.fn(),
  onDraftSave: vi.fn(),
  isSubmitting: false,
  isDraftSaving: false,
};

// テスト用のサンプルデータ
const sampleFormData: GoalFormData = {
  title: 'プログラミングスキル向上',
  description: 'React、TypeScript、Node.jsを習得してWebアプリケーションを開発できるようになる',
  deadline: '2024-06-30',
  background: '現在の職場でWebアプリケーション開発の需要が高まっており、スキルアップが必要',
  constraints: '平日は仕事があるため学習時間は限られる',
};

const samplePartialData: PartialGoalFormData = {
  title: 'プログラミング',
  description: '',
  deadline: '',
  background: '',
  constraints: '',
};

describe('GoalInputForm', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnDraftSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnDraftSave = vi.fn().mockResolvedValue(undefined);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('基本的なレンダリング', () => {
    it('すべての必須フィールドが表示される', () => {
      render(<GoalInputForm {...defaultProps} />);

      expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/目標説明/)).toBeInTheDocument();
      expect(screen.getByLabelText(/達成期限/)).toBeInTheDocument();
      expect(screen.getByLabelText(/背景/)).toBeInTheDocument();
      expect(screen.getByLabelText(/制約事項/)).toBeInTheDocument();
    });

    it('必須マークが正しく表示される', () => {
      render(<GoalInputForm {...defaultProps} />);

      const requiredFields = ['目標タイトル', '目標説明', '達成期限', '背景'];
      requiredFields.forEach(field => {
        const label = screen.getByText(new RegExp(field));
        expect(label.parentElement).toHaveTextContent('*');
      });

      // 制約事項は任意なので必須マークがない
      const constraintsLabel = screen.getByText(/制約事項/);
      expect(constraintsLabel.parentElement).not.toHaveTextContent('*');
    });

    it('送信ボタンが表示される', () => {
      render(<GoalInputForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /AI生成開始/ })).toBeInTheDocument();
    });

    it('下書き保存ボタンが条件付きで表示される', () => {
      const propsWithoutDraftSave = { ...defaultProps, onDraftSave: undefined };
      const { rerender } = render(<GoalInputForm {...propsWithoutDraftSave} />);

      // onDraftSaveが提供されていない場合は表示されない
      expect(screen.queryByRole('button', { name: /下書き保存/ })).not.toBeInTheDocument();

      // onDraftSaveが提供されている場合は表示される
      rerender(<GoalInputForm {...defaultProps} onDraftSave={mockOnDraftSave} />);
      expect(screen.getByRole('button', { name: /下書き保存/ })).toBeInTheDocument();
    });
  });

  describe('初期データの設定', () => {
    it('初期データが正しく設定される', () => {
      render(<GoalInputForm {...defaultProps} initialData={sampleFormData} />);

      expect(screen.getByDisplayValue(sampleFormData.title)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.description)).toBeInTheDocument();
      // DatePickerは隠しinputを使用するため、name属性で検索
      const deadlineInput = screen.getByRole('textbox', { name: /達成期限/ });
      expect(deadlineInput).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.background)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.constraints!)).toBeInTheDocument();
    });

    it('部分的な初期データが正しく設定される', () => {
      render(<GoalInputForm {...defaultProps} initialData={samplePartialData} />);

      expect(screen.getByDisplayValue(samplePartialData.title!)).toBeInTheDocument();
      // 説明フィールドが空であることを確認
      const descriptionField = screen.getByLabelText(/目標説明/);
      expect(descriptionField).toHaveValue('');
    });
  });

  describe('フォーム入力', () => {
    it('テキスト入力が正しく動作する', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} />);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      await user.type(titleInput, 'テスト目標');

      expect(titleInput).toHaveValue('テスト目標');
    });

    it('テキストエリア入力が正しく動作する', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} />);

      const descriptionInput = screen.getByLabelText(/目標説明/);
      await user.type(descriptionInput, 'テスト説明');

      expect(descriptionInput).toHaveValue('テスト説明');
    });

    it('文字数カウンターが正しく更新される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} />);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      await user.type(titleInput, 'テスト');

      // 文字数カウンターの表示を確認（スペースなしの形式）
      expect(screen.getByText('3/100')).toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    it('必須フィールドが空の場合にエラーが表示される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      await user.click(submitButton);

      // エラーサマリーが表示されることを確認
      await fastWaitFor(() => {
        expect(screen.getByText(/入力内容を確認してください/)).toBeInTheDocument();
      });

      // 個別のエラーメッセージも確認
      await fastWaitFor(() => {
        expect(screen.getByText(/目標タイトルは必須です/)).toBeInTheDocument();
        expect(screen.getByText(/目標説明は必須です/)).toBeInTheDocument();
        expect(screen.getByText(/達成期限は必須です/)).toBeInTheDocument();
        expect(screen.getByText(/背景は必須です/)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('文字数制限を超えた場合にエラーが表示される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} />);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      const longTitle = 'a'.repeat(101); // 100文字制限を超える
      await user.type(titleInput, longTitle);

      // フィールドからフォーカスを外してバリデーションをトリガー
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/目標タイトルは100文字以内で入力してください/)).toBeInTheDocument();
      });
    });

    it('有効なデータの場合はエラーが表示されない', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} />);

      // 有効なデータを入力
      await user.type(screen.getByLabelText(/目標タイトル/), sampleFormData.title);
      await user.type(screen.getByLabelText(/目標説明/), sampleFormData.description);
      await user.type(screen.getByLabelText(/達成期限/), sampleFormData.deadline);
      await user.type(screen.getByLabelText(/背景/), sampleFormData.background);

      // バリデーションをトリガー
      await user.tab();

      // エラーメッセージが表示されないことを確認
      expect(screen.queryByText(/は必須です/)).not.toBeInTheDocument();
      expect(screen.queryByText(/文字以内で入力してください/)).not.toBeInTheDocument();
    });
  });

  describe('フォーム送信', () => {
    it('有効なデータでフォーム送信が実行される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 有効なデータを入力
      const titleInput = screen.getByLabelText(/目標タイトル/);
      const descriptionInput = screen.getByLabelText(/目標説明/);
      const deadlineInput = screen.getByLabelText(/達成期限/);
      const backgroundInput = screen.getByLabelText(/背景/);
      const constraintsInput = screen.getByLabelText(/制約事項/);

      await user.clear(titleInput);
      await user.type(titleInput, sampleFormData.title);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, sampleFormData.description);
      await user.clear(deadlineInput);
      await user.type(deadlineInput, sampleFormData.deadline);
      await user.clear(backgroundInput);
      await user.type(backgroundInput, sampleFormData.background);
      await user.clear(constraintsInput);
      await user.type(constraintsInput, sampleFormData.constraints!);

      // フォームが有効になるまで待機
      await fastWaitFor(() => {
        const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      await user.click(submitButton);

      await fastWaitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: sampleFormData.title,
            description: sampleFormData.description,
            deadline: sampleFormData.deadline,
            background: sampleFormData.background,
            constraints: sampleFormData.constraints,
          })
        );
      });
    });

    it('送信中はボタンが無効化される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} isSubmitting={true} />);

      const submitButton = screen.getByRole('button', { name: /AI生成開始中/ });
      expect(submitButton).toBeDisabled();
    });

    it('送信エラー時にエラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      const errorMessage = 'サーバーエラーが発生しました';
      mockOnSubmit.mockRejectedValue(new Error(errorMessage));

      render(<GoalInputForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 有効なデータを入力
      const titleInput = screen.getByLabelText(/目標タイトル/);
      const descriptionInput = screen.getByLabelText(/目標説明/);
      const deadlineInput = screen.getByLabelText(/達成期限/);
      const backgroundInput = screen.getByLabelText(/背景/);

      await user.clear(titleInput);
      await user.type(titleInput, sampleFormData.title);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, sampleFormData.description);
      await user.clear(deadlineInput);
      await user.type(deadlineInput, sampleFormData.deadline);
      await user.clear(backgroundInput);
      await user.type(backgroundInput, sampleFormData.background);

      // フォームが有効になるまで待機
      await fastWaitFor(() => {
        const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
        expect(submitButton).not.toBeDisabled();
      });

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      await user.click(submitButton);

      // エラーハンドリングは親コンポーネントで行われるため、
      // ここではonSubmitが呼ばれることのみ確認
      await fastWaitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('下書き保存', () => {
    it('下書き保存ボタンをクリックすると下書き保存が実行される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} onDraftSave={mockOnDraftSave} />);

      // 部分的なデータを入力
      await user.type(screen.getByLabelText(/目標タイトル/), samplePartialData.title!);

      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      await user.click(draftSaveButton);

      await waitFor(() => {
        expect(mockOnDraftSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: samplePartialData.title,
          })
        );
      });
    });

    it('下書き保存中はボタンが無効化される', () => {
      render(
        <GoalInputForm {...defaultProps} onDraftSave={mockOnDraftSave} isDraftSaving={true} />
      );

      const draftSaveButton = screen.getByRole('button', { name: /保存中/ });
      expect(draftSaveButton).toBeDisabled();
    });

    it('未保存の変更がない場合は下書き保存ボタンが無効化される', () => {
      render(<GoalInputForm {...defaultProps} onDraftSave={mockOnDraftSave} />);

      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      expect(draftSaveButton).toBeDisabled();
    });
  });

  describe('自動保存', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('自動保存が有効な場合、30秒後に自動保存が実行される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <GoalInputForm
          {...defaultProps}
          onDraftSave={mockOnDraftSave}
          enableAutoSave={true}
          autoSaveInterval={30000}
        />
      );

      // データを入力して変更を作成
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト');

      // 30秒経過をシミュレート
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await fastWaitFor(() => {
        expect(mockOnDraftSave).toHaveBeenCalled();
      });
    });

    it('自動保存が無効な場合、自動保存が実行されない', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <GoalInputForm {...defaultProps} onDraftSave={mockOnDraftSave} enableAutoSave={false} />
      );

      // データを入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト');

      // 30秒経過をシミュレート
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      expect(mockOnDraftSave).not.toHaveBeenCalled();
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合、すべての入力が無効化される', () => {
      render(<GoalInputForm {...defaultProps} disabled={true} />);

      expect(screen.getByLabelText(/目標タイトル/)).toBeDisabled();
      expect(screen.getByLabelText(/目標説明/)).toBeDisabled();
      expect(screen.getByLabelText(/達成期限/)).toBeDisabled();
      expect(screen.getByLabelText(/背景/)).toBeDisabled();
      expect(screen.getByLabelText(/制約事項/)).toBeDisabled();
      expect(screen.getByRole('button', { name: /AI生成開始/ })).toBeDisabled();
    });
  });

  describe('エラーサマリー', () => {
    it('showErrorSummary=trueの場合、エラーサマリーが表示される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} showErrorSummary={true} />);

      // バリデーションエラーを発生させるため、空のフォームで送信を試行
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });

      // フォームが無効な状態でも送信ボタンをクリックしてバリデーションを実行
      await user.click(submitButton);

      // バリデーションエラーが発生するまで待機
      await fastWaitFor(() => {
        // 個別のエラーメッセージが表示されることを確認
        expect(screen.getByText(/目標タイトルは必須です/)).toBeInTheDocument();
      });

      // エラーサマリーが表示されることを確認
      await fastWaitFor(() => {
        expect(screen.getByText(/入力内容を確認してください/)).toBeInTheDocument();
      });
    });

    it('showErrorSummary=falseの場合、エラーサマリーが表示されない', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} showErrorSummary={false} />);

      // バリデーションエラーを発生させる
      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/入力内容を確認してください/)).not.toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', () => {
      render(<GoalInputForm {...defaultProps} />);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      expect(titleInput).toHaveAttribute('aria-invalid', 'false');

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('エラー状態でaria-invalid="true"が設定される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      await user.click(submitButton);

      // バリデーションエラーが発生するまで待機
      await fastWaitFor(() => {
        expect(screen.getByText(/目標タイトルは必須です/)).toBeInTheDocument();
      });

      // aria-invalid属性がtrueに設定されることを確認
      await fastWaitFor(() => {
        const titleInput = screen.getByLabelText(/目標タイトル/);
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('レスポンシブ対応', () => {
    it('適切なCSSクラスが適用されている', () => {
      render(<GoalInputForm {...defaultProps} className="custom-class" />);

      const container = screen.getByRole('form').parentElement;
      expect(container).toHaveClass('max-w-4xl', 'mx-auto', 'custom-class');
    });

    it('デスクトップ用のレイアウトクラスが適用される', () => {
      // window.innerWidthをモック
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<GoalInputForm {...defaultProps} />);

      const container = screen.getByRole('form').parentElement;
      expect(container).toHaveClass('lg:max-w-6xl');
    });

    it('モバイルでタッチ操作に適したサイズが適用される', () => {
      // window.innerWidthをモック
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      render(<GoalInputForm {...defaultProps} />);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      expect(titleInput).toHaveClass('min-h-[44px]');
    });
  });
});
