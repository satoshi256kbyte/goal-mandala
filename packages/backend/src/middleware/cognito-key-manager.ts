/**
 * Cognito公開鍵管理クラス
 *
 * 要件:
 * - 2.1: Cognitoの公開鍵を使用してトークンの署名を検証
 * - 5.1: Cognito公開鍵を初回取得した場合はメモリにキャッシュ
 * - 5.2: キャッシュされた公開鍵が存在する場合はネットワーク通信を行わずにキャッシュから取得
 * - 5.3: 公開鍵のキャッシュが一定時間経過した場合は新しい公開鍵を取得してキャッシュを更新
 * - 5.4: 公開鍵による検証が失敗した場合はキャッシュをクリアして新しい公開鍵を取得
 */

// import crypto from 'crypto'; // 現在未使用
import { logger } from '../utils/logger';
import { AuthErrorType, CognitoKeyManager, JWKSResponse, TypedAuthError } from './types';

// 公開鍵キャッシュ（PEM形式の文字列を保存）
interface KeyCache {
  keys: Map<string, string>;
  timestamp: number;
  ttl: number;
}

export class CognitoKeyManagerImpl implements CognitoKeyManager {
  private cache: KeyCache;
  private readonly jwksUrl: string;

  constructor(
    userPoolId: string,
    region: string,
    cacheTimeout: number = 3600 // デフォルト1時間
  ) {
    this.jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    this.cache = {
      keys: new Map(),
      timestamp: 0,
      ttl: cacheTimeout * 1000, // ミリ秒に変換
    };

    logger.info('CognitoKeyManager initialized', {
      userPoolId,
      region,
      cacheTimeout,
      jwksUrl: this.jwksUrl,
    });
  }

