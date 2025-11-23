import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { FormActions, MemoizedFormActions } from './FormActions';
import { PartialGoalFormData } from '../../schemas/goal-form';
import { useFormActions } from '../../hooks/useFormActions';

// useFormActionsフックのモック
vi.mock('../../hooks/useFormActions');
const mockUseFormActions = useFormActions as any;

// DraftServiceのモック
vi.mock('../../services/draftService', () => ({
  DraftService: {
    saveDraft: vi.fn(),
  },
  draftUtils: {
    isWorthSaving: vi.fn(() => true),
    getTimeSinceSave: vi.fn(() => '1分前'),
  },
}));

describe('FormActions', () => {
  const validFormData: PartialGoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2024-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  const mockFormActionsReturn = {
    state: {
      isDraftSaving: false,
      isSubmitting: false,
      lastDraftSaveTime: null,
      draftSaveError: null,
      submitError: null,
    },
    saveDraft: vi.fn(),
    submitForm: vi.fn(),
    clearErrors: vi.fn(),
    canSaveDraft: true,
    canSubmit: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFormActions.mockReturnValue(mockFormActionsReturn);
  });

  describe('基本表示', () => {
    it('デフォルトで両方のボタンが表示される', () => {
      render(<FormActions formData={validFormData} isFormValid={true} />);

      expect(screen.getByText('下書き保存')).toBeInTheDocument();
      expect(screen.getByText('AI生成開始')).toBeInTheDocument();
    });

    it('下書き保存ボタンを非表示にできる', () => {
      render(<FormActions formData={validFormData} isFormValid={true} showDraftSave={false} />);

      expect(screen.queryByText('下書き保存')).not.toBeInTheDocument();
      expect(screen.getByText('AI生成開始')).toBeInTheDocument();
    });

    it('カスタムボタンテキストが表示される', () => {
      render(
        <FormActions
          formData={validFormData}
          isFormValid={true}
          submitButtonText="カスタム送信"
          draftSaveButtonText="カスタム保存"
        />
      );

      expect(screen.getByText('カスタム保存')).toBeInTheDocument();
      expect(screen.getByText('カスタム送信')).toBeInTheDocument();
    });
  });

  describe('レイアウト', () => {
    it('水平レイアウトが正しく適用される', () => {
      render(<FormActions formData={validFormData} isFormValid={true} layout="horizontal" />);

      const container = screen.getByText('下書き保存').parentElement?.parentElement;
      expect(container).toHaveClass('flex-row', 'space-x-3', 'items-center');
    });

    it('垂直レイアウトが正しく適用される', () => {
      render(<FormActions formData={validFormData} isFormValid={true} layout="vertical" />);

      const container = screen.getByText('下書き保存').parentElement?.parentElement;
      expect(container).toHaveClass('flex-col', 'space-y-3');
    });
  });

  describe('ボタンサイズ', () => {
    it('ボタンサイズが正しく適用される', () => {
      render(<FormActions formData={validFormData} isFormValid={true} buttonSize="lg" />);

      const draftButton = screen.getByText('下書き保存').closest('button');
      const submitButton = screen.getByText('AI生成開始').closest('button');

      expect(draftButton).toHaveClass('px-6', 'py-3', 'text-base');
      expect(submitButton).toHaveClass('px-6', 'py-3', 'text-base');
    });
  });

  describe('状態管理', () => {
    it('下書き保存中の状態が正しく反映される', () => {
      mockUseFormActions.mockReturnValue({
        ...mockFormActionsReturn,
        state: {
          ...mockFormActionsReturn.state,
          isDraftSaving: true,
        },
        canSaveDraft: false,
        canSubmit: false,
      });

      render(<FormActions formData={validFormData} isFormValid={true} />);

      expect(screen.getByText('保存中...')).toBeInTheDocument();

      const draftButton = screen.getByText('保存中...').closest('button');
      const submitButton = screen.getByText('AI生成開始').closest('button');

      expect(draftButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });

    it('送信中の状態が正しく反映される', () => {
      mockUseFormActions.mockReturnValue({
        ...mockFormActionsReturn,
        state: {
          ...mockFormActionsReturn.state,
          isSubmitting: true,
        },
        canSaveDraft: false,
        canSubmit: false,
      });

      render(<FormActions formData={validFormData} isFormValid={true} />);

      expect(screen.getByText('AI生成中...')).toBeInTheDocument();

      const draftButton = screen.getByText('下書き保存').closest('button');
      const submitButton = screen.getByText('AI生成中...').closest('button');

      expect(draftButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('イベントハンドリング', () => {
    it('下書き保存ボタンクリックで保存処理が実行される', async () => {
      const mockSaveDraft = vi.fn();
      mockUseFormActions.mockReturnValue({
        ...mockFormActionsReturn,
        saveDraft: mockSaveDraft,
      });

      render(<FormActions formData={validFormData} isFormValid={true} />);

      fireEvent.click(screen.getByText('下書き保存'));

      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    });

    it('送信ボタンクリックで送信処理が実行される', async () => {
      const mockSubmitForm = vi.fn();
      mockUseFormActions.mockReturnValue({
        ...mockFormActionsReturn,
        submitForm: mockSubmitForm,
      });

      render(<FormActions formData={validFormData} isFormValid={true} />);

      fireEvent.click(screen.getByText('AI生成開始'));

      expect(mockSubmitForm).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラー表示', () => {
    it('下書き保存エラーが表示される', () => {
      const saveError = new Error('保存に失敗しました');
      mockUseFormActions.mockReturnValue({
        ...mockFormActionsReturn,
        state: {
          ...mockFormActionsReturn.state,
          draftSaveError: saveError,
        },
      });

      render(<FormActions formData={validFormData} isFormValid={true} />);

      expect(screen.getByText('下書き保存エラー: 保存に失敗しました')).toBeInTheDocument();
      expect(screen.getByText('エラーを閉じる')).toBeInTheDocument();
    });

    it('送信エラーが表示される', () => {
      const submitError = new Error('送信に失敗しました');
      mockUseFormActions.mockReturnValue({
        ...mockFormActionsReturn,
        state: {
          ...mockFormActionsReturn.state,
          submitError: submitError,
        },
      });

      render(<FormActions formData={validFormData} isFormValid={true} />);

      expect(screen.getByText('送信エラー: 送信に失敗しました')).toBeInTheDocument();
      expect(screen.getByText('エラーを閉じる')).toBeInTheDocument();
    });

    it('エラーを閉じるボタンでエラーがクリアされる', () => {
      const mockClearErrors = vi.fn();
      const saveError = new Error('保存に失敗しました');

      mockUseFormActions.mockReturnValue({
        ...mockFormActionsReturn,
        state: {
          ...mockFormActionsReturn.state,
          draftSaveError: saveError,
        },
        clearErrors: mockClearErrors,
      });

      render(<FormActions formData={validFormData} isFormValid={true} />);

      fireEvent.click(screen.getByText('エラーを閉じる'));

      expect(mockClearErrors).toHaveBeenCalledTimes(1);
    });
  });

  describe('コールバック', () => {
    it('useFormActionsに正しいオプションが渡される', () => {
      const onDraftSaveSuccess = vi.fn();
      const onDraftSaveError = vi.fn();
      const onSubmitSuccess = vi.fn();
      const onSubmitError = vi.fn();

      render(
        <FormActions
          formData={validFormData}
          isFormValid={true}
          onDraftSaveSuccess={onDraftSaveSuccess}
          onDraftSaveError={onDraftSaveError}
          onSubmitSuccess={onSubmitSuccess}
          onSubmitError={onSubmitError}
        />
      );

      expect(mockUseFormActions).toHaveBeenCalledWith({
        formData: validFormData,
        isFormValid: true,
        onDraftSaveSuccess,
        onDraftSaveError,
        onSubmitSuccess,
        onSubmitError,
      });
    });
  });

  describe('カスタムクラス', () => {
    it('カスタムクラス名が適用される', () => {
      render(
        <FormActions formData={validFormData} isFormValid={true} className="custom-form-actions" />
      );

      const container = screen.getByText('下書き保存').parentElement?.parentElement;
      expect(container).toHaveClass('custom-form-actions');
    });
  });

  describe('メモ化', () => {
    it('MemoizedFormActionsが正しく動作する', () => {
      render(<MemoizedFormActions formData={validFormData} isFormValid={true} />);

      expect(screen.getByText('下書き保存')).toBeInTheDocument();
      expect(screen.getByText('AI生成開始')).toBeInTheDocument();
    });
  });
});
