/**
 * 認証状態監視フック
 *
 * 機能:
 * - 認証状態監視の開始・停止
 * - 認証状態変更の監視
 * - エラーハンドリング
 * - クリーンアップ
 *
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  authStateMonitor,
  type AuthState,
  type AuthError,
  type AuthStateListener,
} from '../services/auth-state-monitor';

/**
 * 認証状態監視フックのオプション
 */
export interface UseAuthStateMonitorOptions {
  /** 自動開始するかどうか */
  autoStart?: boolean;
  /** 初期認証状態 */
  initialState?: AuthState;
  /** 監視設定 */
  config?: {
    checkInterval?: number;
    tokenRefreshBuffer?: number;
    inactivityTimeout?: number;
    maxRetryAttempts?: number;
    retryDelay?: number;
  };
  /** 認証状態変更コールバック */
  onAuthStateChange?: (state: AuthState) => void;
  /** トークン期限切れコールバック */
  onTokenExpired?: () => void;
  /** エラーコールバック */
  onError?: (error: AuthError) => void;
}

/**
 * 認証状態監視フックの戻り値
 */
export interface UseAuthStateMonitorReturn {
  /** 現在の認証状態 */
  currentState: AuthState | null;
  /** 監視が有効かどうか */
  isMonitoring: boolean;
  /** 登録されているリスナー数 */
  listenerCount: number;
  /** 最後のエラー */
  lastError: AuthError | null;
  /** 監視を開始 */
  startMonitoring: (initialState?: AuthState) => void;
  /** 監視を停止 */
  stopMonitoring: () => void;
  /** 認証状態を手動チェック */
  checkAuthState: () => Promise<AuthState>;
  /** エラーをクリア */
  clearError: () => void;
}

/**
 * 認証状態監視フック
 *
 * 使用例:
 * ```tsx
 * const {
 *   currentState,
 *   isMonitoring,
 *   startMonitoring,
 *   stopMonitoring,
 *   checkAuthState,
 * } = useAuthStateMonitor({
 *   autoStart: true,
 *   onAuthStateChange: (state) => {
 *     console.log('認証状態が変更されました:', state);
 *   },
 *   onError: (error) => {
 *     console.error('認証エラー:', error);
 *   },
 * });
 * ```
 */
