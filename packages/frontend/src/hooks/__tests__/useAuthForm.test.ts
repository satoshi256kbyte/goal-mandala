import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthForm } from '../useAuthForm';
import { AuthService } from '../../services/auth';

// AuthServiceをモック
vi.mock('../../services/auth', () => ({
  AuthService: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    isNetworkError: vi.fn(),
    testNetworkConnection: vi.fn(),
  },
}));

// useErrorHandlerをモック
vi.mock('../useErrorHandler', () => ({
  useErrorHandler: () => ({
    error: null,
    clearError: vi.fn(),
    setError: vi.fn(),
    isNetworkError: false,
    isRetryable: false,
  }),
}));

// useNetworkStatusをモック
vi.mock('../useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    wasOffline: false,
  }),
}));

describe('useAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定されている', () => {
      const { result } = renderHook(() => useAuthForm());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.successMessage).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('signIn', () => {
    it('正常にログインできる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(AuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.successMessage).toBe('ログインしました');
    });

    it('ログイン中はローディング状態になる', async () => {
      vi.mocked(AuthService.signIn).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuthForm());

      act(() => {
        result.current.signIn('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('成功時のコールバックが呼ばれる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useAuthForm({ onSuccess }));

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('signUp', () => {
    it('正常にサインアップできる', async () => {
      vi.mocked(AuthService.signUp).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'Test User');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(AuthService.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User'
      );
      expect(result.current.successMessage).toBe(
        '確認メールを送信しました。メールをご確認ください'
      );
    });

    it('サインアップ中はローディング状態になる', async () => {
      vi.mocked(AuthService.signUp).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuthForm());

      act(() => {
        result.current.signUp('test@example.com', 'password123', 'Test User');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('resetPassword', () => {
    it('正常にパスワードリセットできる', async () => {
      vi.mocked(AuthService.resetPassword).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(AuthService.resetPassword).toHaveBeenCalledWith('test@example.com');
      expect(result.current.successMessage).toBe('パスワードリセットメールを送信しました');
    });

    it('パスワードリセット中はローディング状態になる', async () => {
      vi.mocked(AuthService.resetPassword).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuthForm());

      act(() => {
        result.current.resetPassword('test@example.com');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('clearSuccess', () => {
    it('成功メッセージをクリアできる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(result.current.successMessage).toBe('ログインしました');
      });

      act(() => {
        result.current.clearSuccess();
      });

      expect(result.current.successMessage).toBeNull();
    });
  });

  describe('オプション', () => {
    it('maxRetriesオプションが設定できる', () => {
      const { result } = renderHook(() => useAuthForm({ maxRetries: 5 }));

      expect(result.current).toBeDefined();
    });

    it('retryDelayオプションが設定できる', () => {
      const { result } = renderHook(() => useAuthForm({ retryDelay: 2000 }));

      expect(result.current).toBeDefined();
    });

    it('onErrorコールバックが設定できる', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useAuthForm({ onError }));

      expect(result.current).toBeDefined();
    });
  });

  describe('エッジケース', () => {
    it('空のメールアドレスでログインを試みる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn('', 'password123');
      });

      expect(AuthService.signIn).toHaveBeenCalledWith('', 'password123');
    });

    it('空のパスワードでログインを試みる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn('test@example.com', '');
      });

      expect(AuthService.signIn).toHaveBeenCalledWith('test@example.com', '');
    });

    it('連続してログインを試みる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn('test1@example.com', 'password1');
      });

      await act(async () => {
        await result.current.signIn('test2@example.com', 'password2');
      });

      expect(AuthService.signIn).toHaveBeenCalledTimes(2);
      expect(AuthService.signIn).toHaveBeenLastCalledWith('test2@example.com', 'password2');
    });

    it('非常に長いメールアドレスでログインを試みる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);
      const longEmail = 'a'.repeat(100) + '@example.com';

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn(longEmail, 'password123');
      });

      expect(AuthService.signIn).toHaveBeenCalledWith(longEmail, 'password123');
    });

    it('特殊文字を含むパスワードでログインを試みる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn('test@example.com', specialPassword);
      });

      expect(AuthService.signIn).toHaveBeenCalledWith('test@example.com', specialPassword);
    });

    it('複数回clearSuccessを呼び出せる', async () => {
      vi.mocked(AuthService.signIn).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(result.current.successMessage).toBe('ログインしました');
      });

      act(() => {
        result.current.clearSuccess();
        result.current.clearSuccess();
        result.current.clearSuccess();
      });

      expect(result.current.successMessage).toBeNull();
    });

    it('ローディング中に別の操作を試みる', async () => {
      vi.mocked(AuthService.signIn).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { result } = renderHook(() => useAuthForm());

      // 1回目のログイン開始
      act(() => {
        result.current.signIn('test1@example.com', 'password1');
      });

      expect(result.current.isLoading).toBe(true);

      // ローディング中に2回目のログインを試みる
      act(() => {
        result.current.signIn('test2@example.com', 'password2');
      });

      // ローディング状態が維持されることを確認
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('タイムアウトエラーが発生した場合の処理', async () => {
      vi.mocked(AuthService.signIn).mockRejectedValue(new Error('Timeout'));

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        try {
          await result.current.signIn('test@example.com', 'password123');
        } catch (error) {
          // エラーが発生してもクラッシュしない
        }
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('ネットワーク切断時の処理', async () => {
      vi.mocked(AuthService.signIn).mockRejectedValue(new TypeError('Failed to fetch'));
      vi.mocked(AuthService.isNetworkError).mockReturnValue(true);

      const { result } = renderHook(() => useAuthForm());

      await act(async () => {
        try {
          await result.current.signIn('test@example.com', 'password123');
        } catch (error) {
          // エラーが発生してもクラッシュしない
        }
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});
