import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateDeepLinkToken } from '../deepLinkApi';
import * as apiClient from '../api-client';

// Mock api-client
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('deepLinkApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateDeepLinkToken', () => {
    it('有効なトークンの場合、検証結果を返す', async () => {
      const token = 'valid-token';
      const expectedResult = {
        valid: true,
        taskId: 'task-123',
        userId: 'user-123',
      };

      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        data: expectedResult,
      });

      const result = await validateDeepLinkToken(token);

      expect(apiClient.apiClient.get).toHaveBeenCalledWith('/api/reminders/validate-token', {
        params: { token },
      });
      expect(result).toEqual(expectedResult);
    });

    it('無効なトークンの場合、エラー情報を返す', async () => {
      const token = 'invalid-token';
      const errorMessage = 'トークンが無効です';

      vi.mocked(apiClient.apiClient.get).mockRejectedValue({
        response: {
          data: {
            error: errorMessage,
          },
        },
      });

      const result = await validateDeepLinkToken(token);

      expect(result).toEqual({
        valid: false,
        error: errorMessage,
      });
    });

    it('401エラーの場合、有効期限切れメッセージを返す', async () => {
      const token = 'expired-token';

      vi.mocked(apiClient.apiClient.get).mockRejectedValue({
        response: {
          status: 401,
        },
      });

      const result = await validateDeepLinkToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'トークンの有効期限が切れています',
      });
    });

    it('404エラーの場合、トークンが見つからないメッセージを返す', async () => {
      const token = 'not-found-token';

      vi.mocked(apiClient.apiClient.get).mockRejectedValue({
        response: {
          status: 404,
        },
      });

      const result = await validateDeepLinkToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'トークンが見つかりません',
      });
    });

    it('ネットワークエラーの場合、汎用エラーメッセージを返す', async () => {
      const token = 'network-error-token';

      vi.mocked(apiClient.apiClient.get).mockRejectedValue(new Error('Network error'));

      const result = await validateDeepLinkToken(token);

      expect(result).toEqual({
        valid: false,
        error: 'トークンの検証に失敗しました',
      });
    });

    it('エラーログを出力する', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const token = 'error-token';

      vi.mocked(apiClient.apiClient.get).mockRejectedValue(new Error('Test error'));

      await validateDeepLinkToken(token);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Deep Link token validation error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
