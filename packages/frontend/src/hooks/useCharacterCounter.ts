import { useState, useCallback } from 'react';

export interface UseCharacterCounterOptions {
  /** 最大文字数 */
  maxLength?: number;
  /** 初期値 */
  initialValue?: string;
  /** 文字数変更時のコールバック */
  onChange?: (length: number, value: string) => void;
  /** 制限到達時のコールバック */
  onLimitReached?: (value: string) => void;
  /** 警告しきい値（パーセンテージ）デフォルト: 80% */
  warningThreshold?: number;
}

export interface UseCharacterCounterReturn {
  /** 現在の文字数 */
  currentLength: number;
  /** 現在の値 */
  currentValue: string;
  /** 文字数更新関数 */
  updateLength: (value: string) => void;
  /** 制限に達しているかどうか */
  isAtLimit: boolean;
  /** 警告状態かどうか */
  isWarning: boolean;
  /** エラー状態かどうか */
  isError: boolean;
  /** 残り文字数 */
  remainingLength: number;
  /** 進捗パーセンテージ */
  percentage: number;
}

/**
 * 文字数カウンター機能を提供するカスタムフック
 *
 * 要件3の受入基準に対応:
 * - リアルタイムで文字数カウンターが更新される
 * - 文字数が制限の80%を超えると警告状態になる
 * - 文字数が制限を超えるとエラー状態になる
 * - 文字数制限に達すると制限処理を実行
 */
export const useCharacterCounter = (
  options: UseCharacterCounterOptions = {}
): UseCharacterCounterReturn => {
  const {
    maxLength = 0,
    initialValue = '',
    onChange,
    onLimitReached,
    warningThreshold = 80,
  } = options;

  const [currentLength, setCurrentLength] = useState(initialValue.length);
  const [currentValue, setCurrentValue] = useState(initialValue);

  // 文字数更新関数
  const updateLength = useCallback(
    (value: string) => {
      const newLength = value.length;

      // 制限チェック
      if (maxLength > 0 && newLength > maxLength) {
        // 制限を超える場合は制限値で切り詰める
        const truncatedValue = value.slice(0, maxLength);
        setCurrentValue(truncatedValue);
        setCurrentLength(maxLength);

        // 制限到達コールバック実行
        onLimitReached?.(truncatedValue);
        onChange?.(maxLength, truncatedValue);
        return;
      }

      // 通常の更新
      setCurrentValue(value);
      setCurrentLength(newLength);
      onChange?.(newLength, value);
    },
    [maxLength, onChange, onLimitReached]
  );

  // 計算値
  const isAtLimit = maxLength > 0 && currentLength >= maxLength;
  const percentage = maxLength > 0 ? (currentLength / maxLength) * 100 : 0;
  const isWarning = percentage >= warningThreshold && percentage < 100;
  const isError = percentage >= 100;
  const remainingLength = maxLength > 0 ? Math.max(0, maxLength - currentLength) : Infinity;

  // 初期値変更時の同期
  useEffect(() => {
    if (initialValue !== currentValue) {
      updateLength(initialValue);
    }
  }, [initialValue, currentValue, updateLength]);

  return {
    currentLength,
    currentValue,
    updateLength,
    isAtLimit,
    isWarning,
    isError,
    remainingLength,
    percentage,
  };
};
