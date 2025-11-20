import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter, Routes } from 'react-router-dom';
import { AppRouter } from './AppRouter';
import { AuthProvider } from '../components/auth/AuthProvider';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { createMockAuthUser } from '../test/types/mock-types';

// Amplifyのモック
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));

// 環境変数のモック
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_COGNITO_USER_POOL_ID: 'test-pool-id',
    VITE_COGNITO_USER_POOL_CLIENT_ID: 'test-client-id',
    VITE_AWS_REGION: 'ap-northeast-1',
  },
});

// LazyPagesのモック
vi.mock('../pages/LazyPages', () => ({
  LazyLoginPage: () => <div>ログイン画面</div>,
  LazySignupPage: () => <div>サインアップ画面</div>,
  LazyPasswordResetPage: () => <div>パスワードリセット画面</div>,
  LazyDashboardPage: () => <div>ダッシュボード画面</div>,
  LazyMandalaPage: () => <div>マンダラ画面</div>,
  LazyProfilePage: () => <div>プロフィール画面</div>,
  LazyProfileSetupPage: () => <div>プロフィール設定画面</div>,
  LazyMandalaListPage: () => <div>マンダラ一覧画面</div>,
  LazyGoalInputPage: () => <div>目標入力画面</div>,
  LazySubGoalEditPage: () => <div>サブ目標編集画面</div>,
  LazyActionEditPage: () => <div>アクション編集画面</div>,
  LazyProcessingPage: () => <div>処理中画面</div>,
  LazyNotFoundPage: () => <div>404画面</div>,
}));

// LazyLoaderのモック
vi.mock('../components/common/LazyLoader', () => ({
  LazyLoader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// AuthStateMonitorProviderのモック
vi.mock('../components/auth/AuthStateMonitorProvider', () => ({
  AuthStateMonitorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('AppRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的なルーティング', () => {
    it('認証状態確認中にローディング画面を表示する', async () => {
      const { getCurrentUser } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockImplementation(
        () => new Promise(() => {}) // 永遠に解決しないPromise
      );

      render(<AppRouter />);

      // ローディング画面が表示されることを確認
      expect(screen.getByText('認証状況を確認中...')).toBeInTheDocument();
    });

    it('未認証の場合にログイン画面にリダイレクトする', async () => {
      const { getCurrentUser } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

      render(<AppRouter />);

      // 最終的にログイン画面が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン画面')).toBeInTheDocument();
      });
    });
  });

  describe('ルート遷移のテスト', () => {
    it('TOP画面（/）にアクセスできる', async () => {
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
      vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ一覧画面')).toBeInTheDocument();
      });
    });

    it('マンダラ詳細画面（/mandala/:id）にアクセスできる', async () => {
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
      vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

      render(
        <MemoryRouter initialEntries={['/mandala/test-id']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ画面')).toBeInTheDocument();
      });
    });

    it('目標入力画面（/mandala/create/goal）にアクセスできる', async () => {
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
      vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

      render(
        <MemoryRouter initialEntries={['/mandala/create/goal']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('目標入力画面')).toBeInTheDocument();
      });
    });

    it('存在しないパスで404画面を表示する', async () => {
      render(
        <MemoryRouter initialEntries={['/non-existent-path']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('404画面')).toBeInTheDocument();
      });
    });
  });

  describe('認証ガードのテスト', () => {
    it('未認証ユーザーは保護されたルートにアクセスできない', async () => {
      const { getCurrentUser } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      // ログイン画面にリダイレクトされることを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン画面')).toBeInTheDocument();
      });
    });

    it('認証済みユーザーは保護されたルートにアクセスできる', async () => {
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
      vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ一覧画面')).toBeInTheDocument();
      });
    });

    it('認証済みユーザーがログイン画面にアクセスするとリダイレクトされる', async () => {
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
      vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AppRouter />
        </MemoryRouter>
      );

      // ダッシュボードにリダイレクトされることを確認
      await waitFor(() => {
        expect(screen.queryByText('ログイン画面')).not.toBeInTheDocument();
      });
    });
  });

  describe('プロフィール設定チェックのテスト', () => {
    it('プロフィール未設定ユーザーはプロフィール設定画面にリダイレクトされる', async () => {
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
      vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

      // useAuthフックをモックしてプロフィール未設定状態をシミュレート
      vi.mock('../hooks/useAuth', () => ({
        useAuth: () => ({
          user: { profileSetup: false },
          isAuthenticated: true,
          isLoading: false,
        }),
      }));

      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <div>マンダラ一覧画面</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/profile/setup" element={<div>プロフィール設定画面</div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('プロフィール設定画面')).toBeInTheDocument();
      });
    });

    it('プロフィール設定済みユーザーは通常のルートにアクセスできる', async () => {
      const { getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser());
      vi.mocked(fetchAuthSession).mockResolvedValue(createMockAuthSession());

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRouter />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ一覧画面')).toBeInTheDocument();
      });
    });

    it('プロフィール設定画面（/profile/setup）は認証が必要', async () => {
      const { getCurrentUser } = await import('aws-amplify/auth');
      vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <AppRouter />
        </MemoryRouter>
      );

      // ログイン画面にリダイレクトされることを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン画面')).toBeInTheDocument();
      });
    });
  });
});
