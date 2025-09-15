import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { AuthService } from '../services/auth';

// AuthServiceをモック化
vi.mock('../services/auth');
const mockAuthService = AuthService as any;

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

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('正常にレンダリングされる', () => {
    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument();
    expect(screen.getByText('アカウントにサインインしてください')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });

  it('有効な認証情報でログインが成功し、TOP画面にリダイレクトされる', async () => {
    const user = userEvent.setup();
    mockAuthService.signIn.mockResolvedValue();

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // フォームが有効になるまで待機
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('認証エラー時にエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    const errorMessage = 'メールアドレスまたはパスワードが正しくありません';
    mockAuthService.signIn.mockRejectedValue({ message: errorMessage });

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('ネットワークエラー時にデフォルトエラーメッセージが表示される', async () => {
    const user = userEvent.setup();
    mockAuthService.signIn.mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('ログインに失敗しました。しばらく待ってから再試行してください。')
      ).toBeInTheDocument();
    });
  });

  it('ローディング状態が正しく表示される', async () => {
    const user = userEvent.setup();
    // signInを遅延させてローディング状態をテスト
    mockAuthService.signIn.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    await user.click(submitButton);

    // ローディング状態を確認
    const loadingButton = screen.getByRole('button');
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(loadingButton).toHaveTextContent('ログイン中...');

    // ローディング完了まで待機
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    });
  });

  it('エラー後に再度ログインを試行できる', async () => {
    const user = userEvent.setup();

    // 最初は失敗
    mockAuthService.signIn.mockRejectedValueOnce({ message: 'エラーが発生しました' });
    // 2回目は成功
    mockAuthService.signIn.mockResolvedValueOnce();

    render(
      <TestWrapper>
        <LoginPage />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText('メールアドレス');
    const passwordInput = screen.getByLabelText('パスワード');
    const submitButton = screen.getByRole('button', { name: 'ログイン' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // 最初のログイン試行（失敗）
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    // 再度ログイン試行（成功）
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    // エラーメッセージがクリアされることを確認
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument();
  });
});
