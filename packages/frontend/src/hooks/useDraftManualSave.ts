import { useState, useCallback } from 'react';
import { PartialGoalFormData } from '../schemas/goal-form';
import { DraftService, draftUtils } from '../services/draftService';

/**
 * 手動保存の状態
 */
export interface ManualSaveState {
  /** 保存中フラグ */
  isSaving: boolean;
  /** 最後の保存時刻 */
  lastSaveTime: Date | null;
  /** 最後のエラー */
  lastError: Error | null;
  /** 保存成功回数 */
  saveCount: number;
  /** 最後に保存したデータ */
  lastSavedData: PartialGoalFormData | null;
}

/**
 * 手動保存フックのオプション
 */
export interface UseDraftManualSaveOptions {
  /** 保存成功時のコールバック */
  onSaveSuccess?: (data: PartialGoalFormData) => void;
  /** 保存エラー時のコールバック */
  onSaveError?: (error: Error) => void;
  /** 保存開始時のコールバック */
  onSaveStart?: () => void;
  /** 保存完了時のコールバック */
  onSaveComplete?: () => void;
}

/**
 * 下書き手動保存フック
 */
export const useDraftManualSave = (options: UseDraftManualSaveOptions = {}) => {
  const { onSaveSuccess, onSaveError, onSaveStart, onSaveComplete } = options;

  // 状態管理
  const [state, setState] = useState<ManualSaveState>({
    isSaving: false,
    lastSaveTime: null,
    lastError: null,
    saveCount: 0,
    lastSavedData: null,
  });

  /**
   * 手動保存の実行
   */
  const saveDraft = useCallback(
    async (formData: PartialGoalFormData): Promise<boolean> => {
      // 既に保存中の場合はスキップ
      if (state.isSaving) {
        return false;
      }

      // データが保存する価値があるかチェック
      if (!draftUtils.isWorthSaving(formData)) {
        const error = new Error('保存するデータがありません');
        setState(prev => ({ ...prev, lastError: error }));
        onSaveError?.(error);
        return false;
      }

      try {
        // 保存開始
        setState(prev => ({
          ...prev,
          isSaving: true,
          lastError: null,
        }));
        onSaveStart?.();

        // 下書き保存実行
        await DraftService.saveDraft(formData);

        // 保存成功
        const now = new Date();
        setState(prev => ({
          ...prev,
          isSaving: false,
          lastSaveTime: now,
          saveCount: prev.saveCount + 1,
          lastSavedData: { ...formData },
        }));

        onSaveSuccess?.(formData);
        return true;
      } catch (error) {
        // 保存エラー
        const saveError = error instanceof Error ? error : new Error('下書きの保存に失敗しました');
        setState(prev => ({
          ...prev,
          isSaving: false,
          lastError: saveError,
        }));

        onSaveError?.(saveError);
        return false;
      } finally {
        onSaveComplete?.();
      }
    },
    [state.isSaving, onSaveStart, onSaveSuccess, onSaveError, onSaveComplete]
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }));
  }, []);

  /**
   * 状態をリセット
   */
  const reset = useCallback(() => {
    setState({
      isSaving: false,
      lastSaveTime: null,
      lastError: null,
      saveCount: 0,
      lastSavedData: null,
    });
  }, []);

  /**
   * データが変更されているかチェック
   */
  const hasChanges = useCallback(
    (formData: PartialGoalFormData): boolean => {
      if (!state.lastSavedData) {
        return draftUtils.isWorthSaving(formData);
      }

      return JSON.stringify(formData) !== JSON.stringify(state.lastSavedData);
    },
    [state.lastSavedData]
  );

  /**
   * 保存が必要かチェック
   */
  const needsSave = useCallback(
    (formData: PartialGoalFormData): boolean => {
      return draftUtils.isWorthSaving(formData) && hasChanges(formData);
    },
    [hasChanges]
  );

  return {
    /** 現在の状態 */
    state,
    /** 手動保存の実行 */
    saveDraft,
    /** エラーをクリア */
    clearError,
    /** 状態をリセット */
    reset,
    /** データが変更されているかチェック */
    hasChanges,
    /** 保存が必要かチェック */
    needsSave,
  };
};

/**
 * 手動保存の状態を監視するフック
 */
export const useManualSaveStatus = (manualSave: ReturnType<typeof useDraftManualSave>) => {
  const { state } = manualSave;

  return {
    /** 保存中かどうか */
    isSaving: state.isSaving,
    /** 最後の保存時刻 */
    lastSaveTime: state.lastSaveTime,
    /** 最後のエラー */
    lastError: state.lastError,
    /** 保存成功回数 */
    saveCount: state.saveCount,
    /** 最後の保存からの経過時間（秒） */
    timeSinceLastSave: state.lastSaveTime
      ? Math.floor((Date.now() - state.lastSaveTime.getTime()) / 1000)
      : null,
    /** エラーがあるかどうか */
    hasError: !!state.lastError,
    /** 保存に成功したことがあるかどうか */
    hasSaved: state.saveCount > 0,
  };
};
