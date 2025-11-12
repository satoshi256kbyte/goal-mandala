import { waitFor } from '@testing-library/react';

/**
 * 効率的なwaitForヘルパー - デフォルトで短いタイムアウト
 */
export const fastWaitFor = async (
  callback: () => void | Promise<void>,
  options: { timeout?: number } = {}
): Promise<void> => {
  return waitFor(callback, { timeout: 100, ...options });
};

/**
 * 即座に条件をチェックし、満たされない場合のみ短時間待機
 */
export const quickCheck = async (
  callback: () => void | Promise<void>,
  maxAttempts: number = 3
): Promise<void> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await callback();
      return;
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
};

/**
 * DOM要素の存在を効率的にチェック
 */
export const expectElementExists = (element: HTMLElement | null): void => {
  if (!element) {
    throw new Error('Element not found');
  }
};

/**
 * 非同期処理なしでの状態チェック
 */
export const syncCheck = (condition: () => boolean, message?: string): void => {
  if (!condition()) {
    throw new Error(message || 'Condition not met');
  }
};
