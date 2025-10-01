import { useState, useCallback, useRef, useEffect } from 'react';
import { ApiError, NetworkErrorType } from '../services/api';

/**
 * エラー回復戦略の種類
 */
export enum RecoveryStrategy {
  /** 自動再試行 */
  AUTO_RETRY = 'auto_retry',
  /** 手動再試行 */
  MANUAL_RETRY = 'manual_retry',
  /** オフライン復帰待ち */
  WAIT_ONLINE = 'wait_online',
  /** フォールバック処理 */
  FALLBACK = 'fallback',
  /** ユーザー介入要求 */
  USER_INTERVENTION = 'user_intervention',
  /** 回復不可能 */
  UNRECOVERABLE = 'unrecoverable',
}

/**
 * 回復アクションの種類
 */
export enum RecoveryAction {
  /** 再試行 */
  RETRY = 'retry',
  /** リロード */
  RELOAD = 'reload',
  /** キャッシュクリア */
  CLEAR_CACHE = 'clear_cache',
  /** ローカルストレージクリア */
  CLEAR_STORAGE = 'clear_storage',
  /** 代替手段の提案 */
  SUGGEST_ALTERNATIVE = 'suggest_alternative',
  /** サポート連絡 */
  CONTACT_SUPPORT = 'contact_support',
}

/**
 * エラー回復状態
 */
export interface ErrorRecoveryState {
  /** 回復中かどうか */
  isRecovering: boolean;
  /** 回復戦略 */
  strategy: RecoveryStrategy | null;
  /** 推奨アクション */
  recommendedActions: RecoveryAction[];
  /** 回復試行回数 */
  recoveryAttempts: number;
  /** 最後の回復試行時刻 */
  lastRecoveryAttempt: Date | null;
  /** 回復成功フラグ */
  recoverySuccessful: boolean;
}

/**
 * エラー回復フックの戻り値の型
 */
export interface UseErrorRecoveryReturn {
  /** 回復状態 */
  recoveryState: ErrorRecoveryState;
  /** エラー回復を開始 */
  startRecovery: (error: ApiError, context?: ErrorRecoveryContext) => Promise<boolean>;
  /** 手動回復アクションを実行 */
  executeRecoveryAction: (action: RecoveryAction) => Promise<boolean>;
  /** 回復状態をリセット */
  resetRecovery: () => void;
  /** 回復可能かチェック */
  isRecoverable: (error: ApiError) => boolean;
  /** 推奨回復戦略を取得 */
  getRecoveryStrategy: (error: ApiError) => RecoveryStrategy;
  /** 回復進捗率（0-1） */
  recoveryProgress: number;
}

/**
 * エラー回復コンテキスト
 */
