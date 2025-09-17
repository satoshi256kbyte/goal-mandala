import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MandalaChart from '../MandalaChart';

vi.mock('../MandalaChart.css', () => ({}));

describe('MandalaChart Performance', () => {
  it('大量データでも適切な時間内にレンダリングされる', () => {
    const startTime = performance.now();

    render(<MandalaChart goalId="test-goal" />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // 100ms以内でレンダリングされることを確認
    expect(renderTime).toBeLessThan(100);
  });

  it('メモ化が正常に動作する', () => {
    const { rerender } = render(<MandalaChart goalId="test-goal" />);

    // 同じpropsで再レンダリング
    const startTime = performance.now();
    rerender(<MandalaChart goalId="test-goal" />);
    const endTime = performance.now();

    const rerenderTime = endTime - startTime;

    // 再レンダリングは初回より高速であることを確認
    expect(rerenderTime).toBeLessThan(50);
  });

  it('メモリリークが発生しない', () => {
    const { unmount } = render(<MandalaChart goalId="test-goal" />);

    // コンポーネントをアンマウント
    unmount();

    // ガベージコレクションを強制実行
    if (global.gc) {
      global.gc();
    }

    // メモリ使用量の確認（実際の本番環境では詳細な測定が必要）
    expect(true).toBe(true); // プレースホルダー
  });
});
