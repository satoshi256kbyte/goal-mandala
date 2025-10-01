/**
 * APIサービス - ネットワークエラーハンドリング機能付き
 *
 * 機能:
 * - 自動リトライ機能
 * - タイムアウト処理
 * - ネットワークエラーの分類
 * - エラー回復機能
 */

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  retryable: boolean;
  timestamp: Date;
}

export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * ネットワークエラーの種類
 */
export enum NetworkErrorType {
  TIMEOUT = 'TIMEOUT',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  OFFLINE = 'OFFLINE',
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: Required<ApiRequestConfig> = {
  timeout: 30000, // 30秒
  retries: 3,
  retryDelay: 1000, // 1秒
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * APIクライアントクラス
 */
export class ApiClient {
  private baseURL: string;
  private defaultConfig: Required<ApiRequestConfig>;

  constructor(baseURL: string = '', config: Partial<ApiRequestConfig> = {}) {
    this.baseURL = baseURL;
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * GETリクエスト
   */
  async get<T = unknown>(
    url: string,
    config: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  /**
   * POSTリクエスト
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  /**
   * PUTリクエスト
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  /**
   * DELETEリクエスト
   */
  async delete<T = unknown>(
    url: string,
    config: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  /**
   * 基本リクエストメソッド
   */
  private async request<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    config: Partial<ApiRequestConfig> = {}
  ): Promise<ApiResponse<T>> {
    const requestConfig = { ...this.defaultConfig, ...config };
    const fullUrl = this.buildUrl(url);

    let lastError: ApiError | null = null;

    // リトライループ
    for (let attempt = 0; attempt <= requestConfig.retries; attempt++) {
      try {
        // オンライン状態をチェック
        if (!this.isOnline()) {
          throw this.createApiError(NetworkErrorType.OFFLINE, 'オフラインです');
        }

        const response = await this.executeRequest<T>(method, fullUrl, data, requestConfig);
        return response;
      } catch (error) {
        lastError = this.normalizeError(error);

        // 最後の試行でない場合、リトライ可能なエラーならリトライ
        if (attempt < requestConfig.retries && lastError.retryable) {
          await this.delay(requestConfig.retryDelay * Math.pow(2, attempt)); // 指数バックオフ
          continue;
        }

        // リトライ不可能またはリトライ回数上限に達した場合はエラーを投げる
        throw lastError;
      }
    }

    // ここには到達しないはずだが、型安全性のため
    throw lastError || this.createApiError(NetworkErrorType.CONNECTION_ERROR, '不明なエラー');
  }

  /**
   * 実際のHTTPリクエストを実行
   */
  private async executeRequest<T = unknown>(
    method: string,
    url: string,
    data?: unknown,
    config: Required<ApiRequestConfig>
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: config.headers,
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // レスポンスヘッダーを取得
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // ステータスコードをチェック
      if (!response.ok) {
        throw this.createHttpError(response.status, response.statusText);
      }

      // レスポンスボディを解析
      let responseData: T;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as unknown as T;
      }

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // AbortErrorの場合はタイムアウトエラーとして処理
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createApiError(NetworkErrorType.TIMEOUT, 'リクエストがタイムアウトしました');
      }

      throw error;
    }
  }

  /**
   * URLを構築
   */
  private buildUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseURL}${url.startsWith('/') ? url : `/${url}`}`;
  }

  /**
   * エラーを正規化
   */
  private normalizeError(error: unknown): ApiError {
    if (error && typeof error === 'object' && 'code' in error) {
      return error as ApiError;
    }

    if (error instanceof TypeError) {
      // ネットワークエラー（fetch失敗）
      return this.createApiError(NetworkErrorType.CONNECTION_ERROR, 'ネットワークに接続できません');
    }

    if (error instanceof Error) {
      return this.createApiError(
        NetworkErrorType.CONNECTION_ERROR,
        error.message || 'ネットワークエラーが発生しました'
      );
    }

    return this.createApiError(
      NetworkErrorType.CONNECTION_ERROR,
      '不明なネットワークエラーが発生しました'
    );
  }

  /**
   * HTTPステータスエラーを作成
   */
  private createHttpError(status: number, statusText: string): ApiError {
    let errorType: NetworkErrorType;
    let message: string;
    // let retryable: boolean;

    if (status >= 500) {
      errorType = NetworkErrorType.SERVER_ERROR;
      message = 'サーバーエラーが発生しました';
      // retryable = true;
    } else if (status === 429) {
      errorType = NetworkErrorType.RATE_LIMIT;
      message = 'リクエストが多すぎます。しばらく待ってから再試行してください';
      // retryable = true;
    } else if (status >= 400) {
      errorType = NetworkErrorType.CLIENT_ERROR;
      message = 'リクエストエラーが発生しました';
      // retryable = false;
    } else {
      errorType = NetworkErrorType.CONNECTION_ERROR;
      message = statusText || 'HTTPエラーが発生しました';
      // retryable = false;
    }

    return this.createApiError(errorType, message, status);
  }

  /**
   * APIエラーを作成
   */
  private createApiError(type: NetworkErrorType, message: string, status?: number): ApiError {
    const retryableTypes = [
      NetworkErrorType.TIMEOUT,
      NetworkErrorType.CONNECTION_ERROR,
      NetworkErrorType.SERVER_ERROR,
      NetworkErrorType.RATE_LIMIT,
    ];

    return {
      code: type,
      message,
      status,
      retryable: retryableTypes.includes(type),
      timestamp: new Date(),
    };
  }

  /**
   * オンライン状態をチェック
   */
  private isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ApiRequestConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * ベースURLを更新
   */
  updateBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }
}

/**
 * デフォルトのAPIクライアントインスタンス
 */
export const apiClient = new ApiClient(process.env.REACT_APP_API_BASE_URL || '/api');

/**
 * 目標フォーム用のAPIサービス
 */
export const goalFormApiService = {
  /**
   * 下書きを保存
   */
  async saveDraft(draftData: unknown): Promise<{ success: boolean; draftId: string }> {
    const response = await apiClient.post<{ success: boolean; draftId: string }>(
      '/goals/draft',
      draftData
    );
    return response.data;
  },

  /**
   * 下書きを取得
   */
  async getDraft(draftId?: string): Promise<{ success: boolean; draftData: unknown }> {
    const url = draftId ? `/goals/draft/${draftId}` : '/goals/draft';
    const response = await apiClient.get<{ success: boolean; draftData: unknown }>(url);
    return response.data;
  },

  /**
   * 目標を作成
   */
  async createGoal(
    goalData: unknown
  ): Promise<{ success: boolean; goalId: string; processingId: string }> {
    const response = await apiClient.post<{
      success: boolean;
      goalId: string;
      processingId: string;
    }>('/goals', goalData);
    return response.data;
  },

  /**
   * 処理状況を確認
   */
  async getProcessingStatus(processingId: string): Promise<{ status: string; progress?: number }> {
    const response = await apiClient.get<{ status: string; progress?: number }>(
      `/goals/processing/${processingId}`
    );
    return response.data;
  },
};

export default apiClient;
