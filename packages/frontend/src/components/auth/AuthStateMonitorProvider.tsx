/**
 * 認証状態監視プロバイダー
 *
 * 機能:
 * - アプリケーション全体での認証状態監視の管理
 * - 認証状態変更の通知
 * - エラーハンドリング
 * - 自動ログアウト処理
 *
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import {
  useAuthStateMonitor,
  type UseAuthStateMonitorReturn,
} from '../../hooks/useAuthStateMonitor';
import { useAuthContext } from '../../hooks/useAuth';
import type { AuthState, AuthError } from '../../services/auth-state-monitor';

/**
 * 認証状態監視コンテキストの型定義
 */
export interface AuthStateMonitorContextType extends UseAuthStateMonitorReturn {
  /** 最後の認証状態変更時刻 */
  lastStateChangeTime: Date | null;
  /** エラー履歴 */
  errorHistory: AuthError[];
  /** エラー履歴をクリア */
  clearErrorHistory: () => void;
  /** 監視統計 */
  monitoringStats: {
    totalStateChanges: number;
    totalErrors: number;
    uptime: number; // 監視開始からの経過時間（秒）
  };
}

/**
 * 認証状態監視コンテキスト
 */
const AuthStateMonitorContext = createContext<AuthStateMonitorContextType | null>(null);

/**
 * 認証状態監視プロバイダーのプロパティ
 */
export interface AuthStateMonitorProviderProps {
  children: React.ReactNode;
  /** 自動開始するかどうか */
  autoStart?: boolean;
  /** 監視設定 */
  config?: {
    checkInterval?: number;
    tokenRefreshBuffer?: number;
    inactivityTimeout?: number;
    maxRetryAttempts?: number;
    retryDelay?: number;
  };
  /** デバッグモード */
  debug?: boolean;
}

/**
 * 認証状態監視プロバイダー
 *
 * 使用例:
 * ```tsx
 * <AuthStateMonitorProvider autoStart={true} debug={true}>
 *   <App />
 * </AuthStateMonitorProvider>
 * ```
 */
