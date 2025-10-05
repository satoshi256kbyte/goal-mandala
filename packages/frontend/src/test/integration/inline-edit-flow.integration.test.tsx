import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MandalaCell from '../../components/mandala/MandalaCell';
import { CellData, Position } from '../../types';

// モックデータ
const mockCellData: CellData = {
  id: 'goal-123',
  type: 'goal',
  title: '目標タイトル',
  description: '目標説明',
  progress: 50,
  position: { row: 4, col: 4 },
};

const mockPosition: Position = { row: 4, col: 4 };

describe('インライン編集フロー統合テスト', () => {
  let queryClient: QueryClient;
  let mockOnSaveInlineEdit: ReturnType<typeof vi.fn>;
  let mockOnCancelInlineEdit: ReturnType<typeof vi.fn>;
  let mockOnStartInlineEdit: ReturnType<typeof vi.fn>;
  let mockOnEndInlineEdit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockOnSaveInlineEdit = vi.fn().mockResolvedValue(undefined);
    mockOnCancelInlineEdit = vi.fn();
    mockOnStartInlineEdit = vi.fn();
    mockOnEndInlineEdit = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系フロー', () => {
    it('セルクリック → 編集 → 保存 → 反映確認', async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={false}
          />
        </QueryClientProvider>
      );

      // 1. セルをクリックして編集モードを開始
      const cell = screen.getByRole('gridcell');
      await user.click(cell);

      expect(mockOnStartInlineEdit).toHaveBeenCalledWith(mockCellData);

      // 2. 編集モードに切り替え
      rerender(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={true}
          />
        </QueryClientProvider>
      );

      // 3. テキストを編集
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '新しい目標タイトル');

      // 4. Enterキーで保存
      await user.keyboard('{Enter}');

      // 5. 保存処理が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnSaveInlineEdit).toHaveBeenCalledWith('新しい目標タイトル');
      });

      // 6. 編集終了処理が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnEndInlineEdit).toHaveBeenCalled();
      });
    });

    it('外側クリックで保存', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <div>
            <MandalaCell
              cellData={mockCellData}
              position={mockPosition}
              editable={true}
              onClick={vi.fn()}
              onEdit={vi.fn()}
              canEdit={true}
              onStartInlineEdit={mockOnStartInlineEdit}
              onSaveInlineEdit={mockOnSaveInlineEdit}
              onCancelInlineEdit={mockOnCancelInlineEdit}
              onEndInlineEdit={mockOnEndInlineEdit}
              isInlineEditing={true}
            />
            <button>外側のボタン</button>
          </div>
        </QueryClientProvider>
      );

      // テキストを編集
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '編集後のタイトル');

      // 外側をクリック
      const outsideButton = screen.getByRole('button', { name: '外側のボタン' });
      await user.click(outsideButton);

      // 保存処理が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnSaveInlineEdit).toHaveBeenCalledWith('編集後のタイトル');
      });
    });

    it('Escキーでキャンセル', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={true}
          />
        </QueryClientProvider>
      );

      // テキストを編集
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '編集中のタイトル');

      // Escキーでキャンセル
      await user.keyboard('{Escape}');

      // キャンセル処理が呼ばれることを確認
      await waitFor(() => {
        expect(mockOnCancelInlineEdit).toHaveBeenCalled();
        expect(mockOnEndInlineEdit).toHaveBeenCalled();
      });

      // 保存処理は呼ばれないことを確認
      expect(mockOnSaveInlineEdit).not.toHaveBeenCalled();
    });
  });

  describe('エラーケース', () => {
    it('空文字での保存を拒否', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={true}
          />
        </QueryClientProvider>
      );

      // テキストを空にする
      const input = screen.getByRole('textbox');
      await user.clear(input);

      // Enterキーで保存を試みる
      await user.keyboard('{Enter}');

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/タイトルは必須です/i)).toBeInTheDocument();
      });

      // 保存処理は呼ばれないことを確認
      expect(mockOnSaveInlineEdit).not.toHaveBeenCalled();
    });

    it('文字数超過での保存を拒否', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={true}
          />
        </QueryClientProvider>
      );

      // 101文字のテキストを入力
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'a'.repeat(101));

      // Enterキーで保存を試みる
      await user.keyboard('{Enter}');

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/100文字以内で入力してください/i)).toBeInTheDocument();
      });

      // 保存処理は呼ばれないことを確認
      expect(mockOnSaveInlineEdit).not.toHaveBeenCalled();
    });

    it('API エラー時のエラー表示', async () => {
      const user = userEvent.setup();
      const mockError = new Error('ネットワークエラー');
      mockOnSaveInlineEdit.mockRejectedValueOnce(mockError);

      render(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={true}
          />
        </QueryClientProvider>
      );

      // テキストを編集
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, '新しいタイトル');

      // Enterキーで保存
      await user.keyboard('{Enter}');

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラー/i)).toBeInTheDocument();
      });

      // 編集モードが維持されることを確認（編集終了処理が呼ばれない）
      expect(mockOnEndInlineEdit).not.toHaveBeenCalled();
    });

    it('権限エラー時の処理', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={false}
            readOnly={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={false}
          />
        </QueryClientProvider>
      );

      // セルをクリック
      const cell = screen.getByRole('gridcell');
      await user.click(cell);

      // 編集モードが開始されないことを確認
      expect(mockOnStartInlineEdit).not.toHaveBeenCalled();

      // InlineEditorが表示されないことを確認
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('リアルタイムバリデーション', () => {
    it('入力中にバリデーションエラーを表示', async () => {
      const user = userEvent.setup();

      render(
        <QueryClientProvider client={queryClient}>
          <MandalaCell
            cellData={mockCellData}
            position={mockPosition}
            editable={true}
            onClick={vi.fn()}
            onEdit={vi.fn()}
            canEdit={true}
            onStartInlineEdit={mockOnStartInlineEdit}
            onSaveInlineEdit={mockOnSaveInlineEdit}
            onCancelInlineEdit={mockOnCancelInlineEdit}
            onEndInlineEdit={mockOnEndInlineEdit}
            isInlineEditing={true}
          />
        </QueryClientProvider>
      );

      // テキストを空にする
      const input = screen.getByRole('textbox');
      await user.clear(input);

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/タイトルは必須です/i)).toBeInTheDocument();
      });

      // 有効なテキストを入力
      await user.type(input, '有効なタイトル');

      // エラーが消えることを確認
      await waitFor(() => {
        expect(screen.queryByText(/タイトルは必須です/i)).not.toBeInTheDocument();
      });
    });
  });
});
