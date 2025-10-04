/**
 * サブ目標・アクション入力フォーム専用エラーハンドリングサービス
 *
 * 機能:
 * - エラー分類・表示戦略実装
 * - ネットワークエラー対応実装
 * - バリデーションエラー表示実装
 * - 復旧機能実装
 *
 * 要件: 要件1, 要件2, 要件3
 */

import {
  FormError,
  FormErrorType,
  FormErrorSeverity,
  ErrorDisplayStrategy,
  ValidationErrorDetail,
  NetworkErrorDetail,
  ErrorRecoveryOptions,
  ErrorContext,
} from '../types/form-error';

/**
 * エラー表示戦略マッピング
 */
const ERROR_DISPLAY_STRATEGIES: Record<FormErrorType, ErrorDisplayStrategy> = {
  [FormErrorType.VALIDATION_ERROR]: {
    inline: true,
    toast: false,
    modal: false,
    summary: true,
  },
  [FormErrorType.NETWORK_ERROR]: {
    inline: false,
    toast: true,
    modal: false,
    summary: false,
  },
  [FormErrorType.SERVER_ERROR]: {
    inline: false,
    toast: false,
    modal: true,
    summary: false,
  },
  [FormErrorType.BUSINESS_LOGIC_ERROR]: {
    inline: true,
    toast: true,
    modal: false,
    summary: true,
  },
  [FormErrorType.DRAFT_SAVE_ERROR]: {
    inline: false,
    toast: true,
    modal: false,
    summary: false,
  },
  [FormErrorType.AUTHENTICATION_ERROR]: {
    inline: false,
    toast: false,
    modal: true,
    summary: false,
  },
  [FormErrorType.AUTHORIZATION_ERROR]: {
    inline: false,
    toast: false,
    modal: true,
    summary: false,
  },
  [FormErrorType.TIMEOUT_ERROR]: {
    inline: false,
    toast: true,
    modal: false,
    summary: false,
  },
  [FormErrorType.RATE_LIMIT_ERROR]: {
    inline: false,
    toast: true,
    modal: false,
    summary: false,
  },
};

/**
 * エラーメッセージマッピング
 */
const ERROR_MESSAGES: Record<string, string> = {
  // バリデーションエラー
  required: 'この項目は必須です',
  minLength: '文字数が不足しています',
  maxLength: '文字数が上限を超えています',
  pattern: '入力形式が正しくありません',
  email: 'メールアドレスの形式が正しくありません',
  url: 'URLの形式が正しくありません',
  date: '日付の形式が正しくありません',
  number: '数値を入力してください',
  integer: '整数を入力してください',
  positive: '正の値を入力してください',
  range: '値が範囲外です',

  // ネットワークエラー
  NetworkError: 'ネットワークエラーが発生しました。接続を確認してください',
  TimeoutError: 'リクエストがタイムアウトしました。しばらく待ってから再試行してください',
  ConnectionError: 'サーバーに接続できませんでした',
  ServiceUnavailable: 'サービスが一時的に利用できません',

  // サーバーエラー
  InternalServerError: 'サーバー内部エラーが発生しました',
  BadRequest: 'リクエストが正しくありません',
  Unauthorized: '認証が必要です',
  Forbidden: 'アクセス権限がありません',
  NotFound: 'リソースが見つかりません',
  Conflict: 'データの競合が発生しました',

  // ビジネスロジックエラー
  DuplicateTitle: 'このタイトルは既に使用されています',
  InvalidGoalStructure: 'マンダラチャートの構造が正しくありません',
  ExceededLimit: '制限を超えています',
  InvalidOperation: '無効な操作です',

  // 下書き保存エラー
  DraftSaveError: '下書きの保存に失敗しました',
  DraftLoadError: '下書きの読み込みに失敗しました',
  StorageQuotaExceeded: 'ストレージ容量が不足しています',

  // 認証・認可エラー
  TokenExpired: 'セッションの有効期限が切れました。再ログインしてください',
  InvalidToken: '認証トークンが無効です',
  InsufficientPermissions: 'この操作を実行する権限がありません',

  // レート制限エラー
  TooManyRequests: 'リクエストが多すぎます。しばらく待ってから再試行してください',
  RateLimitExceeded: '制限回数を超えました',

  // デフォルト
  UnknownError: '予期しないエラーが発生しました',
};

