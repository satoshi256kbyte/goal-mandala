import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { LoginPage } from '../../pages/LoginPage';
import { SignupPage } from '../../pages/SignupPage';

// AWS Amplifyをモック化
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

import { signIn, signUp, getCurrentUser } from 'aws-amplify/auth';

// テスト用のダッシュボードコンポーネント
const Dashboard = () => <div>ダッシュボード</div>;

// テスト用のアプリケーションコンポーネント
const TestApp = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<div>ホーム</div>} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

describe('認証統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで未認証状態
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
  });

  describe('認証フロー統合テスト', () => {
    it('未認証ユーザーが保護されたルートにアクセスしようとするとログインページにリダイレクトされる', async () => {
      // 保護されたルートに直接アクセス
      window.history.pushState({}, '', '/dashboard');

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('ログイン')).toBeInTheDocument();
      });

      // ダッシュボードは表示されない
      expect(screen.queryByText('ダッシュボード')).not.toBeInTheDocument();
    });

    it('認証済みユーザーが公開ルートにアクセスするとダッシュボードにリダイレクトされる', async () => {
      // 認証済み状態をモック
      const mockUser = {
        username: 'test@example.com',
        attributes: { email: 'test@example.com' },
      };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      // ログインページに直接アクセス
      window.history.pushState({}, '', '/login');

      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      });

      // ログインページは表示されない
      expect(screen.queryByText('ログイン')).not.toBeInTheDocument();
    });

    it('ログイン成功後にダッシュボードにリダイレクトされる', async () => {
      const user = userEvent.setup();

      // 最初は未認証
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
      vi.mocked(signIn).mockResolvedValue({} as any);

      window.history.pushState({}, '', '/login');
      render(<TestApp />);

      // ログインフォームが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン')).toBeInTheDocument();
      });

      // ログイン情報を入力
      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');
      const submitButton = screen.getByRole('button', { name: 'ログイン' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // ログイン成功後の状態をモック
      const mockUser = {
        username: 'test@example.com',
        attributes: { email: 'test@example.com' },
      };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      await user.click(submitButton);

      // ダッシュボードにリダイレクトされることを確認
      await waitFor(
        () => {
          expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('サインアップ成功後にログインページにリダイレクトされる', async () => {
      const user = userEvent.setup();

      vi.mocked(signUp).mockResolvedValue({} as any);

      window.history.pushState({}, '', '/signup');
      render(<TestApp />);

      // サインアップフォームが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('アカウント作成')).toBeInTheDocument();
      });

      // サインアップ情報を入力
      await user.type(screen.getByLabelText('名前'), '山田太郎');
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'Password123');
      await user.type(screen.getByLabelText('パスワード確認'), 'Password123');

      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      // サインアップ成功メッセージまたはログインページへのリダイレクトを確認
      await waitFor(
        () => {
          expect(
            screen.getByText(/アカウントが作成されました/) || screen.getByText('ログイン')
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe('エラーハンドリング統合テスト', () => {
    it('ログインエラーが適切に表示される', async () => {
      const user = userEvent.setup();

      const mockError = { code: 'NotAuthorizedException' };
      vi.mocked(signIn).mockRejectedValue(mockError);

      window.history.pushState({}, '', '/login');
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('ログイン')).toBeInTheDocument();
      });

      // 無効な認証情報を入力
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'wrongpassword');

      const submitButton = screen.getByRole('button', { name: 'ログイン' });
      await user.click(submitButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText('メールアドレスまたはパスワードが正しくありません')
        ).toBeInTheDocument();
      });
    });

    it('サインアップエラーが適切に表示される', async () => {
      const user = userEvent.setup();

      const mockError = { code: 'UsernameExistsException' };
      vi.mocked(signUp).mockRejectedValue(mockError);

      window.history.pushState({}, '', '/signup');
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('アカウント作成')).toBeInTheDocument();
      });

      // 既存のメールアドレスでサインアップを試行
      await user.type(screen.getByLabelText('名前'), '山田太郎');
      await user.type(screen.getByLabelText('メールアドレス'), 'existing@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'Password123');
      await user.type(screen.getByLabelText('パスワード確認'), 'Password123');

      const submitButton = screen.getByRole('button', { name: 'アカウント作成' });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      await user.click(submitButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('このメールアドレスは既に登録されています')).toBeInTheDocument();
      });
    });
  });

  describe('ナビゲーション統合テスト', () => {
    it('ログインページからサインアップページへのナビゲーションが正しく動作する', async () => {
      const user = userEvent.setup();

      window.history.pushState({}, '', '/login');
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('ログイン')).toBeInTheDocument();
      });

      // サインアップリンクをクリック
      const signupLink = screen.getByRole('link', { name: '新規登録' });
      await user.click(signupLink);

      // サインアップページに遷移することを確認
      await waitFor(() => {
        expect(screen.getByText('アカウント作成')).toBeInTheDocument();
      });
    });

    it('サインアップページからログインページへのナビゲーションが正しく動作する', async () => {
      const user = userEvent.setup();

      window.history.pushState({}, '', '/signup');
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('アカウント作成')).toBeInTheDocument();
      });

      // ログインリンクをクリック
      const loginLink = screen.getByRole('link', { name: 'ログイン' });
      await user.click(loginLink);

      // ログインページに遷移することを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン')).toBeInTheDocument();
      });
    });
  });

  describe('認証状態の永続化テスト', () => {
    it('ページリロード後も認証状態が維持される', async () => {
      // 認証済み状態をモック
      const mockUser = {
        username: 'test@example.com',
        attributes: { email: 'test@example.com' },
      };
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

      window.history.pushState({}, '', '/dashboard');
      render(<TestApp />);

      // ダッシュボードが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      });

      // コンポーネントを再レンダリング（ページリロードをシミュレート）
      render(<TestApp />);

      // 認証状態が維持されていることを確認
      await waitFor(() => {
        expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ統合テスト', () => {
    it('キーボードナビゲーションが全体を通して正しく動作する', async () => {
      const user = userEvent.setup();

      window.history.pushState({}, '', '/login');
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('ログイン')).toBeInTheDocument();
      });

      // Tabキーでフォーカス移動
      await user.tab();
      expect(screen.getByLabelText('メールアドレス')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('パスワード')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: 'ログイン' })).toHaveFocus();
    });

    it('エラーメッセージがスクリーンリーダーに適切に伝えられる', async () => {
      const user = userEvent.setup();

      const mockError = { code: 'NotAuthorizedException' };
      vi.mocked(signIn).mockRejectedValue(mockError);

      window.history.pushState({}, '', '/login');
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('ログイン')).toBeInTheDocument();
      });

      // 無効な認証情報でログインを試行
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      // エラーメッセージがaria-live属性付きで表示されることを確認
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});
