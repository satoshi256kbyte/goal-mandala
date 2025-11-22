import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import {
  sanitizeHtml,
  sanitizeForDisplay,
  isSafeUrl,
  generateCSPHeader,
  createSafeHtml,
  sanitizeFormValue,
  isSafeEventHandler,
  detectXSSAttempt,
  logXSSAttempt,
} from '../xss-protection';

import { vi } from 'vitest';

// console.warn をモック
const mockConsoleWarn = vi.fn();
console.warn = mockConsoleWarn;

describe('XSS Protection', () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
  });

  describe('sanitizeHtml', () => {
    it('should remove dangerous script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(input, ['p']);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should remove dangerous attributes', () => {
      const input = '<p onclick="alert(1)">Content</p>';
      const result = sanitizeHtml(input, ['p']);
      expect(result).not.toContain('onclick');
      expect(result).toContain('<p>Content</p>');
    });

    it('should allow specified tags only', () => {
      const input = '<p>Paragraph</p><div>Div</div><script>alert(1)</script>';
      const result = sanitizeHtml(input, ['p']);
      expect(result).toContain('<p>Paragraph</p>');
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<script>');
    });

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeForDisplay(input);
      expect(result).toBe('Hello World');
    });

    it('should remove dangerous content', () => {
      const input = '<script>alert("xss")</script>Safe text';
      const result = sanitizeForDisplay(input);
      expect(result).toBe('Safe text');
    });

    it('should handle non-string input', () => {
      expect(sanitizeForDisplay(null as any)).toBe('');
      expect(sanitizeForDisplay(undefined as any)).toBe('');
    });
  });

  describe('isSafeUrl', () => {
    it('should allow safe HTTP/HTTPS URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    it('should allow relative URLs', () => {
      expect(isSafeUrl('/path/to/page')).toBe(true);
      expect(isSafeUrl('./relative/path')).toBe(true);
      expect(isSafeUrl('../parent/path')).toBe(true);
    });

    it('should reject dangerous protocols', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(isSafeUrl(null as any)).toBe(false);
      expect(isSafeUrl(undefined as any)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isSafeUrl('JavaScript:alert(1)')).toBe(false);
    });
  });

  describe('generateCSPHeader', () => {
    it('should generate valid CSP header', () => {
      const csp = generateCSPHeader();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('createSafeHtml', () => {
    it('should create safe HTML object', () => {
      const input = '<p>Safe content</p><script>alert(1)</script>';
      const result = createSafeHtml(input, ['p']);
      expect(result).toHaveProperty('__html');
      expect(result.__html).toContain('<p>Safe content</p>');
      expect(result.__html).not.toContain('<script>');
    });
  });

  describe('sanitizeFormValue', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeFormValue(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should handle special characters', () => {
      const input = '& < > " \' /';
      const result = sanitizeFormValue(input);
      expect(result).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
    });

    it('should handle non-string input', () => {
      expect(sanitizeFormValue(null)).toBe('');
      expect(sanitizeFormValue(undefined)).toBe('');
      expect(sanitizeFormValue(123)).toBe('');
    });
  });

  describe('isSafeEventHandler', () => {
    it('should reject dangerous patterns', () => {
      expect(isSafeEventHandler('eval("malicious")')).toBe(false);
      expect(isSafeEventHandler('function() { alert(1); }')).toBe(false);
      expect(isSafeEventHandler('() => { alert(1); }')).toBe(false);
      expect(isSafeEventHandler('javascript:alert(1)')).toBe(false);
      expect(isSafeEventHandler('onclick="alert(1)"')).toBe(false);
      expect(isSafeEventHandler('setTimeout("alert(1)", 1000)')).toBe(false);
      expect(isSafeEventHandler('document.cookie')).toBe(false);
      expect(isSafeEventHandler('window.location')).toBe(false);
    });

    it('should allow safe strings', () => {
      expect(isSafeEventHandler('handleClick')).toBe(true);
      expect(isSafeEventHandler('submitForm')).toBe(true);
      expect(isSafeEventHandler('')).toBe(true);
    });

    it('should handle non-string input', () => {
      expect(isSafeEventHandler(null as any)).toBe(false);
      expect(isSafeEventHandler(undefined as any)).toBe(false);
    });
  });

  describe('detectXSSAttempt', () => {
    it('should detect script injection', () => {
      expect(detectXSSAttempt('<script>alert(1)</script>')).toBe(true);
      expect(detectXSSAttempt('javascript:alert(1)')).toBe(true);
      expect(detectXSSAttempt('onclick="alert(1)"')).toBe(true);
      expect(detectXSSAttempt('eval("malicious")')).toBe(true);
    });

    it('should detect encoded attacks', () => {
      expect(detectXSSAttempt('&#x3c;script&#x3e;')).toBe(true);
      expect(detectXSSAttempt('\\u003cscript\\u003e')).toBe(true);
    });

    it('should not flag safe content', () => {
      expect(detectXSSAttempt('Hello World')).toBe(false);
      expect(detectXSSAttempt('This is safe text')).toBe(false);
      expect(detectXSSAttempt('')).toBe(false);
    });

    it('should handle non-string input', () => {
      expect(detectXSSAttempt(null as any)).toBe(false);
      expect(detectXSSAttempt(undefined as any)).toBe(false);
    });
  });

  describe('logXSSAttempt', () => {
    it('should log XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      logXSSAttempt(maliciousInput, 'test-form');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'XSS attempt detected:',
        expect.objectContaining({
          source: 'test-form',
          input: maliciousInput,
          timestamp: expect.any(String),
          userAgent: expect.any(String),
        })
      );
    });

    it('should not log safe content', () => {
      logXSSAttempt('Safe content', 'test-form');
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it('should truncate long inputs', () => {
      const longMaliciousInput = '<script>alert("xss")</script>' + 'a'.repeat(200);
      logXSSAttempt(longMaliciousInput, 'test-form');

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'XSS attempt detected:',
        expect.objectContaining({
          input: longMaliciousInput.substring(0, 100),
        })
      );
    });
  });
});
