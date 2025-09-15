import { useEffect, useRef, useCallback } from 'react';

/**
 * フォーカス管理のためのカスタムフック
 */
export const useFocusManagement = () => {
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  /**
   * フォーカス可能な要素を取得
   */
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  /**
   * フォーカストラップの設定
   */
  const setupFocusTrap = useCallback(
    (container: HTMLElement) => {
      const focusableElements = getFocusableElements(container);
      focusableElementsRef.current = focusableElements;

      if (focusableElements.length === 0) return;

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

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    },
    [getFocusableElements]
  );

  /**
   * 次の要素にフォーカス
   */
  const focusNext = useCallback(() => {
    const currentIndex = focusableElementsRef.current.findIndex(
      element => element === document.activeElement
    );
    const nextIndex = (currentIndex + 1) % focusableElementsRef.current.length;
    focusableElementsRef.current[nextIndex]?.focus();
  }, []);

  /**
   * 前の要素にフォーカス
   */
  const focusPrevious = useCallback(() => {
    const currentIndex = focusableElementsRef.current.findIndex(
      element => element === document.activeElement
    );
    const previousIndex =
      currentIndex <= 0 ? focusableElementsRef.current.length - 1 : currentIndex - 1;
    focusableElementsRef.current[previousIndex]?.focus();
  }, []);

  return {
    setupFocusTrap,
    focusNext,
    focusPrevious,
    getFocusableElements,
  };
};

/**
 * キーボードナビゲーションのためのカスタムフック
 */
export const useKeyboardNavigation = (
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void,
  onArrowLeft?: () => void,
  onArrowRight?: () => void
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          if (
            onEnter &&
            event.target instanceof HTMLElement &&
            !['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)
          ) {
            event.preventDefault();
            onEnter();
          }
          break;
        case 'Escape':
          if (onEscape) {
            event.preventDefault();
            onEscape();
          }
          break;
        case 'ArrowUp':
          if (onArrowUp) {
            event.preventDefault();
            onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (onArrowDown) {
            event.preventDefault();
            onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (onArrowLeft) {
            event.preventDefault();
            onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (onArrowRight) {
            event.preventDefault();
            onArrowRight();
          }
          break;
      }
    },
    [onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return { handleKeyDown };
};

/**
 * スクリーンリーダー用のライブリージョン管理フック
 */
export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  /**
   * ライブリージョンの初期化
   */
  const initializeLiveRegion = useCallback(() => {
    if (liveRegionRef.current) return liveRegionRef.current;

    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-region';

    document.body.appendChild(liveRegion);
    liveRegionRef.current = liveRegion;

    return liveRegion;
  }, []);

  /**
   * ライブリージョンにメッセージを追加
   */
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const liveRegion = liveRegionRef.current || initializeLiveRegion();
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;

      // メッセージをクリア（次のアナウンスのため）
      setTimeout(() => {
        if (liveRegion.textContent === message) {
          liveRegion.textContent = '';
        }
      }, 1000);
    },
    [initializeLiveRegion]
  );

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (liveRegionRef.current) {
        document.body.removeChild(liveRegionRef.current);
        liveRegionRef.current = null;
      }
    };
  }, []);

  return { announce, initializeLiveRegion };
};

/**
 * 色覚対応のためのユーティリティ
 */
export const useColorAccessibility = () => {
  /**
   * 高コントラストモードの検出
   */
  const isHighContrastMode = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Windows高コントラストモードの検出
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    return mediaQuery.matches;
  }, []);

  /**
   * 色覚異常対応の色パレット
   */
  const getAccessibleColors = useCallback(() => {
    return {
      // 成功（緑の代替）
      success: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600',
      },
      // エラー（赤の代替）
      error: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        icon: 'text-orange-600',
      },
      // 警告（黄色の代替）
      warning: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        icon: 'text-purple-600',
      },
      // 情報（青）
      info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'text-blue-600',
      },
    };
  }, []);

  return {
    isHighContrastMode,
    getAccessibleColors,
  };
};

/**
 * フォーカス表示の改善
 */
export const useFocusVisible = () => {
  const focusVisibleClasses =
    'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none';

  return { focusVisibleClasses };
};
