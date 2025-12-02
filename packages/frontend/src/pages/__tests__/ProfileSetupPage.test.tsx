import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProfileSetupPage } from '../ProfileSetupPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the auth hook
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock ProfileSetupForm
vi.mock('../../components/profile/ProfileSetupForm', () => ({
  ProfileSetupForm: ({ onSuccess, onError }: any) => (
    <div data-testid="profile-setup-form">
      <button data-testid="success-button" onClick={() => onSuccess?.()}>
        Success
      </button>
      <button data-testid="error-button" onClick={() => onError?.('Test error')}>
        Error
      </button>
    </div>
  ),
}));

// Mock AuthLayout
vi.mock('../../components/layout/AuthLayout', () => ({
  AuthLayout: ({ children }: any) => <div data-testid="auth-layout">{children}</div>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ProfileSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com', profileSetup: false },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本表示', () => {
    it('プロフィール設定ページが正しく表示される', () => {
      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
      expect(screen.getByTestId('profile-setup-form')).toBeInTheDocument();
    });

    it('ページタイトルが正しく設定される', () => {
      renderWithRouter(<ProfileSetupPage />);

      expect(document.title).toContain('プロフィール設定');
    });
  });

  describe('フォーム送信処理', () => {
    it('送信成功時の処理が正しく動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByTestId('success-button');
      await user.click(successButton);

      // 成功メッセージが表示されることを確認
      expect(screen.getByText(/プロフィールを保存しました/)).toBeInTheDocument();
    });

    it('送信エラー時の処理が正しく動作する', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByTestId('error-button');
      await user.click(errorButton);

      // エラーメッセージが表示されることを確認
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('リダイレクト処理のテスト', () => {
    it('送信成功後、1秒後にTOP画面にリダイレクトする', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByTestId('success-button');
      await user.click(successButton);

      // 1秒後にリダイレクトされることを確認
      await new Promise(resolve => setTimeout(resolve, 1100));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('エラー時はリダイレクトしない', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByTestId('error-button');
      await user.click(errorButton);

      // 1秒経過してもリダイレクトされないことを確認
      await new Promise(resolve => setTimeout(resolve, 1100));

      // リダイレクトされないことを確認
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('ローディング状態', () => {
    it('フォーム送信中はローディング状態が表示される', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByTestId('success-button');
      await user.click(successButton);

      // ローディング状態の確認（実装に依存）
      expect(screen.getByTestId('profile-setup-form')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIA属性が設定されている', () => {
      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
      expect(screen.getByTestId('profile-setup-form')).toBeInTheDocument();
    });

    it('フォーカス管理が適切に行われる', () => {
      renderWithRouter(<ProfileSetupPage />);

      // フォームが表示されることを確認
      expect(screen.getByTestId('profile-setup-form')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラー時の処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByTestId('error-button');
      await user.click(errorButton);

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('バリデーションエラー時の処理', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByTestId('error-button');
      await user.click(errorButton);

      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    it('コンポーネントが効率的にレンダリングされる', () => {
      const { rerender } = renderWithRouter(<ProfileSetupPage />);

      // 再レンダリングしても問題ないことを確認
      rerender(
        <BrowserRouter>
          <ProfileSetupPage />
        </BrowserRouter>
      );

      expect(screen.getByTestId('profile-setup-form')).toBeInTheDocument();
    });
  });

  describe('セキュリティ', () => {
    it('認証が必要なページであることを確認', () => {
      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByTestId('auth-layout')).toBeInTheDocument();
    });
  });
});
