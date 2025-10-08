/**
 * 構造化ロガー
 * CloudWatch Logsに適した構造化ログを出力
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  [key: string]: unknown;
}

/**
 * 機密情報のキー（マスキング対象）
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
];

/**
 * 構造化ロガークラス
 */
export class StructuredLogger {
  constructor(private readonly service: string) {}

  /**
   * INFOレベルのログ出力
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * WARNレベルのログ出力
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * ERRORレベルのログ出力
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * DEBUGレベルのログ出力
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * ログエントリを作成して出力
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...this.sanitizeContext(context),
    };

    const logString = JSON.stringify(logEntry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      default:
        console.log(logString);
    }
  }

  /**
   * コンテキストデータのサニタイズ
   * 機密情報をマスキングし、Errorオブジェクトをシリアライズ可能な形式に変換
   */
  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
    if (!context) {
      return {};
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(context)) {
      // 機密情報のマスキング
      if (SENSITIVE_KEYS.includes(key)) {
        sanitized[key] = '***MASKED***';
        continue;
      }

      // Errorオブジェクトの処理
      if (value instanceof Error) {
        sanitized[key] = this.serializeError(value);
        continue;
      }

      // その他の値はそのまま
      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Errorオブジェクトをシリアライズ可能な形式に変換
   */
  private serializeError(error: Error): Record<string, unknown> {
    const serialized: Record<string, unknown> = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };

    // カスタムプロパティも含める
    for (const key of Object.keys(error)) {
      if (key !== 'message' && key !== 'name' && key !== 'stack') {
        serialized[key] = (error as unknown as Record<string, unknown>)[key];
      }
    }

    return serialized;
  }
}

/**
 * デフォルトロガーインスタンス
 */
export const logger = new StructuredLogger('bedrock-service');
