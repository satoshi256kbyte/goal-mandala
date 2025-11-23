import { sanitizeInput, sanitizeHtml } from './sanitize';

describe('Frontend sanitizeInput', () => {
  describe('XSS対策', () => {
    it('スクリプトタグを削除する', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('イベントハンドラを削除する', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeInput(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('JavaScriptプロトコルを削除する', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('javascript:');
    });

    it('複数のXSS攻撃パターンを防ぐ', () => {
      const inputs = [
        '<iframe src="evil.com"></iframe>',
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
        '<svg onload="alert(1)">',
        '<img src=x onerror="alert(1)">',
      ];

      inputs.forEach(input => {
        const result = sanitizeInput(input);
        expect(result).not.toContain('alert');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
      });
    });
  });

  describe('入力サニタイゼーション', () => {
    it('空文字列を処理する', () => {
      const result = sanitizeInput('');
      expect(result).toBe('');
    });

    it('通常のテキストをそのまま返す', () => {
      const input = 'これは通常のテキストです';
      const result = sanitizeInput(input);
      expect(result).toBe(input);
    });

    it('改行を保持する', () => {
      const input = 'Line 1\nLine 2\nLine 3';
      const result = sanitizeInput(input);
      expect(result).toContain('\n');
    });

    it('nullを空文字列として処理する', () => {
      const result = sanitizeInput(null as any);
      expect(result).toBe('');
    });

    it('undefinedを空文字列として処理する', () => {
      const result = sanitizeInput(undefined as any);
      expect(result).toBe('');
    });
  });
});

describe('Frontend sanitizeHtml', () => {
  describe('許可されたタグの処理', () => {
    it('基本的なHTMLタグを許可する', () => {
      const input = '<p>Paragraph</p><strong>Bold</strong>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('危険なタグを削除する', () => {
      const input = '<p>Safe</p><script>alert("XSS")</script>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).not.toContain('<script>');
    });
  });
});

describe('sanitizeHtml', () => {
  it('危険なHTMLタグを削除する', () => {
    const input = '<script>alert("xss")</script><div>Test & "quotes"</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Test');
  });

  it('許可されたHTMLタグは保持する', () => {
    const input = '<p>Test <strong>bold</strong> text</p>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('bold');
  });

  it('通常のテキストはそのまま返す', () => {
    const input = 'Normal text without special chars';
    const result = sanitizeHtml(input);
    expect(result).toBe(input);
  });

  it('空文字列を処理する', () => {
    const result = sanitizeHtml('');
    expect(result).toBe('');
  });
});
