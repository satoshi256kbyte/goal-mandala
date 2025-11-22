import { useState, useCallback } from 'react';
import { useFormTimeout } from './useTimeout';
import { useNetworkErrorHandler } from './useNetworkErrorHandler';
import { ApiError } from '../services/api';

/**
 * タイムアウト付きフォーム送信フックの戻り値の型
 */
export interface UseFormSubmissionWithTimeoutReturn<T = unknown> {
  /** 送信中かどうか */
  isSubmitting: boolean;
  /** 送信エラー */
  error: ApiError | null;
  /** 送信成功データ */
  data: T | null;
  /** フォームを送信 */
  submit: (submitFn: () => Promise<T>) => Promise<void>;
  /** エラーをクリア */
  clearError: () => void;
  /** 送信をキャンセル */
  cancel: () => void;
  /** タイムアウト進捗（0-1） */
  progress: number;
  /** タイムアウト警告中かどうか */
  isWarning: boolean;
  /** 残り時間（ミリ秒） */
  remainingTime: number;
  /** 再試行 */
  retry: () => Promise<void>;
  /** 再試行回数 */
  retryCount: number;
  /** 最大再試行回数に達したかどうか */
  maxRetriesReached: boolean;
}

/**
 * タイムアウト付きフォーム送信フックのオプション
 */
export interface UseFormSubmissionWithTimeoutOptions {
  /** 送信タイムアウト時間（ミリ秒） */
  timeout?: number;
  /** 警告表示時間（ミリ秒） */
  warningTimeout?: number;
  /** 最大再試行回数 */
  maxRetries?: number;
  /** 再試行間隔（ミリ秒） */
  retryDelay?: number;
  /** 送信開始時のコールバック */
  onSubmitStart?: () => void;
  /** 送信成功時のコールバック */
  onSubmitSuccess?: <T>(data: T) => void;
  /** 送信エラー時のコールバック */
  onSubmitError?: (error: ApiError) => void;
  /** タイムアウト時のコールバック */
  onTimeout?: () => void;
  /** 警告時のコールバック */
  onWarning?: () => void;
  /** キャンセル時のコールバック */
  onCancel?: () => void;
  /** 再試行時のコールバック */
  onRetry?: (retryCount: number) => void;
}

/**
 * タイムアウト付きフォーム送信フック
 *
 * フォーム送信にタイムアウト処理、エラーハンドリング、再試行機能を統合したフックです。
 */
export const useFormSubmissionWithTimeout = <T = unknown>(
  options: UseFormSubmissionWithTimeoutOptions = {}
): UseFormSubmissionWithTimeoutReturn<T> => {
  const {
    timeout = 30000, // 30秒
    warningTimeout = 20000, // 20秒
    maxRetries = 3,
    retryDelay = 1000,
    onSubmitStart,
    onSubmitSuccess,
    onSubmitError,
    onTimeout,
    onWarning,
    onCancel,
    onRetry,
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const submitFnRef = useRef<(() => Promise<T>) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // タイムアウト処理
  const formTimeout = useFormTimeout({
    defaultTimeout: timeout,
    warningTimeout,
    onTimeout: () => {
      handleTimeout();
      onTimeout?.();
    },
    onWarning: () => {
      onWarning?.();
    },
    onCancel: () => {
      onCancel?.();
    },
  });

  // ネットワークエラーハンドリング
  const networkErrorHandler = useNetworkErrorHandler({
    maxRetries,
    retryDelay,
    onRetry: async () => {
      if (submitFnRef.current) {
        await executeSubmission(submitFnRef.current);
      }
    },
    onError: error => {
      onSubmitError?.(error);
    },
  });

  /**
   * タイムアウト処理
   */
  const handleTimeout = useCallback(() => {
    // 進行中のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // タイムアウトエラーを設定
    const timeoutError: ApiError = {
      code: NetworkErrorType.TIMEOUT,
      message: 'リクエストがタイムアウトしました',
      retryable: true,
      timestamp: new Date(),
    };

    networkErrorHandler.setError(timeoutError);
    setIsSubmitting(false);
  }, [networkErrorHandler]);

  /**
   * 実際の送信処理を実行
   */
  const executeSubmission = useCallback(
    async (submitFn: () => Promise<T>) => {
      try {
        // AbortControllerを作成
        abortControllerRef.current = new AbortController();

        // タイムアウトを開始
        formTimeout.startSubmissionTimeout(() => {
          handleTimeout();
        });

        // 送信実行
        const result = await submitFn();

        // 成功時の処理
        setData(result);
        setIsSubmitting(false);
        formTimeout.clearTimeout();
        networkErrorHandler.clearError();

        onSubmitSuccess?.(result);
      } catch (error) {
        // エラー時の処理
        setIsSubmitting(false);
        formTimeout.clearTimeout();

        // AbortErrorの場合はタイムアウトとして処理
        if (error instanceof Error && error.name === 'AbortError') {
          return; // handleTimeoutで既に処理済み
        }

        // その他のエラーはネットワークエラーハンドラーに委譲
        networkErrorHandler.setError(error);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [formTimeout, networkErrorHandler, handleTimeout, onSubmitSuccess]
  );

  /**
   * フォームを送信
   */
  const submit = useCallback(
    async (submitFn: () => Promise<T>) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setData(null);
      submitFnRef.current = submitFn;
      networkErrorHandler.clearError();

      onSubmitStart?.();

      await executeSubmission(submitFn);
    },
    [isSubmitting, networkErrorHandler, onSubmitStart, executeSubmission]
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    networkErrorHandler.clearError();
  }, [networkErrorHandler]);

  /**
   * 送信をキャンセル
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    formTimeout.clearTimeout();
    setIsSubmitting(false);
    networkErrorHandler.clearError();
  }, [formTimeout, networkErrorHandler]);

  /**
   * 再試行
   */
  const retry = useCallback(async () => {
    if (!submitFnRef.current || isSubmitting) {
      return;
    }

    onRetry?.(networkErrorHandler.retryCount + 1);
    await networkErrorHandler.retry();
  }, [submitFnRef, isSubmitting, networkErrorHandler, onRetry]);

  return {
    isSubmitting,
    error: networkErrorHandler.error,
    data,
    submit,
    clearError,
    cancel,
    progress: formTimeout.progress,
    isWarning: formTimeout.isWarning,
    remainingTime: formTimeout.remainingTime,
    retry,
    retryCount: networkErrorHandler.retryCount,
    maxRetriesReached: networkErrorHandler.maxRetriesReached,
  };
};

/**
 * 目標フォーム専用の送信フック
 */
export interface GoalFormSubmissionData {
  success: boolean;
  goalId?: string;
  processingId?: string;
  message?: string;
}

export const useGoalFormSubmission = (options: UseFormSubmissionWithTimeoutOptions = {}) => {
  return useFormSubmissionWithTimeout<GoalFormSubmissionData>({
    timeout: 45000, // 45秒（AI処理を考慮）
    warningTimeout: 30000, // 30秒
    maxRetries: 2, // 再試行回数を少なめに
    ...options,
  });
};

/**
 * 下書き保存専用の送信フック
 */
export interface DraftSaveSubmissionData {
  success: boolean;
  draftId: string;
  savedAt: string;
}

export const useDraftSaveSubmission = (options: UseFormSubmissionWithTimeoutOptions = {}) => {
  return useFormSubmissionWithTimeout<DraftSaveSubmissionData>({
    timeout: 10000, // 10秒
    warningTimeout: 7000, // 7秒
    maxRetries: 3,
    ...options,
  });
};

export default useFormSubmissionWithTimeout;
