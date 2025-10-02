import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SubGoalForm } from './SubGoalForm';
import { SubGoalProvider } from '../../contexts/SubGoalContext';
import { SubGoalFormData, PartialSubGoalFormData } from '../../schemas/subgoal-form';

// テスト用のサンプルデータ
const sampleFormData: SubGoalFormData = {
  title: 'プログラミング基礎',
  description: 'プログラミングの基礎概念を学習し、基本的なコードが書けるようになる',
  background: 'プログラミング未経験だが、基礎をしっかり身につけたい',
  constraints: '学習時間は平日夜と週末のみ',
};

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SubGoalProvider goalId="goal-1">{children}</SubGoalProvider>
);

// モック関数
const mockOnSubmit = vi.fn();
const mockOnDraftSave = vi.fn();
const mockOnRegenerate = vi.fn();

describe('SubGoalForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
    mockOnDraftSave.mockResolvedValue(undefined);
    mockOnRegenerate.mockResolvedValue(undefined);
  });

  describe('レンダリング', () => {
    it('基本的なフォーム要素が正しく表示される', () => {
      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('サブ目標タイトル')).toBeInTheDocument();
      expect(screen.getByLabelText('サブ目標説明')).toBeInTheDocument();
      expect(screen.getByLabelText('背景')).toBeInTheDocument();
      expect(screen.getByLabelText('制約事項')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'サブ目標を更新' })).toBeInTheDocument();
    });

    it('初期データが正しく表示される', () => {
      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" initialData={sampleFormData} onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue(sampleFormData.title)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.description)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.background)).toBeInTheDocument();
      expect(screen.getByDisplayValue(sampleFormData.constraints!)).toBeInTheDocument();
    });

    it('下書き保存ボタンが表示される', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onDraftSave={mockOnDraftSave}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /下書き保存/ })).toBeInTheDocument();
    });

    it('AI再生成ボタンが表示される', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onRegenerate={mockOnRegenerate}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /AI再生成/ })).toBeInTheDocument();
    });

    it('文字数カウンターが表示される', () => {
      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" initialData={sampleFormData} onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      // タイトルの文字数カウンター
      expect(screen.getByText(`${sampleFormData.title.length}/100`)).toBeInTheDocument();
    });
  });

  describe('フォーム入力', () => {
    it('タイトルを入力できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText('サブ目標タイトル');
      await user.type(titleInput, 'テストタイトル');

      expect(titleInput).toHaveValue('テストタイトル');
    });

    it('説明を入力できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const descriptionInput = screen.getByLabelText('サブ目標説明');
      await user.type(descriptionInput, 'テスト説明文です。10文字以上入力しています。');

      expect(descriptionInput).toHaveValue('テスト説明文です。10文字以上入力しています。');
    });

    it('背景を入力できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const backgroundInput = screen.getByLabelText('背景');
      await user.type(backgroundInput, 'テスト背景文です。10文字以上入力しています。');

      expect(backgroundInput).toHaveValue('テスト背景文です。10文字以上入力しています。');
    });

    it('制約事項を入力できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const constraintsInput = screen.getByLabelText('制約事項');
      await user.type(constraintsInput, 'テスト制約事項');

      expect(constraintsInput).toHaveValue('テスト制約事項');
    });
  });

  describe('バリデーション', () => {
    it('必須フィールドが空の場合はエラーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} showErrorSummary={true} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'サブ目標を更新' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('入力内容を確認してください')).toBeInTheDocument();
      });
    });

    it('文字数制限を超えた場合は警告が表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText('サブ目標タイトル');
      const longTitle = 'a'.repeat(101); // 100文字制限を超える

      await user.type(titleInput, longTitle);

      await waitFor(() => {
        expect(screen.getByText('101/100')).toBeInTheDocument();
      });
    });

    it('説明が短すぎる場合はエラーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            enableRealtimeValidation={true}
          />
        </TestWrapper>
      );

      const descriptionInput = screen.getByLabelText('サブ目標説明');
      await user.type(descriptionInput, '短い');
      await user.tab(); // フィールドからフォーカスを外す

      await waitFor(() => {
        expect(screen.getByText('説明は10文字以上で入力してください')).toBeInTheDocument();
      });
    });
  });

  describe('フォーム送信', () => {
    it('有効なデータで送信できる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" initialData={sampleFormData} onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'サブ目標を更新' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(sampleFormData);
      });
    });

    it('送信中は送信ボタンが無効になる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            initialData={sampleFormData}
            onSubmit={mockOnSubmit}
            isSubmitting={true}
          />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /更新中/ });
      expect(submitButton).toBeDisabled();
    });

    it('送信エラー時にエラーハンドリングが動作する', async () => {
      const user = userEvent.setup();
      const mockError = new Error('送信エラー');
      mockOnSubmit.mockRejectedValue(mockError);

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" initialData={sampleFormData} onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'サブ目標を更新' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('下書き保存', () => {
    it('下書き保存ボタンをクリックできる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            initialData={sampleFormData}
            onSubmit={mockOnSubmit}
            onDraftSave={mockOnDraftSave}
          />
        </TestWrapper>
      );

      // データを変更して未保存状態にする
      const titleInput = screen.getByLabelText('サブ目標タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '変更されたタイトル');

      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      await user.click(draftSaveButton);

      await waitFor(() => {
        expect(mockOnDraftSave).toHaveBeenCalled();
      });
    });

    it('下書き保存中はボタンが無効になる', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onDraftSave={mockOnDraftSave}
            isDraftSaving={true}
          />
        </TestWrapper>
      );

      const draftSaveButton = screen.getByRole('button', { name: /保存中/ });
      expect(draftSaveButton).toBeDisabled();
    });

    it('未保存の変更がない場合は下書き保存ボタンが無効になる', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            initialData={sampleFormData}
            onSubmit={mockOnSubmit}
            onDraftSave={mockOnDraftSave}
          />
        </TestWrapper>
      );

      const draftSaveButton = screen.getByRole('button', { name: /下書き保存/ });
      expect(draftSaveButton).toBeDisabled();
    });
  });

  describe('AI再生成', () => {
    it('AI再生成ボタンをクリックできる', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onRegenerate={mockOnRegenerate}
          />
        </TestWrapper>
      );

      const regenerateButton = screen.getByRole('button', { name: /AI再生成/ });
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(mockOnRegenerate).toHaveBeenCalled();
      });
    });

    it('AI再生成中はボタンが無効になる', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onRegenerate={mockOnRegenerate}
            isRegenerating={true}
          />
        </TestWrapper>
      );

      const regenerateButton = screen.getByRole('button', { name: /AI再生成中/ });
      expect(regenerateButton).toBeDisabled();
    });
  });

  describe('自動保存状態表示', () => {
    it('自動保存が有効な場合は状態が表示される', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onDraftSave={mockOnDraftSave}
            enableAutoSave={true}
          />
        </TestWrapper>
      );

      expect(screen.getByText('すべての変更が保存されました')).toBeInTheDocument();
    });

    it('自動保存が無効な場合は状態が表示されない', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onDraftSave={mockOnDraftSave}
            enableAutoSave={false}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('すべての変更が保存されました')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('フォームに適切なaria-labelが設定されている', () => {
      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const form = screen.getByRole('form', { name: 'サブ目標編集フォーム' });
      expect(form).toBeInTheDocument();
    });

    it('必須フィールドが適切にマークされている', () => {
      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      const titleInput = screen.getByLabelText('サブ目標タイトル');
      const descriptionInput = screen.getByLabelText('サブ目標説明');
      const backgroundInput = screen.getByLabelText('背景');

      expect(titleInput).toBeRequired();
      expect(descriptionInput).toBeRequired();
      expect(backgroundInput).toBeRequired();
    });

    it('エラーメッセージがaria-liveで通知される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SubGoalForm subGoalId="subgoal-1" onSubmit={mockOnSubmit} showErrorSummary={true} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'サブ目標を更新' });
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('無効化状態', () => {
    it('disabled=trueの場合は全ての入力が無効になる', () => {
      render(
        <TestWrapper>
          <SubGoalForm
            subGoalId="subgoal-1"
            onSubmit={mockOnSubmit}
            onDraftSave={mockOnDraftSave}
            onRegenerate={mockOnRegenerate}
            disabled={true}
          />
        </TestWrapper>
      );

      expect(screen.getByLabelText('サブ目標タイトル')).toBeDisabled();
      expect(screen.getByLabelText('サブ目標説明')).toBeDisabled();
      expect(screen.getByLabelText('背景')).toBeDisabled();
      expect(screen.getByLabelText('制約事項')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'サブ目標を更新' })).toBeDisabled();
      expect(screen.getByRole('button', { name: /下書き保存/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /AI再生成/ })).toBeDisabled();
    });
  });
});
