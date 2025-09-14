/**
 * JWT検証クラスのユニットテスト
 */

import { JWTValidatorImpl } from './jwt-validator';
import { CognitoKeyManager } from './cognito-key-manager';
import { AuthErrorType } from './types';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// モックのCognitoKeyManager
class MockCognitoKeyManager implements CognitoKeyManager {
  private mockPublicKey: string;
  private shouldFailVerification = false;
  private shouldFailKeyRetrieval = false;

  constructor(publicKey?: string) {
    this.mockPublicKey = publicKey || '';
  }

  async getPublicKey(kid: string): Promise<string> {
    if (this.shouldFailKeyRetrieval) {
      throw new Error('Failed to retrieve public key');
    }
    return this.mockPublicKey;
  }

  clearCache(): void {
    // モック実装
  }

  isCacheValid(): boolean {
    return true;
  }

  async handleVerificationFailure(kid: string): Promise<string> {
    if (this.shouldFailVerification) {
      throw new Error('Verification failure handling failed');
    }
    return this.mockPublicKey;
  }

  setMockPublicKey(publicKey: string): void {
    this.mockPublicKey = publicKey;
  }

  setShouldFailVerification(shouldFail: boolean): void {
    this.shouldFailVerification = shouldFail;
  }

  setShouldFailKeyRetrieval(shouldFail: boolean): void {
    this.shouldFailKeyRetrieval = shouldFail;
  }
}

