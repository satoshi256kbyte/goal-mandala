import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useAuth, AuthContext, AuthProvider } from './useAuth';

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期状態では認証状態をチェックする', async () => {
    const { getCurrentUser } = await import('aws-amplify/auth');
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('Not authenticated'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    // 初期状態ではローディング中
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);

    // 認証状態チェック完了後
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
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
});
