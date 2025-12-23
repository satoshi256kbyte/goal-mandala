import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/test-utils';
import { ProfileSetupPage } from './ProfileSetupPage';
import * as useAuthModule from '../hooks/useAuth';

// モック関数をグローバルスコープで定義
const mockNavigate = vi.fn();

// useAuthをモック
vi.mock('../hooks/useAuth');

// react-router-domのモック
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ProfileSetupFormをモック
vi.mock('../components/profile/ProfileSetupForm', () => ({
  ProfileSetupForm: ({
    onSuccess,
    onError,
  }: {
    onSuccess: () => void;
    onError: (error: string) => void;
  }) => (
    <div data-testid="profile-setup-form">
      <button onClick={onSuccess} data-testid="success-button">
        Success
      </button>
      <button onClick={() => onError('Test error')} data-testid="error-button">
        Error
      </button>
    </div>
  ),
}));

describe('ProfileSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: { id: '1', email: 'test@example.com', name: 'Test User', profileSetup: false },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      clearError: vi.fn(),
      addAuthStateListener: vi.fn(),
      isTokenExpired: vi.fn(),
      getTokenExpirationTime: vi.fn(),
      refreshToken: vi.fn(),
    });
  });

  describe('レンダリング', () => {
    it('プロフィール設定画面が正しく表示される', () => {
      renderWithProviders(<ProfileSetupPage />);

      expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
      expect(
        screen.getByText('目標管理をより効果的にするため、あなたの情報を教えてください')
      ).toBeInTheDocument();
      expect(screen.getByTestId('profile-setup-form')).toBeInTheDocument();
    });

    it('ヘルプテキストが表示される', () => {
      renderWithProviders(<ProfileSetupPage />);

      expect(
        screen.getByText('この情報は、あなたに最適な目標設定をサポートするために使用されます')
      ).toBeInTheDocument();
    });
  });

  describe('認証状態の確認', () => {
    it('未認証の場合はログイン画面にリダイレクトされる', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(),
        isTokenExpired: vi.fn(),
        getTokenExpirationTime: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderWithProviders(<ProfileSetupPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('プロフィール設定済みの場合はTOP画面にリダイレクトされる', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          profileSetup: true,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(),
        isTokenExpired: vi.fn(),
        getTokenExpirationTime: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderWithProviders(<ProfileSetupPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('認証チェック中はローディング表示される', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(),
        isTokenExpired: vi.fn(),
        getTokenExpirationTime: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderWithProviders(<ProfileSetupPage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('フォーム送信処理', () => {
    it('フォーム送信成功時に成功メッセージが表示される', async () => {
      renderWithProviders(<ProfileSetupPage />);

      const successButton = screen.getByTestId('success-button');
      await userEvent.click(successButton);

      expect(await screen.findByText('プロフィールを保存しました')).toBeInTheDocument();
    });

    it('フォーム送信成功後にTOP画面にリダイレクトされる', async () => {
      vi.useFakeTimers();

      try {
        renderWithProviders(<ProfileSetupPage />);

        const successButton = screen.getByTestId('success-button');
        await userEvent.click(successButton);

        // 成功メッセージが表示されることを確認
        expect(await screen.findByText('プロフィールを保存しました')).toBeInTheDocument();

        // 1秒後にリダイレクト
        await act(async () => {
          vi.advanceTimersByTime(1000);
          await vi.runAllTimersAsync();
        });

        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      } finally {
        vi.useRealTimers();
      }
    });

    it('フォーム送信エラー時にエラーメッセージが表示される', async () => {
      renderWithProviders(<ProfileSetupPage />);

      const errorButton = screen.getByTestId('error-button');
      await userEvent.click(errorButton);

      expect(await screen.findByText('エラーが発生しました')).toBeInTheDocument();
      expect(await screen.findByText('Test error')).toBeInTheDocument();
    });
  });

  describe('エラーメッセージの自動非表示', () => {
    it('エラーメッセージが5秒後に自動的に非表示になる', async () => {
      vi.useFakeTimers();

      try {
        renderWithProviders(<ProfileSetupPage />);

        const errorButton = screen.getByTestId('error-button');
        await userEvent.click(errorButton);

        expect(await screen.findByText('Test error')).toBeInTheDocument();

        // 5秒後
        await act(async () => {
          vi.advanceTimersByTime(5000);
          await vi.runAllTimersAsync();
        });

        expect(screen.queryByText('Test error')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('エラーメッセージの閉じるボタンをクリックすると非表示になる', async () => {
      renderWithProviders(<ProfileSetupPage />);

      const errorButton = screen.getByTestId('error-button');
      await userEvent.click(errorButton);

      expect(await screen.findByText('Test error')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('エラーメッセージを閉じる');
      await userEvent.click(closeButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('成功メッセージの自動非表示', () => {
    it('成功メッセージが3秒後に自動的に非表示になる', async () => {
      vi.useFakeTimers();

      try {
        renderWithProviders(<ProfileSetupPage />);

        const successButton = screen.getByTestId('success-button');
        await userEvent.click(successButton);

        expect(await screen.findByText('プロフィールを保存しました')).toBeInTheDocument();

        // 3秒後
        await act(async () => {
          vi.advanceTimersByTime(3000);
          await vi.runAllTimersAsync();
        });

        expect(screen.queryByText('プロフィールを保存しました')).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('アクセシビリティ', () => {
    it('エラーメッセージにrole="alert"が設定されている', async () => {
      renderWithProviders(<ProfileSetupPage />);

      const errorButton = screen.getByTestId('error-button');
      await userEvent.click(errorButton);

      // エラーメッセージが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // role="alert"を持つ要素を取得（複数ある場合は最初の1つ）
      const alerts = screen.getAllByRole('alert');
      const errorAlert = alerts.find(alert => alert.textContent?.includes('Test error'));
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    });

    it('成功メッセージにrole="alert"が設定されている', async () => {
      renderWithProviders(<ProfileSetupPage />);

      const successButton = screen.getByTestId('success-button');
      await userEvent.click(successButton);

      // 成功メッセージが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();
      });

      // role="alert"を持つ要素を取得（複数ある場合は最初の1つ）
      const alerts = screen.getAllByRole('alert');
      const successAlert = alerts.find(alert =>
        alert.textContent?.includes('プロフィールを保存しました')
      );
      expect(successAlert).toHaveAttribute('aria-live', 'polite');
    });

    it('ローディング状態にrole="status"が設定されている', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(),
        isTokenExpired: vi.fn(),
        getTokenExpirationTime: vi.fn(),
        refreshToken: vi.fn(),
      });

      renderWithProviders(<ProfileSetupPage />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });
});
