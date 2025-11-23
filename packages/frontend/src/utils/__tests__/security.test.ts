import { describe, it, expect } from 'vitest';
import { sanitizeText, validateCellData, sanitizeCellData } from '../input-sanitizer';

describe('security utilities', () => {
  describe('sanitizeText', () => {
    it('HTMLエンティティをエスケープする', () => {
      expect(sanitizeText('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('特殊文字をエスケープする', () => {
      expect(sanitizeText('&<>"\'/')).toBe('&amp;&lt;&gt;&quot;&#x27;&#x2F;');
    });

    it('通常のテキストはそのまま返す', () => {
      expect(sanitizeText('Hello World')).toBe('Hello World');
    });

    it('空文字列を処理する', () => {
      expect(sanitizeText('')).toBe('');
    });
  });

  describe('validateCellData', () => {
    it('有効なセルデータを検証する', () => {
      const validData = {
        id: 'test-1',
        type: 'goal',
        title: 'Test Goal',
        progress: 50,
      };
      expect(validateCellData(validData)).toBe(true);
    });

    it('無効なセルデータを検証する', () => {
      expect(validateCellData(null)).toBe(false);
      expect(validateCellData({})).toBe(false);
      expect(validateCellData({ id: 123 })).toBe(false);
    });

    it('進捗率の範囲を検証する', () => {
      const invalidProgress = {
        id: 'test-1',
        type: 'goal',
        title: 'Test',
        progress: 150,
      };
      expect(validateCellData(invalidProgress)).toBe(false);
    });
  });

  describe('sanitizeCellData', () => {
    it('セルデータをサニタイズする', () => {
      const input = {
        id: 'test-1',
        type: 'goal',
        title: '<script>alert("xss")</script>',
        description: '<b>Description</b>',
        progress: 50,
      };

      const result = sanitizeCellData(input);
      expect(result.title).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(result.description).toBe('&lt;b&gt;Description&lt;&#x2F;b&gt;');
    });

    it('無効なデータでエラーを投げる', () => {
      expect(() => sanitizeCellData(null)).toThrow('Invalid cell data');
    });
  });
});
