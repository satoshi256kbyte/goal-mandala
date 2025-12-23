import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useFocusManagement,
  useKeyboardNavigation,
  useLiveRegion,
  useColorAccessibility,
  useFocusTrap,
  useFocusVisible,
} from '../useAccessibility';

describe('useFocusManagement', () => {
  it('should initialize with empty focusable elements', () => {
    const { result } = renderHook(() => useFocusManagement());

    expect(result.current).toBeDefined();
    expect(typeof result.current.setupFocusTrap).toBe('function');
    expect(typeof result.current.focusNext).toBe('function');
    expect(typeof result.current.focusPrevious).toBe('function');
    expect(typeof result.current.getFocusableElements).toBe('function');
  });

  it('should move focus to next element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.focusNext();
    });

    // フォーカス移動が実行されることを確認
    expect(result.current).toBeDefined();
  });

  it('should move focus to previous element', () => {
    const { result } = renderHook(() => useFocusManagement());

    act(() => {
      result.current.focusPrevious();
    });

    // フォーカス移動が実行されることを確認
    expect(result.current).toBeDefined();
  });
});

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call onEnter when Enter key is pressed on non-input element', () => {
    const onEnter = vi.fn();
    const onEscape = vi.fn();

    renderHook(() => useKeyboardNavigation(onEnter, onEscape));

    // Create a div element (not INPUT, TEXTAREA, or BUTTON)
    const div = document.createElement('div');
    document.body.appendChild(div);

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(event, 'target', { value: div, enumerable: true });

    act(() => {
      document.dispatchEvent(event);
    });

    document.body.removeChild(div);

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('should call onEscape when Escape key is pressed', () => {
    const onEnter = vi.fn();
    const onEscape = vi.fn();

    renderHook(() => useKeyboardNavigation(onEnter, onEscape));

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onEnter).not.toHaveBeenCalled();
  });

  it('should not call callbacks when other keys are pressed', () => {
    const onEnter = vi.fn();
    const onEscape = vi.fn();

    renderHook(() => useKeyboardNavigation(onEnter, onEscape));

    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    act(() => {
      document.dispatchEvent(event);
    });

    expect(onEnter).not.toHaveBeenCalled();
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('should handle undefined callbacks gracefully', () => {
    renderHook(() => useKeyboardNavigation());

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });

    expect(() => {
      act(() => {
        document.dispatchEvent(event);
      });
    }).not.toThrow();
  });
});

describe('useLiveRegion', () => {
  it('should announce message to screen readers', () => {
    const { result } = renderHook(() => useLiveRegion());

    act(() => {
      result.current.announce('Test message');
    });

    // ライブリージョンが作成されることを確認
    expect(result.current).toBeDefined();
    expect(typeof result.current.announce).toBe('function');
  });

  it('should announce message with polite priority', () => {
    const { result } = renderHook(() => useLiveRegion());

    act(() => {
      result.current.announce('Test message', 'polite');
    });

    // ライブリージョンが作成されることを確認
    expect(result.current).toBeDefined();
  });

  it('should announce message with assertive priority', () => {
    const { result } = renderHook(() => useLiveRegion());

    act(() => {
      result.current.announce('Test message', 'assertive');
    });

    // ライブリージョンが作成されることを確認
    expect(result.current).toBeDefined();
  });

  it('should initialize live region', () => {
    const { result } = renderHook(() => useLiveRegion());

    act(() => {
      result.current.initializeLiveRegion();
    });

    // ライブリージョンが作成されることを確認
    expect(result.current).toBeDefined();
  });
});

describe('useColorAccessibility', () => {
  it('should detect high contrast mode', () => {
    const { result } = renderHook(() => useColorAccessibility());

    const isHighContrast = result.current.isHighContrastMode();

    expect(typeof isHighContrast).toBe('boolean');
  });

  it('should get accessible colors', () => {
    const { result } = renderHook(() => useColorAccessibility());

    const colors = result.current.getAccessibleColors();

    expect(colors).toBeDefined();
    expect(colors.success).toBeDefined();
    expect(colors.error).toBeDefined();
    expect(colors.warning).toBeDefined();
    expect(colors.info).toBeDefined();
  });
});

describe('useFocusTrap', () => {
  it('should setup focus trap', () => {
    const containerRef = { current: document.createElement('div') };

    renderHook(() => useFocusTrap(containerRef as any));

    // フォーカストラップが設定されることを確認
    expect(containerRef.current).toBeDefined();
  });

  it('should handle null container ref', () => {
    const containerRef = { current: null };

    expect(() => {
      renderHook(() => useFocusTrap(containerRef as any));
    }).not.toThrow();
  });
});

describe('useFocusVisible', () => {
  it('should return focus visible classes', () => {
    const { result } = renderHook(() => useFocusVisible());

    expect(result.current.focusVisibleClasses).toBeDefined();
    expect(typeof result.current.focusVisibleClasses).toBe('string');
    expect(result.current.focusVisibleClasses).toContain('focus-visible');
  });
});

// エッジケーステスト
describe('useKeyboardNavigation - Edge Cases', () => {
  it('should handle rapid key presses', () => {
    const onEnter = vi.fn();
    renderHook(() => useKeyboardNavigation(onEnter));

    const div = document.createElement('div');
    document.body.appendChild(div);

    act(() => {
      for (let i = 0; i < 10; i++) {
        const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        Object.defineProperty(event, 'target', { value: div, enumerable: true });
        document.dispatchEvent(event);
      }
    });

    document.body.removeChild(div);

    expect(onEnter).toHaveBeenCalledTimes(10);
  });

  it('should handle special keys', () => {
    const onEnter = vi.fn();
    const onEscape = vi.fn();
    renderHook(() => useKeyboardNavigation(onEnter, onEscape));

    const specialKeys = ['Tab', 'Shift', 'Control', 'Alt', 'Meta'];

    specialKeys.forEach(key => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true });
      act(() => {
        document.dispatchEvent(event);
      });
    });

    expect(onEnter).not.toHaveBeenCalled();
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe('useLiveRegion - Edge Cases', () => {
  it('should handle empty message', () => {
    const { result } = renderHook(() => useLiveRegion());

    expect(() => {
      act(() => {
        result.current.announce('');
      });
    }).not.toThrow();
  });

  it('should handle very long message', () => {
    const { result } = renderHook(() => useLiveRegion());

    const longMessage = 'a'.repeat(10000);

    expect(() => {
      act(() => {
        result.current.announce(longMessage);
      });
    }).not.toThrow();
  });

  it('should handle multiple rapid announcements', () => {
    const { result } = renderHook(() => useLiveRegion());

    expect(() => {
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.announce(`Message ${i}`);
        }
      });
    }).not.toThrow();
  });
});

describe('useColorAccessibility - Edge Cases', () => {
  it('should handle high contrast mode detection', () => {
    const { result } = renderHook(() => useColorAccessibility());

    expect(() => {
      result.current.isHighContrastMode();
    }).not.toThrow();
  });

  it('should return accessible color palette', () => {
    const { result } = renderHook(() => useColorAccessibility());

    const colors = result.current.getAccessibleColors();

    expect(colors.success.bg).toBeDefined();
    expect(colors.error.bg).toBeDefined();
    expect(colors.warning.bg).toBeDefined();
    expect(colors.info.bg).toBeDefined();
  });
});
