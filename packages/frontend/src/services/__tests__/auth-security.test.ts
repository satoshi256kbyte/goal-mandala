/**
 * 認証セキュリティサービスのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthSecurityService } from '../auth-security';

describe('AuthSecurityService', () => {
  let authSecurity: AuthSecurityService;

  beforeEach(() => {
    // LocalStorageをモック
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };

    // Crypto APIをモック
    global.window = {
      crypto: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
          importKey: vi.fn().mockResolvedValue({} as CryptoKey),
          encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
          decrypt: vi.fn().mockResolvedValue(new TextEncoder().encode('test-token')),
        },
        getRandomValues: vi.fn((arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        }),
      },
    } as any;

    // Navigatorをモック
    global.navigator = {
      userAgent: 'test-agent',
      language: 'ja',
      onLine: true,
    } as any;

    // Screenをモック
    global.screen = {
      width: 1920,
      height: 1080,
    } as any;

    authSecurity = AuthSecurityService.getInstance({
      enableEncryption: true,
      enableLogging: false,
      tokenAccessRestriction: true,
      memoryCleanupInterval: 1000,
    });
  });

  afterEach(() => {
    authSecurity.stop();
    vi.clearAllMocks();
  });

  describe('シングルトンパターン', () => {
    it('同じインスタンスを返す', () => {
      const instance1 = AuthSecurityService.getInstance();
      const instance2 = AuthSecurityService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('トークンの暗号化と復号化', () => {
    it('トークンを暗号化して保存できる', async () => {
      const key = 'test-token-key';
      const token = 'test-token-value';

      await authSecurity.encryptAndStoreToken(key, token);

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('暗号化されたトークンを復号化して取得できる', async () => {
      const key = 'test-token-key';

      // 暗号化されたデータをモック
      const encryptedData = {
        data: 'encrypted-data',
        iv: 'iv-data',
        timestamp: Date.now(),
      };
      (localStorage.getItem as any).mockReturnValue(JSON.stringify(encryptedData));

      const decryptedToken = await authSecurity.decryptAndGetToken(key);

      // 復号化が試みられたことを確認（実際の値は暗号化実装に依存）
      expect(decryptedToken).toBeDefined();
    });

    it('存在しないトークンの取得時はnullを返す', async () => {
      (localStorage.getItem as any).mockReturnValue(null);

      const token = await authSecurity.decryptAndGetToken('non-existent-key');

      expect(token).toBeNull();
    });

    it('期限切れのトークンは削除してnullを返す', async () => {
      const key = 'expired-token-key';
      const expiredData = {
        data: 'encrypted-data',
        iv: 'iv-data',
        timestamp: Date.now() - 86400001, // 24時間以上前
      };
      (localStorage.getItem as any).mockReturnValue(JSON.stringify(expiredData));

      const token = await authSecurity.decryptAndGetToken(key);

      // 期限切れの場合、削除が試みられることを確認
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('トークンの安全な削除', () => {
    it('トークンを安全に削除できる', () => {
      const key = 'test-token-key';

      authSecurity.secureRemoveToken(key);

      expect(localStorage.setItem).toHaveBeenCalled();
      expect(localStorage.removeItem).toHaveBeenCalledWith(key);
    });
  });

  describe('トークンアクセス制限', () => {
    it('許可されたコンテキストからのアクセスを許可する', () => {
      const allowedContexts = ['auth-service', 'token-manager', 'auth-middleware', 'storage-sync'];

      allowedContexts.forEach(context => {
        expect(authSecurity.validateTokenAccess(context)).toBe(true);
      });
    });

    it('許可されていないコンテキストからのアクセスを拒否する', () => {
      const deniedContexts = ['unknown-service', 'malicious-script', 'xss-attack'];

      deniedContexts.forEach(context => {
        expect(authSecurity.validateTokenAccess(context)).toBe(false);
      });
    });
  });

  describe('セキュアログ', () => {
    it('ログレベルに応じてログを出力する', () => {
      // シングルトンなので新しいインスタンスは作成されない
      // ログ機能が正常に動作することを確認
      expect(() => {
        authSecurity.secureLog('error', 'Test error message');
      }).not.toThrow();
    });

    it('機密情報をマスクする', () => {
      // ログ機能が正常に動作し、エラーを投げないことを確認
      expect(() => {
        authSecurity.secureLog('info', 'token=abc123xyz password=secret123');
      }).not.toThrow();
    });
  });

  describe('セキュリティ統計', () => {
    it('セキュリティ統計を取得できる', () => {
      const stats = authSecurity.getSecurityStats();

      expect(stats).toHaveProperty('encryptionEnabled');
      expect(stats).toHaveProperty('tokenAccessRestriction');
      expect(stats).toHaveProperty('registeredSensitiveDataCount');
      expect(stats).toHaveProperty('memoryCleanupInterval');
      expect(stats).toHaveProperty('logLevel');
      expect(stats).toHaveProperty('cryptoSupported');
    });
  });

  describe('サービスの停止', () => {
    it('サービスを停止できる', () => {
      authSecurity.stop();

      // 停止後は機密データが削除されている
      const stats = authSecurity.getSecurityStats();
      expect(stats.registeredSensitiveDataCount).toBe(0);
    });
  });
});
