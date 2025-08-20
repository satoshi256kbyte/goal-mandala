import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from '../utils/logger';

/**
 * データベース認証情報の型定義
 */
export interface DatabaseCredentials {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
  dbClusterIdentifier: string;
}

/**
 * JWT設定情報の型定義
 */
export interface JwtConfig {
  secret: string;
  algorithm: string;
  issuer: string;
  expiresIn: string;
}

/**
 * 外部API認証情報の型定義
 */
export interface ExternalApiCredentials {
  bedrock: {
    region: string;
    modelId: string;
  };
  ses: {
    region: string;
    fromEmail: string;
    replyToEmail: string;
  };
}

/**
 * シークレット値の汎用型定義
 */
export interface SecretValue {
  [key: string]: any;
}

/**
 * SecretServiceのエラークラス
 */
export class SecretServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
    public readonly secretId?: string
  ) {
    super(message);
    this.name = 'SecretServiceError';
  }
}

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  SECRET_NOT_FOUND: 'SECRET_NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  THROTTLING_EXCEPTION: 'THROTTLING_EXCEPTION',
  INVALID_SECRET_FORMAT: 'INVALID_SECRET_FORMAT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

/**
 * アラート送信インターフェース
 */
export interface AlertService {
  sendAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    context?: any
  ): Promise<void>;
}

/**
 * AWS Secrets Managerからシークレットを取得・管理するサービスクラス（簡易版）
 */
export class SecretService {
  private readonly client: SecretsManagerClient;
  private readonly cache = new Map<string, { value: any; expiry: number }>();
  private readonly CACHE_TTL: number;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000;
  private readonly environment: string;
  private readonly alertService?: AlertService;

  constructor(region: string = 'ap-northeast-1', alertService?: AlertService) {
    this.client = new SecretsManagerClient({ region });
    this.environment = process.env.ENVIRONMENT || 'local';
    this.alertService = alertService;
    this.CACHE_TTL = 5 * 60 * 1000; // 5分
  }

