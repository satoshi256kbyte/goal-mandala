/**
 * 入力値をサニタイズする
 * XSS攻撃を防ぐため、HTMLタグを全て削除する
 */
export function sanitizeInput(input: unknown): string {
  // null, undefinedの場合は空文字列を返す
  if (input === null || input === undefined) {
    return '';
  }

  // 文字列に変換
  const str = String(input);

  // HTMLタグを全て削除
  let sanitized = str.replace(/<[^>]*>/g, '');

  // HTMLエンティティをデコードして再エンコード
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  // 再度HTMLタグを削除（デコード後に生成された可能性があるため）
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // JavaScriptプロトコルを削除
  sanitized = sanitized.replace(/javascript:/gi, '');

  // イベントハンドラを削除
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  return sanitized;
}

/**
 * HTMLを許可しつつ、危険なタグ・属性を削除する
 * 基本的なフォーマット（p, strong, em, ul, li, a）のみ許可
 */
export function sanitizeHtml(html: unknown): string {
  // null, undefinedの場合は空文字列を返す
  if (html === null || html === undefined) {
    return '';
  }

  const str = String(html);

  // 許可するタグのリスト
  const allowedTags = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br'];
  const allowedAttributes: Record<string, string[]> = {
    a: ['href', 'title'],
  };

  // 危険なタグを削除
  let sanitized = str;

  // scriptタグを削除
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // iframeタグを削除
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // objectタグを削除
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

  // embedタグを削除
  sanitized = sanitized.replace(/<embed\b[^<]*>/gi, '');

  // svgタグを削除
  sanitized = sanitized.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

  // イベントハンドラ属性を削除
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // JavaScriptプロトコルを削除
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  // 許可されていないタグを削除
  const tagRegex = /<\/?(\w+)[^>]*>/g;
  sanitized = sanitized.replace(tagRegex, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      // 許可されたタグの場合、属性をチェック
      if (allowedAttributes[tagName.toLowerCase()]) {
        const allowedAttrs = allowedAttributes[tagName.toLowerCase()];
        return match.replace(/(\w+)\s*=\s*["'][^"']*["']/g, (attrMatch, attrName) => {
          if (allowedAttrs.includes(attrName.toLowerCase())) {
            return attrMatch;
          }
          return '';
        });
      }
      return match;
    }
    return '';
  });

  return sanitized;
}

/**
 * HTMLエンティティをエスケープする
 */
export function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) {
    return '';
  }

  const str = String(text);

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
