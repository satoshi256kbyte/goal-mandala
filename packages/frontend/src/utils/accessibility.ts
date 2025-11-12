/**
 * Generate unique ID for form fields
 */
export const generateId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get ARIA attributes for form field
 */
export const getFieldAriaAttributes = (
  fieldId: string,
  error?: string,
  required?: boolean,
  describedBy?: string
) => {
  const attributes: Record<string, any> = {
    id: fieldId,
    'aria-required': required || false,
    'aria-invalid': !!error,
  };

  const describedByIds: string[] = [];

  if (error) {
    describedByIds.push(`${fieldId}-error`);
  }

  if (describedBy) {
    describedByIds.push(describedBy);
  }

  if (describedByIds.length > 0) {
    attributes['aria-describedby'] = describedByIds.join(' ');
  }

  return attributes;
};

/**
 * Get ARIA attributes for error message
 */
export const getErrorAriaAttributes = (fieldId: string) => {
  return {
    id: `${fieldId}-error`,
    role: 'alert',
    'aria-live': 'polite' as const,
  };
};

/**
 * Get all focusable elements within a container
 */
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector));
};

/**
 * Check if an element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (!element) return false;

  // Check if element is disabled
  if (element.hasAttribute('disabled')) return false;

  // Check tabindex
  const tabindex = element.getAttribute('tabindex');
  if (tabindex === '-1') return false;

  // Check if element is naturally focusable
  const focusableTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
  if (focusableTags.includes(element.tagName)) {
    return true;
  }

  // Check if element has tabindex >= 0
  return tabindex !== null && parseInt(tabindex) >= 0;
};

/**
 * Get next focusable element
 */
export const getNextFocusableElement = (
  currentElement: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null => {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(currentElement);

  if (currentIndex === -1) return null;

  // Wrap around to first element
  return focusableElements[(currentIndex + 1) % focusableElements.length] || null;
};

/**
 * Get previous focusable element
 */
export const getPreviousFocusableElement = (
  currentElement: HTMLElement,
  container: HTMLElement = document.body
): HTMLElement | null => {
  const focusableElements = getFocusableElements(container);
  const currentIndex = focusableElements.indexOf(currentElement);

  if (currentIndex === -1) return null;

  // Wrap around to last element
  return (
    focusableElements[(currentIndex - 1 + focusableElements.length) % focusableElements.length] ||
    null
  );
};

/**
 * Set ARIA attribute safely
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
 * Announce message to screen readers with live region
 */
let liveRegion: HTMLElement | null = null;

export const announceToScreenReader = (
  message: string,
  politeness: 'polite' | 'assertive' = 'polite'
): void => {
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }

  liveRegion.setAttribute('aria-live', politeness);
  liveRegion.textContent = message;

  // Clear message after 1 second
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = '';
    }
  }, 1000);
};

/**
 * Calculate contrast ratio between two colors
 */
const getLuminance = (color: string): number => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Calculate relative luminance
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
};

export const calculateContrastRatio = (foreground: string, background: string): number => {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if color combination meets WCAG AA standards
 */
export const isWCAGAACompliant = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Detect high contrast mode
 */
export const isHighContrastMode = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Detect reduced motion preference
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Detect dark mode preference
 */
export const prefersDarkMode = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Setup focus trap within a container
 */
export const setupFocusTrap = (container: HTMLElement): (() => void) => {
  const focusableElements = getFocusableElements(container);

  if (focusableElements.length === 0) {
    return () => {};
  }

  // Focus first element
  focusableElements[0]?.focus();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Check if element is visible
 */
export const isElementVisible = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

/**
 * Scroll element into view if needed
 */
export const scrollIntoViewIfNeeded = (element: HTMLElement): void => {
  if (!isElementVisible(element)) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }
};

/**
 * Handle keyboard navigation events
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
      event.preventDefault();
      handlers.onEnter?.();
      break;
    case 'Escape':
      event.preventDefault();
      handlers.onEscape?.();
      break;
    case 'ArrowUp':
      event.preventDefault();
      handlers.onArrowUp?.();
      break;
    case 'ArrowDown':
      event.preventDefault();
      handlers.onArrowDown?.();
      break;
    case 'ArrowLeft':
      event.preventDefault();
      handlers.onArrowLeft?.();
      break;
    case 'ArrowRight':
      event.preventDefault();
      handlers.onArrowRight?.();
      break;
    case 'Tab':
      if (shiftKey) {
        handlers.onShiftTab?.();
      } else {
        handlers.onTab?.();
      }
      break;
  }
};

/**
 * Focus management utilities (legacy support)
 */
export const focusManagement = {
  /**
   * Set focus to element with error handling
   */
  setFocus: (element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  },

  /**
   * Get next focusable element
   */
  getNextFocusableElement: (currentElement: HTMLElement): HTMLElement | null => {
    return getNextFocusableElement(currentElement);
  },

  /**
   * Get previous focusable element
   */
  getPreviousFocusableElement: (currentElement: HTMLElement): HTMLElement | null => {
    return getPreviousFocusableElement(currentElement);
  },
};
