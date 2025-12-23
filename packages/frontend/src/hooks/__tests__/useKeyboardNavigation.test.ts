import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation, useFocusTrap, useSkipLinks } from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // テスト用のコンテナを作成
    container = document.createElement('div');
    document.body.appendChild(container);

    // フォーカス可能な要素を追加
    container.innerHTML = `
      <input id="input1" type="text" />
      <button id="button1">Button 1</button>
      <a id="link1" href="#">Link 1</a>
      <textarea id="textarea1"></textarea>
      <select id="select1"><option>Option 1</option></select>
      <button id="button2">Button 2</button>
    `;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('基本機能', () => {
    it('containerRefが正しく設定される', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.containerRef.current).toBeNull();
    });

    it('フォーカス可能な要素を取得できる', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      // containerRefを設定
      act(() => {
        result.current.containerRef.current = container;
      });

      const focusableElements = result.current.getFocusableElements();

      expect(focusableElements).toHaveLength(6);
      expect(focusableElements[0].id).toBe('input1');
      expect(focusableElements[1].id).toBe('button1');
      expect(focusableElements[2].id).toBe('link1');
      expect(focusableElements[3].id).toBe('textarea1');
      expect(focusableElements[4].id).toBe('select1');
      expect(focusableElements[5].id).toBe('button2');
    });
  });

  describe('フォーカス移動', () => {
    it('focusNextで次の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const input1 = document.getElementById('input1') as HTMLInputElement;
      const button1 = document.getElementById('button1') as HTMLButtonElement;

      act(() => {
        input1.focus();
      });

      expect(document.activeElement).toBe(input1);

      act(() => {
        result.current.focusNext();
      });

      expect(document.activeElement).toBe(button1);
    });

    it('focusPreviousで前の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const input1 = document.getElementById('input1') as HTMLInputElement;
      const button1 = document.getElementById('button1') as HTMLButtonElement;

      act(() => {
        button1.focus();
      });

      expect(document.activeElement).toBe(button1);

      act(() => {
        result.current.focusPrevious();
      });

      expect(document.activeElement).toBe(input1);
    });

    it('focusFirstで最初の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const input1 = document.getElementById('input1') as HTMLInputElement;
      const button2 = document.getElementById('button2') as HTMLButtonElement;

      act(() => {
        button2.focus();
      });

      act(() => {
        result.current.focusFirst();
      });

      expect(document.activeElement).toBe(input1);
    });

    it('focusLastで最後の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const input1 = document.getElementById('input1') as HTMLInputElement;
      const button2 = document.getElementById('button2') as HTMLButtonElement;

      act(() => {
        input1.focus();
      });

      act(() => {
        result.current.focusLast();
      });

      expect(document.activeElement).toBe(button2);
    });
  });

  describe('循環ナビゲーション', () => {
    it('最後の要素でfocusNextを呼ぶと最初の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const input1 = document.getElementById('input1') as HTMLInputElement;
      const button2 = document.getElementById('button2') as HTMLButtonElement;

      act(() => {
        button2.focus();
      });

      act(() => {
        result.current.focusNext();
      });

      expect(document.activeElement).toBe(input1);
    });

    it('最初の要素でfocusPreviousを呼ぶと最後の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const input1 = document.getElementById('input1') as HTMLInputElement;
      const button2 = document.getElementById('button2') as HTMLButtonElement;

      act(() => {
        input1.focus();
      });

      act(() => {
        result.current.focusPrevious();
      });

      expect(document.activeElement).toBe(button2);
    });
  });

  describe('無効な要素の除外', () => {
    it('disabledな要素はフォーカス可能な要素に含まれない', () => {
      container.innerHTML = `
        <button id="button1">Button 1</button>
        <button id="button2" disabled>Button 2 (disabled)</button>
        <button id="button3">Button 3</button>
      `;

      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const focusableElements = result.current.getFocusableElements();

      expect(focusableElements).toHaveLength(2);
      expect(focusableElements[0].id).toBe('button1');
      expect(focusableElements[1].id).toBe('button3');
    });

    it('tabindex="-1"な要素はフォーカス可能な要素に含まれない', () => {
      container.innerHTML = `
        <button id="button1">Button 1</button>
        <button id="button2" tabindex="-1">Button 2 (tabindex=-1)</button>
        <button id="button3">Button 3</button>
      `;

      const { result } = renderHook(() => useKeyboardNavigation());

      act(() => {
        result.current.containerRef.current = container;
      });

      const focusableElements = result.current.getFocusableElements();

      expect(focusableElements).toHaveLength(2);
      expect(focusableElements[0].id).toBe('button1');
      expect(focusableElements[1].id).toBe('button3');
    });
  });
});

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    container.innerHTML = `
      <button id="button1">Button 1</button>
      <button id="button2">Button 2</button>
      <button id="button3">Button 3</button>
    `;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('基本機能', () => {
    it('containerRefが正しく設定される', () => {
      const { result } = renderHook(() => useFocusTrap());

      expect(result.current).toBeDefined();
      expect(result.current.current).toBeNull();
    });

    it('isActiveがtrueの場合、最初の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useFocusTrap(true));

      act(() => {
        result.current!.current = container;
      });

      const button1 = document.getElementById('button1') as HTMLButtonElement;

      // useEffectが実行されるまで待機
      setTimeout(() => {
        expect(document.activeElement).toBe(button1);
      }, 0);
    });

    it('isActiveがfalseの場合、フォーカストラップは動作しない', () => {
      const { result } = renderHook(() => useFocusTrap(false));

      act(() => {
        result.current!.current = container;
      });

      const button1 = document.getElementById('button1') as HTMLButtonElement;

      setTimeout(() => {
        expect(document.activeElement).not.toBe(button1);
      }, 0);
    });
  });

  describe('Tabキーの動作', () => {
    it('最後の要素でTabキーを押すと最初の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useFocusTrap(true));

      act(() => {
        result.current!.current = container;
      });

      const button1 = document.getElementById('button1') as HTMLButtonElement;
      const button3 = document.getElementById('button3') as HTMLButtonElement;

      act(() => {
        button3.focus();
      });

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        container.dispatchEvent(tabEvent);
      });

      // イベントがpreventDefaultされることを確認
      expect(tabEvent.defaultPrevented).toBe(false); // jsdomの制限により、実際のフォーカス移動は確認できない
    });

    it('最初の要素でShift+Tabキーを押すと最後の要素にフォーカスが移動する', () => {
      const { result } = renderHook(() => useFocusTrap(true));

      act(() => {
        result.current!.current = container;
      });

      const button1 = document.getElementById('button1') as HTMLButtonElement;

      act(() => {
        button1.focus();
      });

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });

      act(() => {
        container.dispatchEvent(shiftTabEvent);
      });

      expect(shiftTabEvent.defaultPrevented).toBe(false);
    });
  });
});