describe('JWTValidatorImpl', () => {
  let validator: JWTValidatorImpl;
  let mockKeyManager: MockCognitoKeyManager;
  let publicKey: string;
  let privateKey: string;

  const userPoolId = 'ap-northeast-1_test123';
  const clientId = 'test-client-id';
  const region = 'ap-northeast-1';
  const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  beforeAll(() => {
    // RSA キーペアを生成
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    publicKey = keyPair.publicKey;
    privateKey = keyPair.privateKey;
  });

  beforeEach(() => {
    mockKeyManager = new MockCognitoKeyManager(publicKey);
    validator = new JWTValidatorImpl(mockKeyManager, userPoolId, clientId, region);
  });

  describe('validateToken', () => {
    it('有効なJWTトークンを正常に検証する', async () => {
      // 有効なJWTトークンを作成
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1時間後
        'cognito:username': 'testuser',
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      const result = await validator.validateToken(token);

      expect(result.sub).toBe('test-user-id');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.iss).toBe(expectedIssuer);
      expect(result.aud).toBe(clientId);
      expect(result.token_use).toBe('access');
    });

    it('期限切れトークンでTOKEN_EXPIREDエラーを投げる', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2時間前
        exp: Math.floor(Date.now() / 1000) - 3600, // 1時間前（期限切れ）
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      await expect(validator.validateToken(token)).rejects.toThrow();

      try {
        await validator.validateToken(token);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.TOKEN_EXPIRED);
      }
    });

    it('無効なissuerでCLAIMS_INVALIDエラーを投げる', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: 'https://invalid-issuer.com',
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      await expect(validator.validateToken(token)).rejects.toThrow();

      try {
        await validator.validateToken(token);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.CLAIMS_INVALID);
        expect(error.message).toContain('Invalid issuer');
      }
    });

    it('無効なaudienceでCLAIMS_INVALIDエラーを投げる', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: 'invalid-client-id',
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      await expect(validator.validateToken(token)).rejects.toThrow();

      try {
        await validator.validateToken(token);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.CLAIMS_INVALID);
        expect(error.message).toContain('Invalid audience');
      }
    });

    it('無効なtoken_useでCLAIMS_INVALIDエラーを投げる', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'invalid',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      await expect(validator.validateToken(token)).rejects.toThrow();

      try {
        await validator.validateToken(token);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.CLAIMS_INVALID);
        expect(error.message).toContain('Invalid token_use');
      }
    });

    it('kidが欠けているトークンでTOKEN_INVALIDエラーを投げる', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { typ: 'JWT' }, // kidなし
      });

      await expect(validator.validateToken(token)).rejects.toThrow();

      try {
        await validator.validateToken(token);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.TOKEN_INVALID);
        expect(error.message).toContain('JWT header missing required fields');
      }
    });
  });

  describe('validateTokenStructure', () => {
    it('有効なJWTトークン構造を正常に検証する', () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      const result = validator.validateTokenStructure(token);

      expect(result.header.alg).toBe('RS256');
      expect(result.header.kid).toBe('test-kid');
      expect(result.header.typ).toBe('JWT');
      expect(result.payload.sub).toBe('test-user-id');
      expect(result.payload.email).toBe('test@example.com');
    });

    it('不正な形式のトークンでTOKEN_INVALIDエラーを投げる', () => {
      const invalidToken = 'invalid.token';

      expect(() => validator.validateTokenStructure(invalidToken)).toThrow();

      try {
        validator.validateTokenStructure(invalidToken);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.TOKEN_INVALID);
        expect(error.message).toContain('Invalid JWT format');
      }
    });

    it('空の部分を含むトークンでTOKEN_INVALIDエラーを投げる', () => {
      const invalidToken = 'header..signature';

      expect(() => validator.validateTokenStructure(invalidToken)).toThrow();

      try {
        validator.validateTokenStructure(invalidToken);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.TOKEN_INVALID);
        expect(error.message).toContain('empty parts');
      }
    });

    it('サポートされていないアルゴリズムでTOKEN_INVALIDエラーを投げる', () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
      };

      // HS256で署名されたトークンを作成（サポート外）
      const token = jwt.sign(payload, 'secret', {
        algorithm: 'HS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      expect(() => validator.validateTokenStructure(token)).toThrow();

      try {
        validator.validateTokenStructure(token);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.TOKEN_INVALID);
        expect(error.message).toContain('Unsupported algorithm');
      }
    });
  });

  describe('validateClaims', () => {
    const validPayload = {
      sub: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      iss: expectedIssuer,
      aud: clientId,
      token_use: 'access',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      'cognito:username': 'testuser',
    };

    it('有効なクレームを正常に検証する', () => {
      const result = validator.validateClaims(validPayload);

      expect(result.sub).toBe('test-user-id');
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
      expect(result.iss).toBe(expectedIssuer);
      expect(result.aud).toBe(clientId);
      expect(result.token_use).toBe('access');
    });

    it('必須クレームが欠けている場合にCLAIMS_INVALIDエラーを投げる', () => {
      const invalidPayload = { ...validPayload };
      delete invalidPayload.sub;

      expect(() => validator.validateClaims(invalidPayload)).toThrow();

      try {
        validator.validateClaims(invalidPayload);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.CLAIMS_INVALID);
        expect(error.message).toContain('Missing required claim: sub');
      }
    });

    it('無効な型のクレームでCLAIMS_INVALIDエラーを投げる', () => {
      const invalidPayload = { ...validPayload, sub: 123 }; // 数値は無効

      expect(() => validator.validateClaims(invalidPayload)).toThrow();

      try {
        validator.validateClaims(invalidPayload);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.CLAIMS_INVALID);
        expect(error.message).toContain('Invalid sub claim');
      }
    });

    it('未来の発行時刻でCLAIMS_INVALIDエラーを投げる', () => {
      const invalidPayload = {
        ...validPayload,
        iat: Math.floor(Date.now() / 1000) + 600, // 10分後（未来）
      };

      expect(() => validator.validateClaims(invalidPayload)).toThrow();

      try {
        validator.validateClaims(invalidPayload);
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.CLAIMS_INVALID);
        expect(error.message).toContain('issued in the future');
      }
    });
  });

  describe('verifySignature', () => {
    it('有効な署名を正常に検証する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      const result = await validator.verifySignature(token, 'test-kid');

      expect(result.sub).toBe('test-user-id');
      expect(result.email).toBe('test@example.com');
    });

    it('公開鍵取得失敗時にキャッシュリフレッシュを試行する', async () => {
      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      // 最初の検証は失敗するが、キャッシュリフレッシュ後は成功する設定
      let callCount = 0;
      const originalGetPublicKey = mockKeyManager.getPublicKey;
      mockKeyManager.getPublicKey = async (kid: string) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt fails');
        }
        return originalGetPublicKey.call(mockKeyManager, kid);
      };

      const result = await validator.verifySignature(token, 'test-kid');

      expect(result.sub).toBe('test-user-id');
      expect(callCount).toBe(2); // 最初の失敗 + キャッシュリフレッシュ後の成功
    });

    it('署名検証失敗時にSIGNATURE_INVALIDエラーを投げる', async () => {
      // 異なる秘密鍵で署名されたトークン
      const wrongKeyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      const payload = {
        sub: 'test-user-id',
        email: 'test@example.com',
        iss: expectedIssuer,
        aud: clientId,
        token_use: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const token = jwt.sign(payload, wrongKeyPair.privateKey, {
        algorithm: 'RS256',
        header: { kid: 'test-kid', typ: 'JWT' },
      });

      mockKeyManager.setShouldFailVerification(true);

      await expect(validator.verifySignature(token, 'test-kid')).rejects.toThrow();

      try {
        await validator.verifySignature(token, 'test-kid');
      } catch (error: any) {
        expect(error.type).toBe(AuthErrorType.SIGNATURE_INVALID);
      }
    });
  });
});
