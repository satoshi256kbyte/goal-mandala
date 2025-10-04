/**
 * 最適化された下書き保存フック
 */

import { useRef, useEffect, useState } from 'react';
import { useDebounce, /* useThrottle, */ useStableCallback, deepEqual } from '../utils/performance';
import { draftService } from '../services/draftService';

/**
 * 下書きデータの型定義
 */
export interface DraftData {
  id: string;
  type: 'subgoal' | 'action' | 'goal';
  data: unknown;
  timestamp: number;
  version: number;
}

/**
 * 圧縮オプション
 */
export interface CompressionOptions {
  /** 圧縮を有効にするか */
  enabled: boolean;
  /** 圧縮しきい値（バイト数） */
  threshold: number;
  /** 圧縮レベル（1-9） */
  level: number;
}

/**
 * 下書き保存オプション
 */
export interface OptimizedDraftSaveOptions {
  /** デバウンス遅延時間（ミリ秒） */
  debounceDelay: number;
  /** スロットル間隔（ミリ秒） */
  throttleInterval: number;
  /** 差分検出を有効にするか */
  enableDiffDetection: boolean;
  /** ローカルストレージを使用するか */
  useLocalStorage: boolean;
  /** 圧縮オプション */
  compression: CompressionOptions;
  /** 最大保存履歴数 */
  maxHistoryCount: number;
  /** 自動保存を有効にするか */
  enableAutoSave: boolean;
}

/**
 * デフォルトオプション
 */
const DEFAULT_OPTIONS: OptimizedDraftSaveOptions = {
  debounceDelay: 1000,
  throttleInterval: 5000,
  enableDiffDetection: true,
  useLocalStorage: true,
  compression: {
    enabled: true,
    threshold: 1024, // 1KB以上で圧縮
    level: 6,
  },
  maxHistoryCount: 10,
  enableAutoSave: true,
};

/**
 * 保存状態
 */
export interface SaveState {
  /** 保存中かどうか */
  isSaving: boolean;
  /** 最後の保存時刻 */
  lastSaved: Date | null;
  /** 保存エラー */
  error: string | null;
  /** 未保存の変更があるか */
  hasUnsavedChanges: boolean;
  /** 保存成功フラグ */
  saveSuccess: boolean;
}

/**
 * 最適化された下書き保存フック
 */
