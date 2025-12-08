import React from 'react';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MandalaListPage } from './MandalaListPage';
import { useAuth } from '../hooks/useAuth';

// Mock the auth hook
vi.mock('../hooks/useAuth');
const mockUseAuth = useAuth as any;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock MandalaListContainer
vi.mock('../components/mandala-list/MandalaListContainer', () => ({
  MandalaListContainer: () => <div data-testid="mandala-list-container">Mandala List</div>,
}));

// Mock UserMenu
vi.mock('../components/mandala-list/UserMenu', () => ({
  UserMenu: ({ userName, userEmail, onSettingsClick, onLogoutClick }: any) => (
    <div data-testid="user-menu">
      <span>{userName}</span>
      <span>{userEmail}</span>
      <button onClick={onSettingsClick}>設定</button>
      <button onClick={onLogoutClick}>ログアウト</button>
    </div>
  ),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('MandalaListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ページ表示のテスト', () => {
    it('認証チェック中はローディング状態を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    });

    it('認証済みでプロフィール設定済みの場合、ページを表示する', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      expect(screen.getByText('マンダラチャート一覧')).toBeInTheDocument();
      expect(screen.getByTestId('mandala-list-container')).toBeInTheDocument();
      expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    });

    it('ユーザー情報を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('適切な見出し構造を持つ', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('マンダラチャート一覧');
    });
  });

  describe('認証状態チェックのテスト', () => {
    it('未認証の場合、ログイン画面にリダイレクトする（要件: 12.1）', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('プロフィール未設定の場合、プロフィール入力画面にリダイレクトする（要件: 12.4）', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: false,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/profile/setup', { replace: true });
      });
    });

    it('認証トークンが無効な場合、ログイン画面にリダイレクトする（要件: 12.2, 12.3）', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });
  });

  describe('リダイレクト処理のテスト', () => {
    it('設定ボタンクリック時に設定画面に遷移する（要件: 10.6）', async () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      const settingsButton = screen.getByText('設定');
      await userEvent.click(settingsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('ログアウトボタンクリック時にログアウト処理を実行する（要件: 10.7）', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      } as any);

      renderWithRouter(<MandalaListPage />);

      const logoutButton = screen.getByText('ログアウト');
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('ログアウト失敗時にエラーメッセージを表示する', async () => {
      const mockSignOut = vi.fn().mockRejectedValue(new Error('Logout failed'));
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      } as any);

      renderWithRouter(<MandalaListPage />);

      const logoutButton = screen.getByText('ログアウト');
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText('ログアウトに失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('マンダラカードクリックのテスト', () => {
    it('MandalaListContainerが表示される', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      expect(screen.getByTestId('mandala-list-container')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリングのテスト', () => {
    it('エラーメッセージを表示する', async () => {
      const mockSignOut = vi.fn().mockRejectedValue(new Error('Logout failed'));
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      } as any);

      renderWithRouter(<MandalaListPage />);

      const logoutButton = screen.getByText('ログアウト');
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText('ログアウトに失敗しました')).toBeInTheDocument();
      });
    });

    it('エラーメッセージの閉じるボタンをクリックして手動で非表示にできる', async () => {
      const mockSignOut = vi.fn().mockRejectedValue(new Error('Logout failed'));
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      } as any);

      renderWithRouter(<MandalaListPage />);

      const logoutButton = screen.getByText('ログアウト');
      await userEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText('ログアウトに失敗しました')).toBeInTheDocument();
      });

      // 閉じるボタンをクリック
      const closeButton = screen.getByLabelText('エラーメッセージを閉じる');
      await userEvent.click(closeButton);

      expect(screen.queryByText('ログアウトに失敗しました')).not.toBeInTheDocument();
    });

    it('エラーアラートに適切なARIA属性を設定する', async () => {
      const mockSignOut = vi.fn().mockRejectedValue(new Error('Logout failed'));
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      } as any);

      renderWithRouter(<MandalaListPage />);

      const logoutButton = screen.getByText('ログアウト');
      await userEvent.click(logoutButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('アクセシビリティのテスト', () => {
    it('ローディング状態にaria-busy属性を設定する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-busy', 'true');
    });

    it('ページが表示されたときにヘッダーが存在する', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('ページが表示されたときにメインコンテンツが存在する', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: '1',
          name: 'テストユーザー',
          email: 'test@example.com',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: vi.fn(),
      } as any);

      renderWithRouter(<MandalaListPage />);

      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
    });
  });
});
