/**
 * Goals API Service のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getGoals, GoalsApiError } from '../goals-api';
import { GoalStatus } from '../../../types/mandala-list';
import { MANDALA_LIST_ERROR_MESSAGES } from '../../../constants/mandala-list';

// fetchをモック
global.fetch = vi.fn();

describe('Goals API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // setup.tsでデフォルトの認証トークンが設定されているので、ここでは何もしない
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGoals', () => {
    const mockApiResponse = {
      success: true,
      data: [
        {
          id: '1',
          user_id: 'user1',
          title: 'テスト目標',
          description: 'テスト説明',
          deadline: '2024-12-31T00:00:00.000Z',
          status: 'active',
          progress: 50,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-15T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    it('正常にデータを取得できる', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await getGoals({
        page: 1,
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('1');
      expect(result.data[0].title).toBe('テスト目標');
      expect(result.data[0].deadline).toBeInstanceOf(Date);
      expect(result.total).toBe(1);
    });

    it('検索パラメータを含むリクエストを送信できる', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      await getGoals({
        search: 'プログラミング',
        status: GoalStatus.ACTIVE,
        sort: 'created_at_desc',
        page: 2,
        limit: 10,
      });

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const url = callArgs[0] as string;

      expect(url).toContain('search=');
      expect(url).toContain('status=active');
      expect(url).toContain('sort=created_at_desc');
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
    });

    it('認証トークンをヘッダーに含める', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      await getGoals({ page: 1, limit: 20 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-auth-token',
          }),
        })
      );
    });

    it('認証トークンがない場合はエラーをスローする', async () => {
      // localStorageから認証トークンを削除
      localStorage.removeItem('auth_token');

      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(GoalsApiError);
      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(
        MANDALA_LIST_ERROR_MESSAGES.UNAUTHORIZED
      );

      // テスト後に認証トークンを復元
      localStorage.setItem('auth_token', 'mock-auth-token');
    });

    it('401エラー時に認証エラーをスローする', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({}),
      } as Response);

      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(GoalsApiError);
      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(
        MANDALA_LIST_ERROR_MESSAGES.UNAUTHORIZED
      );
    });

    it('404エラー時に結果なしエラーをスローする', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response);

      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(GoalsApiError);
      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(
        MANDALA_LIST_ERROR_MESSAGES.NO_RESULTS
      );
    });

    it('500エラー時にサーバーエラーをスローする', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: 'SERVER_ERROR',
            message: 'サーバーエラーが発生しました',
          },
        }),
      } as Response);

      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(GoalsApiError);
      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(
        'サーバーエラーが発生しました'
      );
    });

    it('ネットワークエラー時にネットワークエラーをスローする', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new TypeError('Network error'));

      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(GoalsApiError);
      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(
        MANDALA_LIST_ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('タイムアウト時にタイムアウトエラーをスローする', async () => {
      vi.mocked(global.fetch).mockImplementation(() => {
        return new Promise((_, reject) => {
          const error = new Error('The operation was aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });

      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(GoalsApiError);
      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(
        MANDALA_LIST_ERROR_MESSAGES.NETWORK_ERROR
      );
    });

    it('不正なレスポンス形式の場合はエラーをスローする', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          data: 'invalid',
        }),
      } as Response);

      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(GoalsApiError);
      await expect(getGoals({ page: 1, limit: 20 })).rejects.toThrow(
        MANDALA_LIST_ERROR_MESSAGES.FETCH_ERROR
      );
    });

    it('空のデータ配列を正しく処理できる', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }),
      } as Response);

      const result = await getGoals({ page: 1, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('日付文字列を正しくDateオブジェクトに変換する', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const result = await getGoals({ page: 1, limit: 20 });

      expect(result.data[0].deadline).toBeInstanceOf(Date);
      expect(result.data[0].createdAt).toBeInstanceOf(Date);
      expect(result.data[0].updatedAt).toBeInstanceOf(Date);
    });
  });
});
