import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import MandalaChart from '../MandalaChart';

expect.extend(toHaveNoViolations);

vi.mock('../MandalaChart.css', () => ({}));

describe('MandalaChart Accessibility', () => {
  it('アクセシビリティ違反がない', async () => {
    const { container } = render(<MandalaChart goalId="test-goal" />);

    // axeによるアクセシビリティテスト
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('適切なARIA属性が設定されている', async () => {
    const { container } = render(<MandalaChart goalId="test-goal" />);

    // グリッドロールの確認
    const grid = container.querySelector('[role="grid"]');
    expect(grid).toBeInTheDocument();

    // グリッドセルロールの確認
    const gridcells = container.querySelectorAll('[role="gridcell"]');
    expect(gridcells.length).toBeGreaterThan(0);
  });

  it('キーボードナビゲーション用の属性が設定されている', () => {
    const { container } = render(<MandalaChart goalId="test-goal" />);

    // tabindex属性の確認
    const focusableElements = container.querySelectorAll('[tabindex="0"]');
    expect(focusableElements.length).toBeGreaterThan(0);
  });
});
