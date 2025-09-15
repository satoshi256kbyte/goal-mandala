/**
 * アクセシビリティ関連のユーティリティ関数
 */

/**
 * 要素がフォーカス可能かどうかを判定
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return false;
  }

  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex === '-1') {
    return false;
  }

  const focusableSelectors = [
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  return focusableSelectors.some(selector => element.matches(selector));
};

/**
 * 要素内のフォーカス可能な要素を取得
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors))
    .filter((element): element is HTMLElement => element instanceof HTMLElement)
    .filter(isFocusable);
};

/**
 * 次のフォーカス可能な要素を取得
 */
export const getNextFocusableElement = (
  currentElement: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null => {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(currentElement);

  if (currentIndex === -1) return null;

  const nextIndex = (currentIndex + 1) % focusableElements.length;
  return focusableElements[nextIndex] || null;
};

/**
 * 前のフォーカス可能な要素を取得
 */
export const getPreviousFocusableElement = (
  currentElement: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null => {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(currentElement);

  if (currentIndex === -1) return null;

  const previousIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
  return focusableElements[previousIndex] || null;
};

/**
 * ARIA属性を安全に設定
 */
export const setAriaAttribute = (
  element: HTMLElement,
  attribute: string,
  value: string | boolean | null
): void => {
  if (value === null || value === undefined) {
    element.removeAttribute(attribute);
  } else {
    element.setAttribute(attribute, String(value));
  }
};

/**
 * スクリーンリーダー用のライブリージョンにメッセージを送信
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const liveRegion = document.getElementById('live-region') || createLiveRegion();
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.textContent = message;

  // メッセージをクリア（次のアナウンスのため）
  setTimeout(() => {
    if (liveRegion.textContent === message) {
      liveRegion.textContent = '';
    }
  }, 1000);
};

/**
 * ライブリージョンを作成
 */
const createLiveRegion = (): HTMLElement => {
  const liveRegion = document.createElement('div');
  liveRegion.id = 'live-region';
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  document.body.appendChild(liveRegion);
  return liveRegion;
};

/**
 * 色のコントラスト比を計算
 */
export const calculateContrastRatio = (color1: string, color2: string): number => {
  const getLuminance = (color: string): number => {
    // 簡易的な輝度計算（実際のプロジェクトではより正確な計算を使用）
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const sRGB = [r, g, b].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * WCAG AA準拠のコントラスト比をチェック
 */
export const isWCAGAACompliant = (
  foregroundColor: string,
  backgroundColor: string,
  isLargeText: boolean = false
): boolean => {
  const contrastRatio = calculateContrastRatio(foregroundColor, backgroundColor);
  const requiredRatio = isLargeText ? 3 : 4.5;
  return contrastRatio >= requiredRatio;
};

/**
 * 高コントラストモードの検出
 */
export const isHighContrastMode = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Windows高コントラストモードの検出
  if (window.matchMedia('(-ms-high-contrast: active)').matches) {
    return true;
  }

  // CSS prefers-contrast: high の検出
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    return true;
  }

  return false;
};

/**
 * 動きを減らす設定の検出
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * ダークモードの検出
 */
export const prefersDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * フォーカストラップの設定
 */
export const setupFocusTrap = (container: HTMLElement): (() => void) => {
  const focusableElements = getFocusableElements(container);

  if (focusableElements.length === 0) {
    return () => {}; // クリーンアップ関数
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // 初期フォーカス
  firstElement.focus();

  // クリーンアップ関数を返す
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * 要素が画面内に表示されているかチェック
 */
export const isElementVisible = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);

  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= viewHeight && rect.left <= viewWidth;
};

/**
 * 要素を画面内にスクロール
 */
export const scrollIntoViewIfNeeded = (element: HTMLElement): void => {
  if (!isElementVisible(element)) {
    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }
};

/**
 * キーボードイベントのハンドリング
 */
export const handleKeyboardNavigation = (
  event: KeyboardEvent,
  handlers: {
    onEnter?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onTab?: () => void;
    onShiftTab?: () => void;
  }
): void => {
  const { key, shiftKey } = event;

  switch (key) {
    case 'Enter':
      if (handlers.onEnter) {
        event.preventDefault();
        handlers.onEnter();
      }
      break;
    case 'Escape':
      if (handlers.onEscape) {
        event.preventDefault();
        handlers.onEscape();
      }
      break;
    case 'ArrowUp':
      if (handlers.onArrowUp) {
        event.preventDefault();
        handlers.onArrowUp();
      }
      break;
    case 'ArrowDown':
      if (handlers.onArrowDown) {
        event.preventDefault();
        handlers.onArrowDown();
      }
      break;
    case 'ArrowLeft':
      if (handlers.onArrowLeft) {
        event.preventDefault();
        handlers.onArrowLeft();
      }
      break;
    case 'ArrowRight':
      if (handlers.onArrowRight) {
        event.preventDefault();
        handlers.onArrowRight();
      }
      break;
    case 'Tab':
      if (shiftKey && handlers.onShiftTab) {
        handlers.onShiftTab();
      } else if (!shiftKey && handlers.onTab) {
        handlers.onTab();
      }
      break;
  }
};
