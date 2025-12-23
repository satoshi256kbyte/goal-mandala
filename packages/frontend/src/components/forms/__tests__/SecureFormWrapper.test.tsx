/**
 * セキュアフォームラッパーコンポーネントのテスト（簡略版）
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SecureFormWrapper } from '../SecureFormWrapper';

// useFormSecurityフックをモック
vi.mock('../../../hooks/useFormSecurity', () => ({
  useFormSecurity: () => ({
    isAuthenticated: true,
    isValidating: false,
    securityErrors: [],
    securityWarnings: [],
    hasPermission: () => true,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('SecureFormWrapper', () => {
  it('コンポーネントが正しくレンダリングされる', () => {
    const { container } = render(
      <SecureFormWrapper>
        <div>Test Content</div>
      </SecureFormWrapper>
    );

    expect(container.querySelector('.secure-form-wrapper')).toBeInTheDocument();
  });
});
