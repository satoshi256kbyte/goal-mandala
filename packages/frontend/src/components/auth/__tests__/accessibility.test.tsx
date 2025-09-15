/**
 * 認証コンポーネントのアクセシビリティテスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { LoginForm } from '../LoginForm';
import AuthLayout from '../AuthLayout';

// テスト用のラッパーコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('認証コンポーネントのアクセシビリティ', () => {
  describe('AuthLayout', () => {
    it('適切なセマンティック構造を持つ', () => {
      render(
        <TestWrapper>
          <AuthLayout title="テストタイトル" subtitle="テストサブタイトル">
            <div>テストコンテンツ</div>
          </AuthLayout>
        </TestWrapper>
      );

      // メインランドマークが存在する
      expect(screen.getByRole('main')).toBeInTheDocument();

      // 見出しが適切に設定されている
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('テストタイトル');
      expect(heading).toHaveAttribute('id', 'page-title');
    });
  });

  describe('LoginForm', () => {
    const mockOnSubmit = vi.fn();

    beforeEach(() => {
      mockOnSubmit.mockClear();
    });

    it('入力フィールドが適切にラベル付けされている', () => {
      render(
        <TestWrapper>
          <LoginForm onSubmit={mockOnSubmit} />
        </TestWrapper>
      );

      // メールアドレスフィールド
      const emailInput = screen.getByLabelText(/メールアドレス/);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');

      // パスワードフィールド
      const passwordInput = screen.getByLabelText(/パスワード/);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('エラーメッセージのアクセシビリティが適切', () => {
      render(
        <TestWrapper>
          <LoginForm onSubmit={mockOnSubmit} error="ログインに失敗しました" />
        </TestWrapper>
      );

      // エラーメッセージが表示される
      const errorContainer = screen.getByRole('alert');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer).toHaveAttribute('role', 'alert');
      expect(screen.getByText('ログインに失敗しました')).toBeInTheDocument();
    });
  });
});
