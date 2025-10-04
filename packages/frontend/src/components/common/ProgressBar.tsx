import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { Tooltip } from './Tooltip';
import { ProgressTooltip } from './ProgressTooltip';
import { useAnimationSettings } from '../../contexts/AnimationSettingsContext';
import { AchievementAnimation } from './AchievementAnimation';
import { ProgressCalculationError } from '../../types/progress-errors';

export interface ProgressBarProps {
  /** 進捗値 (0-100) */
  value: number;
  /** サイズバリエーション */
  size?: 'small' | 'medium' | 'large';
  /** 進捗値の表示・非表示 */
  showLabel?: boolean;
  /** アニメーション有効・無効 */
  animated?: boolean;
  /** カスタムカラースキーム */
  colorScheme?: 'default' | 'success' | 'warning' | 'danger' | 'custom' | 'accessible';
  /** カスタム色設定（colorScheme='custom'時に使用） */
  customColors?: {
    background?: string;
    fill?: string;
    text?: string;
    /** 進捗値別の色設定 */
    progressColors?: {
      zero?: string; // 0%時の色
      low?: string; // 1-49%時の色
      medium?: string; // 50-79%時の色
      high?: string; // 80%以上時の色
    };
  };
  /** ツールチップテキスト */
  tooltip?: string;
  /** 高度なツールチップ設定 */
  tooltipConfig?: {
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    touchEnabled?: boolean;
    content?: React.ReactNode;
  };
  /** 進捗ツールチップの詳細設定 */
  progressTooltip?: {
    /** 前回の進捗値 */
    previousValue?: number;
    /** 目標値 */
    targetValue?: number;
    /** 完了タスク数 */
    completedTasks?: number;
    /** 総タスク数 */
    totalTasks?: number;
    /** 最終更新日時 */
    lastUpdated?: Date;
    /** 完了予定日 */
    estimatedCompletion?: Date;
    /** カスタムメッセージ */
    customMessage?: string;
    /** 進捗の種類 */
    progressType?: 'task' | 'action' | 'subgoal' | 'goal';
    /** 詳細情報の表示・非表示 */
    showDetails?: boolean;
  };
  /** 追加のCSSクラス */
  className?: string;
  /** アクセシビリティ用のラベル */
  'aria-label'?: string;
  /** ハイコントラストモード対応 */
  highContrast?: boolean;
  /** カラーブラインドネス対応モード */
  colorBlindFriendly?: boolean;
  /** 達成時のコールバック関数 */
  onAchievement?: () => void;
  /** 進捗変化時のコールバック関数 */
  onProgressChange?: (newValue: number, previousValue: number) => void;
  /** エラー状態の表示 */
  error?: {
    hasError: boolean;
    errorType?: ProgressCalculationError;
    errorMessage?: string;
    showRetry?: boolean;
    onRetry?: () => void;
  };
  /** ローディング状態 */
  loading?: boolean;
}

/**
 * 進捗値に応じた色分けを取得する
 * アクセシビリティとカラーブラインドネス対応を考慮した色選択
 */
