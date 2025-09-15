/**
 * 認証状態管理の環境別設定
 */

export interface AuthConfig {
  monitoring: {
    checkInterval: number;
    tokenRefreshBuffer: number;
    inactivityTimeout: number;
    maxRetryAttempts: number;
    retryDelay: number;
  };
  security: {
    enableEncryption: boolean;
    enableLogging: boolean;
    logLevel: 'none' | 'error' | 'warn' | 'info' | 'debug';
    tokenAccessRestriction: boolean;
    memoryCleanupInterval: number;
  };
  performance: {
    enableContextSplit: boolean;
    enableMemoization: boolean;
    tokenValidationCacheTTL: number;
  };
}

const baseConfig: AuthConfig = {
  monitoring: {
    checkInterval: 60000,
    tokenRefreshBuffer: 300000,
    inactivityTimeout: 1800000,
    maxRetryAttempts: 3,
    retryDelay: 1000,
  },
  security: {
    enableEncryption: true,
    enableLogging: false,
    logLevel: 'error',
    tokenAccessRestriction: true,
    memoryCleanupInterval: 300000,
  },
  performance: {
    enableContextSplit: true,
    enableMemoization: true,
    tokenValidationCacheTTL: 300000,
  },
};

const developmentConfig: Partial<AuthConfig> = {
  monitoring: {
    checkInterval: 30000,
    inactivityTimeout: 3600000,
  },
  security: {
    enableLogging: true,
    logLevel: 'debug',
  },
};

const productionConfig: Partial<AuthConfig> = {
  security: {
    enableLogging: false,
    logLevel: 'error',
  },
};

export const getAuthConfig = (): AuthConfig => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'development':
      return { ...baseConfig, ...developmentConfig };
    case 'production':
      return { ...baseConfig, ...productionConfig };
    default:
      return baseConfig;
  }
};
