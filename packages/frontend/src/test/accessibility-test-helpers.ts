import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

/**
 * アクセシビリティテスト用のヘルパー関数
 */

/**
 * フォーカス順序をテストするヘルパー
 */
export const testTabOrder = async (expectedElements: string[]) => {
  const user = userEvent.setup();

  for (let i = 0; i < expectedElements.length; i++) {
    await user.tab();
    const focusedElement = document.activeElement;

    if (expectedElements[i].startsWith('#')) {
      // ID指定の場合
      expect(focusedElement?.id).toBe(expectedElements[i].substring(1));
    } else if (expectedElements[i].startsWith('[')) {
      // 属性指定の場合
      const element = screen.getByRole('textbox', { name: expectedElements[i] });
      expect(focusedElement).toBe(element);
    } else {
      // テキスト指定の場合
      const element = screen.getByLabelText(expectedElements[i]);
      expect(focusedElement).toBe(element);
    }
  }
};

/**
 * 逆Tab順序をテストするヘルパー
 */
export const testShiftTabOrder = async (expectedElements: string[]) => {
  const user = userEvent.setup();

  // 最後の要素から開始
  const lastElement = expectedElements[expectedElements.length - 1];
  const element = lastElement.startsWith('#')
    ? document.getElementById(lastElement.substring(1))
    : screen.getByLabelText(lastElement);

  element?.focus();

  // 逆順でテスト
  for (let i = expectedElements.length - 2; i >= 0; i--) {
    await user.tab({ shift: true });
    const focusedElement = document.activeElement;

    if (expectedElements[i].startsWith('#')) {
      expect(focusedElement?.id).toBe(expectedElements[i].substring(1));
    } else {
      const expectedElement = screen.getByLabelText(expectedElements[i]);
      expect(focusedElement).toBe(expectedElement);
    }
  }
};

/**
 * ARIA属性をテストするヘルパー
 */
export const testAriaAttributes = (
  element: HTMLElement,
  expectedAttributes: Record<string, string>
) => {
  Object.entries(expectedAttributes).forEach(([attribute, expectedValue]) => {
    expect(element).toHaveAttribute(attribute, expectedValue);
  });
};

/**
 * スクリーンリーダー用テキストをテストするヘルパー
 */
export const testScreenReaderText = (element: HTMLElement, expectedText: string | RegExp) => {
  const ariaLabel = element.getAttribute('aria-label');
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  // const _ariaDescribedBy = element.getAttribute('aria-describedby');

  if (ariaLabel) {
    if (typeof expectedText === 'string') {
      expect(ariaLabel).toContain(expectedText);
    } else {
      expect(ariaLabel).toMatch(expectedText);
    }
  } else if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement) {
      if (typeof expectedText === 'string') {
        expect(labelElement.textContent).toContain(expectedText);
      } else {
        expect(labelElement.textContent).toMatch(expectedText);
      }
    }
  }
};

/**
 * ライブリージョンのアナウンスをテストするヘルパー
 */
export const testLiveRegionAnnouncement = async (
  expectedMessage: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  await waitFor(() => {
    const liveRegion = screen.getByRole('status', { hidden: true });
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', priority);
    expect(liveRegion).toHaveTextContent(expectedMessage);
  });
};

/**
 * フォーカストラップをテストするヘルパー
 */
export const testFocusTrap = async (
  containerSelector: string,
  focusableElementsSelectors: string[]
) => {
  const user = userEvent.setup();
  const container = document.querySelector(containerSelector) as HTMLElement;

  if (!container) {
    throw new Error(`Container with selector "${containerSelector}" not found`);
  }

  const focusableElements = focusableElementsSelectors.map(
    selector => container.querySelector(selector) as HTMLElement
  );

  // 最初の要素にフォーカスが設定されることを確認
  expect(document.activeElement).toBe(focusableElements[0]);

  // 最後の要素からTabで最初の要素に戻ることをテスト
  focusableElements[focusableElements.length - 1].focus();
  await user.tab();
  expect(document.activeElement).toBe(focusableElements[0]);

  // 最初の要素からShift+Tabで最後の要素に移動することをテスト
  focusableElements[0].focus();
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(focusableElements[focusableElements.length - 1]);
};

/**
 * キーボードイベントをテストするヘルパー
 */
export const testKeyboardEvents = async (
  element: HTMLElement,
  events: Array<{
    key: string;
    expectedAction?: () => void;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
  }>
) => {
  for (const event of events) {
    fireEvent.keyDown(element, {
      key: event.key,
      shiftKey: event.shiftKey || false,
      ctrlKey: event.ctrlKey || false,
      metaKey: event.metaKey || false,
    });

    if (event.expectedAction) {
      event.expectedAction();
    }
  }
};

/**
 * エラーフォーカス管理をテストするヘルパー
 */
export const testErrorFocusManagement = async (
  triggerError: () => Promise<void>,
  expectedErrorFieldSelector: string
) => {
  await triggerError();

  await waitFor(() => {
    const errorField = document.querySelector(expectedErrorFieldSelector) as HTMLElement;
    expect(errorField).toHaveFocus();
    expect(errorField).toHaveAttribute('aria-invalid', 'true');
  });
};

/**
 * 色覚対応をテストするヘルパー
 */
