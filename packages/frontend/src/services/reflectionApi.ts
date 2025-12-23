import { apiClient } from './api-client';
import type {
  Reflection,
  CreateReflectionInput,
  UpdateReflectionInput,
  CategorizedActions,
} from '../types/reflection';

/**
 * 振り返りAPIクライアント
 */
class ReflectionApiClient {
  private maxRetries = 3;
  private baseDelay = 1000; // 1秒

  /**
   * 指数バックオフによるリトライ処理
   * @param fn 実行する関数
   * @param retries 残りのリトライ回数
   * @returns 関数の実行結果
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, retries = this.maxRetries): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries === 0) {
        throw error;
      }

      // ネットワークエラーまたは5xxエラーの場合のみリトライ
      const shouldRetry =
        error?.response?.status >= 500 ||
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ERR_NETWORK' ||
        error?.message?.includes('Network error') ||
        error?.message?.includes('timeout');

      if (!shouldRetry) {
        throw error;
      }

      // 指数バックオフ: 1秒 → 2秒 → 4秒
      const delay = this.baseDelay * Math.pow(2, this.maxRetries - retries);
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.retryWithBackoff(fn, retries - 1);
    }
  }

  /**
   * 振り返りを作成
   * @param input 振り返り作成データ
   * @returns 作成された振り返り
   */
  async createReflection(input: CreateReflectionInput): Promise<Reflection> {
    return this.retryWithBackoff(async () => {
      const response = await apiClient.post<{ success: boolean; data: { reflection: Reflection } }>(
        '/reflections',
        input
      );
      return response.data.data.reflection;
    });
  }

  /**
   * 振り返りを取得（単一）
   * @param reflectionId 振り返りID
   * @returns 振り返り
   */
  async getReflection(reflectionId: string): Promise<Reflection> {
    return this.retryWithBackoff(async () => {
      const response = await apiClient.get<{ success: boolean; data: { reflection: Reflection } }>(
        `/reflections/${reflectionId}`
      );
      return response.data.data.reflection;
    });
  }

  /**
   * 目標に紐づく振り返り一覧を取得
   * @param goalId 目標ID
   * @returns 振り返り一覧
   */
  async getReflectionsByGoal(goalId: string): Promise<Reflection[]> {
    return this.retryWithBackoff(async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: { reflections: Reflection[]; total: number };
      }>(`/goals/${goalId}/reflections`);
      return response.data.data.reflections;
    });
  }

  /**
   * 振り返りを更新
   * @param reflectionId 振り返りID
   * @param input 更新データ
   * @returns 更新された振り返り
   */
  async updateReflection(reflectionId: string, input: UpdateReflectionInput): Promise<Reflection> {
    return this.retryWithBackoff(async () => {
      const response = await apiClient.put<{ success: boolean; data: { reflection: Reflection } }>(
        `/reflections/${reflectionId}`,
        input
      );
      return response.data.data.reflection;
    });
  }

  /**
   * 振り返りを削除
   * @param reflectionId 振り返りID
   * @returns 削除成功フラグ
   */
  async deleteReflection(reflectionId: string): Promise<boolean> {
    return this.retryWithBackoff(async () => {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `/reflections/${reflectionId}`
      );
      return response.data.success;
    });
  }

  /**
   * アクション進捗を取得
   * @param goalId 目標ID
   * @returns カテゴリ別アクション進捗
   */
  async getActionProgress(goalId: string): Promise<CategorizedActions> {
    return this.retryWithBackoff(async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: CategorizedActions;
      }>(`/goals/${goalId}/action-progress`);
      return response.data.data;
    });
  }
}

export const reflectionApi = new ReflectionApiClient();
