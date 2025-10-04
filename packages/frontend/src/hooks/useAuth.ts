import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { AuthService } from '../services/auth';
import { tokenManager } from '../services/tokenManager';
import { storageSync } from '../services/storage-sync';
import {
  authErrorHandler,
  AuthError,
  ErrorCategory,
  ErrorSeverity,
} from '../services/error-handler';
import type { AuthState as StorageSyncAuthState } from '../types/storage-sync';

/**
 * 認証状態の型定義
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    profileComplete?: boolean;
    [key: string]: unknown;
  } | null;
  error: string | null;
  tokenExpirationTime: Date | null;
  lastActivity: Date | null;
  sessionId: string | null;
}

/**
 * 認証エラーの型定義（エラーハンドラーから再エクスポート）
 */
export type { AuthError } from '../services/error-handler';

/**
 * 認証状態リスナーの型定義
 */
export interface AuthStateListener {
  onAuthStateChange: (state: AuthState) => void;
  onTokenExpired: () => void;
  onError: (error: AuthError) => void;
}

/**
 * 認証コンテキストの型定義
 */
export interface AuthContextType extends AuthState {
  // 既存機能
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  checkAuthState: () => Promise<void>;

  // 新機能
  refreshToken: () => Promise<void>;
  isTokenExpired: () => boolean;
  getTokenExpirationTime: () => Date | null;
  addAuthStateListener: (listener: AuthStateListener) => () => void;
  removeAuthStateListener: (listener: AuthStateListener) => void;
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
 * - トークン管理機能
 * - 自動ログアウト機能
 * - 複数タブ同期機能
 * - エラーハンドリング
 *
 * 要件: 1.1, 1.2, 4.3, 5.1, 5.2
 */
export const useAuth = (): AuthContextType => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
    tokenExpirationTime: null,
    lastActivity: null,
    sessionId: null,
  });

  // 認証状態リスナーの管理
  const authStateListeners = useRef<Set<AuthStateListener>>(new Set());
  const autoLogoutTimer = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  // 設定値
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分
  const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5分前にリフレッシュ

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 認証状態リスナーを追加
   * 要件 5.1: 認証状態が変更された時にリスナーに通知される
   */
  const addAuthStateListener = useCallback((listener: AuthStateListener): (() => void) => {
    authStateListeners.current.add(listener);

    // リスナーを削除する関数を返す
    return () => {
      authStateListeners.current.delete(listener);
    };
  }, []);

  /**
   * 認証状態リスナーを削除
   */
  const removeAuthStateListener = useCallback((listener: AuthStateListener) => {
    authStateListeners.current.delete(listener);
  }, []);

  /**
   * 認証状態変更を全リスナーに通知
   */
  const notifyAuthStateChange = useCallback((state: AuthState) => {
    authStateListeners.current.forEach(listener => {
      try {
        listener.onAuthStateChange(state);
      } catch (error) {
        console.error('認証状態リスナーエラー:', error);
      }
    });
  }, []);

  /**
   * トークン期限切れを全リスナーに通知
   */
  const notifyTokenExpired = useCallback(() => {
    authStateListeners.current.forEach(listener => {
      try {
        listener.onTokenExpired();
      } catch (error) {
        console.error('トークン期限切れリスナーエラー:', error);
      }
    });
  }, []);

  /**
   * エラーを全リスナーに通知
   */
  const notifyError = useCallback(
    async (error: AuthError) => {
      // エラーハンドラーでエラーを処理
      const processedError = await authErrorHandler.handleError(error, {
        component: 'useAuth',
        sessionId: authState.sessionId || undefined,
        timestamp: new Date(),
      });

      // リスナーに通知
      authStateListeners.current.forEach(listener => {
        try {
          listener.onError(processedError);
        } catch (listenerError) {
          console.error('エラーリスナーエラー:', listenerError);
        }
      });
    },
    [authState.sessionId]
  );

  /**
   * 自動ログアウトを実行
   * 要件 4.3: 401エラー時の自動認証状態リセット機能
   */
  const performAutoLogout = useCallback(
    async (reason: string) => {
      try {
        console.log(`自動ログアウトを実行します。理由: ${reason}`);

        // タイマーをクリア
        if (autoLogoutTimer.current) {
          clearTimeout(autoLogoutTimer.current);
          autoLogoutTimer.current = null;
        }

        if (inactivityTimer.current) {
          clearTimeout(inactivityTimer.current);
          inactivityTimer.current = null;
        }

        // トークンを削除
        tokenManager.removeTokens();

        // 認証状態をリセット
        const newState: AuthState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
          tokenExpirationTime: null,
          lastActivity: null,
          sessionId: null,
        };

        setAuthState(newState);

        // 他のタブに変更を通知
        storageSync.broadcastAuthStateChange(null);

        // リスナーに通知
        notifyAuthStateChange(newState);

        // トークン期限切れの場合は専用通知
        if (reason === 'TOKEN_EXPIRED' || reason === 'TOKEN_REFRESH_FAILED') {
          notifyTokenExpired();
        }

        console.log('自動ログアウトが完了しました');
      } catch (error) {
        console.error('自動ログアウト処理でエラーが発生しました:', error);
      }
    },
    [notifyAuthStateChange, notifyTokenExpired]
  );

  /**
   * トークンをリフレッシュ
   * 要件 5.2: トークンの更新が必要な時に自動的にトークンリフレッシュが実行される
   */
  const refreshToken = useCallback(async () => {
    try {
      await tokenManager.refreshToken();

      console.log('トークンリフレッシュが完了しました');
    } catch (error) {
      console.error('トークンリフレッシュに失敗しました:', error);

      const authError: AuthError = {
        code: 'TOKEN_REFRESH_FAILED',
        message: 'トークンの更新に失敗しました。再ログインが必要です。',
        timestamp: new Date(),
        retryable: false,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
      };

      notifyError(authError);

      // リフレッシュに失敗した場合は自動ログアウト
      await performAutoLogout('TOKEN_REFRESH_FAILED');

      throw error;
    }
  }, [notifyError, performAutoLogout]);

  /**
   * トークンの有効期限をチェック
   * 要件 4.1: JWTトークンの有効期限が切れた時に自動的にログアウト処理が実行される
   */
  const isTokenExpired = useCallback((): boolean => {
    return tokenManager.isTokenExpired();
  }, []);

  /**
   * トークンの有効期限時刻を取得
   */
  const getTokenExpirationTime = useCallback((): Date | null => {
    return tokenManager.getTokenExpirationTime();
  }, []);

  /**

  /**
   * 非アクティブタイマーをリセット
   * 要件 4.4: 長時間非アクティブな状態が続いた時にセッションタイムアウトの警告が表示される
   */
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    inactivityTimer.current = setTimeout(() => {
      performAutoLogout('INACTIVITY_TIMEOUT');
    }, INACTIVITY_TIMEOUT);

    // 最終アクティビティ時刻を更新
    tokenManager.updateLastActivity();
  }, [performAutoLogout, INACTIVITY_TIMEOUT]);

  /**
   * 認証状態をチェック
   */
  const checkAuthState = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // モック認証が有効な場合
      const isMockAuthEnabled =
        import.meta.env.VITE_MOCK_AUTH_ENABLED === 'true' ||
        localStorage.getItem('mock_auth_enabled') === 'true';

      if (isMockAuthEnabled) {
        const mockUser = localStorage.getItem('mock_user');
        const mockToken = localStorage.getItem('mock_token');

        if (mockUser && mockToken) {
          const user = JSON.parse(mockUser);
          const newState: AuthState = {
            isAuthenticated: true,
            isLoading: false,
            user,
            error: null,
            tokenExpirationTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
            lastActivity: new Date(),
            sessionId: `mock-session-${Date.now()}`,
          };
          setAuthState(newState);
          notifyAuthStateChange(newState);
          return;
        }
      }

      // 保存されたトークンをチェック
      const savedToken = tokenManager.getToken();

      if (!savedToken) {
        // トークンがない場合
        const newState: AuthState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
          tokenExpirationTime: null,
          lastActivity: null,
          sessionId: null,
        };
        setAuthState(newState);
        return;
      }

      // トークンの有効期限をチェック
      if (tokenManager.isTokenExpired(savedToken)) {
        console.log('保存されたトークンが期限切れです');
        await performAutoLogout('TOKEN_EXPIRED');
        return;
      }

      // Cognitoの認証状態をチェック
      const isAuthenticated = await AuthService.checkAuthState();

      if (isAuthenticated) {
        const user = (await AuthService.getCurrentUser()) as {
          id: string;
          email: string;
          name?: string;
          profileComplete?: boolean;
          [key: string]: unknown;
        } | null;
        const tokenExpirationTime = tokenManager.getTokenExpirationTime(savedToken);
        const lastActivity = tokenManager.getLastActivity();
        const sessionId = tokenManager.getSessionId();

        const newState: AuthState = {
          isAuthenticated: true,
          isLoading: false,
          user,
          error: null,
          tokenExpirationTime,
          lastActivity,
          sessionId,
        };

        setAuthState(newState);
        notifyAuthStateChange(newState);

        // 非アクティブタイマーを開始
        resetInactivityTimer();
      } else {
        const newState: AuthState = {
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null,
          tokenExpirationTime: null,
          lastActivity: null,
          sessionId: null,
        };
        setAuthState(newState);
      }
    } catch (error) {
      const authError: AuthError = {
        code: 'AUTH_CHECK_FAILED',
        message: '認証状態の確認に失敗しました',
        timestamp: new Date(),
        retryable: true,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
      };

      const newState: AuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: authError.message,
        tokenExpirationTime: null,
        lastActivity: null,
        sessionId: null,
      };

      setAuthState(newState);
      notifyError(authError);
    }
  }, [performAutoLogout, notifyAuthStateChange, notifyError, resetInactivityTimer]);

  /**
   * ログイン
   * 要件 1.1, 1.2: 認証状態の管理とトークンの永続化
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        await AuthService.signIn(email, password);

        // ログイン成功後、トークンを取得して保存
        const session = await AuthService.getCurrentSessionTyped();
        let accessToken: string | undefined;

        if (session?.tokens?.idToken) {
          accessToken = session.tokens.idToken.toString();
          const refreshToken = session.tokens.refreshToken?.toString();

          // TokenManagerにトークンを保存
          tokenManager.saveToken(accessToken, refreshToken);
        }

        // 認証状態を更新
        const user = (await AuthService.getCurrentUser()) as {
          id: string;
          email: string;
          name?: string;
          profileComplete?: boolean;
          [key: string]: unknown;
        } | null;
        const tokenExpirationTime = accessToken
          ? tokenManager.getTokenExpirationTime(accessToken)
          : null;
        const lastActivity = tokenManager.getLastActivity();
        const sessionId = tokenManager.getSessionId();

        const newState: AuthState = {
          isAuthenticated: true,
          isLoading: false,
          user,
          error: null,
          tokenExpirationTime,
          lastActivity,
          sessionId,
        };

        setAuthState(newState);
        notifyAuthStateChange(newState);

        // 他のタブに変更を通知
        storageSync.broadcastAuthStateChange({
          isAuthenticated: true,
          user,
          sessionId: sessionId || '',
          lastActivity: new Date(),
        });
      } catch (error) {
        const authError: AuthError = {
          code: 'SIGN_IN_FAILED',
          message:
            error && typeof error === 'object' && 'message' in error
              ? (error.message as string)
              : 'ログインに失敗しました',
          timestamp: new Date(),
          retryable: true,
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.MEDIUM,
        };

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: authError.message,
        }));

        notifyError(authError);
        throw error;
      }
    },
    [notifyError, notifyAuthStateChange]
  );

  /**
   * サインアップ
   */
  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        await AuthService.signUp(email, password, name);

        setAuthState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        const authError: AuthError = {
          code: 'SIGN_UP_FAILED',
          message:
            error && typeof error === 'object' && 'message' in error
              ? (error.message as string)
              : 'アカウント作成に失敗しました',
          timestamp: new Date(),
          retryable: true,
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.MEDIUM,
        };

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: authError.message,
        }));

        notifyError(authError);
        throw error;
      }
    },
    [notifyError]
  );

  /**
   * ログアウト
   * 要件 2.4: ユーザーが明示的にログアウトした時に保存された認証情報が完全に削除される
   */
  const signOut = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      // Cognitoからログアウト
      await AuthService.signOut();

      // 保存されたトークンを削除
      tokenManager.removeTokens();

      // タイマーをクリア
      if (autoLogoutTimer.current) {
        clearTimeout(autoLogoutTimer.current);
        autoLogoutTimer.current = null;
      }

      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }

      const newState: AuthState = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        tokenExpirationTime: null,
        lastActivity: null,
        sessionId: null,
      };

      setAuthState(newState);

      // 他のタブに変更を通知
      storageSync.broadcastAuthStateChange(null);

      // リスナーに通知
      notifyAuthStateChange(newState);
    } catch (error) {
      const authError: AuthError = {
        code: 'SIGN_OUT_FAILED',
        message:
          error && typeof error === 'object' && 'message' in error
            ? (error.message as string)
            : 'ログアウトに失敗しました',
        timestamp: new Date(),
        retryable: true,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
      };

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: authError.message,
      }));

      notifyError(authError);
      throw error;
    }
  }, [notifyAuthStateChange, notifyError]);

  /**
   * パスワードリセット
   */
  const resetPassword = useCallback(
    async (email: string) => {
      try {
        setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

        await AuthService.resetPassword(email);

        setAuthState(prev => ({ ...prev, isLoading: false }));
      } catch (error) {
        const authError: AuthError = {
          code: 'RESET_PASSWORD_FAILED',
          message:
            error && typeof error === 'object' && 'message' in error
              ? (error.message as string)
              : 'パスワードリセットに失敗しました',
          timestamp: new Date(),
          retryable: true,
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.MEDIUM,
        };

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: authError.message,
        }));

        notifyError(authError);
        throw error;
      }
    },
    [notifyError]
  );

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
        const authError: AuthError = {
          code: 'CONFIRM_RESET_PASSWORD_FAILED',
          message:
            error && typeof error === 'object' && 'message' in error
              ? (error.message as string)
              : 'パスワード変更に失敗しました',
          timestamp: new Date(),
          retryable: true,
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.MEDIUM,
        };

        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: authError.message,
        }));

        notifyError(authError);
        throw error;
      }
    },
    [notifyError]
  );

  // 初回マウント時に認証状態をチェック
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  // 複数タブ同期機能の初期化
  // 要件 6.3: ブラウザの複数タブで同じアプリケーションを使用している時に認証状態が同期される
  useEffect(() => {
    // StorageSyncを開始
    storageSync.startSync();

    // 認証状態変更リスナーを設定
    const handleAuthStateChange = (syncState: StorageSyncAuthState | null) => {
      if (syncState === null) {
        // 他のタブでログアウトされた場合
        console.log('他のタブでログアウトが検出されました');
        performAutoLogout('OTHER_TAB_LOGOUT');
      } else if (syncState.isAuthenticated && !authState.isAuthenticated) {
        // 他のタブでログインされた場合
        console.log('他のタブでログインが検出されました');
        // 認証状態を更新（簡略化）
        setAuthState(prev => ({ ...prev, isAuthenticated: true }));
      }
    };

    storageSync.onAuthStateChange(handleAuthStateChange);

    // トークンリフレッシュ失敗イベントリスナー
    const handleTokenRefreshFailed = () => {
      performAutoLogout('TOKEN_REFRESH_FAILED');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:token-refresh-failed', handleTokenRefreshFailed);
    }

    // クリーンアップ
    return () => {
      storageSync.removeAuthStateListener(handleAuthStateChange);
      storageSync.stopSync();

      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:token-refresh-failed', handleTokenRefreshFailed);
      }

      // タイマーをクリア
      if (autoLogoutTimer.current) {
        clearTimeout(autoLogoutTimer.current);
      }
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [performAutoLogout, authState.isAuthenticated]);

  // ユーザーアクティビティの監視
  // 要件 4.4: 長時間非アクティブな状態が続いた時にセッションタイムアウト
  useEffect(() => {
    if (!authState.isAuthenticated) {
      return;
    }

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // ユーザーアクティビティイベントを監視
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // 初回タイマー設定
    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });

      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
    };
  }, [authState.isAuthenticated, resetInactivityTimer]);

  // 自動トークンリフレッシュの監視
  // 要件 5.2: トークンの更新が必要な時に自動的にトークンリフレッシュが実行される
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.tokenExpirationTime) {
      return;
    }

    const expirationTime = authState.tokenExpirationTime.getTime();
    const currentTime = Date.now();
    const refreshTime = expirationTime - TOKEN_REFRESH_BUFFER;
    const delay = refreshTime - currentTime;

    if (delay <= 0) {
      // 既に期限切れまたは間もなく期限切れの場合は即座にリフレッシュ
      refreshToken().catch(error => {
        console.error('自動トークンリフレッシュに失敗しました:', error);
      });
      return;
    }

    // 自動リフレッシュタイマーを設定
    autoLogoutTimer.current = setTimeout(() => {
      refreshToken().catch(error => {
        console.error('自動トークンリフレッシュに失敗しました:', error);
      });
    }, delay);

    return () => {
      if (autoLogoutTimer.current) {
        clearTimeout(autoLogoutTimer.current);
        autoLogoutTimer.current = null;
      }
    };
  }, [
    authState.isAuthenticated,
    authState.tokenExpirationTime,
    refreshToken,
    TOKEN_REFRESH_BUFFER,
  ]);

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    confirmResetPassword,
    clearError,
    checkAuthState,
    // 新機能
    refreshToken,
    isTokenExpired,
    getTokenExpirationTime,
    addAuthStateListener,
    removeAuthStateListener,
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
