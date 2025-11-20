import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoalFormData } from '../schemas/goal-form';
import {
  GoalFormService,
  CreateGoalResponse,
  SaveDraftResponse,
  submitGoalForm,
  saveDraftForm,
  getErrorMessage,
  getErrorDetails,
  ApiError,
} from '../services/goalFormService';

/**
 * 送信状態の型
 */
export interface SubmissionState {
  isSubmitting: boolean;
  isDraftSaving: boolean;
  isProcessing: boolean;
  progress: number;
  message: string;
  error: string | null;
  success: boolean;
  processingId: string | null;
  goalId: string | null;
}

/**
 * 送信オプションの型
 */
export interface SubmissionOptions {
  /** 送信前のコールバック */
  onBeforeSubmit?: (data: GoalFormData) => Promise<boolean> | boolean;
  /** 送信成功時のコールバック */
  onSubmitSuccess?: (response: CreateGoalResponse) => void;
  /** 送信エラー時のコールバック */
  onSubmitError?: (error: Error) => void;
  /** 下書き保存成功時のコールバック */
  onDraftSaveSuccess?: (response: SaveDraftResponse) => void;
  /** 下書き保存エラー時のコールバック */
  onDraftSaveError?: (error: Error) => void;
  /** 進捗更新時のコールバック */
  onProgress?: (message: string, progress: number) => void;
  /** 自動的に次のページに遷移するか */
  autoNavigate?: boolean;
  /** 遷移先のパス */
  navigationPath?: string;
  /** リトライを有効にするか */
  enableRetry?: boolean;
  /** 処理状況の監視間隔（ミリ秒） */
  statusCheckInterval?: number;
}

/**
 * 初期状態
 */
const initialState: SubmissionState = {
  isSubmitting: false,
  isDraftSaving: false,
  isProcessing: false,
  progress: 0,
  message: '',
  error: null,
  success: false,
  processingId: null,
  goalId: null,
};

/**
 * 目標フォーム送信用のカスタムフック
 */
