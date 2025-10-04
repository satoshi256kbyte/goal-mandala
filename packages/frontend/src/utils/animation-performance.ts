/**
 * アニメーションパフォーマンス監視・最適化ユーティリティ
 * 要件4.4, 4.5に対応
 */

/**
 * パフォーマンス指標の型定義
 */
export interface PerformanceMetrics {
  /** フレームレート（FPS） */
  fps: number;
  /** アニメーション実行時間（ミリ秒） */
  duration: number;
  /** メモリ使用量（MB） */
  memoryUsage: number;
  /** CPU使用率（%） */
  cpuUsage: number;
  /** アクティブなアニメーション数 */
  activeAnimations: number;
  /** フレームドロップ数 */
  droppedFrames: number;
}

/**
 * パフォーマンスレベルの定義
 */
export type PerformanceLevel = 'high' | 'medium' | 'low';

/**
 * アニメーション品質設定
 */
export interface AnimationQualitySettings {
  /** パフォーマンスレベル */
  level: PerformanceLevel;
  /** 最大同時アニメーション数 */
  maxConcurrentAnimations: number;
  /** フレームレート制限 */
  maxFPS: number;
  /** アニメーション継続時間の倍率 */
  durationMultiplier: number;
  /** 複雑なエフェクトの有効・無効 */
  enableComplexEffects: boolean;
  /** GPU加速の使用 */
  useGPUAcceleration: boolean;
}

/**
 * デフォルトの品質設定
 */
const DEFAULT_QUALITY_SETTINGS: Record<PerformanceLevel, AnimationQualitySettings> = {
  high: {
    level: 'high',
    maxConcurrentAnimations: 20,
    maxFPS: 60,
    durationMultiplier: 1.0,
    enableComplexEffects: true,
    useGPUAcceleration: true,
  },
  medium: {
    level: 'medium',
    maxConcurrentAnimations: 10,
    maxFPS: 30,
    durationMultiplier: 0.8,
    enableComplexEffects: true,
    useGPUAcceleration: true,
  },
  low: {
    level: 'low',
    maxConcurrentAnimations: 5,
    maxFPS: 15,
    durationMultiplier: 0.5,
    enableComplexEffects: false,
    useGPUAcceleration: false,
  },
};

/**
 * アニメーションパフォーマンス監視クラス
 */
