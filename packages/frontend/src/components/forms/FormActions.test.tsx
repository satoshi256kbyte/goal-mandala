/**
 * FormActionsコンポーネントのテスト（簡易版）
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { FormActions } from './FormActions';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('FormActions - 基本機能', () => {
  const mockFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
  };

  it('必須プロパティのみでレンダリングできる', () => {
    const { container } = render(<FormActions formData={mockFormData} isFormValid={true} />);

    expect(container.firstChild).toBeTruthy();
  });

  it('カスタムクラス名が適用される', () => {
    const { container } = render(
      <FormActions formData={mockFormData} isFormValid={true} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeTruthy();
  });
});
