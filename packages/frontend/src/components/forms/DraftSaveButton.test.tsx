import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { DraftSaveButton } from './DraftSaveButton';
import { DraftService } from '../../services/draftService';
import { PartialGoalFormData } from '../../schemas/goal-form';

// DraftServiceのモック
vi.mock('../../services/draftService');
const mockDraftService = DraftService as Mock<typeof DraftService>;

describe('DraftSaveButton', () => {
  const mockFormData: PartialGoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2024-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  const emptyFormData: PartialGoalFormData = {
    title: '',
    description: '',
    deadline: '',
    background: '',
    constraints: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDraftService.saveDraft.mockResolvedValue();
  });

  describe('基本表示', () => {
    it('デフォルトのボタンテキストが表示される', () => {
      render(<DraftSaveButton formData={mockFormData} />);

      expect(
        screen.getByRole('button', { name: /フォームの内容を下書きとして保存/ })
      ).toBeInTheDocument();
      expect(screen.getByText('下書き保存')).toBeInTheDocument();
    });

    it('カスタムテキストが表示される', () => {
      render(<DraftSaveButton formData={mockFormData}>カスタム保存</DraftSaveButton>);

      expect(screen.getByText('カスタム保存')).toBeInTheDocument();
    });

    it('保存中の表示が正しく表示される', () => {
      render(<DraftSaveButton formData={mockFormData} isSaving={true} />);

      expect(screen.getByText('保存中...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('ボタンの状態', () => {
    it('空のフォームデータの場合はボタンが無効になる', () => {
      render(<DraftSaveButton formData={emptyFormData} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disabledプロパティでボタンが無効になる', () => {
      render(<DraftSaveButton formData={mockFormData} disabled={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('保存中はボタンが無効になる', () => {
      render(<DraftSaveButton formData={mockFormData} isSaving={true} />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('保存機能', () => {
    it('ボタンクリックで保存が実行される', async () => {
      const onSaveSuccess = vi.fn();

      render(<DraftSaveButton formData={mockFormData} onSaveSuccess={onSaveSuccess} />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockDraftService.saveDraft).toHaveBeenCalledWith(mockFormData);
        expect(onSaveSuccess).toHaveBeenCalledWith(mockFormData);
      });
    });

    it('保存成功時にメッセージが表示される', async () => {
      render(<DraftSaveButton formData={mockFormData} />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText(/に保存しました/)).toBeInTheDocument();
      });
    });

    it('保存エラー時にエラーメッセージが表示される', async () => {
      const saveError = new Error('保存エラー');
      mockDraftService.saveDraft.mockRejectedValue(saveError);

      const onSaveError = vi.fn();

      render(<DraftSaveButton formData={mockFormData} onSaveError={onSaveError} />);

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('保存エラー')).toBeInTheDocument();
        expect(onSaveError).toHaveBeenCalledWith(saveError);
      });
    });

    it('空のデータで保存を試行するとエラーメッセージが表示される', async () => {
      const onSaveError = vi.fn();

      render(
        <DraftSaveButton formData={emptyFormData} onSaveError={onSaveError} disabled={false} />
      );

      // 強制的にボタンを有効にしてクリック
      const button = screen.getByRole('button');
      button.removeAttribute('disabled');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSaveError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: '保存するデータがありません',
          })
        );
      });
    });
  });

  describe('コールバック', () => {
    it('保存の各段階でコールバックが呼ばれる', async () => {
      const onSaveStart = vi.fn();
      const onSaveSuccess = vi.fn();
      const onSaveComplete = vi.fn();

      render(
        <DraftSaveButton
          formData={mockFormData}
          onSaveStart={onSaveStart}
          onSaveSuccess={onSaveSuccess}
          onSaveComplete={onSaveComplete}
        />
      );

      fireEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onSaveStart).toHaveBeenCalled();
        expect(onSaveSuccess).toHaveBeenCalledWith(mockFormData);
        expect(onSaveComplete).toHaveBeenCalled();
      });
    });
  });

  describe('スタイル', () => {
    it('サイズプロパティが正しく適用される', () => {
      const { rerender } = render(<DraftSaveButton formData={mockFormData} size="sm" />);
      expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

      rerender(<DraftSaveButton formData={mockFormData} size="lg" />);
      expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
    });

    it('バリアントプロパティが正しく適用される', () => {
      const { rerender } = render(<DraftSaveButton formData={mockFormData} variant="primary" />);
      expect(screen.getByRole('button')).toHaveClass('bg-blue-600', 'text-white');

      rerender(<DraftSaveButton formData={mockFormData} variant="outline" />);
      expect(screen.getByRole('button')).toHaveClass('border', 'border-gray-300', 'text-gray-700');
    });

    it('カスタムクラス名が適用される', () => {
      render(<DraftSaveButton formData={mockFormData} className="custom-class" />);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('重複保存の防止', () => {
    it('保存中は新しい保存をスキップする', async () => {
      let resolvePromise: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockDraftService.saveDraft.mockReturnValue(savePromise);

      render(<DraftSaveButton formData={mockFormData} />);

      const button = screen.getByRole('button');

      // 最初のクリック
      fireEvent.click(button);

      // ボタンが無効になることを確認
      expect(button).toBeDisabled();

      // 2回目のクリック（無効なので実行されない）
      fireEvent.click(button);

      // 最初の保存のみが呼ばれる
      expect(mockDraftService.saveDraft).toHaveBeenCalledTimes(1);

      // 最初の保存を完了
      resolvePromise!();

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
