import { useState, useEffect } from 'react';
import { PartialGoalFormData } from '../schemas/goal-form';
import { DraftService, DraftData } from '../services/draftService';

/**
 * 下書き復元の状態
 */
export interface DraftRestoreState {
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** 下書きデータ */
  draftData: DraftData | null;
  /** エラー */
  error: Error | null;
  /** 復元済みフラグ */
  isRestored: boolean;
  /** 復元を拒否したフラグ */
  isRejected: boolean;
}

/**
 * 下書き復元フックのオプション
 */
export interface UseDraftRestoreOptions {
  /** 自動復元を有効にするか */
  autoRestore?: boolean;
  /** 復元成功時のコールバック */
  onRestoreSuccess?: (data: PartialGoalFormData, draftData: DraftData) => void;
  /** 復元エラー時のコールバック */
  onRestoreError?: (error: Error) => void;
  /** 下書き発見時のコールバック */
  onDraftFound?: (draftData: DraftData) => void;
  /** 復元拒否時のコールバック */
  onRestoreRejected?: () => void;
}

/**
 * 下書き復元フック
 */
export const useDraftRestore = (options: UseDraftRestoreOptions = {}) => {
  const {
    autoRestore = false,
    onRestoreSuccess,
    onRestoreError,
    onDraftFound,
    onRestoreRejected,
  } = options;

  // 状態管理
  const [state, setState] = useState<DraftRestoreState>({
    isLoading: false,
    draftData: null,
    error: null,
    isRestored: false,
    isRejected: false,
  });

  /**
   * 下書きデータを読み込み
   */
  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const draftData = await DraftService.loadDraft();

      setState(prev => ({ ...prev, draftData, isLoading: false }));

      if (draftData) {
        onDraftFound?.(draftData);
      }

      return draftData;
    } catch (error) {
      const loadError =
        error instanceof Error ? error : new Error('下書きの読み込みに失敗しました');
      setState(prev => ({ ...prev, error: loadError, isLoading: false }));
      onRestoreError?.(loadError);
      return null;
    }
  }, [onDraftFound, onRestoreError]);

  /**
   * 下書きを復元
   */
  const restoreDraft = useCallback(
    async (draftData?: DraftData): Promise<PartialGoalFormData | null> => {
      try {
        const targetDraft = draftData || state.draftData;

        if (!targetDraft) {
          throw new Error('復元する下書きデータがありません');
        }

        setState(prev => ({ ...prev, isRestored: true, error: null }));
        onRestoreSuccess?.(targetDraft.formData, targetDraft);

        return targetDraft.formData;
      } catch (error) {
        const restoreError =
          error instanceof Error ? error : new Error('下書きの復元に失敗しました');
        setState(prev => ({ ...prev, error: restoreError }));
        onRestoreError?.(restoreError);
        return null;
      }
    },
    [state.draftData, onRestoreSuccess, onRestoreError]
  );

  /**
   * 下書きの復元を拒否
   */
  const rejectRestore = useCallback(() => {
    setState(prev => ({ ...prev, isRejected: true }));
    onRestoreRejected?.();
  }, [onRestoreRejected]);

  /**
   * 下書きを削除
   */
  const clearDraft = useCallback(async (): Promise<void> => {
    try {
      await DraftService.clearDraft();
      setState(prev => ({
        ...prev,
        draftData: null,
        isRestored: false,
        isRejected: false,
        error: null,
      }));
    } catch (error) {
      const clearError = error instanceof Error ? error : new Error('下書きの削除に失敗しました');
      setState(prev => ({ ...prev, error: clearError }));
      onRestoreError?.(clearError);
    }
  }, [onRestoreError]);

  /**
   * 状態をリセット
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      draftData: null,
      error: null,
      isRestored: false,
      isRejected: false,
    });
  }, []);

  /**
   * 下書きが存在するかチェック
   */
  const hasDraft = useCallback((): boolean => {
    return !!state.draftData;
  }, [state.draftData]);

  /**
   * 復元可能かチェック
   */
  const canRestore = useCallback((): boolean => {
    return !!state.draftData && !state.isRestored && !state.isRejected;
  }, [state.draftData, state.isRestored, state.isRejected]);

  // 初期化時に下書きを読み込み
  useEffect(() => {
    const initializeDraft = async () => {
      const draftData = await loadDraft();

      // 自動復元が有効で下書きが存在する場合は自動復元
      if (autoRestore && draftData) {
        await restoreDraft(draftData);
      }
    };

    initializeDraft();
  }, [autoRestore]);

  return {
    /** 現在の状態 */
    state,
    /** 下書きデータを読み込み */
    loadDraft,
    /** 下書きを復元 */
    restoreDraft,
    /** 下書きの復元を拒否 */
    rejectRestore,
    /** 下書きを削除 */
    clearDraft,
    /** 状態をリセット */
    reset,
    /** 下書きが存在するかチェック */
    hasDraft,
    /** 復元可能かチェック */
    canRestore,
  };
};

/**
 * 下書き復元の状態を監視するフック
 */
export const useDraftRestoreStatus = (draftRestore: ReturnType<typeof useDraftRestore>) => {
  const { state } = draftRestore;

  return {
    /** 読み込み中かどうか */
    isLoading: state.isLoading,
    /** 下書きが存在するかどうか */
    hasDraft: !!state.draftData,
    /** 復元済みかどうか */
    isRestored: state.isRestored,
    /** 復元を拒否したかどうか */
    isRejected: state.isRejected,
    /** エラーがあるかどうか */
    hasError: !!state.error,
    /** エラーメッセージ */
    errorMessage: state.error?.message,
    /** 下書きの概要 */
    draftSummary: state.draftData ? draftUtils.getDraftSummary(state.draftData.formData) : null,
    /** 下書きの保存日時 */
    draftSavedAt: state.draftData ? new Date(state.draftData.savedAt) : null,
    /** 下書きの保存からの経過時間 */
    timeSinceSave: state.draftData
      ? draftUtils.getTimeSinceSave(new Date(state.draftData.savedAt))
      : null,
    /** 復元可能かどうか */
    canRestore: !!state.draftData && !state.isRestored && !state.isRejected,
  };
};
