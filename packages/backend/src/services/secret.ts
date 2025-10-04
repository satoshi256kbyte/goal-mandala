import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger, logError } from '../utils/logger';

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
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * キャッシュエントリの型定義
 */
interface CacheEntry {
  value: SecretValue;
  expiry: number;
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * キャッシュ設定の型定義
 */
export interface CacheConfig {
  ttl?: number;
  maxSize?: number;
  enableMetrics?: boolean;
}

/**
 * キャッシュメトリクスの型定義
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  oldestEntry?: number;
  newestEntry?: number;
  totalAccesses: number;
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
    context?: Record<string, unknown>
  ): Promise<void>;
}

/**
 * デフォルトのアラートサービス実装（ログ出力のみ）
 */
class DefaultAlertService implements AlertService {
  async sendAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    logger.error(`ALERT [${severity.toUpperCase()}]: ${message}`, context);

    // 本番環境では SNS や Slack への通知を実装
    if (process.env.ENVIRONMENT === 'prod' || process.env.ENVIRONMENT === 'stg') {
      // TODO: SNS通知の実装
      // TODO: Slack通知の実装
    }
  }
}

/**
 * AWS Secrets Managerからシークレットを取得・管理するサービスクラス
 */
export class SecretService {
  private readonly client: SecretsManagerClient;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL: number;
  private readonly MAX_CACHE_SIZE: number;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1秒
  private readonly MAX_DELAY = 30000; // 30秒
  private readonly environment: string;
  private readonly alertService: AlertService;
  private readonly enableMetrics: boolean;

  // キャッシュメトリクス
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalAccesses = 0;

