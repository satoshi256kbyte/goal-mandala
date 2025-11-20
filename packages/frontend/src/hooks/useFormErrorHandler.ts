/**
 * サブ目標・アクション入力フォーム用エラーハンドリングフック
 *
 * 機能:
 * - フォームエラーの状態管理
 * - エラー表示・非表示の制御
 * - 復旧機能の提供
 *
 * 要件: 要件1, 要件2, 要件3
 */

import { useState, useCallback, useEffect } from 'react';
import {
  FormError,
  FormErrorType,
  ValidationErrorDetail,
  NetworkErrorDetail,
  ErrorContext,
} from '../types/form-error';
import { FormErrorHandler } from '../services/form-error-handler';

/**
 * フォームエラーハンドリングフックの戻り値
 */
export interface UseFormErrorHandlerReturn {
  /** 現在のエラー一覧 */
  errors: FormError[];
  /** フィールド別エラー */
  fieldErrors: Record<string, FormError[]>;
  /** エラーがあるかどうか */
  hasErrors: boolean;
  /** 重要なエラーがあるかどうか */
  hasCriticalErrors: boolean;
  /** ネットワークエラーがあるかどうか */
  hasNetworkErrors: boolean;
  /** リトライ可能なエラーがあるかどうか */
  hasRetryableErrors: boolean;

  /** エラーを処理 */
  handleError: (error: unknown, context: ErrorContext) => Promise<FormError>;
  /** バリデーションエラーを処理 */
  handleValidationErrors: (errors: ValidationErrorDetail[], context: ErrorContext) => FormError[];
  /** ネットワークエラーを処理 */
  handleNetworkError: (
    error: unknown,
    context: ErrorContext,
    detail?: NetworkErrorDetail
  ) => Promise<FormError>;
  /** 特定のエラーをクリア */
  clearError: (errorId: string) => void;
  /** フィールドのエラーをクリア */
  clearFieldErrors: (field: string) => void;
  /** 全てのエラーをクリア */
  clearAllErrors: () => void;
  /** エラーを再試行 */
  retryError: (errorId: string) => Promise<void>;
  /** 全ての再試行可能なエラーを再試行 */
  retryAllErrors: () => Promise<void>;
}

/**
 * フォームエラーハンドリングフック
 */
export const useFormErrorHandler = (componentName: string): UseFormErrorHandlerReturn => {
  const [errors, setErrors] = useState<FormError[]>([]);
  const errorHandlerRef = useRef<FormErrorHandler>();
  const errorIdCounterRef = useRef(0);

  // エラーハンドラーの初期化
  useEffect(() => {
    errorHandlerRef.current = new FormErrorHandler();

    // エラーリスナーを追加
    const removeListener = errorHandlerRef.current.addErrorListener(error => {
      const errorWithId = {
        ...error,
        id: `error-${++errorIdCounterRef.current}`,
      } as FormError & { id: string };

      setErrors(prev => [...prev, errorWithId]);
    });

    return () => {
      removeListener();
      errorHandlerRef.current?.clear();
    };
  }, []);

  // フィールド別エラーの計算
  const fieldErrors = errors.reduce(
    (acc, error) => {
      if (error.field) {
        if (!acc[error.field]) {
          acc[error.field] = [];
        }
        acc[error.field].push(error);
      }
      return acc;
    },
    {} as Record<string, FormError[]>
  );

  // エラー状態の計算
  const hasErrors = errors.length > 0;
  const hasCriticalErrors = errors.some(
    error => error.severity === 'critical' || error.severity === 'high'
  );
  const hasNetworkErrors = errors.some(error => error.type === FormErrorType.NETWORK_ERROR);
  const hasRetryableErrors = errors.some(error => error.retryable);

  /**
   * エラーを処理
   */
  const handleError = useCallback(
    async (error: unknown, context: ErrorContext): Promise<FormError> => {
      if (!errorHandlerRef.current) {
        throw new Error('Error handler not initialized');
      }

      const fullContext = {
        ...context,
        component: context.component || componentName,
        timestamp: new Date(),
      };

      return await errorHandlerRef.current.handleError(error, fullContext);
    },
    [componentName]
  );

  /**
   * バリデーションエラーを処理
   */
  const handleValidationErrors = useCallback(
    (validationErrors: ValidationErrorDetail[], context: ErrorContext): FormError[] => {
      if (!errorHandlerRef.current) {
        throw new Error('Error handler not initialized');
      }

      const fullContext = {
        ...context,
        component: context.component || componentName,
        timestamp: new Date(),
      };

      const formErrors = errorHandlerRef.current.handleValidationErrors(
        validationErrors,
        fullContext
      );

      // 既存のバリデーションエラーをクリア
      setErrors(prev => prev.filter(error => error.type !== FormErrorType.VALIDATION_ERROR));

      return formErrors;
    },
    [componentName]
  );

  /**
   * ネットワークエラーを処理
   */
  const handleNetworkError = useCallback(
    async (
      error: unknown,
      context: ErrorContext,
      detail?: NetworkErrorDetail
    ): Promise<FormError> => {
      if (!errorHandlerRef.current) {
        throw new Error('Error handler not initialized');
      }

      const fullContext = {
        ...context,
        component: context.component || componentName,
        timestamp: new Date(),
      };

      return await errorHandlerRef.current.handleNetworkError(error, fullContext, detail);
    },
    [componentName]
  );

  /**
   * 特定のエラーをクリア
   */
  const clearError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => (error as FormError & { id: string }).id !== errorId));
  }, []);

  /**
   * フィールドのエラーをクリア
   */
  const clearFieldErrors = useCallback((field: string) => {
    setErrors(prev => prev.filter(error => error.field !== field));
  }, []);

  /**
   * 全てのエラーをクリア
   */
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * エラーを再試行
   */
  const retryError = useCallback(
    async (errorId: string) => {
      const error = errors.find(e => (e as FormError & { id: string }).id === errorId);

      if (!error || !error.retryable) {
        return;
      }

      // エラーを一時的に削除
      clearError(errorId);

      try {
        // 復旧オプションがある場合は実行
        const recoveryOptions = errorHandlerRef.current?.['recoveryOptions']?.get(error.code || '');
        if (recoveryOptions?.retry) {
          await recoveryOptions.retry();
        }
      } catch (retryError) {
        // 再試行に失敗した場合は新しいエラーとして処理
        await handleError(retryError, {
          component: componentName,
          action: 'retry',
          timestamp: new Date(),
        });
      }
    },
    [errors, clearError, handleError, componentName]
  );

  /**
   * 全ての再試行可能なエラーを再試行
   */
  const retryAllErrors = useCallback(async () => {
    const retryableErrors = errors.filter(error => error.retryable);

    for (const error of retryableErrors) {
      const errorWithId = error as FormError & { id: string };
      await retryError(errorWithId.id);
    }
  }, [errors, retryError]);

  return {
    errors,
    fieldErrors,
    hasErrors,
    hasCriticalErrors,
    hasNetworkErrors,
    hasRetryableErrors,
    handleError,
    handleValidationErrors,
    handleNetworkError,
    clearError,
    clearFieldErrors,
    clearAllErrors,
    retryError,
    retryAllErrors,
  };
};

export default useFormErrorHandler;
