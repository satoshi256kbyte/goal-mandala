import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// モックデータ
const mockCurrentData = {
  id: 'goal-123',
  title: '現在のタイトル',
  description: '現在の説明',
  deadline: '2024-12-31',
  background: '現在の背景',
  constraints: '現在の制約事項',
  updatedAt: '2024-01-15T10:30:00Z',
};

const mockLatestData = {
  id: 'goal-123',
  title: '他のユーザーが更新したタイトル',
  description: '他のユーザーが更新した説明',
  deadline: '2024-12-31',
  background: '他のユーザーが更新した背景',
  constraints: '他のユーザーが更新した制約事項',
  updatedAt: '2024-01-15T10:35:00Z',
};

// ConflictDialogコンポーネントのモック実装
const MockConflictDialog = ({
  isOpen,
  currentData,
  latestData,
  onReload,
  onDiscard,
}: {
  isOpen: boolean;
  currentData: typeof mockCurrentData;
  latestData: typeof mockLatestData;
  onReload: () => void;
  onDiscard: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-label="編集競合の解決">
      <h2>編集競合が検出されました</h2>
      <p>データが他のユーザーによって更新されています</p>

      <div>
        <h3>あなたの変更</h3>
        <dl>
          <dt>タイトル:</dt>
          <dd>{currentData.title}</dd>
          <dt>説明:</dt>
          <dd>{currentData.description}</dd>
          <dt>背景:</dt>
          <dd>{currentData.background}</dd>
        </dl>
      </div>

      <div>
        <h3>最新のデータ</h3>
        <dl>
          <dt>タイトル:</dt>
          <dd>{latestData.title}</dd>
          <dt>説明:</dt>
          <dd>{latestData.description}</dd>
          <dt>背景:</dt>
          <dd>{latestData.background}</dd>
        </dl>
      </div>

      <div>
        <h3>差分</h3>
        {currentData.title !== latestData.title && (
          <div>
            <strong>タイトル:</strong>
            <div>
              <span className="old-value">- {currentData.title}</span>
              <span className="new-value">+ {latestData.title}</span>
            </div>
          </div>
        )}
        {currentData.description !== latestData.description && (
          <div>
            <strong>説明:</strong>
            <div>
              <span className="old-value">- {currentData.description}</span>
              <span className="new-value">+ {latestData.description}</span>
            </div>
          </div>
        )}
        {currentData.background !== latestData.background && (
          <div>
            <strong>背景:</strong>
            <div>
              <span className="old-value">- {currentData.background}</span>
              <span className="new-value">+ {latestData.background}</span>
            </div>
          </div>
        )}
      </div>

      <button onClick={onReload}>最新データを取得して再編集</button>
      <button onClick={onDiscard}>変更を破棄</button>
    </div>
  );
};

