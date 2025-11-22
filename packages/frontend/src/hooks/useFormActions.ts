import { useState, useCallback } from 'react';
import { PartialGoalFormData } from '../schemas/goal-form';
import { draftUtils } from '../services/draftService';

/**
 * フォームアクションの状態
 */
export interface FormActionState {
  /** 下書き保存中フラグ */
  isDraftSaving: boolean;
  /** フォーム送信中フラグ */
  isSubmitting: boolean;
  /** 最後の下書き保存時刻 */
  lastDraftSaveTime: Date | null;
  /** 下書き保存エラー */
  draftSaveError: Error | null;
  /** フォーム送信エラー */
  submitError: Error | null;
}

/**
 * フォームアクションのオプション
 */
export interface UseFormActionsOptions {
  /** フォームデータ */
  formData: PartialGoalFormData;
  /** フォームが有効かどうか */
  isFormValid: boolean;
  /** 下書き保存成功時のコールバック */
  onDraftSaveSuccess?: (data: PartialGoalFormData) => void;
  /** 下書き保存エラー時のコールバック */
  onDraftSaveError?: (error: Error) => void;
  /** フォーム送信成功時のコールバック */
  onSubmitSuccess?: (data: PartialGoalFormData) => void;
  /** フォーム送信エラー時のコールバック */
  onSubmitError?: (error: Error) => void;
}

/**
 * フォームアクションの戻り値
 */
export interface UseFormActionsReturn {
  /** フォームアクションの状態 */
  state: FormActionState;
  /** 下書き保存の実行 */
  saveDraft: () => Promise<void>;
  /** フォーム送信の実行 */
  submitForm: () => Promise<void>;
  /** エラーのクリア */
  clearErrors: () => void;
  /** 下書き保存が可能かどうか */
  canSaveDraft: boolean;
  /** フォーム送信が可能かどうか */
  canSubmit: boolean;
}

/**
 * フォームアクション管理フック
 */
export const useFormActions = (options: UseFormActionsOptions): UseFormActionsReturn => {
  const {
    formData,
    isFormValid,
    onDraftSaveSuccess,
    onDraftSaveError,
    onSubmitSuccess,
    onSubmitError,
  } = options;

  // 状態管理
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDraftSaveTime, setLastDraftSaveTime] = useState<Date | null>(null);
  const [draftSaveError, setDraftSaveError] = useState<Error | null>(null);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  /**
   * 下書き保存の実行
   */
  const saveDraft = useCallback(async () => {
    // 既に保存中の場合はスキップ
    if (isDraftSaving || isSubmitting) {
      return;
    }

    // データが保存する価値があるかチェック
    if (!draftUtils.isWorthSaving(formData)) {
      const error = new Error('保存するデータがありません');
      setDraftSaveError(error);
      onDraftSaveError?.(error);
      return;
    }

    try {
      setIsDraftSaving(true);
      setDraftSaveError(null);

      // 下書き保存実行（実際の実装では DraftService を使用）
      await new Promise(resolve => setTimeout(resolve, 1000)); // モック実装

      // 保存成功
      const now = new Date();
      setLastDraftSaveTime(now);
      onDraftSaveSuccess?.(formData);
    } catch (error) {
      // 保存エラー
      const saveError = error instanceof Error ? error : new Error('下書きの保存に失敗しました');
      setDraftSaveError(saveError);
      onDraftSaveError?.(saveError);
    } finally {
      setIsDraftSaving(false);
    }
  }, [formData, isDraftSaving, isSubmitting, onDraftSaveSuccess, onDraftSaveError]);

  /**
   * フォーム送信の実行
   */
  const submitForm = useCallback(async () => {
    // 既に送信中の場合はスキップ
    if (isSubmitting || isDraftSaving) {
      return;
    }

    // フォームが無効な場合はエラー
    if (!isFormValid) {
      const error = new Error('必須項目をすべて入力してください');
      setSubmitError(error);
      onSubmitError?.(error);
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // フォーム送信実行（実際の実装では API を呼び出し）
      await new Promise(resolve => setTimeout(resolve, 2000)); // モック実装

      // 送信成功
      onSubmitSuccess?.(formData);
    } catch (error) {
      // 送信エラー
      const submitError =
        error instanceof Error ? error : new Error('フォームの送信に失敗しました');
      setSubmitError(submitError);
      onSubmitError?.(submitError);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, isDraftSaving, isFormValid, onSubmitSuccess, onSubmitError]);

  /**
   * エラーのクリア
   */
  const clearErrors = useCallback(() => {
    setDraftSaveError(null);
    setSubmitError(null);
  }, []);

  /**
   * 下書き保存が可能かどうか
   */
  const canSaveDraft = useMemo(() => {
    return !isDraftSaving && !isSubmitting && draftUtils.isWorthSaving(formData);
  }, [isDraftSaving, isSubmitting, formData]);

  /**
   * フォーム送信が可能かどうか
   */
  const canSubmit = useMemo(() => {
    return !isSubmitting && !isDraftSaving && isFormValid;
  }, [isSubmitting, isDraftSaving, isFormValid]);

  /**
   * フォームアクションの状態
   */
  const state: FormActionState = useMemo(
    () => ({
      isDraftSaving,
      isSubmitting,
      lastDraftSaveTime,
      draftSaveError,
      submitError,
    }),
    [isDraftSaving, isSubmitting, lastDraftSaveTime, draftSaveError, submitError]
  );

  return {
    state,
    saveDraft,
    submitForm,
    clearErrors,
    canSaveDraft,
    canSubmit,
  };
};

/**
 * デフォルトエクスポート
 */
export default useFormActions;
