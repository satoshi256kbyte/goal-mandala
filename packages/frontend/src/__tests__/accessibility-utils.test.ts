import { vi } from 'vitest';
import * as accessibilityUtils from '../utils/accessibility';
import * as screenReaderUtils from '../utils/screen-reader';

describe('Accessibility Utils Tests', () => {
  beforeEach(() => {
    // DOMをクリア
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // ライブリージョンをクリーンアップ
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      document.body.removeChild(liveRegion);
    }
  });

  describe('Focus Management Utils', () => {
    it('should identify focusable elements correctly', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button>Button</button>
        <input type="text" />
        <input type="text" disabled />
        <a href="#">Link</a>
        <div tabindex="0">Focusable div</div>
        <div tabindex="-1">Non-focusable div</div>
        <span>Non-focusable span</span>
      `;

      const focusableElements = accessibilityUtils.getFocusableElements(container);
      expect(focusableElements).toHaveLength(4); // button, input, a, div[tabindex="0"]

      // 各要素がフォーカス可能かテスト
      const button = container.querySelector('button') as HTMLElement;
      const enabledInput = container.querySelector('input:not([disabled])') as HTMLElement;
      const disabledInput = container.querySelector('input[disabled]') as HTMLElement;
      const link = container.querySelector('a') as HTMLElement;

      expect(accessibilityUtils.isFocusable(button)).toBe(true);
      expect(accessibilityUtils.isFocusable(enabledInput)).toBe(true);
      expect(accessibilityUtils.isFocusable(disabledInput)).toBe(false);
      expect(accessibilityUtils.isFocusable(link)).toBe(true);
    });

    it('should get next and previous focusable elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button id="btn1">Button 1</button>
        <button id="btn2">Button 2</button>
        <button id="btn3">Button 3</button>
      `;
      document.body.appendChild(container);

      const btn1 = document.getElementById('btn1') as HTMLElement;
      const btn2 = document.getElementById('btn2') as HTMLElement;
      const btn3 = document.getElementById('btn3') as HTMLElement;

      // 次の要素を取得
      const nextFromBtn1 = accessibilityUtils.getNextFocusableElement(btn1, container);
      expect(nextFromBtn1).toBe(btn2);

      // 前の要素を取得
      const prevFromBtn2 = accessibilityUtils.getPreviousFocusableElement(btn2, container);
      expect(prevFromBtn2).toBe(btn1);

      // 最後の要素から次の要素（最初に戻る）
      const nextFromBtn3 = accessibilityUtils.getNextFocusableElement(btn3, container);
      expect(nextFromBtn3).toBe(btn1);

      // 最初の要素から前の要素（最後に戻る）
      const prevFromBtn1 = accessibilityUtils.getPreviousFocusableElement(btn1, container);
      expect(prevFromBtn1).toBe(btn3);
    });
  });

  describe('ARIA Attributes Utils', () => {
    it('should set ARIA attributes safely', () => {
      const element = document.createElement('div');

      // 属性を設定
      accessibilityUtils.setAriaAttribute(element, 'aria-expanded', 'true');
      expect(element.getAttribute('aria-expanded')).toBe('true');

      accessibilityUtils.setAriaAttribute(element, 'aria-hidden', false);
      expect(element.getAttribute('aria-hidden')).toBe('false');

      // null値で属性を削除
      accessibilityUtils.setAriaAttribute(element, 'aria-expanded', null);
      expect(element.hasAttribute('aria-expanded')).toBe(false);
    });
  });

  describe('Live Region Utils', () => {
    it('should create and manage live region', () => {
      // ライブリージョンが存在しないことを確認
      expect(document.getElementById('live-region')).toBeNull();

      // メッセージをアナウンス（ライブリージョンが自動作成される）
      accessibilityUtils.announceToScreenReader('テストメッセージ', 'polite');

      const liveRegion = document.getElementById('live-region');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveTextContent('テストメッセージ');

      // 緊急メッセージをアナウンス
      accessibilityUtils.announceToScreenReader('緊急メッセージ', 'assertive');
      expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      expect(liveRegion).toHaveTextContent('緊急メッセージ');
    });

    it('should clear messages after timeout', async () => {
      vi.useFakeTimers();

      accessibilityUtils.announceToScreenReader('テストメッセージ');
      const liveRegion = document.getElementById('live-region');
      expect(liveRegion).toHaveTextContent('テストメッセージ');

      // 1秒後にメッセージがクリアされることを確認
      vi.advanceTimersByTime(1000);
      expect(liveRegion).toHaveTextContent('');

      vi.useRealTimers();
    });
  });

  describe('Color Contrast Utils', () => {
    it('should calculate contrast ratios correctly', () => {
      // 黒と白の最大コントラスト比
      const maxContrast = accessibilityUtils.calculateContrastRatio('#000000', '#ffffff');
      expect(maxContrast).toBeCloseTo(21, 0);

      // 同じ色のコントラスト比（最小値）
      const minContrast = accessibilityUtils.calculateContrastRatio('#ffffff', '#ffffff');
      expect(minContrast).toBeCloseTo(1, 0);

      // 中間的なコントラスト比
      const mediumContrast = accessibilityUtils.calculateContrastRatio('#000000', '#808080');
      expect(mediumContrast).toBeGreaterThan(1);
      expect(mediumContrast).toBeLessThan(21);
    });

    it('should check WCAG AA compliance', () => {
      // 高コントラスト（準拠）
      expect(accessibilityUtils.isWCAGAACompliant('#000000', '#ffffff')).toBe(true);
      expect(accessibilityUtils.isWCAGAACompliant('#000000', '#ffffff', true)).toBe(true);

      // 低コントラスト（非準拠）
      expect(accessibilityUtils.isWCAGAACompliant('#ffffff', '#f0f0f0')).toBe(false);

      // 大きなテキストの場合の基準
      expect(accessibilityUtils.isWCAGAACompliant('#666666', '#ffffff', true)).toBe(true);
      expect(accessibilityUtils.isWCAGAACompliant('#666666', '#ffffff', false)).toBe(false);
    });
  });

  describe('Accessibility Preferences Detection', () => {
    it('should detect high contrast mode', () => {
      // 通常モードのモック
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

      expect(accessibilityUtils.isHighContrastMode()).toBe(false);

      // 高コントラストモードのモック
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

      expect(accessibilityUtils.isHighContrastMode()).toBe(true);
    });

    it('should detect reduced motion preference', () => {
      // 通常モーションのモック
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

      expect(accessibilityUtils.prefersReducedMotion()).toBe(false);

      // モーション削減のモック
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

      expect(accessibilityUtils.prefersReducedMotion()).toBe(true);
    });

    it('should detect dark mode preference', () => {
      // ライトモードのモック
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

      expect(accessibilityUtils.prefersDarkMode()).toBe(false);

      // ダークモードのモック
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

      expect(accessibilityUtils.prefersDarkMode()).toBe(true);
    });
  });

  describe('Focus Trap Utils', () => {
    it('should setup focus trap', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <button id="first">First</button>
        <button id="middle">Middle</button>
        <button id="last">Last</button>
      `;
      document.body.appendChild(container);

      const cleanup = accessibilityUtils.setupFocusTrap(container);

      // 最初の要素にフォーカスが設定されることを確認
      const firstButton = document.getElementById('first');
      expect(document.activeElement).toBe(firstButton);

      // クリーンアップ関数が返されることを確認
      expect(typeof cleanup).toBe('function');

      // クリーンアップを実行
      cleanup();
    });

    it('should handle empty container', () => {
      const emptyContainer = document.createElement('div');
      document.body.appendChild(emptyContainer);

      const cleanup = accessibilityUtils.setupFocusTrap(emptyContainer);

      // クリーンアップ関数が返されることを確認
      expect(typeof cleanup).toBe('function');

      // エラーが発生しないことを確認
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('Element Visibility Utils', () => {
    it('should check ifelement isible', () => {
      const visibleElement = document.createElement('div');
      visibleElement.style.position = 'absolute';
      visibleElement.style.top = '0px';
      visibleElement.style.left = '0px';
      visibleElement.style.width = '100px';
      visibleElement.style.height = '100px';
      document.body.appendChild(visibleElement);

      // getBoundingClientRectをモック
      vi.spyOn(visibleElement, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      expect(accessibilityUtils.isElementVisible(visibleElement)).toBe(true);

      // 画面外の要素
      vi.spyOn(visibleElement, 'getBoundingClientRect').mockReturnValue({
        top: -200,
        left: -200,
        bottom: -100,
        right: -100,
        width: 100,
        height: 100,
        x: -200,
        y: -200,
        toJSON: () => ({}),
      });

      expect(accessibilityUtils.isElementVisible(visibleElement)).toBe(false);
    });

    it('should scroll element into view if needed', () => {
      const element = document.createElement('div');
      const scrollIntoViewMock = vi.fn();
      element.scrollIntoView = scrollIntoViewMock;

      // 要素が見えない場合のモック
      vi.spyOn(accessibilityUtils, 'isElementVisible').mockReturnValue(false);

      accessibilityUtils.scrollIntoViewIfNeeded(element);

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });

      // 要素が見える場合
      vi.spyOn(accessibilityUtils, 'isElementVisible').mockReturnValue(true);

      scrollIntoViewMock.mockClear();
      accessibilityUtils.scrollIntoViewIfNeeded(element);

      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation Utils', () => {
    it('should handle keyboard navigation events', () => {
      const handlers = {
        onEnter: vi.fn(),
        onEscape: vi.fn(),
        onArrowUp: vi.fn(),
        onArrowDown: vi.fn(),
        onArrowLeft: vi.fn(),
        onArrowRight: vi.fn(),
        onTab: vi.fn(),
        onShiftTab: vi.fn(),
      };

      // Enterキー
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefaultSpy = vi.spyOn(enterEvent, 'preventDefault');
      accessibilityUtils.handleKeyboardNavigation(enterEvent, handlers);
      expect(handlers.onEnter).toHaveBeenCalled();
      expect(preventDefaultSpy).toHaveBeenCalled();

      // Escapeキー
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      accessibilityUtils.handleKeyboardNavigation(escapeEvent, handlers);
      expect(handlers.onEscape).toHaveBeenCalled();

      // 矢印キー
      const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      accessibilityUtils.handleKeyboardNavigation(arrowUpEvent, handlers);
      expect(handlers.onArrowUp).toHaveBeenCalled();

      // Tabキー
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
      accessibilityUtils.handleKeyboardNavigation(tabEvent, handlers);
      expect(handlers.onTab).toHaveBeenCalled();

      // Shift+Tabキー
      const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true });
      accessibilityUtils.handleKeyboardNavigation(shiftTabEvent, handlers);
      expect(handlers.onShiftTab).toHaveBeenCalled();
    });
  });
});

describe('Screen Reader Utils Tests', () => {
  describe('ARIA Helpers', () => {
    it('should generate correct ARIA attributes', () => {
      expect(screenReaderUtils.ariaHelpers.expanded(true)).toEqual({
        'aria-expanded': 'true',
      });

      expect(screenReaderUtils.ariaHelpers.selected(false)).toEqual({
        'aria-selected': 'false',
      });

      expect(screenReaderUtils.ariaHelpers.disabled(true)).toEqual({
        'aria-disabled': 'true',
      });

      expect(screenReaderUtils.ariaHelpers.required(true)).toEqual({
        'aria-required': 'true',
      });

      expect(screenReaderUtils.ariaHelpers.invalid(true)).toEqual({
        'aria-invalid': 'true',
      });

      expect(screenReaderUtils.ariaHelpers.valueNow(50)).toEqual({
        'aria-valuenow': '50',
      });
    });
  });

  describe('Form Field ARIA', () => {
    it('should generate form field ARIA attributes', () => {
      const attributes = screenReaderUtils.getFormFieldAria({
        id: 'test-field',
        labelId: 'test-label',
        describedBy: ['help-text', 'error-message'],
        isRequired: true,
        isInvalid: true,
        isDisabled: false,
      });

      expect(attributes).toEqual({
        id: 'test-field',
        'aria-labelledby': 'test-label',
        'aria-describedby': 'help-text error-message',
        'aria-required': 'true',
        'aria-invalid': 'true',
      });
    });

    it('should handle optional attributes', () => {
      const attributes = screenReaderUtils.getFormFieldAria({
        id: 'simple-field',
      });

      expect(attributes).toEqual({
        id: 'simple-field',
      });
    });
  });

  describe('Progress ARIA', () => {
    it('should generate progress bar ARIA attributes', () => {
      const attributes = screenReaderUtils.getProgressAria({
        current: 75,
        max: 100,
        min: 0,
        label: 'ファイルアップロード進捗',
      });

      expect(attributes).toEqual({
        role: 'progressbar',
        'aria-valuenow': '75',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-label': 'ファイルアップロード進捗',
        'aria-valuetext': '75%',
      });
    });
  });

  describe('List ARIA', () => {
    it('should generate list ARIA attributes', () => {
      const { listAttributes, getItemAttributes } = screenReaderUtils.getListAria({
        totalItems: 5,
        currentIndex: 2,
        label: 'メニューリスト',
      });

      expect(listAttributes).toEqual({
        role: 'list',
        'aria-label': 'メニューリスト',
        'aria-activedescendant': 'item-2',
      });

      const itemAttributes = getItemAttributes(1);
      expect(itemAttributes).toEqual({
        role: 'listitem',
        id: 'item-1',
        'aria-posinset': '2',
        'aria-setsize': '5',
      });
    });
  });

  describe('Dialog ARIA', () => {
    it('should generate dialog ARIA attributes', () => {
      const attributes = screenReaderUtils.getDialogAria({
        titleId: 'dialog-title',
        descriptionId: 'dialog-description',
        isModal: true,
      });

      expect(attributes).toEqual({
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'dialog-title',
        'aria-describedby': 'dialog-description',
      });
    });

    it('should handle alert dialog', () => {
      const attributes = screenReaderUtils.getDialogAria({
        isModal: false,
      });

      expect(attributes).toEqual({
        role: 'alertdialog',
        'aria-modal': 'false',
      });
    });
  });

  describe('Live Region ARIA', () => {
    it('should generate live region ARIA attributes', () => {
      const attributes = screenReaderUtils.getLiveRegionAria({
        politeness: 'assertive',
        atomic: false,
        relevant: ['additions', 'text'],
      });

      expect(attributes).toEqual({
        'aria-live': 'assertive',
        'aria-atomic': 'false',
        'aria-relevant': 'additions text',
      });
    });

    it('should use default values', () => {
      const attributes = screenReaderUtils.getLiveRegionAria({});

      expect(attributes).toEqual({
        'aria-live': 'polite',
        'aria-atomic': 'true',
      });
    });
  });

  describe('Screen Reader Text Generation', () => {
    it('should generate field status text', () => {
      const text = screenReaderUtils.generateScreenReaderText.fieldStatus({
        fieldName: 'メールアドレス',
        isRequired: true,
        isInvalid: true,
        errorMessage: '有効なメールアドレスを入力してください',
        helpText: '例: user@example.com',
      });

      expect(text).toBe(
        'メールアドレス（必須）。例: user@example.com。エラー：有効なメールアドレスを入力してください'
      );
    });

    it('should generate character count text', () => {
      const normalText = screenReaderUtils.generateScreenReaderText.characterCount(50, 100);
      expect(normalText).toBe('50文字入力済み。最大100文字です。');

      const warningText = screenReaderUtils.generateScreenReaderText.characterCount(95, 100);
      expect(warningText).toBe('残り5文字です。');

      const overLimitText = screenReaderUtils.generateScreenReaderText.characterCount(105, 100);
      expect(overLimitText).toBe('文字数が5文字超過しています。最大100文字です。');
    });

    it('should generate form status text', () => {
      expect(screenReaderUtils.generateScreenReaderText.formStatus('idle')).toBe('');
      expect(screenReaderUtils.generateScreenReaderText.formStatus('submitting')).toBe(
        'フォームを送信中です。しばらくお待ちください。'
      );
      expect(screenReaderUtils.generateScreenReaderText.formStatus('success')).toBe(
        'フォームが正常に送信されました。'
      );
      expect(
        screenReaderUtils.generateScreenReaderText.formStatus('error', 'ネットワークエラー')
      ).toBe('フォームの送信中にエラーが発生しました。ネットワークエラー');
    });

    it('should generate validation status text', () => {
      expect(screenReaderUtils.generateScreenReaderText.validationStatus(true, false)).toBe(
        '入力内容は正常です。'
      );
      expect(screenReaderUtils.generateScreenReaderText.validationStatus(false, false)).toBe(
        '入力内容にエラーがあります。'
      );
      expect(screenReaderUtils.generateScreenReaderText.validationStatus(false, true)).toBe(
        '入力内容を確認中です。'
      );
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should provide keyboard shortcut descriptions', () => {
      expect(screenReaderUtils.keyboardShortcuts.navigation).toContain('Tab: 次の要素に移動');
      expect(screenReaderUtils.keyboardShortcuts.navigation).toContain(
        'Escape: ダイアログを閉じる'
      );

      expect(screenReaderUtils.keyboardShortcuts.form).toContain('Ctrl + Enter: フォームを送信');
      expect(screenReaderUtils.keyboardShortcuts.form).toContain('Ctrl + S: 下書きを保存');
    });
  });

  describe('Landmarks', () => {
    it('should provide landmark definitions', () => {
      expect(screenReaderUtils.landmarks.main).toEqual({
        role: 'main',
        'aria-label': 'メインコンテンツ',
      });

      expect(screenReaderUtils.landmarks.navigation).toEqual({
        role: 'navigation',
        'aria-label': 'ナビゲーション',
      });

      expect(screenReaderUtils.landmarks.form).toEqual({
        role: 'form',
        'aria-label': 'フォーム',
      });
    });
  });
});
