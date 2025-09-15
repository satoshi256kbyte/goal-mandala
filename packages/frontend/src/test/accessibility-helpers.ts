/**
 * アクセシビリティテスト用のヘルパー関数
 */

import { within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/**
 * フォーカス可能な要素を取得するヘルパー
 */
export const getFocusableElements = (container?: HTMLElement) => {
  const root = container || document.body;
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(root.querySelectorAll(focusableSelectors)) as HTMLElement[];
};

/**
 * キーボードナビゲーションのテストヘルパー
 */
export const testKeyboardNavigation = async (user: ReturnType<typeof userEvent.setup>) => {
  const focusableElements = getFocusableElements();

  if (focusableElements.length === 0) {
    throw new Error('No focusable elements found');
  }

  // 最初の要素にフォーカス
  focusableElements[0].focus();
  expect(document.activeElement).toBe(focusableElements[0]);

  // Tabキーで順次フォーカス移動
  for (let i = 1; i < focusableElements.length; i++) {
    await user.tab();
    expect(document.activeElement).toBe(focusableElements[i]);
  }

  // 最後の要素から最初の要素にループ
  await user.tab();
  expect(document.activeElement).toBe(focusableElements[0]);

  // Shift+Tabで逆方向のナビゲーション
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1]);
};

/**
 * ARIA属性のテストヘルパー
 */
export const testAriaAttributes = (
  element: HTMLElement,
  expectedAttributes: Record<string, string>
) => {
  Object.entries(expectedAttributes).forEach(([attribute, expectedValue]) => {
    const actualValue = element.getAttribute(attribute);
    expect(actualValue).toBe(expectedValue);
  });
};

/**
 * スクリーンリーダー用のテキストをテスト
 */
export const testScreenReaderText = (element: HTMLElement, expectedText: string) => {
  // aria-label をチェック
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    expect(ariaLabel).toContain(expectedText);
    return;
  }

  // aria-labelledby をチェック
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    expect(labelElement?.textContent).toContain(expectedText);
    return;
  }

  // 関連するlabel要素をチェック
  if (element.id) {
    const labelElement = document.querySelector(`label[for="${element.id}"]`);
    if (labelElement) {
      expect(labelElement.textContent).toContain(expectedText);
      return;
    }
  }

  // 要素自体のテキストをチェック
  expect(element.textContent).toContain(expectedText);
};

/**
 * フォーカス表示のテストヘルパー
 */
export const testFocusVisible = async (
  element: HTMLElement,
  user: ReturnType<typeof userEvent.setup>
) => {
  // フォーカスを当てる
  await user.tab();

  // フォーカスが当たっていることを確認
  expect(document.activeElement).toBe(element);

  // フォーカスリングが表示されていることを確認（CSSクラスまたはスタイル）
  const computedStyle = window.getComputedStyle(element);
  const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '';
  const hasBoxShadow = computedStyle.boxShadow !== 'none' && computedStyle.boxShadow !== '';

  expect(hasOutline || hasBoxShadow).toBe(true);
};

/**
 * エラーメッセージのアクセシビリティテスト
 */
export const testErrorMessageAccessibility = (inputElement: HTMLElement, errorMessage: string) => {
  // aria-invalid が設定されていることを確認
  expect(inputElement.getAttribute('aria-invalid')).toBe('true');

  // aria-describedby が設定されていることを確認
  const ariaDescribedBy = inputElement.getAttribute('aria-describedby');
  expect(ariaDescribedBy).toBeTruthy();

  // エラーメッセージ要素が存在することを確認
  if (ariaDescribedBy) {
    const errorElement = document.getElementById(ariaDescribedBy);
    expect(errorElement).toBeInTheDocument();
    expect(errorElement?.textContent).toContain(errorMessage);

    // role="alert" が設定されていることを確認
    expect(errorElement?.getAttribute('role')).toBe('alert');
  }
};

/**
 * フォームのアクセシビリティテスト
 */
export const testFormAccessibility = (formElement: HTMLElement) => {
  // フォームにrole="form"またはaria-labelが設定されていることを確認
  const hasFormRole = formElement.getAttribute('role') === 'form';
  const hasAriaLabel = formElement.getAttribute('aria-label');
  const hasAriaLabelledBy = formElement.getAttribute('aria-labelledby');

  expect(hasFormRole || hasAriaLabel || hasAriaLabelledBy).toBe(true);

  // 必須フィールドが適切にマークされていることを確認
  const requiredInputs = within(formElement).getAllByRole('textbox', { required: true });
  requiredInputs.forEach(input => {
    expect(input.getAttribute('required')).toBe('');
    expect(input.getAttribute('aria-required')).toBe('true');
  });
};

/**
 * ボタンのアクセシビリティテスト
 */
export const testButtonAccessibility = async (
  buttonElement: HTMLElement,
  user: ReturnType<typeof userEvent.setup>
) => {
  // ボタンがフォーカス可能であることを確認
  expect(buttonElement.tabIndex).not.toBe(-1);

  // Enterキーで実行できることを確認
  buttonElement.focus();
  const clickHandler = vi.fn();
  buttonElement.addEventListener('click', clickHandler);

  await user.keyboard('{Enter}');
  expect(clickHandler).toHaveBeenCalled();

  // Spaceキーで実行できることを確認
  clickHandler.mockClear();
  await user.keyboard(' ');
  expect(clickHandler).toHaveBeenCalled();
};

/**
 * ライブリージョンのテストヘルパー
 */
export const testLiveRegion = (
  expectedMessage: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  const liveRegion = document.getElementById('live-region');
  expect(liveRegion).toBeInTheDocument();
  expect(liveRegion?.getAttribute('aria-live')).toBe(priority);
  expect(liveRegion?.textContent).toContain(expectedMessage);
};

/**
 * 色覚対応のテストヘルパー
 */
export const testColorAccessibility = (element: HTMLElement) => {
  const computedStyle = window.getComputedStyle(element);

  // 色だけでなく、他の視覚的手がかりがあることを確認
  // （アイコン、テキスト、ボーダーなど）
  const hasIcon = element.querySelector('svg, .icon') !== null;
  const hasDistinctiveBorder = computedStyle.borderWidth !== '0px';
  const hasDistinctiveBackground = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)';

  // 少なくとも一つの視覚的手がかりがあることを確認
  expect(hasIcon || hasDistinctiveBorder || hasDistinctiveBackground).toBe(true);
};

/**
 * 高コントラストモードのテストヘルパー
 */
export const testHighContrastMode = (element: HTMLElement) => {
  // 高コントラストモードをシミュレート
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-contrast: high)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // 高コントラストモード用のスタイルが適用されることを確認
  const computedStyle = window.getComputedStyle(element);

  // ボーダーが太くなることを確認
  expect(parseInt(computedStyle.borderWidth)).toBeGreaterThanOrEqual(2);
};

/**
 * 動きを減らす設定のテストヘルパー
 */
export const testReducedMotion = () => {
  // prefers-reduced-motion をシミュレート
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // アニメーションが無効化されることを確認
  const animatedElements = document.querySelectorAll('.animate-spin, .transition-all');
  animatedElements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    expect(computedStyle.animationDuration).toBe('0.01ms');
  });
};
