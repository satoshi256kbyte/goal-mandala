import React from 'react';
import { render, screen } from '@testing-library/react';
import { SafeText, SafeTextArea } from '../SafeText';

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

  describe('SafeTextArea Component', () => {
    it('should render multiline text with line breaks', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const { container } = render(<SafeTextArea value={multilineText} />);

      expect(container.textContent).toContain('Line 1');
      expect(container.textContent).toContain('Line 2');
      expect(container.textContent).toContain('Line 3');

      // br要素が存在することを確認
      const brElements = container.querySelectorAll('br');
      expect(brElements).toHaveLength(2);
    });

    it('should sanitize dangerous multiline content', () => {
      const dangerousContent = 'Safe Line 1\n<script>alert("xss")</script>\nSafe Line 2';
      const { container } = render(<SafeTextArea value={dangerousContent} />);

      expect(container.textContent).toContain('Safe Line 1');
      expect(container.textContent).toContain('Safe Line 2');
      expect(container.textContent).not.toContain('<script>');
    });

    it('should not preserve line breaks when disabled', () => {
      const multilineText = 'Line 1\nLine 2';
      const { container } = render(
        <SafeTextArea value={multilineText} preserveLineBreaks={false} />
      );

      // br要素が存在しないことを確認
      expect(container.querySelector('br')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<SafeTextArea value="Test" className="custom-textarea-class" />);

      const divElement = container.querySelector('div');
      expect(divElement).toHaveClass('custom-textarea-class');
    });

    it('should handle empty content', () => {
      const { container } = render(<SafeTextArea value="" />);
      // エラーが発生しないことを確認
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });
});