export const useOptimizedDraftSave = (
  draftId: string,
  draftType: 'subgoal' | 'action' | 'goal',
  options: Partial<OptimizedDraftSaveOptions> = {}
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 状態管理
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false,
    saveSuccess: false,
  });

  // 内部状態
  const currentDataRef = useRef<unknown>(null);
  const lastSavedDataRef = useRef<unknown>(null);
  const saveVersionRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const compressionWorkerRef = useRef<Worker>();

  /**
   * データ圧縮関数
   */
  const compressData = useStableCallback(
    async (data: unknown): Promise<string> => {
      if (!opts.compression.enabled) {
        return JSON.stringify(data);
      }

      const jsonString = JSON.stringify(data);

      // しきい値以下の場合は圧縮しない
      if (jsonString.length < opts.compression.threshold) {
        return jsonString;
      }

      try {
        // Web Workerを使用した非同期圧縮（実装時に追加）
        // 現在は簡易的な圧縮を実装
        const compressed = await simpleCompress(jsonString);
        return compressed;
      } catch (error) {
        console.warn('Compression failed, using uncompressed data:', error);
        return jsonString;
      }
    },
    [opts.compression]
  );

  /**
   * データ展開関数
   */
  const decompressData = useStableCallback(async (compressedData: string): Promise<unknown> => {
    try {
      // 圧縮されているかチェック
      if (compressedData.startsWith('{') || compressedData.startsWith('[')) {
        // 非圧縮データ
        return JSON.parse(compressedData);
      }

      // 圧縮データの展開
      const decompressed = await simpleDecompress(compressedData);
      return JSON.parse(decompressed);
    } catch (error) {
      console.error('Decompression failed:', error);
      throw error;
    }
  }, []);

  /**
   * 差分検出関数
   */
  const detectChanges = useStableCallback(
    (newData: unknown, oldData: unknown): boolean => {
      if (!opts.enableDiffDetection) {
        return true; // 差分検出無効の場合は常に変更ありとみなす
      }

      return !deepEqual(newData, oldData);
    },
    [opts.enableDiffDetection]
  );

  /**
   * ローカルストレージへの保存
   */
  const saveToLocalStorage = useStableCallback(
    async (data: unknown): Promise<void> => {
      if (!opts.useLocalStorage) return;

      try {
        const compressed = await compressData(data);
        const draftData: DraftData = {
          id: draftId,
          type: draftType,
          data: compressed,
          timestamp: Date.now(),
          version: saveVersionRef.current,
        };

        localStorage.setItem(`draft_${draftId}`, JSON.stringify(draftData));

        // 履歴管理
        const historyKey = `draft_history_${draftId}`;
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        history.unshift(draftData);

        // 最大履歴数を超えた場合は古いものを削除
        if (history.length > opts.maxHistoryCount) {
          history.splice(opts.maxHistoryCount);
        }

        localStorage.setItem(historyKey, JSON.stringify(history));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
        throw error;
      }
    },
    [draftId, draftType, opts.useLocalStorage, opts.maxHistoryCount, compressData]
  );

  /**
   * ローカルストレージからの読み込み
   */
  const loadFromLocalStorage = useStableCallback(async (): Promise<unknown | null> => {
    if (!opts.useLocalStorage) return null;

    try {
      const stored = localStorage.getItem(`draft_${draftId}`);
      if (!stored) return null;

      const draftData: DraftData = JSON.parse(stored);
      return await decompressData(String(draftData.data));
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }, [draftId, opts.useLocalStorage, decompressData]);

  /**
   * サーバーへの保存
   */
  const saveToServer = useStableCallback(
    async (data: unknown): Promise<void> => {
      try {
        const compressed = await compressData(data);
        await draftService.saveDraft(compressed as any);
      } catch (error) {
        console.error('Failed to save to server:', error);
        throw error;
      }
    },
    [draftId, draftType, compressData]
  );

  /**
   * 実際の保存処理
   */
  const performSave = useStableCallback(
    async (data: unknown, force = false): Promise<void> => {
      // 差分チェック
      if (!force && !detectChanges(data, lastSavedDataRef.current)) {
        return; // 変更がない場合はスキップ
      }

      setSaveState(prev => ({ ...prev, isSaving: true, error: null }));

      try {
        // バージョンを更新
        saveVersionRef.current += 1;

        // 並列保存（ローカルストレージとサーバー）
        const savePromises: Promise<void>[] = [];

        if (opts.useLocalStorage) {
          savePromises.push(saveToLocalStorage(data));
        }

        savePromises.push(saveToServer(data));

        await Promise.all(savePromises);

        // 保存成功
        lastSavedDataRef.current = data;
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          lastSaved: new Date(),
          hasUnsavedChanges: false,
          saveSuccess: true,
          error: null,
        }));

        // 成功フラグを3秒後にリセット
        setTimeout(() => {
          setSaveState(prev => ({ ...prev, saveSuccess: false }));
        }, 3000);
      } catch (error) {
        console.error('Save failed:', error);
        setSaveState(prev => ({
          ...prev,
          isSaving: false,
          error: error instanceof Error ? error.message : '保存に失敗しました',
        }));
      }
    },
    [detectChanges, saveToLocalStorage, saveToServer, opts.useLocalStorage]
  );

  /**
   * デバウンス付き保存
   */
  const debouncedSave = useDebounce(
    useStableCallback(
      (data: unknown) => {
        performSave(data);
      },
      [performSave]
    ),
    opts.debounceDelay
  );

  /**
   * スロットル付き保存
   */
  // const throttledSave = useThrottle( // 将来使用予定
  //   useStableCallback(
  //     (data: unknown) => {
  //       performSave(data);
  //     },
  //     [performSave]
  //   ),
  //   opts.throttleInterval
  // );

  /**
   * 自動保存処理
   */
  const autoSave = useStableCallback(
    (data: unknown) => {
      if (!opts.enableAutoSave) return;

      currentDataRef.current = data;

      // 変更があることを記録
      setSaveState(prev => ({ ...prev, hasUnsavedChanges: true }));

      // デバウンス付きで保存
      debouncedSave(data);
    },
    [opts.enableAutoSave, debouncedSave]
  );

  /**
   * 手動保存処理
   */
  const manualSave = useStableCallback(
    async (data?: unknown): Promise<void> => {
      const saveData = data || currentDataRef.current;
      if (!saveData) return;

      await performSave(saveData, true); // 強制保存
    },
    [performSave]
  );

  /**
   * 下書き復元処理
   */
  const restoreDraft = useStableCallback(async (): Promise<unknown | null> => {
    try {
      // まずローカルストレージから試行
      let data = await loadFromLocalStorage();

      if (!data) {
        // ローカルストレージにない場合はサーバーから取得
        const serverDraft = await draftService.loadDraft();
        if (serverDraft) {
          data = serverDraft;
        }
      }

      if (data) {
        currentDataRef.current = data;
        lastSavedDataRef.current = data;
        setSaveState(prev => ({
          ...prev,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
        }));
      }

      return data;
    } catch (error) {
      console.error('Failed to restore draft:', error);
      setSaveState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '下書きの復元に失敗しました',
      }));
      return null;
    }
  }, [draftId, draftType, loadFromLocalStorage, decompressData]);

  /**
   * 下書き削除処理
   */
  const deleteDraft = useStableCallback(async (): Promise<void> => {
    try {
      // ローカルストレージから削除
      if (opts.useLocalStorage) {
        localStorage.removeItem(`draft_${draftId}`);
        localStorage.removeItem(`draft_history_${draftId}`);
      }

      // サーバーから削除
      await draftService.clearDraft();

      // 状態をリセット
      currentDataRef.current = null;
      lastSavedDataRef.current = null;
      setSaveState({
        isSaving: false,
        lastSaved: null,
        error: null,
        hasUnsavedChanges: false,
        saveSuccess: false,
      });
    } catch (error) {
      console.error('Failed to delete draft:', error);
      setSaveState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '下書きの削除に失敗しました',
      }));
    }
  }, [draftId, draftType, opts.useLocalStorage]);

  /**
   * 履歴取得処理
   */
  const getDraftHistory = useStableCallback(async (): Promise<DraftData[]> => {
    if (!opts.useLocalStorage) return [];

    try {
      const historyKey = `draft_history_${draftId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      return history;
    } catch (error) {
      console.error('Failed to get draft history:', error);
      return [];
    }
  }, [draftId, opts.useLocalStorage]);

  /**
   * クリーンアップ処理
   */
  useEffect(() => {
    const currentSaveTimeout = saveTimeoutRef.current;
    const currentCompressionWorker = compressionWorkerRef.current;

    return () => {
      if (currentSaveTimeout) {
        clearTimeout(currentSaveTimeout);
      }
      if (currentCompressionWorker) {
        currentCompressionWorker.terminate();
      }
    };
  }, []);

  return {
    // 状態
    saveState,

    // 保存関数
    autoSave,
    manualSave,

    // 復元・削除関数
    restoreDraft,
    deleteDraft,

    // 履歴関数
    getDraftHistory,

    // ユーティリティ
    hasUnsavedChanges: saveState.hasUnsavedChanges,
    isSaving: saveState.isSaving,
    lastSaved: saveState.lastSaved,
    error: saveState.error,
  };
};

/**
 * 簡易圧縮関数（実装例）
 */
async function simpleCompress(data: string): Promise<string> {
  // 実際の実装では、pako や lz-string などの圧縮ライブラリを使用
  // ここでは簡易的な実装
  try {
    const encoder = new TextEncoder();
    // const decoder = new TextDecoder(); // 将来使用予定
    const compressed = encoder.encode(data);
    return btoa(String.fromCharCode(...compressed));
  } catch (error) {
    return data; // 圧縮失敗時は元データを返す
  }
}

/**
 * 簡易展開関数（実装例）
 */
async function simpleDecompress(compressedData: string): Promise<string> {
  try {
    const binaryString = atob(compressedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (error) {
    return compressedData; // 展開失敗時は元データを返す
  }
}
