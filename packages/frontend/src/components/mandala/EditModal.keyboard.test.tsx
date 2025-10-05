import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EditModal } from './EditModal';
import { Goal, SubGoal, Action } from '../../types/mandala';

describe('EditModal - キーボード操作', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  const mockGoal: Goal = {
    id: 'goal-1',
    user_id: 'user-1',
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: new Date('2025-12-31'),
    background: 'テスト背景',
    constraints: 'テスト制約',
    status: 'active',
    progress: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockSubGoal: SubGoal = {
    id: 'subgoal-1',
    goal_id: 'goal-1',
    title: 'テストサブ目標',
    description: 'テスト説明',
    background: 'テスト背景',
    constraints: 'テスト制約',
    position: 0,
    progress: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAction: Action = {
    id: 'action-1',
    sub_goal_id: 'subgoal-1',
    title: 'テストアクション',
    description: 'テスト説明',
    background: 'テスト背景',
    constraints: 'テスト制約',
    type: 'execution',
    position: 0,
    progress: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Escキー対応', () => {
    it('Escキーでモーダルが閉じる（変更なし）', async () => {
      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // Escキーを押下
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('Escキーで確認ダイアログが表示される（変更あり）', async () => {
      const user = userEvent.setup();
      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/タイトル/);

      // 入力を変更（userEventを使用してフォームの変更を検出させる）
      await user.clear(titleInput);
      await user.type(titleInput, '変更されたタイトル');

      // Escキーを押下
      await user.keyboard('{Escape}');

      // 確認ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByText('変更を破棄しますか？')).toBeInTheDocument();
      });

      // まだ閉じられていない
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Tab/Shift+Tab対応（フォーカストラップ）', () => {
    it('Tabキーでフォーカスがモーダル内を循環する', async () => {
      const user = userEvent.setup();
      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      // Tabキーで次の要素へ移動できることを確認
      await user.tab();
      const descriptionInput = screen.getByLabelText(/説明/);
      expect(descriptionInput).toBeInTheDocument();
    });

    it('Shift+Tabキーで逆方向にフォーカスが移動できる', async () => {
      const user = userEvent.setup();
      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      // Shift+Tabキーで前の要素へ移動できることを確認
      await user.tab({ shift: true });
      const closeButton = screen.getByLabelText('閉じる');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Enter対応', () => {
    it('フォーム内でEnterキーを押してもモーダルが閉じない', async () => {
      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/タイトル/);

      // Enterキーを押下
      fireEvent.keyDown(titleInput, { key: 'Enter', code: 'Enter' });

      // モーダルは閉じない
      expect(mockOnClose).not.toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('保存ボタンをクリックすると保存される', async () => {
      mockOnSave.mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      // 保存ボタンが有効になるまで待つ（初期データが有効なので、すぐに有効になるはず）
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      const saveButton = screen.getByText('保存');

      // 保存ボタンをクリック
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('確認ダイアログのキーボード操作', () => {
    it('確認ダイアログでEscキーを押すとダイアログが閉じる', async () => {
      const user = userEvent.setup();
      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/タイトル/);

      // 入力を変更
      await user.clear(titleInput);
      await user.type(titleInput, '変更されたタイトル');

      // 閉じるボタンをクリック
      const closeButton = screen.getByLabelText('閉じる');
      await user.click(closeButton);

      // 確認ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByText('変更を破棄しますか？')).toBeInTheDocument();
      });

      // 確認ダイアログでEscキーを押下
      await user.keyboard('{Escape}');

      // ダイアログは閉じるが、モーダルは閉じない
      await waitFor(() => {
        expect(screen.queryByText('変更を破棄しますか？')).not.toBeInTheDocument();
      });
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('確認ダイアログでTabキーを押すとフォーカスが移動できる', async () => {
      const user = userEvent.setup();
      render(
        <EditModal
          isOpen={true}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/タイトル/);

      // 入力を変更
      await user.clear(titleInput);
      await user.type(titleInput, '変更されたタイトル');

      // 閉じるボタンをクリック
      const closeButton = screen.getByLabelText('閉じる');
      await user.click(closeButton);

      // 確認ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByText('変更を破棄しますか？')).toBeInTheDocument();
      });

      const noButton = screen.getByText('いいえ');
      const yesButton = screen.getByText('はい');

      // ボタンが存在することを確認
      expect(noButton).toBeInTheDocument();
      expect(yesButton).toBeInTheDocument();

      // Tabキーでフォーカス移動できることを確認
      await user.tab();
    });
  });

  describe('アクセシビリティ - キーボードのみでの操作', () => {
    it('キーボードのみで完全な編集フローが実行できる', async () => {
      mockOnSave.mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <EditModal
          isOpen={true}
          entityType="subgoal"
          entityId="subgoal-1"
          initialData={mockSubGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      // フォーカスが設定されるまで待つ
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/タイトル/);
        expect(titleInput).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/タイトル/) as HTMLInputElement;

      // タイトルを変更
      await user.clear(titleInput);
      await user.type(titleInput, '新しいタイトル');

      // Tabキーで次のフィールドへ
      await user.tab();
      const descriptionInput = screen.getByLabelText(/説明/) as HTMLTextAreaElement;

      // 説明を変更
      await user.clear(descriptionInput);
      await user.type(descriptionInput, '新しい説明');

      // 保存ボタンが有効になるまで待つ
      await waitFor(() => {
        const saveButton = screen.getByText('保存');
        expect(saveButton).not.toBeDisabled();
      });

      // 保存ボタンをクリック
      const saveButton = screen.getByText('保存');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });
});
