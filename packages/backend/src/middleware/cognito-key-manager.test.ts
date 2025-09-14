/**
 * CognitoKeyManager のユニットテスト
 */

import { CognitoKeyManagerImpl } from './cognito-key-manager';
import { logger } from '../utils/logger';

// fetch のモック
global.fetch = jest.fn();

// jose ライブラリのモック
jest.mock('jose', () => ({
  importJWK: jest.fn().mockResolvedValue({
    type: 'public',
    algorithm: { name: 'RS256' },
  }),
}));

// logger のモック
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CognitoKeyManager', () => {
  let keyManager: CognitoKeyManagerImpl;
  const mockUserPoolId = 'ap-northeast-1_test123';
  const mockRegion = 'ap-northeast-1';
  const mockCacheTimeout = 300; // 5分

  const mockJWKSResponse = {
    keys: [
      {
        alg: 'RS256',
        e: 'AQAB',
        kid: 'test-kid-1',
        kty: 'RSA',
        n: 'test-n-value-1',
        use: 'sig',
      },
      {
        alg: 'RS256',
        e: 'AQAB',
        kid: 'test-kid-2',
        kty: 'RSA',
        n: 'test-n-value-2',
        use: 'sig',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // コンストラクタのログ出力をクリアするため、モックをクリアしてからインスタンス作成
    keyManager = new CognitoKeyManagerImpl(mockUserPoolId, mockRegion, mockCacheTimeout);
  });

  afterEach(() => {
    keyManager.clearCache();
  });

  describe('constructor', () => {
    it('should initialize with correct JWKS URL and cache settings', () => {
      // 新しいインスタンスを作成してログ出力を確認
      jest.clearAllMocks();
      const testKeyManager = new CognitoKeyManagerImpl(
        mockUserPoolId,
        mockRegion,
        mockCacheTimeout
      );

      expect(logger.info).toHaveBeenCalledWith('CognitoKeyManager initialized', {
        userPoolId: mockUserPoolId,
        region: mockRegion,
        cacheTimeout: mockCacheTimeout,
        jwksUrl: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}/.well-known/jwks.json`,
      });
    });

    it('should use default cache timeout when not provided', () => {
      jest.clearAllMocks();
      const defaultKeyManager = new CognitoKeyManagerImpl(mockUserPoolId, mockRegion);

      expect(logger.info).toHaveBeenCalledWith('CognitoKeyManager initialized', {
        userPoolId: mockUserPoolId,
        region: mockRegion,
        cacheTimeout: 3600, // デフォルト値
        jwksUrl: `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}/.well-known/jwks.json`,
      });
    });
  });

  describe('isCacheValid', () => {
    it('should return false when cache is empty', () => {
      expect(keyManager.isCacheValid()).toBe(false);
    });

    it('should return true when cache is within TTL', async () => {
      // モックレスポンスを設定
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      // キャッシュを作成
      await keyManager.getPublicKey('test-kid-1');
      expect(keyManager.isCacheValid()).toBe(true);
    });

    it('should return false when cache has expired', async () => {
      // 短いTTLでキーマネージャーを作成
      const shortTtlKeyManager = new CognitoKeyManagerImpl(mockUserPoolId, mockRegion, 0.001); // 1ms

      // モックレスポンスを設定
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      // キャッシュを作成
      await shortTtlKeyManager.getPublicKey('test-kid-1');

      // 少し待ってからキャッシュの有効性を確認
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(shortTtlKeyManager.isCacheValid()).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cache and reset timestamp', async () => {
      // モックレスポンスを設定
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      // キャッシュを作成
      await keyManager.getPublicKey('test-kid-1');
      expect(keyManager.isCacheValid()).toBe(true);

      // キャッシュをクリア
      keyManager.clearCache();
      expect(keyManager.isCacheValid()).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Public key cache cleared');
    });
  });

  describe('getPublicKey', () => {
    it('should fetch and cache JWKS on first request', async () => {
      // モックレスポンスを設定
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      const result = await keyManager.getPublicKey('test-kid-1');

      expect(fetch).toHaveBeenCalledWith(
        `https://cognito-idp.${mockRegion}.amazonaws.com/${mockUserPoolId}/.well-known/jwks.json`
      );
      expect(result).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        'JWKS fetched and cached successfully',
        expect.objectContaining({
          totalKeys: 2,
          cachedKeys: 2,
        })
      );
    });

    it('should return cached key on subsequent requests', async () => {
      // 最初のリクエスト
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      await keyManager.getPublicKey('test-kid-1');

      // 2回目のリクエスト（キャッシュから取得）
      const result = await keyManager.getPublicKey('test-kid-1');

      expect(fetch).toHaveBeenCalledTimes(1); // fetchは1回のみ
      expect(result).toBeDefined();
      expect(logger.debug).toHaveBeenCalledWith('Public key object retrieved from cache', {
        kid: 'test-kid-1',
      });
    });

    it('should throw error when key is not found', async () => {
      // モックレスポンスを設定
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      await expect(keyManager.getPublicKey('non-existent-kid')).rejects.toThrow(
        'Public key not found for kid: non-existent-kid'
      );
    });

    it('should handle fetch errors', async () => {
      // fetchエラーをモック
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(keyManager.getPublicKey('test-kid-1')).rejects.toThrow('Network error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get public key',
        expect.objectContaining({
          kid: 'test-kid-1',
          error: 'Network error',
        })
      );
    });

    it('should handle HTTP errors', async () => {
      // HTTP エラーレスポンスをモック
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(keyManager.getPublicKey('test-kid-1')).rejects.toThrow(
        'Failed to fetch JWKS: 404 Not Found'
      );
    });

    it('should handle empty JWKS response', async () => {
      // 空のJWKSレスポンスをモック
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [] }),
      });

      await expect(keyManager.getPublicKey('test-kid-1')).rejects.toThrow(
        'No valid RSA signing keys found in JWKS response'
      );
    });
  });

  describe('handleVerificationFailure', () => {
    it('should clear cache and refetch keys on verification failure', async () => {
      // 最初のキャッシュ作成
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      await keyManager.getPublicKey('test-kid-1');
      expect(keyManager.isCacheValid()).toBe(true);

      // 検証失敗時の処理
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      const result = await keyManager.handleVerificationFailure('test-kid-1');

      expect(result).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        'JWT verification failed, clearing cache and refetching keys',
        { kid: 'test-kid-1' }
      );
      expect(logger.info).toHaveBeenCalledWith('Public key cache cleared');
      expect(logger.info).toHaveBeenCalledWith('Public key retrieved after verification failure', {
        kid: 'test-kid-1',
      });
    });

    it('should throw error when key is not found after cache refresh', async () => {
      // 検証失敗時の処理で、キーが見つからない場合
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      await expect(keyManager.handleVerificationFailure('non-existent-kid')).rejects.toThrow(
        'Public key not found for kid after cache refresh: non-existent-kid'
      );
    });
  });

  describe('getCacheStats', () => {
    it('should return correct cache statistics', async () => {
      // キャッシュが空の状態
      let stats = keyManager.getCacheStats();
      expect(stats.keyCount).toBe(0);
      expect(stats.isValid).toBe(false);

      // キャッシュを作成
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      await keyManager.getPublicKey('test-kid-1');

      // キャッシュがある状態
      stats = keyManager.getCacheStats();
      expect(stats.keyCount).toBe(2);
      expect(stats.isValid).toBe(true);
      expect(stats.ttl).toBe(mockCacheTimeout * 1000);
      expect(stats.cacheAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPublicKey', () => {
    it('should return string representation of public key', async () => {
      // モックレスポンスを設定
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockJWKSResponse,
      });

      const result = await keyManager.getPublicKey('test-kid-1');

      expect(typeof result).toBe('string');
      expect(result).toMatch(/-----BEGIN PUBLIC KEY-----/);
    });

    it('should handle errors and log them', async () => {
      // fetchエラーをモック
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(keyManager.getPublicKey('test-kid-1')).rejects.toThrow('Network error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get public key',
        expect.objectContaining({
          kid: 'test-kid-1',
          error: 'Network error',
        })
      );
    });
  });
});
