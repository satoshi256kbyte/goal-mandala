import React from 'react';
import { render, cleanup, act, renderHook } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect, afterEach } from 'vitest';
import { useAuth } from './useAuth';
import { AuthProvider } from '../components/auth/AuthProvider';

// LocalStorageのモック - グローバルストアを使用
let localStorageStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string): string | null => {
    return localStorageStore[key] || null;
  },
  setItem: (key: string, value: string): void => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string): void => {
    delete localStorageStore[key];
  },
  clear: (): void => {
    localStorageStore = {};
  },
  get length(): number {
    return Object.keys(localStorageStore).length;
  },
  key: (index: number): string | null => {
    return Object.keys(localStorageStore)[index] || null;
  },
};

// グローバルlocalStorageを上書き
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore = {};
  });

  it('初期状態では認証状態をチェックする', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // 認証状態チェック完了を待つ
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('ログインが成功する', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(localStorageStore['auth_token']).toBe('mock_token');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
  });

  it('ログアウトが成功する', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // まずログイン
    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    // ログアウト
    await act(async () => {
      await result.current.signOut();
    });

    expect(localStorageStore['auth_token']).toBeUndefined();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBe(null);
  });

  it('エラーをクリアできる', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  describe('新機能のテスト', () => {
    it('認証状態リスナーを追加・削除できる', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockListener = vi.fn();
      let removeListener: (() => void) | undefined;

      act(() => {
        removeListener = result.current.addAuthStateListener(mockListener);
      });

      expect(typeof removeListener).toBe('function');

      // リスナーを削除
      act(() => {
        removeListener?.();
      });

      expect(removeListener).toBeDefined();
    });

    it('トークンの有効期限をチェックできる', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // ログインしてトークンを設定
      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      // localStorageにトークンが保存されていることを確認
      expect(localStorageStore['auth_token']).toBe('mock_token');
      expect(localStorageStore['token_expiration']).toBeDefined();

      const isExpired = result.current.isTokenExpired();
      expect(isExpired).toBe(false);
    });

    it('トークンの有効期限時刻を取得できる', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // ログインしてトークンを設定
      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      // localStorageにトークンが保存されていることを確認
      expect(localStorageStore['token_expiration']).toBeDefined();

      const expirationTime = result.current.getTokenExpirationTime();
      expect(expirationTime).not.toBeNull();
      expect(typeof expirationTime).toBe('number');
      if (expirationTime) {
        expect(expirationTime).toBeGreaterThan(Date.now());
      }
    });

    it('トークンをリフレッシュできる', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // ログインしてトークンを設定
      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      const oldExpiration = result.current.getTokenExpirationTime();
      expect(oldExpiration).not.toBeNull();

      // 少し待つ
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // トークンをリフレッシュ
      await act(async () => {
        await result.current.refreshToken();
      });

      const newExpiration = result.current.getTokenExpirationTime();
      expect(newExpiration).not.toBeNull();
      if (oldExpiration && newExpiration) {
        expect(newExpiration).toBeGreaterThan(oldExpiration);
      }
    });

    it('ログイン時にトークンを保存する', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(localStorageStore['auth_token']).toBe('mock_token');
      expect(localStorageStore['user']).toContain('test@example.com');
    });

    it('ログアウト時にトークンを削除する', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // ログイン
      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      // ログアウト
      await act(async () => {
        await result.current.signOut();
      });

      expect(localStorageStore['auth_token']).toBeUndefined();
      expect(localStorageStore['user']).toBeUndefined();
    });

    it('認証状態リスナーが通知される', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      const mockListener = vi.fn();

      act(() => {
        result.current.addAuthStateListener(mockListener);
      });

      // ログイン
      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(mockListener).toHaveBeenCalledWith(true);

      // ログアウト
      await act(async () => {
        await result.current.signOut();
      });

      expect(mockListener).toHaveBeenCalledWith(false);
    });
  });
});
