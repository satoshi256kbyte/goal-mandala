/**
 * アニメーション関連のユーティリティ関数
 * 要件4.1, 4.2, 4.3に対応
 */

import {
  AnimationPerformanceMonitor,
  AnimationInterruptController,
  AdaptiveAnimationQuality,
  AnimationAccessibilityManager,
} from './animation-performance';

// 再エクスポート
export {
  AnimationPerformanceMonitor,
  AnimationInterruptController,
  AdaptiveAnimationQuality,
  AnimationAccessibilityManager,
};

/**
 * アニメーション設定の型定義
 */
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

/**
 * 基本アニメーション設定
 */
export const ANIMATION_CONFIGS = {
  /** 進捗変化アニメーション（0.3秒のスムーズな変化） */
  progressChange: {
    duration: 300,
    easing: 'ease-out',
  },
  /** セル色変化のフェードイン効果（0.3秒のトランジション） */
  colorChange: {
    duration: 300,
    easing: 'ease-in-out',
  },
  /** 達成アニメーション（スケール＋グロー効果） */
  achievement: {
    duration: 600,
    easing: 'ease-out',
  },
  /** 高速アニメーション */
  fast: {
    duration: 150,
    easing: 'ease-out',
  },
  /** 低速アニメーション */
  slow: {
    duration: 500,
    easing: 'ease-in-out',
  },
} as const;

/**
 * CSS トランジションプロパティを生成する
 */
export const createTransition = (properties: string[], config: AnimationConfig): string => {
  return properties
    .map(
      prop =>
        `${prop} ${config.duration}ms ${config.easing}${config.delay ? ` ${config.delay}ms` : ''}`
    )
    .join(', ');
};

/**
 * 進捗変化用のトランジションスタイルを生成する
 */
export const createProgressTransition = (
  duration: number = ANIMATION_CONFIGS.progressChange.duration,
  easing: string = ANIMATION_CONFIGS.progressChange.easing
): React.CSSProperties => {
  return {
    transition: `width ${duration}ms ${easing}`,
  };
};

/**
 * 色変化用のトランジションスタイルを生成する
 */
export const createColorTransition = (
  duration: number = ANIMATION_CONFIGS.colorChange.duration,
  easing: string = ANIMATION_CONFIGS.colorChange.easing
): React.CSSProperties => {
  const properties = ['background-color', 'border-color', 'color', 'box-shadow'];
  return {
    transition: createTransition(properties, { duration, easing }),
  };
};

/**
 * 達成アニメーション用のキーフレームスタイルを生成する
 */
export const createAchievementAnimation = (
  duration: number = ANIMATION_CONFIGS.achievement.duration
): React.CSSProperties => {
  return {
    animation: `achievement-pulse ${duration}ms ease-out`,
  };
};

/**
 * アニメーション中断機能
 */
export class AnimationController {
  protected activeAnimations: Map<string, Animation> = new Map();
  private interruptCallbacks: Map<string, () => void> = new Map();
  private userInteractionListeners: Set<() => void> = new Set();

  constructor() {
    this.setupUserInteractionListeners();
  }

  /**
   * ユーザー操作時のアニメーション中断リスナーを設定
   */
  private setupUserInteractionListeners(): void {
    const interruptOnUserAction = () => {
      this.handleUserInteraction();
    };

    // ユーザー操作イベントを監視
    const events = ['mousedown', 'touchstart', 'keydown', 'wheel'];
    events.forEach(event => {
      document.addEventListener(event, interruptOnUserAction, { passive: true });
    });

    // クリーンアップ用にリスナーを保存
    this.userInteractionListeners.add(() => {
      events.forEach(event => {
        document.removeEventListener(event, interruptOnUserAction);
      });
    });
  }

  /**
   * ユーザー操作時の処理
   */
  private handleUserInteraction(): void {
    // 進行中のアニメーションを中断（達成アニメーションは除く）
    this.activeAnimations.forEach((animation, id) => {
      if (!id.includes('achievement')) {
        this.cancelAnimation(id);
      }
    });
  }

