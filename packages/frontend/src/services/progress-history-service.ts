/**
 * 進捗履歴サービス
 * 進捗履歴データの管理、取得、分析機能を提供
 * 要件: 5.1, 5.5
 */

export interface ProgressHistoryEntry {
  id: string;
  entityId: string;
  entityType: 'goal' | 'subgoal' | 'action' | 'task';
  progress: number;
  timestamp: Date;
  changeReason?: string;
}

export interface ProgressHistoryQuery {
  entityId: string;
  entityType: string;
  startDate: Date;
  endDate: Date;
  granularity?: 'day' | 'week' | 'month';
}

export interface ProgressTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number; // 変化率（%/日）
  confidence: number; // 信頼度（0-1）
}

export interface SignificantChange {
  date: Date;
  progress: number;
  change: number;
  reason?: string;
}

/**
 * 進捗履歴サービスのインターフェース
 */
export interface ProgressHistoryService {
  /**
   * 進捗履歴を記録する
   */
  recordProgress(entry: Omit<ProgressHistoryEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * 進捗履歴を取得する
   */
  getProgressHistory(query: ProgressHistoryQuery): Promise<ProgressHistoryEntry[]>;

  /**
   * 進捗トレンドを分析する
   */
  getProgressTrend(entityId: string, days: number): Promise<ProgressTrend>;

  /**
   * 重要な変化点を取得する
   */
  getSignificantChanges(entityId: string, threshold: number): Promise<SignificantChange[]>;

  /**
   * 履歴データをクリーンアップする（30日間保持）
   */
  cleanupOldHistory(): Promise<void>;
}

/**
 * 進捗履歴サービスの実装
 */
export class ProgressHistoryServiceImpl implements ProgressHistoryService {
  private readonly API_BASE_URL = '/api/progress-history';
  private readonly MAX_HISTORY_DAYS = 30; // 30日間保持

  /**
   * 進捗履歴を記録する（進捗変更時の自動記録）
   */
  async recordProgress(entry: Omit<ProgressHistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to record progress: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error recording progress history:', error);
      throw error;
    }
  }

  /**
   * 進捗履歴を取得する
   */
  async getProgressHistory(query: ProgressHistoryQuery): Promise<ProgressHistoryEntry[]> {
    try {
      const params = new URLSearchParams({
        entityId: query.entityId,
        entityType: query.entityType,
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
        ...(query.granularity && { granularity: query.granularity }),
      });

      const response = await fetch(`${this.API_BASE_URL}?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch progress history: ${response.statusText}`);
      }

      const data = await response.json();
      return data.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    } catch (error) {
      console.error('Error fetching progress history:', error);
      return [];
    }
  }

  /**
   * 進捗トレンドを分析する（増加・減少・安定の判定）
   */
  async getProgressTrend(entityId: string, days: number): Promise<ProgressTrend> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const history = await this.getProgressHistory({
        entityId,
        entityType: 'goal', // デフォルトで目標を指定
        startDate,
        endDate,
      });

      if (history.length < 2) {
        return { direction: 'stable', rate: 0, confidence: 0 };
      }

      // 線形回帰で傾向を計算
      const trend = this.calculateLinearRegression(history);

      return {
        direction: this.determineTrendDirection(trend.slope),
        rate: Math.abs(trend.slope),
        confidence: Math.min(history.length / 10, 1), // データ点数に基づく信頼度
      };
    } catch (error) {
      console.error('Error calculating progress trend:', error);
      return { direction: 'stable', rate: 0, confidence: 0 };
    }
  }

  /**
   * 重要な変化点を自動検出する
   */
  async getSignificantChanges(
    entityId: string,
    threshold: number = 10
  ): Promise<SignificantChange[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);

      const history = await this.getProgressHistory({
        entityId,
        entityType: 'goal',
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
    } catch (error) {
      console.error('Error getting significant changes:', error);
      return [];
    }
  }

  /**
   * 古い履歴データをクリーンアップする（30日間保持）
   */
  async cleanupOldHistory(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - this.MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);

      const response = await fetch(`${this.API_BASE_URL}/cleanup`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cutoffDate: cutoffDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to cleanup old history: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error cleaning up old history:', error);
      // クリーンアップエラーは処理を継続
    }
  }

  /**
   * 線形回帰を計算する
   */
  private calculateLinearRegression(history: ProgressHistoryEntry[]): {
    slope: number;
    intercept: number;
  } {
    const n = history.length;
    const sumX = history.reduce((sum, _, index) => sum + index, 0);
    const sumY = history.reduce((sum, entry) => sum + entry.progress, 0);
    const sumXY = history.reduce((sum, entry, index) => sum + index * entry.progress, 0);
    const sumXX = history.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * トレンドの方向を判定する
   */
  private determineTrendDirection(slope: number): 'increasing' | 'decreasing' | 'stable' {
    if (Math.abs(slope) < 0.1) {
      return 'stable';
    } else if (slope > 0) {
      return 'increasing';
    } else {
      return 'decreasing';
    }
  }
}

/**
 * インメモリ進捗履歴サービス（テスト用）
 */
export class InMemoryProgressHistoryService implements ProgressHistoryService {
  private history: Map<string, ProgressHistoryEntry[]> = new Map();

  async recordProgress(entry: Omit<ProgressHistoryEntry, 'id' | 'timestamp'>): Promise<void> {
    const key = `${entry.entityType}:${entry.entityId}`;
    const historyList = this.history.get(key) || [];

    const newEntry: ProgressHistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    historyList.push(newEntry);
    this.history.set(key, historyList);
  }

  async getProgressHistory(query: ProgressHistoryQuery): Promise<ProgressHistoryEntry[]> {
    const key = `${query.entityType}:${query.entityId}`;
    const historyList = this.history.get(key) || [];

    return historyList.filter(
      entry => entry.timestamp >= query.startDate && entry.timestamp <= query.endDate
    );
  }

  async getProgressTrend(entityId: string, days: number): Promise<ProgressTrend> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const history = await this.getProgressHistory({
      entityId,
      entityType: 'goal',
      startDate,
      endDate,
    });

    if (history.length < 2) {
      return { direction: 'stable', rate: 0, confidence: 0 };
    }

    // 簡単な傾向計算
    const firstProgress = history[0].progress;
    const lastProgress = history[history.length - 1].progress;
    const change = lastProgress - firstProgress;
    const rate = Math.abs(change) / days;

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(change) < 5) {
      direction = 'stable';
    } else if (change > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return {
      direction,
      rate,
      confidence: Math.min(history.length / 10, 1),
    };
  }

  async getSignificantChanges(
    entityId: string,
    threshold: number = 10
  ): Promise<SignificantChange[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const history = await this.getProgressHistory({
      entityId,
      entityType: 'goal',
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

  async cleanupOldHistory(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const [key, historyList] of this.history.entries()) {
      const filteredHistory = historyList.filter(entry => entry.timestamp >= cutoffDate);
      this.history.set(key, filteredHistory);
    }
  }

  /**
   * テスト用：データをクリアする
   */
  clear(): void {
    this.history.clear();
  }

  /**
   * テスト用：保存されているデータを取得する
   */
  getAllData(): Map<string, ProgressHistoryEntry[]> {
    return new Map(this.history);
  }
}

// シングルトンインスタンスをエクスポート
export const progressHistoryService = new ProgressHistoryServiceImpl();
