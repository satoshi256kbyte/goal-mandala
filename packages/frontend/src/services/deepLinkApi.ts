import { apiClient } from './api-client';

/**
 * Deep Link トークン検証結果
 */
export interface DeepLinkValidationResult {
  valid: boolean;
  taskId?: string;
  userId?: string;
  error?: string;
}

/**
 * Deep Link トークンを検証する
 *
 * @param token - 検証するトークン
 * @returns 検証結果
 *
 * Requirements: 3.2, 3.4
 */
export async function validateDeepLinkToken(token: string): Promise<DeepLinkValidationResult> {
  try {
    const response = await apiClient.get<DeepLinkValidationResult>(
      `/api/reminders/validate-token`,
      {
        params: { token },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Deep Link token validation error:', error);

    // エラーレスポンスから詳細を取得
    if (error.response?.data?.error) {
      return {
        valid: false,
        error: error.response.data.error,
      };
    }

    // ステータスコードに基づいてエラーメッセージを返す
    if (error.response?.status === 401) {
      return {
        valid: false,
        error: 'トークンの有効期限が切れています',
      };
    }

    if (error.response?.status === 404) {
      return {
        valid: false,
        error: 'トークンが見つかりません',
      };
    }

    return {
      valid: false,
      error: 'トークンの検証に失敗しました',
    };
  }
}