  /**
   * アニメーションを開始する
   */
  startAnimation(
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
    id?: string,
    onInterrupt?: () => void
  ): Animation | null {
    // DOM要素の存在チェック
    if (!element || !element.animate) {
      // テスト環境では警告を抑制
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Animation target element is not available or does not support animations');
      }
      return null;
    }

    const animation = element.animate(keyframes, options);

    // アニメーションオブジェクトの存在チェック
    if (!animation) {
      // テスト環境では警告を抑制
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Failed to create animation');
      }
      return null;
    }

    if (id) {
      // 既存のアニメーションがあれば中断
      this.cancelAnimation(id);
      this.activeAnimations.set(id, animation);

      if (onInterrupt) {
        this.interruptCallbacks.set(id, onInterrupt);
      }

      // アニメーション終了時にマップから削除
      animation.addEventListener('finish', () => {
        this.activeAnimations.delete(id);
        this.interruptCallbacks.delete(id);
      });

      animation.addEventListener('cancel', () => {
        const callback = this.interruptCallbacks.get(id);
        if (callback) {
          callback();
        }
        this.activeAnimations.delete(id);
        this.interruptCallbacks.delete(id);
      });
    }

    return animation;
  }

  /**
   * 指定されたIDのアニメーションを中断する
   */
  cancelAnimation(id: string): void {
    const animation = this.activeAnimations.get(id);
    if (animation) {
      animation.cancel();
      this.activeAnimations.delete(id);
      this.interruptCallbacks.delete(id);
    }
  }

  /**
   * すべてのアニメーションを中断する
   */
  cancelAllAnimations(): void {
    this.activeAnimations.forEach((animation, id) => {
      const callback = this.interruptCallbacks.get(id);
      if (callback) {
        callback();
      }
      animation.cancel();
    });
    this.activeAnimations.clear();
    this.interruptCallbacks.clear();
  }

  /**
   * 特定の種類のアニメーションを中断する
   */
  cancelAnimationsByType(type: string): void {
    const idsToCancel = Array.from(this.activeAnimations.keys()).filter(id => id.includes(type));

    idsToCancel.forEach(id => this.cancelAnimation(id));
  }

  /**
   * アクティブなアニメーション数を取得する
   */
  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * アクティブなアニメーションIDを取得する
   */
  getActiveAnimationIds(): string[] {
    return Array.from(this.activeAnimations.keys());
  }

  /**
   * リソースをクリーンアップする
   */
  cleanup(): void {
    this.cancelAllAnimations();
    this.userInteractionListeners.forEach(cleanup => cleanup());
    this.userInteractionListeners.clear();
  }
}

/**
 * 統合アニメーション制御クラス
 */
export class IntegratedAnimationController extends AnimationController {
  private performanceSettings: ReturnType<typeof getOptimalAnimationSettings>;
  private isInitialized = false;

  constructor() {
    super();
    this.performanceSettings = getOptimalAnimationSettings();
    this.initialize();
  }

