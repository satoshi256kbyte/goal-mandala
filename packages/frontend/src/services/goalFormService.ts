import {
  GoalFormData,
  PartialGoalFormData,
  validateGoalForm,
  validatePartialGoalForm,
} from '../schemas/goal-form';

/**
 * API レスポンスの基本型
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 目標作成のレスポンス
 */
export interface CreateGoalResponse {
  goalId: string;
  processingId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
}

/**
 * 下書き保存のレスポンス
 */
export interface SaveDraftResponse {
  draftId: string;
  savedAt: string;
  message: string;
}

/**
 * 下書き取得のレスポンス
 */
export interface GetDraftResponse {
  draftData: PartialGoalFormData | null;
  savedAt: string | null;
  message: string;
}

/**
 * 処理状況の確認レスポンス
 */
export interface ProcessingStatusResponse {
  processingId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  goalId?: string;
  error?: string;
}

/**
 * API エラーの型
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * ネットワークエラーの型
 */
export class NetworkError extends Error {
  constructor(message: string = 'ネットワークエラーが発生しました') {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * バリデーションエラーの型
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * API クライアントの設定
 */
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';
const DEFAULT_TIMEOUT = 30000; // 30秒

/**
 * HTTP リクエストのオプション
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * HTTP リクエストを実行する関数
 */
const makeRequest = async <T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData.code,
        errorData.details
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof AbortError || error.name === 'AbortError') {
      throw new NetworkError('リクエストがタイムアウトしました');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError('ネットワーク接続を確認してください');
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new NetworkError('予期しないエラーが発生しました');
  }
};

/**
 * 認証トークンを取得する関数
 */
const getAuthToken = (): string | null => {
  // 実際の実装では認証コンテキストから取得
  return localStorage.getItem('authToken');
};

/**
 * 認証ヘッダーを取得する関数
 */
const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * 目標フォームサービスクラス
 */
export class GoalFormService {
  /**
   * 目標を作成する
   */
  static async createGoal(formData: GoalFormData): Promise<CreateGoalResponse> {
    // クライアントサイドでのバリデーション
    const validation = validateGoalForm(formData);
    if (!validation.isValid) {
      throw new ValidationError('入力データが無効です', validation.errors || {});
    }

    try {
      const response = await makeRequest<CreateGoalResponse>('/goals', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: validation.data,
        timeout: 60000, // AI処理のため長めのタイムアウト
      });

      if (!response.success || !response.data) {
        throw new ApiError(response.error || '目標の作成に失敗しました');
      }

      return response.data;
    } catch (error) {
      if (
        error instanceof ApiError ||
        error instanceof NetworkError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new ApiError('目標の作成中に予期しないエラーが発生しました');
    }
  }

  /**
   * 下書きを保存する
   */
  static async saveDraft(formData: PartialGoalFormData): Promise<SaveDraftResponse> {
    // 部分的なバリデーション
    const validation = validatePartialGoalForm(formData);
    if (!validation.isValid) {
      throw new ValidationError('下書きデータが無効です', validation.errors || {});
    }

    try {
      const response = await makeRequest<SaveDraftResponse>('/goals/draft', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: validation.data,
      });

      if (!response.success || !response.data) {
        throw new ApiError(response.error || '下書きの保存に失敗しました');
      }

      return response.data;
    } catch (error) {
      if (
        error instanceof ApiError ||
        error instanceof NetworkError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new ApiError('下書きの保存中に予期しないエラーが発生しました');
    }
  }

  /**
   * 下書きを取得する
   */
  static async getDraft(): Promise<GetDraftResponse> {
    try {
      const response = await makeRequest<GetDraftResponse>('/goals/draft', {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.success || !response.data) {
        throw new ApiError(response.error || '下書きの取得に失敗しました');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new ApiError('下書きの取得中に予期しないエラーが発生しました');
    }
  }

  /**
   * 下書きを削除する
   */
  static async deleteDraft(): Promise<void> {
    try {
      const response = await makeRequest('/goals/draft', {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.success) {
        throw new ApiError(response.error || '下書きの削除に失敗しました');
      }
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new ApiError('下書きの削除中に予期しないエラーが発生しました');
    }
  }

  /**
   * AI処理の状況を確認する
   */
  static async getProcessingStatus(processingId: string): Promise<ProcessingStatusResponse> {
    try {
      const response = await makeRequest<ProcessingStatusResponse>(
        `/goals/processing/${processingId}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.success || !response.data) {
        throw new ApiError(response.error || '処理状況の取得に失敗しました');
      }

      return response.data;
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new ApiError('処理状況の確認中に予期しないエラーが発生しました');
    }
  }

  /**
   * AI処理をキャンセルする
   */
  static async cancelProcessing(processingId: string): Promise<void> {
    try {
      const response = await makeRequest(`/goals/processing/${processingId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.success) {
        throw new ApiError(response.error || '処理のキャンセルに失敗しました');
      }
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new ApiError('処理のキャンセル中に予期しないエラーが発生しました');
    }
  }
}

/**
 * リトライ機能付きのリクエスト実行
 */
export const withRetry = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;

      // リトライしない条件
      if (
        error instanceof ValidationError ||
        (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500)
      ) {
        throw error;
      }

      // 最後の試行の場合はエラーを投げる
      if (attempt === maxRetries) {
        break;
      }

      // 指数バックオフでリトライ
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
};

/**
 * フォーム送信のユーティリティ関数
 */
export const submitGoalForm = async (
  formData: GoalFormData,
  options: {
    onProgress?: (message: string) => void;
    onSuccess?: (response: CreateGoalResponse) => void;
    onError?: (error: Error) => void;
    enableRetry?: boolean;
  } = {}
): Promise<CreateGoalResponse> => {
  const { onProgress, onSuccess, onError, enableRetry = true } = options;

  try {
    onProgress?.('AI生成を開始しています...');

    const submitFn = () => GoalFormService.createGoal(formData);
    const response = enableRetry ? await withRetry(submitFn) : await submitFn();

    onProgress?.('AI生成が完了しました');
    onSuccess?.(response);

    return response;
  } catch (error) {
    const err = error as Error;
    onError?.(err);
    throw err;
  }
};

/**
 * 下書き保存のユーティリティ関数
 */
export const saveDraftForm = async (
  formData: PartialGoalFormData,
  options: {
    onProgress?: (message: string) => void;
    onSuccess?: (response: SaveDraftResponse) => void;
    onError?: (error: Error) => void;
    enableRetry?: boolean;
  } = {}
): Promise<SaveDraftResponse> => {
  const { onProgress, onSuccess, onError, enableRetry = true } = options;

  try {
    onProgress?.('下書きを保存しています...');

    const saveFn = () => GoalFormService.saveDraft(formData);
    const response = enableRetry ? await withRetry(saveFn) : await saveFn();

    onProgress?.('下書きが保存されました');
    onSuccess?.(response);

    return response;
  } catch (error) {
    const err = error as Error;
    onError?.(err);
    throw err;
  }
};

/**
 * エラーメッセージを取得するユーティリティ関数
 */
export const getErrorMessage = (error: Error): string => {
  if (error instanceof ValidationError) {
    return '入力内容を確認してください';
  }

  if (error instanceof NetworkError) {
    return 'ネットワーク接続を確認してください';
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return '予期しないエラーが発生しました';
};

/**
 * エラーの詳細情報を取得するユーティリティ関数
 */
export const getErrorDetails = (error: Error): Record<string, string> => {
  if (error instanceof ValidationError) {
    return error.errors;
  }

  if (error instanceof ApiError && error.details) {
    return error.details;
  }

  return {};
};
