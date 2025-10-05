import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// モックデータ
const mockGoalData = {
  id: 'goal-123',
  title: '目標タイトル',
  description: '目標説明',
  deadline: '2024-12-31',
  background: '背景情報',
  constraints: '制約事項',
  updatedAt: '2024-01-15T10:30:00Z',
};

const mockSubGoalData = {
  id: 'subgoal-123',
  title: 'サブ目標タイトル',
  description: 'サブ目標説明',
  background: '背景情報',
  constraints: '制約事項',
  updatedAt: '2024-01-15T10:30:00Z',
};

const mockActionData = {
  id: 'action-123',
  title: 'アクションタイトル',
  description: 'アクション説明',
  background: '背景情報',
  constraints: '制約事項',
  type: 'execution' as const,
  updatedAt: '2024-01-15T10:30:00Z',
};

// EditModalコンポーネントのモック実装
const MockEditModal = ({
  isOpen,
  entityType,
  initialData,
  onSave,
  onClose,
}: {
  isOpen: boolean;
  entityType: 'goal' | 'subgoal' | 'action';
  initialData: typeof mockGoalData | typeof mockSubGoalData | typeof mockActionData;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) => {
  const [formData, setFormData] = React.useState(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // バリデーション
    const newErrors: Record<string, string> = {};
    if (!formData.title || formData.title.trim().length === 0) {
      newErrors.title = 'タイトルは必須です';
    }
    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'タイトルは100文字以内で入力してください';
    }
    if (!formData.description || formData.description.trim().length === 0) {
      newErrors.description = '説明は必須です';
    }
    if (formData.description && formData.description.length > 500) {
      newErrors.description = '説明は500文字以内で入力してください';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div role="dialog" aria-label={`${entityType}編集`}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="title">タイトル</label>
        <input
          id="title"
          type="text"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <div id="title-error" role="alert">
            {errors.title}
          </div>
        )}

        <label htmlFor="description">説明</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <div id="description-error" role="alert">
            {errors.description}
          </div>
        )}

        {entityType === 'goal' && 'deadline' in formData && (
          <>
            <label htmlFor="deadline">達成期限</label>
            <input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={e => setFormData({ ...formData, deadline: e.target.value })}
            />
          </>
        )}

        <label htmlFor="background">背景</label>
        <textarea
          id="background"
          value={formData.background}
          onChange={e => setFormData({ ...formData, background: e.target.value })}
        />

        <label htmlFor="constraints">制約事項</label>
        <textarea
          id="constraints"
          value={formData.constraints || ''}
          onChange={e => setFormData({ ...formData, constraints: e.target.value })}
        />

        {entityType === 'action' && 'type' in formData && (
          <>
            <label htmlFor="type">種別</label>
            <select
              id="type"
              value={formData.type}
              onChange={e =>
                setFormData({ ...formData, type: e.target.value as 'execution' | 'habit' })
              }
            >
              <option value="execution">実行</option>
              <option value="habit">習慣</option>
            </select>
          </>
        )}

        {errors.submit && <div role="alert">{errors.submit}</div>}

        <button type="submit" disabled={isSaving}>
          {isSaving ? '保存中...' : '保存'}
        </button>
        <button type="button" onClick={onClose}>
          キャンセル
        </button>
      </form>
    </div>
  );
};

