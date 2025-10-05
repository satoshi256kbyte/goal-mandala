import { sanitizeInput, sanitizeHtml } from './sanitize';

describe('sanitizeInput', () => {
  describe('XSS対策', () => {
    it('スクリプトタグを削除する', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
      // タグは削除されるが、テキストコンテンツは残る
      expect(result).toContain('alert');
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
      expect(result).not.toContain('alert');
    });

    it('HTMLエンティティをエスケープする', () => {
      const input = '<div>Test & "quotes" \'single\'</div>';
      const result = sanitizeInput(input);
      expect(result).not.toContain('<div>');
      expect(result).toContain('Test');
    });

    it('複数のXSS攻撃パターンを防ぐ', () => {
      const inputs = [
        '<iframe src="evil.com"></iframe>',
        '<object data="evil.swf"></object>',
        '<embed src="evil.swf">',
        '<svg onload="alert(1)">',
        '<img src=x onerror="alert(1)">',
        '<body onload="alert(1)">',
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
      expect(result.split('\n')).toHaveLength(3);
    });

    it('スペースを保持する', () => {
      const input = 'Word1  Word2   Word3';
      const result = sanitizeInput(input);
      expect(result).toContain('  ');
    });

    it('特殊文字を適切に処理する', () => {
      const input = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = sanitizeInput(input);
      expect(result).toBeTruthy();
    });

    it('nullを空文字列として処理する', () => {
      const result = sanitizeInput(null as any);
      expect(result).toBe('');
    });

    it('undefinedを空文字列として処理する', () => {
      const result = sanitizeInput(undefined as any);
      expect(result).toBe('');
    });

    it('数値を文字列に変換する', () => {
      const result = sanitizeInput(12345 as any);
      expect(result).toBe('12345');
    });
  });

  describe('長い入力の処理', () => {
    it('長いテキストを処理する', () => {
      const input = 'a'.repeat(10000);
      const result = sanitizeInput(input);
      expect(result.length).toBe(10000);
    });

    it('長いHTMLを処理する', () => {
      const input = '<div>'.repeat(1000) + 'content' + '</div>'.repeat(1000);
      const result = sanitizeInput(input);
      expect(result).not.toContain('<div>');
      expect(result).toContain('content');
    });
  });
});

describe('sanitizeHtml', () => {
  describe('許可されたタグの処理', () => {
    it('基本的なHTMLタグを許可する', () => {
      const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('リンクを許可する', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<a');
      expect(result).toContain('href');
      expect(result).toContain('https://example.com');
    });

    it('リストを許可する', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });
  });

  describe('危険なタグの削除', () => {
    it('スクリプトタグを削除する', () => {
      const input = '<p>Safe</p><script>alert("XSS")</script>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('危険な属性を削除する', () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('JavaScriptプロトコルを削除する', () => {
      const input = '<a href="javascript:void(0)">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('属性の処理', () => {
    it('安全な属性を保持する', () => {
      const input = '<a href="https://example.com" title="Example">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href');
      expect(result).toContain('title');
    });

    it('危険な属性を削除する', () => {
      const input = '<p onclick="alert(1)" class="safe">Text</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).toContain('Text');
    });
  });
});
