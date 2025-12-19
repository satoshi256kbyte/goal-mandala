import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import ReflectionDetailPage from './ReflectionDetailPage';

// react-router-domのモック
const mockNavigate = vi.fn();
let mockParams: { goalId?: string; reflectionId?: string } = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

// ReflectionDetailコンポーネントをモック
vi.mock('../components/reflection/ReflectionDetail', () => ({
  ReflectionDetail: ({
    reflectionId,
    onEdit,
    onBack,
    onDeleted,
  }: {
    reflectionId: string;
    onEdit: () => void;
    onBack: () => void;
    onDeleted: () => void;
  }) => (
    <div data-testid="reflection-detail">
      <div data-testid="reflection-id">{reflectionId}</div>
      <button onClick={onEdit}>編集</button>
      <button onClick={onBack}>戻る</button>
      <button onClick={onDeleted}>削除完了</button>
    </div>
  ),
}));

describe('ReflectionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { goalId: 'goal-123', reflectionId: 'reflection-456' };
  });

  describe('レンダリング', () => {
    it('正常なパラメータの場合、ReflectionDetailコンポーネントが表示される', () => {
      renderWithProviders(<ReflectionDetailPage />);

      expect(screen.getByTestId('reflection-detail')).toBeInTheDocument();
      expect(screen.getByTestId('reflection-id')).toHaveTextContent('reflection-456');
    });

    it('goalIdが存在しない場合、エラーメッセージが表示される', () => {
      mockParams = { reflectionId: 'reflection-456' };

      renderWithProviders(<ReflectionDetailPage />);

      expect(screen.getByText('必要なパラメータが指定されていません。')).toBeInTheDocument();
      expect(screen.queryByTestId('reflection-detail')).not.toBeInTheDocument();
    });

    it('reflectionIdが存在しない場合、エラーメッセージが表示される', () => {
      mockParams = { goalId: 'goal-123' };

      renderWithProviders(<ReflectionDetailPage />);

      expect(screen.getByText('必要なパラメータが指定されていません。')).toBeInTheDocument();
      expect(screen.queryByTestId('reflection-detail')).not.toBeInTheDocument();
    });

    it('両方のパラメータが存在しない場合、エラーメッセージが表示される', () => {
      mockParams = {};

      renderWithProviders(<ReflectionDetailPage />);

      expect(screen.getByText('必要なパラメータが指定されていません。')).toBeInTheDocument();
      expect(screen.queryByTestId('reflection-detail')).not.toBeInTheDocument();
    });
  });

  describe('ナビゲーション', () => {
    it('編集ボタンをクリックすると、編集ページへナビゲートする', async () => {
      renderWithProviders(<ReflectionDetailPage />);

      const editButton = screen.getByRole('button', { name: '編集' });
      editButton.click();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          '/mandala/goal-123/reflections/reflection-456/edit'
        );
      });
    });

    it('戻るボタンをクリックすると、振り返り一覧ページへナビゲートする', async () => {
      renderWithProviders(<ReflectionDetailPage />);

      const backButton = screen.getByRole('button', { name: '戻る' });
      backButton.click();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/mandala/goal-123/reflections');
      });
    });

    it('削除完了後、振り返り一覧ページへナビゲートする', async () => {
      renderWithProviders(<ReflectionDetailPage />);

      const deletedButton = screen.getByRole('button', { name: '削除完了' });
      deletedButton.click();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/mandala/goal-123/reflections');
      });
    });
  });

  describe('エラー表示', () => {
    it('エラーメッセージが適切なスタイルで表示される', () => {
      mockParams = {};

      renderWithProviders(<ReflectionDetailPage />);

      const errorContainer = screen
        .getByText('必要なパラメータが指定されていません。')
        .closest('div');
      expect(errorContainer).toHaveClass('bg-red-50', 'border', 'border-red-200');
    });
  });

  describe('アクセシビリティ', () => {
    it('エラーメッセージが適切なテキストカラーで表示される', () => {
      mockParams = {};

      renderWithProviders(<ReflectionDetailPage />);

      const errorText = screen.getByText('必要なパラメータが指定されていません。');
      expect(errorText).toHaveClass('text-sm', 'text-red-600');
    });
  });
});
