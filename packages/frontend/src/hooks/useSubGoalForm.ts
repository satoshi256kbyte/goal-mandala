import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import {
  subGoalFormSchema,
  SubGoalFormData,
  PartialSubGoalFormData,
  validatePartialSubGoalForm,
} from '../schemas/subgoal-form';
import { useSubGoalContext } from '../contexts/SubGoalContext';

/**
 * フォームの状態
 */
export interface SubGoalFormState {
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
  /** 下書き保存中かどうか */
  isDraftSaving: boolean;
}

/**
 * フィールドの状態
 */
export interface SubGoalFieldState {
  /** フィールドの値 */
  value: string;
  /** エラーメッセージ */
  error?: string;
  /** フィールドが変更されているかどうか */
  isDirty: boolean;
  /** フィールドがタッチされているかどうか */
  isTouched: boolean;
  /** フィールドが無効かどうか */
  invalid: boolean;
  /** バリデーション中かどうか */
  isValidating: boolean;
  /** 文字数 */
  length: number;
  /** 最大文字数 */
  maxLength?: number;
  /** 残り文字数 */
  remainingLength?: number;
}

/**
 * useSubGoalFormフックのオプション
 */
export interface UseSubGoalFormOptions {
  /** サブ目標ID */
  subGoalId?: string;
  /** 初期データ */
  initialData?: Partial<SubGoalFormData>;
  /** バリデーションモード */
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  /** リアルタイムバリデーションを有効にするか */
  enableRealtimeValidation?: boolean;
  /** 自動保存を有効にするか */
  enableAutoSave?: boolean;
  /** 自動保存の間隔（ミリ秒） */
  autoSaveInterval?: number;
}

/**
 * useSubGoalFormフックの戻り値
 */
export interface UseSubGoalFormReturn extends UseFormReturn<SubGoalFormData> {
  /** フォームの状態 */
  formState: SubGoalFormState;
  /** フィールドの状態を取得 */
  getFieldState: (fieldName: keyof SubGoalFormData) => SubGoalFieldState;
  /** フィールドの値を監視 */
  watchedValues: SubGoalFormData;
  /** 手動でバリデーションを実行 */
  validateField: (fieldName: keyof SubGoalFormData) => Promise<boolean>;
  /** 手動で下書き保存を実行 */
  saveDraft: () => Promise<void>;
  /** フォームをリセット */
  resetForm: (data?: Partial<SubGoalFormData>) => void;
  /** 未保存の変更があるかチェック */
  checkUnsavedChanges: () => boolean;
  /** フォームデータを更新 */
  updateFormData: (data: Partial<SubGoalFormData>) => void;
  /** エラーハンドリング */
  handleError: (error: Error) => void;
}

/**
 * フィールドの最大文字数設定
 */
const FIELD_MAX_LENGTHS: Record<keyof SubGoalFormData, number> = {
  title: 100,
  description: 500,
  background: 500,
  constraints: 300,
};

/**
 * サブ目標入力フォーム用のカスタムフック
 */