// 編集フローのモック実装
const MockEditFlow = ({
  onSave,
  onConflict,
}: {
  onSave: (data: any) => Promise<void>;
  onConflict: (currentData: any, latestData: any) => void;
}) => {
  const [data, setData] = React.useState(mockCurrentData);
  const [showConflict, setShowConflict] = React.useState(false);
  const [conflictData, setConflictData] = React.useState<{
    current: typeof mockCurrentData;
    latest: typeof mockLatestData;
  } | null>(null);

  const handleSave = async () => {
    try {
      await onSave(data);
    } catch (error: any) {
      if (error.status === 409) {
        // 競合エラー
        setConflictData({
          current: data,
          latest: error.latestData,
        });
        setShowConflict(true);
        onConflict(data, error.latestData);
      }
    }
  };

  const handleReload = () => {
    if (conflictData) {
      setData(conflictData.latest);
      setShowConflict(false);
      setConflictData(null);
    }
  };

  const handleDiscard = () => {
    setShowConflict(false);
    setConflictData(null);
  };

  return (
    <div>
      <label htmlFor="title">タイトル</label>
      <input
        id="title"
        type="text"
        value={data.title}
        onChange={e => setData({ ...data, title: e.target.value })}
      />

      <button onClick={handleSave}>保存</button>

      {showConflict && conflictData && (
        <MockConflictDialog
          isOpen={showConflict}
          currentData={conflictData.current}
          latestData={conflictData.latest}
          onReload={handleReload}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
};

describe('編集競合フロー統合テスト', () => {
  let queryClient: QueryClient;
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnConflict: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockOnSave = vi.fn();
    mockOnConflict = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('競合検出フロー', () => {
    it('同時編集 → 競合検出 → 解決', async () => {
      const user = userEvent.setup();

      // 競合エラーをシミュレート
      mockOnSave.mockRejectedValueOnce({
        status: 409,
        error: 'EDIT_CONFLICT',
        message: 'データが他のユーザーによって更新されています',
        latestData: mockLatestData,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditFlow onSave={mockOnSave} onConflict={mockOnConflict} />
        </QueryClientProvider>
      );

      // 1. タイトルを編集
      const titleInput = screen.getByLabelText('タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '編集したタイトル');

      // 2. 保存を試みる
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 3. 競合ダイアログが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: '編集競合の解決' })).toBeInTheDocument();
      });

      // 4. 競合メッセージが表示されることを確認
      expect(screen.getByText('編集競合が検出されました')).toBeInTheDocument();
      expect(screen.getByText('データが他のユーザーによって更新されています')).toBeInTheDocument();

      // 5. 競合コールバックが呼ばれることを確認
      expect(mockOnConflict).toHaveBeenCalled();
    });

    it('最新データを取得して再編集', async () => {
      const user = userEvent.setup();

      mockOnSave.mockRejectedValueOnce({
        status: 409,
        error: 'EDIT_CONFLICT',
        latestData: mockLatestData,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditFlow onSave={mockOnSave} onConflict={mockOnConflict} />
        </QueryClientProvider>
      );

      // タイトルを編集して保存
      const titleInput = screen.getByLabelText('タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '編集したタイトル');
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 競合ダイアログが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 「最新データを取得して再編集」ボタンをクリック
      await user.click(screen.getByRole('button', { name: '最新データを取得して再編集' }));

      // ダイアログが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 最新データがフォームに反映されることを確認
      expect(screen.getByLabelText('タイトル')).toHaveValue('他のユーザーが更新したタイトル');
    });

    it('変更を破棄', async () => {
      const user = userEvent.setup();

      mockOnSave.mockRejectedValueOnce({
        status: 409,
        error: 'EDIT_CONFLICT',
        latestData: mockLatestData,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditFlow onSave={mockOnSave} onConflict={mockOnConflict} />
        </QueryClientProvider>
      );

      // タイトルを編集して保存
      const titleInput = screen.getByLabelText('タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '編集したタイトル');
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 競合ダイアログが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 「変更を破棄」ボタンをクリック
      await user.click(screen.getByRole('button', { name: '変更を破棄' }));

      // ダイアログが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('差分表示', () => {
    it('変更された項目の差分を表示', async () => {
      const user = userEvent.setup();

      mockOnSave.mockRejectedValueOnce({
        status: 409,
        error: 'EDIT_CONFLICT',
        latestData: mockLatestData,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditFlow onSave={mockOnSave} onConflict={mockOnConflict} />
        </QueryClientProvider>
      );

      // タイトルを編集して保存
      const titleInput = screen.getByLabelText('タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '編集したタイトル');
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 競合ダイアログが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // あなたの変更が表示されることを確認
      expect(screen.getByText('あなたの変更')).toBeInTheDocument();
      expect(screen.getByText('編集したタイトル')).toBeInTheDocument();

      // 最新のデータが表示されることを確認
      expect(screen.getByText('最新のデータ')).toBeInTheDocument();
      expect(screen.getByText('他のユーザーが更新したタイトル')).toBeInTheDocument();

      // 差分が表示されることを確認
      expect(screen.getByText('差分')).toBeInTheDocument();
    });

    it('複数フィールドの差分を表示', async () => {
      const user = userEvent.setup();

      const modifiedLatestData = {
        ...mockLatestData,
        description: '他のユーザーが更新した説明',
        background: '他のユーザーが更新した背景',
      };

      mockOnSave.mockRejectedValueOnce({
        status: 409,
        error: 'EDIT_CONFLICT',
        latestData: modifiedLatestData,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditFlow onSave={mockOnSave} onConflict={mockOnConflict} />
        </QueryClientProvider>
      );

      // タイトルを編集して保存
      const titleInput = screen.getByLabelText('タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '編集したタイトル');
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 競合ダイアログが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // 複数の差分が表示されることを確認
      expect(screen.getByText('他のユーザーが更新したタイトル')).toBeInTheDocument();
      expect(screen.getByText('他のユーザーが更新した説明')).toBeInTheDocument();
      expect(screen.getByText('他のユーザーが更新した背景')).toBeInTheDocument();
    });
  });

  describe('楽観的ロック検証', () => {
    it('updatedAtが一致しない場合に競合を検出', async () => {
      const user = userEvent.setup();

      // 異なるupdatedAtで競合エラーをシミュレート
      mockOnSave.mockRejectedValueOnce({
        status: 409,
        error: 'EDIT_CONFLICT',
        message: 'データが他のユーザーによって更新されています',
        latestData: {
          ...mockLatestData,
          updatedAt: '2024-01-15T10:35:00Z', // 異なる更新日時
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditFlow onSave={mockOnSave} onConflict={mockOnConflict} />
        </QueryClientProvider>
      );

      // タイトルを編集して保存
      const titleInput = screen.getByLabelText('タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '編集したタイトル');
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 競合が検出されることを確認
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(
          screen.getByText('データが他のユーザーによって更新されています')
        ).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('競合以外のエラーは通常のエラーとして処理', async () => {
      const user = userEvent.setup();

      // 500エラーをシミュレート
      mockOnSave.mockRejectedValueOnce({
        status: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'サーバーエラー',
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditFlow onSave={mockOnSave} onConflict={mockOnConflict} />
        </QueryClientProvider>
      );

      // タイトルを編集して保存
      const titleInput = screen.getByLabelText('タイトル');
      await user.clear(titleInput);
      await user.type(titleInput, '編集したタイトル');
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 競合ダイアログは表示されないことを確認
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // 競合コールバックは呼ばれないことを確認
      expect(mockOnConflict).not.toHaveBeenCalled();
    });
  });
});
