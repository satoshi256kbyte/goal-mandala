/**
 * EnhancedErrorDisplayコンポーネントのテスト（簡易版）
 */

import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';

// 依存コンポーネントをモック
vi.mock('./ValidationMessage', () => ({
  ValidationMessage: () => null,
}));

vi.mock('./ErrorDisplay', () => ({
  InlineError: () => null,
  ErrorSummary: () => null,
}));

import { EnhancedErrorDisplay } from './EnhancedErrorDisplay';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EnhancedErrorDisplay', () => {
  it('エラーがない場合は何も表示しない', () => {
    const { container } = render(<EnhancedErrorDisplay />);

    expect(container.textContent).toBe('');
  });
});