export const useSubGoalForm = (options: UseSubGoalFormOptions = {}): UseSubGoalFormReturn => {
  const {
    subGoalId,
    initialData,
    mode = 'onBlur',
    enableRealtimeValidation = true,
    enableAutoSave = true,
    autoSaveInterval = 30000,
  } = options;

  // SubGoalContextから状態とアクションを取得
  const {
    state: contextState,
    saveDraft: contextSaveDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
  } = useSubGoalContext();

  // React Hook Formの初期化
  const form = useForm<SubGoalFormData>({
    resolver: zodResolver(subGoalFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      background: initialData?.background || '',
      constraints: initialData?.constraints || '',
    },
    mode,
  });

  const {
    watch,
    getValues,
    setValue,
    formState: { errors, isValid, isDirty, isSubmitting, isValidating },
    trigger,
    reset,
  } = form;

  // 内部状態
  const [lastSavedData, setLastSavedData] = useState<PartialSubGoalFormData | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // フォームの値を監視
  const watchedValues = watch();

  // 初期データが変更された場合にフォームをリセット
  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        background: initialData.background || '',
        constraints: initialData.constraints || '',
      });
      setLastSavedData(initialData);
    }
  }, [initialData, reset]);

  // 未保存の変更をチェック
  const checkUnsavedChanges = useCallback((): boolean => {
    if (!lastSavedData) {
      return isDirty;
    }

    const currentData = getValues();
    return Object.keys(currentData).some(
      key =>
        currentData[key as keyof SubGoalFormData] !==
        lastSavedData[key as keyof PartialSubGoalFormData]
    );
  }, [lastSavedData, isDirty, getValues]);

  // フォーム状態の計算
  const formState: SubGoalFormState = {
    isValid,
    isDirty,
    isSubmitting,
    isValidating,
    hasErrors: Object.keys(errors).length > 0,
    hasUnsavedChanges: checkUnsavedChanges(),
    isDraftSaving: contextState.isDraftSaving,
  };

  // フィールド状態を取得
  const getFieldState = useCallback(
    (fieldName: keyof SubGoalFormData): SubGoalFieldState => {
      const value = watchedValues[fieldName] || '';
      const error = errors[fieldName]?.message || contextState.validationErrors[fieldName];
      const isDirty = form.formState.dirtyFields[fieldName] || false;
      const isTouched = form.formState.touchedFields[fieldName] || false;
      const maxLength = FIELD_MAX_LENGTHS[fieldName];
      const length = String(value).length;

      return {
        value: String(value),
        error,
        isDirty,
        isTouched,
        invalid: !!error,
        isValidating: false, // 現在の実装では同期バリデーションのみ
        length,
        maxLength,
        remainingLength: maxLength ? maxLength - length : undefined,
      };
    },
    [
      watchedValues,
      errors,
      contextState.validationErrors,
      form.formState.dirtyFields,
      form.formState.touchedFields,
    ]
  );

  // フィールドのバリデーション
  const validateField = useCallback(
    async (fieldName: keyof SubGoalFormData): Promise<boolean> => {
      const result = await trigger(fieldName);

      // リアルタイムバリデーションの実行
      if (enableRealtimeValidation) {
        const currentData = getValues();
        const validationResult = validatePartialSubGoalForm(currentData);

        if (!validationResult.isValid) {
          setValidationErrors(validationResult.errors);
        } else {
          clearValidationErrors();
        }
      }

      return result;
    },
    [trigger, enableRealtimeValidation, getValues, setValidationErrors, clearValidationErrors]
  );

  // 下書き保存の実行
  const saveDraft = useCallback(async (): Promise<void> => {
    if (!subGoalId) {
      throw new Error('サブ目標IDが指定されていません');
    }

    try {
      const currentData = getValues();
      const validationResult = validatePartialSubGoalForm(currentData);

      if (validationResult.isValid) {
        await contextSaveDraft(subGoalId, currentData);
        setLastSavedData(currentData);
        clearErrors();
      } else {
        setValidationErrors(validationResult.errors);
        throw new Error('バリデーションエラーがあります');
      }
    } catch (error) {
      console.error('下書き保存エラー:', error);
      throw error;
    }
  }, [subGoalId, getValues, contextSaveDraft, setValidationErrors, clearErrors]);

  // 自動保存の実装
  const performAutoSave = useCallback(async () => {
    if (
      !enableAutoSave ||
      !subGoalId ||
      !formState.hasUnsavedChanges ||
      !contextState.autoSaveEnabled
    ) {
      return;
    }

    try {
      await saveDraft();
    } catch (error) {
      console.warn('自動保存に失敗しました:', error);
    }
  }, [
    enableAutoSave,
    subGoalId,
    formState.hasUnsavedChanges,
    contextState.autoSaveEnabled,
    saveDraft,
  ]);

  // 自動保存タイマーの設定
  useEffect(() => {
    if (!enableAutoSave || !subGoalId || !contextState.autoSaveEnabled) {
      return;
    }

    // 既存のタイマーをクリア
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // 変更がある場合のみ新しいタイマーを設定
    if (formState.hasUnsavedChanges) {
      const timer = setTimeout(performAutoSave, autoSaveInterval);
      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [
    formState.hasUnsavedChanges,
    enableAutoSave,
    subGoalId,
    contextState.autoSaveEnabled,
    autoSaveInterval,
    performAutoSave,
    autoSaveTimer,
  ]);

  // フォームのリセット
  const resetForm = useCallback(
    (data?: Partial<SubGoalFormData>) => {
      const resetData = data || {
        title: '',
        description: '',
        background: '',
        constraints: '',
      };

      reset(resetData);
      setLastSavedData(resetData);
      clearValidationErrors();
      clearErrors();
    },
    [reset, clearValidationErrors, clearErrors]
  );

  // フォームデータの更新
  const updateFormData = useCallback(
    (data: Partial<SubGoalFormData>) => {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as keyof SubGoalFormData, value, {
            shouldDirty: true,
            shouldValidate: enableRealtimeValidation,
          });
        }
      });
    },
    [setValue, enableRealtimeValidation]
  );

  // エラーハンドリング
  const handleError = useCallback(
    (error: Error) => {
      console.error('フォームエラー:', error);
      setErrors({ form: error.message });
    },
    [setErrors]
  );

  // リアルタイムバリデーション
  useEffect(() => {
    if (!enableRealtimeValidation) {
      return;
    }

    // フィールドの値が変更されたときにバリデーションを実行
    const subscription = watch((value, { name }) => {
      if (name && form.formState.touchedFields[name as keyof SubGoalFormData]) {
        validateField(name as keyof SubGoalFormData);
      }
    });

    return () => subscription.unsubscribe();
  }, [enableRealtimeValidation, watch, validateField, form.formState.touchedFields]);

  // コンテキストエラーの監視
  useEffect(() => {
    if (Object.keys(contextState.errors).length > 0) {
      console.error('コンテキストエラー:', contextState.errors);
    }
  }, [contextState.errors]);

  return {
    ...form,
    formState,
    getFieldState,
    watchedValues,
    validateField,
    saveDraft,
    resetForm,
    checkUnsavedChanges,
    updateFormData,
    handleError,
  };
};

