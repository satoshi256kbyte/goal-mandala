/**
 * 進捗計算エラーハンドラー
 * 要件: 全要件 - エラーハンドリング
 */

import {
  ProgressCalculationError,
  type ProgressCalculationErrorDetails,
  type ErrorHandlingStrategy,
  type ErrorNotificationConfig,
  type FallbackValueConfig,
  type ErrorLogConfig,
  type ErrorStatistics,
} from '../types/progress-errors';

/**
 * エラー処理戦略の定義
 */
const ERROR_STRATEGIES: Record<ProgressCalculationError, ErrorHandlingStrategy> = {
  [ProgressCalculationError.INVALID_ENTITY]: {
    retryCount: 0,
    fallbackValue: 0,
    notificationRequired: true,
    logLevel: 'error',
    userMessage: '無効なデータが検出されました。ページを再読み込みしてください。',
    autoRecover: false,
  },
  [ProgressCalculationError.CIRCULAR_DEPENDENCY]: {
    retryCount: 0,
    fallbackValue: -1,
    notificationRequired: true,
    logLevel: 'error',
    userMessage: 'データの循環参照が検出されました。管理者にお問い合わせください。',
    autoRecover: false,
  },
  [ProgressCalculationError.CALCULATION_TIMEOUT]: {
    retryCount: 2,
    fallbackValue: -1,
    notificationRequired: false,
    logLevel: 'warn',
    userMessage: '計算に時間がかかっています。しばらくお待ちください。',
    autoRecover: true,
  },
  [ProgressCalculationError.DATA_INCONSISTENCY]: {
    retryCount: 1,
    fallbackValue: 0,
    notificationRequired: true,
    logLevel: 'warn',
    userMessage: 'データに不整合があります。自動修復を試行中です。',
    autoRecover: true,
  },
  [ProgressCalculationError.NETWORK_ERROR]: {
    retryCount: 3,
    fallbackValue: -1,
    notificationRequired: true,
    logLevel: 'warn',
    userMessage: 'ネットワークエラーが発生しました。接続を確認してください。',
    autoRecover: true,
  },
  [ProgressCalculationError.AUTHENTICATION_ERROR]: {
    retryCount: 1,
    fallbackValue: 0,
    notificationRequired: true,
    logLevel: 'error',
    userMessage: '認証が必要です。再度ログインしてください。',
    autoRecover: false,
  },
  [ProgressCalculationError.AUTHORIZATION_ERROR]: {
    retryCount: 0,
    fallbackValue: 0,
    notificationRequired: true,
    logLevel: 'error',
    userMessage: 'このデータにアクセスする権限がありません。',
    autoRecover: false,
  },
  [ProgressCalculationError.DATA_FETCH_ERROR]: {
    retryCount: 2,
    fallbackValue: -1,
    notificationRequired: true,
    logLevel: 'warn',
    userMessage: 'データの取得に失敗しました。再試行中です。',
    autoRecover: true,
  },
  [ProgressCalculationError.CACHE_ERROR]: {
    retryCount: 1,
    fallbackValue: -1,
    notificationRequired: false,
    logLevel: 'info',
    userMessage: 'キャッシュエラーが発生しました。データを再取得します。',
    autoRecover: true,
  },
  [ProgressCalculationError.UNKNOWN_ERROR]: {
    retryCount: 1,
    fallbackValue: 0,
    notificationRequired: true,
    logLevel: 'error',
    userMessage: '予期しないエラーが発生しました。',
    autoRecover: true,
  },
};

/**
 * フォールバック値の設定
 */
const FALLBACK_VALUES: FallbackValueConfig = {
  defaultProgress: 0,
  calculatingProgress: -1,
  errorProgress: -2,
  noDataProgress: 0,
};

/**
 * 進捗計算エラーハンドラークラス
 */
export class ProgressErrorHandler {
  private errorStatistics: ErrorStatistics = {
    totalErrors: 0,
    errorsByType: {},
    errorRate: 0,
    recoveryRate: 0,
  };

  private notificationCallbacks: Array<(config: ErrorNotificationConfig) => void> = [];
  private logCallbacks: Array<(config: ErrorLogConfig) => void> = [];

  /**
   * エラー通知コールバックを登録
   */
  onNotification(callback: (config: ErrorNotificationConfig) => void): void {
    this.notificationCallbacks.push(callback);
  }

  /**
   * ログコールバックを登録
   */
  onLog(callback: (config: ErrorLogConfig) => void): void {
    this.logCallbacks.push(callback);
  }

