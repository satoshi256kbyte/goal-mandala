/**
 * エラー分類ユーティリティ
 *
 * エラーオブジェクトを分析して、適切なエラータイプとメッセージを返します。
 */

export type ErrorType = 'api' | 'network' | 'auth' | 'unknown';

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  originalError: unknown;
}

/**
 * エラーを分類する
 *
 * @param error - エラーオブジェクト
 * @returns 分類されたエラー情報
 *
 * @example
 * ```typescript
 * try {
 *   await fetchData();
 * } catch (error) {
 *   const classified = classifyError(error);
 *   console.log(classified.type); // 'network' | 'api' | 'auth' | 'unknown'
 *   console.log(classified.message); // ユーザー向けメッセージ
 * }
 * ```
 */
export function classifyError(error: unknown): ClassifiedError {
  // ネットワークエラーの判定
  if (isNetworkError(error)) {
    return {
      type: 'network',
      message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      originalError: error,
    };
  }

  // 認証エラーの判定
  if (isAuthError(error)) {
    return {
      type: 'auth',
      message: '認証エラーが発生しました。再度ログインしてください。',
      originalError: error,
    };
  }

  // APIエラーの判定
  if (isApiError(error)) {
    return {
      type: 'api',
      message: getApiErrorMessage(error),
      originalError: error,
    };
  }

  // その他のエラー
  return {
    type: 'unknown',
    message: '予期しないエラーが発生しました。しばらくしてから再度お試しください。',
    originalError: error,
  };
}

/**
 * ネットワークエラーかどうかを判定
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    // Fetch APIのネットワークエラー
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    // ネットワークエラーのメッセージパターン
    const networkErrorPatterns = [
      'network',
      'offline',
      'connection',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ];
    return networkErrorPatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  return false;
}

/**
 * 認証エラーかどうかを判定
 */
function isAuthError(error: unknown): boolean {
  // HTTPステータスコードが401または403
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    if (
      err.status === 401 ||
      err.status === 403 ||
      err.statusCode === 401 ||
      err.statusCode === 403
    ) {
      return true;
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      return true;
    }
  }

  // エラーメッセージに認証関連のキーワードが含まれる
  if (error instanceof Error) {
    const authErrorPatterns = ['unauthorized', 'forbidden', 'authentication', 'token'];
    return authErrorPatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  return false;
}

/**
 * APIエラーかどうかを判定
 */
function isApiError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    // HTTPステータスコードが存在する（4xx, 5xx）
    if (err.status >= 400 || err.statusCode >= 400 || err.response?.status >= 400) {
      return true;
    }
  }
  return false;
}

/**
 * APIエラーメッセージを取得
 */
function getApiErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as any;

    // レスポンスボディにメッセージがある場合
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.message) {
      return err.message;
    }

    // HTTPステータスコードに応じたメッセージ
    const status = err.status || err.statusCode || err.response?.status;
    if (status) {
      switch (status) {
        case 400:
          return 'リクエストが不正です。入力内容を確認してください。';
        case 404:
          return '要求されたデータが見つかりませんでした。';
        case 500:
          return 'サーバーエラーが発生しました。しばらくしてから再度お試しください。';
        case 503:
          return 'サービスが一時的に利用できません。しばらくしてから再度お試しください。';
        default:
          return `エラーが発生しました（ステータスコード: ${status}）`;
      }
    }
  }

  return 'APIエラーが発生しました。';
}
