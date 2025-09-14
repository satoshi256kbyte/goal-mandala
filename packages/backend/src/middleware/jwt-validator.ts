/**
 * JWT検証クラス
 *
 * 要件:
 * - 2.1: CognitoのJWTトークンを受信した場合、Cognitoの公開鍵を使用してトークンの署名を検証
 * - 2.2: トークンのissuer（iss）クレームを検証し、設定されたCognito User PoolのISSUERと一致することを確認
 * - 2.3: トークンのaudience（aud）クレームを検証し、設定されたClient IDと一致することを確認
 * - 2.4: トークンのtoken_use クレームを検証し、"access"または"id"であることを確認
 */

import jwt from 'jsonwebtoken';
import { CognitoKeyManagerImpl } from './cognito-key-manager';
import type { CognitoKeyManager } from './types';
import {
  CognitoJWTPayload,
  AuthErrorType,
  JWTHeader,
  JWTPayload,
  JWTValidator,
  TypedAuthError,
} from './types';
import { logger } from '../utils/logger';

export class JWTValidatorImpl implements JWTValidator {
  private readonly keyManager: CognitoKeyManager;
  private readonly expectedIssuer: string;
  private readonly expectedAudience: string;

  constructor(
    keyManager: CognitoKeyManagerImpl,
    userPoolId: string,
    clientId: string,
    region: string
  ) {
    this.keyManager = keyManager;
    this.expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    this.expectedAudience = clientId;

    logger.info('JWTValidator initialized', {
      userPoolId,
      clientId,
      region,
      expectedIssuer: this.expectedIssuer,
      expectedAudience: this.expectedAudience,
    });
  }

