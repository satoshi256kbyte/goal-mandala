import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { BulkEditModal, BulkEditableItem, BulkEditChanges } from './BulkEditModal';

// テスト用のモックデータ
const mockSubGoals: BulkEditableItem[] = [
  {
    id: 'subgoal-1',
    title: 'サブ目標1',
    description: 'サブ目標1の説明',
    background: 'サブ目標1の背景',
    constraints: 'サブ目標1の制約',
    position: 0,
  },
  {
    id: 'subgoal-2',
    title: 'サブ目標2',
    description: 'サブ目標2の説明',
    background: 'サブ目標2の背景',
    constraints: 'サブ目標2の制約',
    position: 1,
  },
  {
    id: 'subgoal-3',
    title: 'サブ目標3',
    description: 'サブ目標3の説明',
    background: 'サブ目標3の背景',
    position: 2,
  },
];

const mockActions: BulkEditableItem[] = [
  {
    id: 'action-1',
    title: 'アクション1',
    description: 'アクション1の説明',
    background: 'アクション1の背景',
    type: 'execution' as const,
    position: 0,
  },
  {
    id: 'action-2',
    title: 'アクション2',
    description: 'アクション2の説明',
    background: 'アクション2の背景',
    type: 'habit' as const,
    position: 1,
  },
];

