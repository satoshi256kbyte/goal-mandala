import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GoalInputForm } from '../components/forms/GoalInputForm';
import { FormField } from '../components/forms/FormField';
import { CharacterCounter } from '../components/forms/CharacterCounter';

// jest-axeのマッチャーを追加
expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnDraftSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GoalInputForm Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form role and aria-label', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const form = screen.getByRole('form', { name: '目標入力フォーム' });
      expect(form).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // フォームのラベルが適切に設定されていることを確認
      expect(screen.getByLabelText('目標タイトル')).toBeInTheDocument();
      expect(screen.getByLabelText('目標説明')).toBeInTheDocument();
      expect(screen.getByLabelText('達成期限')).toBeInTheDocument();
      expect(screen.getByLabelText('背景')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const titleInput = screen.getByLabelText('目標タイトル');
      const descriptionInput = screen.getByLabelText('目標説明');

      // Tabキーでフォーカス移動
      await user.tab();
      expect(titleInput).toHaveFocus();

      await user.tab();
      expect(descriptionInput).toHaveFocus();
    });

    it('should announce form submission status', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // フォームに有効なデータを入力
      await user.type(screen.getByLabelText('目標タイトル'), 'テスト目標');
      await user.type(screen.getByLabelText('目標説明'), 'テスト説明');
      await user.type(screen.getByLabelText('達成期限'), '2024-12-31');
      await user.type(screen.getByLabelText('背景'), 'テスト背景');

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      // アナウンス領域が存在することを確認
      const announcement = screen.getByRole('status', { hidden: true });
      expect(announcement).toBeInTheDocument();
    });

    it('should focus first error field on validation failure', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // 空のフォームを送信してバリデーションエラーを発生させる
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      await waitFor(() => {
        // 最初のエラーフィールドにフォーカスが移動することを確認
        const titleInput = screen.getByLabelText('目標タイトル');
        expect(titleInput).toHaveFocus();
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have proper error announcements', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // バリデーションエラーを発生させる
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      await waitFor(() => {
        // エラーサマリーがalertロールで表示されることを確認
        const errorSummary = screen.getByRole('alert');
        expect(errorSummary).toBeInTheDocument();
      });
    });
  });

  describe('FormField Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <FormField label="テストフィールド" required>
          <input type="text" />
        </FormField>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

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

    it('should have proper help text association', () => {
      render(
        <FormField label="テストフィールド" helpText="ヘルプテキスト">
          <input type="text" />
        </FormField>
      );

      const input = screen.getByLabelText('テストフィールド');
      expect(input).toHaveAttribute('aria-describedby');

      const helpText = screen.getByText('ヘルプテキスト');
      expect(helpText).toBeInTheDocument();
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
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={50} maxLength={100} />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

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

    it('should announce warning state', () => {
      render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={85} maxLength={100} />
        </div>
      );

      const counter = screen.getByRole('status');
      const ariaLabel = counter.getAttribute('aria-label');
      expect(ariaLabel).toContain('制限に近づいています');
    });

    it('should announce error state', () => {
      render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={105} maxLength={100} />
        </div>
      );

      const counter = screen.getByRole('status');
      const ariaLabel = counter.getAttribute('aria-label');
      expect(ariaLabel).toContain('制限を超過');
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
    it('should support Tab navigation through form fields', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const titleInput = screen.getByLabelText('目標タイトル');
      const descriptionInput = screen.getByLabelText('目標説明');
      const deadlineInput = screen.getByLabelText('達成期限');
      const backgroundInput = screen.getByLabelText('背景');

      // Tab順序をテスト
      await user.tab();
      expect(titleInput).toHaveFocus();

      await user.tab();
      expect(descriptionInput).toHaveFocus();

      await user.tab();
      expect(deadlineInput).toHaveFocus();

      await user.tab();
      expect(backgroundInput).toHaveFocus();
    });

    it('should support Shift+Tab for reverse navigation', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const titleInput = screen.getByLabelText('目標タイトル');
      const descriptionInput = screen.getByLabelText('目標説明');

      // 最初のフィールドにフォーカス
      titleInput.focus();
      expect(titleInput).toHaveFocus();

      // Tab で次のフィールドに移動
      await user.tab();
      expect(descriptionInput).toHaveFocus();

      // Shift+Tab で前のフィールドに戻る
      await user.tab({ shift: true });
      expect(titleInput).toHaveFocus();
    });

    it('should support Enter key for form submission', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // フォームに有効なデータを入力
      await user.type(screen.getByLabelText('目標タイトル'), 'テスト目標');
      await user.type(screen.getByLabelText('目標説明'), 'テスト説明');
      await user.type(screen.getByLabelText('達成期限'), '2024-12-31');
      await user.type(screen.getByLabelText('背景'), 'テスト背景');

      // Enterキーでフォーム送信
      await user.keyboard('{Enter}');

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper landmark roles', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });

    it('should have live regions for dynamic content', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // アナウンス領域が存在することを確認
      const liveRegion = screen.getByRole('status', { hidden: true });
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live');
    });

    it('should provide context for form validation', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // バリデーションエラーを発生させる
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      await waitFor(() => {
        // エラーメッセージが適切に関連付けられていることを確認
        const titleInput = screen.getByLabelText('目標タイトル');
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
        expect(titleInput).toHaveAttribute('aria-describedby');
      });
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus visibility', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const titleInput = screen.getByLabelText('目標タイトル');

      // フォーカスを設定
      await user.click(titleInput);
      expect(titleInput).toHaveFocus();

      // フォーカスリングが表示されることを確認（CSSクラスで判定）
      expect(titleInput).toHaveClass('focus:ring-blue-500');
    });

    it('should trap focus in error states', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // バリデーションエラーを発生させる
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      await waitFor(() => {
        // 最初のエラーフィールドにフォーカスが移動することを確認
        const titleInput = screen.getByLabelText('目標タイトル');
        expect(titleInput).toHaveFocus();
      });
    });
  });
});
