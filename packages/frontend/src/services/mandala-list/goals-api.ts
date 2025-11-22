/**
 * Goals API Service
 *
 * マンダラチャート一覧取得APIとの通信を担当するサービス
 */

import type {
  GoalsListParams,
  GoalsListResponse,
  MandalaChartSummary,
} from '../../types/mandala-list';
import { API } from '../../constants/mandala-list';

/**
 * APIエラークラス
 */
export class GoalsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'GoalsApiError';
  }
}

/**
 * クエリパラメータを構築
 */
function buildQueryParams(params: GoalsListParams): string {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.append('search', params.search);
  }
  if (params.status) {
    searchParams.append('status', params.status);
  }
  if (params.sort) {
    searchParams.append('sort', params.sort);
  }
  if (params.page !== undefined) {
    searchParams.append('page', params.page.toString());
  }
  if (params.limit !== undefined) {
    searchParams.append('limit', params.limit.toString());
  }

  return searchParams.toString();
}

/**
 * 認証トークンを取得
 */
async function getAuthToken(): Promise<string> {
  // TODO: 実際の認証トークン取得処理を実装
  // 現時点では仮の実装
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new GoalsApiError(MANDALA_LIST_ERROR_MESSAGES.UNAUTHORIZED, 401, 'UNAUTHORIZED');
  }
  return token;
}

/**
 * APIレスポンスをMandalaChartSummaryに変換
 */
function transformResponse(data: any[]): MandalaChartSummary[] {
  return data.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    deadline: new Date(item.deadline),
    status: item.status,
    progress: item.progress,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at),
  }));
}

/**
 * マンダラチャート一覧を取得
 *
 * @param params - 検索・フィルター・ソート・ページネーションパラメータ
 * @returns マンダラチャート一覧レスポンス
 * @throws {GoalsApiError} API呼び出しに失敗した場合
 *
 * @example
 * ```ts
 * const response = await getGoals({
 *   search: 'プログラミング',
 *   status: 'active',
 *   sort: 'created_at_desc',
 *   page: 1,
 *   limit: 20,
 * });
 * ```
 */
export async function getGoals(params: GoalsListParams): Promise<GoalsListResponse> {
  try {
    // 認証トークンを取得
    const token = await getAuthToken();

    // クエリパラメータを構築
    const queryString = buildQueryParams(params);
    const url = `${API.GOALS_ENDPOINT}${queryString ? `?${queryString}` : ''}`;

    // API呼び出し
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API.REQUEST_TIMEOUT);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // エラーハンドリング
    if (!response.ok) {
      if (response.status === 401) {
        throw new GoalsApiError(MANDALA_LIST_ERROR_MESSAGES.UNAUTHORIZED, 401, 'UNAUTHORIZED');
      }

      if (response.status === 404) {
        throw new GoalsApiError(MANDALA_LIST_ERROR_MESSAGES.NO_RESULTS, 404, 'NOT_FOUND');
      }

      // その他のHTTPエラー
      const errorData = await response.json().catch(() => ({}));
      throw new GoalsApiError(
        errorData.error?.message || MANDALA_LIST_ERROR_MESSAGES.FETCH_ERROR,
        response.status,
        errorData.error?.code
      );
    }

    // レスポンスをパース
    const responseData = await response.json();

    // レスポンスの検証
    if (!responseData.success || !Array.isArray(responseData.data)) {
      throw new GoalsApiError(MANDALA_LIST_ERROR_MESSAGES.FETCH_ERROR, 500, 'INVALID_RESPONSE');
    }

    // データを変換して返す
    return {
      success: true,
      data: transformResponse(responseData.data),
      total: responseData.total || 0,
      page: responseData.page || params.page || 1,
      limit: responseData.limit || params.limit || 20,
      totalPages: responseData.totalPages || 0,
    };
  } catch (error) {
    // AbortErrorの処理
    if (error instanceof Error && error.name === 'AbortError') {
      throw new GoalsApiError(MANDALA_LIST_ERROR_MESSAGES.NETWORK_ERROR, 0, 'TIMEOUT');
    }

    // ネットワークエラーの処理
    if (error instanceof TypeError) {
      throw new GoalsApiError(MANDALA_LIST_ERROR_MESSAGES.NETWORK_ERROR, 0, 'NETWORK_ERROR');
    }

    // GoalsApiErrorはそのまま再スロー
    if (error instanceof GoalsApiError) {
      throw error;
    }

    // その他のエラー
    throw new GoalsApiError(MANDALA_LIST_ERROR_MESSAGES.UNKNOWN_ERROR, 0, 'UNKNOWN_ERROR');
  }
}

/**
 * Goals APIサービス
 */
export const GoalsService = {
  getGoals,
};