  /**
   * エラーを処理し、適切な対応を実行する
   */
  async handleError(
    error: any,
    entityId?: string,
    entityType?: 'task' | 'action' | 'subgoal' | 'goal'
  ): Promise<{ value: number; wasRetried: boolean; wasNotified: boolean }> {
    const errorDetails = this.normalizeError(error, entityId, entityType);
    const strategy = this.getErrorStrategy(errorDetails.type);

    // エラー統計を更新
    this.updateErrorStatistics(errorDetails.type);

    // ログを記録
    this.logError(errorDetails, strategy);

    // リトライ処理
    let wasRetried = false;
    if (strategy.retryCount > 0 && strategy.autoRecover) {
      wasRetried = true;
      // 実際のリトライ処理は呼び出し元で実装
    }

    // 通知処理
    let wasNotified = false;
    if (strategy.notificationRequired) {
      this.notifyError(errorDetails, strategy);
      wasNotified = true;
    }

    // フォールバック値を返す
    const fallbackValue = this.getFallbackValue(errorDetails.type, strategy);

    return {
      value: fallbackValue,
      wasRetried,
      wasNotified,
    };
  }

  /**
   * 成功結果を作成
   */
  createSuccessResult(value: number): { value: number; wasRetried: boolean; wasNotified: boolean } {
    return {
      value,
      wasRetried: false,
      wasNotified: false,
    };
  }

  /**
   * エラーの種類を判定
   */
  classifyError(error: Error): ProgressCalculationError {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return ProgressCalculationError.CALCULATION_TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ProgressCalculationError.NETWORK_ERROR;
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ProgressCalculationError.AUTHENTICATION_ERROR;
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return ProgressCalculationError.AUTHORIZATION_ERROR;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ProgressCalculationError.INVALID_ENTITY;
    }
    if (message.includes('circular') || message.includes('dependency')) {
      return ProgressCalculationError.CIRCULAR_DEPENDENCY;
    }
    if (message.includes('inconsistent') || message.includes('integrity')) {
      return ProgressCalculationError.DATA_INCONSISTENCY;
    }
    if (message.includes('cache')) {
      return ProgressCalculationError.CACHE_ERROR;
    }