/**
 * フォームエラーハンドラークラス
 */
export class FormErrorHandler {
  private errorListeners: Array<(error: FormError) => void> = [];
  private recoveryOptions: Map<string, ErrorRecoveryOptions> = new Map();

  /**
   * エラーリスナーを追加
   */
  addErrorListener(listener: (error: FormError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * エラー復旧オプションを設定
   */
  setRecoveryOptions(errorCode: string, options: ErrorRecoveryOptions): void {
    this.recoveryOptions.set(errorCode, options);
  }

  /**
   * エラーを処理
   * 要件1, 要件2, 要件3: エラー分類・表示戦略実装
   */
  async handleError(error: unknown, context: ErrorContext): Promise<FormError> {
    const formError = this.normalizeError(error);

    // エラーログ出力
    this.logError(formError, context);

    // エラーリスナーに通知
    this.notifyErrorListeners(formError);

    // エラー表示戦略に基づいて表示
    await this.displayError(formError);

    // 復旧オプションがある場合は提供
    this.provideRecoveryOptions(formError);

    return formError;
  }

  /**
   * バリデーションエラーを処理
   * 要件3: バリデーションエラー表示実装
   */
  handleValidationErrors(
    validationErrors: ValidationErrorDetail[],
    context: ErrorContext
  ): FormError[] {
    return validationErrors.map(detail => {
      const formError: FormError = {
        type: FormErrorType.VALIDATION_ERROR,
        severity: FormErrorSeverity.MEDIUM,
        field: detail.field,
        message: this.getValidationErrorMessage(detail),
        code: detail.rule,
        details: { value: detail.value },
        timestamp: new Date(),
        retryable: false,
        displayStrategy: ERROR_DISPLAY_STRATEGIES[FormErrorType.VALIDATION_ERROR],
      };

      // エラーログ出力
      this.logError(formError, context);

      // エラーリスナーに通知
      this.notifyErrorListeners(formError);

      return formError;
    });
  }

  /**
   * ネットワークエラーを処理
   * 要件1, 要件2: ネットワークエラー対応実装
   */
  async handleNetworkError(
    error: unknown,
    context: ErrorContext,
    networkDetail?: NetworkErrorDetail
  ): Promise<FormError> {
    const formError: FormError = {
      type: FormErrorType.NETWORK_ERROR,
      severity: this.getNetworkErrorSeverity(networkDetail),
      message: this.getNetworkErrorMessage(networkDetail),
      code: this.getNetworkErrorCode(networkDetail),
      details: networkDetail as Record<string, unknown>,
      timestamp: new Date(),
      retryable: true,
      displayStrategy: ERROR_DISPLAY_STRATEGIES[FormErrorType.NETWORK_ERROR],
    };

    // エラーログ出力
    this.logError(formError, context);

    // エラーリスナーに通知
    this.notifyErrorListeners(formError);

    // ネットワークエラー専用の表示
    await this.displayNetworkError(formError);

    // 自動リトライオプションを提供
    this.provideNetworkRecoveryOptions(formError);

    return formError;
  }

  /**
   * エラーを正規化
   */
  private normalizeError(error: unknown): FormError {
    let type = FormErrorType.SERVER_ERROR;
    let severity = FormErrorSeverity.MEDIUM;
    let message = ERROR_MESSAGES.UnknownError;
    let code = 'UnknownError';
    let retryable = false;
    let field: string | undefined;

    if (error && typeof error === 'object') {
      // HTTPエラーレスポンスの場合
      if ('status' in error) {
        const httpError = error as { status: number; statusText?: string; data?: unknown };
        code = `HTTP${httpError.status}`;

        switch (httpError.status) {
          case 400:
            type = FormErrorType.VALIDATION_ERROR;
            severity = FormErrorSeverity.MEDIUM;
            message = ERROR_MESSAGES.BadRequest;
            break;
          case 401:
            type = FormErrorType.AUTHENTICATION_ERROR;
            severity = FormErrorSeverity.HIGH;
            message = ERROR_MESSAGES.Unauthorized;
            break;
          case 403:
            type = FormErrorType.AUTHORIZATION_ERROR;
            severity = FormErrorSeverity.HIGH;
            message = ERROR_MESSAGES.Forbidden;
            break;
          case 404:
            type = FormErrorType.SERVER_ERROR;
            severity = FormErrorSeverity.MEDIUM;
            message = ERROR_MESSAGES.NotFound;
            break;
          case 409:
            type = FormErrorType.BUSINESS_LOGIC_ERROR;
            severity = FormErrorSeverity.MEDIUM;
            message = ERROR_MESSAGES.Conflict;
            break;
          case 429:
            type = FormErrorType.RATE_LIMIT_ERROR;
            severity = FormErrorSeverity.MEDIUM;
            message = ERROR_MESSAGES.TooManyRequests;
            retryable = true;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            type = FormErrorType.SERVER_ERROR;
            severity = FormErrorSeverity.HIGH;
            message = ERROR_MESSAGES.InternalServerError;
            retryable = true;
            break;
        }
      }

      // エラーコードがある場合
      if ('code' in error) {
        code = (error as { code: string }).code;
        message = ERROR_MESSAGES[code] || message;
      }

      // エラーメッセージがある場合
      if ('message' in error) {
        const errorMessage = (error as { message: string }).message;
        if (errorMessage) {
          message = errorMessage;
        }
      }

      // フィールド情報がある場合
      if ('field' in error) {
        field = (error as { field: string }).field;
      }

      // ネットワークエラーの検出
      if (error instanceof TypeError && error.message.includes('fetch')) {
        type = FormErrorType.NETWORK_ERROR;
        code = 'NetworkError';
        message = ERROR_MESSAGES.NetworkError;
        retryable = true;
      }
    }

    return {
      type,
      severity,
      field,
      message,
      code,
      details: { originalError: error },
      timestamp: new Date(),
      retryable,
      displayStrategy: ERROR_DISPLAY_STRATEGIES[type],
    };
  }

  /**
   * バリデーションエラーメッセージを取得
   */
  private getValidationErrorMessage(detail: ValidationErrorDetail): string {
    const baseMessage = ERROR_MESSAGES[detail.rule] || ERROR_MESSAGES.UnknownError;

    // フィールド名を含めたメッセージを生成
    const fieldNames: Record<string, string> = {
      title: 'タイトル',
      description: '説明',
      background: '背景',
      constraints: '制約事項',
      deadline: '期限',
    };

    const fieldName = fieldNames[detail.field] || detail.field;
    return `${fieldName}: ${baseMessage}`;
  }

  /**
   * ネットワークエラーの重要度を取得
   */
  private getNetworkErrorSeverity(detail?: NetworkErrorDetail): FormErrorSeverity {
    if (!detail) return FormErrorSeverity.MEDIUM;

    if (detail.timeout) return FormErrorSeverity.MEDIUM;
    if (detail.status && detail.status >= 500) return FormErrorSeverity.HIGH;
    if (detail.status && detail.status >= 400) return FormErrorSeverity.MEDIUM;

    return FormErrorSeverity.MEDIUM;
  }

  /**
   * ネットワークエラーメッセージを取得
   */
  private getNetworkErrorMessage(detail?: NetworkErrorDetail): string {
    if (!detail) return ERROR_MESSAGES.NetworkError;

    if (detail.timeout) return ERROR_MESSAGES.TimeoutError;
    if (detail.status === 503) return ERROR_MESSAGES.ServiceUnavailable;
    if (detail.status && detail.status >= 500) return ERROR_MESSAGES.InternalServerError;

    return ERROR_MESSAGES.NetworkError;
  }

  /**
   * ネットワークエラーコードを取得
   */
  private getNetworkErrorCode(detail?: NetworkErrorDetail): string {
    if (!detail) return 'NetworkError';

    if (detail.timeout) return 'TimeoutError';
    if (detail.status) return `HTTP${detail.status}`;

    return 'NetworkError';
  }

  /**
   * エラーログ出力
   */
  private logError(error: FormError, context: ErrorContext): void {
    const logData = {
      error: {
        type: error.type,
        severity: error.severity,
        code: error.code,
        message: error.message,
        field: error.field,
      },
      context: {
        component: context.component,
        action: context.action,
        userId: context.userId,
        timestamp: context.timestamp.toISOString(),
      },
      details: error.details,
    };

    switch (error.severity) {
      case FormErrorSeverity.CRITICAL:
      case FormErrorSeverity.HIGH:
        console.error('Form Error:', logData);
        break;
      case FormErrorSeverity.MEDIUM:
        console.warn('Form Error:', logData);
        break;
      case FormErrorSeverity.LOW:
        console.info('Form Error:', logData);
        break;
    }

    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      this.sendToLogService(logData);
    }
  }

  /**
   * エラーリスナーに通知
   */
  private notifyErrorListeners(error: FormError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * エラー表示
   */
  private async displayError(error: FormError): Promise<void> {
    const strategy = error.displayStrategy;

    if (strategy.toast) {
      this.showToast(error);
    }

    if (strategy.modal) {
      await this.showModal(error);
    }

    if (strategy.summary) {
      this.showSummary(error);
    }

    // インライン表示は個別のフィールドコンポーネントで処理
  }

  /**
   * ネットワークエラー専用表示
   */
  private async displayNetworkError(error: FormError): Promise<void> {
    // ネットワークエラー専用のトースト表示
    this.showNetworkErrorToast(error);

    // 重要度が高い場合はモーダル表示
    if (error.severity === FormErrorSeverity.HIGH) {
      await this.showNetworkErrorModal(error);
    }
  }

  /**
   * 復旧オプションを提供
   * 要件1, 要件2, 要件3: 復旧機能実装
   */
  private provideRecoveryOptions(error: FormError): void {
    const options = this.recoveryOptions.get(error.code || '');
    if (!options) return;

    // 復旧オプションをUIに表示するためのイベントを発火
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('form:error:recovery', {
          detail: {
            error,
            options,
          },
        })
      );
    }
  }

