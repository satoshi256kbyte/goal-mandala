import React, { useMemo } from 'react';

export interface ProgressCircleProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { width: 40, height: 40, strokeWidth: 3, fontSize: 'text-xs' },
  md: { width: 60, height: 60, strokeWidth: 4, fontSize: 'text-sm' },
  lg: { width: 80, height: 80, strokeWidth: 5, fontSize: 'text-base' },
} as const;

/**
 * ProgressCircle - 進捗率を円形で表示するコンポーネント
 *
 * @param progress - 進捗率（0-100）
 * @param size - サイズ（sm/md/lg）デフォルト: md
 * @param showLabel - ラベル表示の有無 デフォルト: true
 * @param className - 追加のCSSクラス
 *
 * 要件:
 * - 2.2: 進捗率が円形プログレスバーで視覚的に表示される
 * - 2.3: 進捗率が0-30%である THEN プログレスバーが赤色で表示される
 * - 2.4: 進捗率が31-70%である THEN プログレスバーが黄色で表示される
 * - 2.5: 進捗率が71-100%である THEN プログレスバーが緑色で表示される
 * - 15.1-15.5: パフォーマンス最適化（メモ化）
 */
const ProgressCircleComponent: React.FC<ProgressCircleProps> = ({
  progress,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  // 進捗率を0-100の範囲に制限（メモ化）
  const normalizedProgress = useMemo(() => Math.min(100, Math.max(0, progress)), [progress]);

  // 進捗率に応じた色を決定（メモ化）
  const progressColor = useMemo(() => {
    if (normalizedProgress <= 30) return 'stroke-red-500'; // 0-30%: 赤
    if (normalizedProgress <= 70) return 'stroke-yellow-500'; // 31-70%: 黄
    return 'stroke-green-500'; // 71-100%: 緑
  }, [normalizedProgress]);

  // サイズ設定（メモ化）
  const sizeConfig = useMemo(() => SIZE_CONFIG[size], [size]);
  const { width, height, strokeWidth, fontSize } = sizeConfig;

  // 円の半径と円周を計算（メモ化）
  const circleMetrics = useMemo(() => {
    const radius = (width - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;
    return { radius, circumference, strokeDashoffset };
  }, [width, strokeWidth, normalizedProgress]);

  const { radius, circumference, strokeDashoffset } = circleMetrics;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="progressbar"
      aria-valuenow={normalizedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`進捗率${normalizedProgress}%`}
    >
      <svg width={width} height={height} className="transform -rotate-90">
        {/* 背景円 */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          className="stroke-gray-200"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 進捗円 */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={radius}
          className={`${progressColor} transition-all duration-300`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {/* ラベル */}
      {showLabel && (
        <span className={`absolute ${fontSize} font-semibold text-gray-700`} aria-hidden="true">
          {Math.round(normalizedProgress)}%
        </span>
      )}
    </div>
  );
};

ProgressCircleComponent.displayName = 'ProgressCircle';

// メモ化されたコンポーネントをエクスポート
export const ProgressCircle = React.memo(ProgressCircleComponent);
