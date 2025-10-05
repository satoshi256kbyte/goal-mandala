/**
 * ログ出力ユーティリティ
 */

export interface LogContext {
  [key: string]: unknown;
}

// 型安全なログコンテキスト変換関数
export function toLogContext(obj: unknown): LogContext {
  return obj as LogContext;
}

/**
 * 機密情報のパターン定義
 */
const SENSITIVE_PATTERNS = [
  // データベース接続文字列（最初に処理）
  {
    pattern: /(postgresql|mysql|mongodb):\/\/([^:]+):([^@]+)@/gi,
    replacement: '$1://$2:***@',
  },
  // APIキー
  { pattern: /sk-[a-zA-Z0-9]+/g, replacement: 'sk-***' },
  // Bearer トークン
  { pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer ***' },
  // パスワード
  { pattern: /password[:\s=]+[^\s,}]+/gi, replacement: 'password: ***' },
  // JWT トークン
  { pattern: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, replacement: 'jwt.***' },
  // メールアドレス（部分マスキング）
  { pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replacement: '***@$2' },
  // クレジットカード番号
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '****-****-****-****' },
  // AWS Access Key
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: 'AKIA***' },
  // AWS Secret Key（40文字の英数字）
  { pattern: /\b[A-Za-z0-9/+=]{40}\b/g, replacement: '***' },
];

/**
 * 文字列から機密情報を除外する
 *
 * @param text - 処理する文字列
 * @returns 機密情報がマスキングされた文字列
 */
export function sanitizeSensitiveData(text: string): string {
  let sanitized = text;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * オブジェクトから機密情報を除外する
 *
 * @param obj - 処理するオブジェクト
 * @returns 機密情報がマスキングされたオブジェクト
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeSensitiveData(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // 機密情報を含む可能性のあるキー名
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'accessKey', 'secretKey'];
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
      sanitized[key] = '***';
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: LogContext;
}

/**
 * 構造化ログを出力する
 */
const createLogger = (level: LogEntry['level']) => {
  return (message: string, context?: LogContext) => {
    // メッセージとコンテキストから機密情報を除外
    const sanitizedMessage = sanitizeSensitiveData(message);
    const sanitizedContext = context ? (sanitizeObject(context) as LogContext) : undefined;

    const logEntry: LogEntry = {
      level,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      ...(sanitizedContext && { context: sanitizedContext }),
    };

    // CloudWatch Logsで構造化ログとして出力
    console.log(JSON.stringify(logEntry));
  };
};

export const logger = {
  info: createLogger('info'),
  warn: createLogger('warn'),
  error: createLogger('error'),
  debug: createLogger('debug'),
};

/**
 * エラーログ専用の関数
 */
export const logError = (error: Error, context?: LogContext) => {
  // スタックトレースから機密情報を除外
  const sanitizedStack = error.stack ? sanitizeSensitiveData(error.stack) : undefined;

  logger.error(error.message, {
    stack: sanitizedStack,
    name: error.name,
    ...context,
  });
};

/**
 * APIリクエストログ
 */
export const logRequest = (method: string, path: string, statusCode: number, duration?: number) => {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    ...(duration && { duration: `${duration}ms` }),
  });
};

/**
 * パフォーマンス測定用のタイマー
 */
export const createTimer = () => {
  const start = Date.now();

  return {
    end: () => Date.now() - start,
  };
};
