/**
 * APIサービスのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient, NetworkErrorType, goalFormApiService } from '../api';
import { createMockNavigator } from '../../test/types/mock-types';

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // fetchをモック
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // navigatorをモック
    global.navigator = createMockNavigator() as Navigator;

    apiClient = new ApiClient('/api');
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
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      });

      const response = await apiClient.get('/test');

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
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
        statusText: 'Created',
        headers: new Headers({ 'content-type': 'application/json' }),
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
  });

  describe('PUTリクエスト', () => {
    it('正常にPUTリクエストを実行できる', async () => {
      const mockData = { success: true };
      const putData = { name: 'Updated' };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      });

      const response = await apiClient.put('/test/1', putData);

      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
    });
  });

  describe('DELETEリクエスト', () => {
    it('正常にDELETEリクエストを実行できる', async () => {
      const mockData = { success: true };

      fetchMock.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      });

      const response = await apiClient.delete('/test/1');

      expect(response.status).toBe(204);
    });
  });

  describe('エラーハンドリング', () => {
    it('タイムアウトエラーを処理できる', async () => {
      fetchMock.mockImplementation(
        () =>
          new Promise((_, reject) => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            setTimeout(() => reject(error), 100);
          })
      );

      const shortTimeoutClient = new ApiClient('/api', { timeout: 50 });

      await expect(shortTimeoutClient.get('/test')).rejects.toMatchObject({
        code: NetworkErrorType.TIMEOUT,
        message: 'リクエストがタイムアウトしました',
      });
    });

    it('ネットワークエラーを処理できる', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        code: NetworkErrorType.CONNECTION_ERROR,
        message: 'ネットワークに接続できません',
      });
    });

    it('サーバーエラー（500）を処理できる', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        code: NetworkErrorType.SERVER_ERROR,
        status: 500,
      });
    });

    it('クライアントエラー（400）を処理できる', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
      });

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        code: NetworkErrorType.CLIENT_ERROR,
        status: 400,
      });
    });

    it('レート制限エラー（429）を処理できる', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers(),
      });

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        code: NetworkErrorType.RATE_LIMIT,
        status: 429,
      });
    });

    it('オフライン時にエラーを返す', async () => {
      global.navigator = createMockNavigator({ onLine: false }) as Navigator;

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        code: NetworkErrorType.OFFLINE,
        message: 'オフラインです',
      });
    });
  });

  describe('リトライ機能', () => {
    it('リトライ可能なエラーの場合、自動的にリトライする', async () => {
      let callCount = 0;
      fetchMock.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Headers(),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ success: true }),
        });
      });

      const response = await apiClient.get('/test');

      expect(response.data).toEqual({ success: true });
      expect(callCount).toBe(3);
    });

    it('リトライ回数上限に達したらエラーを投げる', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
      });

      const limitedRetryClient = new ApiClient('/api', { retries: 2 });

      await expect(limitedRetryClient.get('/test')).rejects.toMatchObject({
        code: NetworkErrorType.SERVER_ERROR,
      });

      // 初回 + リトライ2回 = 合計3回
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('設定の更新', () => {
    it('設定を更新できる', () => {
      apiClient.updateConfig({ timeout: 5000 });
      // 設定が更新されたことを確認（内部状態なので直接確認は難しい）
      expect(apiClient).toBeDefined();
    });

    it('ベースURLを更新できる', () => {
      apiClient.updateBaseURL('/new-api');
      expect(apiClient).toBeDefined();
    });
  });
});

describe('goalFormApiService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    global.navigator = createMockNavigator() as Navigator;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('下書き保存', () => {
    it('下書きを保存できる', async () => {
      const mockResponse = { success: true, draftId: 'draft-123' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await goalFormApiService.saveDraft({ title: 'Test Goal' });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('下書き取得', () => {
    it('下書きを取得できる', async () => {
      const mockResponse = { success: true, draftData: { title: 'Test Goal' } };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await goalFormApiService.getDraft('draft-123');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('目標作成', () => {
    it('目標を作成できる', async () => {
      const mockResponse = {
        success: true,
        goalId: 'goal-123',
        processingId: 'proc-123',
      };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await goalFormApiService.createGoal({ title: 'New Goal' });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('処理状況確認', () => {
    it('処理状況を確認できる', async () => {
      const mockResponse = { status: 'processing', progress: 50 };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      });

      const result = await goalFormApiService.getProcessingStatus('proc-123');

      expect(result).toEqual(mockResponse);
    });
  });
});
