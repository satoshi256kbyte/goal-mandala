import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { PasswordResetPage } from './PasswordResetPage';
import { AuthProvider } from '../components/auth/AuthProvider';

// AWS Amplifyをモック化
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

import { signIn, signUp, resetPassword } from 'aws-amplify/auth';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>{children}</AuthProvider>
  </BrowserRouter>
);

describe('認証ページ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LoginPage', () => {
    it('ログインページが正常にレンダリングされる', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByText('ログイン')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    });

    it('有効な認証情報でログインが成功する', async () => {
      const user = userEvent.setup();
      vi.mocked(signIn).mockResolvedValue({} as any);

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
        expect(signIn).toHaveBeenCalledWith({
          username: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('認証エラーが適切に表示される', async () => {
      const user = userEvent.setup();
      const mockError = { code: 'NotAuthorizedException' };
      vi.mocked(signIn).mockRejectedValue(mockError);

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
        expect(
          screen.getByText('メールアドレスまたはパスワードが正しくありません')
        ).toBeInTheDocument();
      });
    });
  });

  describe('SignupPage', () => {
    it('サインアップページが正常にレンダリングされる', () => {
      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>
      );

      expect(screen.getByText('アカウント作成')).toBeInTheDocument();
      expect(screen.getByLabelText('名前')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード確認')).toBeInTheDocument();
    });

    it('有効な情報でサインアップが成功する', async () => {
      const user = userEvent.setup();
      vi.mocked(signUp).mockResolvedValue({} as any);

      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText('名前'), '山田太郎');
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'Password123');
      await user.type(screen.getByLabelText('パスワード確認'), 'Password123');

      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(signUp).toHaveBeenCalledWith({
          username: 'test@example.com',
          password: 'Password123',
          options: {
            userAttributes: {
              email: 'test@example.com',
              name: '山田太郎',
            },
          },
        });
      });
    });

    it('パスワード不一致エラーが表示される', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>
      );

      await user.type(screen.getByLabelText('名前'), '山田太郎');
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'Password123');
      await user.type(screen.getByLabelText('パスワード確認'), 'DifferentPassword');

      await waitFor(() => {
        expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
      });
    });
  });

  describe('PasswordResetPage', () => {
    it('パスワードリセットページが正常にレンダリングされる', () => {
      render(
        <TestWrapper>
          <PasswordResetPage />
        </TestWrapper>
      );

      expect(screen.getByText('パスワードリセット')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'パスワードリセットメールを送信' })
      ).toBeInTheDocument();
    });

    it('有効なメールアドレスでリセット要求が成功する', async () => {
      const user = userEvent.setup();
      vi.mocked(resetPassword).mockResolvedValue({} as any);

      render(
        <TestWrapper>
          <PasswordResetPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('メールアドレス');
      const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });

      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(resetPassword).toHaveBeenCalledWith({
          username: 'test@example.com',
        });
      });
    });

    it('成功メッセージが表示される', async () => {
      const user = userEvent.setup();
      vi.mocked(resetPassword).mockResolvedValue({} as any);

      render(
        <TestWrapper>
          <PasswordResetPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('メールアドレス');
      const submitButton = screen.getByRole('button', { name: 'パスワードリセットメールを送信' });

      await user.type(emailInput, 'test@example.com');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/パスワードリセットメールを送信しました/)).toBeInTheDocument();
      });
    });
  });

  describe('ページ間ナビゲーション', () => {
    it('ログインページからサインアップページへのナビゲーション', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const signupLink = screen.getByRole('link', { name: '新規登録' });
      expect(signupLink).toHaveAttribute('href', '/signup');
    });

    it('サインアップページからログインページへのナビゲーション', () => {
      render(
        <TestWrapper>
          <SignupPage />
        </TestWrapper>
      );

      const loginLink = screen.getByRole('link', { name: 'ログイン' });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('ログインページからパスワードリセットページへのナビゲーション', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const resetLink = screen.getByText('パスワードを忘れた場合');
      expect(resetLink.closest('a')).toHaveAttribute('href', '/password-reset');
    });

    it('パスワードリセットページからログインページへの戻りナビゲーション', () => {
      render(
        <TestWrapper>
          <PasswordResetPage />
        </TestWrapper>
      );

      const backLink = screen.getByRole('link', { name: 'ログイン画面に戻る' });
      expect(backLink).toHaveAttribute('href', '/login');
    });
  });

  describe('アクセシビリティ', () => {
    it('フォーカス管理が適切に動作する', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();
    });

    it('エラーメッセージがスクリーンリーダーに適切に伝えられる', async () => {
      const user = userEvent.setup();
      const mockError = { code: 'NotAuthorizedException' };
      vi.mocked(signIn).mockRejectedValue(mockError);

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
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('モバイル表示でも適切にレンダリングされる', () => {
      // モバイルビューポートをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
      expect(screen.getByText('ログイン')).toBeInTheDocument();
    });
  });
});
