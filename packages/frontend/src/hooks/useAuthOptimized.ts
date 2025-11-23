/**
 * 最適化された認証フック
 *
 * 機能:
 * - Context分割によるレンダリング最適化
 * - メモ化による不要な再レンダリング防止
 * - トークン検証結果のキャッシュ
 *
 * 要件: 1.2, 5.4
 */

import { createContext, useContext, useMemo, useCallback } from 'react';
import type { AuthError } from '../services/auth';
import type { User } from '../services/auth-state-monitor';

/**
 * 認証状態のみのコンテキスト（頻繁に変更される）
 */
export interface AuthStateContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * ユーザー情報のみのコンテキスト（あまり変更されない）
 */
export interface AuthUserContextType {
  user: User | null;
}

/**
 * 認証アクションのみのコンテキスト（変更されない）
 */
export interface AuthActionsContextType {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  checkAuthState: () => Promise<void>;
  isTokenExpired: () => boolean;
  getTokenExpirationTime: () => Date | null;
}

/**
 * トークン検証キャッシュ
 */
interface TokenValidationCache {
  token: string;
  isValid: boolean;
  expirationTime: Date;
  cachedAt: Date;
}

// 分割されたコンテキスト
export const AuthStateContext = createContext<AuthStateContextType | null>(null);
export const AuthUserContext = createContext<AuthUserContextType | null>(null);
export const AuthActionsContext = createContext<AuthActionsContextType | null>(null);

/**
 * 認証状態のみを使用するフック
 */
export const useAuthState = (): AuthStateContextType => {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error('useAuthState must be used within an AuthProvider');
  }
  return context;
};

/**
 * ユーザー情報のみを使用するフック
 */
export const useAuthUser = (): AuthUserContextType => {
  const context = useContext(AuthUserContext);
  if (!context) {
    throw new Error('useAuthUser must be used within an AuthProvider');
  }
  return context;
};

/**
 * 認証アクションのみを使用するフック
 */
export const useAuthActions = (): AuthActionsContextType => {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error('useAuthActions must be used within an AuthProvider');
  }
  return context;
};

/**
 * メモ化されたトークン検証フック
 */
export const useTokenValidation = () => {
  const { isTokenExpired, getTokenExpirationTime } = useAuthActions();

  // トークン検証結果のキャッシュ
  const validationCache = useMemo<TokenValidationCache | null>(() => {
    const expirationTime = getTokenExpirationTime();
    if (!expirationTime) return null;

    const token = localStorage.getItem('auth_access_token');
    if (!token) return null;

    return {
      token,
      isValid: !isTokenExpired(),
      expirationTime,
      cachedAt: new Date(),
    };
  }, [isTokenExpired, getTokenExpirationTime]);

  // メモ化されたトークン検証関数
  const validateToken = useCallback(() => {
    if (!validationCache) return false;

    // キャッシュが5分以内の場合はキャッシュを使用
    const cacheAge = Date.now() - validationCache.cachedAt.getTime();
    if (cacheAge < 300000) {
      // 5分
      return validationCache.isValid;
    }

    // キャッシュが古い場合は再検証
    return !isTokenExpired();
  }, [validationCache, isTokenExpired]);

  // メモ化されたトークン有効期限チェック
  const getTimeUntilExpiration = useCallback(() => {
    const expirationTime = getTokenExpirationTime();
    if (!expirationTime) return null;

    const timeUntilExpiration = expirationTime.getTime() - Date.now();
    return timeUntilExpiration > 0 ? timeUntilExpiration : 0;
  }, [getTokenExpirationTime]);

  return {
    validateToken,
    getTimeUntilExpiration,
    isValid: validationCache?.isValid ?? false,
    expirationTime: validationCache?.expirationTime ?? null,
  };
};

/**
 * 認証状態の変更を監視するフック（最適化版）
 */
export const useAuthStateChange = (callback: (state: AuthStateContextType) => void) => {
  const authState = useAuthState();

  // メモ化されたコールバック
  const memoizedCallback = useCallback(callback, [callback]);

  // 認証状態の変更を監視
  useMemo(() => {
    memoizedCallback(authState);
  }, [authState, memoizedCallback]);
};

/**
 * 条件付き認証チェックフック
 */
export const useConditionalAuth = (condition: boolean) => {
  const authState = useAuthState();
  const authUser = useAuthUser();

  // 条件が満たされた場合のみ認証情報を返す
  return useMemo(() => {
    if (!condition) {
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      };
    }

    return {
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading,
      user: authUser.user,
      error: authState.error,
    };
  }, [condition, authState.isAuthenticated, authState.isLoading, authUser.user, authState.error]);
};

/**
 * 認証が必要なコンポーネント用のフック
 */
export const useRequireAuth = () => {
  const authState = useAuthState();
  const authUser = useAuthUser();
  const authActions = useAuthActions();

  // 認証が必要な場合のみ情報を返す
  return useMemo(() => {
    if (!authState.isAuthenticated) {
      return {
        isAuthenticated: false,
        user: null,
        signOut: authActions.signOut,
        refreshToken: authActions.refreshToken,
      };
    }

    return {
      isAuthenticated: true,
      user: authUser.user,
      signOut: authActions.signOut,
      refreshToken: authActions.refreshToken,
    };
  }, [authState.isAuthenticated, authUser.user, authActions.signOut, authActions.refreshToken]);
};

/**
 * パフォーマンス監視フック
 */
export const useAuthPerformance = () => {
  const authState = useAuthState();

  // レンダリング回数をカウント
  const renderCount = useMemo(() => {
    let count = 0;
    return () => ++count;
  }, []);

  // 認証状態変更の頻度を監視
  const stateChangeFrequency = useMemo(() => {
    const changes: Date[] = [];
    return {
      recordChange: () => {
        changes.push(new Date());
        // 直近10回の変更のみ保持
        if (changes.length > 10) {
          changes.shift();
        }
      },
      getFrequency: () => {
        if (changes.length < 2) return 0;
        const timeSpan = changes[changes.length - 1].getTime() - changes[0].getTime();
        return changes.length / (timeSpan / 1000); // 変更/秒
      },
    };
  }, []);

  // 認証状態が変更されたときに記録
  useMemo(() => {
    stateChangeFrequency.recordChange();
  }, [stateChangeFrequency]);

  return {
    renderCount: renderCount(),
    stateChangeFrequency: stateChangeFrequency.getFrequency(),
    currentState: authState,
  };
};
