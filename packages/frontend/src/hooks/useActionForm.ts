import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import {
  actionFormSchema,
  ActionFormData,
  PartialActionFormData,
  validatePartialActionForm,
  validateActionConstraints,
  validateActionType,
} from '../schemas/action-form';
import { useActionContext } from '../contexts/ActionContext';
import { ActionType } from '../types/mandala';

/**
 * フォームの状態
 */
export interface ActionFormState {
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
export interface ActionFieldState {
  /** フィールドの値 */
  value: string | ActionType;
  /** エラーメッセージ */
  error?: string;
  /** フィールドが変更されているかどうか */
  isDirty: boolean;
  /** フィールドがタッチされているかどうか */
  isTouched: boolean;
  /** 文字数（文字列フィールドのみ） */
  length?: number;
  /** 最大文字数（文字列フィールドのみ） */
  maxLength?: number;
  /** 残り文字数（文字列フィールドのみ） */
  remainingLength?: number;
}

/**
 * useActionFormフックのオプション
 */
export interface UseActionFormOptions {
  /** アクションID */
  actionId?: string;
  /** サブ目標ID */
  subGoalId?: string;
  /** 初期データ */
  initialData?: Partial<ActionFormData>;
  /** バリデーションモード */
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  /** リアルタイムバリデーションを有効にするか */
  enableRealtimeValidation?: boolean;
  /** 自動保存を有効にするか */
  enableAutoSave?: boolean;
  /** 自動保存の間隔（ミリ秒） */
  autoSaveInterval?: number;
  /** サブ目標間制約チェックを有効にするか */
  enableConstraintValidation?: boolean;
}

/**
 * useActionFormフックの戻り値
 */
export interface UseActionFormReturn {
  /** フォームの状態 */
  formState: ActionFormState;
  /** フィールドの状態を取得 */
  getFieldState: (fieldName: keyof ActionFormData) => ActionFieldState;
  /** フィールドの値を監視 */
  watchedValues: ActionFormData;
  /** 手動でバリデーションを実行 */
  validateField: (fieldName: keyof ActionFormData) => Promise<boolean>;
  /** バリデーションをトリガー */
  trigger: (fieldName?: keyof ActionFormData) => Promise<boolean>;
  /** アクション種別のバリデーション */
  validateActionType: (type: ActionType) => boolean;
  /** サブ目標間制約チェック */
  validateConstraints: () => Promise<boolean>;
  /** 手動で下書き保存を実行 */
  saveDraft: () => Promise<void>;
  /** フォームをリセット */
  resetForm: (data?: Partial<ActionFormData>) => void;
  /** 未保存の変更があるかチェック */
  checkUnsavedChanges: () => boolean;
  /** フォームデータを更新 */
  updateFormData: (data: Partial<ActionFormData>) => void;
  /** エラーハンドリング */
  handleError: (error: Error) => void;
  /** アクション種別を変更 */
  changeActionType: (type: ActionType) => void;
}

/**
 * フィールドの最大文字数設定
 */
const FIELD_MAX_LENGTHS: Record<keyof Omit<ActionFormData, 'type'>, number> = {
  title: 100,
  description: 500,
  background: 500,
  constraints: 300,
};

/**
 * アクション入力フォーム用のカスタムフック
 */
export const useActionForm = (options: UseActionFormOptions = {}): UseActionFormReturn => {
  const {
    actionId,
    subGoalId,
    initialData,
    mode = 'onBlur',
    enableRealtimeValidation = true,
    enableAutoSave = true,
    autoSaveInterval = 30000,
    enableConstraintValidation = true,
  } = options;

  // ActionContextから状態とアクションを取得
  const {
    state: contextState,
    saveDraft: contextSaveDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    getActionsBySubGoal,
  } = useActionContext();

  // React Hook Formの初期化
  const form = useForm<ActionFormData>({
    resolver: zodResolver(actionFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      background: initialData?.background || '',
      constraints: initialData?.constraints || '',
      type: initialData?.type || ActionType.EXECUTION,
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
  const [lastSavedData, setLastSavedData] = useState<PartialActionFormData | null>(null);
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
        type: initialData.type || ActionType.EXECUTION,
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
        currentData[key as keyof ActionFormData] !==
        lastSavedData[key as keyof PartialActionFormData]
    );
  }, [lastSavedData, isDirty, getValues]);

  // フォーム状態の計算
  const formState: ActionFormState = {
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
    (fieldName: keyof ActionFormData): ActionFieldState => {
      const value = watchedValues[fieldName];
      const error = errors[fieldName]?.message || contextState.validationErrors[fieldName];
      const isDirty = form.formState.dirtyFields[fieldName] || false;
      const isTouched = form.formState.touchedFields[fieldName] || false;

      if (fieldName === 'type') {
        return {
          value,
          error,
          isDirty,
          isTouched,
        };
      }

      const stringValue = String(value || '');
      const maxLength = FIELD_MAX_LENGTHS[fieldName as keyof Omit<ActionFormData, 'type'>];
      const length = stringValue.length;

      return {
        value: stringValue,
        error,
        isDirty,
        isTouched,
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

  // アクション種別のバリデーション
  const validateActionTypeField = useCallback(
    (type: ActionType): boolean => {
      const result = validateActionType(type);
      if (!result.isValid) {
        setValidationErrors(result.errors);
        return false;
      }
      return true;
    },
    [setValidationErrors]
  );

  // サブ目標間制約チェック
  const validateConstraints = useCallback(async (): Promise<boolean> => {
    if (!enableConstraintValidation || !subGoalId) {
      return true;
    }

    const currentData = getValues();
    const existingActions = getActionsBySubGoal(subGoalId)
      .filter(action => action.id !== actionId)
      .map(action => ({ title: action.title, id: action.id }));

    const result = validateActionConstraints(currentData, existingActions, actionId);

    if (!result.isValid) {
      setValidationErrors(result.errors);
      return false;
    }

    return true;
  }, [
    enableConstraintValidation,
    subGoalId,
    getValues,
    getActionsBySubGoal,
    actionId,
    setValidationErrors,
  ]);

  // フィールドのバリデーション
  const validateField = useCallback(
    async (fieldName: keyof ActionFormData): Promise<boolean> => {
      const result = await trigger(fieldName);

      // リアルタイムバリデーションの実行
      if (enableRealtimeValidation) {
        const currentData = getValues();
        const validationResult = validatePartialActionForm(currentData);

        if (!validationResult.isValid) {
          setValidationErrors(validationResult.errors);
        } else {
          clearValidationErrors();
        }

        // アクション種別の特別なバリデーション
        if (fieldName === 'type') {
          validateActionTypeField(currentData.type);
        }

        // 制約チェック
        if (fieldName === 'title') {
          await validateConstraints();
        }
      }

      return result;
    },
    [
      trigger,
      enableRealtimeValidation,
      getValues,
      setValidationErrors,
      clearValidationErrors,
      validateActionTypeField,
      validateConstraints,
    ]
  );

  // 下書き保存の実行
  const saveDraft = useCallback(async (): Promise<void> => {
    if (!actionId) {
      throw new Error('アクションIDが指定されていません');
    }

    try {
      const currentData = getValues();
      const validationResult = validatePartialActionForm(currentData);

      if (validationResult.isValid) {
        // 制約チェック
        const constraintValid = await validateConstraints();
        if (!constraintValid) {
          throw new Error('制約チェックでエラーが発生しました');
        }

        await contextSaveDraft(actionId, currentData);
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
  }, [
    actionId,
    getValues,
    validateConstraints,
    contextSaveDraft,
    setValidationErrors,
    clearErrors,
  ]);

  // 自動保存の実装
  const performAutoSave = useCallback(async () => {
    if (
      !enableAutoSave ||
      !actionId ||
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
    actionId,
    formState.hasUnsavedChanges,
    contextState.autoSaveEnabled,
    saveDraft,
  ]);

  // 自動保存タイマーの設定
  useEffect(() => {
    if (!enableAutoSave || !actionId || !contextState.autoSaveEnabled) {
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
    actionId,
    contextState.autoSaveEnabled,
    autoSaveInterval,
    performAutoSave,
    autoSaveTimer,
  ]);

  // フォームのリセット
  const resetForm = useCallback(
    (data?: Partial<ActionFormData>) => {
      const resetData = data || {
        title: '',
        description: '',
        background: '',
        constraints: '',
        type: ActionType.EXECUTION,
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
    (data: Partial<ActionFormData>) => {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as keyof ActionFormData, value, {
            shouldDirty: true,
            shouldValidate: enableRealtimeValidation,
          });
        }
      });
    },
    [setValue, enableRealtimeValidation]
  );

  // アクション種別を変更
  const changeActionType = useCallback(
    (type: ActionType) => {
      setValue('type', type, {
        shouldDirty: true,
        shouldValidate: enableRealtimeValidation,
      });

      // 種別変更時の特別な処理
      if (type === ActionType.HABIT) {
        // 習慣アクションの場合、説明文の最小文字数を増やす
        const currentDescription = getValues('description');
        if (currentDescription.length < 20) {
          setValidationErrors({
            description: '習慣アクションの説明は20文字以上で入力してください',
          });
        }
      }

      validateActionTypeField(type);
    },
    [setValue, enableRealtimeValidation, getValues, setValidationErrors, validateActionTypeField]
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
      if (name && form.formState.touchedFields[name as keyof ActionFormData]) {
        validateField(name as keyof ActionFormData);
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
    validateActionType: validateActionTypeField,
    validateConstraints,
    saveDraft,
    resetForm,
    checkUnsavedChanges,
    updateFormData,
    handleError,
    changeActionType,
  };
};

/**
 * アクションフィールド別のバリデーションフック
 */
export const useActionFieldValidation = (fieldName: keyof ActionFormData) => {
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    error?: string;
    isValidating: boolean;
  }>({
    isValid: true,
    isValidating: false,
  });

  const validateField = useCallback(
    async (value: string | ActionType) => {
      setValidationState(prev => ({ ...prev, isValidating: true }));

      try {
        const partialData = { [fieldName]: value } as PartialActionFormData;
        const result = validatePartialActionForm(partialData);

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
 * アクションフォームの送信状態を管理するフック
 */
export const useActionFormSubmission = () => {
  const [submissionState, setSubmissionState] = useState<{
    isSubmitting: boolean;
    error?: string;
    success: boolean;
  }>({
    isSubmitting: false,
    success: false,
  });

  const { setErrors, setSuccess } = useActionContext();

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
 * 複数のアクションフォームを管理するフック
 */
export const useMultipleActionForms = (actionIds: string[], _subGoalId: string) => {
  const [forms, setForms] = useState<Record<string, UseActionFormReturn>>({});
  const { state } = useActionContext();

  // 各アクションのフォームを初期化
  useEffect(() => {
    const newForms: Record<string, UseActionFormReturn> = {};

    actionIds.forEach(id => {
      const action = state.actions.find(a => a.id === id);
      if (action) {
        // Note: この部分は実際の実装では useActionForm を呼び出す必要がありますが、
        // React のルールにより、ここでは直接呼び出せません。
        // 実際の使用時は、各フォームを個別にコンポーネント内で管理する必要があります。
      }
    });

    setForms(newForms);
  }, [actionIds, state.actions]);

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

  const validateAllConstraints = useCallback(async () => {
    const results = await Promise.all(Object.values(forms).map(form => form.validateConstraints()));
    return results.every(result => result);
  }, [forms]);

  return {
    forms,
    saveDraftAll,
    validateAll,
    hasUnsavedChanges,
    validateAllConstraints,
  };
};