  /**
   * 初期化処理
   */
  private initialize(): void {
    if (this.isInitialized) return;

    // パフォーマンス設定の定期更新
    setInterval(() => {
      this.updatePerformanceSettings();
    }, 10000); // 10秒ごと

    // ページの可視性変更時の処理
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // ページが非表示になった時はアニメーションを一時停止
        this.pauseAllAnimations();
      } else {
        // ページが表示された時はアニメーションを再開
        this.resumeAllAnimations();
      }
    });

    this.isInitialized = true;
  }

  /**
   * パフォーマンス設定を更新
   */
  private updatePerformanceSettings(): void {
    this.performanceSettings = getOptimalAnimationSettings();
  }

  /**
   * 最適化されたアニメーション開始
   */
  startOptimizedAnimation(
    element: HTMLElement,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
    id?: string,
    onInterrupt?: () => void
  ): Animation | null {
    try {
      // アニメーションが無効な場合は実行しない
      if (!this.performanceSettings.enableAnimations) {
        return null;
      }

      // 同時実行数制限をチェック
      if (this.getActiveAnimationCount() >= this.performanceSettings.maxConcurrentAnimations) {
        // 古いアニメーションを中断して新しいアニメーションを実行
        const oldestId = this.getActiveAnimationIds()[0];
        if (oldestId) {
          this.cancelAnimation(oldestId);
        }
      }

      // パフォーマンスレベルに応じてオプションを調整
      const optimizedOptions = {
        ...options,
        ...PERFORMANCE_LEVEL_OPTIONS[this.performanceSettings.performanceLevel],
      };

      // GPU加速の設定
      if (!this.performanceSettings.shouldUseGPUAcceleration) {
        delete optimizedOptions.composite;
      }

      return this.startAnimation(element, keyframes, optimizedOptions, id, onInterrupt);
    } catch (error) {
      // テスト環境では警告を抑制
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Animation failed to start:', error);
      }
      return null;
    }
  }

  /**
   * すべてのアニメーションを一時停止
   */
  public pauseAllAnimations(): void {
    this.activeAnimations.forEach(animation => {
      animation.pause();
    });
  }

  /**
   * すべてのアニメーションを再開
   */
  public resumeAllAnimations(): void {
    this.activeAnimations.forEach(animation => {
      animation.play();
    });
  }

  /**
   * 現在のパフォーマンス設定を取得
   */
  getPerformanceSettings() {
    return { ...this.performanceSettings };
  }

  /**
   * アニメーション実行可能かチェック
   */
  canStartAnimation(): boolean {
    return (
      this.performanceSettings.enableAnimations &&
      this.getActiveAnimationCount() < this.performanceSettings.maxConcurrentAnimations
    );
  }
}

/**
 * グローバルアニメーションコントローラー（遅延初期化）
 */
let _globalAnimationController: IntegratedAnimationController | null = null;

export const globalAnimationController = {
  get instance(): IntegratedAnimationController {
    if (!_globalAnimationController) {
      _globalAnimationController = new IntegratedAnimationController();
    }
    return _globalAnimationController;
  },

  // 既存のメソッドをプロキシ
  startAnimation: (...args: Parameters<IntegratedAnimationController['startAnimation']>) =>
    globalAnimationController.instance.startAnimation(...args),

  startOptimizedAnimation: (
    ...args: Parameters<IntegratedAnimationController['startOptimizedAnimation']>
  ) => globalAnimationController.instance.startOptimizedAnimation(...args),

  cancelAnimation: (id: string) => globalAnimationController.instance.cancelAnimation(id),

  cancelAllAnimations: () => globalAnimationController.instance.cancelAllAnimations(),

  cancelAnimationsByType: (type: string) =>
    globalAnimationController.instance.cancelAnimationsByType(type),

  getActiveAnimationCount: () => globalAnimationController.instance.getActiveAnimationCount(),

  getActiveAnimationIds: () => globalAnimationController.instance.getActiveAnimationIds(),

  getPerformanceSettings: () => globalAnimationController.instance.getPerformanceSettings(),

  canStartAnimation: () => globalAnimationController.instance.canStartAnimation(),

  cleanup: () => globalAnimationController.instance.cleanup(),
};

// AnimationPerformanceMonitor is not implemented yet
// export const globalPerformanceMonitor = {
//   get instance(): AnimationPerformanceMonitor {
//     if (!_globalPerformanceMonitor) {
//       _globalPerformanceMonitor = new AnimationPerformanceMonitor();
//     }
//     return _globalPerformanceMonitor;
//   },
//   startMonitoring: () => globalPerformanceMonitor.instance.startMonitoring(),
//   stopMonitoring: () => globalPerformanceMonitor.instance.stopMonitoring(),
//   getMetrics: () => globalPerformanceMonitor.instance.getMetrics(),
// };

