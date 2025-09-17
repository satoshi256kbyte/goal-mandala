/**
 * 認証エラーハンドリングシステム
 *
 * 機能:
 * - 包括的なエラー分類システム
 * - 自動リトライ機能
 * - エラー通知システム
 * - セキュリティエラーの特別処理
 *
 * 要件: 1.4, 4.3, 5.3
 */

/**
 * 認証エラーの型定義
 */
export interface AuthError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
}

/**
 * エラーカテゴリ
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  STORAGE = 'storage',
  SYNC = 'sync',
  SECURITY = 'security',
  VALIDATION = 'validation',
  SYSTEM = 'system',
}

/**
 * エラー重要度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * エラー通知設定
 */
export interface NotificationConfig {
  showToast: boolean;
  showModal: boolean;
  logToConsole: boolean;
  reportToService: boolean;
}

/**
 * エラーハンドリング戦略
 */
export interface ErrorHandlingStrategy {
  retryableErrors: string[];
  logoutErrors: string[];
  notificationErrors: string[];
  securityErrors: string[];
  handleError: (error: AuthError) => Promise<void>;
  shouldRetry: (error: AuthError, retryCount: number) => boolean;
  shouldLogout: (error: AuthError) => boolean;
  shouldNotify: (error: AuthError) => boolean;
}

/**
 * エラーハンドラーのオプション
 */
export interface ErrorHandlerOptions {
  retryConfig?: Partial<RetryConfig>;
  notificationConfig?: Partial<NotificationConfig>;
  onError?: (error: AuthError) => void;
  onRetry?: (error: AuthError, retryCount: number) => void;
  onLogout?: (reason: string) => void;
  onSecurityAlert?: (error: AuthError) => void;
}

/**
 * デフォルトのリトライ設定
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * デフォルトの通知設定
 */
const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  showToast: true,
  showModal: false,
  logToConsole: true,
  reportToService: false,
};

/**
 * エラーコードマッピング
 */
const ERROR_CODE_MAPPING: Record<string, Partial<AuthError>> = {
  // 認証エラー
  UserNotFoundException: {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    message: 'メールアドレスまたはパスワードが正しくありません',
  },
  NotAuthorizedException: {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    message: 'メールアドレスまたはパスワードが正しくありません',
  },
  UserNotConfirmedException: {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    message: 'メールアドレスの確認が必要です',
  },
  TokenExpiredException: {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    message: 'セッションの有効期限が切れました',
  },
  InvalidTokenException: {
    category: ErrorCategory.SECURITY,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    message: '無効なトークンが検出されました',
  },

  // ネットワークエラー
  NetworkError: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    message: 'ネットワークエラーが発生しました',
  },
  TimeoutError: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    message: 'リクエストがタイムアウトしました',
  },
  ServiceUnavailable: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    message: 'サービスが一時的に利用できません',
  },

  // ストレージエラー
  StorageError: {
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    message: 'ローカルストレージへのアクセスに失敗しました',
  },
  StorageQuotaExceeded: {
    category: ErrorCategory.STORAGE,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    message: 'ストレージ容量が不足しています',
  },

  // 同期エラー
  SyncError: {
    category: ErrorCategory.SYNC,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    message: '認証状態の同期に失敗しました',
  },
  ConflictError: {
    category: ErrorCategory.SYNC,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    message: '認証状態に競合が発生しました',
  },

  // セキュリティエラー
  SecurityViolation: {
    category: ErrorCategory.SECURITY,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    message: 'セキュリティ違反が検出されました',
  },
  SuspiciousActivity: {
    category: ErrorCategory.SECURITY,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    message: '不審なアクティビティが検出されました',
  },

  // レート制限エラー
  TooManyRequestsException: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    message: 'リクエストが多すぎます。しばらく待ってから再試行してください',
  },
  LimitExceededException: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    message: '制限を超えました。しばらく待ってから再試行してください',
  },

  // システムエラー
  InternalErrorException: {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    message: 'システム内部エラーが発生しました',
  },
  UnknownError: {
    category: ErrorCategory.SYSTEM,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    message: '予期しないエラーが発生しました',
  },
};

/**
 * 認証エラーハンドラークラス
 */
export class AuthErrorHandler {
  private retryConfig: RetryConfig;
  private notificationConfig: NotificationConfig;
  private options: ErrorHandlerOptions;
  private retryCountMap = new Map<string, number>();

  constructor(options: ErrorHandlerOptions = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
    this.notificationConfig = { ...DEFAULT_NOTIFICATION_CONFIG, ...options.notificationConfig };
    this.options = options;
  }

