import { sanitizeInput, sanitizeHtml, escapeHtml } from '../sanitize';

describe('Sanitize Utils', () => {
  describe('sanitizeInput', () => {
    it('null/undefinedの場合は空文字列を返す', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });

    it('HTMLタグを削除する', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('<div>content</div>')).toBe('content');
    });

    it('HTMLエンティティをデコードして再エンコード', () => {
      expect(sanitizeInput('&lt;script&gt;')).toBe('');
      expect(sanitizeInput('&amp;test')).toBe('&test');
      expect(sanitizeInput('&quot;test&quot;')).toBe('"test"');
    });

    it('JavaScriptプロトコルを削除', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeInput('JAVASCRIPT:alert("xss")')).toBe('alert("xss")');
    });

    it('イベントハンドラを削除', () => {
      expect(sanitizeInput('onclick="alert(1)"')).toBe('');
      expect(sanitizeInput('onmouseover=alert(1)')).toBe('');
    });
  });

  describe('sanitizeHtml', () => {
    it('null/undefinedの場合は空文字列を返す', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
    });

    it('危険なタグを削除', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('');
      expect(sanitizeHtml('<object data="evil.swf"></object>')).toBe('');
      expect(sanitizeHtml('<embed src="evil.swf">')).toBe('');
      expect(sanitizeHtml('<svg><script>alert(1)</script></svg>')).toBe('');
    });

    it('許可されたタグは保持', () => {
      expect(sanitizeHtml('<p>test</p>')).toBe('<p>test</p>');
      expect(sanitizeHtml('<strong>bold</strong>')).toBe('<strong>bold</strong>');
      expect(sanitizeHtml('<a href="test.com">link</a>')).toBe('<a href="test.com">link</a>');
    });

    it('許可されていないタグを削除', () => {
      expect(sanitizeHtml('<div>content</div>')).toBe('content');
      expect(sanitizeHtml('<span>content</span>')).toBe('content');
    });

    it('イベントハンドラ属性を削除', () => {
      expect(sanitizeHtml('<p onclick="alert(1)">test</p>')).toBe('<p>test</p>');
      expect(sanitizeHtml('<a onmouseover=alert(1) href="test">link</a>')).toBe(
        '<a href="test">link</a>'
      );
    });

    it('JavaScriptプロトコルを削除', () => {
      expect(sanitizeHtml('<a href="javascript:alert(1)">link</a>')).toBe('<a href="#">link</a>');
    });

    it('許可された属性のみ保持', () => {
      const result = sanitizeHtml('<a href="test" title="title" class="test">link</a>');
      expect(result).toContain('href="test"');
      expect(result).toContain('title="title"');
      expect(result).not.toContain('class="test"');
      expect(result).toContain('link');
    });
  });

  describe('escapeHtml', () => {
    it('null/undefinedの場合は空文字列を返す', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('HTMLエンティティをエスケープ', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#x27;');
      expect(escapeHtml('/')).toBe('&#x2F;');
    });

    it('数値や他の型も文字列に変換してエスケープ', () => {
      expect(escapeHtml(123)).toBe('123');
      expect(escapeHtml(true)).toBe('true');
    });
  });
});
