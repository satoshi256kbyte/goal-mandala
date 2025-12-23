import { useCallback, useEffect, useRef } from 'react';

/**
 * キーボードナビゲーション用のフック
 */
export const useKeyboardNavigation = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * フォーカス可能な要素を取得
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'input:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'a[href]:not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  /**
   * 次の要素にフォーカスを移動
   */
  const focusNext = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.findIndex(element => element === document.activeElement);

    if (currentIndex === -1) {
      // 現在フォーカスされている要素がない場合、最初の要素にフォーカス
      focusableElements[0]?.focus();
    } else if (currentIndex < focusableElements.length - 1) {
      // 次の要素にフォーカス
      focusableElements[currentIndex + 1]?.focus();
    } else {
      // 最後の要素の場合、最初の要素にフォーカス（循環）
      focusableElements[0]?.focus();
    }
  }, [getFocusableElements]);

  /**
   * 前の要素にフォーカスを移動
   */
  const focusPrevious = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.findIndex(element => element === document.activeElement);

    if (currentIndex === -1) {
      // 現在フォーカスされている要素がない場合、最後の要素にフォーカス
      focusableElements[focusableElements.length - 1]?.focus();
    } else if (currentIndex > 0) {
      // 前の要素にフォーカス
      focusableElements[currentIndex - 1]?.focus();
    } else {
      // 最初の要素の場合、最後の要素にフォーカス（循環）
      focusableElements[focusableElements.length - 1]?.focus();
    }
  }, [getFocusableElements]);

  /**
   * 最初の要素にフォーカス
   */
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusableElements[0]?.focus();
  }, [getFocusableElements]);

  /**
   * 最後の要素にフォーカス
   */
  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusableElements[focusableElements.length - 1]?.focus();
  }, [getFocusableElements]);

  /**
   * キーボードイベントハンドラー
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ctrl/Cmd + 矢印キーでのナビゲーション
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            focusNext();
            break;
          case 'ArrowUp':
            event.preventDefault();
            focusPrevious();
            break;
          case 'Home':
            event.preventDefault();
            focusFirst();
            break;
          case 'End':
            event.preventDefault();
            focusLast();
            break;
        }
      }

      // F6キーでフォーカス領域の切り替え
      if (event.key === 'F6') {
        event.preventDefault();
        if (event.shiftKey) {
          focusPrevious();
        } else {
          focusNext();
        }
      }

      // Escapeキーでフォーカスをクリア
      if (event.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
      }
    },
    [focusNext, focusPrevious, focusFirst, focusLast]
  );

  /**
   * キーボードイベントリスナーの設定
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    containerRef,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    getFocusableElements,
  };
};

/**
 * フォーカストラップ用のフック
 * モーダルやダイアログでフォーカスを内部に閉じ込める
 */
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // 初期フォーカスを設定
    firstElement?.focus();

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab（逆方向）
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab（順方向）
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
};

/**
 * スキップリンク用のフック
 */
export const useSkipLinks = () => {
  const skipLinksRef = useRef<HTMLElement>(null);

  const addSkipLink = useCallback((targetId: string, label: string) => {
    if (!skipLinksRef.current) return;

    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = label;
    skipLink.className =
      'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50';

    skipLinksRef.current.appendChild(skipLink);
  }, []);

  const removeSkipLink = useCallback((targetId: string) => {
    if (!skipLinksRef.current) return;

    const skipLink = skipLinksRef.current.querySelector(`a[href="#${targetId}"]`);
    if (skipLink) {
      skipLinksRef.current.removeChild(skipLink);
    }
  }, []);

  return {
    skipLinksRef,
    addSkipLink,
    removeSkipLink,
  };
};
