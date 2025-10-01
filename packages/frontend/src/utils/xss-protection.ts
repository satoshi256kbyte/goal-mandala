import DOMPurify from 'dompurify';

/**
 * XSS対策のためのユーティリティ関数
 */

/**
 * HTMLコンテンツの安全な表示のためのサニタイゼーション
 * 許可されたタグのみを残し、危険な属性を除去
 */
export const sanitizeHtml = (html: string, allowedTags: string[] = []): string => {
  if (typeof html !== 'string') return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ['class', 'id'],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false,
  });
};

/**
 * テキストコンテンツの安全な表示
 * 全てのHTMLタグを除去し、プレーンテキストとして扱う
 */
export const sanitizeForDisplay = (text: string): string => {
  if (typeof text !== 'string') return '';

  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * URL の安全性チェック
 * javascript:, data:, vbscript: などの危険なプロトコルを検出
 */
export const isSafeUrl = (url: string): boolean => {
  if (typeof url !== 'string') return false;

  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];

  const lowerUrl = url.toLowerCase().trim();

  // 危険なプロトコルをチェック
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return false;
    }
  }

  // 相対URLまたはHTTP/HTTPSのみ許可
  return (
    lowerUrl.startsWith('http://') ||
    lowerUrl.startsWith('https://') ||
    lowerUrl.startsWith('/') ||
    lowerUrl.startsWith('./') ||
    lowerUrl.startsWith('../') ||
    !lowerUrl.includes(':')
  );
};

/**
 * CSP (Content Security Policy) 設定の生成
 */
export const generateCSPHeader = (): string => {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // React開発時に必要
    "style-src 'self' 'unsafe-inline'", // Tailwind CSSに必要
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
};

/**
 * React コンポーネントで安全にHTMLを表示するためのProps
 */
export interface SafeHtmlProps {
  html: string;
  allowedTags?: string[];
  className?: string;
}

/**
 * 安全なHTML表示のためのヘルパー関数
 * dangerouslySetInnerHTMLの代替として使用
 */
export const createSafeHtml = (html: string, allowedTags: string[] = []): { __html: string } => {
  const sanitized = sanitizeHtml(html, allowedTags);
  return { __html: sanitized };
};

/**
 * フォーム入力値のXSS対策
 * React Hook Formと組み合わせて使用
 */
export const sanitizeFormValue = (value: unknown): string => {
  if (typeof value !== 'string') return '';

  // 基本的なHTMLエスケープ
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * イベントハンドラーの安全性チェック
 * 動的に生成されるイベントハンドラーの検証
 */
export const isSafeEventHandler = (handler: string): boolean => {
  if (typeof handler !== 'string') return false;

  const dangerousPatterns = [
    /eval\s*\(/i,
    /function\s*\(/i,
    /=>\s*{/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    /document\./i,
    /window\./i,
    /location\./i,
    /alert\s*\(/i,
    /confirm\s*\(/i,
    /prompt\s*\(/i,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(handler));
};

/**
 * 動的コンテンツの安全な挿入
 * innerHTML の代替として使用
 */
export const safeSetContent = (
  element: HTMLElement,
  content: string,
  allowedTags: string[] = []
): void => {
  if (!element || typeof content !== 'string') return;

  const sanitized = sanitizeHtml(content, allowedTags);
  element.innerHTML = sanitized;
};

/**
 * XSS攻撃パターンの検出
 * ログ記録や監視のために使用
 */
export const detectXSSAttempt = (input: string): boolean => {
  if (typeof input !== 'string') return false;

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /<embed\b/gi,
    /<link\b/gi,
    /<meta\b/gi,
    /data:text\/html/gi,
    /&#x/gi,
    /\\u[0-9a-f]{4}/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * XSS攻撃の試行をログに記録
 */
export const logXSSAttempt = (input: string, source: string = 'unknown'): void => {
  if (detectXSSAttempt(input)) {
    console.warn('XSS attempt detected:', {
      source,
      input: input.substring(0, 100), // 最初の100文字のみログ
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: 外部ログサービスへの送信実装
    }
  }
};
