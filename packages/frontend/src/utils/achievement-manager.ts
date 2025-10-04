/**
 * 達成アニメーション管理ユーティリティ
 * 要件4.3に対応：複数要素の同時達成時のアニメーション調整
 */

import {
  globalAnimationController,
  createStaggeredAnimation,
  ACHIEVEMENT_KEYFRAMES,
} from './animation-utils';

/**
 * 達成イベントの型定義
 */
export interface AchievementEvent {
  id: string;
  type: 'task' | 'action' | 'subgoal' | 'goal';
  element: HTMLElement;
  timestamp: number;
  progress: number;
}

/**
 * 達成アニメーション設定
 */
export interface AchievementAnimationConfig {
  /** アニメーションの種類 */
  type: 'single' | 'pulse' | 'glow' | 'bounce';
  /** アニメーション強度 */
  intensity: 'subtle' | 'normal' | 'strong';
  /** 継続時間（ミリ秒） */
  duration: number;
  /** 遅延時間（ミリ秒） */
  delay?: number;
  /** カスタムキーフレーム */
  customKeyframes?: Keyframe[];
}

/**
 * 達成アニメーション管理クラス
 */
export class AchievementManager {
  private pendingAchievements: Map<string, AchievementEvent> = new Map();
  private animationQueue: AchievementEvent[] = [];
  private isProcessing = false;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 500; // 500ms以内の達成をバッチ処理

  /**
   * 達成イベントを登録する
   */
  registerAchievement(event: AchievementEvent): void {
    this.pendingAchievements.set(event.id, event);
    this.scheduleProcessing();
  }

