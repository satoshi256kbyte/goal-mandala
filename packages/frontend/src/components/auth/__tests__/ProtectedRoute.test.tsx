import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '../../../hooks/useAuth';

// Mock the auth hook
vi.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as any;

const TestComponent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;
const ProfileSetupPage = () => <div>Profile Setup Page</div>;
const HomePage = () => <div>Home Page</div>;

const renderWithRouter = (_initialEntries: string[] = ['/']) => {
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile/setup" element={<ProfileSetupPage />} />
        <Route path="/" element={<HomePage />} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <TestComponent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/protected-no-profile"
          element={
            <ProtectedRoute requireProfileSetup={false}>
              <TestComponent />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading while checking authentication', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });

    renderWithRouter(['/protected']);

    expect(screen.getByText('認証状況を確認中...')).toBeInTheDocument();
  });

  it('should redirect to login if not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    renderWithRouter(['/protected']);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should redirect to profile setup if profile not set up', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', profileSetup: false },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(['/protected']);

    expect(screen.getByText('Profile Setup Page')).toBeInTheDocument();
  });

  it('should render protected content if authenticated and profile set up', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', profileSetup: true },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(['/protected']);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should render content if profile setup not required', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', profileSetup: false },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(['/protected-no-profile']);

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to home if accessing profile setup with completed profile', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', profileSetup: true },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(['/profile/setup']);

    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('should allow access to profile setup if profile not completed', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com', profileSetup: false },
      isAuthenticated: true,
      isLoading: false,
    });

    renderWithRouter(['/profile/setup']);

    expect(screen.getByText('Profile Setup Page')).toBeInTheDocument();
  });

  it('should handle requireAuth=false', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute requireAuth={false}>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
