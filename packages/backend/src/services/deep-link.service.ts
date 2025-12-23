import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Deep Link Service
 *
 * Generates and validates secure deep links for email reminders.
 * Uses JWT tokens with HS256 algorithm and 24-hour expiration.
 */

export interface DeepLinkPayload {
  userId: string;
  taskId: string;
  expiresAt: Date;
}

export interface DeepLinkGenerateOptions {
  userId: string;
  taskId: string;
  expiresIn?: number; // in seconds, default 24 hours
}

export interface DeepLinkValidateResult {
  valid: boolean;
  payload?: DeepLinkPayload;
  error?: string;
}

class DeepLinkService {
  private secretCache: string | null = null;
  private secretCacheTime: number = 0;
  private readonly SECRET_CACHE_TTL = 3600000; // 1 hour in milliseconds
  private readonly DEFAULT_EXPIRATION = 24 * 60 * 60; // 24 hours in seconds
  private readonly SECRET_NAME = process.env.JWT_SECRET_NAME || 'goal-mandala/jwt-secret';
  private readonly AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';

  /**
   * Get JWT secret from AWS Secrets Manager with caching
   */
  private async getSecret(): Promise<string> {
    // Return cached secret if still valid
    const now = Date.now();
    if (this.secretCache && now - this.secretCacheTime < this.SECRET_CACHE_TTL) {
      return this.secretCache;
    }

    // For local development, use environment variable
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      const localSecret = process.env.JWT_SECRET;
      if (localSecret) {
        this.secretCache = localSecret;
        this.secretCacheTime = now;
        return localSecret;
      }
    }

    // Fetch from AWS Secrets Manager
    try {
      const client = new SecretsManagerClient({ region: this.AWS_REGION });
      const command = new GetSecretValueCommand({
        SecretId: this.SECRET_NAME,
      });

      const response = await client.send(command);

      if (!response.SecretString) {
        throw new Error('Secret value is empty');
      }

      // Parse secret if it's JSON
      let secret: string;
      try {
        const parsed = JSON.parse(response.SecretString);
        secret = parsed.jwtSecret || parsed.JWT_SECRET || response.SecretString;
      } catch {
        secret = response.SecretString;
      }

      // Cache the secret
      this.secretCache = secret;
      this.secretCacheTime = now;

      return secret;
    } catch (error) {
      console.error('Failed to retrieve JWT secret from Secrets Manager:', error);
      throw new Error('Failed to retrieve JWT secret');
    }
  }

  /**
   * Generate a secure deep link token
   *
   * @param options - Token generation options
   * @returns JWT token string
   *
   * Requirements: 3.2, 3.3
   */
  async generateToken(options: DeepLinkGenerateOptions): Promise<string> {
    const { userId, taskId, expiresIn = this.DEFAULT_EXPIRATION } = options;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId: must be a non-empty string');
    }

    if (!taskId || typeof taskId !== 'string') {
      throw new Error('Invalid taskId: must be a non-empty string');
    }

    if (expiresIn <= 0) {
      throw new Error('Invalid expiresIn: must be a positive number');
    }

    // Get secret
    const secret = await this.getSecret();

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Create JWT payload
    const payload = {
      userId,
      taskId,
      expiresAt: expiresAt.toISOString(),
      iat: Math.floor(Date.now() / 1000),
    };

    // Generate token
    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn,
    });

    return token;
  }

  /**
   * Validate a deep link token
   *
   * @param token - JWT token string
   * @returns Validation result with payload if valid
   *
   * Requirements: 3.2, 3.4
   */
  async validateToken(token: string): Promise<DeepLinkValidateResult> {
    // Validate input
    if (!token || typeof token !== 'string') {
      return {
        valid: false,
        error: 'Invalid token: must be a non-empty string',
      };
    }

    try {
      // Get secret
      const secret = await this.getSecret();

      // Verify token
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;

      // Extract payload
      const { userId, taskId, expiresAt } = decoded;

      // Validate payload structure
      if (!userId || !taskId || !expiresAt) {
        return {
          valid: false,
          error: 'Invalid token payload: missing required fields',
        };
      }

      // Parse expiration date
      const expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime())) {
        return {
          valid: false,
          error: 'Invalid token payload: invalid expiration date',
        };
      }

      // Check if token is expired
      if (expirationDate < new Date()) {
        return {
          valid: false,
          error: 'Token has expired',
        };
      }

      // Return valid result
      return {
        valid: true,
        payload: {
          userId,
          taskId,
          expiresAt: expirationDate,
        },
      };
    } catch (error) {
      // Handle JWT errors
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token has expired',
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: `Invalid token: ${error.message}`,
        };
      }

      // Handle other errors
      console.error('Token validation error:', error);
      return {
        valid: false,
        error: 'Token validation failed',
      };
    }
  }

  /**
   * Clear the secret cache (useful for testing)
   */
  clearCache(): void {
    this.secretCache = null;
    this.secretCacheTime = 0;
  }
}

// Export singleton instance
export const deepLinkService = new DeepLinkService();
