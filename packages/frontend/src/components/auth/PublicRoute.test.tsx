import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { PublicRoute } from './PublicRoute';
import { useAuthContext } from '../../hooks/useAuth';

// useAuthContextをモック
vi.mock('../../hooks/useAuth');
const mockUseAuthContext = vi.mocked(useAuthContext);

// Navigateコンポーネントをモック
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div data-testid="navigate" data-to={to} data-replace={replace}>
        Navigate to {to}
      </div>
    ),
  };
});

describe('PublicRoute', () => {
  const TestComponent = () => <div data-testid="test-component">Test Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ローディング状態', () => {
    it('ローディング中はスピナーを表示する', () => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        checkAuthState: vi.fn(),
      });

      render(
        <BrowserRouter>
          <PublicRoute>
            <TestComponent />
          </PublicRoute>
        </BrowserRouter>
      );

      expect(screen.getByText('認証状態を確認中...')).toBeInTheDocument();
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
    });
  });

  describe('未認証ユーザー', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        checkAuthState: vi.fn(),
      });
    });

    it('redirectIfAuthenticatedがfalseの場合、子コンポーネントを表示する', () => {
      render(
        <BrowserRouter>
          <PublicRoute redirectIfAuthenticated={false}>
            <TestComponent />
          </PublicRoute>
        </BrowserRouter>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('redirectIfAuthenticatedがtrueでも未認証なら子コンポーネントを表示する', () => {
      render(
        <BrowserRouter>
          <PublicRoute redirectIfAuthenticated={true}>
            <TestComponent />
          </PublicRoute>
        </BrowserRouter>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  describe('認証済みユーザー', () => {
    beforeEach(() => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        error: null,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        checkAuthState: vi.fn(),
      });
    });

    it('redirectIfAuthenticatedがfalseの場合、子コンポーネントを表示する', () => {
      render(
        <BrowserRouter>
          <PublicRoute redirectIfAuthenticated={false}>
            <TestComponent />
          </PublicRoute>
        </BrowserRouter>
      );

      expect(screen.getByTestId('test-component')).toBeInTheDocument();
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('redirectIfAuthenticatedがtrueの場合、デフォルトのリダイレクト先にリダイレクトする', () => {
      render(
        <BrowserRouter>
          <PublicRoute redirectIfAuthenticated={true}>
            <TestComponent />
          </PublicRoute>
        </BrowserRouter>
      );

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
    });

    it('redirectIfAuthenticatedがtrueの場合、カスタムリダイレクト先にリダイレクトする', () => {
      render(
        <BrowserRouter>
          <PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
            <TestComponent />
          </PublicRoute>
        </BrowserRouter>
      );

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard');
    });

    it('location.stateにfromがある場合、そのパスにリダイレクトする', () => {
      const initialEntries = [
        {
          pathname: '/login',
          state: { from: { pathname: '/profile' } },
        },
      ];

      render(
        <MemoryRouter initialEntries={initialEntries}>
          <PublicRoute redirectIfAuthenticated={true}>
            <TestComponent />
          </PublicRoute>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/profile');
    });
  });

  describe('要件3.3の検証', () => {
    it('認証済みユーザーがログイン画面にアクセスした時にダッシュボードにリダイレクトされる', () => {
      mockUseAuthContext.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        error: null,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        clearError: vi.fn(),
        checkAuthState: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <PublicRoute redirectIfAuthenticated={true} redirectTo="/dashboard">
            <TestComponent />
          </PublicRoute>
        </MemoryRouter>
      );

      // 子コンポーネントは表示されない
      expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();

      // ダッシュボードにリダイレクトされる
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard');
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-replace', 'true');
    });
  });
});