export class AnimationPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    duration: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    activeAnimations: 0,
    droppedFrames: 0,
  };

  private frameCount = 0;
  private lastFrameTime = 0;
  private animationStartTime = 0;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private frameCallback: number | null = null;

  private qualitySettings: AnimationQualitySettings = DEFAULT_QUALITY_SETTINGS.high;
  private performanceHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY_SIZE = 100;

  /**
   * パフォーマンス監視を開始する
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.animationStartTime = performance.now();
    this.lastFrameTime = this.animationStartTime;
    this.frameCount = 0;

    // FPS測定
    this.measureFPS();

    // 定期的なメトリクス更新
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  /**
   * パフォーマンス監視を停止する
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.frameCallback) {
      cancelAnimationFrame(this.frameCallback);
      this.frameCallback = null;
    }

    // 履歴に追加
    this.addToHistory(this.metrics);
  }

  /**
   * FPSを測定する
   */
  private measureFPS(): void {
    const measureFrame = (currentTime: number) => {
      if (!this.isMonitoring) {
        return;
      }

      this.frameCount++;
      const deltaTime = currentTime - this.lastFrameTime;

      if (deltaTime >= 1000) {
        this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime);
        this.frameCount = 0;
        this.lastFrameTime = currentTime;
      }

      this.frameCallback = requestAnimationFrame(measureFrame);
    };

    this.frameCallback = requestAnimationFrame(measureFrame);
  }

  /**
   * メトリクスを更新する
   */
  private updateMetrics(): void {
    // アニメーション実行時間
    this.metrics.duration = performance.now() - this.animationStartTime;

    // メモリ使用量（利用可能な場合）
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = (memory as any).usedJSHeapSize / (1024 * 1024);
    }

    // フレームドロップの検出
    if (this.metrics.fps < this.qualitySettings.maxFPS * 0.8) {
      this.metrics.droppedFrames++;
    }
  }

  /**
   * 履歴にメトリクスを追加する
   */
  private addToHistory(metrics: PerformanceMetrics): void {
    this.performanceHistory.push({ ...metrics });

    if (this.performanceHistory.length > this.MAX_HISTORY_SIZE) {
      this.performanceHistory.shift();
    }
  }

  /**
   * 現在のメトリクスを取得する
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * パフォーマンス履歴を取得する
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * 品質設定を更新する
   */
  setQualitySettings(level: PerformanceLevel): void {
    this.qualitySettings = DEFAULT_QUALITY_SETTINGS[level];
  }

  /**
   * 現在の品質設定を取得する
   */
  getQualitySettings(): AnimationQualitySettings {
    return { ...this.qualitySettings };
  }

  /**
   * アクティブなアニメーション数を更新する
   */
  setActiveAnimationCount(count: number): void {
    this.metrics.activeAnimations = count;
  }

  /**
   * パフォーマンスに基づく推奨設定を取得する
   */
  getRecommendedSettings(): AnimationQualitySettings {
    const avgFPS = this.getAverageFPS();
    const avgMemory = this.getAverageMemoryUsage();

    // パフォーマンスが低い場合は品質を下げる
    if (avgFPS < 20 || avgMemory > 100) {
      return DEFAULT_QUALITY_SETTINGS.low;
    }

    if (avgFPS < 40 || avgMemory > 50) {
      return DEFAULT_QUALITY_SETTINGS.medium;
    }

    return DEFAULT_QUALITY_SETTINGS.high;
  }

  /**
   * 平均FPSを計算する
   */
  private getAverageFPS(): number {
    if (this.performanceHistory.length === 0) {
      return this.metrics.fps;
    }

    const totalFPS = this.performanceHistory.reduce((sum, metrics) => sum + metrics.fps, 0);
    return totalFPS / this.performanceHistory.length;
  }

  /**
   * 平均メモリ使用量を計算する
   */
  private getAverageMemoryUsage(): number {
    if (this.performanceHistory.length === 0) {
      return this.metrics.memoryUsage;
    }

    const totalMemory = this.performanceHistory.reduce(
      (sum, metrics) => sum + metrics.memoryUsage,
      0
    );
    return totalMemory / this.performanceHistory.length;
  }

  /**
   * パフォーマンス警告をチェックする
   */
  checkPerformanceWarnings(): string[] {
    const warnings: string[] = [];

    if (this.metrics.fps < 15) {
      warnings.push('フレームレートが低下しています（15fps未満）');
    }

    if (this.metrics.memoryUsage > 100) {
      warnings.push('メモリ使用量が高くなっています（100MB以上）');
    }

    if (this.metrics.activeAnimations > this.qualitySettings.maxConcurrentAnimations) {
      warnings.push('同時実行アニメーション数が制限を超えています');
    }

    if (this.metrics.droppedFrames > 10) {
      warnings.push('フレームドロップが多発しています');
    }

    return warnings;
  }
}

/**
 * アニメーション中断制御クラス
 */
export class AnimationInterruptController {
  private activeAnimations: Map<string, Animation> = new Map();
  private interruptCallbacks: Map<string, () => void> = new Map();

  /**
   * アニメーションを登録する
   */
  registerAnimation(id: string, animation: Animation, onInterrupt?: () => void): void {
    this.activeAnimations.set(id, animation);

    if (onInterrupt) {
      this.interruptCallbacks.set(id, onInterrupt);
    }

    // アニメーション終了時に自動的に登録解除
    animation.addEventListener('finish', () => {
      this.unregisterAnimation(id);
    });

    animation.addEventListener('cancel', () => {
      this.unregisterAnimation(id);
    });
  }

  /**
   * アニメーションの登録を解除する
   */
  unregisterAnimation(id: string): void {
    this.activeAnimations.delete(id);
    this.interruptCallbacks.delete(id);
  }

  /**
   * 特定のアニメーションを中断する
   */
  interruptAnimation(id: string): void {
    const animation = this.activeAnimations.get(id);
    const callback = this.interruptCallbacks.get(id);

    if (animation) {
      animation.cancel();
    }

    if (callback) {
      callback();
    }

    this.unregisterAnimation(id);
  }

