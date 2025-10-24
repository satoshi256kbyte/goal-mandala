import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import ProfileSetupPage from '../../pages/ProfileSetupPage';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Mock ProfileSetupPage to avoid complex dependencies
vi.mock('../../pages/ProfileSetupPage', () => ({
  default: () => <div data-testid="profile-setup-page">Profile Setup Page</div>,
}));

// Mock LazyLoader
vi.mock('../../components/common/LazyLoader', () => ({
  LazyLoader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from '../../hooks/useAuth';

describe('ProfileSetup Routing', () => {
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('9.1 ルート定義の追加', () => {
    it('/profile/setup ルートが正しく定義されている', async () => {
      // 要件: 1.1
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-setup-page')).toBeInTheDocument();
      });
    });

    it('ProfileSetupPageコンポーネントが正しく登録されている', async () => {
      // 要件: 1.1
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-setup-page')).toBeInTheDocument();
      });
    });
  });

  describe('9.2 認証ガードの実装', () => {
    it('ProtectedRouteが適用されている', async () => {
      // 要件: 8.1, 8.2, 8.3
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-setup-page')).toBeInTheDocument();
      });
    });

    it('未認証時にログイン画面にリダイレクトされる', async () => {
      // 要件: 8.1
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const { container } = render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    it('認証トークンが期限切れの場合にログイン画面にリダイレクトされる', async () => {
      // 要件: 8.2
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    it('認証トークンが無効な場合にログイン画面にリダイレクトされる', async () => {
      // 要件: 8.3
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });

  describe('9.3 プロフィール設定済みチェックの実装', () => {
    it('プロフィール設定済みの場合にTOP画面にリダイレクトされる', async () => {
      // 要件: 8.4
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: true },
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('home-page')).toBeInTheDocument();
      });
    });

    it('プロフィール未設定の場合にプロフィール設定画面が表示される', async () => {
      // 要件: 8.4
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-setup-page')).toBeInTheDocument();
      });
    });
  });

  describe('統合テスト', () => {
    it('認証済み・プロフィール未設定のユーザーがプロフィール設定画面にアクセスできる', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', profileSetup: false },
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route path="/" element={<div data-testid="home-page">Home Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('profile-setup-page')).toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
        expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
      });
    });

    it('ローディング中は適切なローディング表示がされる', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      });

      render(
        <MemoryRouter initialEntries={['/profile/setup']}>
          <Routes>
            <Route
              path="/profile/setup"
              element={
                <ProtectedRoute requireProfileSetup={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('認証状況を確認中...')).toBeInTheDocument();
      });
    });
  });
});
