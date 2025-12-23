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

describe('FormActions', () => {
  const mockFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
  };

  it('基本的なレンダリングが成功する', () => {
    const { container } = render(<FormActions formData={mockFormData} isFormValid={true} />);

    expect(container.firstChild).toBeTruthy();
  });

  it('無効なフォームでも表示できる', () => {
    const { container } = render(<FormActions formData={mockFormData} isFormValid={false} />);

    expect(container.firstChild).toBeTruthy();
  });
});