describe('BulkEditModal', () => {
  const defaultProps = {
    isOpen: true,
    selectedItems: mockSubGoals,
    onClose: vi.fn(),
    onSave: vi.fn(),
    itemType: 'subgoal' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('モーダルが正しく表示される', () => {
      render(<BulkEditModal {...defaultProps} />);

      expect(screen.getByText('サブ目標の一括編集')).toBeInTheDocument();
      expect(screen.getByText('3個の項目が選択されています')).toBeInTheDocument();
    });

    it('アクションタイプの場合、正しいタイトルが表示される', () => {
      render(<BulkEditModal {...defaultProps} selectedItems={mockActions} itemType="action" />);

      expect(screen.getByText('アクションの一括編集')).toBeInTheDocument();
    });

    it('モーダルが閉じている場合、何も表示されない', () => {
      const { container } = render(<BulkEditModal {...defaultProps} isOpen={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('エラーメッセージが表示される', () => {
      render(<BulkEditModal {...defaultProps} error="テストエラーメッセージ" />);

      expect(screen.getByText('テストエラーメッセージ')).toBeInTheDocument();
    });
  });

  describe('編集モード切り替え', () => {
    it('初期状態では共通フィールド編集モードが選択されている', () => {
      render(<BulkEditModal {...defaultProps} />);

      const commonButton = screen.getByText('共通フィールド編集');
      const individualButton = screen.getByText('個別項目編集');

      expect(commonButton).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(individualButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('個別項目編集モードに切り替えできる', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const individualButton = screen.getByText('個別項目編集');
      await user.click(individualButton);

      expect(individualButton).toHaveClass('bg-blue-100', 'text-blue-700');
      expect(screen.getByText('共通フィールド編集')).toHaveClass('bg-gray-100', 'text-gray-700');
    });
  });

  describe('共通フィールド編集', () => {
    it('共通フィールドの入力フォームが表示される', () => {
      render(<BulkEditModal {...defaultProps} />);

      expect(
        screen.getByText('共通フィールドで入力した値は、選択された全ての項目に適用されます。')
      ).toBeInTheDocument();
      expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
      expect(screen.getByLabelText('説明')).toBeInTheDocument();
      expect(screen.getByLabelText('背景・理由')).toBeInTheDocument();
      expect(screen.getByLabelText('制約事項')).toBeInTheDocument();
    });

    it('アクションタイプの場合、アクション種別フィールドが表示される', () => {
      render(<BulkEditModal {...defaultProps} selectedItems={mockActions} itemType="action" />);

      expect(screen.getByText('アクション種別')).toBeInTheDocument();
    });
  });

  describe('個別項目編集', () => {
    it('個別項目の編集フォームが表示される', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const individualButton = screen.getByText('個別項目編集');
      await user.click(individualButton);

      expect(
        screen.getByText('各項目を個別に編集できます。変更したいフィールドのみ入力してください。')
      ).toBeInTheDocument();
      expect(screen.getByText('サブ目標1')).toBeInTheDocument();
      expect(screen.getByText('サブ目標2')).toBeInTheDocument();
      expect(screen.getByText('サブ目標3')).toBeInTheDocument();
    });
  });

  describe('一括削除機能', () => {
    it('一括削除ボタンをクリックすると確認状態になる', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const deleteButton = screen.getByText('一括削除');
      await user.click(deleteButton);

      expect(screen.getByText('削除を確定')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    it('削除確定ボタンをクリックすると削除処理が実行される', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<BulkEditModal {...defaultProps} onSave={mockOnSave} />);

      const deleteButton = screen.getByText('一括削除');
      await user.click(deleteButton);

      const confirmButton = screen.getByText('削除を確定');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          commonFields: {},
          individualChanges: {},
          deleteItems: ['subgoal-1', 'subgoal-2', 'subgoal-3'],
        });
      });
    });

    it('削除キャンセルボタンをクリックすると確認状態が解除される', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      const deleteButton = screen.getByText('一括削除');
      await user.click(deleteButton);

      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);

      expect(screen.getByText('一括削除')).toBeInTheDocument();
      expect(screen.queryByText('削除を確定')).not.toBeInTheDocument();
    });
  });

  describe('フォーム送信', () => {
    it('共通フィールドの変更が正しく送信される', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<BulkEditModal {...defaultProps} onSave={mockOnSave} />);

      // タイトルフィールドに入力
      const titleInput = screen.getByLabelText('タイトル');
      await user.type(titleInput, '新しいタイトル');

      // 保存ボタンをクリック
      const saveButton = screen.getByText('変更を保存');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          commonFields: {
            title: '新しいタイトル',
          },
          individualChanges: {},
          deleteItems: [],
        });
      });
    });

    it('個別項目の変更が正しく送信される', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      render(<BulkEditModal {...defaultProps} onSave={mockOnSave} />);

      // 個別項目編集モードに切り替え
      const individualButton = screen.getByText('個別項目編集');
      await user.click(individualButton);

      // 最初の項目のタイトルを変更
      const titleInputs = screen.getAllByLabelText('タイトル');
      await user.type(titleInputs[0], '変更されたタイトル');

      // 保存ボタンをクリック
      const saveButton = screen.getByText('変更を保存');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          commonFields: {},
          individualChanges: {
            'subgoal-1': {
              title: '変更されたタイトル',
            },
          },
          deleteItems: [],
        });
      });
    });

    it('変更がない場合、保存ボタンが無効になる', () => {
      render(<BulkEditModal {...defaultProps} />);

      const saveButton = screen.getByText('変更を保存');
      expect(saveButton).toBeDisabled();
    });

    it('ローディング中は保存ボタンが無効になる', () => {
      render(<BulkEditModal {...defaultProps} isLoading={true} />);

      const saveButton = screen.getByText('変更を保存');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('モーダル操作', () => {
    it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      render(<BulkEditModal {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('モーダルを閉じる');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('キャンセルボタンをクリックするとonCloseが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();
      render(<BulkEditModal {...defaultProps} onClose={mockOnClose} />);

      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('変更プレビュー', () => {
    it('共通フィールドの変更時にプレビューが表示される', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      // タイトルフィールドに入力
      const titleInput = screen.getByLabelText('タイトル');
      await user.type(titleInput, '新しいタイトル');

      await waitFor(() => {
        expect(screen.getByText('変更プレビュー')).toBeInTheDocument();
        expect(screen.getByText('共通フィールドの変更')).toBeInTheDocument();
        expect(screen.getByText('以下の変更が3個の項目に適用されます:')).toBeInTheDocument();
      });
    });

    it('個別項目の変更時にプレビューが表示される', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      // 個別項目編集モードに切り替え
      const individualButton = screen.getByText('個別項目編集');
      await user.click(individualButton);

      // 最初の項目のタイトルを変更
      const titleInputs = screen.getAllByLabelText('タイトル');
      await user.type(titleInputs[0], '変更されたタイトル');

      await waitFor(() => {
        expect(screen.getByText('変更プレビュー')).toBeInTheDocument();
        expect(screen.getByText('個別項目の変更')).toBeInTheDocument();
        expect(screen.getByText('1個の項目に個別の変更があります')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      render(<BulkEditModal {...defaultProps} />);

      expect(screen.getByLabelText('モーダルを閉じる')).toBeInTheDocument();
      expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
      expect(screen.getByLabelText('説明')).toBeInTheDocument();
    });

    it('フォーカス管理が適切に行われる', async () => {
      const user = userEvent.setup();
      render(<BulkEditModal {...defaultProps} />);

      // タブキーでフォーカス移動をテスト
      await user.tab();
      expect(screen.getByLabelText('モーダルを閉じる')).toHaveFocus();
    });
  });

  describe('エラーハンドリング', () => {
    it('保存エラー時にエラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      const mockOnSave = vi.fn().mockRejectedValue(new Error('保存エラー'));
      render(<BulkEditModal {...defaultProps} onSave={mockOnSave} error="保存に失敗しました" />);

      expect(screen.getByText('保存に失敗しました')).toBeInTheDocument();
    });
  });
});
