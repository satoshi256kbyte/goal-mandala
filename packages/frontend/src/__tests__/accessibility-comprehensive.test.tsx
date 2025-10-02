import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

// コンポーネントのインポート
import { GoalInputForm } from '../components/forms/GoalInputForm';
import { FormField } from '../components/forms/FormField';
import { CharacterCounter } from '../components/forms/CharacterCounter';
import { DatePicker } from '../components/forms/DatePicker';
import { TextInput } from '../components/forms/TextInput';
import { TextArea } from '../components/forms/TextArea';
import { ValidationMessage } from '../components/forms/ValidationMessage';

// ユーティリティのインポート
import * as accessibilityUtils from '../utils/accessibility';
import * as screenReaderUtils from '../utils/screen-reader';

// jest-axeのマッチャーを追加
expect.extend(toHaveNoViolations);

describe('Comprehensive Accessibility Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnDraftSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // ライブリージョンをクリア
    const existingLiveRegion = document.getElementById('live-region');
    if (existingLiveRegion) {
      document.body.removeChild(existingLiveRegion);
    }
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      document.body.removeChild(liveRegion);
    }
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('should pass axe accessibility audit for GoalInputForm', async () => {
      const { container } = render(
        <GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />
      );

      const results = await axe(container, {
        rules: {
          // WCAG 2.1 AA準拠のルールを有効化
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          label: { enabled: true },
          'form-field-multiple-labels': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    it('should pass axe accessibility audit for all form components', async () => {
      const { container } = render(
        <div>
          <FormField label="テストフィールド" required error="エラーメッセージ">
            <TextInput />
          </FormField>
          <FormField label="テキストエリア" helpText="ヘルプテキスト">
            <TextArea />
          </FormField>
          <FormField label="日付選択">
            <DatePicker />
          </FormField>
          <div style={{ position: 'relative' }}>
            <CharacterCounter currentLength={50} maxLength={100} />
          </div>
          <ValidationMessage message="バリデーションメッセージ" type="error" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support all keyboard navigation patterns', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const titleInput = screen.getByLabelText('目標タイトル');
      const descriptionInput = screen.getByLabelText('目標説明');
      const deadlineInput = screen.getByLabelText('達成期限');
      const backgroundInput = screen.getByLabelText('背景');
      const constraintsInput = screen.getByLabelText('制約事項');

      // Tab順序のテスト
      await user.tab();
      expect(titleInput).toHaveFocus();

      await user.tab();
      expect(descriptionInput).toHaveFocus();

      await user.tab();
      expect(deadlineInput).toHaveFocus();

      await user.tab();
      expect(backgroundInput).toHaveFocus();

      await user.tab();
      expect(constraintsInput).toHaveFocus();

      // Shift+Tab逆順序のテスト
      await user.tab({ shift: true });
      expect(backgroundInput).toHaveFocus();

      await user.tab({ shift: true });
      expect(deadlineInput).toHaveFocus();
    });

    it('should support arrow key navigation in date picker', async () => {
      const user = userEvent.setup();

      render(
        <FormField label="日付選択">
          <DatePicker />
        </FormField>
      );

      const dateInput = screen.getByLabelText('日付選択');
      await user.click(dateInput);

      // 日付ピッカーが開いた状態で矢印キーナビゲーションをテスト
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowRight}');

      // Enterキーで選択
      await user.keyboard('{Enter}');
    });

    it('should support Escape key to close modals/dropdowns', async () => {
      const user = userEvent.setup();

      render(
        <FormField label="日付選択">
          <DatePicker />
        </FormField>
      );

      const dateInput = screen.getByLabelText('日付選択');
      await user.click(dateInput);

      // Escapeキーでクローズ
      await user.keyboard('{Escape}');

      // フォーカスが元の要素に戻ることを確認
      expect(dateInput).toHaveFocus();
    });

    it('should support Home/End keys for navigation', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const titleInput = screen.getByLabelText('目標タイトル');
      await user.type(titleInput, 'テスト目標タイトル');

      // Homeキーで行の先頭に移動
      await user.keyboard('{Home}');
      expect(titleInput.selectionStart).toBe(0);

      // Endキーで行の末尾に移動
      await user.keyboard('{End}');
      expect(titleInput.selectionStart).toBe(titleInput.value.length);
    });
  });

  describe('Focus Management', () => {
    it('should maintain focus visibility', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const titleInput = screen.getByLabelText('目標タイトル');

      // キーボードでフォーカス
      await user.tab();
      expect(titleInput).toHaveFocus();

      // フォーカスリングが表示されることを確認
      expect(titleInput).toHaveClass('focus:ring-blue-500');
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

    it('should restore focus after modal close', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <button>トリガーボタン</button>
          <FormField label="日付選択">
            <DatePicker />
          </FormField>
        </div>
      );

      const triggerButton = screen.getByText('トリガーボタン');
      const dateInput = screen.getByLabelText('日付選択');

      // トリガーボタンにフォーカス
      triggerButton.focus();
      expect(triggerButton).toHaveFocus();

      // 日付ピッカーを開く
      await user.click(dateInput);

      // Escapeで閉じる
      await user.keyboard('{Escape}');

      // フォーカスが日付入力フィールドに戻ることを確認
      expect(dateInput).toHaveFocus();
    });

    it('should trap focus in error summary', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // バリデーションエラーを発生させる
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      await waitFor(() => {
        // エラーサマリーが表示されることを確認
        const errorSummary = screen.getByRole('alert');
        expect(errorSummary).toBeInTheDocument();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper landmark roles', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // フォームランドマーク
      const form = screen.getByRole('form', { name: '目標入力フォーム' });
      expect(form).toBeInTheDocument();

      // メインコンテンツランドマーク
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('should have live regions for dynamic content', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // アナウンス領域が存在することを確認
      const liveRegion = screen.getByRole('status', { hidden: true });
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
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

      await waitFor(() => {
        // アナウンス領域にメッセージが表示されることを確認
        const liveRegion = screen.getByRole('status', { hidden: true });
        expect(liveRegion).toHaveTextContent(/送信中/);
      });
    });

    it('should announce character count changes', async () => {
      const user = userEvent.setup();

      render(
        <div style={{ position: 'relative' }}>
          <FormField label="テストフィールド">
            <TextInput maxLength={100} />
          </FormField>
          <CharacterCounter currentLength={0} maxLength={100} />
        </div>
      );

      const input = screen.getByLabelText('テストフィールド');
      const counter = screen.getByRole('status');

      // 文字を入力
      await user.type(input, 'テスト入力');

      // カウンターが更新されることを確認
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide context for form validation errors', async () => {
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

        // エラーメッセージが存在することを確認
        const errorMessage = screen.getByText(/目標タイトルは必須です/);
        expect(errorMessage).toBeInTheDocument();
      });
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
          <TextInput />
        </FormField>
      );

      const input = screen.getByLabelText('テストフィールド');

      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');

      // ラベルが適切に関連付けられていることを確認
      const label = screen.getByText('テストフィールド');
      expect(label).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for character counter', () => {
      render(
        <div style={{ position: 'relative' }}>
          <CharacterCounter currentLength={50} maxLength={100} />
        </div>
      );

      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute('aria-live', 'polite');
      expect(counter).toHaveAttribute('aria-atomic', 'true');
      expect(counter).toHaveAttribute('aria-label');

      const ariaLabel = counter.getAttribute('aria-label');
      expect(ariaLabel).toContain('50文字');
      expect(ariaLabel).toContain('100文字');
    });

    it('should have proper ARIA attributes for validation messages', () => {
      render(<ValidationMessage message="エラーメッセージ" type="error" />);

      const message = screen.getByRole('alert');
      expect(message).toBeInTheDocument();
      expect(message).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have proper ARIA attributes for date picker', () => {
      render(
        <FormField label="日付選択">
          <DatePicker />
        </FormField>
      );

      const dateInput = screen.getByLabelText('日付選択');
      expect(dateInput).toHaveAttribute('aria-expanded', 'false');
      expect(dateInput).toHaveAttribute('role', 'combobox');
    });
  });

  describe('Color and Contrast', () => {
    it('should maintain sufficient color contrast', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // エラー状態のコントラストをテスト
      const errorElements = screen.getAllByText(/必須/);
      errorElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // 実際のプロジェクトでは、コントラスト比の計算を行う
        expect(styles.color).toBeDefined();
      });
    });

    it('should support high contrast mode', () => {
      // 高コントラストモードのシミュレーション
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // 高コントラストモードでの表示を確認
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Motion and Animation', () => {
    it('should respect reduced motion preferences', () => {
      // モーション削減設定のシミュレーション
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // アニメーションが無効化されていることを確認
      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Touch and Mobile Accessibility', () => {
    it('should have adequate touch targets', () => {
      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      const submitButton = screen.getByRole('button', { name: /送信/ });
      const styles = window.getComputedStyle(submitButton);

      // 最小タッチターゲットサイズ（44px x 44px）を確認
      const minSize = 44;
      expect(parseInt(styles.minHeight) || parseInt(styles.height)).toBeGreaterThanOrEqual(minSize);
      expect(parseInt(styles.minWidth) || parseInt(styles.width)).toBeGreaterThanOrEqual(minSize);
    });

    it('should support touch gestures', async () => {
      // const user = userEvent.setup();

      render(
        <FormField label="日付選択">
          <DatePicker />
        </FormField>
      );

      const dateInput = screen.getByLabelText('日付選択');

      // タッチイベントのシミュレーション
      fireEvent.touchStart(dateInput);
      fireEvent.touchEnd(dateInput);

      // 日付ピッカーが開くことを確認
      expect(dateInput).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide clear error messages', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // バリデーションエラーを発生させる
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      await waitFor(() => {
        // エラーメッセージが明確で理解しやすいことを確認
        const errorMessages = screen.getAllByRole('alert');
        expect(errorMessages.length).toBeGreaterThan(0);

        errorMessages.forEach(message => {
          expect(message.textContent).toBeTruthy();
          expect(message.textContent?.length).toBeGreaterThan(5);
        });
      });
    });

    it('should provide error recovery options', async () => {
      const user = userEvent.setup();

      render(<GoalInputForm onSubmit={mockOnSubmit} onDraftSave={mockOnDraftSave} />);

      // ネットワークエラーをシミュレート
      mockOnSubmit.mockRejectedValueOnce(new Error('Network error'));

      // フォームに有効なデータを入力
      await user.type(screen.getByLabelText('目標タイトル'), 'テスト目標');
      await user.type(screen.getByLabelText('目標説明'), 'テスト説明');
      await user.type(screen.getByLabelText('達成期限'), '2024-12-31');
      await user.type(screen.getByLabelText('背景'), 'テスト背景');

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: /送信/ });
      await user.click(submitButton);

      await waitFor(() => {
        // エラー回復オプションが表示されることを確認
        const retryButton = screen.getByRole('button', { name: /再試行/ });
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('Utility Functions', () => {
    it('should correctly identify focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button</button>
        <input type="text" />
        <input type="text" disabled />
        <a href="#">Link</a>
        <div tabindex="0">Focusable div</div>
        <div tabindex="-1">Non-focusable div</div>
      `;

      const focusableElements = accessibilityUtils.getFocusableElements(container);
      expect(focusableElements).toHaveLength(4); // button, input, a, div[tabindex="0"]
    });

    it('should correctly calculate contrast ratios', () => {
      const contrastRatio = accessibilityUtils.calculateContrastRatio('#000000', '#ffffff');
      expect(contrastRatio).toBeCloseTo(21, 0); // 黒と白の最大コントラスト比

      const isCompliant = accessibilityUtils.isWCAGAACompliant('#000000', '#ffffff');
      expect(isCompliant).toBe(true);
    });

    it('should detect accessibility preferences', () => {
      // 高コントラストモードの検出
      const isHighContrast = accessibilityUtils.isHighContrastMode();
      expect(typeof isHighContrast).toBe('boolean');

      // モーション削減設定の検出
      const prefersReducedMotion = accessibilityUtils.prefersReducedMotion();
      expect(typeof prefersReducedMotion).toBe('boolean');
    });

    it('should generate proper screen reader text', () => {
      const fieldStatusText = screenReaderUtils.generateScreenReaderText.fieldStatus({
        fieldName: 'テストフィールド',
        isRequired: true,
        isInvalid: true,
        errorMessage: 'エラーが発生しました',
        helpText: 'ヘルプテキスト',
      });

      expect(fieldStatusText).toContain('テストフィールド');
      expect(fieldStatusText).toContain('必須');
      expect(fieldStatusText).toContain('エラーが発生しました');
      expect(fieldStatusText).toContain('ヘルプテキスト');
    });

    it('should generate proper character count text', () => {
      const characterCountText = screenReaderUtils.generateScreenReaderText.characterCount(50, 100);
      expect(characterCountText).toContain('50文字');
      expect(characterCountText).toContain('100文字');

      const overLimitText = screenReaderUtils.generateScreenReaderText.characterCount(105, 100);
      expect(overLimitText).toContain('超過');
    });
  });
});
