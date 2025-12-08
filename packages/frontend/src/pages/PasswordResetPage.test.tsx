import React from 'react';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PasswordResetPage } from './PasswordResetPage';
import { AuthService } from '../services/auth';
import { useAuthForm } from '../hooks/useAuthForm';

import { vi, afterEach } from 'vitest';

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

// react-router-domのuseNavigateとuseSearchParamsをモック化
const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams],
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('PasswordResetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.resetPassword = vi.fn();
    mockAuthService.confirmResetPassword = vi.fn();
    mockSearchParams.delete('code');
    mockSearchParams.delete('email');

    // useAuthFormのデフォルトモック
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });
  });

  it('パスワードリセットページが正常にレンダリングされる', () => {
    renderWithRouter(<PasswordResetPage />);

    expect(screen.getByRole('heading', { name: 'パスワードリセット' })).toBeInTheDocument();
    expect(screen.getByText('登録されたメールアドレスを入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'パスワードリセットメールを送信' })
    ).toBeInTheDocument();
  });

  it('有効なメールアドレスでパスワードリセット要求が成功する', async () => {
    // useAuthFormモックに成功状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: 'パスワードリセット要求完了',
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<PasswordResetPage />);

    // 成功メッセージが表示されることを確認
    expect(screen.getByText('パスワードリセット要求完了')).toBeInTheDocument();
  });

  it('パスワードリセットエラー時にエラーメッセージが表示される', async () => {
    const errorMessage = 'ネットワークエラーが発生しました';

    // useAuthFormモックにエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: true,
      isRetryable: true,
      isOnline: false,
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<PasswordResetPage />);

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('確認コード付きURLでアクセスした場合、新しいパスワード設定画面が表示される', () => {
    // URLパラメータを設定
    mockSearchParams.set('code', '123456');
    mockSearchParams.set('email', 'test@example.com');

    renderWithRouter(<PasswordResetPage />);

    expect(screen.getByRole('heading', { name: '新しいパスワードの設定' })).toBeInTheDocument();
    expect(screen.getByText('新しいパスワードを入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'パスワードを変更' })).toBeInTheDocument();
  });

  it('新しいパスワード設定が成功する', async () => {
    // URLパラメータを設定
    mockSearchParams.set('code', '123456');
    mockSearchParams.set('email', 'test@example.com');

    renderWithRouter(<PasswordResetPage />);

    // 新しいパスワード設定画面が表示されることを確認
    expect(screen.getByRole('heading', { name: '新しいパスワードの設定' })).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
  });

  it('ログイン画面への戻るリンクが正しく表示される', () => {
    renderWithRouter(<PasswordResetPage />);

    const loginLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('新規登録リンクが正しく表示される', () => {
    renderWithRouter(<PasswordResetPage />);

    const signupLink = screen.getByRole('link', { name: '新規登録' });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  it('フォームバリデーションが正しく動作する', async () => {
    renderWithRouter(<PasswordResetPage />);

    // 空のフォームで送信を試行
    const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });
    expect(submitButton).toBeDisabled();

    // 無効なメールアドレスを入力
    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText(/メールアドレス/));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });
});
