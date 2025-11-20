/**
 * 達成アニメーション用のカスタムフック
 * 要件4.2, 4.3に対応
 */

import { useEffect, useRef } from 'react';
import { useAnimationSettings } from '../contexts/AnimationSettingsContext';
import {
  globalAchievementManager,
  AchievementEvent,
  AchievementCustomization,
} from '../utils/achievement-manager';

/**
 * 達成アニメーションフックのオプション
 */
export interface UseAchievementAnimationOptions {
  /** 要素のタイプ */
  type: 'task' | 'action' | 'subgoal' | 'goal';
  /** 一意のID */
  id: string;
  /** 進捗値 */
  progress: number;
  /** 達成時のコールバック */
  onAchievement?: (event: AchievementEvent) => void;
  /** アニメーションのカスタマイズ */
  customization?: AchievementCustomization;
  /** アニメーション無効化 */
  disabled?: boolean;
}

/**
 * 達成アニメーションフックの戻り値
 */
export interface UseAchievementAnimationReturn {
  /** 要素のref */
  elementRef: React.RefObject<HTMLDivElement>;
  /** 手動で達成アニメーションをトリガーする関数 */
  triggerAchievement: () => void;
  /** 達成アニメーションをキャンセルする関数 */
  cancelAchievement: () => void;
  /** 現在アニメーション中かどうか */
  isAnimating: boolean;
}

/**
 * 達成アニメーション用のカスタムフック
 *
 * 進捗が100%に達した時に自動的に達成アニメーションを実行する
 */
export const useAchievementAnimation = (
  options: UseAchievementAnimationOptions
): UseAchievementAnimationReturn => {
  const { type, id, progress, onAchievement, customization, disabled = false } = options;
  const { isAnimationEnabled, settings } = useAnimationSettings();

  const elementRef = useRef<HTMLDivElement>(null);
  const previousProgressRef = useRef<number | null>(null);
  const isAnimatingRef = useRef<boolean>(false);

  // 達成アニメーションをトリガーする関数
  const triggerAchievement = useCallback(() => {
    if (disabled || !isAnimationEnabled || !settings.achievementEnabled) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    const achievementEvent: AchievementEvent = {
      id,
      type,
      element,
      timestamp: Date.now(),
      progress,
    };

    // グローバル達成マネージャーに登録
    globalAchievementManager.registerAchievement(achievementEvent);

    // アニメーション状態を更新
    isAnimatingRef.current = true;

    // コールバックを実行
    if (onAchievement) {
      onAchievement(achievementEvent);
    }

    // アニメーション終了後にフラグをリセット
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, settings.achievementDuration);
  }, [
    disabled,
    isAnimationEnabled,
    settings.achievementEnabled,
    settings.achievementDuration,
    id,
    type,
    progress,
    onAchievement,
  ]);

  // 達成アニメーションをキャンセルする関数
  const cancelAchievement = useCallback(() => {
    globalAchievementManager.cancelAchievement(id);
    isAnimatingRef.current = false;
  }, [id]);

  // 進捗変化の監視
  useEffect(() => {
    const previousProgress = previousProgressRef.current;
    const currentProgress = progress;

    // 100%達成時の自動トリガー
    if ((previousProgress === null || previousProgress < 100) && currentProgress === 100) {
      triggerAchievement();
    }

    previousProgressRef.current = currentProgress;
  }, [progress, triggerAchievement]);

  // カスタマイズ設定の適用
  useEffect(() => {
    if (customization) {
      // カスタマイズ設定をグローバルに適用（将来の実装）
      console.log('Applying achievement customization:', customization);
    }
  }, [customization]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      cancelAchievement();
    };
  }, [cancelAchievement]);

  return {
    elementRef,
    triggerAchievement,
    cancelAchievement,
    isAnimating: isAnimatingRef.current,
  };
};

/**
 * 複数要素の達成アニメーション用のフック
 */
export interface UseMultipleAchievementAnimationOptions {
  /** 要素の配列 */
  elements: Array<{
    type: 'task' | 'action' | 'subgoal' | 'goal';
    id: string;
    progress: number;
  }>;
  /** 達成時のコールバック */
  onAchievement?: (events: AchievementEvent[]) => void;
  /** アニメーション無効化 */
  disabled?: boolean;
}

export const useMultipleAchievementAnimation = (
  options: UseMultipleAchievementAnimationOptions
) => {
  const { elements, onAchievement, disabled = false } = options;
  const { isAnimationEnabled, settings } = useAnimationSettings();

  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());
  const previousProgressesRef = useRef<Map<string, number>>(new Map());

  // 要素のrefを登録する関数
  const registerElement = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      elementRefs.current.set(id, element);
    } else {
      elementRefs.current.delete(id);
    }
  }, []);

  // 複数達成をトリガーする関数
  const triggerMultipleAchievements = useCallback(
    (achievedElements: typeof elements) => {
      if (disabled || !isAnimationEnabled || !settings.achievementEnabled) {
        return;
      }

      const achievementEvents: AchievementEvent[] = achievedElements.map(element => {
        const htmlElement = elementRefs.current.get(element.id);
        if (!htmlElement) {
          throw new Error(`Element with id ${element.id} not found`);
        }

        return {
          id: element.id,
          type: element.type,
          element: htmlElement,
          timestamp: Date.now(),
          progress: element.progress,
        };
      });

      // 各達成イベントをグローバルマネージャーに登録
      achievementEvents.forEach(event => {
        globalAchievementManager.registerAchievement(event);
      });

      // コールバックを実行
      if (onAchievement) {
        onAchievement(achievementEvents);
      }
    },
    [disabled, isAnimationEnabled, settings.achievementEnabled, onAchievement]
  );

  // 進捗変化の監視
  useEffect(() => {
    const achievedElements = elements.filter(element => {
      const previousProgress = previousProgressesRef.current.get(element.id) || 0;
      const currentProgress = element.progress;

      // 進捗を更新
      previousProgressesRef.current.set(element.id, currentProgress);

      // 100%達成判定
      return previousProgress < 100 && currentProgress === 100;
    });

    if (achievedElements.length > 0) {
      triggerMultipleAchievements(achievedElements);
    }
  }, [elements, triggerMultipleAchievements]);

  return {
    registerElement,
    triggerMultipleAchievements,
  };
};

/**
 * 達成統計情報を取得するフック
 */
export interface AchievementStats {
  /** 総達成数 */
  totalAchievements: number;
  /** タイプ別達成数 */
  achievementsByType: Record<'task' | 'action' | 'subgoal' | 'goal', number>;
  /** 今日の達成数 */
  todayAchievements: number;
  /** 連続達成日数 */
  streakDays: number;
}

export const useAchievementStats = (): AchievementStats => {
  // 実際の実装では、ローカルストレージやAPIから統計情報を取得
  // ここではダミーデータを返す
  return {
    totalAchievements: 0,
    achievementsByType: {
      task: 0,
      action: 0,
      subgoal: 0,
      goal: 0,
    },
    todayAchievements: 0,
    streakDays: 0,
  };
};
