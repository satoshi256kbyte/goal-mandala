/**
 * 環境変数管理ユーティリティ
 */

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  DATABASE_URL: string;
  JWT_SECRET: string;
  AWS_REGION: string;
  FRONTEND_URL: string;
  // Cognito設定
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  // 認証設定
  ENABLE_MOCK_AUTH: boolean;
  JWT_CACHE_TTL: number;
  // モック認証設定
  MOCK_USER_ID: string;
  MOCK_USER_EMAIL: string;
  MOCK_USER_NAME: string;
  // ログ設定
  LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  ENABLE_SECURITY_AUDIT: boolean;
}

/**
 * 環境変数を読み込み、型安全な設定オブジェクトを返す
 */
export const getConfig = (): EnvironmentConfig => {
  const config: EnvironmentConfig = {
    NODE_ENV: (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || 'development',
    DATABASE_URL:
      process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/goal_mandala',
    JWT_SECRET: process.env.JWT_SECRET || 'development-secret',
    AWS_REGION: process.env.AWS_REGION || 'ap-northeast-1',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    // Cognito設定
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || 'ap-northeast-1_xxxxxxxxx',
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
    // 認証設定
    ENABLE_MOCK_AUTH:
      process.env.ENABLE_MOCK_AUTH === 'true' ||
      ['development', 'test'].includes(process.env.NODE_ENV || 'development'),
    JWT_CACHE_TTL: parseInt(process.env.JWT_CACHE_TTL || '3600', 10),
    // モック認証設定
    MOCK_USER_ID: process.env.MOCK_USER_ID || 'dev-user-001',
    MOCK_USER_EMAIL: process.env.MOCK_USER_EMAIL || 'developer@example.com',
    MOCK_USER_NAME: process.env.MOCK_USER_NAME || 'Development User',
    // ログ設定
    LOG_LEVEL: (process.env.LOG_LEVEL as EnvironmentConfig['LOG_LEVEL']) || 'INFO',
    ENABLE_SECURITY_AUDIT: process.env.ENABLE_SECURITY_AUDIT === 'true' || false,
  };

  // 本番環境では必須の環境変数をチェック
  if (config.NODE_ENV === 'production') {
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'COGNITO_USER_POOL_ID',
      'COGNITO_CLIENT_ID',
    ] as const;

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Required environment variable ${varName} is not set in production`);
      }
    }
  }

  return config;
};

/**
 * 設定値の検証
 */
export const validateConfig = (config: EnvironmentConfig): void => {
  // DATABASE_URLの形式チェック（テスト環境ではSQLiteも許可）
  const isValidUrl =
    config.DATABASE_URL.startsWith('postgresql://') ||
    config.DATABASE_URL.startsWith('file:') ||
    config.NODE_ENV === 'test';

  if (!isValidUrl) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string or SQLite file URL');
  }

  // JWT_SECREの長さチェック
  if (config.JWT_SECRET.length < 32) {
    console.warn('JWT_SECRET should be at least 32 characters long for security');
  }

  // FRONTEND_URLの形式チェック
  try {
    new URL(config.FRONTEND_URL);
  } catch {
    throw new Error('FRONTEND_URL must be a valid URL');
  }

  // Cognito設定の検証（テスト環境では緩い検証）
  if (!config.ENABLE_MOCK_AUTH && config.NODE_ENV !== 'test') {
    if (
      !config.COGNITO_USER_POOL_ID ||
      config.COGNITO_USER_POOL_ID === 'ap-northeast-1_xxxxxxxxx'
    ) {
      throw new Error('COGNITO_USER_POOL_ID must be set when mock auth is disabled');
    }

    if (!config.COGNITO_CLIENT_ID || config.COGNITO_CLIENT_ID === 'xxxxxxxxxxxxxxxxxxxxxxxxxx') {
      throw new Error('COGNITO_CLIENT_ID must be set when mock auth is disabled');
    }
  }

  // モック認証設定の検証
  if (config.ENABLE_MOCK_AUTH) {
    if (!config.MOCK_USER_EMAIL || !config.MOCK_USER_EMAIL.includes('@')) {
      throw new Error('MOCK_USER_EMAIL must be a valid email address');
    }

    if (!config.MOCK_USER_ID || config.MOCK_USER_ID.length < 3) {
      throw new Error('MOCK_USER_ID must be at least 3 characters long');
    }

    // 本番環境でのモック認証警告
    if (config.NODE_ENV === 'production') {
      console.warn(
        '⚠️  WARNING: Mock authentication is enabled in production environment. This is a security risk!'
      );
    }
  }

  // キャッシュTTLの検証
  if (config.JWT_CACHE_TTL < 300 || config.JWT_CACHE_TTL > 86400) {
    console.warn('JWT_CACHE_TTL should be between 300 (5 minutes) and 86400 (24 hours) seconds');
  }
};

// デフォルトエクスポート
export const config = getConfig();

// 設定値の検証を実行
validateConfig(config);

/**
 * テスト用の設定再読み込み関数
 */
export const reloadConfig = (): EnvironmentConfig => {
  const newConfig = getConfig();
  validateConfig(newConfig);
  return newConfig;
};
