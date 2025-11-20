import React, { createContext, useContext, useCallback, useReducer, useEffect } from 'react';
import { GoalFormData } from '../schemas/goal-form';

/**
 * フォームの状態
 */
export interface GoalFormState {
  /** 現在のフォームデータ */
  formData: Partial<GoalFormData>;
  /** 最後に保存されたデータ */
  lastSavedData: Partial<GoalFormData> | null;
  /** 送信中フラグ */
  isSubmitting: boolean;
  /** 下書き保存中フラグ */
  isDraftSaving: boolean;
  /** 自動保存が有効かどうか */
  autoSaveEnabled: boolean;
  /** 未保存の変更があるかどうか */
  hasUnsavedChanges: boolean;
  /** エラー状態 */
  errors: Record<string, string>;
  /** 成功状態 */
  success: boolean;
  /** 最後の操作のタイムスタンプ */
  lastActionTimestamp: number;
  /** フォームの初期化状態 */
  isInitialized: boolean;
}

/**
 * フォームのアクション
 */
export type GoalFormAction =
  | { type: 'INITIALIZE_FORM'; payload: { initialData?: Partial<GoalFormData> } }
  | { type: 'UPDATE_FIELD'; payload: { field: keyof GoalFormData; value: string } }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<GoalFormData> }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_DRAFT_SAVING'; payload: boolean }
  | { type: 'SET_AUTO_SAVE_ENABLED'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_SUCCESS'; payload: boolean }
  | { type: 'SAVE_DRAFT_SUCCESS'; payload: Partial<GoalFormData> }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'RESET_FORM'; payload?: Partial<GoalFormData> }
  | { type: 'CHECK_UNSAVED_CHANGES' };

/**
 * 初期状態
 */
const initialState: GoalFormState = {
  formData: {
    title: '',
    description: '',
    deadline: '',
    background: '',
    constraints: '',
  },
  lastSavedData: null,
  isSubmitting: false,
  isDraftSaving: false,
  autoSaveEnabled: true,
  hasUnsavedChanges: false,
  errors: {},
  success: false,
  lastActionTimestamp: Date.now(),
  isInitialized: false,
};

/**
 * フォーム状態のリデューサー
 */
