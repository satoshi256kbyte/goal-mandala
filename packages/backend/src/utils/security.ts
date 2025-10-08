/**
 * セキュリティユーティリティ
 * 機密情報のマスキングなどのセキュリティ関連機能を提供
 */

/**
 * 機密情報をマスキングする
 * @param value マスキング対象の値
 * @param visibleChars 表示する文字数（前後）
 * @returns マスキングされた文字列
 */
export function maskSensitiveData(value: string | undefined | null, visibleChars = 4): string {
  if (!value) {
    return '***';
  }

  if (value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }

  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  const masked = '*'.repeat(Math.max(value.length - visibleChars * 2, 3));

  return `${start}${masked}${end}`;
}

/**
 * メールアドレスをマスキングする
 * @param email メールアドレス
 * @returns マスキングされたメールアドレス
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) {
    return '***@***.***';
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return maskSensitiveData(email, 2);
  }

  const [localPart, domain] = parts;
  const maskedLocal = maskSensitiveData(localPart, 2);
  const domainParts = domain.split('.');

  if (domainParts.length < 2) {
    return `${maskedLocal}@${maskSensitiveData(domain, 1)}`;
  }

  const maskedDomain = domainParts
    .map((part, index) => {
      if (index === domainParts.length - 1) {
        // TLD（.com, .jpなど）はそのまま表示
        return part;
      }
      return maskSensitiveData(part, 1);
    })
    .join('.');

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * エラースタックトレースから機密情報をマスキングする
 * @param stack スタックトレース
 * @returns マスキングされたスタックトレース
 */
export function maskStackTrace(stack: string | undefined): string | undefined {
  if (!stack) {
    return undefined;
  }

  // 環境変数のパスをマスキング
  let masked = stack.replace(/\/home\/[^/]+/g, '/home/***');
  masked = masked.replace(/\/Users\/[^/]+/g, '/Users/***');
  masked = masked.replace(/C:\\Users\\[^\\]+/g, 'C:\\Users\\***');

  // データベース接続文字列をマスキング
  masked = masked.replace(
    /postgresql:\/\/[^:]+:[^@]+@[^/]+\/[^\s]+/g,
    'postgresql://***:***@***/***'
  );
  masked = masked.replace(/mysql:\/\/[^:]+:[^@]+@[^/]+\/[^\s]+/g, 'mysql://***:***@***/***');

  // AWSアクセスキーをマスキング
  masked = masked.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA****************');
  masked = masked.replace(/[A-Za-z0-9/+=]{40}/g, match => {
    // AWS Secret Access Keyの可能性がある40文字の文字列をマスキング
    if (/[A-Z]/.test(match) && /[a-z]/.test(match) && /[0-9]/.test(match)) {
      return '****************************************';
    }
    return match;
  });

  // JWTトークンをマスキング
  masked = masked.replace(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    'eyJ***.***.***.***'
  );

  return masked;
}

/**
 * ログ出力用にオブジェクトから機密情報をマスキングする
 * @param obj マスキング対象のオブジェクト
 * @returns マスキングされたオブジェクト
 */
export function maskSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'accessKey',
    'secretKey',
    'authorization',
    'cookie',
    'session',
  ];

  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // 機密フィールドをマスキング
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      masked[key] = '***MASKED***';
      continue;
    }

    // メールアドレスをマスキング
    if (lowerKey.includes('email') && typeof value === 'string') {
      masked[key] = maskEmail(value);
      continue;
    }

    // ネストされたオブジェクトを再帰的に処理
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      masked[key] = maskSensitiveFields(value as Record<string, unknown>);
      continue;
    }

    // 配列の場合
    if (Array.isArray(value)) {
      masked[key] = value.map(item => {
        if (item && typeof item === 'object') {
          return maskSensitiveFields(item as Record<string, unknown>);
        }
        return item;
      });
      continue;
    }

    // その他の値はそのまま
    masked[key] = value;
  }

  return masked;
}

/**
 * エラーオブジェクトをログ出力用に安全な形式に変換する
 * @param error エラーオブジェクト
 * @returns 安全なエラーオブジェクト
 */
export function sanitizeErrorForLogging(error: unknown): {
  name: string;
  message: string;
  stack?: string;
  [key: string]: unknown;
} {
  if (!(error instanceof Error)) {
    return {
      name: 'UnknownError',
      message: String(error),
    };
  }

  const sanitized: {
    name: string;
    message: string;
    stack?: string;
    [key: string]: unknown;
  } = {
    name: error.name,
    message: error.message,
    stack: maskStackTrace(error.stack),
  };

  // エラーオブジェクトの追加プロパティをマスキング
  for (const [key, value] of Object.entries(error)) {
    if (key !== 'name' && key !== 'message' && key !== 'stack') {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = maskSensitiveFields(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}
