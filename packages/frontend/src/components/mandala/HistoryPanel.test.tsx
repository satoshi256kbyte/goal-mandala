import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPanel } from './HistoryPanel';

// モックデータ
const mockHistoryEntries = [
  {
    id: 'history-1',
    entityType: 'goal' as const,
    entityId: 'goal-123',
    userId: 'user-456',
    userName: '山田太郎',
    changedAt: new Date('2024-01-15T10:30:00Z'),
    changes: [
      {
        field: 'title',
        oldValue: '古いタイトル',
        newValue: '新しいタイトル',
      },
      {
        field: 'description',
        oldValue: '古い説明',
        newValue: '新しい説明',
      },
    ],
  },
  {
    id: 'history-2',
    entityType: 'goal' as const,
    entityId: 'goal-123',
    userId: 'user-789',
    userName: '佐藤花子',
    changedAt: new Date('2024-01-14T15:20:00Z'),
    changes: [
      {
        field: 'deadline',
        oldValue: '2024-12-31',
        newValue: '2024-11-30',
      },
    ],
  },
];

describe('HistoryPanel', () => {
  const mockOnRollback = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('履歴一覧表示', () => {
    it('履歴エントリが正しく表示される', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリが表示されることを確認
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
    });

    it('変更日時が正しくフォーマットされて表示される', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 日時が表示されることを確認（フォーマットは実装に依存）
      expect(screen.getAllByText(/2024/).length).toBeGreaterThan(0);
    });

    it('変更内容の数が表示される', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 変更内容の数が表示されることを確認
      expect(screen.getByText(/2.*変更/)).toBeInTheDocument();
      expect(screen.getByText(/1.*変更/)).toBeInTheDocument();
    });

    it('履歴が空の場合、適切なメッセージが表示される', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={[]}
          total={0}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(/変更履歴がありません/)).toBeInTheDocument();
    });
  });

  describe('ページネーション', () => {
    const manyHistoryEntries = Array.from({ length: 25 }, (_, i) => ({
      id: `history-${i}`,
      entityType: 'goal' as const,
      entityId: 'goal-123',
      userId: `user-${i}`,
      userName: `ユーザー${i}`,
      changedAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
      changes: [
        {
          field: 'title',
          oldValue: `古いタイトル${i}`,
          newValue: `新しいタイトル${i}`,
        },
      ],
    }));

    it('ページネーションコントロールが表示される', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={manyHistoryEntries.slice(0, 20)}
          total={25}
          limit={20}
          offset={0}
          onPageChange={vi.fn()}
          onClose={mockOnClose}
        />
      );

      // ページネーションボタンが表示されることを確認
      expect(screen.getByRole('button', { name: /次へ/ })).toBeInTheDocument();
    });

    it('次のページに移動できる', async () => {
      const user = userEvent.setup();
      const mockOnPageChange = vi.fn();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={manyHistoryEntries.slice(0, 20)}
          total={25}
          limit={20}
          offset={0}
          onPageChange={mockOnPageChange}
          onClose={mockOnClose}
        />
      );

      const nextButton = screen.getByRole('button', { name: /次へ/ });
      await user.click(nextButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(20);
    });

    it('前のページに移動できる', async () => {
      const user = userEvent.setup();
      const mockOnPageChange = vi.fn();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={manyHistoryEntries.slice(20, 25)}
          total={25}
          limit={20}
          offset={20}
          onPageChange={mockOnPageChange}
          onClose={mockOnClose}
        />
      );

      const prevButton = screen.getByRole('button', { name: /前へ/ });
      await user.click(prevButton);

      expect(mockOnPageChange).toHaveBeenCalledWith(0);
    });

    it('最初のページでは前へボタンが無効化される', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={manyHistoryEntries.slice(0, 20)}
          total={25}
          limit={20}
          offset={0}
          onPageChange={vi.fn()}
          onClose={mockOnClose}
        />
      );

      const prevButton = screen.getByRole('button', { name: /前へ/ });
      expect(prevButton).toBeDisabled();
    });

    it('最後のページでは次へボタンが無効化される', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={manyHistoryEntries.slice(20, 25)}
          total={25}
          limit={20}
          offset={20}
          onPageChange={vi.fn()}
          onClose={mockOnClose}
        />
      );

      const nextButton = screen.getByRole('button', { name: /次へ/ });
      expect(nextButton).toBeDisabled();
    });
  });

  describe('差分表示', () => {
    it('変更内容の差分が表示される', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // 差分が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('古いタイトル')).toBeInTheDocument();
        expect(screen.getByText('新しいタイトル')).toBeInTheDocument();
      });
    });

    it('フィールド名が日本語で表示される', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // フィールド名が日本語で表示されることを確認
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(within(modal).getByText('タイトル')).toBeInTheDocument();
        expect(within(modal).getByText('説明')).toBeInTheDocument();
      });
    });

    it('削除された値は赤色でハイライトされる', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // 古い値が赤色でハイライトされることを確認（カスタムCSSクラスを使用）
      await waitFor(() => {
        const oldValue = screen.getByText('古いタイトル');
        expect(oldValue.className).toMatch(/history-diff-old-value/);
      });
    });

    it('追加された値は緑色でハイライトされる', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // 新しい値が緑色でハイライトされることを確認（カスタムCSSクラスを使用）
      await waitFor(() => {
        const newValue = screen.getByText('新しいタイトル');
        expect(newValue.className).toMatch(/history-diff-new-value/);
      });
    });
  });

  describe('履歴詳細表示', () => {
    it('履歴エントリをクリックすると詳細モーダルが表示される', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // 詳細モーダルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('詳細モーダルに変更者情報が表示される', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // 変更者情報が表示されることを確認
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(within(modal).getByText(/変更者:.*山田太郎/)).toBeInTheDocument();
      });
    });

    it('詳細モーダルを閉じることができる', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // モーダルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // モーダル内の閉じるボタンをクリック
      const modal = screen.getByRole('dialog');
      const closeButton = within(modal).getByRole('button', { name: '閉じる' });
      await act(async () => {
        await user.click(closeButton);
      });

      // モーダルが閉じられることを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('ロールバック処理（管理者のみ）', () => {
    it('管理者の場合、ロールバックボタンが表示される', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={true}
          history={mockHistoryEntries}
          total={2}
          onRollback={mockOnRollback}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // ロールバックボタンが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ロールバック/ })).toBeInTheDocument();
      });
    });

    it('管理者でない場合、ロールバックボタンが表示されない', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // ロールバックボタンが表示されないことを確認
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /ロールバック/ })).not.toBeInTheDocument();
      });
    });

    it('ロールバックボタンをクリックすると確認ダイアログが表示される', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={true}
          history={mockHistoryEntries}
          total={2}
          onRollback={mockOnRollback}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // ロールバックボタンをクリック
      await waitFor(async () => {
        const rollbackButton = screen.getByRole('button', { name: /ロールバック/ });
        await act(async () => {
          await user.click(rollbackButton);
        });
      });

      // 確認ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/この変更をロールバックしますか/)).toBeInTheDocument();
      });
    });

    it('確認ダイアログで「はい」を選択するとロールバックが実行される', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={true}
          history={mockHistoryEntries}
          total={2}
          onRollback={mockOnRollback}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // ロールバックボタンをクリック
      await waitFor(async () => {
        const rollbackButton = screen.getByRole('button', { name: /ロールバック/ });
        await act(async () => {
          await user.click(rollbackButton);
        });
      });

      // 確認ダイアログで「はい」をクリック
      await waitFor(async () => {
        const confirmButton = screen.getByRole('button', { name: /はい/ });
        await act(async () => {
          await user.click(confirmButton);
        });
      });

      // ロールバック関数が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnRollback).toHaveBeenCalledWith('history-1');
      });
    });

    it('確認ダイアログで「キャンセル」を選択するとロールバックがキャンセルされる', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={true}
          history={mockHistoryEntries}
          total={2}
          onRollback={mockOnRollback}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // ロールバックボタンをクリック
      await waitFor(async () => {
        const rollbackButton = screen.getByRole('button', { name: /ロールバック/ });
        await act(async () => {
          await user.click(rollbackButton);
        });
      });

      // 確認ダイアログで「キャンセル」をクリック
      await waitFor(async () => {
        const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
        await act(async () => {
          await user.click(cancelButton);
        });
      });

      // ロールバック関数が呼ばれないことを確認
      expect(mockOnRollback).not.toHaveBeenCalled();

      // 確認ダイアログが閉じられることを確認
      await waitFor(() => {
        expect(screen.queryByText(/この変更をロールバックしますか/)).not.toBeInTheDocument();
      });
    });

    it('ロールバック実行中はローディング状態が表示される', async () => {
      const user = userEvent.setup();
      const slowRollback = vi.fn<[historyId: string], Promise<void>>(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={true}
          history={mockHistoryEntries}
          total={2}
          onRollback={slowRollback}
          onClose={mockOnClose}
        />
      );

      // 履歴エントリをクリック
      const historyEntry = screen.getByText('山田太郎').closest('button');
      if (historyEntry) {
        await act(async () => {
          await user.click(historyEntry);
        });
      }

      // ロールバックボタンをクリック
      await waitFor(async () => {
        const rollbackButton = screen.getByRole('button', { name: /ロールバック/ });
        await act(async () => {
          await user.click(rollbackButton);
        });
      });

      // 確認ダイアログで「はい」をクリック
      await waitFor(async () => {
        const confirmButton = screen.getByRole('button', { name: /はい/ });
        await act(async () => {
          await user.click(confirmButton);
        });
      });

      // ローディング状態が表示されることを確認
      expect(screen.getByText(/ロールバック中/)).toBeInTheDocument();

      // ロールバックが完了するまで待つ
      await waitFor(() => {
        expect(screen.queryByText(/ロールバック中/)).not.toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', () => {
      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // パネルにrole属性が設定されていることを確認
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('キーボードで履歴エントリを選択できる', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // 最初の履歴エントリにフォーカス
      const firstEntry = screen.getByText('山田太郎').closest('button');
      if (firstEntry) {
        firstEntry.focus();
        await act(async () => {
          await user.keyboard('{Enter}');
        });
      }

      // 詳細モーダルが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('Escキーでパネルを閉じることができる', async () => {
      const user = userEvent.setup();

      render(
        <HistoryPanel
          entityType="goal"
          entityId="goal-123"
          isAdmin={false}
          history={mockHistoryEntries}
          total={2}
          onClose={mockOnClose}
        />
      );

      // Escキーを押す
      await user.keyboard('{Escape}');

      // onCloseが呼ばれることを確認
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