  /**
   * JWT トークンの包括的な検証
   * 要件2.1, 2.2, 2.3, 2.4に対応
   */
  async validateToken(token: string): Promise<CognitoJWTPayload> {
    try {
      logger.debug('Starting JWT token validation');

      // 1. トークン形式・構造検証
      const { header } = this.validateTokenStructure(token);

      // 2. kidの取得
      const kid = header.kid;
      if (!kid) {
        throw this.createValidationError(
          AuthErrorType.TOKEN_INVALID,
          'JWT header missing kid claim'
        );
      }

      // 3. 署名検証（要件2.1）
      const payload = await this.verifySignature(token, kid);

      // 4. クレーム検証（要件2.2, 2.3, 2.4）
      const cognitoPayload = this.validateClaims(payload);

      logger.info('JWT token validation successful', {
        sub: cognitoPayload.sub,
        email: cognitoPayload.email,
        tokenUse: cognitoPayload.token_use,
        exp: new Date(cognitoPayload.exp * 1000).toISOString(),
      });

      return cognitoPayload;
    } catch (error) {
      logger.error('JWT token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: this.getErrorType(error),
      });
      throw error;
    }
  }

  /**
   * JWT署名検証
   * 要件2.1: Cognitoの公開鍵を使用してトークンの署名を検証
   */
  async verifySignature(token: string, kid: string): Promise<JWTPayload> {
    try {
      logger.debug('Verifying JWT signature', { kid });

      // 公開鍵を取得
      const publicKey = await this.keyManager.getPublicKey(kid);

      // 署名検証のみ（issuer、audience、expirationの検証は後でクレーム検証で行う）
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        ignoreExpiration: true, // 有効期限は後でクレーム検証で行う
      }) as JWTPayload;

      logger.debug('JWT signature verification successful', { kid });
      return payload;
    } catch (error) {
      logger.warn('JWT signature verification failed', {
        kid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 検証失敗時のキャッシュクリア・再取得を試行（要件5.4）
      try {
        logger.info('Attempting to refresh public key cache after signature verification failure', {
          kid,
        });
        await this.keyManager.handleVerificationFailure(kid);
        const refreshedPublicKey = await this.keyManager.getPublicKey(kid);

        // 再度署名検証を試行
        const payload = jwt.verify(token, refreshedPublicKey, {
          algorithms: ['RS256'],
          ignoreExpiration: true,
        }) as JWTPayload;

        logger.info('JWT signature verification successful after cache refresh', { kid });
        return payload;
      } catch (retryError) {
        logger.error('JWT signature verification failed even after cache refresh', {
          kid,
          originalError: error instanceof Error ? error.message : 'Unknown error',
          retryError: retryError instanceof Error ? retryError.message : 'Unknown error',
        });

        throw this.createValidationError(
          AuthErrorType.SIGNATURE_INVALID,
          `JWT signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Cognitoクレーム検証
   * 要件2.2, 2.3, 2.4: iss、aud、token_use、expクレームの検証
   */
  validateClaims(payload: JWTPayload): CognitoJWTPayload {
    try {
      logger.debug('Validating JWT claims');

      // 必須クレームの存在確認
      const requiredClaims = ['sub', 'email', 'iss', 'aud', 'token_use', 'exp', 'iat'];
      for (const claim of requiredClaims) {
        if (!(claim in payload) || payload[claim] === undefined || payload[claim] === null) {
          throw this.createValidationError(
            AuthErrorType.CLAIMS_INVALID,
            `Missing required claim: ${claim}`
          );
        }
      }

      // 型安全なペイロード作成
      const cognitoPayload: CognitoJWTPayload = {
        sub: this.validateStringClaim(payload.sub, 'sub'),
        email: this.validateStringClaim(payload.email, 'email'),
        name: payload.name ? this.validateStringClaim(payload.name, 'name') : undefined,
        iss: this.validateStringClaim(payload.iss, 'iss'),
        aud: this.validateStringClaim(payload.aud, 'aud'),
        token_use: this.validateTokenUseClaim(payload.token_use),
        exp: this.validateNumberClaim(payload.exp, 'exp'),
        iat: this.validateNumberClaim(payload.iat, 'iat'),
        auth_time: payload.auth_time
          ? this.validateNumberClaim(payload.auth_time, 'auth_time')
          : undefined,
        'cognito:username': payload['cognito:username']
          ? this.validateStringClaim(payload['cognito:username'], 'cognito:username')
          : undefined,
      };

      // 要件2.2: issuer（iss）クレーム検証
      if (cognitoPayload.iss !== this.expectedIssuer) {
        throw this.createValidationError(
          AuthErrorType.CLAIMS_INVALID,
          `Invalid issuer. Expected: ${this.expectedIssuer}, Got: ${cognitoPayload.iss}`
        );
      }

      // 要件2.3: audience（aud）クレーム検証
      if (cognitoPayload.aud !== this.expectedAudience) {
        throw this.createValidationError(
          AuthErrorType.CLAIMS_INVALID,
          `Invalid audience. Expected: ${this.expectedAudience}, Got: ${cognitoPayload.aud}`
        );
      }

      // 要件2.4: token_use クレーム検証
      if (cognitoPayload.token_use !== 'access' && cognitoPayload.token_use !== 'id') {
        throw this.createValidationError(
          AuthErrorType.CLAIMS_INVALID,
          `Invalid token_use. Expected: 'access' or 'id', Got: ${cognitoPayload.token_use}`
        );
      }

      // 有効期限検証（exp）
      const now = Math.floor(Date.now() / 1000);
      if (cognitoPayload.exp <= now) {
        throw this.createValidationError(
          AuthErrorType.TOKEN_EXPIRED,
          `Token expired. Expiry: ${new Date(cognitoPayload.exp * 1000).toISOString()}, Now: ${new Date(now * 1000).toISOString()}`
        );
      }

      // 発行時刻検証（iat）- 未来の時刻でないことを確認
      if (cognitoPayload.iat > now + 300) {
        // 5分の時刻ずれを許容
        throw this.createValidationError(
          AuthErrorType.CLAIMS_INVALID,
          `Token issued in the future. Issued: ${new Date(cognitoPayload.iat * 1000).toISOString()}, Now: ${new Date(now * 1000).toISOString()}`
        );
      }

      logger.debug('JWT claims validation successful', {
        sub: cognitoPayload.sub,
        email: cognitoPayload.email,
        tokenUse: cognitoPayload.token_use,
        iss: cognitoPayload.iss,
        aud: cognitoPayload.aud,
        exp: new Date(cognitoPayload.exp * 1000).toISOString(),
        iat: new Date(cognitoPayload.iat * 1000).toISOString(),
      });

      return cognitoPayload;
    } catch (error) {
      logger.error('JWT claims validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * トークン形式・構造検証
   */
  validateTokenStructure(token: string): { header: JWTHeader; payload: JWTPayload } {
    try {
      logger.debug('Validating JWT token structure');

      // トークンの基本形式確認（3つの部分がピリオドで区切られている）
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw this.createValidationError(
          AuthErrorType.TOKEN_INVALID,
          `Invalid JWT format. Expected 3 parts, got ${parts.length}`
        );
      }

      // 各部分が空でないことを確認
      if (parts.some(part => !part || part.length === 0)) {
        throw this.createValidationError(AuthErrorType.TOKEN_INVALID, 'JWT contains empty parts');
      }

      // ヘッダーとペイロードをデコード
      let header: JWTHeader;
      let payload: JWTPayload;

      try {
        // ヘッダーデコード
        const headerStr = Buffer.from(parts[0], 'base64url').toString('utf8');
        header = JSON.parse(headerStr) as JWTHeader;

        // ペイロードデコード（jsonwebtokenライブラリを使用）
        payload = jwt.decode(token) as JWTPayload;

        if (!payload) {
          throw new Error('Failed to decode JWT payload');
        }
      } catch (decodeError) {
        throw this.createValidationError(
          AuthErrorType.TOKEN_INVALID,
          `Failed to decode JWT: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`
        );
      }

      // ヘッダーの必須フィールド確認
      if (!header.alg || !header.kid || !header.typ) {
        throw this.createValidationError(
          AuthErrorType.TOKEN_INVALID,
          'JWT header missing required fields (alg, kid, typ)'
        );
      }

      // アルゴリズム確認（RS256のみサポート）
      if (header.alg !== 'RS256') {
        throw this.createValidationError(
          AuthErrorType.TOKEN_INVALID,
          `Unsupported algorithm: ${header.alg}. Only RS256 is supported`
        );
      }

      // トークンタイプ確認
      if (header.typ !== 'JWT') {
        throw this.createValidationError(
          AuthErrorType.TOKEN_INVALID,
          `Invalid token type: ${header.typ}. Expected JWT`
        );
      }

      logger.debug('JWT token structure validation successful', {
        alg: header.alg,
        kid: header.kid,
        typ: header.typ,
      });

      return { header, payload };
    } catch (error) {
      logger.error('JWT token structure validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // ===== ヘルパーメソッド =====

  /**
   * 文字列クレームの検証
   */
  private validateStringClaim(value: unknown, claimName: string): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw this.createValidationError(
        AuthErrorType.CLAIMS_INVALID,
        `Invalid ${claimName} claim: must be a non-empty string`
      );
    }
    return value;
  }

  /**
   * 数値クレームの検証
   */
  private validateNumberClaim(value: unknown, claimName: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw this.createValidationError(
        AuthErrorType.CLAIMS_INVALID,
        `Invalid ${claimName} claim: must be a positive integer`
      );
    }
    return value;
  }

  /**
   * token_useクレームの検証
   */
  private validateTokenUseClaim(value: unknown): 'access' | 'id' {
    if (typeof value !== 'string' || (value !== 'access' && value !== 'id')) {
      throw this.createValidationError(
        AuthErrorType.CLAIMS_INVALID,
        `Invalid token_use claim: must be 'access' or 'id', got '${value}'`
      );
    }
    return value;
  }

  /**
   * 検証エラーを作成
   */
  private createValidationError(type: AuthErrorType, message: string): TypedAuthError {
    const error = new Error(message) as TypedAuthError;
    error.type = type;
    return error;
  }

  /**
   * エラーからエラータイプを取得
   */
  private getErrorType(error: unknown): AuthErrorType {
    if (error && typeof error === 'object' && 'type' in error) {
      return (error as { type: AuthErrorType }).type;
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('expired')) {
        return AuthErrorType.TOKEN_EXPIRED;
      }
      if (message.includes('signature')) {
        return AuthErrorType.SIGNATURE_INVALID;
      }
      if (message.includes('claims') || message.includes('invalid')) {
        return AuthErrorType.CLAIMS_INVALID;
      }
    }

    return AuthErrorType.TOKEN_INVALID;
  }
}