  /**
   * 公開鍵を取得（キャッシュ機能付き）
   * 要件5.1, 5.2, 5.3に対応
   */
  async getPublicKey(kid: string): Promise<string> {
    try {
      // 要件5.2: キャッシュされた公開鍵が存在する場合はネットワーク通信を行わずにキャッシュから取得
      if (this.isCacheValid() && this.cache.keys.has(kid)) {
        logger.debug('Public key retrieved from cache', { kid });
        return this.cache.keys.get(kid)!;
      }

      // 要件5.3: キャッシュが無効またはキーが存在しない場合、JWKSを取得
      await this.fetchAndCacheJWKS();

      // 再度キャッシュから取得を試行
      if (this.cache.keys.has(kid)) {
        logger.debug('Public key retrieved after cache refresh', { kid });
        return this.cache.keys.get(kid)!;
      }

      // 要件3.3: Cognito公開鍵の取得に失敗した場合は500 Internal Server Error
      const error = new Error(`Public key not found for kid: ${kid}`) as TypedAuthError;
      error.type = AuthErrorType.INTERNAL_ERROR;
      throw error;
    } catch (error) {
      logger.error('Failed to get public key', {
        kid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // エラーにタイプが設定されていない場合はINTERNAL_ERRORとして扱う
      if (error instanceof Error && !('type' in error)) {
        const typedError = error as Error & { type: AuthErrorType };
        typedError.type = AuthErrorType.INTERNAL_ERROR;
        throw typedError;
      }

      throw error;
    }
  }

  /**
   * キャッシュをクリア
   * 要件5.4: 公開鍵による検証が失敗した場合はキャッシュをクリア
   */
  clearCache(): void {
    this.cache.keys.clear();
    this.cache.timestamp = 0;
    logger.info('Public key cache cleared');
  }

  /**
   * キャッシュが有効かどうかを確認
   * 要件5.3: 公開鍵のキャッシュが一定時間経過した場合の判定
   */
  isCacheValid(): boolean {
    const now = Date.now();
    const isValid = now - this.cache.timestamp < this.cache.ttl;

    if (!isValid) {
      logger.debug('Public key cache expired', {
        cacheAge: now - this.cache.timestamp,
        ttl: this.cache.ttl,
      });
    }

    return isValid;
  }

  /**
   * 検証失敗時のキャッシュクリア・再取得
   * 要件5.4: 公開鍵による検証が失敗した場合はキャッシュをクリアして新しい公開鍵を取得
   */
  async handleVerificationFailure(kid: string): Promise<string> {
    logger.warn('JWT verification failed, clearing cache and refetching keys', { kid });

    // キャッシュをクリア
    this.clearCache();

    try {
      // 新しい公開鍵を取得
      await this.fetchAndCacheJWKS();

      // 指定されたkidの公開鍵を取得
      if (this.cache.keys.has(kid)) {
        logger.info('Public key retrieved after verification failure', { kid });
        return this.cache.keys.get(kid)!;
      }

      // 要件3.3: Cognito公開鍵の取得に失敗した場合は500 Internal Server Error
      const error = new Error(
        `Public key not found for kid after cache refresh: ${kid}`
      ) as Error & { type: AuthErrorType };
      error.type = AuthErrorType.INTERNAL_ERROR;
      throw error;
    } catch (error) {
      logger.error('Failed to handle verification failure', {
        kid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // エラーにタイプが設定されていない場合はINTERNAL_ERRORとして扱う
      if (error instanceof Error && !('type' in error)) {
        const typedError = error as Error & { type: AuthErrorType };
        typedError.type = AuthErrorType.INTERNAL_ERROR;
        throw typedError;
      }

      throw error;
    }
  }

  /**
   * JWKSを取得してキャッシュに保存
   * 要件5.1: Cognito公開鍵を初回取得した場合はメモリにキャッシュ
   */
  private async fetchAndCacheJWKS(): Promise<void> {
    try {
      logger.debug('Fetching JWKS from Cognito', { jwksUrl: this.jwksUrl });

      const response = await fetch(this.jwksUrl);

      if (!response.ok) {
        // 要件3.3: Cognito公開鍵の取得に失敗した場合は500 Internal Server Error
        const error = new Error(
          `Failed to fetch JWKS: ${response.status} ${response.statusText}`
        ) as Error & { type: AuthErrorType };
        error.type = AuthErrorType.INTERNAL_ERROR;
        throw error;
      }

      const jwks = (await response.json()) as JWKSResponse;

      // 要件5.1: キャッシュをクリアして新しいキーを保存
      this.cache.keys.clear();
      this.cache.timestamp = Date.now();

      let cachedKeyCount = 0;

      for (const key of jwks.keys) {
        // RSA署名用キーのみを処理
        if (key.kty === 'RSA' && key.use === 'sig') {
          try {
            // JWKをPEM形式に変換
            const publicKeyPem = this.jwkToPem(key);
            this.cache.keys.set(key.kid, publicKeyPem);
            cachedKeyCount++;

            logger.debug('Public key cached', {
              kid: key.kid,
              alg: key.alg,
            });
          } catch (keyError) {
            logger.warn('Failed to convert JWK to PEM', {
              kid: key.kid,
              error: keyError instanceof Error ? keyError.message : 'Unknown error',
            });
          }
        }
      }

      if (cachedKeyCount === 0) {
        // 要件3.3: Cognito公開鍵の取得に失敗した場合は500 Internal Server Error
        const error = new Error('No valid RSA signing keys found in JWKS response') as Error & {
          type: AuthErrorType;
        };
        error.type = AuthErrorType.INTERNAL_ERROR;
        throw error;
      }

      logger.info('JWKS fetched and cached successfully', {
        totalKeys: jwks.keys.length,
        cachedKeys: cachedKeyCount,
        cacheTimestamp: this.cache.timestamp,
        ttl: this.cache.ttl,
      });
    } catch (error) {
      logger.error('Failed to fetch and cache JWKS', {
        jwksUrl: this.jwksUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // エラーにタイプが設定されていない場合はINTERNAL_ERRORとして扱う
      if (error instanceof Error && !('type' in error)) {
        const typedError = error as Error & { type: AuthErrorType };
        typedError.type = AuthErrorType.INTERNAL_ERROR;
        throw typedError;
      }

      throw error;
    }
  }

  /**
   * JWKをPEM形式に変換
   */
  private jwkToPem(jwk: { n: string; e: string }): string {
    try {
      // Base64URLデコード
      const nBuffer = Buffer.from(jwk.n, 'base64url');
      const eBuffer = Buffer.from(jwk.e, 'base64url');

      // RSA公開鍵をDER形式で構築
      const publicKeyDer = this.buildRSAPublicKeyDER(nBuffer, eBuffer);

      // PEM形式に変換
      const publicKeyPem =
        '-----BEGIN PUBLIC KEY-----\n' +
        publicKeyDer
          .toString('base64')
          .match(/.{1,64}/g)!
          .join('\n') +
        '\n-----END PUBLIC KEY-----';

      return publicKeyPem;
    } catch (error) {
      logger.error('Failed to convert JWK to PEM', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * RSA公開鍵のDER形式を構築
   */
  private buildRSAPublicKeyDER(n: Buffer, e: Buffer): Buffer {
    // ASN.1 DER エンコーディング
    const encodeLength = (length: number): Buffer => {
      if (length < 0x80) {
        return Buffer.from([length]);
      } else if (length < 0x100) {
        return Buffer.from([0x81, length]);
      } else if (length < 0x10000) {
        return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
      } else {
        throw new Error('Length too long for DER encoding');
      }
    };

    const encodeInteger = (int: Buffer): Buffer => {
      // 最上位ビットが1の場合、0x00を先頭に追加
      const needsPadding = int[0] & 0x80;
      const paddedInt = needsPadding ? Buffer.concat([Buffer.from([0x00]), int]) : int;

      const lengthBuffer = encodeLength(paddedInt.length);
      return Buffer.concat([Buffer.from([0x02]), lengthBuffer, paddedInt]);
    };

    // RSA公開鍵のASN.1構造
    const nInteger = encodeInteger(n);
    const eInteger = encodeInteger(e);

    const rsaPublicKey = Buffer.concat([nInteger, eInteger]);
    const rsaPublicKeyLength = encodeLength(rsaPublicKey.length);
    const rsaPublicKeySequence = Buffer.concat([
      Buffer.from([0x30]), // SEQUENCE
      rsaPublicKeyLength,
      rsaPublicKey,
    ]);

    // RSA暗号化アルゴリズム識別子
    const rsaAlgorithmId = Buffer.from([
      0x30,
      0x0d, // SEQUENCE, length 13
      0x06,
      0x09, // OBJECT IDENTIFIER, length 9
      0x2a,
      0x86,
      0x48,
      0x86,
      0xf7,
      0x0d,
      0x01,
      0x01,
      0x01, // RSA encryption OID
      0x05,
      0x00, // NULL
    ]);

    // BIT STRING (公開鍵データ)
    const publicKeyBitString = Buffer.concat([
      Buffer.from([0x00]), // unused bits
      rsaPublicKeySequence,
    ]);
    const publicKeyBitStringLength = encodeLength(publicKeyBitString.length);
    const publicKeyBitStringEncoded = Buffer.concat([
      Buffer.from([0x03]), // BIT STRING
      publicKeyBitStringLength,
      publicKeyBitString,
    ]);

    // 最終的なSubjectPublicKeyInfo構造
    const subjectPublicKeyInfo = Buffer.concat([rsaAlgorithmId, publicKeyBitStringEncoded]);
    const subjectPublicKeyInfoLength = encodeLength(subjectPublicKeyInfo.length);

    return Buffer.concat([
      Buffer.from([0x30]), // SEQUENCE
      subjectPublicKeyInfoLength,
      subjectPublicKeyInfo,
    ]);
  }

  /**
   * キャッシュ統計情報を取得（監視・デバッグ用）
   */
  getCacheStats(): {
    keyCount: number;
    cacheAge: number;
    isValid: boolean;
    ttl: number;
  } {
    const now = Date.now();
    return {
      keyCount: this.cache.keys.size,
      cacheAge: now - this.cache.timestamp,
      isValid: this.isCacheValid(),
      ttl: this.cache.ttl,
    };
  }
}
