/**
 * 下書き保存API統合サービス
 *
 * サブ目標・アクションの下書き保存、復元、自動保存機能を提供
 */

import { subGoalApiService } from './subgoal-api';
import { actionApiService } from './action-api';
import type { SubGoal, Action } from '../types/mandala';

/**
 * 下書きデータの型定義
 */
export interface SubGoalDraftData {
  goalId: string;
  subGoals: Partial<SubGoal>[];
  savedAt: string;
  version: number;
}

export interface ActionDraftData {
  goalId: string;
  actions: Partial<Action>[];
  savedAt: string;
  version: number;
}

/**
 * 自動保存設定
 */
export interface AutoSaveConfig {
  enabled: boolean;
  intervalMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * 差分検出結果
 */
export interface DraftDiff {
  hasChanges: boolean;
  changedFields: string[];
  addedItems: number;
  removedItems: number;
  modifiedItems: number;
}

/**
 * 下書き保存APIクライアント
 */
export class DraftApiClient {
  private static readonly CURRENT_VERSION = 1;
  private static readonly DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
    enabled: true,
    intervalMs: 30000, // 30秒
    maxRetries: 3,
    retryDelayMs: 1000, // 1秒
  };

  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastSavedData: Map<string, unknown> = new Map();
  private autoSaveConfig: AutoSaveConfig = DraftApiClient.DEFAULT_AUTO_SAVE_CONFIG;

  /**
   * サブ目標の下書きを保存
   */
  async saveSubGoalDraft(goalId: string, subGoals: Partial<SubGoal>[]): Promise<void> {
    try {
      const response = await subGoalApiService.saveDraft(goalId, subGoals);

      if (!response.success) {
        throw new Error('下書きの保存に失敗しました');
      }

      // ローカルキャッシュを更新
      this.lastSavedData.set(`subgoals-${goalId}`, subGoals);

      console.log('サブ目標の下書きを保存しました:', response.draftId);
    } catch (error) {
      console.error('サブ目標の下書き保存に失敗:', error);
      throw new Error('サブ目標の下書き保存に失敗しました');
    }
  }

  /**
   * サブ目標の下書きを取得
   */
  async getSubGoalDraft(goalId: string): Promise<Partial<SubGoal>[] | null> {
    try {
      const response = await subGoalApiService.getDraft(goalId);

      if (!response.success || !response.draftData) {
        return null;
      }

      // ローカルキャッシュを更新
      this.lastSavedData.set(`subgoals-${goalId}`, response.draftData);

      return response.draftData;
    } catch (error) {
      console.error('サブ目標の下書き取得に失敗:', error);
      return null;
    }
  }

  /**
   * アクションの下書きを保存
   */
  async saveActionDraft(goalId: string, actions: Partial<Action>[]): Promise<void> {
    try {
      const response = await actionApiService.saveDraft(goalId, actions);

      if (!response.success) {
        throw new Error('下書きの保存に失敗しました');
      }

      // ローカルキャッシュを更新
      this.lastSavedData.set(`actions-${goalId}`, actions);

      console.log('アクションの下書きを保存しました:', response.draftId);
    } catch (error) {
      console.error('アクションの下書き保存に失敗:', error);
      throw new Error('アクションの下書き保存に失敗しました');
    }
  }

  /**
   * アクションの下書きを取得
   */
  async getActionDraft(goalId: string): Promise<Partial<Action>[] | null> {
    try {
      const response = await actionApiService.getDraft(goalId);

      if (!response.success || !response.draftData) {
        return null;
      }

      // ローカルキャッシュを更新
      this.lastSavedData.set(`actions-${goalId}`, response.draftData);

      return response.draftData;
    } catch (error) {
      console.error('アクションの下書き取得に失敗:', error);
      return null;
    }
  }

  /**
   * 自動保存を開始
   */
  startAutoSave(
    goalId: string,
    type: 'subgoals' | 'actions',
    getData: () => Partial<SubGoal>[] | Partial<Action>[],
    config?: Partial<AutoSaveConfig>
  ): void {
    if (!this.autoSaveConfig.enabled) {
      return;
    }

    const mergedConfig = { ...this.autoSaveConfig, ...config };
    const key = `${type}-${goalId}`;

    // 既存のタイマーをクリア
    this.stopAutoSave(goalId, type);

    const timer = setInterval(async () => {
      try {
        const currentData = getData();

        // 差分をチェック
        const diff = this.detectChanges(key, currentData);
        if (!diff.hasChanges) {
          return;
        }

        // 自動保存を実行
        if (type === 'subgoals') {
          await this.saveSubGoalDraft(goalId, currentData as Partial<SubGoal>[]);
        } else {
          await this.saveActionDraft(goalId, currentData as Partial<Action>[]);
        }
      } catch (error) {
        console.error('自動保存に失敗:', error);
        // エラーが発生してもタイマーは継続
      }
    }, mergedConfig.intervalMs);

    this.autoSaveTimers.set(key, timer);
  }