export interface ErrorRecoveryContext {
  /** エラーが発生した操作 */
  operation?: string;
  /** 再試行可能な関数 */
  retryFunction?: () => Promise<unknown>;
  /** フォールバック関数 */
  fallbackFunction?: () => Promise<unknown>;
  /** ユーザーデータ */
  userData?: unknown;
  /** 追加のメタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * エラー回復フックのオプション
 */
export interface UseErrorRecoveryOptions {
  /** 最大回復試行回数 */
  maxRecoveryAttempts?: number;
  /** 回復試行間隔（ミリ秒） */
  recoveryInterval?: number;
  /** 自動回復を有効にするか */
  enableAutoRecovery?: boolean;
  /** オフライン検出を有効にするか */
  enableOfflineDetection?: boolean;
  /** 回復開始時のコールバック */
  onRecoveryStart?: (strategy: RecoveryStrategy) => void;
  /** 回復成功時のコールバック */
  onRecoverySuccess?: (strategy: RecoveryStrategy) => void;
  /** 回復失敗時のコールバック */
  onRecoveryFailure?: (strategy: RecoveryStrategy, error: Error) => void;
  /** 回復進捗更新時のコールバック */
  onRecoveryProgress?: (progress: number) => void;
}

/**
 * エラー回復フック
 *
 * 各種エラーに対する自動・手動回復機能を提供します。
 */
export const useErrorRecovery = (options: UseErrorRecoveryOptions = {}): UseErrorRecoveryReturn => {
  const {
    maxRecoveryAttempts: _maxRecoveryAttempts = 3, // eslint-disable-line @typescript-eslint/no-unused-vars
    recoveryInterval = 2000,
    enableAutoRecovery = true,
    enableOfflineDetection = true,
    onRecoveryStart,
    onRecoverySuccess,
    onRecoveryFailure,
    onRecoveryProgress,
  } = options;

  const [recoveryState, setRecoveryState] = useState<ErrorRecoveryState>({
    isRecovering: false,
    strategy: null,
    recommendedActions: [],
    recoveryAttempts: 0,
    lastRecoveryAttempt: null,
    recoverySuccessful: false,
  });

  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contextRef = useRef<ErrorRecoveryContext | null>(null);

  /**
   * エラーが回復可能かチェック
   */
  const isRecoverable = useCallback((error: ApiError): boolean => {
    const recoverableErrors = [
      NetworkErrorType.TIMEOUT,
      NetworkErrorType.CONNECTION_ERROR,
      NetworkErrorType.SERVER_ERROR,
      NetworkErrorType.RATE_LIMIT,
      NetworkErrorType.OFFLINE,
    ];

    return recoverableErrors.includes(error.code as NetworkErrorType) || error.retryable;
  }, []);

  /**
   * 推奨回復戦略を取得
   */
  const getRecoveryStrategy = useCallback(
    (error: ApiError): RecoveryStrategy => {
      switch (error.code) {
        case NetworkErrorType.OFFLINE:
          return RecoveryStrategy.WAIT_ONLINE;

        case NetworkErrorType.TIMEOUT:
        case NetworkErrorType.CONNECTION_ERROR:
          return enableAutoRecovery ? RecoveryStrategy.AUTO_RETRY : RecoveryStrategy.MANUAL_RETRY;

        case NetworkErrorType.SERVER_ERROR:
          return RecoveryStrategy.AUTO_RETRY;

        case NetworkErrorType.RATE_LIMIT:
          return RecoveryStrategy.AUTO_RETRY;

        case NetworkErrorType.CLIENT_ERROR:
          return RecoveryStrategy.USER_INTERVENTION;

        default:
          return error.retryable ? RecoveryStrategy.MANUAL_RETRY : RecoveryStrategy.UNRECOVERABLE;
      }
    },
    [enableAutoRecovery]
  );

  /**
   * 推奨アクションを取得
   */
  const getRecommendedActions = useCallback(
    (error: ApiError, strategy: RecoveryStrategy): RecoveryAction[] => {
      const actions: RecoveryAction[] = [];

      switch (strategy) {
        case RecoveryStrategy.AUTO_RETRY:
        case RecoveryStrategy.MANUAL_RETRY:
          actions.push(RecoveryAction.RETRY);
          break;

        case RecoveryStrategy.WAIT_ONLINE:
          // オンライン復帰を待つ（アクションなし）
          break;

        case RecoveryStrategy.FALLBACK:
          actions.push(RecoveryAction.SUGGEST_ALTERNATIVE);
          break;

        case RecoveryStrategy.USER_INTERVENTION:
          actions.push(RecoveryAction.RELOAD);
          actions.push(RecoveryAction.CLEAR_CACHE);
          if (error.code === NetworkErrorType.CLIENT_ERROR) {
            actions.push(RecoveryAction.CONTACT_SUPPORT);
          }
          break;

        case RecoveryStrategy.UNRECOVERABLE:
          actions.push(RecoveryAction.CONTACT_SUPPORT);
          break;
      }

      return actions;
    },
    []
  );

  /**
   * 自動回復を実行
   */
  const executeAutoRecovery = useCallback(
    async (
      error: ApiError,
      strategy: RecoveryStrategy,
      context: ErrorRecoveryContext
    ): Promise<boolean> => {
      if (strategy !== RecoveryStrategy.AUTO_RETRY) {
        return false;
      }

      try {
        // 進捗更新
        setRecoveryProgress(0.3);
        onRecoveryProgress?.(0.3);

        // 遅延
        await new Promise(resolve => setTimeout(resolve, recoveryInterval));

        // 進捗更新
        setRecoveryProgress(0.6);
        onRecoveryProgress?.(0.6);

        // 再試行実行
        if (context.retryFunction) {
          await context.retryFunction();
        }

        // 成功
        setRecoveryProgress(1);
        onRecoveryProgress?.(1);
        return true;
      } catch (retryError) {
        console.error('自動回復に失敗しました:', retryError);
        return false;
      }
    },
    [recoveryInterval, onRecoveryProgress]
  );

  /**
   * オフライン回復を実行
   */
  const executeOfflineRecovery = useCallback(async (): Promise<boolean> => {
    return new Promise(resolve => {
      const checkOnline = () => {
        if (navigator.onLine) {
          setRecoveryProgress(1);
          onRecoveryProgress?.(1);
          resolve(true);
        } else {
          // 進捗を少しずつ更新
          setRecoveryProgress(prev => Math.min(prev + 0.1, 0.9));
          setTimeout(checkOnline, 1000);
        }
      };

      setRecoveryProgress(0.1);
      onRecoveryProgress?.(0.1);
      checkOnline();
    });
  }, [onRecoveryProgress]);

  /**
   * フォールバック回復を実行
   */
  const executeFallbackRecovery = useCallback(
    async (context: ErrorRecoveryContext): Promise<boolean> => {
      try {
        setRecoveryProgress(0.5);
        onRecoveryProgress?.(0.5);

        if (context.fallbackFunction) {
          await context.fallbackFunction();
          setRecoveryProgress(1);
          onRecoveryProgress?.(1);
          return true;
        }

        return false;
      } catch (fallbackError) {
        console.error('フォールバック回復に失敗しました:', fallbackError);
        return false;
      }
    },
    [onRecoveryProgress]
  );

  /**
   * エラー回復を開始
   */
  const startRecovery = useCallback(
    async (error: ApiError, context: ErrorRecoveryContext = {}): Promise<boolean> => {
      if (!isRecoverable(error)) {
        return false;
      }

      const strategy = getRecoveryStrategy(error);
      const recommendedActions = getRecommendedActions(error, strategy);

      // 回復状態を更新
      setRecoveryState(prev => ({
        ...prev,
        isRecovering: true,
        strategy,
        recommendedActions,
        recoveryAttempts: prev.recoveryAttempts + 1,
        lastRecoveryAttempt: new Date(),
        recoverySuccessful: false,
      }));

      setRecoveryProgress(0);
      contextRef.current = context;

      onRecoveryStart?.(strategy);

      try {
        let success = false;

        switch (strategy) {
          case RecoveryStrategy.AUTO_RETRY:
            success = await executeAutoRecovery(error, strategy, context);
            break;

          case RecoveryStrategy.WAIT_ONLINE:
            if (enableOfflineDetection) {
              success = await executeOfflineRecovery();
            }
            break;

          case RecoveryStrategy.FALLBACK:
            success = await executeFallbackRecovery(context);
            break;

          case RecoveryStrategy.MANUAL_RETRY:
          case RecoveryStrategy.USER_INTERVENTION:
            // 手動操作を待つ
            success = false;
            break;

          case RecoveryStrategy.UNRECOVERABLE:
            success = false;
            break;
        }

        // 回復状態を更新
        setRecoveryState(prev => ({
          ...prev,
          isRecovering: false,
          recoverySuccessful: success,
        }));

        if (success) {
          onRecoverySuccess?.(strategy);
        } else {
          onRecoveryFailure?.(strategy, new Error('回復に失敗しました'));
        }

        return success;
      } catch (recoveryError) {
        console.error('回復処理中にエラーが発生しました:', recoveryError);

        setRecoveryState(prev => ({
          ...prev,
          isRecovering: false,
          recoverySuccessful: false,
        }));

        onRecoveryFailure?.(strategy, recoveryError as Error);
        return false;
      }
    },
    [
      isRecoverable,
      getRecoveryStrategy,
      getRecommendedActions,
      onRecoveryStart,
      executeAutoRecovery,
      executeOfflineRecovery,
      executeFallbackRecovery,
      enableOfflineDetection,
      onRecoverySuccess,
      onRecoveryFailure,
    ]
  );

  /**
   * 手動回復アクションを実行
   */
  const executeRecoveryAction = useCallback(async (action: RecoveryAction): Promise<boolean> => {
    try {
      setRecoveryState(prev => ({ ...prev, isRecovering: true }));
      setRecoveryProgress(0);

      switch (action) {
        case RecoveryAction.RETRY:
          if (contextRef.current?.retryFunction) {
            setRecoveryProgress(0.5);
            await contextRef.current.retryFunction();
            setRecoveryProgress(1);
            return true;
          }
          break;

        case RecoveryAction.RELOAD:
          window.location.reload();
          return true;

        case RecoveryAction.CLEAR_CACHE:
          if ('caches' in window) {
            setRecoveryProgress(0.3);
            await caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))));
            setRecoveryProgress(0.7);
          }
          break;

        case RecoveryAction.CLEAR_STORAGE:
          setRecoveryProgress(0.3);
          localStorage.clear();
          sessionStorage.clear();
          setRecoveryProgress(0.7);
          break;

        case RecoveryAction.SUGGEST_ALTERNATIVE:
          if (contextRef.current?.fallbackFunction) {
            setRecoveryProgress(0.5);
            await contextRef.current.fallbackFunction();
            setRecoveryProgress(1);
            return true;
          }
          break;

        case RecoveryAction.CONTACT_SUPPORT:
          // サポート連絡画面を開く（実装は環境に依存）
          console.log('サポートに連絡してください');
          return true;
      }