  /**
   * ネットワーク復旧オプションを提供
   */
  private provideNetworkRecoveryOptions(error: FormError): void {
    const options: ErrorRecoveryOptions = {
      retry: async () => {
        // 元のアクションを再実行
        console.log('Retrying network request...');
      },
      reload: () => {
        window.location.reload();
      },
    };

    this.setRecoveryOptions(error.code || 'NetworkError', options);
    this.provideRecoveryOptions(error);
  }

  /**
   * トースト表示
   */
  private showToast(error: FormError): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('form:error:toast', {
          detail: {
            message: error.message,
            severity: error.severity,
            type: error.type,
          },
        })
      );
    }
  }

  /**
   * モーダル表示
   */
  private async showModal(error: FormError): Promise<void> {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('form:error:modal', {
          detail: {
            message: error.message,
            severity: error.severity,
            type: error.type,
            code: error.code,
          },
        })
      );
    }
  }

  /**
   * サマリー表示
   */
  private showSummary(error: FormError): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('form:error:summary', {
          detail: {
            message: error.message,
            field: error.field,
            severity: error.severity,
          },
        })
      );
    }
  }

  /**
   * ネットワークエラー専用トースト表示
   */
  private showNetworkErrorToast(error: FormError): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('form:error:network:toast', {
          detail: {
            message: error.message,
            retryable: error.retryable,
            code: error.code,
          },
        })
      );
    }
  }

  /**
   * ネットワークエラー専用モーダル表示
   */
  private async showNetworkErrorModal(error: FormError): Promise<void> {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('form:error:network:modal', {
          detail: {
            message: error.message,
            retryable: error.retryable,
            code: error.code,
            details: error.details,
          },
        })
      );
    }
  }

  /**
   * 外部ログサービスに送信
   */
  private async sendToLogService(logData: unknown): Promise<void> {
    try {
      // 実際の実装では外部ログサービス（Sentry、LogRocket等）に送信
      console.log('Sending to log service:', logData);
    } catch (error) {
      console.error('Failed to send log to service:', error);
    }
  }

  /**
   * エラーハンドラーをクリア
   */
  clear(): void {
    this.errorListeners.length = 0;
    this.recoveryOptions.clear();
  }
}

/**
 * デフォルトのフォームエラーハンドラーインスタンス
 */
export const formErrorHandler = new FormErrorHandler();

export default FormErrorHandler;
