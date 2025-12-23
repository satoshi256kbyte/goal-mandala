import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionProgressSelector } from '../ActionProgressSelector';
import { renderWithProviders } from '../../../test/test-utils';

// モック
vi.mock('../../../hooks/useReflections', () => ({
  useActionProgress: vi.fn(),
}));

import { useActionProgress } from '../../../hooks/useReflections';

describe('ActionProgressSelector', () => {
  const mockActionProgress = {
    regretful: [
      {
        id: 'action-1',
        title: '惜しかったアクション1',
        subGoalTitle: 'サブ目標1',
        progress: 85,
      },
      {
        id: 'action-2',
        title: '惜しかったアクション2',
        subGoalTitle: 'サブ目標2',
        progress: 90,
      },
    ],
    slowProgress: [
      {
        id: 'action-3',
        title: '進まなかったアクション1',
        subGoalTitle: 'サブ目標3',
        progress: 15,
      },
    ],
    untouched: [
      {
        id: 'action-4',
        title: '未着手アクション1',
        subGoalTitle: 'サブ目標4',
        progress: 0,
      },
    ],
  };

  const mockOnSelectAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useActionProgress).mockReturnValue({
      data: mockActionProgress,
      isLoading: false,
      error: null,
    } as any);
  });

  describe('基本機能', () => {
    it('惜しかったアクションを表示する', () => {
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.getByText('惜しかったアクション（進捗80%以上）')).toBeInTheDocument();
      expect(screen.getByText('惜しかったアクション1')).toBeInTheDocument();
      expect(screen.getByText('惜しかったアクション2')).toBeInTheDocument();
    });

    it('進まなかったアクションを表示する', () => {
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(
        screen.getByText('思ったより進まなかったアクション（進捗20%以下）')
      ).toBeInTheDocument();
      expect(screen.getByText('進まなかったアクション1')).toBeInTheDocument();
    });

    it('未着手アクションを表示する', () => {
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.getByText('未着手となったアクション（進捗0%）')).toBeInTheDocument();
      expect(screen.getByText('未着手アクション1')).toBeInTheDocument();
    });

    it('サブ目標タイトルを表示する', () => {
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.getByText('サブ目標1')).toBeInTheDocument();
      expect(screen.getByText('サブ目標2')).toBeInTheDocument();
      expect(screen.getByText('サブ目標3')).toBeInTheDocument();
      expect(screen.getByText('サブ目標4')).toBeInTheDocument();
    });

    it('進捗率を表示する', () => {
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('15%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はスピナーを表示する', () => {
      vi.mocked(useActionProgress).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any);

      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.getByText('アクション進捗を読み込み中...')).toBeInTheDocument();
    });
  });

  describe('エラー状態', () => {
    it('エラー時はエラーメッセージを表示する', () => {
      vi.mocked(useActionProgress).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      } as any);

      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(
        screen.getByText('アクション進捗の取得に失敗しました。もう一度お試しください。')
      ).toBeInTheDocument();
    });
  });

  describe('空の状態', () => {
    it('全てのカテゴリが空の場合はメッセージを表示する', () => {
      vi.mocked(useActionProgress).mockReturnValue({
        data: {
          regretful: [],
          slowProgress: [],
          untouched: [],
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.getByText('該当するアクションがありません')).toBeInTheDocument();
    });

    it('データがundefinedの場合は何も表示しない', () => {
      vi.mocked(useActionProgress).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as any);

      const { container } = renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('ユーザーインタラクション', () => {
    it('惜しかったアクションの選択ボタンをクリックするとonSelectActionが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      const buttons = screen.getAllByRole('button', { name: '選択' });
      await user.click(buttons[0]);

      expect(mockOnSelectAction).toHaveBeenCalledWith(mockActionProgress.regretful[0], 'regretful');
    });

    it('進まなかったアクションの選択ボタンをクリックするとonSelectActionが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      const buttons = screen.getAllByRole('button', { name: '選択' });
      await user.click(buttons[2]); // 3番目のボタン（惜しかった2つの後）

      expect(mockOnSelectAction).toHaveBeenCalledWith(
        mockActionProgress.slowProgress[0],
        'slowProgress'
      );
    });

    it('未着手アクションの選択ボタンをクリックするとonSelectActionが呼ばれる', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      const buttons = screen.getAllByRole('button', { name: '選択' });
      await user.click(buttons[3]); // 4番目のボタン

      expect(mockOnSelectAction).toHaveBeenCalledWith(mockActionProgress.untouched[0], 'untouched');
    });
  });

  describe('カテゴリの表示制御', () => {
    it('惜しかったアクションがない場合はセクションを表示しない', () => {
      vi.mocked(useActionProgress).mockReturnValue({
        data: {
          regretful: [],
          slowProgress: mockActionProgress.slowProgress,
          untouched: mockActionProgress.untouched,
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.queryByText('惜しかったアクション（進捗80%以上）')).not.toBeInTheDocument();
    });

    it('進まなかったアクションがない場合はセクションを表示しない', () => {
      vi.mocked(useActionProgress).mockReturnValue({
        data: {
          regretful: mockActionProgress.regretful,
          slowProgress: [],
          untouched: mockActionProgress.untouched,
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(
        screen.queryByText('思ったより進まなかったアクション（進捗20%以下）')
      ).not.toBeInTheDocument();
    });

    it('未着手アクションがない場合はセクションを表示しない', () => {
      vi.mocked(useActionProgress).mockReturnValue({
        data: {
          regretful: mockActionProgress.regretful,
          slowProgress: mockActionProgress.slowProgress,
          untouched: [],
        },
        isLoading: false,
        error: null,
      } as any);

      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      expect(screen.queryByText('未着手となったアクション（進捗0%）')).not.toBeInTheDocument();
    });
  });

  describe('進捗バーの表示', () => {
    it('進捗バーが正しい幅で表示される', () => {
      const { container } = renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      // 進捗バーの幅を確認（85%、90%、15%、0%）
      const progressBars = container.querySelectorAll('.bg-blue-600');
      expect(progressBars[0]).toHaveStyle({ width: '85%' });
      expect(progressBars[1]).toHaveStyle({ width: '90%' });
      expect(progressBars[2]).toHaveStyle({ width: '15%' });
      expect(progressBars[3]).toHaveStyle({ width: '0%' });
    });
  });

  describe('アクセシビリティ', () => {
    it('選択ボタンにtype="button"が設定されている', () => {
      renderWithProviders(
        <ActionProgressSelector goalId="goal-1" onSelectAction={mockOnSelectAction} />
      );

      const buttons = screen.getAllByRole('button', { name: '選択' });
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