export const useAuthStateMonitor = (
  options: UseAuthStateMonitorOptions = {}
): UseAuthStateMonitorReturn => {
  const {
    autoStart = false,
    initialState,
    config,
    onAuthStateChange,
    onTokenExpired,
    onError,
  } = options;

  // 状態管理
  const [currentState, setCurrentState] = useState<AuthState | null>(
    authStateMonitor.getCurrentState()
  );
  const [isMonitoring, setIsMonitoring] = useState(authStateMonitor.isActive());
  const [listenerCount, setListenerCount] = useState(authStateMonitor.getListenerCount());
  const [lastError, setLastError] = useState<AuthError | null>(null);

  // リスナーIDの管理
  const listenerIdRef = useRef<string>(`listener-${Date.now()}-${Math.random()}`);
  const removeListenerRef = useRef<(() => void) | null>(null);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  /**
   * 監視を開始
   */
  const startMonitoring = useCallback(
    (initialStateParam?: AuthState) => {
      try {
        // 設定を更新
        if (config) {
          authStateMonitor.updateConfig(config);
        }

        // 監視を開始
        authStateMonitor.startMonitoring(initialStateParam || initialState);

        setIsMonitoring(true);
        setCurrentState(authStateMonitor.getCurrentState());

        console.log('認証状態監視を開始しました');
      } catch (error) {
        console.error('認証状態監視の開始に失敗しました:', error);

        const authError: AuthError = {
          code: 'MONITOR_START_FAILED',
          message: '認証状態監視の開始に失敗しました',
          timestamp: new Date(),
          retryable: true,
        };

        setLastError(authError);
        onError?.(authError);
      }
    },
    [config, initialState, onError]
  );

  /**
   * 監視を停止
   */
  const stopMonitoring = useCallback(() => {
    try {
      authStateMonitor.stopMonitoring();
      setIsMonitoring(false);

      console.log('認証状態監視を停止しました');
    } catch (error) {
      console.error('認証状態監視の停止に失敗しました:', error);

      const authError: AuthError = {
        code: 'MONITOR_STOP_FAILED',
        message: '認証状態監視の停止に失敗しました',
        timestamp: new Date(),
        retryable: false,
      };

      setLastError(authError);
      onError?.(authError);
    }
  }, [onError]);

  /**
   * 認証状態を手動チェック
   */
  const checkAuthState = useCallback(async (): Promise<AuthState> => {
    try {
      const state = await authStateMonitor.checkAuthState();
      setCurrentState(state);
      return state;
    } catch (error) {
      console.error('認証状態チェックに失敗しました:', error);

      const authError: AuthError = {
        code: 'MANUAL_CHECK_FAILED',
        message: '認証状態チェックに失敗しました',
        timestamp: new Date(),
        retryable: true,
      };

      setLastError(authError);
      onError?.(authError);

      throw error;
    }
  }, [onError]);

  // リスナーの登録
  useEffect(() => {
    const listener: AuthStateListener = {
      id: listenerIdRef.current,
      onAuthStateChange: (state: AuthState) => {
        setCurrentState(state);
        setListenerCount(authStateMonitor.getListenerCount());
        onAuthStateChange?.(state);
      },
      onTokenExpired: () => {
        console.log('トークンが期限切れになりました');
        onTokenExpired?.();
      },
      onError: (error: AuthError) => {
        setLastError(error);
        onError?.(error);
      },
    };

    // リスナーを登録
    removeListenerRef.current = authStateMonitor.addListener(listener);
    setListenerCount(authStateMonitor.getListenerCount());

    return () => {
      // リスナーを削除
      if (removeListenerRef.current) {
        removeListenerRef.current();
        removeListenerRef.current = null;
      }
      setListenerCount(authStateMonitor.getListenerCount());
    };
  }, [onAuthStateChange, onTokenExpired, onError]);

  // 自動開始
  useEffect(() => {
    if (autoStart && !authStateMonitor.isActive()) {
      startMonitoring();
    }
  }, [autoStart, startMonitoring]);

  // コンポーネントアンマウント時のクリーンアップ
  // 要件 5.5: コンポーネントがアンマウントされた時に認証状態の監視が適切にクリーンアップされる
  useEffect(() => {
    return () => {
      // リスナーを削除（useEffectの依存配列のクリーンアップで既に実行されるが、念のため）
      if (removeListenerRef.current) {
        removeListenerRef.current();
      }
    };
  }, []);

  // 監視状態の同期
  useEffect(() => {
    const syncMonitoringState = () => {
      setIsMonitoring(authStateMonitor.isActive());
      setCurrentState(authStateMonitor.getCurrentState());
      setListenerCount(authStateMonitor.getListenerCount());
    };

    // 定期的に状態を同期（他のコンポーネントが監視状態を変更した場合に対応）
    const syncInterval = setInterval(syncMonitoringState, 1000);

    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  return {
    currentState,
    isMonitoring,
    listenerCount,
    lastError,
    startMonitoring,
    stopMonitoring,
    checkAuthState,
    clearError,
  };
};

/**
 * 認証状態監視フック（簡易版）
 *
 * 基本的な監視機能のみを提供する軽量版
 *
 * 使用例:
 * ```tsx
 * const { currentState, isMonitoring } = useSimpleAuthStateMonitor();
 * ```
 */
export const useSimpleAuthStateMonitor = () => {
  const [currentState, setCurrentState] = useState<AuthState | null>(
    authStateMonitor.getCurrentState()
  );
  const [isMonitoring, setIsMonitoring] = useState(authStateMonitor.isActive());

  useEffect(() => {
    const listener: AuthStateListener = {
      id: `simple-listener-${Date.now()}-${Math.random()}`,
      onAuthStateChange: setCurrentState,
      onTokenExpired: () => {
        console.log('トークンが期限切れになりました');
      },
      onError: (error: AuthError) => {
        console.error('認証エラー:', error);
      },
    };

    const removeListener = authStateMonitor.addListener(listener);

    // 監視状態の同期
    const syncInterval = setInterval(() => {
      setIsMonitoring(authStateMonitor.isActive());
      setCurrentState(authStateMonitor.getCurrentState());
    }, 1000);

    return () => {
      removeListener();
      clearInterval(syncInterval);
    };
  }, []);

  return {
    currentState,
    isMonitoring,
  };
};

export default useAuthStateMonitor;
