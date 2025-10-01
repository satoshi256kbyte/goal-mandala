import { PartialGoalFormData } from '../schemas/goal-form';

/**
 * 下書きデータの保存先キー
 */
const DRAFT_STORAGE_KEY = 'goal-form-draft';

/**
 * 下書きデータの型
 */
export interface DraftData {
  /** フォームデータ */
  formData: PartialGoalFormData;
  /** 保存日時 */
  savedAt: string;
  /** バージョン（将来の互換性のため） */
  version: number;
}

/**
 * 下書きサービスのエラー
 */
export class DraftServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'DraftServiceError';
  }
}

/**
 * 下書きデータ管理サービス
 */
export class DraftService {
  private static readonly CURRENT_VERSION = 1;

  /**
   * 下書きデータを保存
   */
  static async saveDraft(formData: PartialGoalFormData): Promise<void> {
    try {
      const draftData: DraftData = {
        formData,
        savedAt: new Date().toISOString(),
        version: this.CURRENT_VERSION,
      };

      const serializedData = JSON.stringify(draftData);
      localStorage.setItem(DRAFT_STORAGE_KEY, serializedData);
    } catch (error) {
      throw new DraftServiceError('下書きの保存に失敗しました', 'SAVE_FAILED');
    }
  }

  /**
   * 下書きデータを取得
   */
  static async loadDraft(): Promise<DraftData | null> {
    try {
      const serializedData = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!serializedData) {
        return null;
      }

      const draftData = JSON.parse(serializedData) as DraftData;

      // バージョンチェック
      if (draftData.version !== this.CURRENT_VERSION) {
        console.warn('下書きデータのバージョンが古いため、削除します');
        await this.clearDraft();
        return null;
      }

      return draftData;
    } catch (error) {
      console.error('下書きデータの読み込みに失敗しました:', error);
      // 破損したデータを削除
      await this.clearDraft();
      return null;
    }
  }

  /**
   * 下書きデータを削除
   */
  static async clearDraft(): Promise<void> {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      throw new DraftServiceError('下書きの削除に失敗しました', 'CLEAR_FAILED');
    }
  }

  /**
   * 下書きが存在するかチェック
   */
  static async hasDraft(): Promise<boolean> {
    try {
      const draftData = await this.loadDraft();
      return draftData !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 下書きデータが空かどうかチェック
   */
  static isDraftEmpty(formData: PartialGoalFormData): boolean {
    const values = Object.values(formData);
    return values.every(value => !value || value.trim() === '');
  }

  /**
   * 下書きデータの保存日時を取得
   */
  static async getDraftSavedAt(): Promise<Date | null> {
    try {
      const draftData = await this.loadDraft();
      return draftData ? new Date(draftData.savedAt) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * LocalStorageが利用可能かチェック
   */
  static isStorageAvailable(): boolean {
    try {
      const testKey = '__draft_service_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * 下書き保存のユーティリティ関数
 */
export const draftUtils = {
  /**
   * フォームデータが保存する価値があるかチェック
   */
  isWorthSaving(formData: PartialGoalFormData): boolean {
    // 少なくとも1つのフィールドに意味のあるデータが入力されている
    const hasTitle = formData.title && formData.title.trim().length > 0;
    const hasDescription = formData.description && formData.description.trim().length > 0;
    const hasBackground = formData.background && formData.background.trim().length > 0;
    const hasDeadline = formData.deadline && formData.deadline.trim().length > 0;
    const hasConstraints = formData.constraints && formData.constraints.trim().length > 0;

    return hasTitle || hasDescription || hasBackground || hasDeadline || hasConstraints;
  },

  /**
   * 下書きデータの概要を取得（表示用）
   */
  getDraftSummary(formData: PartialGoalFormData): string {
    if (formData.title && formData.title.trim()) {
      return formData.title.trim();
    }

    if (formData.description && formData.description.trim()) {
      const description = formData.description.trim();
      return description.length > 30 ? `${description.substring(0, 30)}...` : description;
    }

    return '無題の下書き';
  },

  /**
   * 下書きの保存からの経過時間を取得
   */
  getTimeSinceSave(savedAt: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - savedAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}日前`;
    } else if (diffHours > 0) {
      return `${diffHours}時間前`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}分前`;
    } else {
      return 'たった今';
    }
  },
};
