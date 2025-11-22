import { useState } from 'react';
import {
  validateGoalForm,
  validatePartialGoalForm,
  GoalFormData,
  PartialGoalFormData,
} from '../schemas/goal-form';

/**
 * 送信エラーの種類
 */
export enum SubmissionErrorType {
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * 送信エラーの詳細情報
 */
export interface SubmissionError {
  type: SubmissionErrorType;
  message: string;
  details?: Record<string, string>;
  originalError?: Error;
}

/**
 * 送信結果の型定義
 */
export interface SubmissionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: SubmissionError;
}

/**
 * 送信状態の型定義
 */
export interface SubmissionState {
  isSubmitting: boolean;
  hasSubmitted: boolean;
  lastSubmissionTime?: Date;
  submissionCount: number;
}

/**
 * フォーム送信のオプション
 */
export interface FormSubmissionOptions {
  /** 送信前のバリデーション実行フラグ */
  validateBeforeSubmit?: boolean;
  /** 送信タイムアウト時間（ミリ秒） */
  timeoutMs?: number;
  /** 重複送信防止の間隔（ミリ秒） */
  preventDuplicateMs?: number;
  /** エラー時の自動リトライ回数 */
  maxRetries?: number;
  /** リトライ間隔（ミリ秒） */
  retryDelayMs?: number;
}

/**
 * フォーム送信フック
 */
