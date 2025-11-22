/**
 * Frontend パッケージの基本テスト
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import App from './App';

// AppRouterをモック
vi.mock('./router/AppRouter', () => ({
  AppRouter: () => <div data-testid="app-router">App Router</div>,
}));

// CSSインポートをモック
vi.mock('./index.css', () => ({}));

// 認証関連のサービスをモック
vi.mock('./services/auth', () => ({
  AuthService: {
    checkAuthState: vi.fn().mockResolvedValue(false),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    confirmResetPassword: vi.fn(),
    getCurrentSessionTyped: vi.fn().mockResolvedValue(null),
  },
}));

// トークンマネージャーをモック
vi.mock('./services/tokenManager', () => ({
  tokenManager: {
    getToken: vi.fn().mockReturnValue(null),
    isTokenExpired: vi.fn().mockReturnValue(false),
    getTokenExpirationTime: vi.fn().mockReturnValue(null),
    getLastActivity: vi.fn().mockReturnValue(null),
    getSessionId: vi.fn().mockReturnValue(null),
    saveToken: vi.fn(),
    removeTokens: vi.fn(),
    refreshToken: vi.fn(),
    updateLastActivity: vi.fn(),
  },
}));

// ストレージ同期をモック
vi.mock('./services/storage-sync', () => ({
  storageSync: {
    startSync: vi.fn(),
    stopSync: vi.fn(),
    onAuthStateChange: vi.fn(),
    removeAuthStateListener: vi.fn(),
    broadcastAuthStateChange: vi.fn(),
  },
}));

// エラーハンドラーをモック
vi.mock('./services/error-handler', () => ({
  authErrorHandler: {
    handleError: vi.fn().mockResolvedValue({
      code: 'TEST_ERROR',
      message: 'Test error',
      timestamp: new Date(),
      retryable: false,
    }),
  },
  ErrorCategory: {
    AUTHENTICATION: 'AUTHENTICATION',
  },
  ErrorSeverity: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });

  it('should render AppRouter', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('app-router')).toBeInTheDocument();
  });
});
