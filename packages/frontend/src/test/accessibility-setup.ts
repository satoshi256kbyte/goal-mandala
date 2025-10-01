import { vi } from 'vitest';
import { configure } from '@testing-library/react';
import 'jest-axe/extend-expect';

/**
 * アクセシビリティテスト用のセットアップファイル
 */

// React Testing Libraryの設定
configure({
  // アクセシビリティテストに適した設定
  testIdAttribute: 'data-testid',

  // スクリーンリーダー用の隠しテキストも検索対象に含める
  defaultHidden: false,

  // より長いタイムアウトを設定（アクセシビリティ機能の動作確認のため）
  asyncUtilTimeout: 5000,
});

// グローバルなモック設定
beforeEach(() => {
  // matchMediaのモック（メディアクエリテスト用）
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // IntersectionObserverのモック
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // ResizeObserverのモック
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // scrollIntoViewのモック
  Element.prototype.scrollIntoView = vi.fn();

  // getBoundingClientRectのモック
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 100,
    height: 100,
    top: 0,
    left: 0,
    bottom: 100,
    right: 100,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  }));

  // focusのモック
  HTMLElement.prototype.focus = vi.fn();
  HTMLElement.prototype.blur = vi.fn();

  // ライブリージョンのクリーンアップ
  const existingLiveRegion = document.getElementById('live-region');
  if (existingLiveRegion) {
    document.body.removeChild(existingLiveRegion);
  }
});

afterEach(() => {
  // テスト後のクリーンアップ
  document.body.innerHTML = '';

  // ライブリージョンのクリーンアップ
  const liveRegion = document.getElementById('live-region');
  if (liveRegion) {
    document.body.removeChild(liveRegion);
  }

  // モックのリセット
  vi.clearAllMocks();
});

// カスタムマッチャーの追加
expect.extend({
  toHaveFocus(element: HTMLElement) {
    const pass = document.activeElement === element;
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have focus`
          : `Expected element to have focus, but ${document.activeElement?.tagName || 'no element'} has focus`,
    };
  },

  toBeAccessible(element: HTMLElement) {
    // 基本的なアクセシビリティチェック
    const hasAriaLabel =
      element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby');
    const hasRole =
      element.hasAttribute('role') ||
      ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(element.tagName);

    const pass = hasAriaLabel || hasRole;

    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to be accessible`
          : `Expected element to be accessible (have aria-label, aria-labelledby, or semantic role)`,
    };
  },

  toHaveProperTabIndex(element: HTMLElement) {
    const tabIndex = element.getAttribute('tabindex');
    const isFocusable =
      ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(element.tagName) ||
      (tabIndex !== null && tabIndex !== '-1');

    const pass = isFocusable;

    return {
      pass,
      message: () =>
        pass ? `Expected element not to be focusable` : `Expected element to be focusable`,
    };
  },

  toHaveAriaAttribute(element: HTMLElement, attribute: string, expectedValue?: string) {
    const actualValue = element.getAttribute(attribute);
    const hasAttribute = actualValue !== null;

    let pass = hasAttribute;
    if (expectedValue !== undefined) {
      pass = actualValue === expectedValue;
    }

    return {
      pass,
      message: () => {
        if (expectedValue !== undefined) {
          return pass
            ? `Expected element not to have ${attribute}="${expectedValue}"`
            : `Expected element to have ${attribute}="${expectedValue}", but got "${actualValue}"`;
        } else {
          return pass
            ? `Expected element not to have ${attribute} attribute`
            : `Expected element to have ${attribute} attribute`;
        }
      },
    };
  },
});

// TypeScript用の型定義拡張
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface AsymmetricMatchersContaining {
      toHaveFocus(): void;
      toBeAccessible(): void;
      toHaveProperTabIndex(): void;
      toHaveAriaAttribute(attribute: string, expectedValue?: string): void;
    }
  }
}

// アクセシビリティテスト用のユーティリティ関数
export const createAccessibleElement = (
  tagName: string,
  attributes: Record<string, string> = {}
) => {
  const element = document.createElement(tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
};

export const createLiveRegion = (priority: 'polite' | 'assertive' = 'polite') => {
  const liveRegion = document.createElement('div');
  liveRegion.id = 'live-region';
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  document.body.appendChild(liveRegion);
  return liveRegion;
};

export const simulateKeyboardUser = () => {
  // キーボードユーザーをシミュレート
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
};

export const simulateMouseUser = () => {
  // マウスユーザーをシミュレート
  document.dispatchEvent(new MouseEvent('mousedown'));
};

// アクセシビリティテスト用の定数
export const ACCESSIBILITY_CONSTANTS = {
  MIN_TOUCH_TARGET_SIZE: 44,
  MIN_CONTRAST_RATIO_AA: 4.5,
  MIN_CONTRAST_RATIO_AA_LARGE: 3,
  MIN_CONTRAST_RATIO_AAA: 7,
  MIN_CONTRAST_RATIO_AAA_LARGE: 4.5,

  ARIA_ROLES: {
    BUTTON: 'button',
    TEXTBOX: 'textbox',
    COMBOBOX: 'combobox',
    LISTBOX: 'listbox',
    OPTION: 'option',
    DIALOG: 'dialog',
    ALERTDIALOG: 'alertdialog',
    ALERT: 'alert',
    STATUS: 'status',
    LOG: 'log',
    MARQUEE: 'marquee',
    TIMER: 'timer',
    PROGRESSBAR: 'progressbar',
    MAIN: 'main',
    NAVIGATION: 'navigation',
    BANNER: 'banner',
    CONTENTINFO: 'contentinfo',
    COMPLEMENTARY: 'complementary',
    FORM: 'form',
    SEARCH: 'search',
    REGION: 'region',
  },

  ARIA_PROPERTIES: {
    LABEL: 'aria-label',
    LABELLEDBY: 'aria-labelledby',
    DESCRIBEDBY: 'aria-describedby',
    EXPANDED: 'aria-expanded',
    SELECTED: 'aria-selected',
    CHECKED: 'aria-checked',
    DISABLED: 'aria-disabled',
    REQUIRED: 'aria-required',
    INVALID: 'aria-invalid',
    READONLY: 'aria-readonly',
    HIDDEN: 'aria-hidden',
    LIVE: 'aria-live',
    ATOMIC: 'aria-atomic',
    RELEVANT: 'aria-relevant',
    BUSY: 'aria-busy',
    MODAL: 'aria-modal',
    VALUENOW: 'aria-valuenow',
    VALUEMIN: 'aria-valuemin',
    VALUEMAX: 'aria-valuemax',
    VALUETEXT: 'aria-valuetext',
  },

  KEYBOARD_KEYS: {
    TAB: 'Tab',
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
  },
} as const;