  /**
   * 達成イベントの処理をスケジュールする
   */
  private scheduleProcessing(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processPendingAchievements();
    }, this.BATCH_DELAY);
  }

  /**
   * 保留中の達成イベントを処理する
   */
  private processPendingAchievements(): void {
    if (this.isProcessing || this.pendingAchievements.size === 0) {
      return;
    }

    this.isProcessing = true;
    const achievements = Array.from(this.pendingAchievements.values());
    this.pendingAchievements.clear();

    // 達成の種類別にグループ化
    const groupedAchievements = this.groupAchievementsByType(achievements);

    // 各グループを処理
    Object.entries(groupedAchievements).forEach(([type, events]) => {
      this.processAchievementGroup(type as AchievementEvent['type'], events);
    });

    this.isProcessing = false;
  }

  /**
   * 達成イベントを種類別にグループ化する
   */
  private groupAchievementsByType(
    achievements: AchievementEvent[]
  ): Record<string, AchievementEvent[]> {
    return achievements.reduce(
      (groups, achievement) => {
        const key = achievement.type;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(achievement);
        return groups;
      },
      {} as Record<string, AchievementEvent[]>
    );
  }

  /**
   * 達成グループを処理する
   */
  private processAchievementGroup(
    type: AchievementEvent['type'],
    events: AchievementEvent[]
  ): void {
    if (events.length === 1) {
      // 単一の達成
      this.playSingleAchievementAnimation(events[0]);
    } else {
      // 複数の同時達成
      this.playMultipleAchievementAnimation(events);
    }
  }

  /**
   * 単一の達成アニメーションを再生する
   */
  private playSingleAchievementAnimation(event: AchievementEvent): void {
    const config = this.getAnimationConfigForType(event.type);
    const keyframes = config.customKeyframes || ACHIEVEMENT_KEYFRAMES;

    globalAnimationController.startAnimation(
      event.element,
      keyframes,
      {
        duration: config.duration,
        easing: 'ease-out',
        fill: 'forwards',
      },
      `achievement-${event.id}`
    );
  }

  /**
   * 複数の同時達成アニメーションを再生する
   */
  private playMultipleAchievementAnimation(events: AchievementEvent[]): void {
    // 重要度順にソート（goal > subgoal > action > task）
    const sortedEvents = this.sortEventsByImportance(events);

    // スタガードアニメーションの遅延時間を計算
    const staggerDelay = this.calculateStaggerDelay(sortedEvents.length);

    const elements = sortedEvents.map(event => event.element);
    const keyframes = this.getMultipleAchievementKeyframes();

    createStaggeredAnimation(
      elements,
      keyframes,
      {
        duration: 800, // 複数達成時は少し長めに
        easing: 'ease-out',
        fill: 'forwards',
      },
      staggerDelay
    );

    // 特別な効果音やビジュアル効果をトリガー（将来の拡張用）
    this.triggerSpecialEffects(sortedEvents);
  }

  /**
   * イベントを重要度順にソートする
   */
  private sortEventsByImportance(events: AchievementEvent[]): AchievementEvent[] {
    const importanceOrder = { goal: 4, subgoal: 3, action: 2, task: 1 };

    return events.sort((a, b) => {
      const importanceA = importanceOrder[a.type];
      const importanceB = importanceOrder[b.type];

      if (importanceA !== importanceB) {
        return importanceB - importanceA; // 重要度の高い順
      }

      return a.timestamp - b.timestamp; // 同じ重要度なら時系列順
    });
  }

  /**
   * スタガード遅延時間を計算する
   */
  private calculateStaggerDelay(count: number): number {
    // 要素数に応じて遅延時間を調整
    if (count <= 2) return 100;
    if (count <= 4) return 150;
    if (count <= 8) return 200;
    return 250;
  }

  /**
   * 達成タイプに応じたアニメーション設定を取得する
   */
  private getAnimationConfigForType(type: AchievementEvent['type']): AchievementAnimationConfig {
    const configs: Record<AchievementEvent['type'], AchievementAnimationConfig> = {
      task: {
        type: 'pulse',
        intensity: 'subtle',
        duration: 400,
      },
      action: {
        type: 'glow',
        intensity: 'normal',
        duration: 500,
      },
      subgoal: {
        type: 'bounce',
        intensity: 'normal',
        duration: 600,
      },
      goal: {
        type: 'single',
        intensity: 'strong',
        duration: 800,
      },
    };

    return configs[type];
  }

  /**
   * 複数達成用のキーフレームを取得する
   */
  private getMultipleAchievementKeyframes(): Keyframe[] {
    return [
      {
        transform: 'scale(1)',
        boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)',
        filter: 'brightness(1)',
        offset: 0,
      },
      {
        transform: 'scale(1.1)',
        boxShadow: '0 0 25px 12px rgba(34, 197, 94, 0.5)',
        filter: 'brightness(1.3)',
        offset: 0.3,
      },
      {
        transform: 'scale(0.95)',
        boxShadow: '0 0 15px 8px rgba(34, 197, 94, 0.3)',
        filter: 'brightness(1.1)',
        offset: 0.6,
      },
      {
        transform: 'scale(1)',
        boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
        filter: 'brightness(1)',
        offset: 1,
      },
    ];
  }

  /**
   * 特別な効果をトリガーする
   */
  private triggerSpecialEffects(events: AchievementEvent[]): void {
    // 複数の目標達成時の特別な効果
    const goalAchievements = events.filter(e => e.type === 'goal');
    if (goalAchievements.length > 0) {
      this.triggerGoalAchievementEffect();
    }

    // 多数の同時達成時の特別な効果
    if (events.length >= 5) {
      this.triggerMassAchievementEffect();
    }
  }

  /**
   * 目標達成時の特別な効果
   */
  private triggerGoalAchievementEffect(): void {
    // 画面全体にエフェクトを適用（将来の実装）
    console.log('🎉 Goal Achievement Effect Triggered!');
  }

  /**
   * 大量達成時の特別な効果
   */
  private triggerMassAchievementEffect(): void {
    // 連鎖的なエフェクトを適用（将来の実装）
    console.log('✨ Mass Achievement Effect Triggered!');
  }

  /**
   * すべての保留中の達成をクリアする
   */
  clearPendingAchievements(): void {
    this.pendingAchievements.clear();
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  /**
   * 現在の保留中の達成数を取得する
   */
  getPendingAchievementCount(): number {
    return this.pendingAchievements.size;
  }

  /**
   * 特定の達成を取り消す
   */
  cancelAchievement(id: string): void {
    this.pendingAchievements.delete(id);
    globalAnimationController.cancelAnimation(`achievement-${id}`);
  }
}

/**
 * グローバル達成マネージャーインスタンス
 */
export const globalAchievementManager = new AchievementManager();

/**
 * 達成アニメーションのカスタマイズ設定
 */
export interface AchievementCustomization {
  /** 色のカスタマイズ */
  colors?: {
    primary?: string;
    secondary?: string;
    glow?: string;
  };
  /** サウンド設定 */
  sound?: {
    enabled: boolean;
    volume: number;
    customSounds?: Record<AchievementEvent['type'], string>;
  };
  /** 振動設定（モバイル対応） */
  vibration?: {
    enabled: boolean;
    pattern: number[];
  };
}

/**
 * 達成アニメーションをカスタマイズする
 */
export const customizeAchievementAnimation = (customization: AchievementCustomization): void => {
  // カスタマイズ設定をグローバルに適用（将来の実装）
  console.log('Achievement animation customized:', customization);
};