  /**
   * データベース認証情報を取得
   */
  async getDatabaseCredentials(): Promise<DatabaseCredentials> {
    const secretId = `goal-mandala-${this.environment}-secret-database`;

    try {
      const secretValue = await this.getSecretValue(secretId);
      this.validateDatabaseCredentials(secretValue);

      return {
        username: secretValue.username,
        password: secretValue.password,
        engine: secretValue.engine,
        host: secretValue.host,
        port: parseInt(secretValue.port.toString(), 10),
        dbname: secretValue.dbname,
        dbClusterIdentifier: secretValue.dbClusterIdentifier,
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get database credentials: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (this.alertService && this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('high', errorMessage, { secretId, errorCode });
      }

      throw new SecretServiceError(
        errorMessage,
        errorCode,
        error instanceof Error ? error : undefined,
        secretId
      );
    }
  }

  /**
   * JWT秘密鍵を取得
   */
  async getJwtSecret(): Promise<string> {
    const secretId = `goal-mandala-${this.environment}-secret-jwt`;

    try {
      const secretValue = await this.getSecretValue(secretId);

      if (!secretValue.secret) {
        throw new Error('JWT secret not found in secret value');
      }

      return secretValue.secret;
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get JWT secret: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (this.alertService && this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('critical', errorMessage, { secretId, errorCode });
      }

      throw new SecretServiceError(
        errorMessage,
        errorCode,
        error instanceof Error ? error : undefined,
        secretId
      );
    }
  }

  /**
   * JWT設定情報を取得
   */
  async getJwtConfig(): Promise<JwtConfig> {
    const secretId = `goal-mandala-${this.environment}-secret-jwt`;

    try {
      const secretValue = await this.getSecretValue(secretId);
      this.validateJwtConfig(secretValue);

      return {
        secret: secretValue.secret,
        algorithm: secretValue.algorithm || 'HS256',
        issuer: secretValue.issuer || `goal-mandala-${this.environment}`,
        expiresIn: secretValue.expiresIn || '24h',
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get JWT config: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (this.alertService && this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('critical', errorMessage, { secretId, errorCode });
      }

      throw new SecretServiceError(
        errorMessage,
        errorCode,
        error instanceof Error ? error : undefined,
        secretId
      );
    }
  }

  /**
   * 外部API認証情報を取得
   */
  async getExternalApiCredentials(): Promise<ExternalApiCredentials> {
    const secretId = `goal-mandala-${this.environment}-secret-external-apis`;

    try {
      const secretValue = await this.getSecretValue(secretId);
      this.validateExternalApiCredentials(secretValue);

      return {
        bedrock: {
          region: secretValue.bedrock?.region || 'ap-northeast-1',
          modelId: secretValue.bedrock?.modelId || 'amazon.nova-micro-v1:0',
        },
        ses: {
          region: secretValue.ses?.region || 'ap-northeast-1',
          fromEmail: secretValue.ses?.fromEmail || 'noreply@goal-mandala.com',
          replyToEmail: secretValue.ses?.replyToEmail || 'support@goal-mandala.com',
        },
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get external API credentials: ${error instanceof Error ? error.message : 'Unknown error'}`;

      if (this.alertService && this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('medium', errorMessage, { secretId, errorCode });
      }

      throw new SecretServiceError(
        errorMessage,
        errorCode,
        error instanceof Error ? error : undefined,
        secretId
      );
    }
  }

  /**
   * AWS Secrets Managerからシークレット値を取得
   */
  private async getSecretValue(secretId: string): Promise<SecretValue> {
    // キャッシュチェック
    const cached = this.cache.get(secretId);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const command = new GetSecretValueCommand({ SecretId: secretId });
        const response = await this.client.send(command);

        if (!response.SecretString) {
          throw new Error('Secret string is empty');
        }

        const value = JSON.parse(response.SecretString);

        // キャッシュに保存
        this.cache.set(secretId, {
          value,
          expiry: Date.now() + this.CACHE_TTL,
        });

        return value;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (
          error instanceof Error &&
          error.name === 'ThrottlingException' &&
          attempt < this.MAX_RETRIES
        ) {
          const delay = Math.pow(2, attempt) * this.BASE_DELAY;
          await this.sleep(delay);
          continue;
        }

        if (attempt === this.MAX_RETRIES || !this.isRetryableError(error)) {
          break;
        }

        await this.sleep(this.BASE_DELAY);
      }
    }

    throw lastError || new Error('Failed to get secret value');
  }

  /**
   * エラーからエラーコードを取得
   */
  private getErrorCode(error: unknown): string {
    if (!(error instanceof Error)) return ERROR_CODES.INTERNAL_ERROR;

    switch (error.name) {
      case 'ResourceNotFoundException':
        return ERROR_CODES.SECRET_NOT_FOUND;
      case 'UnauthorizedOperation':
      case 'AccessDeniedException':
        return ERROR_CODES.ACCESS_DENIED;
      case 'ThrottlingException':
        return ERROR_CODES.THROTTLING_EXCEPTION;
      case 'ValidationException':
        return ERROR_CODES.VALIDATION_ERROR;
      case 'NetworkingError':
      case 'RequestTimeoutException':
        return ERROR_CODES.NETWORK_ERROR;
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }

  /**
   * 重要なエラーかどうかを判定
   */
  private isCriticalError(errorCode: string): boolean {
    const criticalErrors = [
      ERROR_CODES.SECRET_NOT_FOUND,
      ERROR_CODES.ACCESS_DENIED,
      ERROR_CODES.INTERNAL_ERROR,
    ];
    return criticalErrors.includes(errorCode as any);
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const retryableErrors = ['ThrottlingException', 'InternalServiceError', 'NetworkingError'];
    return retryableErrors.includes(error.name);
  }

  /**
   * 指定時間待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * データベース認証情報の検証
   */
  private validateDatabaseCredentials(secretValue: any): void {
    const requiredFields = [
      'username',
      'password',
      'engine',
      'host',
      'port',
      'dbname',
      'dbClusterIdentifier',
    ];

    for (const field of requiredFields) {
      if (!secretValue[field]) {
        const error = new Error(`Missing required field: ${field}`);
        error.name = 'ValidationException';
        throw error;
      }
    }

    if (typeof secretValue.password !== 'string' || secretValue.password.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      error.name = 'ValidationException';
      throw error;
    }
  }

  /**
   * JWT設定情報の検証
   */
  private validateJwtConfig(secretValue: any): void {
    if (!secretValue.secret) {
      const error = new Error('Missing required field: secret');
      error.name = 'ValidationException';
      throw error;
    }

    if (typeof secretValue.secret !== 'string' || secretValue.secret.length < 32) {
      const error = new Error('JWT secret must be at least 32 characters long');
      error.name = 'ValidationException';
      throw error;
    }
  }

  /**
   * 外部API認証情報の検証
   */
  private validateExternalApiCredentials(secretValue: any): void {
    if (secretValue.bedrock && typeof secretValue.bedrock !== 'object') {
      const error = new Error('Invalid bedrock configuration');
      error.name = 'ValidationException';
      throw error;
    }

    if (secretValue.ses && typeof secretValue.ses !== 'object') {
      const error = new Error('Invalid SES configuration');
      error.name = 'ValidationException';
      throw error;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 複数のシークレットを効率的に取得
   */
  async getMultipleSecrets(secretIds: string[]): Promise<Map<string, SecretValue>> {
    const results = new Map<string, SecretValue>();

    for (const secretId of secretIds) {
      try {
        const value = await this.getSecretValue(secretId);
        results.set(secretId, value);
      } catch (error) {
        // 個別のエラーは無視して続行
        logger.warn(`Failed to get secret ${secretId}:`, error as any);
      }
    }

    return results;
  }

  /**
   * シークレットをプリロード
   */
  async preloadSecrets(secretIds: string[]): Promise<void> {
    await this.getMultipleSecrets(secretIds);
  }

  /**
   * 期限切れキャッシュをクリア
   */
  clearExpiredCache(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry <= now) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * キャッシュメトリクスを取得
   */
  getCacheMetrics(): {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
    totalAccesses: number;
  } {
    return {
      hits: 0,
      misses: 0,
      size: this.cache.size,
      hitRate: 0,
      totalAccesses: 0,
    };
  }

  /**
   * キャッシュ詳細を取得
   */
  getCacheDetails(): Array<{
    secretId: string;
    createdAt: number;
    expiry: number;
    accessCount: number;
    lastAccessed: number;
    age: number;
    timeToExpiry: number;
  }> {
    const now = Date.now();
    const details: Array<{
      secretId: string;
      createdAt: number;
      expiry: number;
      accessCount: number;
      lastAccessed: number;
      age: number;
      timeToExpiry: number;
    }> = [];

    for (const [secretId, entry] of this.cache.entries()) {
      details.push({
        secretId,
        createdAt: now,
        expiry: entry.expiry,
        accessCount: 1,
        lastAccessed: now,
        age: 0,
        timeToExpiry: entry.expiry - now,
      });
    }

    return details;
  }

  /**
   * パフォーマンス統計を取得
   */
  getPerformanceStats(): { cache: any; config: any; runtime: any } {
    return {
      cache: this.getCacheMetrics(),
      config: {
        cacheSize: this.cache.size,
        maxCacheSize: 100,
        environment: this.environment,
        maxRetries: this.MAX_RETRIES,
        cacheTtl: this.CACHE_TTL,
        enableMetrics: true,
      },
      runtime: {
        uptime: process.uptime(),
      },
    };
  }

  /**
   * サービスを破棄
   */
  destroy(): void {
    this.clearCache();
  }
}
