import { useEffect, useRef, useCallback, useMemo } from 'react';
import { draftUtils } from '../utils/draft-utils';
import { PartialGoalFormData } from '../schemas/goal-form';
import { DraftService } from '../services/draftService';

/**
 * 自動保存の設定
 */
export interface AutoSaveConfig {
  /** 自動保存の間隔（ミリ秒） */
  interval: number;
  /** 自動保存が有効かどうか */
  enabled: boolean;
  /** 最小保存間隔（ミリ秒） - 連続保存を防ぐ */
  minInterval: number;
}

/**
 * 自動保存の状態
 */
export interface AutoSaveState {
  /** 最後の保存時刻 */
  lastSaveTime: number | null;
  /** 保存中フラグ */
  isSaving: boolean;
  /** 最後のエラー */
  lastError: Error | null;
  /** 保存成功回数 */
  saveCount: number;
}

/**
 * 自動保存フックのオプション
 */
export interface UseDraftAutoSaveOptions {
  /** フォームデータ */
  formData: PartialGoalFormData;
  /** 自動保存が有効かどうか */
  enabled?: boolean;
  /** 自動保存の間隔（秒） */
  intervalSeconds?: number;
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
 * デフォルト設定
 */
const DEFAULT_CONFIG: AutoSaveConfig = {
  interval: 30 * 1000, // 30秒
  enabled: true,
  minInterval: 5 * 1000, // 5秒
};

/**
 * 下書き自動保存フック
 */
export const useDraftAutoSave = (options: UseDraftAutoSaveOptions) => {
  const {
    formData,
    enabled = true,
    intervalSeconds = 30,
    onSaveSuccess,
    onSaveError,
    onSaveStart,
    onSaveComplete,
  } = options;

  // 設定
  const config: AutoSaveConfig = useMemo(
    () => ({
      ...DEFAULT_CONFIG,
      interval: intervalSeconds * 1000,
      enabled,
    }),
    [intervalSeconds, enabled]
  );

  // 状態の管理
  const stateRef = useRef<AutoSaveState>({
    lastSaveTime: null,
    isSaving: false,
    lastError: null,
    saveCount: 0,
  });

  // タイマーの管理
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFormDataRef = useRef<PartialGoalFormData>(formData);

  /**
   * 自動保存の実行
   */
  const performAutoSave = useCallback(async () => {
    const state = stateRef.current;

    // 保存中の場合はスキップ
    if (state.isSaving) {
      return;
    }

    // 最小間隔チェック
    const now = Date.now();
    if (state.lastSaveTime && now - state.lastSaveTime < config.minInterval) {
      return;
    }

    // データが保存する価値があるかチェック
    if (!draftUtils.isWorthSaving(formData)) {
      return;
    }

    // 前回と同じデータの場合はスキップ
    if (JSON.stringify(formData) === JSON.stringify(lastFormDataRef.current)) {
      return;
    }

    try {
      // 保存開始
      state.isSaving = true;
      state.lastError = null;
      onSaveStart?.();

      // 下書き保存実行
      await DraftService.saveDraft(formData);

      // 保存成功
      state.lastSaveTime = now;
      state.saveCount += 1;
      lastFormDataRef.current = { ...formData };

      onSaveSuccess?.(formData);
    } catch (error) {
      // 保存エラー
      const saveError = error instanceof Error ? error : new Error('自動保存に失敗しました');
      state.lastError = saveError;
      onSaveError?.(saveError);
    } finally {
      // 保存完了
      state.isSaving = false;
      onSaveComplete?.();
    }
  }, [formData, config.minInterval, onSaveStart, onSaveSuccess, onSaveError, onSaveComplete]);

  /**
   * タイマーの開始
   */
  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (config.enabled) {
      timerRef.current = setInterval(performAutoSave, config.interval);
    }
  }, [config.enabled, config.interval, performAutoSave]);

  /**
   * タイマーの停止
   */
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 手動保存
   */
  const saveNow = useCallback(async () => {
    await performAutoSave();
  }, [performAutoSave]);

  /**
   * 自動保存の有効/無効切り替え
   */
  const setEnabled = useCallback(
    (enabled: boolean) => {
      config.enabled = enabled;
      if (enabled) {
        startTimer();
      } else {
        stopTimer();
      }
    },
    [config, startTimer, stopTimer]
  );

  // フォームデータの変更を監視
  useEffect(() => {
    lastFormDataRef.current = formData;
  }, [formData]);

  // 自動保存の開始/停止
  useEffect(() => {
    if (config.enabled) {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [config.enabled, startTimer, stopTimer]);

  // ページ離脱時の保存
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (
        draftUtils.isWorthSaving(formData) &&
        JSON.stringify(formData) !== JSON.stringify(lastFormDataRef.current)
      ) {
        // 同期的に保存を試行
        try {
          await DraftService.saveDraft(formData);
        } catch (error) {
          // ページ離脱時のエラーは無視
          console.warn('ページ離脱時の自動保存に失敗しました:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData]);

  // ページの非表示時の保存
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.hidden &&
        draftUtils.isWorthSaving(formData) &&
        JSON.stringify(formData) !== JSON.stringify(lastFormDataRef.current)
      ) {
        try {
          await performAutoSave();
        } catch (error) {
          console.warn('ページ非表示時の自動保存に失敗しました:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [formData, performAutoSave]);

  return {
    /** 現在の状態 */
    state: stateRef.current,
    /** 手動保存 */
    saveNow,
    /** 自動保存の有効/無効切り替え */
    setEnabled,
    /** タイマーの開始 */
    startTimer,
    /** タイマーの停止 */
    stopTimer,
    /** 設定 */
    config,
  };
};

/**
 * 自動保存の状態を監視するフック
 */
export const useAutoSaveStatus = (autoSave: ReturnType<typeof useDraftAutoSave>) => {
  const { state } = autoSave;

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
      ? Math.floor((Date.now() - state.lastSaveTime) / 1000)
      : null,
  };
};