// AnimationInterruptController is not implemented yet
// export const globalInterruptController = {
//   get instance(): AnimationInterruptController {
//     if (!_globalInterruptController) {
//       _globalInterruptController = new AnimationInterruptController();
//     }
//     return _globalInterruptController;
//   },
//   interruptAnimation: (id: string) => globalInterruptController.instance.interruptAnimation(id),
//   interruptAnimationsByType: (type: string) =>
//     globalInterruptController.instance.interruptAnimationsByType(type),
//   interruptAllAnimations: () => globalInterruptController.instance.interruptAllAnimations(),
// };

// AnimationAccessibilityManager is not implemented yet
// export const globalAccessibilityManager = {
//   get instance(): AnimationAccessibilityManager {
//     if (!_globalAccessibilityManager) {
//       _globalAccessibilityManager = new AnimationAccessibilityManager();
//     }
//     return _globalAccessibilityManager;
//   },
//   shouldReduceMotion: () => globalAccessibilityManager.instance.shouldReduceMotion(),
//   getAnimationSettings: () => globalAccessibilityManager.instance.getAnimationSettings(),
// };

// AdaptiveAnimationQuality is not implemented yet
// export const globalAdaptiveQuality = {
//   get instance(): AdaptiveAnimationQuality {
//     if (!_globalAdaptiveQuality) {
//       _globalAdaptiveQuality = new AdaptiveAnimationQuality();
//     }
//     return _globalAdaptiveQuality;
//   },
//   startAdaptiveAdjustment: () => globalAdaptiveQuality.instance.startAdaptiveAdjustment(),
//   stopAdaptiveAdjustment: () => globalAdaptiveQuality.instance.stopAdaptiveAdjustment(),
//   getCurrentQuality: () => globalAdaptiveQuality.instance.getCurrentQuality(),
// };

/**
 * 達成アニメーションのキーフレーム定義
 */
export const ACHIEVEMENT_KEYFRAMES: Keyframe[] = [
  {
    transform: 'scale(1)',
    boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)',
    offset: 0,
  },
  {
    transform: 'scale(1.05)',
    boxShadow: '0 0 20px 10px rgba(34, 197, 94, 0.4)',
    offset: 0.5,
  },
  {
    transform: 'scale(1)',
    boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
    offset: 1,
  },
];

/**
 * パルスアニメーションのキーフレーム定義
 */
export const PULSE_KEYFRAMES: Keyframe[] = [
  { opacity: 1, offset: 0 },
  { opacity: 0.7, offset: 0.5 },
  { opacity: 1, offset: 1 },
];

/**
 * フェードインアニメーションのキーフレーム定義
 */
export const FADE_IN_KEYFRAMES: Keyframe[] = [
  { opacity: 0, offset: 0 },
  { opacity: 1, offset: 1 },
];

/**
 * スケールアニメーションのキーフレーム定義
 */
export const SCALE_KEYFRAMES: Keyframe[] = [
  { transform: 'scale(0.95)', offset: 0 },
  { transform: 'scale(1)', offset: 1 },
];

/**
 * パフォーマンス最適化のためのアニメーション設定
 */
export const PERFORMANCE_OPTIMIZED_OPTIONS: KeyframeAnimationOptions = {
  // GPU加速を有効にする
  composite: 'replace',
  // アニメーション終了後に要素を元の状態に戻す
  fill: 'forwards',
};

/**
 * パフォーマンスレベル別の最適化設定
 */
export const PERFORMANCE_LEVEL_OPTIONS: Record<string, KeyframeAnimationOptions> = {
  high: {
    ...PERFORMANCE_OPTIMIZED_OPTIONS,
    composite: 'replace',
  },
  medium: {
    ...PERFORMANCE_OPTIMIZED_OPTIONS,
    composite: 'add',
  },
  low: {
    fill: 'forwards',
    // GPU加速を無効にしてCPU負荷を軽減
    composite: 'accumulate',
  },
};

/**
 * アニメーション無効化の検出
 */
export const isReducedMotionPreferred = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * アクセシビリティ設定の検出
 */