  /**
   * すべてのアニメーションを中断する
   */
  interruptAllAnimations(): void {
    const ids = Array.from(this.activeAnimations.keys());
    ids.forEach(id => this.interruptAnimation(id));
  }

  /**
   * 特定の種類のアニメーションを中断する
   */
  interruptAnimationsByType(type: string): void {
    const ids = Array.from(this.activeAnimations.keys()).filter(id => id.startsWith(type));

    ids.forEach(id => this.interruptAnimation(id));
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
}

/**
 * アニメーション品質の自動調整機能
 */
export class AdaptiveAnimationQuality {
  private monitor: AnimationPerformanceMonitor;
  private currentLevel: PerformanceLevel = 'high';
  private adjustmentInterval: NodeJS.Timeout | null = null;
  private readonly ADJUSTMENT_INTERVAL = 5000; // 5秒ごとに調整

  constructor(monitor: AnimationPerformanceMonitor) {
    this.monitor = monitor;
  }

  /**
   * 自動調整を開始する
   */
  startAdaptiveAdjustment(): void {
    if (this.adjustmentInterval) {
      return;
    }

    this.adjustmentInterval = setInterval(() => {
      this.adjustQuality();
    }, this.ADJUSTMENT_INTERVAL);
  }

  /**
   * 自動調整を停止する
   */
  stopAdaptiveAdjustment(): void {
    if (this.adjustmentInterval) {
      clearInterval(this.adjustmentInterval);
      this.adjustmentInterval = null;
    }
  }

  /**
   * 品質を調整する
   */
  private adjustQuality(): void {
    const recommended = this.monitor.getRecommendedSettings();

    if (recommended.level !== this.currentLevel) {
      this.currentLevel = recommended.level;
      this.monitor.setQualitySettings(this.currentLevel);

      // 品質変更イベントを発火（将来の実装）
      this.onQualityChanged(this.currentLevel);
    }
  }

  /**
   * 品質変更時のコールバック
   */
  private onQualityChanged(newLevel: PerformanceLevel): void {
    console.log(`Animation quality adjusted to: ${newLevel}`);
  }

  /**
   * 現在の品質レベルを取得する
   */
  getCurrentLevel(): PerformanceLevel {
    return this.currentLevel;
  }
}

/**
 * グローバルインスタンス
 */
export const globalPerformanceMonitor = new AnimationPerformanceMonitor();
export const globalInterruptController = new AnimationInterruptController();
export const globalAdaptiveQuality = new AdaptiveAnimationQuality(globalPerformanceMonitor);

/**
 * アニメーション無効設定の管理
 */
export class AnimationAccessibilityManager {
  private isAnimationDisabled = false;
  private mediaQuery: MediaQueryList | null = null;
  private callbacks: Set<(disabled: boolean) => void> = new Set();

  constructor() {
    this.initializeMediaQuery();
  }

  /**
   * メディアクエリを初期化する
   */
  private initializeMediaQuery(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.isAnimationDisabled = this.mediaQuery.matches;

      this.mediaQuery.addEventListener('change', e => {
        this.isAnimationDisabled = e.matches;
        this.notifyCallbacks();
      });
    }
  }

  /**
   * アニメーション無効状態を取得する
   */
  isDisabled(): boolean {
    return this.isAnimationDisabled;
  }

  /**
   * アニメーション無効状態を手動で設定する
   */
  setDisabled(disabled: boolean): void {
    this.isAnimationDisabled = disabled;
    this.notifyCallbacks();
  }

  /**
   * 状態変更のコールバックを登録する
   */
  addCallback(callback: (disabled: boolean) => void): void {
    this.callbacks.add(callback);
  }

  /**
   * コールバックを削除する
   */
  removeCallback(callback: (disabled: boolean) => void): void {
    this.callbacks.delete(callback);
  }

  /**
   * コールバックに通知する
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback(this.isAnimationDisabled));
  }
}

/**
 * グローバルアクセシビリティマネージャー
 */
export const globalAccessibilityManager = new AnimationAccessibilityManager();
