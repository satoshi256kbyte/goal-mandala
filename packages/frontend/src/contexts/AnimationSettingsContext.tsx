import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  globalPerformanceMonitor,
  globalInterruptController,
  globalAdaptiveQuality,
  globalAccessibilityManager,
  type PerformanceLevel,
} from '../utils/animation-performance';
import { globalAnimationController } from '../utils/animation-utils';

/**
 * アニメーション設定の型定義
 */
export interface AnimationSettings {
  /** アニメーション有効・無効 */
  enabled: boolean;
  /** 進捗変化アニメーションの継続時間（ミリ秒） */
  progressDuration: number;
  /** 色変化アニメーションの継続時間（ミリ秒） */
  colorDuration: number;
  /** 達成アニメーションの有効・無効 */
  achievementEnabled: boolean;
  /** 達成アニメーションの継続時間（ミリ秒） */
  achievementDuration: number;
  /** アニメーションのイージング関数 */
  easing: string;
  /** システムの動きを減らす設定を尊重するか */
  respectReducedMotion: boolean;
  /** パフォーマンス監視の有効・無効 */
  enablePerformanceMonitoring: boolean;
  /** 自動品質調整の有効・無効 */
  enableAdaptiveQuality: boolean;
  /** パフォーマンスレベル */
  performanceLevel: PerformanceLevel;
}

/**
 * デフォルトのアニメーション設定
 */
export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  enabled: true,
  progressDuration: 300,
  colorDuration: 300,
  achievementEnabled: true,
  achievementDuration: 600,
  easing: 'ease-out',
  respectReducedMotion: true,
  enablePerformanceMonitoring: true,
  enableAdaptiveQuality: true,
  performanceLevel: 'high',
};

/**
 * アニメーション設定コンテキストの型定義
 */
interface AnimationSettingsContextType {
  settings: AnimationSettings;
  updateSettings: (newSettings: Partial<AnimationSettings>) => void;
  isAnimationEnabled: boolean;
  getTransitionStyle: (property: string, duration?: number) => React.CSSProperties;
  getProgressTransitionStyle: () => React.CSSProperties;
  getColorTransitionStyle: () => React.CSSProperties;
  /** アニメーションを中断する */
  interruptAllAnimations: () => void;
  /** 特定のアニメーションを中断する */
  interruptAnimation: (id: string) => void;
  /** パフォーマンス監視を開始する */
  startPerformanceMonitoring: () => void;
  /** パフォーマンス監視を停止する */
  stopPerformanceMonitoring: () => void;
}

/**
 * アニメーション設定コンテキスト
 */
const AnimationSettingsContext = createContext<AnimationSettingsContextType | undefined>(undefined);

/**
 * アニメーション設定プロバイダーのプロパティ
 */
interface AnimationSettingsProviderProps {
  children: ReactNode;
  initialSettings?: Partial<AnimationSettings>;
}

/**
 * アニメーション設定プロバイダー
 *
 * アニメーション設定の管理とシステムの動きを減らす設定の検出を行う
 */
export const AnimationSettingsProvider: React.FC<AnimationSettingsProviderProps> = ({
  children,
  initialSettings = {},
}) => {
  const [settings, setSettings] = useState<AnimationSettings>({
    ...DEFAULT_ANIMATION_SETTINGS,
    ...initialSettings,
  });

  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  // システムの動きを減らす設定を検出
  useEffect(() => {
    const handleAccessibilityChange = (disabled: boolean) => {
      setSystemReducedMotion(disabled);
    };

    globalAccessibilityManager.addCallback(handleAccessibilityChange);
    setSystemReducedMotion(globalAccessibilityManager.isDisabled());

    return () => {
      globalAccessibilityManager.removeCallback(handleAccessibilityChange);
    };
  }, []);

  // アニメーションが有効かどうかを判定
  const isAnimationEnabled =
    settings.enabled && (!settings.respectReducedMotion || !systemReducedMotion);

  // パフォーマンス監視の管理
  useEffect(() => {
    if (settings.enablePerformanceMonitoring && isAnimationEnabled) {
      globalPerformanceMonitor.startMonitoring();
    } else {
      globalPerformanceMonitor.stopMonitoring();
    }

    return () => {
      globalPerformanceMonitor.stopMonitoring();
    };
  }, [settings.enablePerformanceMonitoring, isAnimationEnabled]);

  // 自動品質調整の管理
  useEffect(() => {
    if (settings.enableAdaptiveQuality && isAnimationEnabled) {
      globalAdaptiveQuality.startAdaptiveAdjustment();
    } else {
      globalAdaptiveQuality.stopAdaptiveAdjustment();
    }

    return () => {
      globalAdaptiveQuality.stopAdaptiveAdjustment();
    };
  }, [settings.enableAdaptiveQuality, isAnimationEnabled]);

  // 設定更新関数
  const updateSettings = (newSettings: Partial<AnimationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // 汎用的なトランジションスタイルを生成
  const getTransitionStyle = (property: string, duration?: number): React.CSSProperties => {
    if (!isAnimationEnabled) {
      return {};
    }

    return {
      transition: `${property} ${duration || settings.progressDuration}ms ${settings.easing}`,
    };
  };

  // 進捗変化用のトランジションスタイルを生成
  const getProgressTransitionStyle = (): React.CSSProperties => {
    if (!isAnimationEnabled) {
      return {};
    }

    return {
      transition: `width ${settings.progressDuration}ms ${settings.easing}`,
    };
  };

  // 色変化用のトランジションスタイルを生成
  const getColorTransitionStyle = (): React.CSSProperties => {
    if (!isAnimationEnabled) {
      return {};
    }

    const properties = ['background-color', 'border-color', 'color', 'box-shadow'];
    return {
      transition: properties
        .map(prop => `${prop} ${settings.colorDuration}ms ${settings.easing}`)
        .join(', '),
    };
  };

  // アニメーション制御関数
  const interruptAllAnimations = () => {
    globalInterruptController.interruptAllAnimations();
    // グローバルアニメーションコントローラーも中断
    globalAnimationController.cancelAllAnimations();
  };

  const interruptAnimation = (id: string) => {
    globalInterruptController.interruptAnimation(id);
    // グローバルアニメーションコントローラーも中断
    globalAnimationController.cancelAnimation(id);
  };

  const startPerformanceMonitoring = () => {
    globalPerformanceMonitor.startMonitoring();
  };

  const stopPerformanceMonitoring = () => {
    globalPerformanceMonitor.stopMonitoring();
  };

  const contextValue: AnimationSettingsContextType = {
    settings,
    updateSettings,
    isAnimationEnabled,
    getTransitionStyle,
    getProgressTransitionStyle,
    getColorTransitionStyle,
    interruptAllAnimations,
    interruptAnimation,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
  };

  return (
    <AnimationSettingsContext.Provider value={contextValue}>
      {children}
    </AnimationSettingsContext.Provider>
  );
};

/**
 * アニメーション設定フック
 *
 * アニメーション設定コンテキストを使用するためのフック
 */
export const useAnimationSettings = (): AnimationSettingsContextType => {
  const context = useContext(AnimationSettingsContext);
  if (context === undefined) {
    throw new Error('useAnimationSettings must be used within an AnimationSettingsProvider');
  }
  return context;
};

/**
 * アニメーション有効状態フック
 *
 * アニメーションが有効かどうかのみを取得する軽量なフック
 */
export const useIsAnimationEnabled = (): boolean => {
  const { isAnimationEnabled } = useAnimationSettings();
  return isAnimationEnabled;
};
