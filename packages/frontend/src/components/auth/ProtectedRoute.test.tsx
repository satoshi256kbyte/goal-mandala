import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthContext } from '../../hooks/useAuth';
import type { AuthContextType } from '../../hooks/useAuth';

// モックの認証コンテキスト作成ヘルパー
const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  isAuthenticated: false,
  isLoading: false,
  user: null,
  error: null,
  tokenExpirationTime: null,
  lastActivity: null,
  sessionId: null,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  clearError: vi.fn(),
  checkAuthState: vi.fn(),
  refreshToken: vi.fn(),
  isTokenExpired: vi.fn(),
  getTokenExpirationTime: vi.fn(),
  addAuthStateListener: vi.fn(),
  removeAuthStateListener: vi.fn(),
  ...overrides,
});

// テスト用コンポーネント
const TestComponent = () => <div>Protected Content</div>;

// テスト用ラッパー
const renderWithRouter = (
  component: React.ReactElement,
  authContext: AuthContextType,
  initialEntries = ['/protected']
) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthContext.Provider value={authContext}>{component}</AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  it('ローディング中はデフォルトのスピナーを表示する', () => {
    const authContext = createMockAuthContext({
      isLoading: true,
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      authContext
    );

    expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('ローディング中にカスタムフォールバックが提供された場合はそれを表示する', () => {
    const authContext = createMockAuthContext({
      isLoading: true,
    });

    const customFallback = <div>Custom Loading...</div>;

    renderWithRouter(
      <ProtectedRoute fallback={customFallback}>
        <TestComponent />
      </ProtectedRoute>,
      authContext
    );

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
    expect(screen.queryByText('認証状態を確認中...')).not.toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('未認証の場合はログイン画面にリダイレクトする', () => {
    const authContext = createMockAuthContext({
      isAuthenticated: false,
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      authContext
    );

    // リダイレクトが発生するため、Protected Contentは表示されない
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('未認証時にonUnauthorizedコールバックが呼ばれる', () => {
    const onUnauthorized = vi.fn();
    const authContext = createMockAuthContext({
      isAuthenticated: false,
      isLoading: false,
    });

    renderWithRouter(
      <ProtectedRoute onUnauthorized={onUnauthorized}>
        <TestComponent />
      </ProtectedRoute>,
      authContext
    );

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('認証済みの場合は子コンポーネントを表示する', () => {
    const authContext = createMockAuthContext({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', profileComplete: true },
    });

    renderWithRouter(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      authContext
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('プロフィール完了チェックが有効でプロフィールが完了している場合は子コンポーネントを表示する', () => {
    const authContext = createMockAuthContext({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', profileComplete: true },
    });

    renderWithRouter(
      <ProtectedRoute requiresProfile={true}>
        <TestComponent />
      </ProtectedRoute>,
      authContext
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('プロフィール完了チェックが有効でプロフィールが未完了の場合はプロフィール設定画面にリダイレクトする', () => {
    const authContext = createMockAuthContext({
      isAuthenticated: true,
      isLoading: false,
      user: { id: '1', email: 'test@example.com', profileComplete: false },
    });

    renderWithRouter(
      <ProtectedRoute requiresProfile={true}>
        <TestComponent />
      </ProtectedRoute>,
      authContext
    );

    // リダイレクトが発生するため、Protected Contentは表示されない
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