export const getAccessibilitySettings = () => {
  if (typeof window === 'undefined') {
    return {
      reducedMotion: false,
      highContrast: false,
      forcedColors: false,
    };
  }

  return {
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    forcedColors: window.matchMedia('(forced-colors: active)').matches,
  };
};

/**
 * アニメーション設定を動的に調整する
 */
export const adjustAnimationForPerformance = (
  baseConfig: AnimationConfig,
  performanceLevel: 'high' | 'medium' | 'low' = 'high'
): AnimationConfig => {
  const multipliers = {
    high: 1,
    medium: 0.7,
    low: 0.5,
  };

  return {
    ...baseConfig,
    duration: Math.round(baseConfig.duration * multipliers[performanceLevel]),
  };
};

/**
 * 複数要素の同時達成時のアニメーション調整
 */
export const createStaggeredAnimation = (
  elements: HTMLElement[],
  keyframes: Keyframe[],
  baseOptions: KeyframeAnimationOptions,
  staggerDelay: number = 100
): Animation[] => {
  return elements.map((element, index) => {
    const options = {
      ...baseOptions,
      delay: (baseOptions.delay || 0) + index * staggerDelay,
    };

    return element.animate(keyframes, options);
  });
};

/**
 * アニメーション品質の動的調整
 */
export const getOptimalAnimationSettings = (): {
  enableAnimations: boolean;
  performanceLevel: 'high' | 'medium' | 'low';
  maxConcurrentAnimations: number;
  shouldUseGPUAcceleration: boolean;
} => {
  const accessibility = getAccessibilitySettings();

  // アクセシビリティ設定をチェック
  if (accessibility.reducedMotion) {
    return {
      enableAnimations: false,
      performanceLevel: 'low',
      maxConcurrentAnimations: 0,
      shouldUseGPUAcceleration: false,
    };
  }

  // 強制カラーモード（Windowsハイコントラストモード等）
  if (accessibility.forcedColors) {
    return {
      enableAnimations: true,
      performanceLevel: 'low',
      maxConcurrentAnimations: 3,
      shouldUseGPUAcceleration: false,
    };
  }

  // デバイスの性能を推定
  const deviceMemory = (navigator as any).deviceMemory || 4; // GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  // 低性能デバイスの検出
  if (deviceMemory < 2 || hardwareConcurrency < 2) {
    return {
      enableAnimations: true,
      performanceLevel: 'low',
      maxConcurrentAnimations: 3,
      shouldUseGPUAcceleration: false,
    };
  }

  // ネットワーク状況に基づく調整
  const connection = (navigator as any).connection;
  if (connection) {
    // 低速回線の場合はアニメーションを軽量化
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return {
        enableAnimations: true,
        performanceLevel: 'low',
        maxConcurrentAnimations: 5,
        shouldUseGPUAcceleration: true,
      };
    }

    if (connection.effectiveType === '3g') {
      return {
        enableAnimations: true,
        performanceLevel: 'medium',
        maxConcurrentAnimations: 10,
        shouldUseGPUAcceleration: true,
      };
    }

    // データセーバーモードの場合
    if (connection.saveData) {
      return {
        enableAnimations: true,
        performanceLevel: 'low',
        maxConcurrentAnimations: 5,
        shouldUseGPUAcceleration: false,
      };
    }
  }

  // バッテリー状況に基づく調整
  const battery = (navigator as any).getBattery?.();
  if (battery) {
    battery.then((batteryInfo: any) => {
      // バッテリー残量が少ない場合はアニメーションを軽量化
      if (batteryInfo.level < 0.2 || batteryInfo.charging === false) {
        return {
          enableAnimations: true,
          performanceLevel: 'medium',
          maxConcurrentAnimations: 8,
          shouldUseGPUAcceleration: true,
        };
      }
    });
  }

  // デフォルト（高性能設定）
  return {
    enableAnimations: true,
    performanceLevel: 'high',
    maxConcurrentAnimations: 20,
    shouldUseGPUAcceleration: true,
  };
};
