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
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
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
  logger.error(error.message, {
    stack: error.stack,
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
