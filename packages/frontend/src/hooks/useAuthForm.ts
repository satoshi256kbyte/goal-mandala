import { useState } from 'react';
import { AuthService } from '../services/auth';
import { useErrorHandler } from './useErrorHandler';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * 認証フォームフックのオプション
 */
export interface UseAuthFormOptions {
  /** 成功時のコールバック */
  onSuccess?: () => void;
  /** エラー時のコールバック */
  onError?: (error: AuthError) => void;
  /** 自動リトライの回数 */
  maxRetries?: number;
  /** リトライ間隔（ミリ秒） */
  retryDelay?: number;
}

/**
 * 認証フォームフックの戻り値の型
 */
export interface UseAuthFormReturn {
  /** ローディング状態 */
  isLoading: boolean;
  /** 成功メッセージ */
  successMessage: string | null;
  /** エラー情報 */
  error: string | null;
  /** ネットワークエラーかどうか */
  isNetworkError: boolean;
  /** 再試行可能かどうか */
  isRetryable: boolean;
  /** オンライン状態 */
  isOnline: boolean;
  /** ログイン実行 */
  signIn: (email: string, password: string) => Promise<void>;
  /** サインアップ実行 */
  signUp: (email: string, password: string, name: string) => Promise<void>;
  /** パスワードリセット実行 */
  resetPassword: (email: string) => Promise<void>;
  /** エラーをクリア */
  clearError: () => void;
  /** 成功メッセージをクリア */
  clearSuccess: () => void;
  /** 再試行 */
  retry: () => void;
}

/**
 * 認証フォーム用統合フック
 *
 * 認証操作、エラーハンドリング、ネットワーク状態監視、
 * 自動リトライ機能を統合したフックです。
 */
export const useAuthForm = (options: UseAuthFormOptions = {}): UseAuthFormReturn => {
  const { onSuccess, onError, maxRetries = 3, retryDelay = 1000 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<(() => Promise<void>) | null>(null);
  const [, setRetryCount] = useState(0);

  const { error, clearError, setError, isNetworkError, isRetryable } = useErrorHandler();
  const { isOnline } = useNetworkStatus();

  const clearSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  const executeWithRetry = useCallback(
    async (operation: () => Promise<void>, operationName: string, successMsg?: string) => {
      setIsLoading(true);
      clearError();
      clearSuccess();
      setLastOperation(() => operation);

      let currentRetry = 0;

      const attemptOperation = async (): Promise<void> => {
        try {
          await operation();
          setSuccessMessage(successMsg || '操作が完了しました');
          setRetryCount(0);
          onSuccess?.();
        } catch (err) {
          const authError = err as AuthError;

          // ネットワークエラーで自動リトライ可能な場合
          if (AuthService.isNetworkError(authError) && currentRetry < maxRetries) {
            currentRetry++;
            setRetryCount(currentRetry);

            // リトライ前に少し待機
            await new Promise(resolve => setTimeout(resolve, retryDelay * currentRetry));

            // ネットワーク接続をテスト
            const isConnected = await AuthService.testNetworkConnection();
            if (isConnected) {
              return attemptOperation();
            }
          }

          setError(authError);
          setRetryCount(0);
          onError?.(authError);
        } finally {
          setIsLoading(false);
        }
      };

      await attemptOperation();
    },
    [clearError, clearSuccess, maxRetries, retryDelay, onSuccess, onError, setError]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      await executeWithRetry(
        () => AuthService.signIn(email, password),
        'signIn',
        'ログインしました'
      );
    },
    [executeWithRetry]
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      await executeWithRetry(
        () => AuthService.signUp(email, password, name),
        'signUp',
        '確認メールを送信しました。メールをご確認ください'
      );
    },
    [executeWithRetry]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      await executeWithRetry(
        () => AuthService.resetPassword(email),
        'resetPassword',
        'パスワードリセットメールを送信しました'
      );
    },
    [executeWithRetry]
  );

  const retry = useCallback(() => {
    if (lastOperation) {
      lastOperation();
    }
  }, [lastOperation]);

  return {
    isLoading,
    successMessage,
    error,
    isNetworkError,
    isRetryable,
    isOnline,
    signIn,
    signUp,
    resetPassword,
    clearError,
    clearSuccess,
    retry,
  };
};

export default useAuthForm;