    return ProgressCalculationError.UNKNOWN_ERROR;
  }

  /**
   * エラー統計情報を取得
   */
  getErrorStatistics(): ErrorStatistics {
    return { ...this.errorStatistics };
  }

  /**
   * エラー統計をリセット
   */
  resetErrorStatistics(): void {
    this.errorStatistics = {
      totalErrors: 0,
      errorsByType: {},
      errorRate: 0,
      recoveryRate: 0,
    };
  }

  /**
   * フォールバック値の設定を取得
   */
  getFallbackConfig(): FallbackValueConfig {
    return { ...FALLBACK_VALUES };
  }

  /**
   * エラーを正規化
   */
  private normalizeError(
    error: any,
    entityId?: string,
    entityType?: 'task' | 'action' | 'subgoal' | 'goal'
  ): ProgressCalculationErrorDetails {
    if ('type' in error) {
      // 既にProgressCalculationErrorDetailsの場合
      return error;
    }

    // 通常のErrorからProgressCalculationErrorDetailsに変換
    const errorType = this.classifyError(error);
    return {
      type: errorType,
      message: error.message,
      entityId,
      entityType,
      timestamp: new Date(),
      stack: error.stack,
      cause: error,
    };
  }

  /**
   * エラー戦略を取得
   */
  private getErrorStrategy(errorType: ProgressCalculationError): ErrorHandlingStrategy {
    return ERROR_STRATEGIES[errorType] || ERROR_STRATEGIES[ProgressCalculationError.UNKNOWN_ERROR];
  }

  /**
   * フォールバック値を取得
   */
  private getFallbackValue(
    errorType: ProgressCalculationError,
    strategy: ErrorHandlingStrategy
  ): number {
    // 戦略で指定されたフォールバック値を優先
    if (strategy.fallbackValue !== undefined) {
      return strategy.fallbackValue;
    }

    // エラータイプに応じたデフォルト値
    switch (errorType) {
      case ProgressCalculationError.CALCULATION_TIMEOUT:
      case ProgressCalculationError.NETWORK_ERROR:
      case ProgressCalculationError.DATA_FETCH_ERROR:
      case ProgressCalculationError.CACHE_ERROR:
        return FALLBACK_VALUES.calculatingProgress;
      case ProgressCalculationError.INVALID_ENTITY:
      case ProgressCalculationError.AUTHENTICATION_ERROR:
      case ProgressCalculationError.AUTHORIZATION_ERROR:
        return FALLBACK_VALUES.noDataProgress;
      case ProgressCalculationError.DATA_INCONSISTENCY:
      case ProgressCalculationError.CIRCULAR_DEPENDENCY:
        return FALLBACK_VALUES.errorProgress;
      default:
        return FALLBACK_VALUES.defaultProgress;
    }
  }

  /**
   * エラーをログに記録
   */
  private logError(error: ProgressCalculationErrorDetails, strategy: ErrorHandlingStrategy): void {
    const logConfig: ErrorLogConfig = {
      level: strategy.logLevel,
      message: `Progress calculation error: ${error.message}`,
      metadata: {
        errorType: error.type,
        entityId: error.entityId,
        entityType: error.entityType,
        timestamp: error.timestamp,
        retryCount: error.retryCount,
        stack: error.stack,
      },
    };

    // 登録されたログコールバックを実行
    this.logCallbacks.forEach(callback => {
      try {
        callback(logConfig);
      } catch (callbackError) {
        console.error('Error in log callback:', callbackError);
      }
    });

    // デフォルトのコンソールログ
    if (this.logCallbacks.length === 0) {
      const logMethod =
        strategy.logLevel === 'error'
          ? console.error
          : strategy.logLevel === 'warn'
            ? console.warn
            : console.info;
      logMethod(`[ProgressErrorHandler] ${logConfig.message}`, logConfig.metadata);
    }
  }

  /**
   * エラー通知を送信
   */
  private notifyError(
    error: { type: ProgressCalculationError; message: string },
    strategy: ErrorHandlingStrategy
  ): void {
    const notificationConfig: ErrorNotificationConfig = {
      type: strategy.logLevel === 'error' ? 'modal' : 'toast',
      severity:
        strategy.logLevel === 'error' ? 'error' : strategy.logLevel === 'warn' ? 'warning' : 'info',
      message: strategy.userMessage || error.message,
      autoCloseDelay: strategy.logLevel === 'error' ? undefined : 5000,
      actions: this.getErrorActions(error.type, strategy),
    };

    // 登録された通知コールバックを実行
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notificationConfig);
      } catch (callbackError) {
        console.error('Error in notification callback:', callbackError);
      }
    });
  }

  /**
   * エラーに応じたアクションボタンを取得
   */
  private getErrorActions(
    _errorType: ProgressCalculationError,
    strategy: ErrorHandlingStrategy
  ): ErrorNotificationConfig['actions'] {
    const actions: NonNullable<ErrorNotificationConfig['actions']> = [];

    // 再試行ボタン
    if (strategy.retryCount > 0) {
      actions.push({
        label: '再試行',
        action: () => {
          // 再試行処理は呼び出し元で実装
          window.location.reload();
        },
        variant: 'primary',
      });
    }

    // 認証エラーの場合はログインボタン
    if (_errorType === ProgressCalculationError.AUTHENTICATION_ERROR) {
      actions.push({
        label: 'ログイン',
        action: () => {
          // ログイン画面に遷移
          window.location.href = '/login';
        },
        variant: 'primary',
      });
    }

    // ページリロードボタン
    if (
      _errorType === ProgressCalculationError.INVALID_ENTITY ||
      _errorType === ProgressCalculationError.DATA_INCONSISTENCY
    ) {
      actions.push({
        label: 'ページを再読み込み',
        action: () => {
          window.location.reload();
        },
        variant: 'secondary',
      });
    }

    return actions.length > 0 ? actions : undefined;
  }

  /**
   * エラー統計を更新
   */
  private updateErrorStatistics(errorType: ProgressCalculationError): void {
    this.errorStatistics.totalErrors++;
    this.errorStatistics.errorsByType[errorType] =
      (this.errorStatistics.errorsByType[errorType] || 0) + 1;
    this.errorStatistics.lastErrorTime = new Date();

    // 最も頻繁に発生するエラーを更新
    let maxCount = 0;
    let mostFrequent: ProgressCalculationError | undefined;

    Object.entries(this.errorStatistics.errorsByType).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = type as ProgressCalculationError;
      }
    });

    this.errorStatistics.mostFrequentError = mostFrequent;
  }
}

// シングルトンインスタンスをエクスポート
export const progressErrorHandler = new ProgressErrorHandler();
