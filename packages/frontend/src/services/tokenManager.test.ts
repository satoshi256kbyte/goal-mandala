/**
 * TokenManager のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { TokenManager, STORAGE_KEYS } from './tokenManager';
import { AuthService } from './auth';

// AuthServiceをモック
vi.mock('./auth', () => ({
  AuthService: {
    getCurrentSession: vi.fn(),
    getCurrentSessionTyped: vi.fn(),
  },
}));

// LocalStorageをモック
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// グローバルオブジェクトにLocalStorageをセット
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// テスト用のJWTトークンを生成
const createTestToken = (exp?: number): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'test-user-id',
      email: 'test@example.com',
      exp: exp || Math.floor(Date.now() / 1000) + 3600, // デフォルトは1時間後
      iat: Math.floor(Date.now() / 1000),
    })
  );
  const signature = 'test-signature';
  return `${header}.${payload}.${signature}`;
};

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    // LocalStorageをクリア
    mockLocalStorage.clear();
    vi.clearAllMocks();

    // 新しいインスタンスを取得
    tokenManager = TokenManager.getInstance();

    // タイマーをモック
    vi.useFakeTimers();
  });

  afterEach(() => {
    // タイマーをリストア
    vi.useRealTimers();

    // TokenManagerのクリーンアップ
    tokenManager.clearTokenRefreshSchedule();
  });

  describe('シングルトンパターン', () => {
    it('同じインスタンスを返すこと', () => {
      const instance1 = TokenManager.getInstance();
      const instance2 = TokenManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('saveToken', () => {
    it('有効なトークンを正常に保存できること', () => {
      const token = createTestToken();
      const refreshToken = 'refresh-token-123';

      tokenManager.saveToken(token, refreshToken);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, token);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        refreshToken
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.LAST_ACTIVITY,
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SESSION_ID,
        expect.any(String)
      );
    });

    it('リフレッシュトークンなしでも保存できること', () => {
      const token = createTestToken();

      tokenManager.saveToken(token);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, token);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
        STORAGE_KEYS.REFRESH_TOKEN,
        expect.any(String)
      );
    });

    it('無効なトークンの場合はエラーを投げること', () => {
      const invalidToken = 'invalid-token';

      expect(() => {
        tokenManager.saveToken(invalidToken);
      }).toThrow('Failed to save authentication token');
    });
  });

  describe('getToken', () => {
    it('有効なトークンを取得できること', () => {
      const token = createTestToken();
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

      const result = tokenManager.getToken();

      expect(result).toBe(token);
    });

    it('トークンが存在しない場合はnullを返すこと', () => {
      const result = tokenManager.getToken();

      expect(result).toBeNull();
    });

    it('期限切れのトークンの場合はnullを返し、トークンを削除すること', () => {
      const expiredToken = createTestToken(Math.floor(Date.now() / 1000) - 3600); // 1時間前に期限切れ
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, expiredToken);

      const result = tokenManager.getToken();

      expect(result).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    });
  });

  describe('getRefreshToken', () => {
    it('リフレッシュトークンを取得できること', () => {
      const refreshToken = 'refresh-token-123';
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      const result = tokenManager.getRefreshToken();

      expect(result).toBe(refreshToken);
    });

    it('リフレッシュトークンが存在しない場合はnullを返すこと', () => {
      const result = tokenManager.getRefreshToken();

      expect(result).toBeNull();
    });
  });

  describe('removeTokens', () => {
    it('全てのトークンと関連データを削除すること', () => {
      // テストデータを設定
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'token');
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh');
      mockLocalStorage.setItem(STORAGE_KEYS.USER_DATA, 'user');
      mockLocalStorage.setItem(STORAGE_KEYS.SESSION_ID, 'session');
      mockLocalStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, 'activity');
      mockLocalStorage.setItem(STORAGE_KEYS.AUTH_STATE, 'state');

      tokenManager.removeTokens();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.REFRESH_TOKEN);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_DATA);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SESSION_ID);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.LAST_ACTIVITY);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.AUTH_STATE);
    });
  });

  describe('isTokenExpired', () => {
    it('有効なトークンの場合はfalseを返すこと', () => {
      const validToken = createTestToken(Math.floor(Date.now() / 1000) + 3600); // 1時間後に期限切れ

      const result = tokenManager.isTokenExpired(validToken);

      expect(result).toBe(false);
    });

    it('期限切れのトークンの場合はtrueを返すこと', () => {
      const expiredToken = createTestToken(Math.floor(Date.now() / 1000) - 3600); // 1時間前に期限切れ

      const result = tokenManager.isTokenExpired(expiredToken);

      expect(result).toBe(true);
    });

    it('無効なトークンの場合はtrueを返すこと', () => {
      const invalidToken = 'invalid-token';

      const result = tokenManager.isTokenExpired(invalidToken);

      expect(result).toBe(true);
    });

    it('トークンが指定されない場合は保存されたトークンをチェックすること', () => {
      const token = createTestToken(Math.floor(Date.now() / 1000) + 3600);
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

      const result = tokenManager.isTokenExpired();

      expect(result).toBe(false);
    });
  });

  describe('getTokenExpirationTime', () => {
    it('トークンの有効期限を正しく取得できること', () => {
      const expTime = Math.floor(Date.now() / 1000) + 3600; // 1時間後
      const token = createTestToken(expTime);

      const result = tokenManager.getTokenExpirationTime(token);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(expTime * 1000);
    });

    it('無効なトークンの場合はnullを返すこと', () => {
      const invalidToken = 'invalid-token';

      const result = tokenManager.getTokenExpirationTime(invalidToken);

      expect(result).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('トークンを正常にリフレッシュできること', async () => {
      const refreshToken = 'refresh-token-123';
      const newToken = createTestToken();

      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // AuthService.getCurrentSessionTypedをモック
      (AuthService.getCurrentSessionTyped as Mock).mockResolvedValue({
        tokens: {
          idToken: {
            toString: () => newToken,
          },
        },
      });

      const result = await tokenManager.refreshToken();

      expect(result).toBe(newToken);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN, newToken);
    });

    it('リフレッシュトークンがない場合はエラーを投げること', async () => {
      await expect(tokenManager.refreshToken()).rejects.toThrow('Token refresh failed');
    });

    it('セッション取得に失敗した場合はエラーを投げ、トークンを削除すること', async () => {
      const refreshToken = 'refresh-token-123';
      mockLocalStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      (AuthService.getCurrentSessionTyped as Mock).mockResolvedValue(null);

      await expect(tokenManager.refreshToken()).rejects.toThrow('Token refresh failed');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.ACCESS_TOKEN);
    });
  });

  describe('scheduleTokenRefresh', () => {
    it('適切なタイミングでリフレッシュをスケジュールすること', () => {
      const expTime = Math.floor(Date.now() / 1000) + 3600; // 1時間後
      const token = createTestToken(expTime);
      mockLocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      tokenManager.scheduleTokenRefresh();

      expect(setTimeoutSpy).toHaveBeenCalled();
      const delay = setTimeoutSpy.mock.calls[0][1] as number;

      // 5分前（300秒）にスケジュールされることを確認
      expect(delay).toBeGreaterThan(3000000); // 50分以上
      expect(delay).toBeLessThan(3600000); // 60分未満
    });
  });

  describe('updateLastActivity', () => {
    it('最終アクティビティ時刻を更新すること', () => {
      tokenManager.updateLastActivity();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.LAST_ACTIVITY,
        expect.any(String)
      );
    });
  });

  describe('getLastActivity', () => {
    it('最終アクティビティ時刻を取得できること', () => {
      const testDate = new Date().toISOString();
      mockLocalStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, testDate);

      const result = tokenManager.getLastActivity();

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(testDate);
    });

    it('最終アクティビティが存在しない場合はnullを返すこと', () => {
      const result = tokenManager.getLastActivity();

      expect(result).toBeNull();
    });
  });

  describe('getSessionId', () => {
    it('セッションIDを取得できること', () => {
      const sessionId = 'test-session-id';
      mockLocalStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);

      const result = tokenManager.getSessionId();

      expect(result).toBe(sessionId);
    });

    it('セッションIDが存在しない場合はnullを返すこと', () => {
      const result = tokenManager.getSessionId();

      expect(result).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    it('LocalStorageアクセスエラーを適切に処理すること', () => {
      // LocalStorageのsetItemでエラーを発生させる
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      const token = createTestToken();

      expect(() => {
        tokenManager.saveToken(token);
      }).toThrow('Failed to save authentication token');
    });

    it('LocalStorageアクセスエラー時にgetTokenはnullを返すこと', () => {
      // LocalStorageのgetItemでエラーを発生させる
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('LocalStorage error');
      });

      const result = tokenManager.getToken();

      expect(result).toBeNull();
    });
  });
});