export const useFormSubmission = <TFormData = GoalFormData, TResponse = unknown>(
  options: FormSubmissionOptions = {}
) => {
  const {
    validateBeforeSubmit = true,
    timeoutMs = 30000,
    preventDuplicateMs = 1000,
    maxRetries = 0,
    retryDelayMs = 1000,
  } = options;

  const [submissionState, setSubmissionState] = useState<SubmissionState>({
    isSubmitting: false,
    hasSubmitted: false,
    submissionCount: 0,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * バリデーションエラーを作成
   */
  const createValidationError = useCallback((errors: Record<string, string>): SubmissionError => {
    return {
      type: SubmissionErrorType.VALIDATION_ERROR,
      message: 'フォームの入力内容に問題があります',
      details: errors,
    };
  }, []);

  /**
   * ネットワークエラーを作成
   */
  const createNetworkError = useCallback((originalError: Error): SubmissionError => {
    return {
      type: SubmissionErrorType.NETWORK_ERROR,
      message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      originalError,
    };
  }, []);

  /**
   * サーバーエラーを作成
   */
  const createServerError = useCallback((status: number, message?: string): SubmissionError => {
    return {
      type: SubmissionErrorType.SERVER_ERROR,
      message: message || `サーバーエラーが発生しました（ステータス: ${status}）`,
    };
  }, []);

  /**
   * タイムアウトエラーを作成
   */
  const createTimeoutError = useCallback((): SubmissionError => {
    return {
      type: SubmissionErrorType.TIMEOUT_ERROR,
      message: '送信がタイムアウトしました。しばらく時間をおいて再度お試しください。',
    };
  }, []);

  /**
   * 不明なエラーを作成
   */
  const createUnknownError = useCallback((originalError?: Error): SubmissionError => {
    return {
      type: SubmissionErrorType.UNKNOWN_ERROR,
      message: '予期しないエラーが発生しました。',
      originalError,
    };
  }, []);

  /**
   * 重複送信チェック
   */
  const isDuplicateSubmission = useCallback((): boolean => {
    if (!submissionState.lastSubmissionTime) return false;

    const timeSinceLastSubmission = Date.now() - submissionState.lastSubmissionTime.getTime();
    return timeSinceLastSubmission < preventDuplicateMs;
  }, [submissionState.lastSubmissionTime, preventDuplicateMs]);

  /**
   * フォームデータのバリデーション
   */
  const validateFormData = useCallback(
    (
      data: unknown,
      isPartial = false
    ): {
      isValid: boolean;
      errors?: Record<string, string>;
      validatedData?: TFormData;
    } => {
      if (isPartial) {
        const result = validatePartialGoalForm(data);
        return {
          isValid: result.isValid,
          errors: result.errors,
          validatedData: result.data as TFormData,
        };
      } else {
        const result = validateGoalForm(data);
        return {
          isValid: result.isValid,
          errors: result.errors,
          validatedData: result.data as TFormData,
        };
      }
    },
    []
  );

  /**
   * タイムアウト付きのfetch実行
   */
  const fetchWithTimeout = useCallback(
    async (url: string, options: RequestInit): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw createTimeoutError();
        }
        throw error;
      }
    },
    [timeoutMs, createTimeoutError]
  );

  /**
   * リトライ付きの送信実行
   */
  const executeWithRetry = useCallback(
    async <T>(operation: () => Promise<T>, retryCount = 0): Promise<T> => {
      try {
        return await operation();
      } catch (error) {
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          return executeWithRetry(operation, retryCount + 1);
        }
        throw error;
      }
    },
    [maxRetries, retryDelayMs]
  );

  /**
   * フォーム送信の実行
   */
  const submitForm = useCallback(
    async (
      data: unknown,
      submitFunction: (validatedData: TFormData) => Promise<TResponse>,
      isPartial = false
    ): Promise<SubmissionResult<TResponse>> => {
      // 重複送信チェック
      if (isDuplicateSubmission()) {
        return {
          success: false,
          error: {
            type: SubmissionErrorType.VALIDATION_ERROR,
            message: '送信処理中です。しばらくお待ちください。',
          },
        };
      }

      // 送信状態を更新
      setSubmissionState(prev => ({
        ...prev,
        isSubmitting: true,
        lastSubmissionTime: new Date(),
      }));

      setValidationErrors({});

      try {
        // バリデーション実行
        if (validateBeforeSubmit) {
          const validationResult = validateFormData(data, isPartial);

          if (!validationResult.isValid) {
            setValidationErrors(validationResult.errors || {});
            return {
              success: false,
              error: createValidationError(validationResult.errors || {}),
            };
          }

          // バリデーション済みデータで送信実行
          if (!validationResult.validatedData) {
            throw new Error('バリデーション済みデータが存在しません');
          }
          const result = await executeWithRetry(() =>
            submitFunction(validationResult.validatedData)
          );

          // 送信成功
          setSubmissionState(prev => ({
            ...prev,
            isSubmitting: false,
            hasSubmitted: true,
            submissionCount: prev.submissionCount + 1,
          }));

          return {
            success: true,
            data: result,
          };
        } else {
          // バリデーションなしで送信実行
          const result = await executeWithRetry(() => submitFunction(data as TFormData));

          setSubmissionState(prev => ({
            ...prev,
            isSubmitting: false,
            hasSubmitted: true,
            submissionCount: prev.submissionCount + 1,
          }));

          return {
            success: true,
            data: result,
          };
        }
      } catch (error) {
        setSubmissionState(prev => ({
          ...prev,
          isSubmitting: false,
        }));

        // エラーの種類を判定
        if (error instanceof Error) {
          if (error.message.includes('fetch')) {
            return {
              success: false,
              error: createNetworkError(error),
            };
          }
        }

        // SubmissionErrorの場合はそのまま返す
        if (typeof error === 'object' && error !== null && 'type' in error) {
          return {
            success: false,
            error: error as SubmissionError,
          };
        }

        return {
          success: false,
          error: createUnknownError(error instanceof Error ? error : undefined),
        };
      }
    },
    [
      isDuplicateSubmission,
      validateBeforeSubmit,
      validateFormData,
      createValidationError,
      createNetworkError,
      createUnknownError,
      executeWithRetry,
    ]
  );

  /**
   * API送信用のヘルパー関数
   */
  const submitToAPI = useCallback(
    async (
      data: unknown,
      url: string,
      options: RequestInit = {},
      isPartial = false
    ): Promise<SubmissionResult<TResponse>> => {
      const submitFunction = async (validatedData: TFormData): Promise<TResponse> => {
        const response = await fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify(validatedData),
          ...options,
        });

        if (!response.ok) {
          throw createServerError(response.status, await response.text());
        }

        return response.json();
      };

      return submitForm(data, submitFunction, isPartial);
    },
    [submitForm, fetchWithTimeout, createServerError]
  );

  /**
   * 送信状態をリセット
   */
  const resetSubmissionState = useCallback(() => {
    setSubmissionState({
      isSubmitting: false,
      hasSubmitted: false,
      submissionCount: 0,
    });
    setValidationErrors({});
  }, []);

  /**
   * バリデーションエラーをクリア
   */
  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    // 状態
    submissionState,
    validationErrors,

    // 送信関数
    submitForm,
    submitToAPI,

    // ユーティリティ関数
    validateFormData,
    resetSubmissionState,
    clearValidationErrors,

    // 状態チェック関数
    canSubmit: !submissionState.isSubmitting && !isDuplicateSubmission(),
    hasValidationErrors: Object.keys(validationErrors).length > 0,
  };
};

/**
 * 目標フォーム専用の送信フック
 */
export const useGoalFormSubmission = (options: FormSubmissionOptions = {}) => {
  return useFormSubmission<GoalFormData>(options);
};

/**
 * 下書き保存専用の送信フック
 */
export const useDraftSubmission = (options: FormSubmissionOptions = {}) => {
  return useFormSubmission<PartialGoalFormData>({
    ...options,
    validateBeforeSubmit: false, // 下書きはバリデーションなし
  });
};