export const useGoalFormSubmission = (options: SubmissionOptions = {}) => {
  const {
    onBeforeSubmit,
    onSubmitSuccess,
    onSubmitError,
    onDraftSaveSuccess,
    onDraftSaveError,
    onProgress,
    autoNavigate = true,
    navigationPath = '/mandala/create/processing',
    enableRetry = true,
    statusCheckInterval = 2000,
  } = options;

  const navigate = useNavigate();
  const [state, setState] = useState<SubmissionState>(initialState);
  const statusCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 状態更新のヘルパー関数
  const updateState = useCallback((updates: Partial<SubmissionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 進捗更新
  const updateProgress = useCallback(
    (message: string, progress: number = 0) => {
      updateState({ message, progress });
      onProgress?.(message, progress);
    },
    [updateState, onProgress]
  );

  // エラー処理
  const handleError = useCallback(
    (error: Error, type: 'submit' | 'draftSave' = 'submit') => {
      const errorMessage = getErrorMessage(error);
      const errorDetails = getErrorDetails(error);

      updateState({
        error: errorMessage,
        isSubmitting: false,
        isDraftSaving: false,
        isProcessing: false,
      });

      if (type === 'submit') {
        onSubmitError?.(error);
      } else {
        onDraftSaveError?.(error);
      }

      console.error(`${type} error:`, error, errorDetails);
    },
    [updateState, onSubmitError, onDraftSaveError]
  );

  // 処理状況の監視
  const startStatusMonitoring = useCallback(
    (processingId: string) => {
      const checkStatus = async () => {
        try {
          const status = await GoalFormService.getProcessingStatus(processingId);

          updateProgress(status.message, status.progress);

          if (status.status === 'completed') {
            updateState({
              isProcessing: false,
              success: true,
              goalId: status.goalId || null,
            });

            if (statusCheckTimerRef.current) {
              clearInterval(statusCheckTimerRef.current);
              statusCheckTimerRef.current = null;
            }

            if (autoNavigate && status.goalId) {
              navigate(`/mandala/${status.goalId}`);
            }
          } else if (status.status === 'failed') {
            const error = new ApiError(status.error || 'AI処理に失敗しました');
            handleError(error);

            if (statusCheckTimerRef.current) {
              clearInterval(statusCheckTimerRef.current);
              statusCheckTimerRef.current = null;
            }
          }
        } catch (error) {
          console.warn('処理状況の確認に失敗しました:', error);
          // 状況確認の失敗は致命的ではないので、監視を続行
        }
      };

      // 初回チェック
      checkStatus();

      // 定期的なチェック
      statusCheckTimerRef.current = setInterval(checkStatus, statusCheckInterval);
    },
    [updateProgress, updateState, handleError, autoNavigate, navigate, statusCheckInterval]
  );

  // 処理状況の監視を停止
  const stopStatusMonitoring = useCallback(() => {
    if (statusCheckTimerRef.current) {
      clearInterval(statusCheckTimerRef.current);
      statusCheckTimerRef.current = null;
    }
  }, []);

  // フォーム送信
  const submitForm = useCallback(
    async (formData: GoalFormData) => {
      try {
        // 送信前のバリデーション
        if (onBeforeSubmit) {
          const canSubmit = await onBeforeSubmit(formData);
          if (!canSubmit) {
            return;
          }
        }

        // 既存の処理をキャンセル
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        updateState({
          isSubmitting: true,
          isProcessing: false,
          error: null,
          success: false,
          progress: 0,
        });

        updateProgress('AI生成を開始しています...', 10);

        const response = await submitGoalForm(formData, {
          onProgress: message => updateProgress(message, 30),
          enableRetry,
        });

        updateState({
          isSubmitting: false,
          isProcessing: true,
          processingId: response.processingId,
        });

        onSubmitSuccess?.(response);

        // 処理状況の監視を開始
        if (response.status === 'processing') {
          startStatusMonitoring(response.processingId);
        } else if (response.status === 'completed') {
          updateState({
            isProcessing: false,
            success: true,
            goalId: response.goalId || null,
          });

          if (autoNavigate) {
            navigate(navigationPath);
          }
        }
      } catch (error) {
        handleError(error as Error, 'submit');
      }
    },
    [
      onBeforeSubmit,
      updateState,
      updateProgress,
      enableRetry,
      onSubmitSuccess,
      startStatusMonitoring,
      autoNavigate,
      navigate,
      navigationPath,
      handleError,
    ]
  );

  // 下書き保存
  const saveDraft = useCallback(
    async (formData: PartialGoalFormData) => {
      try {
        updateState({
          isDraftSaving: true,
          error: null,
        });

        const response = await saveDraftForm(formData, {
          onProgress: message => updateProgress(message),
          enableRetry,
        });

        updateState({
          isDraftSaving: false,
        });

        onDraftSaveSuccess?.(response);
      } catch (error) {
        handleError(error as Error, 'draftSave');
      }
    },
    [updateState, updateProgress, enableRetry, onDraftSaveSuccess, handleError]
  );

  // 処理のキャンセル
  const cancelProcessing = useCallback(async () => {
    if (!state.processingId) {
      return;
    }

    try {
      await GoalFormService.cancelProcessing(state.processingId);

      stopStatusMonitoring();

      updateState({
        isProcessing: false,
        isSubmitting: false,
        processingId: null,
        message: '処理がキャンセルされました',
      });
    } catch (error) {
      console.error('処理のキャンセルに失敗しました:', error);
    }
  }, [state.processingId, stopStatusMonitoring, updateState]);

  // 状態のリセット
  const resetState = useCallback(() => {
    stopStatusMonitoring();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(initialState);
  }, [stopStatusMonitoring]);

  // クリーンアップ
  const cleanup = useCallback(() => {
    stopStatusMonitoring();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [stopStatusMonitoring]);

  return {
    // 状態
    state,

    // アクション
    submitForm,
    saveDraft,
    cancelProcessing,
    resetState,
    cleanup,

    // ヘルパー
    updateProgress,

    // 個別の状態フラグ（便利なアクセサー）
    isSubmitting: state.isSubmitting,
    isDraftSaving: state.isDraftSaving,
    isProcessing: state.isProcessing,
    hasError: !!state.error,
    isSuccess: state.success,
    canCancel: state.isProcessing && !!state.processingId,
  };
};

/**
 * 下書き管理用のカスタムフック
 */
export const useGoalFormDraft = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDraft = useCallback(async (): Promise<PartialGoalFormData | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await GoalFormService.getDraft();
      return response.draftData;
    } catch (error) {
      const errorMessage = getErrorMessage(error as Error);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDraft = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await GoalFormService.deleteDraft();
      return true;
    } catch (error) {
      const errorMessage = getErrorMessage(error as Error);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    loadDraft,
    deleteDraft,
  };
};
