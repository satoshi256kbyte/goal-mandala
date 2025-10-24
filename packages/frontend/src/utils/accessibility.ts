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
 * Announce message to screen readers
 */
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Focus management utilities
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
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(currentElement);
    return (focusableElements[currentIndex + 1] as HTMLElement) || null;
  },

  /**
   * Get previous focusable element
   */
  getPreviousFocusableElement: (currentElement: HTMLElement): HTMLElement | null => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(currentElement);
    return (focusableElements[currentIndex - 1] as HTMLElement) || null;
  },
};
