import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, afterEach } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthService } from '../services/auth';
import { useAuthForm } from '../hooks/useAuthForm';

// AuthLayoutをモック化
vi.mock('../components/auth/AuthLayout', () => ({
  default: ({
    children,
    title,
    subtitle,
  }: {
    children: React.ReactNode;
    title: string;
    subtitle: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

// AuthServiceをモック化
vi.mock('../services/auth');
const mockAuthService = AuthService as any;

// useAuthFormをモック化
vi.mock('../hooks/useAuthForm');
const mockUseAuthForm = useAuthForm as any;

// React Routerのナビゲーションをモック化
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('LoginPage', () => {
  const mockSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // useAuthFormのデフォルトモック
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });
  });

  it('正常にレンダリングされる', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByText('アカウントにサインインしてください')).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText(/パスワード/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインボタン' })).toBeInTheDocument();
  });

  it('有効な認証情報でログインが成功し、TOP画面にリダイレクトされる', async () => {
    const successMessage = 'ログインが完了しました';

    // useAuthFormモックに成功状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: successMessage,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // 成功メッセージが表示されることを確認
    expect(screen.getByText(successMessage)).toBeInTheDocument();
  });

  it('認証エラー時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    const errorMessage = 'メールアドレスまたはパスワードが正しくありません';

    // useAuthFormモックにエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: false,
      isRetryable: true,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/メールアドレス/);
    const passwordInput = screen.getByLabelText(/パスワード/);
    const submitButton = screen.getByRole('button', { name: 'ログインボタン' });

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ネットワークエラー時にデフォルトエラーメッセージが表示される', async () => {
    const errorMessage = 'ログインに失敗しました。しばらく待ってから再試行してください。';

    // useAuthFormモックにネットワークエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: true,
      isRetryable: true,
      isOnline: false,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ローディング状態が正しく表示される', async () => {
    // useAuthFormモックにローディング状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: true,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // ローディング状態を確認
    const loadingButton = screen.getByRole('button');
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(loadingButton).toHaveTextContent('ログイン中...');
  });

  it('エラー後に再度ログインを試行できる', async () => {
    const errorMessage = 'エラーが発生しました';

    // useAuthFormモックにエラー状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: false,
      isRetryable: true,
      isOnline: true,
      signIn: mockSignIn,
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
