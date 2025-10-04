import React, { useEffect, useRef, useState } from 'react';
import {
  globalAnimationController,
  ACHIEVEMENT_KEYFRAMES,
  PERFORMANCE_OPTIMIZED_OPTIONS,
} from '../../utils/animation-utils';
import { useAnimationSettings } from '../../contexts/AnimationSettingsContext';

/**
 * 達成アニメーションのプロパティ
 */
interface AchievementAnimationProps {
  /** アニメーションをトリガーするかどうか */
  trigger: boolean;
  /** 子要素 */
  children: React.ReactNode;
  /** アニメーション完了時のコールバック */
  onComplete?: () => void;
  /** アニメーションの種類 */
  type?: 'single' | 'pulse' | 'glow' | 'bounce';
  /** カスタムアニメーション設定 */
  customKeyframes?: Keyframe[];
  /** アニメーションID（複数の同時アニメーション管理用） */
  animationId?: string;
  /** 複数要素の同時達成時の遅延時間（ミリ秒） */
  staggerDelay?: number;
  /** アニメーション強度 */
  intensity?: 'subtle' | 'normal' | 'strong';
}

/**
 * アニメーション種類別のキーフレーム定義
 */
const ANIMATION_KEYFRAMES = {
  single: ACHIEVEMENT_KEYFRAMES,
  pulse: [
    { transform: 'scale(1)', opacity: 1, offset: 0 },
    { transform: 'scale(1.1)', opacity: 0.8, offset: 0.5 },
    { transform: 'scale(1)', opacity: 1, offset: 1 },
  ],
  glow: [
    {
      boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
      filter: 'brightness(1)',
      offset: 0,
    },
    {
      boxShadow: '0 0 30px 15px rgba(34, 197, 94, 0.6)',
      filter: 'brightness(1.2)',
      offset: 0.5,
    },
    {
      boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)',
      filter: 'brightness(1)',
      offset: 1,
    },
  ],
  bounce: [
    { transform: 'scale(1) translateY(0)', offset: 0 },
    { transform: 'scale(1.1) translateY(-10px)', offset: 0.3 },
    { transform: 'scale(0.95) translateY(5px)', offset: 0.6 },
    { transform: 'scale(1) translateY(0)', offset: 1 },
  ],
} as const;

/**
 * 強度別のスケール調整
 */
const INTENSITY_MULTIPLIERS = {
  subtle: 0.5,
  normal: 1,
  strong: 1.5,
} as const;

/**
 * 達成アニメーションコンポーネント
 *
 * 100%達成時の特別なアニメーション効果を提供する
 */
export const AchievementAnimation: React.FC<AchievementAnimationProps> = ({
  trigger,
  children,
  onComplete,
  type = 'single',
  customKeyframes,
  animationId,
  intensity = 'normal',
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { settings, isAnimationEnabled } = useAnimationSettings();

  useEffect(() => {
    if (!trigger || !isAnimationEnabled || !settings.achievementEnabled) {
      return;
    }

    const element = elementRef.current;
    if (!element) {
      return;
    }

    // アニメーション開始
    setIsAnimating(true);

    // キーフレームの選択
    const keyframes = customKeyframes || ANIMATION_KEYFRAMES[type];

    // 強度に応じてキーフレームを調整
    const adjustedKeyframes = keyframes.map(frame => {
      const adjustedFrame = { ...frame };

      // transform プロパティの調整
      if (frame.transform && typeof frame.transform === 'string') {
        const scaleMatch = frame.transform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) {
          const originalScale = parseFloat(scaleMatch[1]);
          const intensityMultiplier = INTENSITY_MULTIPLIERS[intensity];
          const adjustedScale = 1 + (originalScale - 1) * intensityMultiplier;
          adjustedFrame.transform = frame.transform.replace(
            /scale\([^)]+\)/,
            `scale(${adjustedScale})`
          );
        }
      }

      // boxShadow プロパティの調整
      if (frame.boxShadow && typeof frame.boxShadow === 'string') {
        const intensityMultiplier = INTENSITY_MULTIPLIERS[intensity];
        // 影のサイズを強度に応じて調整（簡易版）
        if (intensityMultiplier !== 1) {
          adjustedFrame.boxShadow = frame.boxShadow.replace(
            /(\d+)px/g,
            (match, size) => `${Math.round(parseInt(size) * intensityMultiplier)}px`
          );
        }
      }

      return adjustedFrame;
    });

    // アニメーションオプション
    const options: KeyframeAnimationOptions = {
      ...PERFORMANCE_OPTIMIZED_OPTIONS,
      duration: settings.achievementDuration,
      easing: settings.easing,
    };

    // アニメーション実行（最適化された方法を使用）
    const animation = globalAnimationController.startOptimizedAnimation(
      element,
      adjustedKeyframes,
      options,
      animationId,
      () => {
        // アニメーション中断時の処理
        setIsAnimating(false);
      }
    );

    // アニメーションが実行されなかった場合（パフォーマンス制限等）
    if (!animation) {
      setIsAnimating(false);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // アニメーション完了時の処理
    animation.addEventListener('finish', () => {
      setIsAnimating(false);
      if (onComplete) {
        onComplete();
      }
    });

    // アニメーション中断時の処理
    animation.addEventListener('cancel', () => {
      setIsAnimating(false);
    });

    // クリーンアップ
    return () => {
      if (animationId) {
        globalAnimationController.cancelAnimation(animationId);
      }
    };
  }, [
    trigger,
    isAnimationEnabled,
    settings.achievementEnabled,
    settings.achievementDuration,
    settings.easing,
    type,
    customKeyframes,
    animationId,
    onComplete,
    intensity,
  ]);

  return (
    <div
      ref={elementRef}
      style={{
        display: 'inline-block',
        // アニメーション中は他の要素より前面に表示
        zIndex: isAnimating ? 1000 : 'auto',
        // GPU加速を有効にする
        willChange: isAnimating ? 'transform, opacity, box-shadow' : 'auto',
      }}
    >
      {children}
    </div>
  );
};

/**
 * 複数要素の同時達成アニメーション用のコンポーネント
 */
interface MultipleAchievementAnimationProps {
  /** アニメーションをトリガーするかどうか */
  trigger: boolean;
  /** 子要素の配列 */
  children: React.ReactNode[];
  /** アニメーション完了時のコールバック */
  onComplete?: () => void;
  /** 要素間の遅延時間（ミリ秒） */
  staggerDelay?: number;
  /** アニメーションの種類 */
  type?: 'single' | 'pulse' | 'glow' | 'bounce';
}

export const MultipleAchievementAnimation: React.FC<MultipleAchievementAnimationProps> = ({
  trigger,
  children,
  onComplete,
  staggerDelay = 100,
  type = 'single',
}) => {
  const [, setCompletedCount] = useState(0);

  const handleSingleComplete = () => {
    setCompletedCount(prev => {
      const newCount = prev + 1;
      if (newCount === children.length && onComplete) {
        onComplete();
      }
      return newCount;
    });
  };

  // トリガーがリセットされた時に完了カウントもリセット
  useEffect(() => {
    if (!trigger) {
      setCompletedCount(0);
    }
  }, [trigger]);

  return (
    <>
      {children.map((child, index) => (
        <AchievementAnimation
          key={index}
          trigger={trigger}
          type={type}
          animationId={`multi-achievement-${index}`}
          onComplete={handleSingleComplete}
          staggerDelay={staggerDelay}
        >
          {child}
        </AchievementAnimation>
      ))}
    </>
  );
};

export default AchievementAnimation;