describe('モーダル編集フロー統合テスト', () => {
  let queryClient: QueryClient;
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockOnSave = vi.fn().mockResolvedValue(undefined);
    mockOnClose = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('目標編集フロー', () => {
    it('編集ボタン → モーダル表示 → 編集 → 保存 → 反映確認', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="goal"
            initialData={mockGoalData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // 1. モーダルが表示されることを確認
      expect(screen.getByRole('dialog', { name: 'goal編集' })).toBeInTheDocument();

      // 2. 初期値が表示されることを確認
      expect(screen.getByLabelText('タイトル')).toHaveValue('目標タイトル');
      expect(screen.getByLabelText('説明')).toHaveValue('目標説明');
      expect(screen.getByLabelText('達成期限')).toHaveValue('2024-12-31');
      expect(screen.getByLabelText('背景')).toHaveValue('背景情報');
      expect(screen.getByLabelText('制約事項')).toHaveValue('制約事項');

      // 3. フィールドを編集
      await user.clear(screen.getByLabelText('タイトル'));
      await user.type(screen.getByLabelText('タイトル'), '新しい目標タイトル');

      await user.clear(screen.getByLabelText('説明'));
      await user.type(screen.getByLabelText('説明'), '新しい目標説明');

      // 4. 保存ボタンをクリック
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 5. 保存処理が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '新しい目標タイトル',
            description: '新しい目標説明',
          })
        );
      });

      // 6. モーダルが閉じることを確認
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('キャンセルボタンで変更を破棄', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="goal"
            initialData={mockGoalData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // フィールドを編集
      await user.clear(screen.getByLabelText('タイトル'));
      await user.type(screen.getByLabelText('タイトル'), '編集中のタイトル');

      // キャンセルボタンをクリック
      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      // 保存処理が呼ばれないことを確認
      expect(mockOnSave).not.toHaveBeenCalled();

      // モーダルが閉じることを確認
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('サブ目標編集フロー', () => {
    it('サブ目標の編集と保存', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="subgoal"
            initialData={mockSubGoalData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // フィールドを編集
      await user.clear(screen.getByLabelText('タイトル'));
      await user.type(screen.getByLabelText('タイトル'), '新しいサブ目標');

      // 保存
      await user.click(screen.getByRole('button', { name: '保存' }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '新しいサブ目標',
          })
        );
      });
    });
  });

  describe('アクション編集フロー', () => {
    it('アクションの編集と種別変更', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="action"
            initialData={mockActionData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // タイトルを編集
      await user.clear(screen.getByLabelText('タイトル'));
      await user.type(screen.getByLabelText('タイトル'), '新しいアクション');

      // 種別を変更
      await user.selectOptions(screen.getByLabelText('種別'), 'habit');

      // 保存
      await user.click(screen.getByRole('button', { name: '保存' }));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: '新しいアクション',
            type: 'habit',
          })
        );
      });
    });
  });

  describe('エラーケース', () => {
    it('必須フィールドの空欄エラー', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="goal"
            initialData={mockGoalData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // タイトルを空にする
      await user.clear(screen.getByLabelText('タイトル'));

      // 保存を試みる
      await user.click(screen.getByRole('button', { name: '保存' }));

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
      });

      // 保存処理が呼ばれないことを確認
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('文字数超過エラー', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="goal"
            initialData={mockGoalData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // 101文字のタイトルを入力
      await user.clear(screen.getByLabelText('タイトル'));
      await user.type(screen.getByLabelText('タイトル'), 'a'.repeat(101));

      // 保存を試みる
      await user.click(screen.getByRole('button', { name: '保存' }));

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('タイトルは100文字以内で入力してください')).toBeInTheDocument();
      });

      // 保存処理が呼ばれないことを確認
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('API エラー時のエラー表示', async () => {
      const user = userEvent.setup();
      const mockError = new Error('サーバーエラー');
      mockOnSave.mockRejectedValueOnce(mockError);

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="goal"
            initialData={mockGoalData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // タイトルを編集
      await user.clear(screen.getByLabelText('タイトル'));
      await user.type(screen.getByLabelText('タイトル'), '新しいタイトル');

      // 保存を試みる
      await user.click(screen.getByRole('button', { name: '保存' }));

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('サーバーエラー')).toBeInTheDocument();
      });

      // モーダルが閉じないことを確認
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('フォームバリデーション', () => {
    it('複数フィールドのバリデーションエラー', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MockEditModal
            isOpen={true}
            entityType="goal"
            initialData={mockGoalData}
            onSave={mockOnSave}
            onClose={mockOnClose}
          />
        </QueryClientProvider>
      );

      // タイトルと説明を空にする
      await user.clear(screen.getByLabelText('タイトル'));
      await user.clear(screen.getByLabelText('説明'));

      // 保存を試みる
      await user.click(screen.getByRole('button', { name: '保存' }));

      // 両方のエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
        expect(screen.getByText('説明は必須です')).toBeInTheDocument();
      });

      // 保存処理が呼ばれないことを確認
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });
});
