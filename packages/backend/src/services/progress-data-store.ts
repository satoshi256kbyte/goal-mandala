import { PrismaClient } from '../generated/prisma-client';
import { ProgressDataStore } from './progress-calculation';

/**
 * 進捗履歴エントリの型定義
 */
export interface ProgressHistoryEntry {
  id: string;
  entityId: string;
  entityType: 'goal' | 'subgoal' | 'action' | 'task';
  progress: number;
  timestamp: Date;
  changeReason?: string;
}

/**
 * 進捗履歴クエリの型定義
 */
export interface ProgressHistoryQuery {
  entityId: string;
  entityType: string;
  startDate: Date;
  endDate: Date;
  granularity?: 'day' | 'week' | 'month';
}

/**
 * 進捗トレンドの型定義
 */
export interface ProgressTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // 変化率（%/日）
  confidence: number; // 信頼度（0-1）
}

/**
 * 重要な変化点の型定義
 */
export interface SignificantChange {
  date: Date;
  progress: number;
  change: number;
  reason?: string;
}

/**
 * 拡張された進捗データストアのインターフェース
 */
export interface ExtendedProgressDataStore extends ProgressDataStore {
  /**
   * 進捗履歴を記録する（進捗変更時の自動記録）
   */
  recordProgressHistory(entry: Omit<ProgressHistoryEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * 進捗履歴を取得する
   */
  getProgressHistoryEntries(query: ProgressHistoryQuery): Promise<ProgressHistoryEntry[]>;

  /**
   * 進捗トレンドを分析する
   */
  getProgressTrend(entityId: string, entityType: string, days: number): Promise<ProgressTrend>;

  /**
   * 重要な変化点を取得する
   */
  getSignificantChanges(
    entityId: string,
    entityType: string,
    threshold: number
  ): Promise<SignificantChange[]>;

  /**
   * 古い履歴データをクリーンアップする（30日間保持）
   */
  cleanupOldHistory(): Promise<{ deletedCount: number }>;
}

/**
 * Prismaを使用した進捗データストアの実装
 */
export class PrismaProgressDataStore implements ExtendedProgressDataStore {
  private prisma: PrismaClient;
  private readonly MAX_HISTORY_DAYS = 30; // 30日間の履歴を保持（要件に従って変更）
  private lastCleanupTime = 0;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24時間

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 進捗データを保存する
   */
  async saveProgress(entityType: string, entityId: string, progress: number): Promise<void> {
    try {
      // 前回の進捗値を取得して変化があるかチェック
      const previousProgress = await this.getProgress(entityType, entityId);
      const roundedProgress = Math.round(progress);

      // 進捗に変化がある場合のみ履歴を記録
      if (previousProgress === null || Math.abs(roundedProgress - previousProgress) >= 1) {
        await this.recordProgressHistory({
          entityType: entityType as 'goal' | 'subgoal' | 'action' | 'task',
          entityId,
          progress: roundedProgress,
          changeReason: previousProgress === null ? 'Initial progress' : 'Progress updated',
        });
      }

      // 定期的なクリーンアップ
      await this.performPeriodicCleanup();
    } catch (error) {
      console.error(`Failed to save progress for ${entityType}:${entityId}`, error);
      throw error;
    }
  }

  /**
   * 定期的なクリーンアップを実行する
   */
  private async performPeriodicCleanup(): Promise<void> {
    const now = Date.now();

    // 24時間に1回だけクリーンアップを実行
    if (now - this.lastCleanupTime < this.CLEANUP_INTERVAL) {
      return;
    }

    try {
      await this.cleanupOldHistory();
      this.lastCleanupTime = now;
    } catch (error) {
      console.error('Failed to perform periodic cleanup:', error);
      // クリーンアップエラーは処理を継続
    }
  }

