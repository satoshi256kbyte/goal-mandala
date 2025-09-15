import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { AuthService } from '../services/auth';

/**
 * 認証状態の型定義
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: unknown | null;
  error: string | null;
}

/**
 * 認証コンテキストの型定義
 */
export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  checkAuthState: () => Promise<void>;
}

/**
 * 認証コンテキスト
 */
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * 認証フック
 *
 * 機能:
 * - 認証状態の管理
 * - 認証関連の操作（ログイン、ログアウト等）
 * - 認証状態の永続化
 * - エラーハンドリング
 *
 * 要件: 1.2, 2.2, 3.5
 */
export const useAuth = (): AuthContextType => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 認証状態をチェック
   */
  const checkAuthState = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      const isAuthenticated = await AuthService.checkAuthState();

      if (isAuthenticated) {
        const user = await AuthService.getCurrentUser();
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user,
          error: null,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
        });
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: '認証状態の確認に失敗しました',
      });
    }
  }, []);

  /**
   * ログイン
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        await AuthService.signIn(email, password);

        // ログイン成功後、認証状態を再確認
        await checkAuthState();
      } catch (error) {
        const errorMessage =
          error && typeof error === 'object' && 'message' in error
            ? (error.message as string)
            : 'ログインに失敗しました';

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [checkAuthState]
  );

  /**
   * サインアップ
   */
  const signUp = useCallback(async (email: string, password: string, name: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      await AuthService.signUp(email, password, name);

      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error.message as string)
          : 'アカウント作成に失敗しました';

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * ログアウト
   */
  const signOut = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      await AuthService.signOut();

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error.message as string)
          : 'ログアウトに失敗しました';

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * パスワードリセット
   */
  const resetPassword = useCallback(async (email: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      await AuthService.resetPassword(email);

      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? (error.message as string)
          : 'パスワードリセットに失敗しました';

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * パスワードリセット確認
   */
  const confirmResetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        await AuthService.confirmResetPassword(email, code, newPassword);

        setAuthState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        const errorMessage =
          error && typeof error === 'object' && 'message' in error
            ? (error.message as string)
            : 'パスワード変更に失敗しました';

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  // 初回マウント時に認証状態をチェック
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    confirmResetPassword,
    clearError,
    checkAuthState,
  };
};

/**
 * 認証コンテキストを使用するフック
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
