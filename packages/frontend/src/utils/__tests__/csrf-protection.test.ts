import { render, cleanup, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, afterEach } from 'vitest';
import {
  generateCSRFToken,
  storeCSRFToken,
  getStoredCSRFToken,
  clearCSRFToken,
  initializeCSRFToken,
  isValidCSRFToken,
  getCSRFTokenForRequest,
  validateCSRFTokenForSubmission,
  isSameSiteCookieSupported,
  validateReferrer,
  detectCSRFAttempt,
  logCSRFAttempt,
} from '../csrf-protection';

// crypto.getRandomValues をモック
const mockGetRandomValues = vi.fn();
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockGetRandomValues,
  },
});

// sessionStorage をモック
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
});

// console.warn をモック
const mockConsoleWarn = vi.fn();
console.warn = mockConsoleWarn;

// navigator.userAgent をモック
Object.defineProperty(global.navigator, 'userAgent', {
  value:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  configurable: true,
});

// document.referrer をモック
Object.defineProperty(global.document, 'referrer', {
  value: 'https://example.com',
  configurable: true,
});

// window.location をモック
Object.defineProperty(global.window, 'location', {
  value: {
    origin: 'https://example.com',
    href: 'https://example.com/page',
  },
  configurable: true,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('CSRF Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  describe('generateCSRFToken', () => {
    it('should generate a valid CSRF token', () => {
      // 32バイトのランダム値をモック
      const mockArray = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockArray[i] = i;
      }
      mockGetRandomValues.mockImplementation(array => {
        array.set(mockArray);
        return array;
      });

      const token = generateCSRFToken();

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should generate different tokens on multiple calls', () => {
      let callCount = 0;
      mockGetRandomValues.mockImplementation(array => {
        // 異なるランダム値を生成
        for (let i = 0; i < array.length; i++) {
          array[i] = (i + callCount) % 256;
        }
        callCount++;
        return array;
      });

      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('storeCSRFToken and getStoredCSRFToken', () => {
    it('should store and retrieve CSRF token', () => {
      const token = 'test-csrf-token';
      mockSessionStorage.getItem.mockReturnValue(token);

      storeCSRFToken(token);
      const retrieved = getStoredCSRFToken();

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('csrf-token', token);
      expect(retrieved).toBe(token);
    });

    it('should handle storage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      storeCSRFToken('token');
      const retrieved = getStoredCSRFToken();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Failed to store CSRF token:',
        expect.any(Error)
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Failed to retrieve CSRF token:',
        expect.any(Error)
      );
      expect(retrieved).toBeNull();
    });
  });

  describe('clearCSRFToken', () => {
    it('should clear CSRF token from storage', () => {
      clearCSRFToken();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('csrf-token');
    });

    it('should handle clear errors gracefully', () => {
      mockSessionStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      clearCSRFToken();
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Failed to clear CSRF token:',
        expect.any(Error)
      );
    });
  });

  describe('isValidCSRFToken', () => {
    it('should validate correct CSRF tokens', () => {
      const validToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn'; // 40文字
      expect(isValidCSRFToken(validToken)).toBe(true);
    });

    it('should reject invalid tokens', () => {
      expect(isValidCSRFToken('')).toBe(false);
      expect(isValidCSRFToken('short')).toBe(false);
      expect(isValidCSRFToken('invalid+characters=')).toBe(false);
      expect(isValidCSRFToken(null as any)).toBe(false);
      expect(isValidCSRFToken(undefined as any)).toBe(false);
    });
  });

  describe('validateCSRFTokenForSubmission', () => {
    it('should validate matching tokens', () => {
      const token = 'valid-csrf-token-12345678901234567890123456';
      mockSessionStorage.getItem.mockReturnValue(token);

      const result = validateCSRFTokenForSubmission(token);
      expect(result).toBe(true);
    });

    it('should reject non-matching tokens', () => {
      mockSessionStorage.getItem.mockReturnValue('stored-token');

      const result = validateCSRFTokenForSubmission('different-token');
      expect(result).toBe(false);
    });

    it('should reject when no stored token', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = validateCSRFTokenForSubmission('any-token');
      expect(result).toBe(false);
    });
  });

  describe('isSameSiteCookieSupported', () => {
    it('should detect Chrome support', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true,
      });

      expect(isSameSiteCookieSupported()).toBe(true);
    });

    it('should detect Firefox support', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        configurable: true,
      });

      expect(isSameSiteCookieSupported()).toBe(true);
    });

    it('should detect Safari support', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true,
      });

      expect(isSameSiteCookieSupported()).toBe(true);
    });

    it('should reject unsupported browsers', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
        configurable: true,
      });

      expect(isSameSiteCookieSupported()).toBe(false);
    });
  });

  describe('validateReferrer', () => {
    it('should allow same origin referrer', () => {
      Object.defineProperty(global.document, 'referrer', {
        value: 'https://example.com/previous-page',
        configurable: true,
      });

      const result = validateReferrer(['https://trusted.com']);
      expect(result).toBe(true);
    });

    it('should allow trusted origins', () => {
      Object.defineProperty(global.document, 'referrer', {
        value: 'https://trusted.com/page',
        configurable: true,
      });

      const result = validateReferrer(['https://trusted.com']);
      expect(result).toBe(true);
    });

    it('should reject untrusted origins', () => {
      Object.defineProperty(global.document, 'referrer', {
        value: 'https://malicious.com/page',
        configurable: true,
      });

      const result = validateReferrer(['https://trusted.com']);
      expect(result).toBe(false);
    });

    it('should allow empty referrer', () => {
      Object.defineProperty(global.document, 'referrer', {
        value: '',
        configurable: true,
      });

      const result = validateReferrer(['https://trusted.com']);
      expect(result).toBe(true);
    });
  });

  describe('detectCSRFAttempt', () => {
    it('should not detect CSRF for safe methods', () => {
      const request = {
        method: 'GET',
        origin: 'https://example.com',
        referrer: 'https://example.com/page',
        token: 'valid-token',
      };

      expect(detectCSRFAttempt(request)).toBe(false);
    });

    it('should detect CSRF for different origin', () => {
      const request = {
        method: 'POST',
        origin: 'https://malicious.com',
        referrer: 'https://example.com/page',
        token: 'valid-token',
      };

      expect(detectCSRFAttempt(request)).toBe(true);
    });

    it('should detect CSRF for invalid referrer', () => {
      const request = {
        method: 'POST',
        origin: 'https://example.com',
        referrer: 'https://malicious.com/page',
        token: 'valid-token',
      };

      expect(detectCSRFAttempt(request)).toBe(true);
    });

    it('should detect CSRF for missing token', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const request = {
        method: 'POST',
        origin: 'https://example.com',
        referrer: 'https://example.com/page',
      };

      expect(detectCSRFAttempt(request)).toBe(true);
    });
  });

  describe('logCSRFAttempt', () => {
    it('should log CSRF attempt', () => {
      const request = {
        method: 'POST',
        url: '/api/test',
        origin: 'https://malicious.com',
        referrer: 'https://malicious.com/page',
      };

      logCSRFAttempt(request);

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'CSRF attempt detected:',
        expect.objectContaining({
          method: 'POST',
          url: '/api/test',
          origin: 'https://malicious.com',
          referrer: 'https://malicious.com/page',
          timestamp: expect.any(String),
          userAgent: expect.any(String),
        })
      );
    });
  });
});