export const AuthStateMonitorProvider: React.FC<AuthStateMonitorProviderProps> = ({
  children,
  autoStart = true,
  config,
  debug = false,
}) => {
  // 認証コンテキストから現在の認証状態を取得
  const authContext = useAuthContext();

  // 統計情報の管理
  const [lastStateChangeTime, setLastStateChangeTime] = useState<Date | null>(null);
  const [errorHistory, setErrorHistory] = useState<AuthError[]>([]);
  const [monitoringStartTime, setMonitoringStartTime] = useState<Date | null>(null);
  const [totalStateChanges, setTotalStateChanges] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);

  /**
   * エラー履歴をクリア
   */
  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
    setTotalErrors(0);
  }, []);

  /**
   * 認証状態変更ハンドラー
   */
  const handleAuthStateChange = useCallback(
    (state: AuthState) => {
      setLastStateChangeTime(new Date());
      setTotalStateChanges(prev => prev + 1);

      if (debug) {
        console.log('認証状態が変更されました:', {
          isAuthenticated: state.isAuthenticated,
          user: state.user?.email,
          error: state.error,
          timestamp: new Date().toISOString(),
        });
      }

      // 認証状態が変更された場合、AuthContextの状態も更新
      if (state.isAuthenticated !== authContext.isAuthenticated) {
        // 必要に応じてAuthContextの状態を同期
        // ここでは監視のみ行い、実際の状態更新はAuthContextに委ねる
      }
    },
    [debug, authContext.isAuthenticated]
  );

  /**
   * トークン期限切れハンドラー
   */
  const handleTokenExpired = useCallback(() => {
    if (debug) {
      console.log('トークンが期限切れになりました:', new Date().toISOString());
    }

    // 自動ログアウトを実行
    authContext.signOut().catch(error => {
      console.error('自動ログアウトに失敗しました:', error);
    });
  }, [debug, authContext]);

  /**
   * エラーハンドラー
   */
  const handleError = useCallback(
    (error: AuthError) => {
      setErrorHistory(prev => [...prev.slice(-9), error]); // 最新10件を保持
      setTotalErrors(prev => prev + 1);

      if (debug) {
        console.error('認証エラーが発生しました:', {
          code: error.code,
          message: error.message,
          timestamp: error.timestamp.toISOString(),
          retryable: error.retryable,
        });
      }

      // 重大なエラーの場合は追加処理
      if (error.code === 'TOKEN_REFRESH_FAILED' || error.code === 'INACTIVITY_TIMEOUT') {
        // 自動ログアウトを実行
        authContext.signOut().catch(logoutError => {
          console.error('エラー時の自動ログアウトに失敗しました:', logoutError);
        });
      }
    },
    [debug, authContext]
  );

  // 認証状態監視フックを使用
  const monitorHook = useAuthStateMonitor({
    autoStart,
    config,
    initialState: authContext.isAuthenticated
      ? {
          isAuthenticated: authContext.isAuthenticated,
          isLoading: authContext.isLoading,
          user: authContext.user,
          error: authContext.error,
          tokenExpirationTime: authContext.getTokenExpirationTime(),
          lastActivity: new Date(),
          sessionId: null,
        }
      : undefined,
    onAuthStateChange: handleAuthStateChange,
    onTokenExpired: handleTokenExpired,
    onError: handleError,
  });

  // 監視開始時刻の記録
  useEffect(() => {
    if (monitorHook.isMonitoring && !monitoringStartTime) {
      setMonitoringStartTime(new Date());
    } else if (!monitorHook.isMonitoring && monitoringStartTime) {
      setMonitoringStartTime(null);
    }
  }, [monitorHook.isMonitoring, monitoringStartTime]);

  // 監視統計の計算
  const monitoringStats = useMemo(
    () => ({
      totalStateChanges,
      totalErrors,
      uptime: monitoringStartTime
        ? Math.floor((Date.now() - monitoringStartTime.getTime()) / 1000)
        : 0,
    }),
    [totalStateChanges, totalErrors, monitoringStartTime]
  );

  // デバッグ情報の出力
  useEffect(() => {
    if (debug && monitorHook.isMonitoring) {
      const interval = setInterval(() => {
        console.log('認証状態監視統計:', {
          isMonitoring: monitorHook.isMonitoring,
          listenerCount: monitorHook.listenerCount,
          currentState: monitorHook.currentState?.isAuthenticated,
          stats: monitoringStats,
          lastError: monitorHook.lastError?.code,
        });
      }, 30000); // 30秒ごと

      return () => clearInterval(interval);
    }
  }, [
    debug,
    monitorHook.isMonitoring,
    monitorHook.listenerCount,
    monitorHook.currentState,
    monitoringStats,
    monitorHook.lastError,
  ]);

  // AuthContextの認証状態変更を監視して、監視サービスの状態を同期
  useEffect(() => {
    if (authContext.isAuthenticated && !monitorHook.currentState?.isAuthenticated) {
      // AuthContextで認証されたが、監視サービスでは未認証の場合
      // 監視サービスに状態を通知（直接更新はできないため、チェックを実行）
      monitorHook.checkAuthState().catch(error => {
        console.error('認証状態同期チェックに失敗しました:', error);
      });
    }
  }, [
    authContext.isAuthenticated,
    authContext.isLoading,
    authContext.user,
    authContext.error,
    authContext,
    monitorHook,
  ]);

  const contextValue: AuthStateMonitorContextType = {
    ...monitorHook,
    lastStateChangeTime,
    errorHistory,
    clearErrorHistory,
    monitoringStats,
  };

  return (
    <AuthStateMonitorContext.Provider value={contextValue}>
      {children}
    </AuthStateMonitorContext.Provider>
  );
};

/**
 * 認証状態監視コンテキストを使用するフック
 */
export const useAuthStateMonitorContext = (): AuthStateMonitorContextType => {
  const context = useContext(AuthStateMonitorContext);
  if (!context) {
    throw new Error('useAuthStateMonitorContext must be used within an AuthStateMonitorProvider');
  }
  return context;
};

/**
 * 認証状態監視の統計情報のみを取得するフック
 */
export const useAuthMonitoringStats = () => {
  const context = useAuthStateMonitorContext();
  return {
    isMonitoring: context.isMonitoring,
    listenerCount: context.listenerCount,
    lastStateChangeTime: context.lastStateChangeTime,
    errorHistory: context.errorHistory,
    monitoringStats: context.monitoringStats,
  };
};

export default AuthStateMonitorProvider;
