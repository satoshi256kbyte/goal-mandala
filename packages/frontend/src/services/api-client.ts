import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  getCSRFTokenForRequest,
  detectCSRFAttempt,
  logCSRFAttempt,
  validateReferrer,
} from '../utils/csrf-protection';

/**
 * CSRF対策が適用されたAPIクライアント
 */

// 許可されたオリジンのリスト（環境変数から取得）
const ALLOWED_ORIGINS = [
  window.location.origin,
  process.env.VITE_API_BASE_URL || 'http://localhost:3000',
].filter(Boolean);

/**
 * APIクライアントの作成
 */
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: process.env.VITE_API_BASE_URL || '/api',
    timeout: 30000,
    withCredentials: true, // Cookieを含める
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // リクエストインターセプター：CSRF対策の適用
  client.interceptors.request.use(
    (config: any) => {
      const method = config.method?.toUpperCase() || 'GET';

      // 状態変更を伴うリクエストにCSRFトークンを追加
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCSRFTokenForRequest();

        // CSRFトークンをヘッダーに追加
        config.headers = {
          ...config.headers,
          'X-CSRF-Token': csrfToken,
        };

        // Referrerの検証
        if (!validateReferrer(ALLOWED_ORIGINS)) {
          console.warn('Invalid referrer detected');
        }

        // CSRF攻撃の検出
        const requestInfo = {
          method,
          origin: window.location.origin,
          referrer: document.referrer,
          token: csrfToken,
        };

        if (detectCSRFAttempt(requestInfo)) {
          logCSRFAttempt({
            method,
            url: config.url || '',
            origin: window.location.origin,
            referrer: document.referrer,
          });
        }
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    }
  );

  // レスポンスインターセプター：エラーハンドリング
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error: AxiosError) => {
      // CSRF関連のエラーハンドリング
      if (error.response?.status === 403) {
        const errorMessage = error.response.data as { code?: string; message?: string };
        if (errorMessage?.code === 'CSRF_TOKEN_INVALID') {
          console.error('CSRF token validation failed');
          // CSRFトークンを再生成
          getCSRFTokenForRequest();
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * デフォルトのAPIクライアントインスタンス
 */
export const apiClient = createApiClient();
export const axiosApiClient = createApiClient();

/**
 * 安全なフォーム送信のためのヘルパー関数
 */
export const submitFormSafely = async <T = unknown>(
  url: string,
  data: unknown,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  try {
    return await apiClient.post<T>(url, data, config);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      // CSRF エラーの場合は一度だけリトライ
      console.warn('CSRF error detected, retrying with new token...');
      return await apiClient.post<T>(url, data, config);
    }
    throw error;
  }
};

/**
 * ファイルアップロード用の安全な送信
 */
export const uploadFileSafely = async (
  url: string,
  formData: FormData,
  config?: AxiosRequestConfig
): Promise<AxiosResponse> => {
  const uploadConfig = {
    ...config,
    headers: {
      ...config?.headers,
      'Content-Type': 'multipart/form-data',
    },
  };

  try {
    return await apiClient.post(url, formData, uploadConfig);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      console.warn('CSRF error in file upload, retrying...');
      return await apiClient.post(url, formData, uploadConfig);
    }
    throw error;
  }
};