  // クリーンアップタイマー
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    region: string = 'ap-northeast-1',
    alertService?: AlertService,
    cacheConfig?: CacheConfig
  ) {
    this.client = new SecretsManagerClient({
      region,
      maxAttempts: 1, // リトライは自前で実装
    });
    this.environment = process.env.ENVIRONMENT || 'local';
    this.alertService = alertService || new DefaultAlertService();

    // キャッシュ設定
    this.CACHE_TTL = cacheConfig?.ttl || 5 * 60 * 1000; // デフォルト5分
    this.MAX_CACHE_SIZE = cacheConfig?.maxSize || 100; // デフォルト100エントリ
    this.enableMetrics = cacheConfig?.enableMetrics ?? true;

    // 定期的なキャッシュクリーンアップを開始
    this.startCacheCleanup();
  }

  /**
   * データベース認証情報を取得
   */
  async getDatabaseCredentials(customTtl?: number): Promise<DatabaseCredentials> {
    const secretId = `goal-mandala-${this.environment}-secret-database`;

    try {
      logger.info('Retrieving database credentials', { secretId, environment: this.environment });

      const secretValue = await this.getCachedSecret(secretId, customTtl);

      // 必要なフィールドの検証
      this.validateDatabaseCredentials(secretValue);

      logger.info('Successfully retrieved database credentials', { secretId });

      return {
        username: secretValue.username as string,
        password: secretValue.password as string,
        engine: secretValue.engine as string,
        host: secretValue.host as string,
        port: parseInt((secretValue.port ?? '5432').toString(), 10),
        dbname: secretValue.dbname as string,
        dbClusterIdentifier: secretValue.dbClusterIdentifier as string,
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get database credentials: ${error instanceof Error ? error.message : 'Unknown error'}`;

      logError(new Error(errorMessage), {
        secretId,
        environment: this.environment,
        errorCode,
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });

      // 重要なエラーの場合はアラートを送信
      if (this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('high', errorMessage, {
          secretId,
          environment: this.environment,
          errorCode,
        });
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
  async getJwtSecret(customTtl?: number): Promise<string> {
    const secretId = `goal-mandala-${this.environment}-secret-jwt`;

    try {
      logger.info('Retrieving JWT secret', { secretId, environment: this.environment });

      const secretValue = await this.getCachedSecret(secretId, customTtl);

      if (!secretValue.secret) {
        throw new Error('JWT secret not found in secret value');
      }

      logger.info('Successfully retrieved JWT secret', { secretId });
      return secretValue.secret as string;
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get JWT secret: ${error instanceof Error ? error.message : 'Unknown error'}`;

      logError(new Error(errorMessage), {
        secretId,
        environment: this.environment,
        errorCode,
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });

      // JWT秘密鍵の取得失敗は認証に影響するため重要
      if (this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('critical', errorMessage, {
          secretId,
          environment: this.environment,
          errorCode,
        });
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
  async getJwtConfig(customTtl?: number): Promise<JwtConfig> {
    const secretId = `goal-mandala-${this.environment}-secret-jwt`;

    try {
      logger.info('Retrieving JWT config', { secretId, environment: this.environment });

      const secretValue = await this.getCachedSecret(secretId, customTtl);

      this.validateJwtConfig(secretValue);

      logger.info('Successfully retrieved JWT config', { secretId });

      return {
        secret: secretValue.secret as string,
        algorithm: (secretValue.algorithm as string) || 'HS256',
        issuer: (secretValue.issuer as string) || `goal-mandala-${this.environment}`,
        expiresIn: (secretValue.expiresIn as string) || '24h',
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get JWT config: ${error instanceof Error ? error.message : 'Unknown error'}`;

      logError(new Error(errorMessage), {
        secretId,
        environment: this.environment,
        errorCode,
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });

      if (this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('critical', errorMessage, {
          secretId,
          environment: this.environment,
          errorCode,
        });
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
  async getExternalApiCredentials(customTtl?: number): Promise<ExternalApiCredentials> {
    const secretId = `goal-mandala-${this.environment}-secret-external-apis`;

    try {
      logger.info('Retrieving external API credentials', {
        secretId,
        environment: this.environment,
      });

      const secretValue = await this.getCachedSecret(secretId, customTtl);

      this.validateExternalApiCredentials(secretValue);

      logger.info('Successfully retrieved external API credentials', { secretId });

      return {
        bedrock: {
          region:
            ((secretValue.bedrock as unknown as Record<string, unknown>)?.region as string) ||
            'ap-northeast-1',
          modelId:
            ((secretValue.bedrock as unknown as Record<string, unknown>)?.modelId as string) ||
            'amazon.nova-micro-v1:0',
        },
        ses: {
          region:
            ((secretValue.ses as unknown as Record<string, unknown>)?.region as string) ||
            'ap-northeast-1',
          fromEmail:
            ((secretValue.ses as unknown as Record<string, unknown>)?.fromEmail as string) ||
            'noreply@goal-mandala.com',
          replyToEmail:
            ((secretValue.ses as unknown as Record<string, unknown>)?.replyToEmail as string) ||
            'support@goal-mandala.com',
        },
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get external API credentials: ${error instanceof Error ? error.message : 'Unknown error'}`;

      logError(new Error(errorMessage), {
        secretId,
        environment: this.environment,
        errorCode,
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });

      // 外部API認証情報の取得失敗は中程度の重要度
      if (this.isCriticalError(errorCode)) {
        await this.alertService.sendAlert('medium', errorMessage, {
          secretId,
          environment: this.environment,
          errorCode,
        });
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
   * 全てのシークレットを一括取得（パフォーマンス最適化）
   */
  async getAllSecrets(): Promise<{
    database: DatabaseCredentials;
    jwt: JwtConfig;
    externalApis: ExternalApiCredentials;
  }> {
    try {
      logger.info('Retrieving all secrets', { environment: this.environment });

      const [database, jwt, externalApis] = await Promise.all([
        this.getDatabaseCredentials(),
        this.getJwtConfig(),
        this.getExternalApiCredentials(),
      ]);

      logger.info('Successfully retrieved all secrets', { environment: this.environment });
      return { database, jwt, externalApis };
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get all secrets: ${error instanceof Error ? error.message : 'Unknown error'}`;

      logError(new Error(errorMessage), {
        environment: this.environment,
        errorCode,
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });

      // 全シークレット取得失敗は重要
      await this.alertService.sendAlert('high', errorMessage, {
        environment: this.environment,
        errorCode,
      });

      throw new SecretServiceError(
        errorMessage,
        errorCode,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * 複数のシークレットを効率的に取得（バッチ処理最適化）
   */
  async getMultipleSecrets(
    secretIds: string[],
    customTtl?: number
  ): Promise<Map<string, SecretValue>> {
    try {
      logger.info('Retrieving multiple secrets', {
        secretIds,
        count: secretIds.length,
        environment: this.environment,
      });

      const results = new Map<string, SecretValue>();
      const uncachedSecrets: string[] = [];

      // まずキャッシュから取得を試行
      for (const secretId of secretIds) {
        try {
          const cached = this.cache.get(secretId);
          if (cached && cached.expiry > Date.now()) {
            cached.accessCount++;
            cached.lastAccessed = Date.now();
            this.cacheHits++;
            results.set(secretId, cached.value);

            if (this.enableMetrics) {
              logger.debug('Secret retrieved from cache in batch', { secretId });
            }
          } else {
            uncachedSecrets.push(secretId);
          }
        } catch (error) {
          logger.warn('Cache error for secret in batch', {
            secretId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          uncachedSecrets.push(secretId);
        }
      }

      // キャッシュにないシークレットを並列取得
      if (uncachedSecrets.length > 0) {
        logger.debug('Fetching uncached secrets', {
          uncachedSecrets,
          count: uncachedSecrets.length,
        });

        const fetchPromises = uncachedSecrets.map(async secretId => {
          try {
            const value = await this.getSecretValue(secretId);

            // キャッシュに保存
            const ttl = customTtl || this.CACHE_TTL;
            const now = Date.now();

            // キャッシュサイズ制限チェック
            if (this.cache.size >= this.MAX_CACHE_SIZE) {
              this.evictOldestEntries();
            }

            this.cache.set(secretId, {
              value,
              expiry: now + ttl,
              createdAt: now,
              accessCount: 1,
              lastAccessed: now,
            });

            this.cacheMisses++;
            return { secretId, value } as { secretId: string; value: SecretValue };
          } catch (error) {
            logger.error('Failed to fetch secret in batch', {
              secretId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new SecretServiceError(
              `Failed to fetch secret ${secretId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              this.getErrorCode(error),
              error instanceof Error ? error : undefined,
              secretId
            );
          }
        });

        const fetchResults = await Promise.allSettled(fetchPromises);

        for (const result of fetchResults) {
          if (result.status === 'fulfilled') {
            results.set(result.value.secretId, result.value.value);
          } else {
            // 個別のエラーは既にログ出力済み
            logger.warn('Secret fetch failed in batch', {
              error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
            });
          }
        }
      }

      this.totalAccesses += secretIds.length;

      logger.info('Multiple secrets retrieval completed', {
        requested: secretIds.length,
        successful: results.size,
        fromCache: secretIds.length - uncachedSecrets.length,
        fromAws: uncachedSecrets.length,
        environment: this.environment,
      });

      return results;
    } catch (error) {
      const errorCode = this.getErrorCode(error);
      const errorMessage = `Failed to get multiple secrets: ${error instanceof Error ? error.message : 'Unknown error'}`;

      logError(new Error(errorMessage), {
        secretIds,
        environment: this.environment,
        errorCode,
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.alertService.sendAlert('medium', errorMessage, {
        secretIds,
        environment: this.environment,
        errorCode,
      });

      throw new SecretServiceError(
        errorMessage,
        errorCode,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * シークレットをプリロード（事前キャッシュ）
   */
  async preloadSecrets(secretIds: string[], customTtl?: number): Promise<void> {
    try {
      logger.info('Preloading secrets', { secretIds, count: secretIds.length });

      await this.getMultipleSecrets(secretIds, customTtl);

      logger.info('Secrets preloaded successfully', {
        secretIds,
        count: secretIds.length,
        cacheSize: this.cache.size,
      });
    } catch (error) {
      logger.error('Failed to preload secrets', {
        secretIds,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * キャッシュ機能付きシークレット取得
   */
  private async getCachedSecret(secretId: string, customTtl?: number): Promise<SecretValue> {
    try {
      this.totalAccesses++;

      const cached = this.cache.get(secretId);
      if (cached && cached.expiry > Date.now()) {
        // キャッシュヒット
        cached.accessCount++;
        cached.lastAccessed = Date.now();
        this.cacheHits++;

        if (this.enableMetrics) {
          logger.debug('Secret retrieved from cache', {
            secretId,
            accessCount: cached.accessCount,
            age: Date.now() - cached.createdAt,
          });
        }
        return cached.value;
      }

      // キャッシュミス
      this.cacheMisses++;
      logger.debug('Cache miss, retrieving secret from AWS', { secretId });

      const value = await this.getSecretValue(secretId);

      // キャッシュサイズ制限チェック
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.evictOldestEntries();
      }

      const ttl = customTtl || this.CACHE_TTL;
      const now = Date.now();

      this.cache.set(secretId, {
        value,
        expiry: now + ttl,
        createdAt: now,
        accessCount: 1,
        lastAccessed: now,
      });

      if (this.enableMetrics) {
        logger.debug('Secret cached successfully', {
          secretId,
          cacheExpiry: now + ttl,
          cacheSize: this.cache.size,
          ttl,
        });
      }

      return value;
    } catch (error) {
      // キャッシュエラーの場合は直接取得を試行
      if (error instanceof Error && error.message.includes('cache')) {
        logger.warn('Cache error, attempting direct retrieval', { secretId, error: error.message });
        return await this.getSecretValue(secretId);
      }
      throw error;
    }
  }

  /**
   * AWS Secrets Managerからシークレット値を取得
   */
  private async getSecretValue(secretId: string): Promise<SecretValue> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        logger.debug('Attempting to retrieve secret from AWS', {
          secretId,
          attempt,
          maxRetries: this.MAX_RETRIES,
        });

        const command = new GetSecretValueCommand({
          SecretId: secretId,
        });

        const response = await this.client.send(command);

        if (!response.SecretString) {
          throw new Error('Secret string is empty');
        }

        logger.debug('Successfully retrieved secret from AWS', { secretId, attempt });
        return JSON.parse(response.SecretString);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const errorName = error instanceof Error ? error.name : 'UnknownError';

        logger.warn('Failed to retrieve secret', {
          secretId,
          attempt,
          maxRetries: this.MAX_RETRIES,
          errorName,
          errorMessage: lastError.message,
        });

        // ThrottlingExceptionの場合は指数バックオフでリトライ
        if (errorName === 'ThrottlingException' && attempt < this.MAX_RETRIES) {
          const delay = Math.min(Math.pow(2, attempt) * this.BASE_DELAY, this.MAX_DELAY);
          logger.info('Throttling detected, applying exponential backoff', {
            secretId,
            attempt,
            delay,
            nextAttempt: attempt + 1,
          });
          await this.sleep(delay);
          continue;
        }

        // その他のエラーは即座に投げる
        if (attempt === this.MAX_RETRIES || !this.isRetryableError(error)) {
          logger.error('Max retries exceeded or non-retryable error', {
            secretId,
            attempt,
            maxRetries: this.MAX_RETRIES,
            errorName,
            isRetryable: this.isRetryableError(error),
          });
          break;
        }

        // リトライ可能なエラーの場合は少し待つ
        const delay = this.BASE_DELAY;
        logger.info('Retryable error detected, waiting before retry', {
          secretId,
          attempt,
          delay,
          nextAttempt: attempt + 1,
        });
        await this.sleep(delay);
      }
    }

    // 最終的なエラーログとアラート
    const finalError = lastError || new Error('Failed to get secret value');
    const errorCode = this.getErrorCode(finalError);

    logError(finalError, {
      secretId,
      totalAttempts: this.MAX_RETRIES,
      errorCode,
      operation: 'getSecretValue',
    });

    // 重要なエラーの場合はアラートを送信
    if (this.isCriticalError(errorCode)) {
      await this.alertService.sendAlert(
        'high',
        `Failed to retrieve secret after ${this.MAX_RETRIES} attempts`,
        {
          secretId,
          errorCode,
          errorMessage: finalError.message,
        }
      );
    }

    throw finalError;
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const retryableErrors = [
      'ThrottlingException',
      'InternalServiceError',
      'ServiceUnavailableException',
      'RequestTimeoutException',
      'NetworkingError',
    ];

    return retryableErrors.includes(error.name);
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
      case 'InvalidParameterException':
      case 'InvalidRequestException':
        return ERROR_CODES.INVALID_SECRET_FORMAT;
      case 'ValidationException':
        return ERROR_CODES.VALIDATION_ERROR;
      case 'NetworkingError':
      case 'RequestTimeoutException':
        return ERROR_CODES.NETWORK_ERROR;
      case 'TimeoutError':
        return ERROR_CODES.TIMEOUT_ERROR;
      default:
        // メッセージからエラータイプを推測
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          return ERROR_CODES.SECRET_NOT_FOUND;
        }
        if (error.message.includes('access denied') || error.message.includes('unauthorized')) {
          return ERROR_CODES.ACCESS_DENIED;
        }
        if (error.message.includes('validation') || error.message.includes('invalid')) {
          return ERROR_CODES.VALIDATION_ERROR;
        }
        if (error.message.includes('cache')) {
          return ERROR_CODES.CACHE_ERROR;
        }
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }

  /**
   * 重要なエラーかどうかを判定
   */
  private isCriticalError(errorCode: string): boolean {
    const criticalErrors: string[] = [
      ERROR_CODES.SECRET_NOT_FOUND,
      ERROR_CODES.ACCESS_DENIED,
      ERROR_CODES.INTERNAL_ERROR,
    ];

    return criticalErrors.includes(errorCode);
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
  private validateDatabaseCredentials(secretValue: Record<string, unknown>): void {
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

    // 型の検証
    if (typeof secretValue.username !== 'string' || secretValue.username.trim() === '') {
      const error = new Error('Username must be a non-empty string');
      error.name = 'ValidationException';
      throw error;
    }

    if (typeof secretValue.password !== 'string' || secretValue.password.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      error.name = 'ValidationException';
      throw error;
    }

    const port = parseInt((secretValue.port ?? '5432').toString(), 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      const error = new Error('Port must be a valid number between 1 and 65535');
      error.name = 'ValidationException';
      throw error;
    }
  }

  /**
   * JWT設定情報の検証
   */
  private validateJwtConfig(secretValue: Record<string, unknown>): void {
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

    // アルゴリズムの検証（指定されている場合）
    if (secretValue.algorithm) {
      const validAlgorithms = ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'];
      if (!validAlgorithms.includes(secretValue.algorithm as string)) {
        const error = new Error(`Invalid JWT algorithm: ${secretValue.algorithm}`);
        error.name = 'ValidationException';
        throw error;
      }
    }

    // 有効期限の検証（指定されている場合）
    if (secretValue.expiresIn && typeof secretValue.expiresIn !== 'string') {
      const error = new Error('JWT expiresIn must be a string');
      error.name = 'ValidationException';
      throw error;
    }
  }

  /**
   * 外部API認証情報の検証
   */
  private validateExternalApiCredentials(secretValue: Record<string, unknown>): void {
    // Bedrock設定の検証
    if (secretValue.bedrock && typeof secretValue.bedrock !== 'object') {
      const error = new Error('Invalid bedrock configuration: must be an object');
      error.name = 'ValidationException';
      throw error;
    }

    // SES設定の検証
    if (secretValue.ses && typeof secretValue.ses !== 'object') {
      const error = new Error('Invalid SES configuration: must be an object');
      error.name = 'ValidationException';
      throw error;
    }

    // SESメールアドレスの検証
    if (
      (secretValue.ses as unknown as Record<string, unknown>)?.fromEmail &&
      !this.isValidEmail(
        (secretValue.ses as unknown as Record<string, unknown>).fromEmail as string
      )
    ) {
      const error = new Error('Invalid SES fromEmail format');
      error.name = 'ValidationException';
      throw error;
    }

    if (
      (secretValue.ses as unknown as Record<string, unknown>)?.replyToEmail &&
      !this.isValidEmail(
        (secretValue.ses as unknown as Record<string, unknown>).replyToEmail as string
      )
    ) {
      const error = new Error('Invalid SES replyToEmail format');
      error.name = 'ValidationException';
      throw error;
    }
  }

  /**
   * メールアドレスの形式を検証
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalAccesses = 0;

    if (this.enableMetrics) {
      logger.info('Secret cache cleared', {
        previousSize: this.cache.size,
        metrics: this.getCacheMetrics(),
      });
    }
  }

  /**
   * 特定のシークレットのキャッシュをクリア
   */
  public clearSecretCache(secretId: string): void {
    const existed = this.cache.delete(secretId);

    if (this.enableMetrics && existed) {
      logger.info('Secret cache entry cleared', {
        secretId,
        remainingSize: this.cache.size,
      });
    }
  }

  /**
   * 期限切れのキャッシュエントリを削除
   */
  public clearExpiredCache(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [secretId, entry] of this.cache.entries()) {
      if (entry.expiry <= now) {
        this.cache.delete(secretId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.info('Expired cache entries removed', {
        removedCount,
        remainingSize: this.cache.size,
      });
    }

    return removedCount;
  }

  /**
   * 最も古いキャッシュエントリを削除（LRU方式）
   */
  private evictOldestEntries(count: number = 1): void {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed - b.lastAccessed
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [secretId] = entries[i];
      this.cache.delete(secretId);
      logger.debug('Cache entry evicted (LRU)', { secretId });
    }
  }

  /**
   * 定期的なキャッシュクリーンアップを開始
   */
  private startCacheCleanup(): void {
    // テスト環境では自動クリーンアップを無効化
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // 5分ごとに期限切れエントリをクリーンアップ
    this.cleanupTimer = setInterval(
      () => {
        try {
          this.clearExpiredCache();
        } catch (error) {
          logger.error('Cache cleanup failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
      5 * 60 * 1000
    );
  }

  /**
   * クリーンアップタイマーを停止
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clearCache();
  }

  /**
   * キャッシュメトリクスをリセット
   */
  private resetMetrics(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.totalAccesses = 0;
  }

  /**
   * サービスのヘルスチェック
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: {
      database: boolean;
      jwt: boolean;
      externalApis: boolean;
    };
    errors?: string[];
  }> {
    const checks = {
      database: false,
      jwt: false,
      externalApis: false,
    };
    const errors: string[] = [];

    try {
      // データベース認証情報の取得テスト
      await this.getDatabaseCredentials();
      checks.database = true;
    } catch (error) {
      errors.push(
        `Database credentials check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    try {
      // JWT設定の取得テスト
      await this.getJwtConfig();
      checks.jwt = true;
    } catch (error) {
      errors.push(
        `JWT config check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    try {
      // 外部API認証情報の取得テスト
      await this.getExternalApiCredentials();
      checks.externalApis = true;
    } catch (error) {
      errors.push(
        `External API credentials check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    const allHealthy = checks.database && checks.jwt && checks.externalApis;
    const status = allHealthy ? 'healthy' : 'unhealthy';

    logger.info('Health check completed', {
      status,
      checks,
      errorCount: errors.length,
    });

    if (!allHealthy) {
      await this.alertService.sendAlert('medium', 'SecretService health check failed', {
        status,
        checks,
        errors,
      });
    }

    return {
      status,
      checks,
      ...(errors.length > 0 && { errors }),
    };
  }

  /**
   * キャッシュメトリクスを取得
   */
  getCacheMetrics(): CacheMetrics {
    const entries = Array.from(this.cache.values());

    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    if (entries.length > 0) {
      oldestEntry = Math.min(...entries.map(e => e.createdAt));
      newestEntry = Math.max(...entries.map(e => e.createdAt));
    }

    const hitRate = this.totalAccesses > 0 ? (this.cacheHits / this.totalAccesses) * 100 : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      oldestEntry,
      newestEntry,
      totalAccesses: this.totalAccesses,
    };
  }

  /**
   * キャッシュの詳細情報を取得
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
        createdAt: entry.createdAt,
        expiry: entry.expiry,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
        age: now - entry.createdAt,
        timeToExpiry: Math.max(0, entry.expiry - now),
      });
    }

    return details.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * キャッシュ設定を更新
   */
  updateCacheConfig(config: Partial<CacheConfig>): void {
    if (config.maxSize !== undefined && config.maxSize !== this.MAX_CACHE_SIZE) {
      logger.info('Cache max size updated', {
        oldSize: this.MAX_CACHE_SIZE,
        newSize: config.maxSize,
      });

      // 新しいサイズ制限を適用
      if (config.maxSize < this.cache.size) {
        const excessCount = this.cache.size - config.maxSize;
        this.evictOldestEntries(excessCount);
      }
    }

    logger.info('Cache configuration updated', config);
  }

  /**
   * パフォーマンス統計情報を取得
   */
  getPerformanceStats(): {
    cache: CacheMetrics;
    config: {
      cacheSize: number;
      maxCacheSize: number;
      environment: string;
      maxRetries: number;
      cacheTtl: number;
      enableMetrics: boolean;
    };
    runtime: {
      uptime: number;
      memoryUsage?: NodeJS.MemoryUsage;
    };
  } {
    return {
      cache: this.getCacheMetrics(),
      config: {
        cacheSize: this.cache.size,
        maxCacheSize: this.MAX_CACHE_SIZE,
        environment: this.environment,
        maxRetries: this.MAX_RETRIES,
        cacheTtl: this.CACHE_TTL,
        enableMetrics: this.enableMetrics,
      },
      runtime: {
        uptime: process.uptime() * 1000,
        memoryUsage: process.memoryUsage ? process.memoryUsage() : undefined,
      },
    };
  }

  /**
   * キャッシュの最適化を実行
   */
  optimizeCache(): {
    removedExpired: number;
    removedLeastUsed: number;
    finalSize: number;
  } {
    const initialSize = this.cache.size;

    // 期限切れエントリを削除
    const removedExpired = this.clearExpiredCache();

    // キャッシュサイズが制限を超えている場合、最も使用頻度の低いエントリを削除
    let removedLeastUsed = 0;
    if (this.cache.size > this.MAX_CACHE_SIZE * 0.8) {
      // 80%を超えた場合
      const targetSize = Math.floor(this.MAX_CACHE_SIZE * 0.7); // 70%まで削減
      const toRemove = this.cache.size - targetSize;

      if (toRemove > 0) {
        // アクセス頻度の低い順にソート
        const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
          // アクセス頻度とアクセス時刻を考慮したスコア
          const scoreA = a.accessCount / (Date.now() - a.lastAccessed + 1);
          const scoreB = b.accessCount / (Date.now() - b.lastAccessed + 1);
          return scoreA - scoreB;
        });

        for (let i = 0; i < toRemove && i < entries.length; i++) {
          const [secretId] = entries[i];
          this.cache.delete(secretId);
          removedLeastUsed++;
        }
      }
    }

    const result = {
      removedExpired,
      removedLeastUsed,
      finalSize: this.cache.size,
    };

    logger.info('Cache optimization completed', {
      initialSize,
      ...result,
      optimizationRatio: (((initialSize - result.finalSize) / initialSize) * 100).toFixed(2) + '%',
    });

    return result;
  }
}

// デフォルトインスタンスをエクスポート
export const secretService = new SecretService();

// 高パフォーマンス用のプリセット設定
export const createHighPerformanceSecretService = (region?: string): SecretService => {
  return new SecretService(region, undefined, {
    ttl: 10 * 60 * 1000, // 10分
    maxSize: 200,
    enableMetrics: true,
  });
};

// 低メモリ使用量用のプリセット設定
export const createLowMemorySecretService = (region?: string): SecretService => {
  return new SecretService(region, undefined, {
    ttl: 2 * 60 * 1000, // 2分
    maxSize: 50,
    enableMetrics: false,
  });
};
