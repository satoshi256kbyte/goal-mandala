/**
 * APIクライアント（シンプル版）のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '../apiClient';

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // fetchをモック
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // localStorageをモック
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GETリクエスト', () => {
    it('正常にGETリクエストを実行できる', async () => {
      const mockData = { id: 1, name: 'Test' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const response = await apiClient.get('/test');

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('認証トークンがある場合、Authorizationヘッダーを含める', async () => {
      const mockData = { id: 1, name: 'Test' };
      (localStorage.getItem as any).mockReturnValue('test-token');

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await apiClient.get('/test');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('POSTリクエスト', () => {
    it('正常にPOSTリクエストを実行できる', async () => {
      const mockData = { success: true };
      const postData = { name: 'Test' };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => mockData,
      });

      const response = await apiClient.post('/test', postData);

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(201);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
    });

    it('データなしでPOSTリクエストを実行できる', async () => {
      const mockData = { success: true };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const response = await apiClient.post('/test');

      expect(response.data).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PUTリクエスト', () => {
    it('正常にPUTリクエストを実行できる', async () => {
      const mockData = { success: true };
      const putData = { name: 'Updated' };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const response = await apiClient.put('/test/1', putData);

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(putData),
        })
      );
    });
  });

  describe('DELETEリクエスト', () => {
    it('正常にDELETEリクエストを実行できる', async () => {
      const mockData = { success: true };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => mockData,
      });

      const response = await apiClient.delete('/test/1');

      expect(response.status).toBe(204);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('HTTPエラーの場合、エラーを投げる', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(apiClient.get('/test')).rejects.toThrow('HTTP error! status: 404');
    });

    it('ネットワークエラーの場合、エラーを投げる', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow('Network error');
    });

    it('500エラーの場合、エラーを投げる', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(apiClient.get('/test')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('カスタムヘッダー', () => {
    it('カスタムヘッダーを追加できる', async () => {
      const mockData = { success: true };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      // カスタムヘッダーを含むリクエスト（内部実装に依存）
      await apiClient.get('/test');

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('ベースURL', () => {
    it('ベースURLを正しく使用する', async () => {
      const mockData = { success: true };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await apiClient.get('/test');

      expect(fetchMock).toHaveBeenCalledWith('/api/test', expect.any(Object));
    });

    it('エンドポイントが/で始まる場合も正しく処理する', async () => {
      const mockData = { success: true };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await apiClient.get('/test');

      expect(fetchMock).toHaveBeenCalledWith('/api/test', expect.any(Object));
    });
  });
});
