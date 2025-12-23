import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  goalFormSchema,
  partialGoalFormSchema,
  GoalFormData,
  PartialGoalFormData,
  fieldValidators,
} from '../schemas/goal-form';

/**
 * フォームの状態
 */
export interface FormState {
  /** フォームが有効かどうか */
  isValid: boolean;
  /** フォームが変更されているかどうか */
  isDirty: boolean;
  /** 送信中かどうか */
  isSubmitting: boolean;
  /** バリデーション中かどうか */
  isValidating: boolean;
  /** エラーがあるかどうか */
  hasErrors: boolean;
  /** 未保存の変更があるかどうか */
  hasUnsavedChanges: boolean;
}

/**
 * フィールドの状態
 */
export interface FieldState {
  /** フィールドの値 */
  value: string;
  /** エラーメッセージ */
  error?: string;
  /** フィールドが変更されているかどうか */
  isDirty: boolean;
  /** フィールドがタッチされているかどうか */
  isTouched: boolean;
  /** 文字数 */
  length: number;
}

/**
 * useGoalFormフックのオプション
 */
export interface UseGoalFormOptions {
  /** 初期データ */
  initialData?: Partial<GoalFormData>;
  /** バリデーションモード */
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  /** リアルタイムバリデーションを有効にするか */
  enableRealtimeValidation?: boolean;
  /** 自動保存を有効にするか */
  enableAutoSave?: boolean;
  /** 自動保存の間隔（ミリ秒） */
  autoSaveInterval?: number;
  /** 下書き保存のコールバック */
  onDraftSave?: (data: PartialGoalFormData) => Promise<void>;
}

/**
 * useGoalFormフックの戻り値
 */
export interface UseGoalFormReturn {
  /** フォームの状態 */
  formState: FormState;
  /** フィールドの状態を取得 */
  getFieldState: (fieldName: keyof GoalFormData) => FieldState;
  /** フィールドの値を監視 */
  watchedValues: GoalFormData;
  /** フィールドの値を設定 */
  setValue: (
    fieldName: keyof GoalFormData,
    value: unknown,
    options?: { shouldDirty?: boolean; shouldValidate?: boolean; shouldTouch?: boolean }
  ) => void;
  /** 手動でバリデーションを実行 */
  validateField: (fieldName: keyof GoalFormData) => Promise<boolean>;
  /** 手動で下書き保存を実行 */
  saveDraft: () => Promise<void>;
  /** フォームをリセット */
  resetForm: (data?: Partial<GoalFormData>) => void;
  /** 未保存の変更があるかチェック */
  checkUnsavedChanges: () => boolean;
}

/**
 * 目標入力フォーム用のカスタムフック
 */