      setRecoveryProgress(1);
      return true;
    } catch (actionError) {
      console.error('回復アクションの実行に失敗しました:', actionError);
      return false;
    } finally {
      setRecoveryState(prev => ({ ...prev, isRecovering: false }));
    }
  }, []);

  /**
   * 回復状態をリセット
   */
  const resetRecovery = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }

    setRecoveryState({
      isRecovering: false,
      strategy: null,
      recommendedActions: [],
      recoveryAttempts: 0,
      lastRecoveryAttempt: null,
      recoverySuccessful: false,
    });

    setRecoveryProgress(0);
    contextRef.current = null;
  }, []);

  // オンライン/オフライン状態の監視
  useEffect(() => {
    if (!enableOfflineDetection) return;

    const handleOnline = () => {
      if (recoveryState.strategy === RecoveryStrategy.WAIT_ONLINE) {
        // オンライン復帰時の自動回復
        if (contextRef.current?.retryFunction) {
          contextRef.current
            .retryFunction()
            .then(() => {
              setRecoveryState(prev => ({
                ...prev,
                isRecovering: false,
                recoverySuccessful: true,
              }));
              onRecoverySuccess?.(RecoveryStrategy.WAIT_ONLINE);
            })
            .catch(error => {
              onRecoveryFailure?.(RecoveryStrategy.WAIT_ONLINE, error);
            });
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [recoveryState.strategy, enableOfflineDetection, onRecoverySuccess, onRecoveryFailure]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  return {
    recoveryState,
    startRecovery,
    executeRecoveryAction,
    resetRecovery,
    isRecoverable,
    getRecoveryStrategy,
    recoveryProgress,
  };
};

export default useErrorRecovery;