  /**
   * 自動保存を停止
   */
  stopAutoSave(goalId: string, type: 'subgoals' | 'actions'): void {
    const key = `${type}-${goalId}`;
    const timer = this.autoSaveTimers.get(key);

    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(key);
    }
  }

  /**
   * 全ての自動保存を停止
   */
  stopAllAutoSave(): void {
    this.autoSaveTimers.forEach(timer => clearInterval(timer));
    this.autoSaveTimers.clear();
  }

  /**
   * 差分を検出
   */
  detectChanges(key: string, currentData: unknown): DraftDiff {
    const lastData = this.lastSavedData.get(key);

    if (!lastData) {
      return {
        hasChanges: true,
        changedFields: ['all'],
        addedItems: Array.isArray(currentData) ? currentData.length : 1,
        removedItems: 0,
        modifiedItems: 0,
      };
    }

    // 簡単な差分検出（JSON文字列比較）
    const currentJson = JSON.stringify(currentData);
    const lastJson = JSON.stringify(lastData);

    if (currentJson === lastJson) {
      return {
        hasChanges: false,
        changedFields: [],
        addedItems: 0,
        removedItems: 0,
        modifiedItems: 0,
      };
    }

    // より詳細な差分検出（配列の場合）
    if (Array.isArray(currentData) && Array.isArray(lastData)) {
      const addedItems = Math.max(0, currentData.length - lastData.length);
      const removedItems = Math.max(0, lastData.length - currentData.length);
      const modifiedItems = Math.min(currentData.length, lastData.length);

      return {
        hasChanges: true,
        changedFields: ['items'],
        addedItems,
        removedItems,
        modifiedItems,
      };
    }

    return {
      hasChanges: true,
      changedFields: ['data'],
      addedItems: 0,
      removedItems: 0,
      modifiedItems: 1,
    };
  }

  /**
   * 自動保存設定を更新
   */
  updateAutoSaveConfig(config: Partial<AutoSaveConfig>): void {
    this.autoSaveConfig = { ...this.autoSaveConfig, ...config };
  }

  /**
   * 下書きが存在するかチェック
   */
  async hasDraft(goalId: string, type: 'subgoals' | 'actions'): Promise<boolean> {
    try {
      if (type === 'subgoals') {
        const draft = await this.getSubGoalDraft(goalId);
        return draft !== null && draft.length > 0;
      } else {
        const draft = await this.getActionDraft(goalId);
        return draft !== null && draft.length > 0;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 下書きを削除
   */
  async deleteDraft(goalId: string, type: 'subgoals' | 'actions'): Promise<void> {
    try {
      if (type === 'subgoals') {
        await subGoalApiService.deleteDraft(goalId);
      } else {
        await actionApiService.deleteDraft(goalId);
      }

      // ローカルキャッシュからも削除
      const key = `${type}-${goalId}`;
      this.lastSavedData.delete(key);

      console.log(`${type}の下書きを削除しました`);
    } catch (error) {
      console.error('下書きの削除に失敗:', error);
      throw new Error('下書きの削除に失敗しました');
    }
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup(): void {
    this.stopAllAutoSave();
    this.lastSavedData.clear();
  }
}

/**
 * デフォルトの下書きAPIクライアントインスタンス
 */
export const draftApiClient = new DraftApiClient();

/**
 * 下書き保存ユーティリティ関数
 */
export const draftApiUtils = {
  /**
   * データが保存する価値があるかチェック
   */
  isWorthSaving(data: Partial<SubGoal>[] | Partial<Action>[]): boolean {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    return data.some(item => {
      const hasTitle = item.title && item.title.trim().length > 0;
      const hasDescription = item.description && item.description.trim().length > 0;
      const hasBackground = item.background && item.background.trim().length > 0;

      return hasTitle || hasDescription || hasBackground;
    });
  },

  /**
   * 下書きデータの概要を取得
   */
  getDraftSummary(data: Partial<SubGoal>[] | Partial<Action>[]): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '空の下書き';
    }

    const filledItems = data.filter(
      item => (item.title && item.title.trim()) || (item.description && item.description.trim())
    );

    if (filledItems.length === 0) {
      return '未入力の下書き';
    }

    const firstItem = filledItems[0];
    const title = firstItem.title?.trim() || firstItem.description?.trim() || '';

    if (title.length > 30) {
      return `${title.substring(0, 30)}... 他${data.length - 1}件`;
    }

    return `${title} 他${data.length - 1}件`;
  },

  /**
   * 下書きの完成度を計算
   */
  calculateCompleteness(data: Partial<SubGoal>[] | Partial<Action>[]): number {
    if (!Array.isArray(data) || data.length === 0) {
      return 0;
    }

    const totalFields = data.length * 3; // title, description, background
    let filledFields = 0;

    data.forEach(item => {
      if (item.title && item.title.trim()) filledFields++;
      if (item.description && item.description.trim()) filledFields++;
      if (item.background && item.background.trim()) filledFields++;
    });

    return Math.round((filledFields / totalFields) * 100);
  },
};

export default draftApiClient;