/**
 * サブ目標フィールド別のバリデーションフック
 */
export const useSubGoalFieldValidation = (fieldName: keyof SubGoalFormData) => {
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
        const partialData = { [fieldName]: value } as PartialSubGoalFormData;
        const result = validatePartialSubGoalForm(partialData);

        const fieldError = result.errors[fieldName];
        setValidationState({
          isValid: !fieldError,
          error: fieldError,
          isValidating: false,
        });

        return !fieldError;
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
 * サブ目標フォームの送信状態を管理するフック
 */
export const useSubGoalFormSubmission = () => {
  const [submissionState, setSubmissionState] = useState<{
    isSubmitting: boolean;
    error?: string;
    success: boolean;
  }>({
    isSubmitting: false,
    success: false,
  });

  const { setErrors, setSuccess } = useSubGoalContext();

  const submitForm = useCallback(
    async (submitFn: () => Promise<void>) => {
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
        setSuccess(true);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '送信中にエラーが発生しました';
        setSubmissionState({
          isSubmitting: false,
          error: errorMessage,
          success: false,
        });
        setErrors({ submit: errorMessage });
        throw error;
      }
    },
    [setErrors, setSuccess]
  );

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

/**
 * 複数のサブ目標フォームを管理するフック
 */
export const useMultipleSubGoalForms = (subGoalIds: string[]) => {
  const [forms, setForms] = useState<Record<string, UseSubGoalFormReturn>>({});
  const { state } = useSubGoalContext();

  // 各サブ目標のフォームを初期化
  useEffect(() => {
    const newForms: Record<string, UseSubGoalFormReturn> = {};

    subGoalIds.forEach(id => {
      const subGoal = state.subGoals.find(sg => sg.id === id);
      if (subGoal) {
        // Note: この部分は実際の実装では useSubGoalForm を呼び出す必要がありますが、
        // React のルールにより、ここでは直接呼び出せません。
        // 実際の使用時は、各フォームを個別にコンポーネント内で管理する必要があります。
      }
    });

    setForms(newForms);
  }, [subGoalIds, state.subGoals]);

  const saveDraftAll = useCallback(async () => {
    const promises = Object.values(forms).map(form => form.saveDraft());
    await Promise.all(promises);
  }, [forms]);

  const validateAll = useCallback(async () => {
    const results = await Promise.all(Object.values(forms).map(form => form.trigger()));
    return results.every(result => result);
  }, [forms]);

  const hasUnsavedChanges = useCallback(() => {
    return Object.values(forms).some(form => form.checkUnsavedChanges());
  }, [forms]);

  return {
    forms,
    saveDraftAll,
    validateAll,
    hasUnsavedChanges,
  };
};
