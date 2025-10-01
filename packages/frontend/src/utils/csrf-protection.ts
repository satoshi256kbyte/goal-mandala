/**
 * CSRF (Cross-Site Request Forgery) 対策のためのユーティリティ
 */

/**
 * CSRFトークンの生成
 * セキュアなランダム文字列を生成
 */
export const generateCSRFToken = (): string => {
  // Crypto APIを使用してセキュアなランダム値を生成
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  // Base64エンコードして文字列に変換
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

/**
 * CSRFトークンをセッションストレージに保存
 */
export const storeCSRFToken = (token: string): void => {
  try {
    sessionStorage.setItem('csrf-token', token);
  } catch (error) {
    console.warn('Failed to store CSRF token:', error);
  }
};

/**
 * セッションストレージからCSRFトークンを取得
 */
export const getStoredCSRFToken = (): string | null => {
  try {
    return sessionStorage.getItem('csrf-token');
  } catch (error) {
    console.warn('Failed to retrieve CSRF token:', error);
    return null;
  }
};

/**
 * CSRFトークンをセッションストレージから削除
 */
export const clearCSRFToken = (): void => {
  try {
    sessionStorage.removeItem('csrf-token');
  } catch (error) {
    console.warn('Failed to clear CSRF token:', error);
  }
};

/**
 * 新しいCSRFトークンを生成して保存
 */
export const initializeCSRFToken = (): string => {
  const token = generateCSRFToken();
  storeCSRFToken(token);
  return token;
};

/**
 * CSRFトークンの妥当性チェック
 */
export const isValidCSRFToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Base64URL形式の文字列かチェック
  const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
  if (!base64UrlPattern.test(token)) {
    return false;
  }

  // 適切な長さかチェック（32バイトのランダム値をBase64URLエンコードした場合）
  if (token.length < 40 || token.length > 50) {
    return false;
  }

  return true;
};

/**
 * HTTPヘッダー用のCSRFトークン取得
 * 存在しない場合は新しく生成
 */
export const getCSRFTokenForRequest = (): string => {
  let token = getStoredCSRFToken();

  if (!token || !isValidCSRFToken(token)) {
    token = initializeCSRFToken();
  }

  return token;
};

/**
 * フォーム送信用のCSRFトークン検証
 */
export const validateCSRFTokenForSubmission = (submittedToken: string): boolean => {
  const storedToken = getStoredCSRFToken();

  if (!storedToken || !submittedToken) {
    return false;
  }

  // 定数時間比較でタイミング攻撃を防ぐ
  return constantTimeCompare(storedToken, submittedToken);
};

/**
 * 定数時間での文字列比較
 * タイミング攻撃を防ぐため
 */
const constantTimeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};

/**
 * SameSite Cookieの設定チェック
 */
export const isSameSiteCookieSupported = (): boolean => {
  // User Agentを確認してSameSite Cookieのサポートを判定
  const userAgent = navigator.userAgent;

  // Chrome 51+, Firefox 60+, Safari 12+ でサポート
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
  const firefoxMatch = userAgent.match(/Firefox\/(\d+)/);
  const safariMatch = userAgent.match(/Version\/(\d+).*Safari/);

  if (chromeMatch && parseInt(chromeMatch[1]) >= 51) return true;
  if (firefoxMatch && parseInt(firefoxMatch[1]) >= 60) return true;
  if (safariMatch && parseInt(safariMatch[1]) >= 12) return true;

  return false;
};

/**
 * Referrerヘッダーの検証
 */
export const validateReferrer = (allowedOrigins: string[]): boolean => {
  const referrer = document.referrer;

  if (!referrer) {
    // Referrerが存在しない場合は同一オリジンからのリクエストとして扱う
    return true;
  }

  try {
    const referrerUrl = new URL(referrer);
    const currentOrigin = window.location.origin;

    // 同一オリジンの場合は許可
    if (referrerUrl.origin === currentOrigin) {
      return true;
    }

    // 許可されたオリジンリストに含まれているかチェック
    return allowedOrigins.includes(referrerUrl.origin);
  } catch (error) {
    console.warn('Invalid referrer URL:', referrer);
    return false;
  }
};

/**
 * CSRF攻撃の検出
 */
export const detectCSRFAttempt = (request: {
  method: string;
  origin?: string;
  referrer?: string;
  token?: string;
}): boolean => {
  const { method, origin, referrer, token } = request;

  // GET, HEAD, OPTIONS は通常CSRF攻撃の対象外
  if (['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    return false;
  }

  const currentOrigin = window.location.origin;

  // Originヘッダーのチェック
  if (origin && origin !== currentOrigin) {
    return true;
  }

  // Referrerヘッダーのチェック
  if (referrer) {
    try {
      const referrerUrl = new URL(referrer);
      if (referrerUrl.origin !== currentOrigin) {
        return true;
      }
    } catch (error) {
      return true; // 無効なReferrer
    }
  }

  // CSRFトークンのチェック
  if (!token || !validateCSRFTokenForSubmission(token)) {
    return true;
  }

  return false;
};

/**
 * CSRF攻撃の試行をログに記録
 */
export const logCSRFAttempt = (request: {
  method: string;
  url: string;
  origin?: string;
  referrer?: string;
}): void => {
  console.warn('CSRF attempt detected:', {
    ...request,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  });

  // 本番環境では外部ログサービスに送信
  if (process.env.NODE_ENV === 'production') {
    // TODO: 外部ログサービスへの送信実装
  }
};