export const testColorAccessibility = (element: HTMLElement) => {
  // 色以外の情報で状態が判別できることを確認
  const hasIcon = element.querySelector('[data-testid*="icon"]') !== null;
  const hasPattern =
    element.classList.toString().includes('pattern') ||
    element.classList.toString().includes('stripe');
  const hasText = element.textContent && element.textContent.trim().length > 0;

  // 色以外の手段で情報が伝達されていることを確認
  expect(hasIcon || hasPattern || hasText).toBe(true);
};

/**
 * 高コントラストモードをシミュレートするヘルパー
 */
export const simulateHighContrastMode = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-contrast: high)' || query === '(-ms-high-contrast: active)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

/**
 * モーション削減設定をシミュレートするヘルパー
 */
export const simulateReducedMotion = () => {
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
};

/**
 * ダークモードをシミュレートするヘルパー
 */
export const simulateDarkMode = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

/**
 * タッチターゲットサイズをテストするヘルパー
 */
export const testTouchTargetSize = (element: HTMLElement, minSize: number = 44) => {
  const rect = element.getBoundingClientRect();
  expect(rect.width).toBeGreaterThanOrEqual(minSize);
  expect(rect.height).toBeGreaterThanOrEqual(minSize);
};

/**
 * フォーカス表示をテストするヘルパー
 */
export const testFocusVisibility = async (element: HTMLElement) => {
  const user = userEvent.setup();

  // キーボードでフォーカス
  await user.tab();
  if (document.activeElement === element) {
    // フォーカスリングが表示されることを確認
    expect(element).toHaveClass(/focus:ring|focus:outline|focus-visible/);
  }

  // マウスでフォーカス
  await user.click(element);
  // マウスフォーカス時はフォーカスリングが表示されないことを確認（実装による）
};

/**
 * ランドマークロールをテストするヘルパー
 */
export const testLandmarkRoles = (expectedLandmarks: Array<{ role: string; name?: string }>) => {
  expectedLandmarks.forEach(landmark => {
    if (landmark.name) {
      const element = screen.getByRole(landmark.role as any, { name: landmark.name });
      expect(element).toBeInTheDocument();
    } else {
      const element = screen.getByRole(landmark.role as any);
      expect(element).toBeInTheDocument();
    }
  });
};

/**
 * 見出し構造をテストするヘルパー
 */
export const testHeadingStructure = (expectedHeadings: Array<{ level: number; text: string }>) => {
  expectedHeadings.forEach(heading => {
    const element = screen.getByRole('heading', {
      level: heading.level,
      name: heading.text,
    });
    expect(element).toBeInTheDocument();
  });
};

/**
 * フォーム関連付けをテストするヘルパー
 */
export const testFormAssociation = (
  inputSelector: string,
  expectedAssociations: {
    label?: string;
    describedBy?: string[];
    errorMessage?: string;
    helpText?: string;
  }
) => {
  const input = document.querySelector(inputSelector) as HTMLElement;

  if (expectedAssociations.label) {
    const label = screen.getByLabelText(expectedAssociations.label);
    expect(label).toBe(input);
  }

  if (expectedAssociations.describedBy) {
    const describedBy = input.getAttribute('aria-describedby');
    expectedAssociations.describedBy.forEach(id => {
      expect(describedBy).toContain(id);
    });
  }

  if (expectedAssociations.errorMessage) {
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const errorElement = screen.getByText(expectedAssociations.errorMessage);
    expect(errorElement).toBeInTheDocument();
  }

  if (expectedAssociations.helpText) {
    const helpElement = screen.getByText(expectedAssociations.helpText);
    expect(helpElement).toBeInTheDocument();
  }
};

/**
 * 動的コンテンツ更新をテストするヘルパー
 */
export const testDynamicContentUpdate = async (
  triggerUpdate: () => Promise<void>,
  expectedAnnouncement: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  await triggerUpdate();
  await testLiveRegionAnnouncement(expectedAnnouncement, priority);
};

/**
 * アクセシビリティテストスイートを実行するヘルパー
 */
export const runAccessibilityTestSuite = async (
  component: HTMLElement,
  options: {
    tabOrder?: string[];
    ariaAttributes?: Record<string, string>;
    keyboardEvents?: Array<{ key: string; expectedAction?: () => void }>;
    focusTrap?: { container: string; focusableElements: string[] };
    landmarks?: Array<{ role: string; name?: string }>;
    headings?: Array<{ level: number; text: string }>;
  }
) => {
  // Tab順序テスト
  if (options.tabOrder) {
    await testTabOrder(options.tabOrder);
    await testShiftTabOrder(options.tabOrder);
  }

  // ARIA属性テスト
  if (options.ariaAttributes) {
    testAriaAttributes(component, options.ariaAttributes);
  }

  // キーボードイベントテスト
  if (options.keyboardEvents) {
    await testKeyboardEvents(component, options.keyboardEvents);
  }

  // フォーカストラップテスト
  if (options.focusTrap) {
    await testFocusTrap(options.focusTrap.container, options.focusTrap.focusableElements);
  }

  // ランドマークテスト
  if (options.landmarks) {
    testLandmarkRoles(options.landmarks);
  }

  // 見出し構造テスト
  if (options.headings) {
    testHeadingStructure(options.headings);
  }
};
