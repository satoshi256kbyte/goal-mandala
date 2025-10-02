import React, { createContext, useContext, useCallback, useReducer, useEffect } from 'react';
import { SubGoal } from '../types/mandala';
import { PartialSubGoalFormData } from '../schemas/subgoal-form';

/**
 * サブ目標の状態
 */
export interface SubGoalState {
  /** サブ目標一覧 */
  subGoals: SubGoal[];
  /** 選択されたサブ目標 */
  selectedSubGoal: SubGoal | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** 未保存の変更があるかどうか */
  isDirty: boolean;
  /** バリデーションエラー */
  validationErrors: Record<string, string>;
  /** 下書き保存中フラグ */
  isDraftSaving: boolean;
  /** 自動保存が有効かどうか */
  autoSaveEnabled: boolean;
  /** 最後に保存されたデータ */
  lastSavedData: Record<string, PartialSubGoalFormData>;
  /** エラー状態 */
  errors: Record<string, string>;
  /** 成功状態 */
  success: boolean;
  /** 最後の操作のタイムスタンプ */
  lastActionTimestamp: number;
  /** 初期化状態 */
  isInitialized: boolean;
}

/**
 * サブ目標のアクション
 */
export type SubGoalAction =
  | { type: 'INITIALIZE'; payload: { subGoals: SubGoal[]; goalId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SUB_GOALS'; payload: SubGoal[] }
  | { type: 'SELECT_SUB_GOAL'; payload: SubGoal | null }
  | { type: 'UPDATE_SUB_GOAL'; payload: { id: string; changes: Partial<SubGoal> } }
  | { type: 'REORDER_SUB_GOALS'; payload: SubGoal[] }
  | {
      type: 'BULK_UPDATE_SUB_GOALS';
      payload: { updates: Array<{ id: string; changes: Partial<SubGoal> }>; deletes: string[] };
    }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_VALIDATION_ERRORS' }
  | { type: 'SET_DRAFT_SAVING'; payload: boolean }
  | { type: 'SET_AUTO_SAVE_ENABLED'; payload: boolean }
  | { type: 'SAVE_DRAFT_SUCCESS'; payload: { id: string; data: PartialSubGoalFormData } }
  | { type: 'RESTORE_DRAFT'; payload: Record<string, PartialSubGoalFormData> }
  | { type: 'SET_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_SUCCESS'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'REGENERATE_SUCCESS'; payload: SubGoal[] };

/**
 * 初期状態
 */
const initialState: SubGoalState = {
  subGoals: [],
  selectedSubGoal: null,
  isLoading: false,
  isDirty: false,
  validationErrors: {},
  isDraftSaving: false,
  autoSaveEnabled: true,
  lastSavedData: {},
  errors: {},
  success: false,
  lastActionTimestamp: Date.now(),
  isInitialized: false,
};

/**
 * サブ目標状態のリデューサー
 */
const subGoalReducer = (state: SubGoalState, action: SubGoalAction): SubGoalState => {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        subGoals: action.payload.subGoals,
        isInitialized: true,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_SUB_GOALS':
      return {
        ...state,
        subGoals: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'SELECT_SUB_GOAL':
      return {
        ...state,
        selectedSubGoal: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'UPDATE_SUB_GOAL': {
      const updatedSubGoals = state.subGoals.map(subGoal =>
        subGoal.id === action.payload.id ? { ...subGoal, ...action.payload.changes } : subGoal
      );
      return {
        ...state,
        subGoals: updatedSubGoals,
        selectedSubGoal:
          state.selectedSubGoal?.id === action.payload.id
            ? { ...state.selectedSubGoal, ...action.payload.changes }
            : state.selectedSubGoal,
        isDirty: true,
        lastActionTimestamp: Date.now(),
      };
    }

    case 'REORDER_SUB_GOALS':
      return {
        ...state,
        subGoals: action.payload,
        isDirty: true,
        lastActionTimestamp: Date.now(),
      };

    case 'BULK_UPDATE_SUB_GOALS': {
      let updatedSubGoals = [...state.subGoals];

      // 更新処理
      action.payload.updates.forEach(({ id, changes }) => {
        updatedSubGoals = updatedSubGoals.map(subGoal =>
          subGoal.id === id ? { ...subGoal, ...changes } : subGoal
        );
      });

      // 削除処理
      updatedSubGoals = updatedSubGoals.filter(
        subGoal => !action.payload.deletes.includes(subGoal.id)
      );

      return {
        ...state,
        subGoals: updatedSubGoals,
        selectedSubGoal: action.payload.deletes.includes(state.selectedSubGoal?.id || '')
          ? null
          : state.selectedSubGoal,
        isDirty: true,
        lastActionTimestamp: Date.now(),
      };
    }

    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'CLEAR_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: {},
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

    case 'SAVE_DRAFT_SUCCESS':
      return {
        ...state,
        lastSavedData: {
          ...state.lastSavedData,
          [action.payload.id]: action.payload.data,
        },
        isDraftSaving: false,
        errors: {},
        lastActionTimestamp: Date.now(),
      };

    case 'RESTORE_DRAFT':
      return {
        ...state,
        lastSavedData: action.payload,
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
        isDirty: action.payload ? false : state.isDirty,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'REGENERATE_SUCCESS':
      return {
        ...state,
        subGoals: action.payload,
        isDirty: false,
        success: true,
        errors: {},
        lastActionTimestamp: Date.now(),
      };

    default:
      return state;
  }
};

/**
 * コンテキストの値の型
 */
export interface SubGoalContextValue {
  /** 現在の状態 */
  state: SubGoalState;
  /** サブ目標を読み込み */
  loadSubGoals: (goalId: string) => Promise<void>;
  /** サブ目標を選択 */
  selectSubGoal: (subGoal: SubGoal | null) => void;
  /** サブ目標を更新 */
  updateSubGoal: (id: string, changes: Partial<SubGoal>) => void;
  /** サブ目標を並び替え */
  reorderSubGoals: (newOrder: SubGoal[]) => void;
  /** サブ目標を一括更新 */
  bulkUpdateSubGoals: (
    updates: Array<{ id: string; changes: Partial<SubGoal> }>,
    deletes: string[]
  ) => void;
  /** サブ目標を再生成 */
  regenerateSubGoals: (goalId: string) => Promise<void>;
  /** 下書きを保存 */
  saveDraft: (id: string, data: PartialSubGoalFormData) => Promise<void>;
  /** 下書きを復元 */
  restoreDraft: () => Promise<void>;
  /** バリデーションエラーを設定 */
  setValidationErrors: (errors: Record<string, string>) => void;
  /** バリデーションエラーをクリア */
  clearValidationErrors: () => void;
  /** エラーを設定 */
  setErrors: (errors: Record<string, string>) => void;
  /** エラーをクリア */
  clearErrors: () => void;
  /** 成功状態を設定 */
  setSuccess: (success: boolean) => void;
  /** ダーティ状態を設定 */
  setDirty: (dirty: boolean) => void;
  /** 自動保存の有効/無効を設定 */
  setAutoSaveEnabled: (enabled: boolean) => void;
}

/**
 * コンテキストの作成
 */
const SubGoalContext = createContext<SubGoalContextValue | undefined>(undefined);

/**
 * プロバイダーのプロパティ
 */
export interface SubGoalProviderProps {
  children: React.ReactNode;
  /** 目標ID */
  goalId?: string;
  /** 初期サブ目標データ */
  initialSubGoals?: SubGoal[];
  /** 自動保存の初期設定 */
  autoSaveEnabled?: boolean;
}

/**
 * SubGoalProvider コンポーネント
 */
export const SubGoalProvider: React.FC<SubGoalProviderProps> = ({
  children,
  goalId,
  initialSubGoals = [],
  autoSaveEnabled = true,
}) => {
  const [state, dispatch] = useReducer(subGoalReducer, {
    ...initialState,
    autoSaveEnabled,
  });

  // 初期化
  useEffect(() => {
    if (!state.isInitialized && goalId) {
      dispatch({
        type: 'INITIALIZE',
        payload: { subGoals: initialSubGoals, goalId },
      });
    }
  }, [goalId, initialSubGoals, state.isInitialized]);

  // アクション関数
  const loadSubGoals = useCallback(async (goalId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // TODO: API呼び出しを実装
      // const subGoals = await subGoalAPI.getSubGoals(goalId);
      // dispatch({ type: 'SET_SUB_GOALS', payload: subGoals });
      console.log('Loading subgoals for goal:', goalId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'サブ目標の読み込みに失敗しました';
      dispatch({ type: 'SET_ERRORS', payload: { load: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const selectSubGoal = useCallback((subGoal: SubGoal | null) => {
    dispatch({ type: 'SELECT_SUB_GOAL', payload: subGoal });
  }, []);

  const updateSubGoal = useCallback((id: string, changes: Partial<SubGoal>) => {
    dispatch({ type: 'UPDATE_SUB_GOAL', payload: { id, changes } });
  }, []);

  const reorderSubGoals = useCallback((newOrder: SubGoal[]) => {
    dispatch({ type: 'REORDER_SUB_GOALS', payload: newOrder });
  }, []);

  const bulkUpdateSubGoals = useCallback(
    (updates: Array<{ id: string; changes: Partial<SubGoal> }>, deletes: string[]) => {
      dispatch({ type: 'BULK_UPDATE_SUB_GOALS', payload: { updates, deletes } });
    },
    []
  );

  const regenerateSubGoals = useCallback(async (goalId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // TODO: API呼び出しを実装
      // const newSubGoals = await subGoalAPI.regenerateSubGoals(goalId);
      // dispatch({ type: 'REGENERATE_SUCCESS', payload: newSubGoals });
      console.log('Regenerating subgoals for goal:', goalId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'サブ目標の再生成に失敗しました';
      dispatch({ type: 'SET_ERRORS', payload: { regenerate: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const saveDraft = useCallback(async (id: string, data: PartialSubGoalFormData) => {
    try {
      dispatch({ type: 'SET_DRAFT_SAVING', payload: true });
      // TODO: API呼び出しを実装
      // await subGoalAPI.saveDraft(id, data);
      dispatch({ type: 'SAVE_DRAFT_SUCCESS', payload: { id, data } });
      console.log('Saving draft for subgoal:', id, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下書き保存に失敗しました';
      dispatch({ type: 'SET_ERRORS', payload: { draftSave: errorMessage } });
    } finally {
      dispatch({ type: 'SET_DRAFT_SAVING', payload: false });
    }
  }, []);

  const restoreDraft = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // TODO: API呼び出しを実装
      // const draftData = await subGoalAPI.restoreDraft();
      // dispatch({ type: 'RESTORE_DRAFT', payload: draftData });
      console.log('Restoring draft');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '下書きの復元に失敗しました';
      dispatch({ type: 'SET_ERRORS', payload: { draftRestore: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const setValidationErrors = useCallback((errors: Record<string, string>) => {
    dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
  }, []);

  const clearValidationErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_VALIDATION_ERRORS' });
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

  const setDirty = useCallback((dirty: boolean) => {
    dispatch({ type: 'SET_DIRTY', payload: dirty });
  }, []);

  const setAutoSaveEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_SAVE_ENABLED', payload: enabled });
  }, []);

  const contextValue: SubGoalContextValue = {
    state,
    loadSubGoals,
    selectSubGoal,
    updateSubGoal,
    reorderSubGoals,
    bulkUpdateSubGoals,
    regenerateSubGoals,
    saveDraft,
    restoreDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    setSuccess,
    setDirty,
    setAutoSaveEnabled,
  };

  return <SubGoalContext.Provider value={contextValue}>{children}</SubGoalContext.Provider>;
};

/**
 * コンテキストを使用するためのフック
 */
export const useSubGoalContext = (): SubGoalContextValue => {
  const context = useContext(SubGoalContext);
  if (context === undefined) {
    throw new Error('useSubGoalContext must be used within a SubGoalProvider');
  }
  return context;
};

/**
 * サブ目標の状態を監視するフック
 */
export const useSubGoalState = () => {
  const { state } = useSubGoalContext();
  return state;
};

/**
 * サブ目標のアクションを使用するフック
 */
export const useSubGoalActions = () => {
  const {
    loadSubGoals,
    selectSubGoal,
    updateSubGoal,
    reorderSubGoals,
    bulkUpdateSubGoals,
    regenerateSubGoals,
    saveDraft,
    restoreDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    setSuccess,
    setDirty,
    setAutoSaveEnabled,
  } = useSubGoalContext();

  return {
    loadSubGoals,
    selectSubGoal,
    updateSubGoal,
    reorderSubGoals,
    bulkUpdateSubGoals,
    regenerateSubGoals,
    saveDraft,
    restoreDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    setSuccess,
    setDirty,
    setAutoSaveEnabled,
  };
};