  /**
   * エラーを処理
   * 要件 1.4: 認証エラーが発生した時に適切なエラー状態が管理され、ユーザーに表示される
   */
  async handleError(error: unknown, context?: Record<string, unknown>): Promise<AuthError> {
    const authError = this.normalizeError(error, context);

    // エラーログ出力
    if (this.notificationConfig.logToConsole) {
      this.logError(authError);
    }

    // セキュリティエラーの特別処理
    if (authError.category === ErrorCategory.SECURITY) {
      await this.handleSecurityError(authError);
    }

    // 自動ログアウトが必要かチェック
    if (this.shouldLogout(authError)) {
      await this.handleLogoutError(authError);
    }

    // リトライが必要かチェック
    if (this.shouldRetry(authError)) {
      await this.handleRetryableError(authError);
    }

    // 通知が必要かチェック
    if (this.shouldNotify(authError)) {
      await this.notifyError(authError);
    }

    // エラーレポート
    if (this.notificationConfig.reportToService) {
      await this.reportError(authError);
    }

    // カスタムエラーハンドラーを呼び出し
    if (this.options.onError) {
      this.options.onError(authError);
    }

    return authError;
  }

  /**
   * エラーを正規化
   */
  private normalizeError(error: unknown, context?: Record<string, unknown>): AuthError {
    let code = 'UnknownError';
    let message = 'エラーが発生しました';
    let category = ErrorCategory.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;
    let retryable = false;

    // エラーコードの抽出
    if (error && typeof error === 'object') {
      if ('code' in error) {
        code = (error as { code: string }).code;
      } else if ('name' in error) {
        code = (error as { name: string }).name;
      }

      if ('message' in error) {
        message = (error as { message: string }).message;
      }

      // ネットワークエラーの検出
      if (
        error instanceof TypeError ||
        (typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string' &&
          (error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('connection')))
      ) {
        code = 'NetworkError';
      }
    }

    // エラーコードマッピングから情報を取得
    const mappedError = ERROR_CODE_MAPPING[code];
    if (mappedError) {
      category = mappedError.category || category;
      severity = mappedError.severity || severity;
      retryable = mappedError.retryable !== undefined ? mappedError.retryable : retryable;
      message = mappedError.message || message;
    }

    return {
      code,
      message,
      timestamp: new Date(),
      retryable,
      category,
      severity,
      context,
    };
  }

  /**
   * セキュリティエラーの特別処理
   * 要件 4.3, 5.3: セキュリティエラーの特別処理を実装
   */
  private async handleSecurityError(error: AuthError): Promise<void> {
    console.warn('🚨 セキュリティエラーが検出されました:', error);

    // セキュリティアラートを送信
    if (this.options.onSecurityAlert) {
      this.options.onSecurityAlert(error);
    }

    // セキュリティログを記録
    this.logSecurityEvent(error);

    // 重要度がCRITICALの場合は即座にログアウト
    if (error.severity === ErrorSeverity.CRITICAL) {
      if (this.options.onLogout) {
        this.options.onLogout(`セキュリティ違反: ${error.code}`);
      }
    }
  }

  /**
   * ログアウトが必要なエラーの処理
   */
  private async handleLogoutError(error: AuthError): Promise<void> {
    console.log('自動ログアウトを実行します:', error.code);

    if (this.options.onLogout) {
      this.options.onLogout(error.code);
    }
  }

  /**
   * リトライ可能なエラーの処理
   * 要件 5.3: 自動リトライ機能を実装
   */
  private async handleRetryableError(error: AuthError): Promise<void> {
    const retryKey = `${error.code}-${error.timestamp.getTime()}`;
    const currentRetryCount = this.retryCountMap.get(retryKey) || 0;

    if (currentRetryCount < this.retryConfig.maxRetries) {
      const nextRetryCount = currentRetryCount + 1;
      this.retryCountMap.set(retryKey, nextRetryCount);

      // リトライ遅延を計算
      const delay = this.calculateRetryDelay(nextRetryCount);

      console.log(
        `エラーのリトライを実行します (${nextRetryCount}/${this.retryConfig.maxRetries}):`,
        error.code
      );

      // リトライコールバックを呼び出し
      if (this.options.onRetry) {
        this.options.onRetry(error, nextRetryCount);
      }

      // 遅延後にリトライ（実際のリトライロジックは呼び出し元で実装）
      setTimeout(() => {
        // リトライカウントをクリーンアップ
        this.retryCountMap.delete(retryKey);
      }, delay);
    } else {
      console.warn('最大リトライ回数に達しました:', error.code);
      this.retryCountMap.delete(retryKey);
    }
  }

  /**
   * エラー通知
   */
  private async notifyError(error: AuthError): Promise<void> {
    // Toast通知
    if (this.notificationConfig.showToast) {
      this.showToastNotification(error);
    }

    // モーダル通知
    if (this.notificationConfig.showModal) {
      this.showModalNotification(error);
    }
  }

  /**
   * リトライ遅延を計算
   */
  private calculateRetryDelay(retryCount: number): number {
    let delay =
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1);
    delay = Math.min(delay, this.retryConfig.maxDelay);

    // ジッターを追加
    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * ログアウトが必要かチェック
   */
  private shouldLogout(error: AuthError): boolean {
    const logoutErrors = [
      'TokenExpiredException',
      'InvalidTokenException',
      'NotAuthorizedException',
      'SecurityViolation',
      'SuspiciousActivity',
    ];

    return logoutErrors.includes(error.code) || error.category === ErrorCategory.SECURITY;
  }

