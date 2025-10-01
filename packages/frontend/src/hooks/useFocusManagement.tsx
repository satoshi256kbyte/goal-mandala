import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * フォーカス管理用のフック
 */
export const useFocusManagement = () => {
  const [focusedElementId, setFocusedElementId] = useState<string | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * 要素にフォーカスを設定
   */
  const setFocus = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      // 前のフォーカス要素を記録
      if (document.activeElement && document.activeElement !== element) {
        previousFocusRef.current = document.activeElement as HTMLElement;
      }

      element.focus();
      setFocusedElementId(elementId);
    }
  }, []);

  /**
   * 前のフォーカス要素に戻る
   */
  const restorePreviousFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      setFocusedElementId(null);
      previousFocusRef.current = null;
    }
  }, []);

  /**
   * フォーカスをクリア
   */
  const clearFocus = useCallback(() => {
    if (document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    setFocusedElementId(null);
  }, []);

  /**
   * エラー要素にフォーカスを設定
   */
  const focusFirstError = useCallback(() => {
    const errorElements = document.querySelectorAll('[aria-invalid="true"]');
    if (errorElements.length > 0) {
      const firstError = errorElements[0] as HTMLElement;
      firstError.focus();
      setFocusedElementId(firstError.id);
      return true;
    }
    return false;
  }, []);

  /**
   * フォーカス可能な要素を検索
   */
  const findFocusableElements = useCallback((container?: HTMLElement) => {
    const root = container || document;
    const focusableSelectors = [
      'input:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'a[href]:not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(root.querySelectorAll(focusableSelectors)) as HTMLElement[];
  }, []);

  return {
    focusedElementId,
    setFocus,
    restorePreviousFocus,
    clearFocus,
    focusFirstError,
    findFocusableElements,
  };
};

/**
 * フォーカス表示の管理フック
 */
export const useFocusVisible = () => {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;

    // キーボードイベントの検出
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ') {
        hadKeyboardEvent = true;
        setIsKeyboardUser(true);
      }
    };

    // マウスイベントの検出
    const handleMouseDown = () => {
      hadKeyboardEvent = false;
      setIsKeyboardUser(false);
    };

    // フォーカスイベントの処理
    const handleFocus = () => {
      if (hadKeyboardEvent) {
        setIsFocusVisible(true);
      }
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    // イベントリスナーの設定
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return {
    isFocusVisible,
    isKeyboardUser,
  };
};

/**
 * フォーカスリング（アウトライン）のスタイル管理
 */
export const useFocusRing = (isVisible?: boolean) => {
  const { isFocusVisible } = useFocusVisible();
  const shouldShowFocusRing = isVisible !== undefined ? isVisible : isFocusVisible;

  const focusRingClasses = shouldShowFocusRing
    ? 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    : 'focus:outline-none';

  return {
    focusRingClasses,
    shouldShowFocusRing,
  };
};

/**
 * アナウンス用のフック（スクリーンリーダー向け）
 */
export const useAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return;

    // 既存のメッセージをクリア
    announcementRef.current.textContent = '';

    // 少し遅延してからメッセージを設定（スクリーンリーダーが確実に読み上げるため）
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.setAttribute('aria-live', priority);
        announcementRef.current.textContent = message;
      }
    }, 100);
  }, []);

  const AnnouncementRegion = useCallback(() => {
    return <div ref={announcementRef} className="sr-only" aria-live="polite" aria-atomic="true" />;
  }, []);

  return {
    announce,
    AnnouncementRegion,
  };
};

/**
 * フォーカス順序の管理フック
 */
export const useFocusOrder = (elements: string[]) => {
  const currentIndexRef = useRef(0);

  const moveToNext = useCallback(() => {
    const nextIndex = (currentIndexRef.current + 1) % elements.length;
    const nextElement = document.getElementById(elements[nextIndex]);

    if (nextElement) {
      nextElement.focus();
      currentIndexRef.current = nextIndex;
    }
  }, [elements]);

  const moveToPrevious = useCallback(() => {
    const prevIndex =
      currentIndexRef.current === 0 ? elements.length - 1 : currentIndexRef.current - 1;
    const prevElement = document.getElementById(elements[prevIndex]);

    if (prevElement) {
      prevElement.focus();
      currentIndexRef.current = prevIndex;
    }
  }, [elements]);

  const moveToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < elements.length) {
        const element = document.getElementById(elements[index]);
        if (element) {
          element.focus();
          currentIndexRef.current = index;
        }
      }
    },
    [elements]
  );

  return {
    moveToNext,
    moveToPrevious,
    moveToIndex,
    currentIndex: currentIndexRef.current,
  };
};
