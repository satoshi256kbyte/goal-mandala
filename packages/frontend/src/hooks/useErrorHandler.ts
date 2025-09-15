import { useState, useCallback } from 'react';
import { AuthError } from '../services/auth';

/**
 * エラーハンドリングフックの戻り値の型
 */
export interface UseErrorHandlerReturn {
  /** 現在のエラー */
  error: string | null;
  /** エラーをクリア */
  clearError: () => void;
  /** エラーを設定 */
  setError: (error: string | AuthError | Error | unknown) => void;
  /** ネットワークエラーかどうか */
  isNetworkError: boolean;
  /** 再試行可能なエラーかどうか */
  isRetryable: boolean;
}

/**
 * エラーハンドリングフック
 *
 * 認証エラー、ネットワークエラー、その他のエラーを統一的に処理します。
 * エラーの種類に応じて適切なユーザーフィードバックを提供します。
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isRetryable, setIsRetryable] = useState(false);

  const clearError = useCallback(() => {
    setErrorState(null);
    setIsNetworkError(false);
    setIsRetryable(false);
  }, []);

  const setError = useCallback((errorInput: string | AuthError | Error | unknown) => {
    let errorMessage: string;
    let networkError = false;
    let retryable = false;

    if (typeof errorInput === 'string') {
      errorMessage = errorInput;
    } else if (errorInput && typeof errorInput === 'object') {
      // AuthError型の場合
      if ('code' in errorInput && 'message' in errorInput) {
        const authError = errorInput as AuthError;
        errorMessage = authError.message;

        // ネットワークエラーの判定
        networkError =
          authError.code === 'NetworkError' ||
          authError.code === 'TimeoutError' ||
          authError.code === 'ServiceUnavailable';

        // 再試行可能なエラーの判定
        retryable =
          networkError ||
          authError.code === 'TooManyRequestsException' ||
          authError.code === 'LimitExceededException' ||
          authError.code === 'ServiceUnavailable';
      }
      // Error型の場合
      else if ('message' in errorInput) {
        const error = errorInput as Error;
        errorMessage = error.message;

        // ネットワーク関連のエラーメッセージを検出
        networkError =
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('fetch') ||
          error.message.toLowerCase().includes('connection');
        retryable = networkError;
      } else {
        errorMessage = 'エラーが発生しました。しばらく待ってから再試行してください';
      }
    } else {
      errorMessage = 'エラーが発生しました。しばらく待ってから再試行してください';
    }

    setErrorState(errorMessage);
    setIsNetworkError(networkError);
    setIsRetryable(retryable);
  }, []);

  return {
    error,
    clearError,
    setError,
    isNetworkError,
    isRetryable,
  };
};

export default useErrorHandler;
