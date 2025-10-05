import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConflictDialog } from './ConflictDialog';
import { Goal, SubGoal, Action, GoalStatus, ActionType } from '../../types/mandala';

describe('ConflictDialog', () => {
  const mockOnReload = vi.fn();
  const mockOnDiscard = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('競合検出表示テスト', () => {
    it('ダイアログが閉じている時は表示されない', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
        background: '現在の背景',
        constraints: '現在の制約',
      };

      render(
        <ConflictDialog
          isOpen={false}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('ダイアログが開いている時は表示される', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
        background: '現在の背景',
        constraints: '現在の制約',
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('競合メッセージが表示される', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/データが他のユーザーによって更新されています/i)).toBeInTheDocument();
    });

    it('ダイアログタイトルが表示される', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText(/編集競合が発生しました/i)).toBeInTheDocument();
    });
  });

  describe('差分表示テスト', () => {
    it('目標の差分が表示される', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
        background: '現在の背景',
      };

      const latestGoal: Goal = {
        id: 'goal-1',
        title: '最新のタイトル',
        description: '最新の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
        background: '最新の背景',
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={latestGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      // 現在の値が表示される
      expect(screen.getByText('現在のタイトル')).toBeInTheDocument();
      expect(screen.getByText('現在の説明')).toBeInTheDocument();
      expect(screen.getByText('現在の背景')).toBeInTheDocument();

      // 最新の値が表示される
      expect(screen.getByText('最新のタイトル')).toBeInTheDocument();
      expect(screen.getByText('最新の説明')).toBeInTheDocument();
      expect(screen.getByText('最新の背景')).toBeInTheDocument();
    });

    it('サブ目標の差分が表示される', () => {
      const currentSubGoal: SubGoal = {
        id: 'subgoal-1',
        goal_id: 'goal-1',
        title: '現在のサブ目標',
        description: '現在の説明',
        position: 0,
        progress: 30,
        background: '現在の背景',
      };

      const latestSubGoal: SubGoal = {
        id: 'subgoal-1',
        goal_id: 'goal-1',
        title: '最新のサブ目標',
        description: '最新の説明',
        position: 0,
        progress: 30,
        background: '最新の背景',
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentSubGoal}
          latestData={latestSubGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText('現在のサブ目標')).toBeInTheDocument();
      expect(screen.getByText('最新のサブ目標')).toBeInTheDocument();
    });

    it('アクションの差分が表示される', () => {
      const currentAction: Action = {
        id: 'action-1',
        sub_goal_id: 'subgoal-1',
        title: '現在のアクション',
        description: '現在の説明',
        type: ActionType.EXECUTION,
        position: 0,
        progress: 20,
        background: '現在の背景',
      };

      const latestAction: Action = {
        id: 'action-1',
        sub_goal_id: 'subgoal-1',
        title: '最新のアクション',
        description: '最新の説明',
        type: ActionType.HABIT,
        position: 0,
        progress: 20,
        background: '最新の背景',
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentAction}
          latestData={latestAction}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.getByText('現在のアクション')).toBeInTheDocument();
      expect(screen.getByText('最新のアクション')).toBeInTheDocument();
    });

    it('変更されたフィールドのみがハイライトされる', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '同じタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      const latestGoal: Goal = {
        id: 'goal-1',
        title: '同じタイトル',
        description: '最新の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      const { container } = render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={latestGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      // 変更されたフィールドにハイライトクラスが適用されているか確認
      const highlightedElements = container.querySelectorAll('.conflict-highlight');
      expect(highlightedElements.length).toBeGreaterThan(0);
    });

    it('変更がない場合は差分表示がない', () => {
      const goal: Goal = {
        id: 'goal-1',
        title: '同じタイトル',
        description: '同じ説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={goal}
          latestData={goal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      expect(screen.queryByText(/変更なし/i)).toBeInTheDocument();
    });
  });

  describe('ユーザー選択処理テスト', () => {
    it('最新データ取得ボタンをクリックするとonReloadが呼ばれる', async () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      const latestGoal: Goal = {
        id: 'goal-1',
        title: '最新のタイトル',
        description: '最新の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={latestGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      const reloadButton = screen.getByRole('button', {
        name: /最新データを取得/i,
      });
      fireEvent.click(reloadButton);

      await waitFor(() => {
        expect(mockOnReload).toHaveBeenCalledTimes(1);
      });
    });

    it('変更破棄ボタンをクリックするとonDiscardが呼ばれる', async () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      const latestGoal: Goal = {
        id: 'goal-1',
        title: '最新のタイトル',
        description: '最新の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={latestGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      const discardButton = screen.getByRole('button', {
        name: /変更を破棄/i,
      });
      fireEvent.click(discardButton);

      await waitFor(() => {
        expect(mockOnDiscard).toHaveBeenCalledTimes(1);
      });
    });

    it('Escキーを押すとonDiscardが呼ばれる', async () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(mockOnDiscard).toHaveBeenCalledTimes(1);
      });
    });

    it('ボタンが適切なラベルとアクセシビリティ属性を持つ', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      const reloadButton = screen.getByRole('button', {
        name: /最新データを取得/i,
      });
      const discardButton = screen.getByRole('button', {
        name: /変更を破棄/i,
      });

      expect(reloadButton).toHaveAttribute('type', 'button');
      expect(discardButton).toHaveAttribute('type', 'button');
    });

    it('ダイアログ外をクリックしても閉じない', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      const { container } = render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      const backdrop = container.querySelector('.dialog-backdrop');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // onDiscardが呼ばれないことを確認
      expect(mockOnDiscard).not.toHaveBeenCalled();
    });
  });

  describe('アクセシビリティテスト', () => {
    it('ダイアログに適切なARIA属性が設定されている', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('フォーカストラップが機能する', () => {
      const currentGoal: Goal = {
        id: 'goal-1',
        title: '現在のタイトル',
        description: '現在の説明',
        deadline: new Date('2024-12-31'),
        progress: 50,
        status: GoalStatus.ACTIVE,
      };

      render(
        <ConflictDialog
          isOpen={true}
          currentData={currentGoal}
          latestData={currentGoal}
          onReload={mockOnReload}
          onDiscard={mockOnDiscard}
        />
      );

      const reloadButton = screen.getByRole('button', {
        name: /最新データを取得/i,
      });
      const discardButton = screen.getByRole('button', {
        name: /変更を破棄/i,
      });

      // 最初のボタンにフォーカスが当たる
      expect(document.activeElement).toBe(reloadButton);

      // 両方のボタンがフォーカス可能であることを確認
      expect(reloadButton).not.toHaveAttribute('disabled');
      expect(discardButton).not.toHaveAttribute('disabled');
    });
  });
});
