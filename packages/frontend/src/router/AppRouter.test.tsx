import React from 'react';
import { render, cleanup, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter, Routes } from 'react-router-dom';
import { Route } from 'react-router-dom';
import { AppRoutes } from './AppRouter';
import { AuthProvider } from '../components/auth/AuthProvider';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { createMockAuthUser } from '../test/types/mock-types';

// createMockAuthSessionヘルパー関数
const createMockAuthSession = () => ({
  tokens: {
    accessToken: { toString: () => 'mock-access-token' },
    idToken: { toString: () => 'mock-id-token' },
  },
  credentials: {
    accessKeyId: 'mock-access-key',
    secretAccessKey: 'mock-secret-key',
  },
});

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

// useAuthのモック（テストごとに設定可能）
const mockUseAuth = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthContext: { Provider: ({ children }: any) => children },
  useAuthContext: () => mockUseAuth(),
}));

// AuthProviderのモック（useAuthを使用）
vi.mock('../components/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('AppRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本的なルーティング', () => {
    it('認証状態確認中にローディング画面を表示する', async () => {
      // ローディング中の状態をモック
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AppRoutes />
        </MemoryRouter>
      );

      // ローディング画面が表示されることを確認
      expect(screen.getByText('認証状況を確認中...')).toBeInTheDocument();
    });

    it('未認証の場合にログイン画面にリダイレクトする', async () => {
      // 未認証状態をモック
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      // 最終的にログイン画面が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン画面')).toBeInTheDocument();
      });
    });
  });

  describe('ルート遷移のテスト', () => {
    beforeEach(() => {
      // 認証済み状態をモック
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });
    });

    it('TOP画面（/）にアクセスできる', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ一覧画面')).toBeInTheDocument();
      });
    });

    it('マンダラ詳細画面（/mandala/:id）にアクセスできる', async () => {
      render(
        <MemoryRouter initialEntries={['/mandala/test-id']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ画面')).toBeInTheDocument();
      });
    });

    it('目標入力画面（/mandala/create/goal）にアクセスできる', async () => {
      render(
        <MemoryRouter initialEntries={['/mandala/create/goal']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('目標入力画面')).toBeInTheDocument();
      });
    });

    it('存在しないパスで404画面を表示する', async () => {
      render(
        <MemoryRouter initialEntries={['/non-existent-path']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('404画面')).toBeInTheDocument();
      });
    });
  });

  describe('認証ガードのテスト', () => {
    it('未認証ユーザーは保護されたルートにアクセスできない', async () => {
      // 未認証状態をモック
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      // ログイン画面にリダイレクトされることを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン画面')).toBeInTheDocument();
      });
    });

    it('認証済みユーザーは保護されたルートにアクセスできる', async () => {
      // 認証済み状態をモック
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ一覧画面')).toBeInTheDocument();
      });
    });

    it('認証済みユーザーがログイン画面にアクセスするとリダイレクトされる', async () => {
      // 認証済み状態をモック
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
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
      // プロフィール未設定の認証済み状態をモック
      mockUseAuth.mockReturnValue({
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          profileSetup: false,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('プロフィール設定画面')).toBeInTheDocument();
      });
    });

    it('プロフィール設定済みユーザーは通常のルートにアクセスできる', async () => {
      // プロフィール設定済みの認証済み状態をモック
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('マンダラ一覧画面')).toBeInTheDocument();
      });
    });

    it('プロフィール設定画面（/profile/setup）は認証が必要', async () => {
      // 未認証状態をモック
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        clearError: vi.fn(),
        addAuthStateListener: vi.fn(() => vi.fn()),
        isTokenExpired: vi.fn(() => false),
        getTokenExpirationTime: vi.fn(() => null),
        refreshToken: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <AppRoutes />
        </MemoryRouter>
      );

      // ログイン画面にリダイレクトされることを確認
      await waitFor(() => {
        expect(screen.getByText('ログイン画面')).toBeInTheDocument();
      });
    });
  });
});