const getProgressColor = (
  progress: number,
  colorScheme?: string,
  highContrast?: boolean,
  colorBlindFriendly?: boolean
): string => {
  // カスタムスキームの場合は空文字を返す（インラインスタイルで設定）
  if (colorScheme === 'custom') return '';

  // 固定カラースキーム
  if (colorScheme === 'success') {
    return highContrast ? 'bg-green-700' : 'bg-green-500';
  }
  if (colorScheme === 'warning') {
    return highContrast ? 'bg-amber-700' : 'bg-amber-500';
  }
  if (colorScheme === 'danger') {
    return highContrast ? 'bg-red-700' : 'bg-red-500';
  }

  // アクセシブルカラースキーム（WCAG AA準拠）
  if (colorScheme === 'accessible') {
    if (progress === 0) return highContrast ? 'bg-slate-600' : 'bg-slate-500';
    if (progress < 50) return highContrast ? 'bg-blue-700' : 'bg-blue-600';
    if (progress < 80) return highContrast ? 'bg-purple-700' : 'bg-purple-600';
    return highContrast ? 'bg-teal-700' : 'bg-teal-600';
  }

  // カラーブラインドネス対応モード
  if (colorBlindFriendly) {
    if (progress === 0) {
      return highContrast ? 'bg-gray-600' : 'bg-gray-500';
    }
    if (progress < 50) {
      // 赤の代わりに青を使用（赤緑色覚異常対応）
      return highContrast ? 'bg-blue-700' : 'bg-blue-600';
    }
    if (progress < 80) {
      // オレンジの代わりに紫を使用
      return highContrast ? 'bg-purple-700' : 'bg-purple-600';
    }
    // 緑の代わりにティールを使用
    return highContrast ? 'bg-teal-700' : 'bg-teal-600';
  }

  // デフォルトの色分けルール（アクセシビリティ対応）
  if (progress === 0) {
    // 未開始：グレー（コントラスト比4.5:1以上）
    return highContrast ? 'bg-gray-500' : 'bg-gray-400';
  }
  if (progress < 50) {
    // 低進捗：赤（カラーブラインドネス対応のため濃い赤を使用）
    return highContrast ? 'bg-red-700' : 'bg-red-500';
  }
  if (progress < 80) {
    // 中進捗：オレンジ（黄色の代わりにオレンジを使用してコントラストを改善）
    return highContrast ? 'bg-orange-700' : 'bg-orange-500';
  }
  // 高進捗：緑（カラーブラインドネス対応のため濃い緑を使用）
  return highContrast ? 'bg-green-700' : 'bg-green-600';
};

/**
 * 背景色を取得する
 * アクセシビリティを考慮したコントラスト比の確保
 */
const getBackgroundColor = (highContrast?: boolean): string => {
  return highContrast ? 'bg-gray-400' : 'bg-gray-200';
};

/**
 * サイズに応じた高さを取得する
 */
const getSizeClasses = (size: 'small' | 'medium' | 'large'): string => {
  switch (size) {
    case 'small':
      return 'h-1';
    case 'large':
      return 'h-4';
    case 'medium':
    default:
      return 'h-2';
  }
};

