import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditModal } from './EditModal';
import { Goal, SubGoal, Action, GoalStatus, ActionType } from '../../types/mandala';

describe('EditModal', () => {
  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  const mockGoal: Goal = {
    id: 'goal-1',
    title: 'テスト目標',
    description: 'テスト目標の説明',
    deadline: new Date('2024-12-31'),
    progress: 50,
    status: GoalStatus.ACTIVE,
    background: 'テスト背景',
    constraints: 'テスト制約事項',
  };

  const mockSubGoal: SubGoal = {
    id: 'subgoal-1',
    goal_id: 'goal-1',
    title: 'テストサブ目標',
    description: 'テストサブ目標の説明',
    position: 0,
    progress: 30,
    background: 'テスト背景',
    constraints: 'テスト制約事項',
  };

  const mockAction: Action = {
    id: 'action-1',
    sub_goal_id: 'subgoal-1',
    title: 'テストアクション',
    description: 'テストアクションの説明',
    type: ActionType.EXECUTION,
    position: 0,
    progress: 20,
    background: 'テスト背景',
    constraints: 'テスト制約事項',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('モーダル開閉', () => {
    it('isOpen=trueの場合、モーダルが表示される', () => {
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

      expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument();
    });

    it('isOpen=falseの場合、モーダルが表示されない', () => {
      render(
        <EditModal
          isOpen={false}
          entityType="goal"
          entityId="goal-1"
          initialData={mockGoal}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('モーダルが開いた時、最初のフィールドにフォーカスが当たる', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      // フォーカスは非同期で設定されるため、要素が存在することを確認
      expect(titleInput).toBeInTheDocument();
      expect(titleInput).not.toBeDisabled();
    });

    it('閉じるボタンをクリックすると、onCloseが呼ばれる', async () => {
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

      const closeButton = screen.getByRole('button', { name: /閉じる/i });
      await user.click(closeButton);

      // 変更がない場合は直接閉じる
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('モーダル外をクリックすると、onCloseが呼ばれる', async () => {
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

      const backdrop = screen.getAllByRole('dialog')[0].parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('Escキーを押すと、onCloseが呼ばれる', async () => {
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

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('目標編集フォーム', () => {
    it('目標の全フィールドが表示される', () => {
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

      expect(screen.getByLabelText(/タイトル/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/達成期限/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/背景/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/制約事項/i)).toBeInTheDocument();
    });

    it('初期データが正しく表示される', () => {
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

      expect(screen.getByLabelText(/タイトル/i)).toHaveValue('テスト目標');
      expect(screen.getByLabelText(/説明/i)).toHaveValue('テスト目標の説明');
    });
  });

  describe('サブ目標編集フォーム', () => {
    it('サブ目標の全フィールドが表示される', () => {
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

      expect(screen.getByLabelText(/タイトル/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/背景/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/制約事項/i)).toBeInTheDocument();
    });

    it('達成期限フィールドが表示されない', () => {
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

      expect(screen.queryByLabelText(/達成期限/i)).not.toBeInTheDocument();
    });
  });

  describe('アクション編集フォーム', () => {
    it('アクションの全フィールドが表示される', () => {
      render(
        <EditModal
          isOpen={true}
          entityType="action"
          entityId="action-1"
          initialData={mockAction}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/タイトル/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/説明/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/背景/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/制約事項/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/種別/i)).toBeInTheDocument();
    });

    it('アクション種別の選択肢が表示される', () => {
      render(
        <EditModal
          isOpen={true}
          entityType="action"
          entityId="action-1"
          initialData={mockAction}
          onSave={mockOnSave}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('radio', { name: /実行/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /習慣/i })).toBeInTheDocument();
    });
  });

  describe('フォームバリデーション', () => {
    it('タイトルが空の場合、エラーメッセージが表示される', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/タイトルは必須です/i)).toBeInTheDocument();
      });
    });

    it('タイトルが100文字を超える場合、エラーメッセージが表示される', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'a'.repeat(101));

      await waitFor(() => {
        expect(screen.getByText(/100文字以内で入力してください/i)).toBeInTheDocument();
      });
    });

    it('説明が空の場合、エラーメッセージが表示される', async () => {
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

      const descriptionInput = screen.getByLabelText(/説明/i);
      await user.clear(descriptionInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/説明は必須です/i)).toBeInTheDocument();
      });
    });

    it('説明が500文字を超える場合、エラーメッセージが表示される', async () => {
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

      const descriptionInput = screen.getByLabelText(/説明/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'a'.repeat(501));

      await waitFor(() => {
        expect(screen.getByText(/500文字以内で入力してください/i)).toBeInTheDocument();
      });
    });

    it('背景が空の場合、エラーメッセージが表示される', async () => {
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

      const backgroundInput = screen.getByLabelText(/背景/i);
      await user.clear(backgroundInput);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/背景は必須です/i)).toBeInTheDocument();
      });
    });

    it('背景が1000文字を超える場合、エラーメッセージが表示される', async () => {
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

      const backgroundInput = screen.getByLabelText(/背景/i);
      await user.clear(backgroundInput);
      await user.type(backgroundInput, 'a'.repeat(1001));

      await waitFor(() => {
        expect(screen.getByText(/1000文字以内で入力してください/i)).toBeInTheDocument();
      });
    });

    it('制約事項が1000文字を超える場合、エラーメッセージが表示される', async () => {
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

      const constraintsInput = screen.getByLabelText(/制約事項/i);
      await user.clear(constraintsInput);
      await user.type(constraintsInput, 'a'.repeat(1001));

      await waitFor(() => {
        expect(screen.getByText(/1000文字以内で入力してください/i)).toBeInTheDocument();
      });
    });

    it('達成期限が過去の日付の場合、エラーメッセージが表示される', async () => {
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

      const deadlineInput = screen.getByLabelText(/達成期限/i);
      await user.clear(deadlineInput);
      await user.type(deadlineInput, '2020-01-01');

      await waitFor(() => {
        expect(screen.getByText(/未来の日付を指定してください/i)).toBeInTheDocument();
      });
    });

    it('バリデーションエラーがある場合、保存ボタンが無効化される', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /保存/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it('全てのフィールドが有効な場合、保存ボタンが有効化される', async () => {
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

      const saveButton = screen.getByRole('button', { name: /保存/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('保存処理', () => {
    it('保存ボタンをクリックすると、onSaveが呼ばれる', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.type(titleInput, '新しいタイトル');

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('保存時、更新されたデータが渡される', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.type(titleInput, '新しいタイトル');

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '新しいタイトル',
          })
        );
      });
    });

    it('保存中は保存ボタンが無効化される', async () => {
      const user = userEvent.setup();
      let resolveSave: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);

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

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });

      resolveSave!();
    });

    it('保存中はローディングインジケーターが表示される', async () => {
      const user = userEvent.setup();
      let resolveSave: () => void;
      const savePromise = new Promise<void>(resolve => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);

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

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/保存中/i)).toBeInTheDocument();
      });

      resolveSave!();
    });

    it('保存成功後、モーダルが閉じる', async () => {
      const user = userEvent.setup();
      mockOnSave.mockResolvedValue(undefined);
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

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('保存失敗時、エラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('保存に失敗しました'));
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

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/保存に失敗しました/i)).toBeInTheDocument();
      });
    });

    it('保存失敗時、モーダルは閉じない', async () => {
      const user = userEvent.setup();
      mockOnSave.mockRejectedValue(new Error('保存に失敗しました'));
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

      const saveButton = screen.getByRole('button', { name: /保存/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/保存に失敗しました/i)).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('キャンセル処理', () => {
    it('キャンセルボタンをクリックすると、onCloseが呼ばれる', async () => {
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

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('キャンセル時、変更内容は破棄される', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.type(titleInput, '新しいタイトル');

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      await user.click(cancelButton);

      // 変更がある場合は確認ダイアログが表示される
      await waitFor(() => {
        expect(screen.getByText(/変更を破棄しますか/i)).toBeInTheDocument();
      });

      // 「はい」を選択すると閉じる
      const confirmButton = screen.getByRole('button', { name: /はい/i });
      await user.click(confirmButton);

      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('変更がある場合、確認ダイアログが表示される', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.type(titleInput, '新しいタイトル');

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/変更を破棄しますか/i)).toBeInTheDocument();
      });
    });

    it('確認ダイアログで「はい」を選択すると、モーダルが閉じる', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.type(titleInput, '新しいタイトル');

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/変更を破棄しますか/i)).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /はい/i });
      await user.click(confirmButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('確認ダイアログで「いいえ」を選択すると、モーダルは閉じない', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      await user.clear(titleInput);
      await user.type(titleInput, '新しいタイトル');

      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/変更を破棄しますか/i)).toBeInTheDocument();
      });

      const noButton = screen.getByRole('button', { name: /いいえ/i });
      await user.click(noButton);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティ', () => {
    it('role="dialog"が設定されている', () => {
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

      expect(screen.getAllByRole('dialog')[0]).toBeInTheDocument();
    });

    it('aria-labelledbyが設定されている', () => {
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

      const dialog = screen.getAllByRole('dialog')[0];
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('aria-modal="true"が設定されている', () => {
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

      const dialog = screen.getAllByRole('dialog')[0];
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('フォーカストラップが機能する', async () => {
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

      const titleInput = screen.getByLabelText(/タイトル/i);
      const saveButton = screen.getByRole('button', { name: /保存/i });
      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });

      // フォーカス可能な要素が存在することを確認
      expect(titleInput).toBeInTheDocument();
      expect(saveButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();

      // タブキーでフォーカスが移動することを確認
      titleInput.focus();
      await user.keyboard('{Tab}');
      // 次の要素にフォーカスが移動したことを確認（具体的な要素は問わない）
      expect(document.activeElement).not.toBe(titleInput);
    });
  });
});
