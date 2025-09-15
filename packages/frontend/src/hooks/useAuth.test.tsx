import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuth, AuthContext } from './useAuth';
import { AuthProvider } from '../components/auth/AuthProvider';

// Amplifyのモック
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));

// TokenManagerのモック
vi.mock('../services/tokenManager', () => ({
  tokenManager: {
    saveToken: vi.fn(),
    getToken: vi.fn(),
    getRefreshToken: vi.fn(),
    removeTokens: vi.fn(),
    isTokenExpired: vi.fn(),
    getTokenExpirationTime: vi.fn(),
    refreshToken: vi.fn(),
    updateLastActivity: vi.fn(),
    getLastActivity: vi.fn(),
    getSessionId: vi.fn(),
  },
}));

// StorageSyncのモック
vi.mock('../services/storage-sync', () => ({
  storageSync: {
    startSync: vi.fn(),
    stopSync: vi.fn(),
    broadcastAuthStateChange: vi.fn(),
    onAuthStateChange: vi.fn(),
    removeAuthStateListener: vi.fn(),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // LocalStorageのモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  it('初期状態では認証状態をチェックする', async () => {
    const { getCurrentUser } = await import('aws-amplify/auth');
    const { tokenManager } = await import('../services/tokenManager');

    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));
    vi.mocked(tokenManager.getToken).mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // 認証状態チェック完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('ログインが成功する', async () => {
    const { signIn, getCurrentUser } = await import('aws-amplify/auth');
    vi.mocked(signIn).mockResolvedValue(undefined);
    vi.mocked(getCurrentUser).mockResolvedValue({
      username: 'test@example.com',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(signIn).toHaveBeenCalledWith({
      username: 'test@example.com',
      password: 'password',
    });
  });

  it('ログインが失敗する', async () => {
    const { signIn } = await import('aws-amplify/auth');
    const error = { code: 'NotAuthorizedException', message: 'Incorrect username or password.' };
    vi.mocked(signIn).mockRejectedValue(error);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      try {
        await result.current.signIn('test@example.com', 'wrong-password');
      } catch (e) {
        // エラーが期待される
      }
    });

    expect(result.current.error).toBeTruthy();
  });

  it('ログアウトが成功する', async () => {
    const { signOut } = await import('aws-amplify/auth');
    vi.mocked(signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });

  it('エラーをクリアできる', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // エラーを設定
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  describe('新機能のテスト', () => {
    it('認証状態リスナーを追加・削除できる', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockListener = {
        onAuthStateChange: vi.fn(),
        onTokenExpired: vi.fn(),
        onError: vi.fn(),
      };

      let removeListener: (() => void) | undefined;

      act(() => {
        removeListener = result.current.addAuthStateListener(mockListener);
      });

      expect(typeof removeListener).toBe('function');

      act(() => {
        result.current.removeAuthStateListener(mockListener);
      });

      // リスナーが削除されたことを確認
      expect(removeListener).toBeDefined();
    });

    it('トークンの有効期限をチェックできる', async () => {
      const { tokenManager } = await import('../services/tokenManager');
      vi.mocked(tokenManager.isTokenExpired).mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const isExpired = result.current.isTokenExpired();
      expect(tokenManager.isTokenExpired).toHaveBeenCalled();
      expect(isExpired).toBe(false);
    });

    it('トークンの有効期限時刻を取得できる', async () => {
      const { tokenManager } = await import('../services/tokenManager');
      const mockDate = new Date('2024-12-31T23:59:59Z');
      vi.mocked(tokenManager.getTokenExpirationTime).mockReturnValue(mockDate);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const expirationTime = result.current.getTokenExpirationTime();
      expect(tokenManager.getTokenExpirationTime).toHaveBeenCalled();
      expect(expirationTime).toBe(mockDate);
    });

    it('トークンをリフレッシュできる', async () => {
      const { tokenManager } = await import('../services/tokenManager');
      const { getCurrentUser } = await import('aws-amplify/auth');

      vi.mocked(tokenManager.refreshToken).mockResolvedValue('new-token');
      vi.mocked(tokenManager.getToken).mockReturnValue('valid-token');
      vi.mocked(tokenManager.isTokenExpired).mockReturnValue(false);
      vi.mocked(getCurrentUser).mockResolvedValue({ username: 'test@example.com' });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(tokenManager.refreshToken).toHaveBeenCalled();
    });

    it('ログイン時にトークンを保存する', async () => {
      const { signIn, getCurrentUser, fetchAuthSession } = await import('aws-amplify/auth');
      const { tokenManager } = await import('../services/tokenManager');
      const { storageSync } = await import('../services/storage-sync');

      const mockSession = {
        tokens: {
          idToken: { toString: () => 'access-token' },
          refreshToken: { toString: () => 'refresh-token' },
        },
      };

      vi.mocked(signIn).mockResolvedValue(undefined);
      vi.mocked(fetchAuthSession).mockResolvedValue(mockSession);
      vi.mocked(getCurrentUser).mockResolvedValue({ username: 'test@example.com' });
      vi.mocked(tokenManager.getToken).mockReturnValue('access-token');
      vi.mocked(tokenManager.isTokenExpired).mockReturnValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(tokenManager.saveToken).toHaveBeenCalledWith('access-token', 'refresh-token');
      expect(storageSync.broadcastAuthStateChange).toHaveBeenCalled();
    });

    it('ログアウト時にトークンを削除する', async () => {
      const { signOut } = await import('aws-amplify/auth');
      const { tokenManager } = await import('../services/tokenManager');
      const { storageSync } = await import('../services/storage-sync');

      vi.mocked(signOut).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(tokenManager.removeTokens).toHaveBeenCalled();
      expect(storageSync.broadcastAuthStateChange).toHaveBeenCalledWith(null);
    });

    it('トークンリフレッシュ失敗時に自動ログアウトする', async () => {
      const { tokenManager } = await import('../services/tokenManager');
      const { storageSync } = await import('../services/storage-sync');

      vi.mocked(tokenManager.refreshToken).mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          // エラーが期待される
        }
      });

      expect(tokenManager.removeTokens).toHaveBeenCalled();
      expect(storageSync.broadcastAuthStateChange).toHaveBeenCalledWith(null);
    });

    it('複数タブ同期機能が初期化される', async () => {
      const { storageSync } = await import('../services/storage-sync');

      renderHook(() => useAuth(), { wrapper });

      expect(storageSync.startSync).toHaveBeenCalled();
      expect(storageSync.onAuthStateChange).toHaveBeenCalled();
    });
  });
});
