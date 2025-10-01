import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FormField } from '../components/forms/FormField';
import { CharacterCounter } from '../components/forms/CharacterCounter';

describe('Simple Accessibility Tests', () => {
  describe('FormField Accessibility', () => {
    it('should have proper label association', () => {
      render(
        <FormField label="テストフィールド" required>
          <input type="text" />
        </FormField>
      );

      const input = screen.getByLabelText('テストフィールド');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should have proper error association', () => {
      render(
        <FormField label="テストフィールド" error="エラーメッセージ">
          <input type="text" />
        </FormField>
      );

      const input = screen.getByLabelText('テストフィールド');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');

      const errorMessage = screen.getByText('エラーメッセージ');
      expect(errorMessage).toBeInTheDocument();
    });

    it('should indicate required fields properly', () => {
      render(
        <FormField label="必須フィールド" required>
          <input type="text" />
        </FormField>
      );

      // 必須マークが表示されることを確認
      const requiredIndicator = screen.getByLabelText('必須');
      expect(requiredIndicator).toBeInTheDocument();

      const input = screen.getByLabelText('必須フィールド');
      expect(input).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('CharacterCounter Accessibility', () => {
    it('should have proper live region for screen readers', () => {
      render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={50} maxLength={100} />
        </div>
      );

      const counter = screen.getByRole('status');
      expect(counter).toBeInTheDocument();
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide meaningful aria-label', () => {
      render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={50} maxLength={100} />
        </div>
      );

      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute('aria-label');

      const ariaLabel = counter.getAttribute('aria-label');
      expect(ariaLabel).toContain('50文字');
      expect(ariaLabel).toContain('100文字');
    });

    it('should have screen reader text', () => {
      render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={50} maxLength={100} />
        </div>
      );

      // スクリーンリーダー専用テキストが存在することを確認
      const srText = screen.getByText(/50文字入力済み/);
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass('sr-only');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Tab navigation', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <FormField label="フィールド1">
            <input type="text" />
          </FormField>
          <FormField label="フィールド2">
            <input type="text" />
          </FormField>
        </div>
      );

      const input1 = screen.getByLabelText('フィールド1');
      const input2 = screen.getByLabelText('フィールド2');

      // Tab順序をテスト
      await user.tab();
      expect(input1).toHaveFocus();

      await user.tab();
      expect(input2).toHaveFocus();
    });

    it('should support Shift+Tab for reverse navigation', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <FormField label="フィールド1">
            <input type="text" />
          </FormField>
          <FormField label="フィールド2">
            <input type="text" />
          </FormField>
        </div>
      );

      const input1 = screen.getByLabelText('フィールド1');
      const input2 = screen.getByLabelText('フィールド2');

      // 最初のフィールドにフォーカス
      input1.focus();
      expect(input1).toHaveFocus();

      // Tab で次のフィールドに移動
      await user.tab();
      expect(input2).toHaveFocus();

      // Shift+Tab で前のフィールドに戻る
      await user.tab({ shift: true });
      expect(input1).toHaveFocus();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper ARIA attributes for form fields', () => {
      render(
        <FormField
          label="テストフィールド"
          required
          error="エラーメッセージ"
          helpText="ヘルプテキスト"
        >
          <input type="text" />
        </FormField>
      );

      const input = screen.getByLabelText('テストフィールド');

      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('should have proper role attributes', () => {
      render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={50} maxLength={100} />
        </div>
      );

      const counter = screen.getByRole('status');
      expect(counter).toBeInTheDocument();
    });
  });
});
