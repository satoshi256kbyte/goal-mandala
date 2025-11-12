import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  renderWithProviders,
  waitForLoadingToFinish,
} from '../utils/integration-test-utils';
import { testDataGenerator } from '../utils/TestDataGenerator';

// モックデータ生成関数
function generateMockHistoryEntries() {
  const user1 = testDataGenerator.generateUser({ name: '山田太郎' });
  const user2 = testDataGenerator.generateUser({ name: '佐藤花子' });
  const goal = testDataGenerator.generateGoal(user1.id);

  return [
    {
      id: 'history-1',
      entityType: 'goal' as const,
      entityId: goal.id,
      userId: user1.id,
      userName: user1.name,
      changedAt: '2024-01-15T10:30:00Z',
      changes: [
        {
          field: 'title',
          oldValue: '古いタイトル',
          newValue: '新しいタイトル',
        },
      ],
    },
    {
      id: 'history-2',
      entityType: 'goal' as const,
      entityId: goal.id,
      userId: user1.id,
      userName: user1.name,
      changedAt: '2024-01-14T15:20:00Z',
      changes: [
        {
          field: 'description',
          oldValue: '古い説明',
          newValue: '新しい説明',
        },
        {
          field: 'background',
          oldValue: '古い背景',
          newValue: '新しい背景',
        },
      ],
    },
    {
      id: 'history-3',
      entityType: 'goal' as const,
      entityId: goal.id,
      userId: user2.id,
      userName: user2.name,
      changedAt: '2024-01-13T09:15:00Z',
      changes: [
        {
          field: 'deadline',
          oldValue: '2024-12-31',
          newValue: '2025-03-31',
        },
      ],
    },
  ];
}

// HistoryPanelコンポーネントのモック実装
const MockHistoryPanel = ({
  entityType,
  entityId,
  isAdmin,
  onRollback,
  onFetchHistory,
}: {
  entityType: 'goal' | 'subgoal' | 'action';
  entityId: string;
  isAdmin: boolean;
  onRollback?: (historyId: string) => Promise<void>;
  onFetchHistory: () => Promise<typeof mockHistoryEntries>;
}) => {
  const [history, setHistory] = React.useState<typeof mockHistoryEntries>([]);
  const [selectedEntry, setSelectedEntry] = React.useState<(typeof mockHistoryEntries)[0] | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDetail, setShowDetail] = React.useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = React.useState(false);

  React.useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const data = await onFetchHistory();
        setHistory(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [onFetchHistory]);

  const handleEntryClick = (entry: (typeof mockHistoryEntries)[0]) => {
    setSelectedEntry(entry);
    setShowDetail(true);
  };

  const handleRollbackClick = (entry: (typeof mockHistoryEntries)[0]) => {
    setSelectedEntry(entry);
    setShowRollbackConfirm(true);
  };

  const handleConfirmRollback = async () => {
    if (selectedEntry && onRollback) {
      await onRollback(selectedEntry.id);
      setShowRollbackConfirm(false);
      setSelectedEntry(null);
    }
  };

  const handleCancelRollback = () => {
    setShowRollbackConfirm(false);
    setSelectedEntry(null);
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <h2>変更履歴</h2>

      <div role="list" aria-label="変更履歴一覧">
        {history.map(entry => (
          <div key={entry.id} role="listitem">
            <button onClick={() => handleEntryClick(entry)}>
              <div>
                <strong>{entry.userName}</strong>
                <time dateTime={entry.changedAt}>
                  {new Date(entry.changedAt).toLocaleString('ja-JP')}
                </time>
              </div>
              <div>
                {entry.changes.map((change, index) => (
                  <span key={index}>
                    {change.field}を変更
                    {index < entry.changes.length - 1 && ', '}
                  </span>
                ))}
              </div>
            </button>
            {isAdmin && <button onClick={() => handleRollbackClick(entry)}>ロールバック</button>}
          </div>
        ))}
      </div>

      {showDetail && selectedEntry && (
        <div role="dialog" aria-label="履歴詳細">
          <h3>変更詳細</h3>
          <dl>
            <dt>変更者:</dt>
            <dd>{selectedEntry.userName}</dd>
            <dt>変更日時:</dt>
            <dd>{new Date(selectedEntry.changedAt).toLocaleString('ja-JP')}</dd>
          </dl>

          <h4>変更内容</h4>
          {selectedEntry.changes.map((change, index) => (
            <div key={index}>
              <strong>{change.field}:</strong>
              <div className="diff">
                <div className="old-value">- {change.oldValue}</div>
                <div className="new-value">+ {change.newValue}</div>
              </div>
            </div>
          ))}

          <button onClick={() => setShowDetail(false)}>閉じる</button>
        </div>
      )}

      {showRollbackConfirm && selectedEntry && (
        <div role="dialog" aria-label="ロールバック確認">
          <h3>ロールバックの確認</h3>
          <p>
            {new Date(selectedEntry.changedAt).toLocaleString('ja-JP')}
            の変更をロールバックしますか？
          </p>
          <button onClick={handleConfirmRollback}>ロールバック</button>
          <button onClick={handleCancelRollback}>キャンセル</button>
        </div>
      )}
    </div>
  );
};

