import React, { useState, useCallback, useRef } from 'react';
import { ApiError, NetworkErrorType } from '../services/api';

/**
 * ネットワークエラーハンドリングフックの戻り値の型
 */
export interface UseNetworkErrorHandlerReturn {
  /** 現在のエラー */
  error: ApiError | null;
  /** エラーをクリア */
  clearError: () => void;
  /** エラーを設定 */
  setError: (error: ApiError | Error | unknown) => void;
  /** ネットワークエラーかどうか */
  isNetworkError: boolean;
  /** 再試行可能なエラーかどうか */
  isRetryable: boolean;
  /** オフライン状態かどうか */
  isOffline: boolean;
  /** 再試行関数 */
  retry: () => Promise<void>;
  /** 再試行回数 */
  retryCount: number;
  /** 最大再試行回数に達したかどうか */
  maxRetriesReached: boolean;
  /** エラー回復を試行 */
  attemptRecovery: () => Promise<boolean>;
}

/**
 * ネットワークエラーハンドリングフックのオプション
 */
export interface UseNetworkErrorHandlerOptions {
  /** 最大再試行回数 */
  maxRetries?: number;
  /** 再試行間隔（ミリ秒） */
  retryDelay?: number;
  /** 再試行時のコールバック */
  onRetry?: () => Promise<void>;
  /** エラー回復時のコールバック */
  onRecovery?: () => Promise<void>;
  /** エラー発生時のコールバック */
  onError?: (error: ApiError) => void;
}

/**
 * ネットワークエラーハンドリングフック
 *
 * 目標入力フォーム用のネットワークエラーハンドリング機能を提供します。
 * 自動リトライ、エラー回復、オフライン検出などの機能を含みます。
 */
export const useNetworkErrorHandler = (
  options: UseNetworkErrorHandlerOptions = {}
): UseNetworkErrorHandlerReturn => {
  const { maxRetries = 3, retryDelay = 1000, onRetry, onRecovery, onError } = options;

  const [error, setErrorState] = useState<ApiError | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setErrorState(null);
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * エラーを設定
   */
  const setError = useCallback(
    (errorInput: ApiError | Error | unknown) => {
      let apiError: ApiError;

      if (errorInput && typeof errorInput === 'object' && 'code' in errorInput) {
        // 既にApiError形式の場合
        apiError = errorInput as ApiError;
      } else if (errorInput instanceof Error) {
        // Error型の場合
        apiError = {
          code: NetworkErrorType.CONNECTION_ERROR,
          message: errorInput.message || 'ネットワークエラーが発生しました',
          retryable: true,
          timestamp: new Date(),
        };
      } else {
        // その他の場合
        apiError = {
          code: NetworkErrorType.CONNECTION_ERROR,
          message: 'ネットワークエラーが発生しました',
          retryable: true,
          timestamp: new Date(),
        };
      }

      setErrorState(apiError);

      // エラーコールバックを呼び出し
      if (onError) {
        onError(apiError);
      }
    },
    [onError]
  );

  /**
   * 再試行
   */
  const retry = useCallback(async () => {
    if (!error || !error.retryable || retryCount >= maxRetries) {
      return;
    }

    const nextRetryCount = retryCount + 1;
    setRetryCount(nextRetryCount);

    // 指数バックオフで遅延
    const delay = retryDelay * Math.pow(2, nextRetryCount - 1);

    return new Promise<void>(resolve => {
      retryTimeoutRef.current = setTimeout(async () => {
        try {
          if (onRetry) {
            await onRetry();
          }
          // 成功した場合はエラーをクリア
          clearError();
        } catch (retryError) {
          // 再試行も失敗した場合は新しいエラーを設定
          setError(retryError);
        }
        resolve();
      }, delay);
    });
  }, [error, retryCount, maxRetries, retryDelay, onRetry, clearError, setError]);

  /**
   * エラー回復を試行
   */
  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    if (!error) {
      return true;
    }

    try {
      // オフライン状態の場合はオンライン復帰を待つ
      if (error.code === NetworkErrorType.OFFLINE) {
        if (navigator.onLine) {
          setIsOffline(false);
          clearError();
          if (onRecovery) {
            await onRecovery();
          }
          return true;
        }
        return false;
      }

      // タイムアウトエラーの場合は再試行
      if (error.code === NetworkErrorType.TIMEOUT && error.retryable) {
        await retry();
        return error === null; // エラーがクリアされたかチェック
      }

      // サーバーエラーの場合は再試行
      if (error.code === NetworkErrorType.SERVER_ERROR && error.retryable) {
        await retry();
        return error === null;
      }

      // レート制限エラーの場合は少し待ってから再試行
      if (error.code === NetworkErrorType.RATE_LIMIT) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待機
        await retry();
        return error === null;
      }

      // その他のエラーは回復不可能
      return false;
    } catch (recoveryError) {
      console.error('エラー回復に失敗しました:', recoveryError);
      return false;
    }
  }, [error, retry, clearError, onRecovery]);

  // オンライン/オフライン状態の監視
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // オフラインエラーがある場合は自動回復を試行
      if (error?.code === NetworkErrorType.OFFLINE) {
        attemptRecovery();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setError({
        code: NetworkErrorType.OFFLINE,
        message: 'オフラインです。インターネット接続を確認してください',
        retryable: true,
        timestamp: new Date(),
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, attemptRecovery, setError]);

  // コンポーネントアンマウント時のクリーンアップ
  React.useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const isNetworkError =
    error?.code === NetworkErrorType.CONNECTION_ERROR ||
    error?.code === NetworkErrorType.TIMEOUT ||
    error?.code === NetworkErrorType.OFFLINE;

  const isRetryable = error?.retryable ?? false;
  const maxRetriesReached = retryCount >= maxRetries;

  return {
    error,
    clearError,
    setError,
    isNetworkError,
    isRetryable,
    isOffline,
    retry,
    retryCount,
    maxRetriesReached,
    attemptRecovery,
  };
};

export default useNetworkErrorHandler;
