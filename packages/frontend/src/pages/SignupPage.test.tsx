import React from 'react';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SignupPage } from './SignupPage';
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

// react-router-domのuseNavigateをモック化
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
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

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.signUp = vi.fn();

    // useAuthFormのデフォルトモック
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signUp: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });
  });

  it('サインアップページが正常にレンダリングされる', () => {
    renderWithRouter(<SignupPage />);

    expect(screen.getByRole('heading', { name: '新規登録' })).toBeInTheDocument();
    expect(screen.getByText('アカウントを作成してください')).toBeInTheDocument();
    expect(screen.getByLabelText(/名前/)).toBeInTheDocument();
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード', { selector: '#password' })).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アカウント作成' })).toBeInTheDocument();
  });

  it('有効な情報でサインアップが成功する', async () => {
    // useAuthFormモックに成功状態を設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: 'アカウント作成完了',
      error: null,
      isNetworkError: false,
      isRetryable: false,
      isOnline: true,
      signUp: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<SignupPage />);

    // 成功メッセージが表示されることを確認
    expect(screen.getByText('アカウント作成完了')).toBeInTheDocument();
  });

  it('サインアップエラー時にエラーメッセージが表示される', async () => {
    const errorMessage = 'このメールアドレスは既に登録されています';

    // useAuthFormモックにエラーを設定
    mockUseAuthForm.mockReturnValue({
      isLoading: false,
      successMessage: null,
      error: errorMessage,
      isNetworkError: false,
      isRetryable: true,
      isOnline: true,
      signUp: vi.fn(),
      clearError: vi.fn(),
      clearSuccess: vi.fn(),
      retry: vi.fn(),
    });

    renderWithRouter(<SignupPage />);

    // エラーメッセージが表示されることを確認
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('ログインリンクが正しく表示される', () => {
    renderWithRouter(<SignupPage />);

    const loginLink = screen.getByRole('link', { name: 'ログイン' });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('フォームバリデーションが正しく動作する', async () => {
    renderWithRouter(<SignupPage />);

    // 空のフォームで送信を試行
    const submitButton = screen.getByRole('button', { name: 'アカウント作成' });
    expect(submitButton).toBeDisabled();

    // 無効なメールアドレスを入力
    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText(/メールアドレス/));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });

    // パスワードが一致しない場合
    fireEvent.change(screen.getByLabelText('パスワード', { selector: '#password' }), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText('パスワード確認'), {
      target: { value: 'DifferentPassword' },
    });

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });
});