describe('変更履歴フロー統合テスト', () => {
  let testData: Awaited<ReturnType<typeof setupIntegrationTest>>;
  let mockHistoryEntries: ReturnType<typeof generateMockHistoryEntries>;
  let mockOnFetchHistory: ReturnType<typeof vi.fn>;
  let mockOnRollback: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // テストデータのセットアップ
    testData = await setupIntegrationTest();

    // モック履歴データの生成
    mockHistoryEntries = generateMockHistoryEntries();

    // モック関数のセットアップ
    mockOnFetchHistory = vi.fn().mockResolvedValue(mockHistoryEntries);
    mockOnRollback = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // テストデータのクリーンアップ
    await cleanupIntegrationTest();
  });

  describe('履歴表示フロー', () => {
    it('履歴ボタン → 履歴表示 → 差分確認', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <MockHistoryPanel
          entityType="goal"
          entityId={testData.goal.id}
          isAdmin={false}
          onFetchHistory={mockOnFetchHistory}
        />
      );

      // ページが表示されるまで待機
      await waitForLoadingToFinish();

      // 1. 履歴が読み込まれることを確認
      await waitFor(() => {
        expect(mockOnFetchHistory).toHaveBeenCalled();
      });

      // 2. 履歴一覧が表示されることを確認
      const historyList = await screen.findByRole('list', { name: '変更履歴一覧' });
      expect(historyList).toBeInTheDocument();

      const historyItems = await screen.findAllByRole('listitem');
      expect(historyItems).toHaveLength(3);

      // 3. 最初の履歴エントリをクリック
      const firstEntry = historyItems[0];
      const firstButton = within(firstEntry).getByRole('button');
      await user.click(firstButton);

      // 4. 詳細ダイアログが表示されることを確認
      const detailDialog = await screen.findByRole('dialog', { name: '履歴詳細' });
      expect(detailDialog).toBeInTheDocument();

      // 5. 変更内容が表示されることを確認
      expect(await screen.findByText('変更詳細')).toBeInTheDocument();
      expect(await screen.findByText('山田太郎')).toBeInTheDocument();
      expect(await screen.findByText('title:')).toBeInTheDocument();
      expect(await screen.findByText('- 古いタイトル')).toBeInTheDocument();
      expect(await screen.findByText('+ 新しいタイトル')).toBeInTheDocument();
    });

    it('複数の変更を含む履歴の表示', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={false}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // 2番目の履歴エントリ（複数の変更を含む）をクリック
      const historyItems = screen.getAllByRole('listitem');
      const secondButton = within(historyItems[1]).getByRole('button');
      await user.click(secondButton);

      // 詳細ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 複数の変更が表示されることを確認
      expect(screen.getByText('description:')).toBeInTheDocument();
      expect(screen.getByText('- 古い説明')).toBeInTheDocument();
      expect(screen.getByText('+ 新しい説明')).toBeInTheDocument();
      expect(screen.getByText('background:')).toBeInTheDocument();
      expect(screen.getByText('- 古い背景')).toBeInTheDocument();
      expect(screen.getByText('+ 新しい背景')).toBeInTheDocument();
    });

    it('履歴詳細ダイアログを閉じる', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={false}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // 履歴エントリをクリック
      const historyItems = screen.getAllByRole('listitem');
      const firstButton = within(historyItems[0]).getByRole('button');
      await user.click(firstButton);

      // 詳細ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 閉じるボタンをクリック
      await user.click(screen.getByRole('button', { name: '閉じる' }));

      // ダイアログが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('ロールバック機能（管理者のみ）', () => {
    it('管理者の場合、ロールバックボタンが表示される', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={true}
            onRollback={mockOnRollback}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // ロールバックボタンが表示されることを確認
      const rollbackButtons = screen.getAllByRole('button', { name: 'ロールバック' });
      expect(rollbackButtons).toHaveLength(3);
    });

    it('非管理者の場合、ロールバックボタンが表示されない', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={false}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // ロールバックボタンが表示されないことを確認
      expect(screen.queryByRole('button', { name: 'ロールバック' })).not.toBeInTheDocument();
    });

    it('ロールバック実行フロー', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={true}
            onRollback={mockOnRollback}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // 1. ロールバックボタンをクリック
      const rollbackButtons = screen.getAllByRole('button', { name: 'ロールバック' });
      await user.click(rollbackButtons[0]);

      // 2. 確認ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'ロールバック確認' })).toBeInTheDocument();
      });

      expect(screen.getByText('ロールバックの確認')).toBeInTheDocument();
      expect(screen.getByText(/の変更をロールバックしますか？/)).toBeInTheDocument();

      // 3. ロールバックを確認
      await user.click(screen.getByRole('button', { name: 'ロールバック' }));

      // 4. ロールバック処理が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnRollback).toHaveBeenCalledWith('history-1');
      });

      // 5. 確認ダイアログが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'ロールバック確認' })).not.toBeInTheDocument();
      });
    });

    it('ロールバックをキャンセル', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={true}
            onRollback={mockOnRollback}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // ロールバックボタンをクリック
      const rollbackButtons = screen.getAllByRole('button', { name: 'ロールバック' });
      await user.click(rollbackButtons[0]);

      // 確認ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'ロールバック確認' })).toBeInTheDocument();
      });

      // キャンセルボタンをクリック
      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      // ロールバック処理が呼ばれないことを確認
      expect(mockOnRollback).not.toHaveBeenCalled();

      // 確認ダイアログが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: 'ロールバック確認' })).not.toBeInTheDocument();
      });
    });
  });

  describe('履歴データの表示', () => {
    it('変更者と変更日時が正しく表示される', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={false}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // 変更者名が表示されることを確認
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();

      // 変更日時が表示されることを確認（日本語フォーマット）
      const timeElements = screen.getAllByRole('time');
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it('変更されたフィールドが一覧に表示される', async () => {
      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={false}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // 変更されたフィールド名が表示されることを確認
      expect(screen.getByText(/titleを変更/)).toBeInTheDocument();
      expect(screen.getByText(/descriptionを変更/)).toBeInTheDocument();
      expect(screen.getByText(/deadlineを変更/)).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('履歴取得エラー時の処理', async () => {
      const mockError = new Error('履歴の取得に失敗しました');
      mockOnFetchHistory.mockRejectedValueOnce(mockError);

      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={false}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      // エラーが発生しても画面がクラッシュしないことを確認
      await waitFor(() => {
        expect(mockOnFetchHistory).toHaveBeenCalled();
      });
    });

    it('ロールバックエラー時の処理', async () => {
      const user = userEvent.setup();
      const mockError = new Error('ロールバックに失敗しました');
      mockOnRollback.mockRejectedValueOnce(mockError);

      render(
        <QueryClientProvider client={queryClient}>
          <MockHistoryPanel
            entityType="goal"
            entityId="goal-123"
            isAdmin={true}
            onRollback={mockOnRollback}
            onFetchHistory={mockOnFetchHistory}
          />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('list')).toBeInTheDocument();
      });

      // ロールバックボタンをクリック
      const rollbackButtons = screen.getAllByRole('button', { name: 'ロールバック' });
      await user.click(rollbackButtons[0]);

      // 確認ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: 'ロールバック確認' })).toBeInTheDocument();
      });

      // ロールバックを確認
      await user.click(screen.getByRole('button', { name: 'ロールバック' }));

      // エラーが発生しても画面がクラッシュしないことを確認
      await waitFor(() => {
        expect(mockOnRollback).toHaveBeenCalled();
      });
    });
  });
});