  /**
   * リトライが必要かチェック
   */
  private shouldRetry(error: AuthError): boolean {
    return error.retryable && error.category !== ErrorCategory.SECURITY;
  }

  /**
   * 通知が必要かチェック
   */
  private shouldNotify(error: AuthError): boolean {
    // 重要度がLOWの場合は通知しない
    if (error.severity === ErrorSeverity.LOW) {
      return false;
    }

    // セキュリティエラーは常に通知
    if (error.category === ErrorCategory.SECURITY) {
      return true;
    }

    return true;
  }

  /**
   * エラーログ出力
   */
  private logError(error: AuthError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.category.toUpperCase()}] ${error.code}: ${error.message}`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      case 'info':
        console.info(logMessage, error);
        break;
      default:
        console.log(logMessage, error);
    }
  }

  /**
   * セキュリティイベントログ
   */
  private logSecurityEvent(error: AuthError): void {
    const securityLog = {
      timestamp: error.timestamp.toISOString(),
      event: 'security_error',
      code: error.code,
      message: error.message,
      severity: error.severity,
      context: error.context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    console.error('🔒 SECURITY EVENT:', JSON.stringify(securityLog, null, 2));

    // セキュリティログを外部サービスに送信（実装は環境に依存）
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // Google Analytics等にセキュリティイベントを送信
      (window as { gtag?: (...args: unknown[]) => void }).gtag?.('event', 'security_error', {
        event_category: 'security',
        event_label: error.code,
        value: 1,
      });
    }
  }

  /**
   * ログレベルを取得
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  /**
   * Toast通知を表示
   */
  private showToastNotification(error: AuthError): void {
    // Toast通知の実装（実際の実装は使用するUIライブラリに依存）
    console.log('Toast通知:', error.message);

    // カスタムイベントを発火してUIコンポーネントに通知
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('auth:error:toast', {
          detail: {
            message: error.message,
            severity: error.severity,
            category: error.category,
          },
        })
      );
    }
  }

  /**
   * モーダル通知を表示
   */
  private showModalNotification(error: AuthError): void {
    // モーダル通知の実装
    console.log('モーダル通知:', error.message);

    // カスタムイベントを発火してUIコンポーネントに通知
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('auth:error:modal', {
          detail: {
            message: error.message,
            severity: error.severity,
            category: error.category,
          },
        })
      );
    }
  }

  /**
   * エラーレポートを外部サービスに送信
   */
  private async reportError(error: AuthError): Promise<void> {
    try {
      // エラーレポートサービスに送信（実装は環境に依存）
      console.log('エラーレポート送信:', error);

      // 例: Sentry、LogRocket、DataDog等への送信
      // await errorReportingService.report(error);
    } catch (reportError) {
      console.error('エラーレポートの送信に失敗しました:', reportError);
    }
  }

  /**
   * リトライカウントをクリア
   */
  clearRetryCount(errorCode: string): void {
    const keysToDelete = Array.from(this.retryCountMap.keys()).filter(key =>
      key.startsWith(errorCode)
    );
    keysToDelete.forEach(key => this.retryCountMap.delete(key));
  }

  /**
   * 全てのリトライカウントをクリア
   */
  clearAllRetryCounts(): void {
    this.retryCountMap.clear();
  }

  /**
   * エラーハンドラーの設定を更新
   */
  updateConfig(options: Partial<ErrorHandlerOptions>): void {
    if (options.retryConfig) {
      this.retryConfig = { ...this.retryConfig, ...options.retryConfig };
    }
    if (options.notificationConfig) {
      this.notificationConfig = { ...this.notificationConfig, ...options.notificationConfig };
    }
    this.options = { ...this.options, ...options };
  }
}

/**
 * デフォルトのエラーハンドラーインスタンス
 */
export const authErrorHandler = new AuthErrorHandler();

/**
 * エラーハンドラーファクトリー関数
 */
export const createAuthErrorHandler = (options?: ErrorHandlerOptions): AuthErrorHandler => {
  return new AuthErrorHandler(options);
};

/**
 * エラー分類ユーティリティ関数
 */
export const classifyError = (error: unknown): AuthError => {
  return authErrorHandler.handleError(error) as AuthError;
};

/**
 * エラーが特定のカテゴリかチェック
 */
export const isErrorCategory = (error: AuthError, category: ErrorCategory): boolean => {
  return error.category === category;
};

/**
 * エラーが特定の重要度かチェック
 */
export const isErrorSeverity = (error: AuthError, severity: ErrorSeverity): boolean => {
  return error.severity === severity;
};

/**
 * エラーがリトライ可能かチェック
 */
export const isRetryableError = (error: AuthError): boolean => {
  return error.retryable && error.category !== ErrorCategory.SECURITY;
};

/**
 * エラーがセキュリティ関連かチェック
 */
export const isSecurityError = (error: AuthError): boolean => {
  return error.category === ErrorCategory.SECURITY;
};

export default AuthErrorHandler;