export const useGoalForm = (options: UseGoalFormOptions = {}): UseGoalFormReturn => {
  const {
    initialData,
    mode = 'onBlur',
    enableRealtimeValidation = true,
    enableAutoSave = true,
    autoSaveInterval = 30000,
    onDraftSave,
  } = options;

  // React Hook Formの初期化
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      deadline: initialData?.deadline || '',
      background: initialData?.background || '',
      constraints: initialData?.constraints || '',
    },
    mode,
  });

  const {
    watch,
    getValues,
    formState: { errors, isValid, isDirty, isSubmitting, isValidating },
    trigger,
    reset,
  } = form;

  // 内部状態
  const [lastSavedData, setLastSavedData] = useState<PartialGoalFormData | null>(null);

  // useRefで管理（メモリリーク防止）
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onDraftSaveRef = useRef(onDraftSave);
  const initialDataRef = useRef<string>('');

  // フォームの値を監視
  const watchedValues = watch();

  // onDraftSaveが変更されたらrefを更新（無限ループ防止）
  useEffect(() => {
    onDraftSaveRef.current = onDraftSave;
  }, [onDraftSave]);

  // 初期データが変更された場合にフォームをリセット
  useEffect(() => {
    const currentInitialData = JSON.stringify(initialData);

    if (initialData && currentInitialData !== initialDataRef.current) {
      initialDataRef.current = currentInitialData;

      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        deadline: initialData.deadline || '',
        background: initialData.background || '',
        constraints: initialData.constraints || '',
      });
      setLastSavedData(initialData);
    }
  }, [initialData, reset]);

  // 未保存の変更をチェック（useMemoで最適化）
  const hasUnsavedChanges = useMemo((): boolean => {
    if (!lastSavedData) {
      return isDirty;
    }

    const currentData = getValues();
    return Object.keys(currentData).some(
      key =>
        currentData[key as keyof GoalFormData] !== lastSavedData[key as keyof PartialGoalFormData]
    );
  }, [lastSavedData, isDirty, getValues]);

  const checkUnsavedChanges = useCallback((): boolean => {
    return hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // フォーム状態の計算（useMemoで最適化）
  const formState: FormState = useMemo(
    () => ({
      isValid,
      isDirty,
      isSubmitting,
      isValidating,
      hasErrors: Object.keys(errors).length > 0,
      hasUnsavedChanges,
    }),
    [isValid, isDirty, isSubmitting, isValidating, errors, hasUnsavedChanges]
  );

  // フィールド状態を取得
  const getFieldState = useCallback(
    (fieldName: keyof GoalFormData): FieldState => {
      const value = watchedValues[fieldName] || '';
      const error = errors[fieldName]?.message;
      const isDirty = form.formState.dirtyFields[fieldName] || false;
      const isTouched = form.formState.touchedFields[fieldName] || false;

      return {
        value: String(value),
        error,
        isDirty,
        isTouched,
        length: String(value).length,
      };
    },
    [watchedValues, errors, form.formState.dirtyFields, form.formState.touchedFields]
  );

  // フィールドのバリデーション
  const validateField = useCallback(
    async (fieldName: keyof GoalFormData): Promise<boolean> => {
      const result = await trigger(fieldName);
      return result;
    },
    [trigger]
  );

  // 下書き保存の実行
  const saveDraft = useCallback(async (): Promise<void> => {
    if (!onDraftSaveRef.current) {
      return;
    }

    try {
      const currentData = getValues();
      const validationResult = partialGoalFormSchema.safeParse(currentData);

      if (validationResult.success) {
        await onDraftSaveRef.current(validationResult.data);
        setLastSavedData(validationResult.data);
      }
    } catch (error) {
      console.error('下書き保存エラー:', error);
      throw error;
    }
  }, [getValues]);

  // 自動保存タイマーの設定
  useEffect(() => {
    if (!enableAutoSave || !onDraftSaveRef.current) {
      return;
    }

    // 変更がない場合はタイマーをクリア
    if (!isDirty) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    // 既存のタイマーをクリア
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 新しいタイマーを設定
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const currentData = getValues();
        const validationResult = partialGoalFormSchema.safeParse(currentData);

        if (validationResult.success && onDraftSaveRef.current) {
          await onDraftSaveRef.current(validationResult.data);
          setLastSavedData(validationResult.data);
        }
      } catch (error) {
        console.warn('自動保存に失敗しました:', error);
      } finally {
        autoSaveTimerRef.current = null;
      }
    }, autoSaveInterval);

    // クリーンアップ
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [isDirty, enableAutoSave, autoSaveInterval, getValues]);

  // フォームのリセット
  const resetForm = useCallback(
    (data?: Partial<GoalFormData>) => {
      const resetData = data || {
        title: '',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };

      reset(resetData);
      setLastSavedData(resetData);
    },
    [reset]
  );

  // リアルタイムバリデーション
  useEffect(() => {
    if (!enableRealtimeValidation) {
      return;
    }

    // フィールドの値が変更されたときにバリデーションを実行
    const subscription = watch((value, { name }) => {
      if (name && form.formState.touchedFields[name as keyof GoalFormData]) {
        trigger(name as keyof GoalFormData);
      }
    });

    return () => subscription.unsubscribe();
  }, [enableRealtimeValidation, watch, trigger, form.formState.touchedFields]);

  return {
    ...form,
    formState,
    getFieldState,
    watchedValues,
    validateField,
    saveDraft,
    resetForm,
    checkUnsavedChanges,
  };
};

/**
 * フィールド別のバリデーションフック
 */
export const useFieldValidation = (fieldName: keyof GoalFormData) => {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    error?: string;
    isValidating: boolean;
  }>({
    isValid: true,
    isValidating: false,
  });

  const validateField = useCallback(
    async (value: string) => {
      setValidationState(prev => ({ ...prev, isValidating: true }));

      try {
        const validator =
          fieldValidators[
            `validate${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}` as keyof typeof fieldValidators
          ];

        if (validator) {
          const result = (validator as (value: string) => { isValid: boolean; error?: string })(
            value
          );
          setValidationState({
            isValid: result.isValid,
            error: result.error,
            isValidating: false,
          });
          return result.isValid;
        }

        setValidationState({
          isValid: true,
          isValidating: false,
        });
        return true;
      } catch (error) {
        setValidationState({
          isValid: false,
          error: '検証中にエラーが発生しました',
          isValidating: false,
        });
        return false;
      }
    },
    [fieldName]
  );

  return {
    validationState,
    validateField,
  };
};

/**
 * フォームの送信状態を管理するフック
 */
export const useFormSubmission = () => {
  const [submissionState, setSubmissionState] = useState<{
    isSubmitting: boolean;
    error?: string;
    success: boolean;
  }>({
    isSubmitting: false,
    success: false,
  });

  const submitForm = useCallback(async (submitFn: () => Promise<void>) => {
    setSubmissionState({
      isSubmitting: true,
      success: false,
    });

    try {
      await submitFn();
      setSubmissionState({
        isSubmitting: false,
        success: true,
      });
    } catch (error) {
      setSubmissionState({
        isSubmitting: false,
        error: error instanceof Error ? error.message : '送信中にエラーが発生しました',
        success: false,
      });
      throw error;
    }
  }, []);

  const resetSubmissionState = useCallback(() => {
    setSubmissionState({
      isSubmitting: false,
      success: false,
    });
  }, []);

  return {
    submissionState,
    submitForm,
    resetSubmissionState,
  };
};
