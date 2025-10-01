import React from 'react';
import { generateScreenReaderText, SR_ONLY_CLASS } from '../../utils/screen-reader';

export interface CharacterCounterProps {
  /** 現在の文字数 */
  currentLength: number;
  /** 最大文字数 */
  maxLength: number;
  /** カウンターの表示位置 */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** 追加のCSSクラス */
  className?: string;
  /** 警告しきい値（パーセンテージ）デフォルト: 80% */
  warningThreshold?: number;
  /** エラーしきい値（パーセンテージ）デフォルト: 100% */
  errorThreshold?: number;
}

/**
 * 文字数カウンターコンポーネント
 *
 * 要件3の受入基準に対応:
 * - リアルタイムで文字数カウンターが更新される
 * - 文字数が制限の80%を超えると警告色に変わる
 * - 文字数が制限を超えるとエラー色に変わる
 */
export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  currentLength,
  maxLength,
  position = 'bottom-right',
  className = '',
  warningThreshold = 80,
  errorThreshold = 100,
}) => {
  // パーセンテージ計算
  const percentage = maxLength > 0 ? (currentLength / maxLength) * 100 : 0;

  // 色の決定
  const getCounterColor = (): string => {
    if (percentage >= errorThreshold) {
      return 'text-red-600'; // エラー色
    }
    if (percentage >= warningThreshold) {
      return 'text-yellow-600'; // 警告色
    }
    return 'text-gray-500'; // 通常色
  };

  // 位置クラスの決定
  const getPositionClass = (): string => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-2 left-2';
      case 'top-right':
        return 'top-2 right-2';
      case 'top-left':
        return 'top-2 left-2';
      case 'bottom-right':
      default:
        return 'bottom-2 right-2';
    }
  };

  // アクセシビリティ用のaria-label
  const getAriaLabel = (): string => {
    const status =
      percentage >= errorThreshold
        ? '制限を超過'
        : percentage >= warningThreshold
          ? '制限に近づいています'
          : '入力可能';

    return `文字数: ${currentLength}文字 / ${maxLength}文字 (${status})`;
  };

  // スクリーンリーダー用のテキスト
  const screenReaderText = generateScreenReaderText.characterCount(currentLength, maxLength);

  return (
    <div
      className={`
        absolute text-xs font-medium select-none pointer-events-none
        ${getPositionClass()}
        ${getCounterColor()}
        ${className}
      `.trim()}
      aria-label={getAriaLabel()}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">
        {currentLength}/{maxLength}
      </span>
      <span className={SR_ONLY_CLASS}>{screenReaderText}</span>
    </div>
  );
};
