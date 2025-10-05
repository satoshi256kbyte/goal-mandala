import DOMPurify from 'dompurify';

/**
 * 入力値をサニタイズする
 * XSS攻撃を防ぐため、HTMLタグを全て削除する
 */
export function sanitizeInput(input: any): string {
  // null, undefinedの場合は空文字列を返す
  if (input === null || input === undefined) {
    return '';
  }

  // 文字列に変換
  const str = String(input);

  // DOMPurifyを使用してHTMLタグを全て削除
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // タグを一切許可しない
    ALLOWED_ATTR: [], // 属性を一切許可しない
    KEEP_CONTENT: true, // コンテンツは保持
  });
}

/**
 * HTMLを許可しつつ、危険なタグ・属性を削除する
 * 基本的なフォーマット（p, strong, em, ul, li, a）のみ許可
 */
export function sanitizeHtml(html: any): string {
  // null, undefinedの場合は空文字列を返す
  if (html === null || html === undefined) {
    return '';
  }

  const str = String(html);

  // DOMPurifyを使用して安全なHTMLのみ許可
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
}

/**
 * HTMLエンティティをエスケープする
 */
export function escapeHtml(text: any): string {
  if (text === null || text === undefined) {
    return '';
  }

  const str = String(text);

  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
