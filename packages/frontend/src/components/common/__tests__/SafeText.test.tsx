import React from 'react';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/react';
import { SafeText } from '../SafeText';

import { vi } from 'vitest';

// console.warn をモック
const mockConsoleWarn = vi.fn();
console.warn = mockConsoleWarn;

describe('SafeText', () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
  });

  describe('SafeText Component', () => {
    it('should render safe text content', () => {
      render(<SafeText>Hello World</SafeText>);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should sanitize dangerous content', () => {
      const dangerousContent = '<script>alert("xss")</script>Safe Content';
      render(<SafeText>{dangerousContent}</SafeText>);

      expect(screen.getByText('Safe Content')).toBeInTheDocument();
      expect(screen.queryByText('<script>')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<SafeText className="custom-class">Test</SafeText>);
      const element = screen.getByText('Test');
      expect(element).toHaveClass('custom-class');
    });

    it('should render with custom HTML element', () => {
      render(<SafeText as="p">Paragraph content</SafeText>);
      const element = screen.getByText('Paragraph content');
      expect(element.tagName).toBe('P');
    });

    it('should log XSS attempts', () => {
      const maliciousContent = '<script>alert("xss")</script>';
      render(<SafeText source="test-component">{maliciousContent}</SafeText>);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'XSS attempt detected:',
        expect.objectContaining({
          source: 'test-component',
        })
      );
    });
  });
});