const goalFormReducer = (state: GoalFormState, action: GoalFormAction): GoalFormState => {
  switch (action.type) {
    case 'INITIALIZE_FORM':
      return {
        ...state,
        formData: {
          title: action.payload.initialData?.title || '',
          description: action.payload.initialData?.description || '',
          deadline: action.payload.initialData?.deadline || '',
          background: action.payload.initialData?.background || '',
          constraints: action.payload.initialData?.constraints || '',
        },
        lastSavedData: action.payload.initialData || null,
        hasUnsavedChanges: false,
        isInitialized: true,
        lastActionTimestamp: Date.now(),
      };

    case 'UPDATE_FIELD': {
      const updatedFormData = {
        ...state.formData,
        [action.payload.field]: action.payload.value,
      };
      return {
        ...state,
        formData: updatedFormData,
        hasUnsavedChanges: checkForUnsavedChanges(updatedFormData, state.lastSavedData),
        lastActionTimestamp: Date.now(),
      };
    }

    case 'UPDATE_FORM_DATA': {
      const newFormData = {
        ...state.formData,
        ...action.payload,
      };
      return {
        ...state,
        formData: newFormData,
        hasUnsavedChanges: checkForUnsavedChanges(newFormData, state.lastSavedData),
        lastActionTimestamp: Date.now(),
      };
    }

    case 'SET_SUBMITTING':
      return {
        ...state,
        isSubmitting: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_DRAFT_SAVING':
      return {
        ...state,
        isDraftSaving: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_AUTO_SAVE_ENABLED':
      return {
        ...state,
        autoSaveEnabled: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.payload,
        success: false,
        lastActionTimestamp: Date.now(),
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {},
        lastActionTimestamp: Date.now(),
      };

    case 'SET_SUCCESS':
      return {
        ...state,
        success: action.payload,
        errors: action.payload ? {} : state.errors,
        lastActionTimestamp: Date.now(),
      };

    case 'SAVE_DRAFT_SUCCESS':
      return {
        ...state,
        lastSavedData: action.payload,
        hasUnsavedChanges: false,
        isDraftSaving: false,
        errors: {},
        lastActionTimestamp: Date.now(),
      };

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        lastSavedData: state.formData,
        hasUnsavedChanges: false,
        isSubmitting: false,
        success: true,
        errors: {},
        lastActionTimestamp: Date.now(),
      };

    case 'RESET_FORM': {
      const resetData = action.payload || {
        title: '',
        description: '',
        deadline: '',
        background: '',
        constraints: '',
      };
      return {
        ...state,
        formData: resetData,
        lastSavedData: resetData,
        hasUnsavedChanges: false,
        errors: {},
        success: false,
        lastActionTimestamp: Date.now(),
      };
    }

    case 'CHECK_UNSAVED_CHANGES':
      return {
        ...state,
        hasUnsavedChanges: checkForUnsavedChanges(state.formData, state.lastSavedData),
        lastActionTimestamp: Date.now(),
      };

    default:
      return state;
  }
};

/**
 * 未保存の変更をチェックする関数
 */
const checkForUnsavedChanges = (
  currentData: Partial<GoalFormData>,
  lastSavedData: Partial<GoalFormData> | null
): boolean => {
  if (!lastSavedData) {
    return Object.values(currentData).some(value => value && value.trim() !== '');
  }

  return Object.keys(currentData).some(
    key => currentData[key as keyof GoalFormData] !== lastSavedData[key as keyof GoalFormData]
  );
};

/**
 * コンテキストの値の型
 */
export interface GoalFormContextValue {
  /** 現在の状態 */
  state: GoalFormState;
  /** フォームを初期化 */
  initializeForm: (initialData?: Partial<GoalFormData>) => void;
  /** フィールドを更新 */
  updateField: (field: keyof GoalFormData, value: string) => void;
  /** フォームデータを更新 */
  updateFormData: (data: Partial<GoalFormData>) => void;
  /** 送信状態を設定 */
  setSubmitting: (isSubmitting: boolean) => void;
  /** 下書き保存状態を設定 */
  setDraftSaving: (isDraftSaving: boolean) => void;
  /** 自動保存の有効/無効を設定 */
  setAutoSaveEnabled: (enabled: boolean) => void;
  /** エラーを設定 */
  setErrors: (errors: Record<string, string>) => void;
  /** エラーをクリア */
  clearErrors: () => void;
  /** 成功状態を設定 */
  setSuccess: (success: boolean) => void;
  /** 下書き保存成功 */
  saveDraftSuccess: (data: Partial<GoalFormData>) => void;
  /** 送信成功 */
  submitSuccess: () => void;
  /** フォームをリセット */
  resetForm: (data?: Partial<GoalFormData>) => void;
  /** 未保存の変更をチェック */
  checkUnsavedChanges: () => void;
}

/**
 * コンテキストの作成
 */
const GoalFormContext = createContext<GoalFormContextValue | undefined>(undefined);

/**
 * プロバイダーのプロパティ
 */
export interface GoalFormProviderProps {
  children: React.ReactNode;
  /** 初期データ */
  initialData?: Partial<GoalFormData>;
  /** 自動保存の初期設定 */
  autoSaveEnabled?: boolean;
}

/**
 * GoalFormProvider コンポーネント
 */
export const GoalFormProvider: React.FC<GoalFormProviderProps> = ({
  children,
  initialData,
  autoSaveEnabled = true,
}) => {
  const [state, dispatch] = useReducer(goalFormReducer, {
    ...initialState,
    autoSaveEnabled,
  });

  // 初期化
  useEffect(() => {
    if (!state.isInitialized) {
      dispatch({ type: 'INITIALIZE_FORM', payload: { initialData } });
    }
  }, [state.isInitialized]); // initialDataを依存配列から削除

  // アクション関数
  const initializeForm = useCallback((initialData?: Partial<GoalFormData>) => {
    dispatch({ type: 'INITIALIZE_FORM', payload: { initialData } });
  }, []);

  const updateField = useCallback((field: keyof GoalFormData, value: string) => {
    dispatch({ type: 'UPDATE_FIELD', payload: { field, value } });
  }, []);

  const updateFormData = useCallback((data: Partial<GoalFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: data });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: isSubmitting });
  }, []);

  const setDraftSaving = useCallback((isDraftSaving: boolean) => {
    dispatch({ type: 'SET_DRAFT_SAVING', payload: isDraftSaving });
  }, []);

  const setAutoSaveEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_SAVE_ENABLED', payload: enabled });
  }, []);

  const setErrors = useCallback((errors: Record<string, string>) => {
    dispatch({ type: 'SET_ERRORS', payload: errors });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const setSuccess = useCallback((success: boolean) => {
    dispatch({ type: 'SET_SUCCESS', payload: success });
  }, []);

  const saveDraftSuccess = useCallback((data: Partial<GoalFormData>) => {
    dispatch({ type: 'SAVE_DRAFT_SUCCESS', payload: data });
  }, []);

  const submitSuccess = useCallback(() => {
    dispatch({ type: 'SUBMIT_SUCCESS' });
  }, []);

  const resetForm = useCallback((data?: Partial<GoalFormData>) => {
    dispatch({ type: 'RESET_FORM', payload: data });
  }, []);

  const checkUnsavedChanges = useCallback(() => {
    dispatch({ type: 'CHECK_UNSAVED_CHANGES' });
  }, []);

  const contextValue: GoalFormContextValue = {
    state,
    initializeForm,
    updateField,
    updateFormData,
    setSubmitting,
    setDraftSaving,
    setAutoSaveEnabled,
    setErrors,
    clearErrors,
    setSuccess,
    saveDraftSuccess,
    submitSuccess,
    resetForm,
    checkUnsavedChanges,
  };

  return <GoalFormContext.Provider value={contextValue}>{children}</GoalFormContext.Provider>;
};

/**
 * コンテキストを使用するためのフック
 */
export const useGoalFormContext = (): GoalFormContextValue => {
  const context = useContext(GoalFormContext);
  if (context === undefined) {
    throw new Error('useGoalFormContext must be used within a GoalFormProvider');
  }
  return context;
};

/**
 * フォームの状態を監視するフック
 */
export const useGoalFormState = () => {
  const { state } = useGoalFormContext();
  return state;
};

/**
 * フォームのアクションを使用するフック
 */
export const useGoalFormActions = () => {
  const {
    initializeForm,
    updateField,
    updateFormData,
    setSubmitting,
    setDraftSaving,
    setAutoSaveEnabled,
    setErrors,
    clearErrors,
    setSuccess,
    saveDraftSuccess,
    submitSuccess,
    resetForm,
    checkUnsavedChanges,
  } = useGoalFormContext();

  return {
    initializeForm,
    updateField,
    updateFormData,
    setSubmitting,
    setDraftSaving,
    setAutoSaveEnabled,
    setErrors,
    clearErrors,
    setSuccess,
    saveDraftSuccess,
    submitSuccess,
    resetForm,
    checkUnsavedChanges,
  };
};

/**
 * 特定のフィールドの状態を取得するフック
 */
export const useGoalFormField = (fieldName: keyof GoalFormData) => {
  const { state, updateField } = useGoalFormContext();

  const fieldValue = state.formData[fieldName] || '';
  const fieldError = state.errors[fieldName];
  const hasError = !!fieldError;

  const updateFieldValue = useCallback(
    (value: string) => {
      updateField(fieldName, value);
    },
    [fieldName, updateField]
  );

  return {
    value: fieldValue,
    error: fieldError,
    hasError,
    updateValue: updateFieldValue,
  };
};

/**
 * フォームの送信状態を管理するフック
 */
export const useGoalFormSubmission = () => {
  const { state, setSubmitting, setErrors, submitSuccess } = useGoalFormContext();

  const handleSubmit = useCallback(
    async (submitFn: (data: GoalFormData) => Promise<void>) => {
      try {
        setSubmitting(true);
        await submitFn(state.formData as GoalFormData);
        submitSuccess();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '送信中にエラーが発生しました';
        setErrors({ submit: errorMessage });
      } finally {
        setSubmitting(false);
      }
    },
    [state.formData, setSubmitting, setErrors, submitSuccess]
  );

  return {
    isSubmitting: state.isSubmitting,
    success: state.success,
    errors: state.errors,
    handleSubmit,
  };
};

/**
 * 下書き保存の状態を管理するフック
 */
export const useGoalFormDraftSave = () => {
  const { state, setDraftSaving, setErrors, saveDraftSuccess } = useGoalFormContext();

  const handleDraftSave = useCallback(
    async (saveFn: (data: PartialGoalFormData) => Promise<void>) => {
      try {
        setDraftSaving(true);
        await saveFn(state.formData);
        saveDraftSuccess(state.formData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '下書き保存中にエラーが発生しました';
        setErrors({ draftSave: errorMessage });
      } finally {
        setDraftSaving(false);
      }
    },
    [state.formData, setDraftSaving, setErrors, saveDraftSuccess]
  );

  return {
    isDraftSaving: state.isDraftSaving,
    hasUnsavedChanges: state.hasUnsavedChanges,
    handleDraftSave,
  };
};