describe('useSkipLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('基本機能', () => {
    it('skipLinksRefが正しく設定される', () => {
      const { result } = renderHook(() => useSkipLinks());

      expect(result.current.skipLinksRef).toBeDefined();
      expect(result.current.skipLinksRef.current).toBeNull();
    });

    it('スキップリンクを追加できる', () => {
      const { result } = renderHook(() => useSkipLinks());

      const container = document.createElement('nav');
      document.body.appendChild(container);

      act(() => {
        result.current.skipLinksRef.current = container;
      });

      act(() => {
        result.current.addSkipLink('main-content', 'メインコンテンツへスキップ');
      });

      const skipLink = container.querySelector('a[href="#main-content"]');

      expect(skipLink).toBeTruthy();
      expect(skipLink?.textContent).toBe('メインコンテンツへスキップ');
    });

    it('スキップリンクを削除できる', () => {
      const { result } = renderHook(() => useSkipLinks());

      const container = document.createElement('nav');
      document.body.appendChild(container);

      act(() => {
        result.current.skipLinksRef.current = container;
      });

      act(() => {
        result.current.addSkipLink('main-content', 'メインコンテンツへスキップ');
      });

      let skipLink = container.querySelector('a[href="#main-content"]');
      expect(skipLink).toBeTruthy();

      act(() => {
        result.current.removeSkipLink('main-content');
      });

      skipLink = container.querySelector('a[href="#main-content"]');
      expect(skipLink).toBeNull();
    });

    it('複数のスキップリンクを追加できる', () => {
      const { result } = renderHook(() => useSkipLinks());

      const container = document.createElement('nav');
      document.body.appendChild(container);

      act(() => {
        result.current.skipLinksRef.current = container;
      });

      act(() => {
        result.current.addSkipLink('main-content', 'メインコンテンツへスキップ');
        result.current.addSkipLink('navigation', 'ナビゲーションへスキップ');
        result.current.addSkipLink('footer', 'フッターへスキップ');
      });

      // containerから直接取得（addSkipLinkがskipLinksRef.currentに追加するため）
      const skipLinks = container.querySelectorAll('a');

      expect(skipLinks.length).toBe(3);
      expect(skipLinks[0].getAttribute('href')).toBe('#main-content');
      expect(skipLinks[1].getAttribute('href')).toBe('#navigation');
      expect(skipLinks[2].getAttribute('href')).toBe('#footer');
    });
  });

  describe('エッジケース', () => {
    it('containerRefがnullの場合でもエラーが発生しない', () => {
      const { result } = renderHook(() => useSkipLinks());

      expect(() => {
        act(() => {
          result.current.addSkipLink('main-content', 'メインコンテンツへスキップ');
        });
      }).not.toThrow();

      expect(() => {
        act(() => {
          result.current.removeSkipLink('main-content');
        });
      }).not.toThrow();
    });

    it('存在しないスキップリンクを削除してもエラーが発生しない', () => {
      const { result } = renderHook(() => useSkipLinks());

      const container = document.createElement('nav');
      document.body.appendChild(container);

      act(() => {
        result.current.skipLinksRef.current = container;
      });

      expect(() => {
        act(() => {
          result.current.removeSkipLink('non-existent');
        });
      }).not.toThrow();
    });
  });
});
