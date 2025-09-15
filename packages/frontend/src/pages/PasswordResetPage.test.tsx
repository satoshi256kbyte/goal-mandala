import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PasswordResetPage } from './PasswordResetPage';
import { AuthService } from '../services/auth';

import { vi } from 'vitest';

// AuthServiceをモック化
vi.mock('../services/auth');
const mockAuthService = AuthService as any;

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

describe('PasswordResetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.resetPassword = vi.fn();
    mockAuthService.confirmResetPassword = vi.fn();
    mockSearchParams.delete('code');
    mockSearchParams.delete('email');
  });

  it('パスワードリセットページが正常にレンダリングされる', () => {
    renderWithRouter(<PasswordResetPage />);

    expect(screen.getByRole('heading', { name: 'パスワードリセット' })).toBeInTheDocument();
    expect(screen.getByText('登録されたメールアドレスを入力してください')).toBeInTheDocument();
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'パスワードリセットメールを送信' })
    ).toBeInTheDocument();
  });

  it('有効なメールアドレスでパスワードリセット要求が成功する', async () => {
    mockAuthService.resetPassword.mockResolvedValueOnce();

    renderWithRouter(<PasswordResetPage />);

    // メールアドレスを入力
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' },
    });

    // パスワードリセットボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: 'パスワードリセットメールを送信' }));

    // AuthService.resetPasswordが正しい引数で呼ばれることを確認
    await waitFor(() => {
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test@example.com');
    });

    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('パスワードリセット要求完了')).toBeInTheDocument();
      expect(screen.getByText('確認メールを送信しました')).toBeInTheDocument();
    });
  });

  it('パスワードリセットエラー時にエラーメッセージが表示される', async () => {
    const errorMessage = 'ネットワークエラーが発生しました';
    mockAuthService.resetPassword.mockRejectedValueOnce({ message: errorMessage });

    renderWithRouter(<PasswordResetPage />);

    // メールアドレスを入力
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'test@example.com' },
    });

    // パスワードリセットボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: 'パスワードリセットメールを送信' }));

    // エラーメッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
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
    mockAuthService.confirmResetPassword.mockResolvedValueOnce();

    // URLパラメータを設定
    mockSearchParams.set('code', '123456');
    mockSearchParams.set('email', 'test@example.com');

    renderWithRouter(<PasswordResetPage />);

    // 新しいパスワードを入力
    fireEvent.change(screen.getByLabelText('新しいパスワード'), {
      target: { value: 'NewPassword123' },
    });
    fireEvent.change(screen.getByLabelText('パスワード確認'), {
      target: { value: 'NewPassword123' },
    });

    // パスワード変更ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: 'パスワードを変更' }));

    // AuthService.confirmResetPasswordが正しい引数で呼ばれることを確認
    await waitFor(() => {
      expect(mockAuthService.confirmResetPassword).toHaveBeenCalledWith(
        'test@example.com',
        '123456',
        'NewPassword123'
      );
    });

    // 成功メッセージが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('パスワード変更完了')).toBeInTheDocument();
      expect(screen.getByText('パスワードが正常に変更されました')).toBeInTheDocument();
    });
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
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.blur(screen.getByLabelText('メールアドレス'));

    await waitFor(() => {
      expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
    });
  });
});
