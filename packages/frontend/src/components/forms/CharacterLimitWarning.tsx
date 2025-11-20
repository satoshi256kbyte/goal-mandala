import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface CharacterLimitWarningProps {
  /** 現在の文字数 */
  currentLength: number;
  /** 最大文字数 */
  maxLength: number;
  /** 警告しきい値（パーセンテージ）デフォルト: 80% */
  warningThreshold?: number;
  /** 警告メッセージをカスタマイズ */
  warningMessage?: string;
  /** エラーメッセージをカスタマイズ */
  errorMessage?: string;
  /** 表示位置 */
  position?: 'inline' | 'tooltip';
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * 文字数制限警告コンポーネント
 *
 * 要件3の受入基準に対応:
 * - 文字数が制限の80%を超えると警告色に変わる
 * - 文字数が制限を超えるとエラー色に変わる
 */
export const CharacterLimitWarning: React.FC<CharacterLimitWarningProps> = ({
  currentLength,
  maxLength,
  warningThreshold = 80,
  warningMessage,
  errorMessage,
  position = 'inline',
  className = '',
}) => {
  // パーセンテージ計算
  const percentage = maxLength > 0 ? (currentLength / maxLength) * 100 : 0;

  // 状態判定
  const isError = percentage >= 100;
  const isWarning = percentage >= warningThreshold && !isError;

  // 表示しない場合
  if (!isWarning && !isError) {
    return null;
  }

  // メッセージの決定
  const getMessage = (): string => {
    if (isError) {
      return errorMessage || `文字数制限を超えています（${currentLength - maxLength}文字超過）`;
    }
    if (isWarning) {
      const remaining = maxLength - currentLength;
      return warningMessage || `残り${remaining}文字です`;
    }
    return '';
  };

  // アイコンの決定
  const getIcon = () => {
    if (isError) {
      return <XCircleIcon className="w-4 h-4 flex-shrink-0" />;
    }
    if (isWarning) {
      return <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />;
    }
    return null;
  };

  // スタイルクラスの決定
  const getStyleClasses = (): string => {
    const baseClasses = 'flex items-center gap-1 text-xs font-medium';

    if (position === 'tooltip') {
      const tooltipClasses = `
        absolute z-10 px-2 py-1 rounded-md shadow-lg
        border backdrop-blur-sm
      `;

      if (isError) {
        return `${baseClasses} ${tooltipClasses} bg-red-50 text-red-700 border-red-200`;
      }
      if (isWarning) {
        return `${baseClasses} ${tooltipClasses} bg-yellow-50 text-yellow-700 border-yellow-200`;
      }
    }

    // inline の場合
    if (isError) {
      return `${baseClasses} text-red-600`;
    }
    if (isWarning) {
      return `${baseClasses} text-yellow-600`;
    }

    return baseClasses;
  };

  // アクセシビリティ用のaria-label
  const getAriaLabel = (): string => {
    if (isError) {
      return `エラー: ${getMessage()}`;
    }
    if (isWarning) {
      return `警告: ${getMessage()}`;
    }
    return '';
  };

  return (
    <div
      className={`${getStyleClasses()} ${className}`.trim()}
      role="alert"
      aria-label={getAriaLabel()}
      aria-live="polite"
    >
      {getIcon()}
      <span>{getMessage()}</span>
    </div>
  );
};
