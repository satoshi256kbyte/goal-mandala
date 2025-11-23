import React, { createContext, useContext, useCallback, useReducer, useEffect } from 'react';
import { Action, ActionType } from '../types/mandala';

/**
 * アクションフォームデータの型
 */
export interface ActionFormData {
  title: string;
  description: string;
  background: string;
  constraints?: string;
  type: ActionType;
  position: number;
}

/**
 * 部分的なアクションフォームデータの型
 */
export type PartialActionFormData = Partial<ActionFormData>;

/**
 * 一括編集の変更内容
 */
export interface BulkEditChanges {
  commonFields: Record<string, unknown>;
  individualChanges: Record<string, Record<string, unknown>>;
  deleteItems: string[];
}

/**
 * アクションの状態
 */
export interface ActionState {
  /** アクション一覧 */
  actions: Action[];
  /** 選択されたサブ目標ID */
  selectedSubGoalId: string | null;
  /** 選択されたアクション */
  selectedAction: Action | null;
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
  lastSavedData: Record<string, PartialActionFormData>;
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
 * アクションのアクション
 */
export type ActionAction =
  | { type: 'INITIALIZE'; payload: { actions: Action[]; goalId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ACTIONS'; payload: Action[] }
  | { type: 'SELECT_SUB_GOAL'; payload: string | null }
  | { type: 'SELECT_ACTION'; payload: Action | null }
  | { type: 'UPDATE_ACTION'; payload: { id: string; changes: Partial<Action> } }
  | { type: 'REORDER_ACTIONS'; payload: { subGoalId: string; newOrder: Action[] } }
  | {
      type: 'BULK_UPDATE_ACTIONS';
      payload: { updates: Array<{ id: string; changes: Partial<Action> }>; deletes: string[] };
    }
  | { type: 'SET_VALIDATION_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_VALIDATION_ERRORS' }
  | { type: 'SET_DRAFT_SAVING'; payload: boolean }
  | { type: 'SET_AUTO_SAVE_ENABLED'; payload: boolean }
  | { type: 'SAVE_DRAFT_SUCCESS'; payload: { id: string; data: PartialActionFormData } }
  | { type: 'RESTORE_DRAFT'; payload: Record<string, PartialActionFormData> }
  | { type: 'SET_ERRORS'; payload: Record<string, string> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_SUCCESS'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean };

/**
 * 初期状態
 */
const initialState: ActionState = {
  actions: [],
  selectedSubGoalId: null,
  selectedAction: null,
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
 * アクション状態のリデューサー
 */
const actionReducer = (state: ActionState, action: ActionAction): ActionState => {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        actions: action.payload.actions,
        isInitialized: true,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'SET_ACTIONS':
      return {
        ...state,
        actions: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'SELECT_SUB_GOAL':
      return {
        ...state,
        selectedSubGoalId: action.payload,
        selectedAction: null, // サブ目標が変わったらアクション選択をクリア
        lastActionTimestamp: Date.now(),
      };

    case 'SELECT_ACTION':
      return {
        ...state,
        selectedAction: action.payload,
        lastActionTimestamp: Date.now(),
      };

    case 'UPDATE_ACTION': {
      const updatedActions = state.actions.map(actionItem =>
        actionItem.id === action.payload.id
          ? { ...actionItem, ...action.payload.changes }
          : actionItem
      );
      return {
        ...state,
        actions: updatedActions,
        selectedAction:
          state.selectedAction?.id === action.payload.id
            ? { ...state.selectedAction, ...action.payload.changes }
            : state.selectedAction,
        isDirty: true,
        lastActionTimestamp: Date.now(),
      };
    }

    case 'REORDER_ACTIONS': {
      const { subGoalId, newOrder } = action.payload;
      const updatedActions = state.actions.map(actionItem => {
        if (actionItem.sub_goal_id === subGoalId) {
          const reorderedAction = newOrder.find(a => a.id === actionItem.id);
          return reorderedAction || actionItem;
        }
        return actionItem;
      });
      return {
        ...state,
        actions: updatedActions,
        isDirty: true,
        lastActionTimestamp: Date.now(),
      };
    }

    case 'BULK_UPDATE_ACTIONS': {
      let updatedActions = [...state.actions];

      // 更新処理
      action.payload.updates.forEach(({ id, changes }) => {
        updatedActions = updatedActions.map(actionItem =>
          actionItem.id === id ? { ...actionItem, ...changes } : actionItem
        );
      });

      // 削除処理
      updatedActions = updatedActions.filter(
        actionItem => !action.payload.deletes.includes(actionItem.id)
      );

      return {
        ...state,
        actions: updatedActions,
        selectedAction: action.payload.deletes.includes(state.selectedAction?.id || '')
          ? null
          : state.selectedAction,
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

    default:
      return state;
  }
};

/**
 * コンテキストの値の型
 */
export interface ActionContextValue {
  /** 現在の状態 */
  state: ActionState;
  /** アクションを読み込み */
  loadActions: (goalId: string) => Promise<void>;
  /** サブ目標を選択 */
  selectSubGoal: (subGoalId: string | null) => void;
  /** アクションを選択 */
  selectAction: (action: Action | null) => void;
  /** アクションを更新 */
  updateAction: (id: string, changes: Partial<Action>) => void;
  /** アクションを並び替え */
  reorderActions: (subGoalId: string, newOrder: Action[]) => void;
  /** アクションを一括更新 */
  bulkUpdateActions: (
    updates: Array<{ id: string; changes: Partial<Action> }>,
    deletes: string[]
  ) => void;
  /** 下書きを保存 */
  saveDraft: (id: string, data: PartialActionFormData) => Promise<void>;
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
  /** サブ目標IDでフィルタされたアクションを取得 */
  getActionsBySubGoal: (subGoalId: string) => Action[];
}

/**
 * コンテキストの作成
 */
const ActionContext = createContext<ActionContextValue | undefined>(undefined);

/**
 * プロバイダーのプロパティ
 */
export interface ActionProviderProps {
  children: React.ReactNode;
  /** 目標ID */
  goalId?: string;
  /** 初期アクションデータ */
  initialActions?: Action[];
  /** 自動保存の初期設定 */
  autoSaveEnabled?: boolean;
}

/**
 * ActionProvider コンポーネント
 */
export const ActionProvider: React.FC<ActionProviderProps> = ({
  children,
  goalId,
  initialActions = [],
  autoSaveEnabled = true,
}) => {
  const [state, dispatch] = useReducer(actionReducer, {
    ...initialState,
    autoSaveEnabled,
  });

  // 初期化
  useEffect(() => {
    if (!state.isInitialized && goalId) {
      dispatch({
        type: 'INITIALIZE',
        payload: { actions: initialActions, goalId },
      });
    }
  }, [goalId, initialActions, state.isInitialized]);

  // アクション関数
  const loadActions = useCallback(async (goalId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      // TODO: API呼び出しを実装
      // const actions = await actionAPI.getActions(goalId);
      // dispatch({ type: 'SET_ACTIONS', payload: actions });
      console.log('Loading actions for goal:', goalId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'アクションの読み込みに失敗しました';
      dispatch({ type: 'SET_ERRORS', payload: { load: errorMessage } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const selectSubGoal = useCallback((subGoalId: string | null) => {
    dispatch({ type: 'SELECT_SUB_GOAL', payload: subGoalId });
  }, []);

  const selectAction = useCallback((action: Action | null) => {
    dispatch({ type: 'SELECT_ACTION', payload: action });
  }, []);

  const updateAction = useCallback((id: string, changes: Partial<Action>) => {
    dispatch({ type: 'UPDATE_ACTION', payload: { id, changes } });
  }, []);

  const reorderActions = useCallback((subGoalId: string, newOrder: Action[]) => {
    dispatch({ type: 'REORDER_ACTIONS', payload: { subGoalId, newOrder } });
  }, []);

  const bulkUpdateActions = useCallback(
    (updates: Array<{ id: string; changes: Partial<Action> }>, deletes: string[]) => {
      dispatch({ type: 'BULK_UPDATE_ACTIONS', payload: { updates, deletes } });
    },
    []
  );

  const saveDraft = useCallback(async (id: string, data: PartialActionFormData) => {
    try {
      dispatch({ type: 'SET_DRAFT_SAVING', payload: true });
      // TODO: API呼び出しを実装
      // await actionAPI.saveDraft(id, data);
      dispatch({ type: 'SAVE_DRAFT_SUCCESS', payload: { id, data } });
      console.log('Saving draft for action:', id, data);
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
      // const draftData = await actionAPI.restoreDraft();
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

  const getActionsBySubGoal = useCallback(
    (subGoalId: string): Action[] => {
      return state.actions.filter(action => action.sub_goal_id === subGoalId);
    },
    [state.actions]
  );

  const contextValue: ActionContextValue = {
    state,
    loadActions,
    selectSubGoal,
    selectAction,
    updateAction,
    reorderActions,
    bulkUpdateActions,
    saveDraft,
    restoreDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    setSuccess,
    setDirty,
    setAutoSaveEnabled,
    getActionsBySubGoal,
  };

  return <ActionContext.Provider value={contextValue}>{children}</ActionContext.Provider>;
};

/**
 * コンテキストを使用するためのフック
 */
export const useActionContext = (): ActionContextValue => {
  const context = useContext(ActionContext);
  if (context === undefined) {
    throw new Error('useActionContext must be used within an ActionProvider');
  }
  return context;
};

/**
 * アクションの状態を監視するフック
 */
export const useActionState = () => {
  const { state } = useActionContext();
  return state;
};

/**
 * アクションのアクションを使用するフック
 */
export const useActionActions = () => {
  const {
    loadActions,
    selectSubGoal,
    selectAction,
    updateAction,
    reorderActions,
    bulkUpdateActions,
    saveDraft,
    restoreDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    setSuccess,
    setDirty,
    setAutoSaveEnabled,
    getActionsBySubGoal,
  } = useActionContext();

  return {
    loadActions,
    selectSubGoal,
    selectAction,
    updateAction,
    reorderActions,
    bulkUpdateActions,
    saveDraft,
    restoreDraft,
    setValidationErrors,
    clearValidationErrors,
    setErrors,
    clearErrors,
    setSuccess,
    setDirty,
    setAutoSaveEnabled,
    getActionsBySubGoal,
  };
};
