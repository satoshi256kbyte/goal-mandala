import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { GoalInputForm, GoalInputFormProps } from './GoalInputForm';
import { GoalFormData } from '../../schemas/goal-form';
import { renderWithProviders } from '../../test/test-utils';
import { GoalFormProvider } from '../../contexts/GoalFormContext';

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

describe('GoalInputForm', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnDraftSave: ReturnType<typeof vi.fn>;

  // ヘルパー関数: GoalFormProviderでラップしてレンダリング
  const renderGoalInputForm = (props: GoalInputFormProps) => {
    return renderWithProviders(
      <GoalFormProvider>
        <GoalInputForm {...props} />
      </GoalFormProvider>
    );
  };

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
      renderGoalInputForm(defaultProps);

      expect(screen.getByLabelText(/目標タイトル/)).toBeInTheDocument();
      expect(screen.getByLabelText(/目標説明/)).toBeInTheDocument();
      expect(screen.getByLabelText(/達成期限/)).toBeInTheDocument();
      expect(screen.getByLabelText(/背景/)).toBeInTheDocument();
      expect(screen.getByLabelText(/制約事項/)).toBeInTheDocument();
    });

    it('送信ボタンが表示される', () => {
      renderGoalInputForm(defaultProps);

      expect(screen.getByRole('button', { name: /AI生成開始/ })).toBeInTheDocument();
    });
  });

  describe('初期データの設定', () => {
    it('初期データが正しく設定される', () => {
      render(<GoalInputForm {...defaultProps} initialData={sampleFormData} />);

      expect(screen.getByDisplayValue(sampleFormData.title)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.description)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.background)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.constraints!)).toBeInTheDocument();
    });
  });

  describe('フォーム入力', () => {
    it('テキスト入力が正しく動作する', async () => {
      const user = userEvent.setup();
      renderGoalInputForm(defaultProps);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      await user.type(titleInput, 'テスト目標');

      expect(titleInput).toHaveValue('テスト目標');
    });

    it('文字数カウンターが正しく更新される', async () => {
      const user = userEvent.setup();
      renderGoalInputForm(defaultProps);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      await user.type(titleInput, 'テスト');

      // 文字数カウンターの表示を確認
      expect(screen.getByText('3/100')).toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    it('必須フィールドが空の場合にエラーが表示される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} onSubmit={mockOnSubmit} showErrorSummary={true} />);

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      await user.click(submitButton);

      // エラーサマリーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/入力内容を確認してください/)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('フォーム送信', () => {
    it('送信ボタンが表示される', () => {
      render(<GoalInputForm {...defaultProps} onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /AI生成開始/ });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('下書き保存', () => {
    it('下書き保存ボタンをクリックすると下書き保存が実行される', async () => {
      const user = userEvent.setup();
      render(<GoalInputForm {...defaultProps} onDraftSave={mockOnDraftSave} />);

      // 部分的なデータを入力
      await user.type(screen.getByLabelText(/目標タイトル/), 'テスト');

      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      await user.click(draftSaveButton);

      await waitFor(() => {
        expect(mockOnDraftSave).toHaveBeenCalled();
      });
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

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', () => {
      renderGoalInputForm(defaultProps);

      const titleInput = screen.getByLabelText(/目標タイトル/);
      expect(titleInput).toHaveAttribute('aria-invalid', 'false');

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });
});
