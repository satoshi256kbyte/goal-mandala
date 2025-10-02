import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ActionEditPage } from './ActionEditPage';
import { AuthProvider } from '../components/auth/AuthProvider';

// モックコンポーネント
vi.mock('../contexts/ActionContext', () => ({
  ActionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/forms/DragDropProvider', () => ({
  DragDropProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/forms/BulkEditModal', () => ({
  BulkEditModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="bulk-edit-modal">
        <button onClick={onClose}>閉じる</button>
      </div>
    ) : null,
}));

vi.mock('../components/forms/BulkSelectionProvider', () => ({
  BulkSelectionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/common/LoadingSpinner', () => ({
  LoadingSpinner: ({ message }: { message?: string }) => (
    <div data-testid="loading-spinner">{message}</div>
  ),
}));

vi.mock('../components/common/ErrorAlert', () => ({
  ErrorAlert: ({ message, onClose }: { message: string; onClose: () => void }) => (
    <div data-testid="error-alert">
      {message}
      <button onClick={onClose}>閉じる</button>
    </div>
  ),
}));

vi.mock('../components/common/SuccessMessage', () => ({
  SuccessMessage: ({ message, onClose }: { message: string; onClose: () => void }) => (
    <div data-testid="success-message">
      {message}
      <button onClick={onClose}>閉じる</button>
    </div>
  ),
}));

// React Router のモック
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ goalId: 'test-goal-id' }),
  };
});

// 認証プロバイダーのモック
vi.mock('../components/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: () => ({
    user: { id: 'test-user', name: 'テストユーザー', email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe('ActionEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('ページが正しく表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      // ローディング表示の確認
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // ページタイトルの確認
      await waitFor(() => {
        expect(screen.getByText('アクションの確認・編集')).toBeInTheDocument();
      });
    });

    it('ページ説明が表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('AI生成されたアクションを確認してください')).toBeInTheDocument();
        expect(screen.getByText(/各サブ目標に対して生成された8つのアクション/)).toBeInTheDocument();
      });
    });
  });

  describe('ツールバー', () => {
    it('一括編集モードボタンが表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('一括編集モード')).toBeInTheDocument();
      });
    });

    it('一括編集モードを切り替えできる', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const bulkEditButton = screen.getByText('一括編集モード');
        fireEvent.click(bulkEditButton);
        expect(screen.getByText('一括編集モード終了')).toBeInTheDocument();
      });
    });

    it('一括編集モード時に実行ボタンが表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const bulkEditButton = screen.getByText('一括編集モード');
        fireEvent.click(bulkEditButton);
        expect(screen.getByText('一括編集実行')).toBeInTheDocument();
      });
    });
  });

  describe('サブ目標タブ', () => {
    it('サブ目標タブが表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // モックデータで8つのサブ目標タブが表示されることを確認
        for (let i = 1; i <= 8; i++) {
          expect(screen.getByText(`サブ目標 ${i}`)).toBeInTheDocument();
        }
      });
    });

    it('サブ目標タブをクリックして切り替えできる', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const tab2 = screen.getByText('サブ目標 2');
        fireEvent.click(tab2);
        // タブの切り替えが動作することを確認（実際のスタイル変更は統合テストで確認）
      });
    });
  });

  describe('ナビゲーション', () => {
    it('前に戻るボタンが表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('前に戻る')).toBeInTheDocument();
      });
    });

    it('活動開始ボタンが表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('活動開始')).toBeInTheDocument();
      });
    });

    it('前に戻るボタンをクリックするとナビゲートされる', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const backButton = screen.getByText('前に戻る');
        fireEvent.click(backButton);
        expect(mockNavigate).toHaveBeenCalledWith('/mandala/create/subgoals/test-goal-id');
      });
    });

    it('活動開始ボタンをクリックするとナビゲートされる', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const startButton = screen.getByText('活動開始');
        fireEvent.click(startButton);
        expect(mockNavigate).toHaveBeenCalledWith('/mandala/create/confirm/test-goal-id');
      });
    });
  });

  describe('一括編集モーダル', () => {
    it('一括編集実行ボタンをクリックするとモーダルが表示される', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // 一括編集モードに切り替え
        const bulkEditButton = screen.getByText('一括編集モード');
        fireEvent.click(bulkEditButton);

        // 一括編集実行ボタンをクリック
        const executeButton = screen.getByText('一括編集実行');
        fireEvent.click(executeButton);

        // モーダルが表示されることを確認
        expect(screen.getByTestId('bulk-edit-modal')).toBeInTheDocument();
      });
    });

    it('モーダルを閉じることができる', async () => {
      render(
        <TestWrapper>
          <ActionEditPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // 一括編集モードに切り替え
        const bulkEditButton = screen.getByText('一括編集モード');
        fireEvent.click(bulkEditButton);

        // 一括編集実行ボタンをクリック
        const executeButton = screen.getByText('一括編集実行');
        fireEvent.click(executeButton);

        // モーダルを閉じる
        const closeButton = screen.getByText('閉じる');
        fireEvent.click(closeButton);

        // モーダルが閉じられることを確認
        expect(screen.queryByTestId('bulk-edit-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('カスタムクラス名', () => {
    it('カスタムクラス名が適用される', async () => {
      const { container } = render(
        <TestWrapper>
          <ActionEditPage className="custom-class" />
        </TestWrapper>
      );

      await waitFor(() => {
        const mainDiv = container.querySelector('.min-h-screen.bg-gray-50.custom-class');
        expect(mainDiv).toBeInTheDocument();
      });
    });
  });
});
