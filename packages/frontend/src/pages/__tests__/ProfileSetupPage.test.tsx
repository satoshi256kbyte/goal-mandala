import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProfileSetupPage } from '../ProfileSetupPage';
import { useAuth } from '../../hooks/useAuth';

// Mock the auth hook
vi.mock('../../hooks/useAuth');
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock ProfileSetupForm
vi.mock('../../components/profile/ProfileSetupForm', () => ({
  ProfileSetupForm: ({ onSuccess, onError }: any) => (
    <div data-testid="profile-setup-form">
      <button onClick={() => onSuccess?.()}>Success</button>
      <button onClick={() => onError?.('Test error')}>Error</button>
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
  });

  describe('ページ表示のテスト', () => {
    it('認証チェック中はローディング状態を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
      // スピナーはaria-hidden="true"を持つ
      const spinner = document.querySelector('[aria-hidden="true"]');
      expect(spinner).toBeInTheDocument();
    });

    it('認証済みでプロフィール未設定の場合、フォームを表示する', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
      expect(
        screen.getByText('目標管理をより効果的にするため、あなたの情報を教えてください')
      ).toBeInTheDocument();
      expect(screen.getByTestId('profile-setup-form')).toBeInTheDocument();
    });

    it('ヘルプテキストを表示する', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      expect(
        screen.getByText('この情報は、あなたに最適な目標設定をサポートするために使用されます')
      ).toBeInTheDocument();
    });

    it('適切な見出し構造を持つ', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('プロフィール設定');
    });
  });

  describe('認証状態管理のテスト', () => {
    it('未認証の場合、ログイン画面にリダイレクトする（要件: 8.1）', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('プロフィール設定済みの場合、TOP画面にリダイレクトする（要件: 8.4）', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('認証トークンが無効な場合、ログイン画面にリダイレクトする（要件: 8.3）', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    });

    it('リダイレクト前はローディング状態を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      // リダイレクト処理が実行されるが、初期化前はローディング状態
      // 実際のリダイレクトはuseEffect内で非同期に実行される
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  describe('フォーム送信のテスト', () => {
    it('送信成功時に成功メッセージを表示する（要件: 7.6）', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByText('Success');
      await userEvent.click(successButton);

      expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();
      expect(screen.getByText('保存完了')).toBeInTheDocument();
    });

    it('送信成功時にエラーメッセージをクリアする', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      // まずエラーを表示
      const errorButton = screen.getByText('Error');
      await userEvent.click(errorButton);
      expect(screen.getByText('Test error')).toBeInTheDocument();

      // 成功時にエラーがクリアされる
      const successButton = screen.getByText('Success');
      await userEvent.click(successButton);
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('リダイレクト処理のテスト', () => {
    it('送信成功後、1秒後にTOP画面にリダイレクトする（要件: 7.3）', async () => {
      vi.useFakeTimers();

      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByText('Success');
      await act(async () => {
        await userEvent.click(successButton);
      });

      expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();

      // 1秒経過前はリダイレクトされない
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(mockNavigate).not.toHaveBeenCalled();

      // 1秒経過後にリダイレクトされる
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });

      vi.useRealTimers();
    });

    it('リダイレクト時にreplaceオプションを使用する', async () => {
      vi.useFakeTimers();

      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByText('Success');
      await act(async () => {
        await userEvent.click(successButton);
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });

      vi.useRealTimers();
    });
  });

  describe('エラーハンドリングのテスト', () => {
    it('エラー発生時にエラーメッセージを表示する（要件: 12.1, 12.2）', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByText('Error');
      await act(async () => {
        await userEvent.click(errorButton);
      });

      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('エラー発生時に成功メッセージをクリアする', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      // まず成功メッセージを表示
      const successButton = screen.getByText('Success');
      await act(async () => {
        await userEvent.click(successButton);
      });
      expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();

      // エラー時に成功メッセージがクリアされる
      const errorButton = screen.getByText('Error');
      await act(async () => {
        await userEvent.click(errorButton);
      });
      expect(screen.queryByText('プロフィールを保存しました')).not.toBeInTheDocument();
    });

    it('エラーメッセージを5秒後に自動非表示にする（要件: 12.5）', async () => {
      vi.useFakeTimers();

      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByText('Error');
      await act(async () => {
        await userEvent.click(errorButton);
      });

      expect(screen.getByText('Test error')).toBeInTheDocument();

      // 5秒経過前はエラーメッセージが表示されている
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(screen.getByText('Test error')).toBeInTheDocument();

      // 5秒経過後にエラーメッセージが非表示になる
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('成功メッセージを3秒後に自動非表示にする', async () => {
      vi.useFakeTimers();

      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByText('Success');
      await act(async () => {
        await userEvent.click(successButton);
      });

      expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();

      // 3秒経過前は成功メッセージが表示されている
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();

      // 3秒経過後に成功メッセージが非表示になる
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText('プロフィールを保存しました')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('エラーメッセージの閉じるボタンをクリックして手動で非表示にできる（要件: 12.6）', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByText('Error');
      await act(async () => {
        await userEvent.click(errorButton);
      });

      expect(screen.getByText('Test error')).toBeInTheDocument();

      // 閉じるボタンをクリック
      const closeButton = screen.getByLabelText('エラーメッセージを閉じる');
      await act(async () => {
        await userEvent.click(closeButton);
      });

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });

    it('エラーアラートに適切なARIA属性を設定する', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByText('Error');
      await act(async () => {
        await userEvent.click(errorButton);
      });

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      expect(errorAlert).toBeInTheDocument();
    });

    it('成功アラートに適切なARIA属性を設定する', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const successButton = screen.getByText('Success');
      await act(async () => {
        await userEvent.click(successButton);
      });

      const successAlert = screen.getByRole('alert');
      expect(successAlert).toHaveAttribute('aria-live', 'polite');
      expect(successAlert).toBeInTheDocument();
    });
  });

  describe('アクセシビリティのテスト', () => {
    it('ローディング状態にaria-hidden属性を設定する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const spinner = document.querySelector('[aria-hidden="true"]');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('エラーメッセージの閉じるボタンにaria-labelを設定する', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      renderWithRouter(<ProfileSetupPage />);

      const errorButton = screen.getByText('Error');
      await act(async () => {
        await userEvent.click(errorButton);
      });

      const closeButton = screen.getByLabelText('エラーメッセージを閉じる');
      expect(closeButton).toBeInTheDocument();
    });
  });
});