  /**
   * 進捗データを取得する
   */
  async getProgress(entityType: string, entityId: string): Promise<number | null> {
    // 現在のスキーマでは進捗履歴テーブルがないため、
    // 実際のエンティティから進捗を取得する

    try {
      switch (entityType) {
        case 'goal': {
          const goal = await this.prisma.goal.findUnique({
            where: { id: entityId },
            select: { progress: true },
          });
          return goal?.progress || null;
        }

        case 'subgoal': {
          const subGoal = await this.prisma.subGoal.findUnique({
            where: { id: entityId },
            select: { progress: true },
          });
          return subGoal?.progress || null;
        }

        case 'action': {
          const action = await this.prisma.action.findUnique({
            where: { id: entityId },
            select: { progress: true },
          });
          return action?.progress || null;
        }

        case 'task': {
          const task = await this.prisma.task.findUnique({
            where: { id: entityId },
            select: { status: true },
          });
          return task?.status === 'COMPLETED' ? 100 : 0;
        }

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error getting progress for ${entityType}:${entityId}`, error);
      return null;
    }
  }

  /**
   * 進捗履歴を取得する
   */
  async getProgressHistory(
    entityType: string,
    entityId: string,
    days: number
  ): Promise<{ date: Date; progress: number }[]> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const history = await this.prisma.progressHistory.findMany({
        where: {
          entityType,
          entityId,
          timestamp: {
            gte: cutoffDate,
          },
        },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true, progress: true },
      });

      return history.map(h => ({ date: h.timestamp, progress: h.progress }));
    } catch (error) {
      console.error(`Error getting progress history for ${entityType}:${entityId}`, error);
      return [];
    }
  }

  /**
   * 進捗履歴を記録する（進捗変更時の自動記録）
   */
  async recordProgressHistory(
    entry: Omit<ProgressHistoryEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    try {
      await this.prisma.progressHistory.create({
        data: {
          entityType: entry.entityType,
          entityId: entry.entityId,
          progress: Math.round(entry.progress),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error(
        `Failed to record progress history for ${entry.entityType}:${entry.entityId}`,
        error
      );
      throw error;
    }
  }

  /**
   * 進捗履歴を取得する
   */
  async getProgressHistoryEntries(query: ProgressHistoryQuery): Promise<ProgressHistoryEntry[]> {
    try {
      const history = await this.prisma.progressHistory.findMany({
        where: {
          entityType: query.entityType,
          entityId: query.entityId,
          timestamp: {
            gte: query.startDate,
            lte: query.endDate,
          },
        },
        orderBy: { timestamp: 'asc' },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          progress: true,
          timestamp: true,
        },
      });

      return history.map(h => ({
        id: h.id,
        entityId: h.entityId,
        entityType: h.entityType as 'goal' | 'subgoal' | 'action' | 'task',
        progress: h.progress,
        timestamp: h.timestamp,
        changeReason: undefined, // 現在のスキーマにはchangeReasonフィールドがない
      }));
    } catch (error) {
      console.error(
        `Error getting progress history entries for ${query.entityType}:${query.entityId}`,
        error
      );
      return [];
    }
  }

  /**
   * 進捗の変化点を取得する（大きな変化があった日をハイライト用）
   */
  async getSignificantProgressChanges(
    entityType: string,
    entityId: string,
    days: number,
    threshold: number = 10
  ): Promise<{ date: Date; progress: number; change: number }[]> {
    try {
      const history = await this.getProgressHistory(entityType, entityId, days);
      const significantChanges: { date: Date; progress: number; change: number }[] = [];

      for (let i = 1; i < history.length; i++) {
        const change = Math.abs(history[i].progress - history[i - 1].progress);
        if (change >= threshold) {
          significantChanges.push({
            date: history[i].date,
            progress: history[i].progress,
            change,
          });
        }
      }

      return significantChanges;
    } catch (error) {
      console.error(
        `Error getting significant progress changes for ${entityType}:${entityId}`,
        error
      );
      return [];
    }
  }

  /**
   * 重要な変化点を取得する（新しいインターフェース）
   */
  async getSignificantChanges(
    entityId: string,
    entityType: string,
    threshold: number = 10
  ): Promise<SignificantChange[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);

      const query: ProgressHistoryQuery = {
        entityId,
        entityType,
        startDate,
        endDate,
      };

      const history = await this.getProgressHistoryEntries(query);
      const significantChanges: SignificantChange[] = [];

      for (let i = 1; i < history.length; i++) {
        const change = Math.abs(history[i].progress - history[i - 1].progress);
        if (change >= threshold) {
          significantChanges.push({
            date: history[i].timestamp,
            progress: history[i].progress,
            change,
            reason: history[i].changeReason,
          });
        }
      }

      return significantChanges;
    } catch (error) {
      console.error(`Error getting significant changes for ${entityType}:${entityId}`, error);
      return [];
    }
  }

  /**
   * 進捗トレンドを分析する（新しいインターフェース）
   */
  async getProgressTrend(
    entityId: string,
    entityType: string,
    days: number
  ): Promise<ProgressTrend> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const query: ProgressHistoryQuery = {
        entityId,
        entityType,
        startDate,
        endDate,
      };

      const history = await this.getProgressHistoryEntries(query);

      if (history.length < 2) {
        return { direction: 'stable', rate: 0, confidence: 0 };
      }

      // 線形回帰で傾向を計算
      const n = history.length;
      const sumX = history.reduce((sum, _, index) => sum + index, 0);
      const sumY = history.reduce((sum, entry) => sum + entry.progress, 0);
      const sumXY = history.reduce((sum, entry, index) => sum + index * entry.progress, 0);
      const sumXX = history.reduce((sum, _, index) => sum + index * index, 0);

      const denominator = n * sumXX - sumX * sumX;
      const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      const confidence = Math.min(n / 10, 1); // データ点数に基づく信頼度

      let direction: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(slope) < 0.1) {
        direction = 'stable';
      } else if (slope > 0) {
        direction = 'increasing';
      } else {
        direction = 'decreasing';
      }

      return {
        direction,
        rate: Math.abs(slope),
        confidence,
      };
    } catch (error) {
      console.error(`Error calculating progress trend for ${entityType}:${entityId}`, error);
      return { direction: 'stable', rate: 0, confidence: 0 };
    }
  }

  /**
   * 古い履歴データをクリーンアップする（30日間保持）
   */
  async cleanupOldHistory(): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date(Date.now() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);

      const result = await this.prisma.progressHistory.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`Cleaned up ${result.count} old progress history entries`);
      return { deletedCount: result.count };
    } catch (error) {
      console.error('Failed to cleanup old progress history:', error);
      throw error;
    }
  }
}

/**
 * インメモリ進捗データストアの実装（テスト用）
 */
export class InMemoryProgressDataStore implements ExtendedProgressDataStore {
  private data: Map<string, { progress: number; timestamp: Date }[]> = new Map();
  private historyData: Map<string, ProgressHistoryEntry[]> = new Map();
  private readonly MAX_HISTORY_DAYS = 30;

  async saveProgress(entityType: string, entityId: string, progress: number): Promise<void> {
    const key = `${entityType}:${entityId}`;
    const history = this.data.get(key) || [];

    // 前回の進捗値を取得して変化があるかチェック
    const previousProgress = history.length > 0 ? history[history.length - 1].progress : null;
    const roundedProgress = Math.round(progress);

    history.push({
      progress: roundedProgress,
      timestamp: new Date(),
    });

    this.data.set(key, history);

    // 進捗に変化がある場合のみ履歴を記録
    if (previousProgress === null || Math.abs(roundedProgress - previousProgress) >= 1) {
      await this.recordProgressHistory({
        entityType: entityType as 'goal' | 'subgoal' | 'action' | 'task',
        entityId,
        progress: roundedProgress,
        changeReason: previousProgress === null ? 'Initial progress' : 'Progress updated',
      });
    }
  }

  async getProgress(entityType: string, entityId: string): Promise<number | null> {
    const key = `${entityType}:${entityId}`;
    const history = this.data.get(key);

    if (!history || history.length === 0) {
      return null;
    }

    // 最新の進捗を返す
    return history[history.length - 1].progress;
  }

  async getProgressHistory(
    entityType: string,
    entityId: string,
    days: number
  ): Promise<{ date: Date; progress: number }[]> {
    const key = `${entityType}:${entityId}`;
    const history = this.data.get(key) || [];

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return history
      .filter(entry => entry.timestamp >= cutoffDate)
      .map(entry => ({ date: entry.timestamp, progress: entry.progress }));
  }

  /**
   * 進捗履歴を記録する（進捗変更時の自動記録）
   */
  async recordProgressHistory(
    entry: Omit<ProgressHistoryEntry, 'id' | 'timestamp'>
  ): Promise<void> {
    const key = `${entry.entityType}:${entry.entityId}`;
    const historyList = this.historyData.get(key) || [];

    const newEntry: ProgressHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    historyList.push(newEntry);
    this.historyData.set(key, historyList);
  }

  /**
   * 進捗履歴を取得する
   */
  async getProgressHistoryEntries(query: ProgressHistoryQuery): Promise<ProgressHistoryEntry[]> {
    const key = `${query.entityType}:${query.entityId}`;
    const historyList = this.historyData.get(key) || [];

    return historyList.filter(
      entry => entry.timestamp >= query.startDate && entry.timestamp <= query.endDate
    );
  }

  /**
   * 進捗トレンドを分析する
   */
  async getProgressTrend(
    entityId: string,
    entityType: string,
    days: number
  ): Promise<ProgressTrend> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const history = await this.getProgressHistoryEntries({
      entityId,
      entityType,
      startDate,
      endDate,
    });

    if (history.length < 2) {
      return { direction: 'stable', rate: 0, confidence: 0 };
    }

    // 線形回帰で傾向を計算
    const n = history.length;
    const sumX = history.reduce((sum, _, index) => sum + index, 0);
    const sumY = history.reduce((sum, entry) => sum + entry.progress, 0);
    const sumXY = history.reduce((sum, entry, index) => sum + index * entry.progress, 0);
    const sumXX = history.reduce((sum, _, index) => sum + index * index, 0);

    const denominator = n * sumXX - sumX * sumX;
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const confidence = Math.min(n / 10, 1); // データ点数に基づく信頼度

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return {
      direction,
      rate: Math.abs(slope),
      confidence,
    };
  }

  /**
   * 重要な変化点を取得する
   */
  async getSignificantChanges(
    entityId: string,
    entityType: string,
    threshold: number = 10
  ): Promise<SignificantChange[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);

    const history = await this.getProgressHistoryEntries({
      entityId,
      entityType,
      startDate,
      endDate,
    });

    const significantChanges: SignificantChange[] = [];

    for (let i = 1; i < history.length; i++) {
      const change = Math.abs(history[i].progress - history[i - 1].progress);
      if (change >= threshold) {
        significantChanges.push({
          date: history[i].timestamp,
          progress: history[i].progress,
          change,
          reason: history[i].changeReason,
        });
      }
    }

    return significantChanges;
  }

  /**
   * 古い履歴データをクリーンアップする（30日間保持）
   */
  async cleanupOldHistory(): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date(Date.now() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    // 通常の進捗データのクリーンアップ
    for (const [key, historyList] of this.data.entries()) {
      const originalLength = historyList.length;
      const filteredHistory = historyList.filter(entry => entry.timestamp >= cutoffDate);
      this.data.set(key, filteredHistory);
      deletedCount += originalLength - filteredHistory.length;
    }

    // 進捗履歴データのクリーンアップ
    for (const [key, historyList] of this.historyData.entries()) {
      const originalLength = historyList.length;
      const filteredHistory = historyList.filter(entry => entry.timestamp >= cutoffDate);
      this.historyData.set(key, filteredHistory);
      deletedCount += originalLength - filteredHistory.length;
    }

    return { deletedCount };
  }

  /**
   * テスト用：データをクリアする
   */
  clear(): void {
    this.data.clear();
    this.historyData.clear();
  }

  /**
   * テスト用：保存されているデータを取得する
   */
  getAllData(): Map<string, { progress: number; timestamp: Date }[]> {
    return new Map(this.data);
  }

  /**
   * テスト用：履歴データを取得する
   */
  getAllHistoryData(): Map<string, ProgressHistoryEntry[]> {
    return new Map(this.historyData);
  }
}
