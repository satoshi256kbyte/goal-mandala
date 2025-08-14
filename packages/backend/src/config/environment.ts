/**
 * 環境変数管理ユーティリティ
 */

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production';
  DATABASE_URL: string;
  JWT_SECRET: string;
  AWS_REGION: string;
  FRONTEND_URL: string;
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
  };

  // 本番環境では必須の環境変数をチェック
  if (config.NODE_ENV === 'production') {
    const requiredVars = ['DATABASE_URL', 'JWT_SECRET'] as const;

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
  // DATABASE_URLの形式チェック
  if (!config.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
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
};

// デフォルトエクスポート
export const config = getConfig();

// 設定値の検証を実行
validateConfig(config);
