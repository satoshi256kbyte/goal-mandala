import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AuthProvider } from '../components/auth/AuthProvider';
import { useAuth } from './useAuth';

// AWS Amplifyをモック化
vi.mock('aws-amplify/auth', () => ({
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

import { getCurrentUser, signOut } from 'aws-amplify/auth';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期状態では未認証状態である', () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('認証済みユーザーの状態が正しく取得される', async () => {
    const mockUser = {
      username: 'test@example.com',
      attributes: {
        email: 'test@example.com',
        name: '山田太郎',
      },
    };

    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      // 認証状態の更新を待つ
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoading).toBe(false);
  });

  it('ログアウトが正しく動作する', async () => {
    const mockUser = {
      username: 'test@example.com',
      attributes: {
        email: 'test@example.com',
        name: '山田太郎',
      },
    };

    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(signOut).mockResolvedValue();

    const { result } = renderHook(() => useAuth(), { wrapper });

    // 最初に認証状態にする
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isAuthenticated).toBe(true);

    // ログアウト実行
    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('JWTトークンの取得が正しく動作する', async () => {
    const mockToken = 'mock-jwt-token';
    const mockSession = {
      tokens: {
        idToken: {
          toString: () => mockToken,
        },
      },
    };

    vi.mocked(fetchAuthSession).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const token = await result.current.getJwtToken();
      expect(token).toBe(mockToken);
    });

    expect(fetchAuthSession).toHaveBeenCalled();
  });

  it('認証エラーが正しく処理される', async () => {
    const mockError = new Error('Authentication failed');
    vi.mocked(getCurrentUser).mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('認証状態の更新が正しく動作する', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // 最初は未認証
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isAuthenticated).toBe(false);

    // 認証状態に変更
    const mockUser = {
      username: 'test@example.com',
      attributes: {
        email: 'test@example.com',
        name: '山田太郎',
      },
    };

    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);

    await act(async () => {
      await result.current.refreshAuth();
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('ローディング状態が正しく管理される', () => {
    vi.mocked(getCurrentUser).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({} as any), 100))
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it('セッションの有効性チェックが正しく動作する', async () => {
    const mockSession = {
      tokens: {
        idToken: {
          toString: () => 'valid-token',
        },
      },
    };

    vi.mocked(fetchAuthSession).mockResolvedValue(mockSession);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const isValid = await result.current.isSessionValid();
      expect(isValid).toBe(true);
    });
  });

  it('無効なセッションが正しく検出される', async () => {
    vi.mocked(fetchAuthSession).mockRejectedValue(new Error('Invalid session'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const isValid = await result.current.isSessionValid();
      expect(isValid).toBe(false);
    });
  });
});