/**
 * プログレスバーコンポーネント
 *
 * 進捗値を視覚的に表示するコンポーネント。
 * 進捗値に応じた色分け、サイズバリエーション、ツールチップ機能を提供。
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'medium',
  showLabel = false,
  animated = true,
  colorScheme = 'default',
  customColors,
  tooltip,
  tooltipConfig,
  progressTooltip,
  className,
  'aria-label': ariaLabel,
  highContrast = false,
  colorBlindFriendly = false,
  onAchievement,
  onProgressChange,
  error,
  loading = false,
}) => {
  // アニメーション設定を取得
  const { isAnimationEnabled, getProgressTransitionStyle, settings } = useAnimationSettings();

  // エラー状態の処理
  const hasError = error?.hasError || false;
  const isCalculating = value === -1;
  const isErrorState = value === -2;
  const isNoData = value === 0 && hasError;

  // 進捗値の処理
  let displayValue: number;
  let displayText: string;

  if (loading) {
    displayValue = 0;
    displayText = '読み込み中...';
  } else if (isErrorState || hasError) {
    displayValue = 0;
    displayText = 'エラー';
  } else if (isCalculating) {
    displayValue = 0;
    displayText = '計算中...';
  } else if (isNoData) {
    displayValue = 0;
    displayText = 'データなし';
  } else {
    // 進捗値を0-100の範囲に制限
    displayValue = Math.max(0, Math.min(100, value));
    displayText = `${Math.round(displayValue)}%`;
  }

  // 前回の進捗値を追跡
  const previousValueRef = useRef<number>(displayValue);
  const [isAchieving, setIsAchieving] = useState(false);

  // 進捗変化とアチーブメント検出
  useEffect(() => {
    const previousValue = previousValueRef.current;

    // エラー状態や計算中の場合はアチーブメント処理をスキップ
    if (hasError || isCalculating || isErrorState || loading) {
      return;
    }

    // 進捗変化のコールバック
    if (previousValue !== displayValue && onProgressChange) {
      onProgressChange(displayValue, previousValue);
    }

    // 100%達成時の処理
    if (previousValue < 100 && displayValue === 100) {
      if (settings.achievementEnabled && isAnimationEnabled) {
        setIsAchieving(true);
        // アチーブメントアニメーション終了後にリセット
        setTimeout(() => {
          setIsAchieving(false);
        }, settings.achievementDuration);
      }

      if (onAchievement) {
        onAchievement();
      }
    }

    previousValueRef.current = displayValue;
  }, [
    displayValue,
    onAchievement,
    onProgressChange,
    settings.achievementEnabled,
    settings.achievementDuration,
    isAnimationEnabled,
    hasError,
    isCalculating,
    isErrorState,
    loading,
  ]);

  // ユーザー操作時のアニメーション中断処理
  const { interruptAnimation } = useAnimationSettings();

  const handleUserInteraction = () => {
    // 進捗アニメーションを中断（達成アニメーションは継続）
    if (animated && isAnimationEnabled) {
      interruptAnimation('progress-bar-transition');
    }
  };

  // 色とサイズのクラスを取得
  let progressColor: string;

  if (loading) {
    progressColor = 'bg-blue-300 animate-pulse';
  } else if (hasError || isErrorState) {
    progressColor = highContrast ? 'bg-red-700' : 'bg-red-500';
  } else if (isCalculating) {
    progressColor = 'bg-yellow-300 animate-pulse';
  } else {
    progressColor = getProgressColor(displayValue, colorScheme, highContrast, colorBlindFriendly);
  }

  const backgroundColor = getBackgroundColor(highContrast);
  const sizeClasses = getSizeClasses(size);

  // カスタム色の設定
  const getCustomFillColor = (): React.CSSProperties => {
    if (colorScheme !== 'custom' || !customColors) return {};

    // エラー状態の場合はカスタム色を適用しない
    if (hasError || isErrorState || loading || isCalculating) {
      return {};
    }

    // 進捗値別のカスタム色設定
    if (customColors.progressColors) {
      const { progressColors } = customColors;
      if (displayValue === 0 && progressColors.zero) {
        return { backgroundColor: progressColors.zero };
      }
      if (displayValue < 50 && progressColors.low) {
        return { backgroundColor: progressColors.low };
      }
      if (displayValue < 80 && progressColors.medium) {
        return { backgroundColor: progressColors.medium };
      }
      if (displayValue >= 80 && progressColors.high) {
        return { backgroundColor: progressColors.high };
      }
    }

    // 単一のカスタム色設定
    return customColors.fill ? { backgroundColor: customColors.fill } : {};
  };

  const customFillStyle = getCustomFillColor();
  const customBackgroundStyle =
    colorScheme === 'custom' && customColors?.background
      ? { backgroundColor: customColors.background }
      : {};

  // ツールチップの内容を決定
  let tooltipContent: React.ReactNode;

  if (hasError && error?.errorMessage) {
    tooltipContent = (
      <div>
        <div className="font-medium text-red-200">エラーが発生しました</div>
        <div className="text-sm text-red-100 mt-1">{error.errorMessage}</div>
        {error.showRetry && error.onRetry && (
          <button
            onClick={error.onRetry}
            className="text-xs text-red-100 underline mt-2 hover:text-white"
          >
            再試行
          </button>
        )}
      </div>
    );
  } else if (loading) {
    tooltipContent = '進捗データを読み込み中...';
  } else if (isCalculating) {
    tooltipContent = '進捗を計算中...';
  } else {
    tooltipContent = tooltipConfig?.content || tooltip || `進捗: ${displayText}`;
  }

  const shouldShowAdvancedTooltip = tooltipConfig !== undefined || hasError;
  const shouldShowProgressTooltip = progressTooltip !== undefined && !hasError && !loading;

  const progressBarElement = (
    <AchievementAnimation
      trigger={isAchieving}
      type="glow"
      intensity="normal"
      animationId={`progress-achievement-${Math.random()}`}
    >
      <div className={cn('w-full', className)}>
        {/* ラベル表示 */}
        {showLabel && (
          <div className="flex justify-between items-center mb-1">
            <span
              className={cn(
                'text-sm font-medium',
                colorScheme === 'custom' && customColors?.text
                  ? ''
                  : highContrast
                    ? 'text-gray-800'
                    : 'text-gray-700'
              )}
              style={
                colorScheme === 'custom' && customColors?.text ? { color: customColors.text } : {}
              }
            >
              進捗
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                hasError || isErrorState
                  ? 'text-red-600'
                  : isCalculating || loading
                    ? 'text-yellow-600'
                    : colorScheme === 'custom' && customColors?.text
                      ? ''
                      : highContrast
                        ? 'text-gray-900'
                        : 'text-gray-900'
              )}
              style={
                colorScheme === 'custom' &&
                customColors?.text &&
                !hasError &&
                !isErrorState &&
                !isCalculating &&
                !loading
                  ? { color: customColors.text }
                  : {}
              }
            >
              {displayText}
            </span>
          </div>
        )}

        {/* プログレスバー本体 */}
        <div
          className={cn('w-full rounded-full overflow-hidden', backgroundColor, sizeClasses)}
          style={customBackgroundStyle}
          role="progressbar"
          tabIndex={0}
          aria-valuenow={hasError || isErrorState ? undefined : displayValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={
            hasError
              ? `エラー: ${error?.errorMessage || '進捗の取得に失敗しました'}`
              : loading
                ? '進捗データを読み込み中'
                : isCalculating
                  ? '進捗を計算中'
                  : ariaLabel || `進捗 ${displayText}`
          }
          aria-describedby={hasError ? 'progress-error' : undefined}
          title={!shouldShowAdvancedTooltip ? tooltip : undefined}
          onMouseDown={handleUserInteraction}
          onTouchStart={handleUserInteraction}
          onKeyDown={handleUserInteraction}
        >
          <div
            className={cn(
              'h-full',
              progressColor,
              // アニメーション設定に基づいてトランジションを適用
              !isAnimationEnabled && 'transition-none'
            )}
            style={{
              width: loading || isCalculating ? '100%' : `${displayValue}%`,
              ...customFillStyle,
              // アニメーション設定からトランジションスタイルを取得
              ...(animated && isAnimationEnabled && !loading && !isCalculating
                ? getProgressTransitionStyle()
                : {}),
            }}
          />
        </div>
      </div>
    </AchievementAnimation>
  );

  // 進捗専用ツールチップが設定されている場合
  if (shouldShowProgressTooltip) {
    return (
      <ProgressTooltip
        currentValue={displayValue}
        previousValue={progressTooltip.previousValue}
        targetValue={progressTooltip.targetValue}
        completedTasks={progressTooltip.completedTasks}
        totalTasks={progressTooltip.totalTasks}
        lastUpdated={progressTooltip.lastUpdated}
        estimatedCompletion={progressTooltip.estimatedCompletion}
        customMessage={progressTooltip.customMessage}
        progressType={progressTooltip.progressType}
        showDetails={progressTooltip.showDetails}
        position={tooltipConfig?.position || 'top'}
        delay={tooltipConfig?.delay || 300}
        touchEnabled={tooltipConfig?.touchEnabled !== false}
      >
        {progressBarElement}
      </ProgressTooltip>
    );
  }

  // 高度なツールチップが設定されている場合はTooltipでラップ
  if (shouldShowAdvancedTooltip) {
    return (
      <Tooltip
        content={tooltipContent}
        position={tooltipConfig.position}
        delay={tooltipConfig.delay}
        touchEnabled={tooltipConfig.touchEnabled}
        theme="dark"
        animation={{ duration: 200, easing: 'ease-out', scale: true, fade: true }}
        touchConfig={{
          touchDelay: 100,
          hideDelay: 3000,
          longPressThreshold: 300,
          touchAreaExpansion: 8,
        }}
        progressInfo={{
          currentValue: displayValue,
          details: {
            lastUpdated: new Date(),
          },
        }}
      >
        {progressBarElement}
      </Tooltip>
    );
  }

  return progressBarElement;
};

export default ProgressBar;
