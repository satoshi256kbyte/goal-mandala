/**
 * 環境変数設定オブジェクト作成ヘルパー
 */

import {
  validateEnv,
  validateDevelopmentEnv,
  validateProductionEnv,
  type ValidatedEnv,
} from './validation';

/**
 * アプリケーション設定オブジェクト
 */
export interface AppConfig {
  // 基本設定
  env: 'development' | 'test' | 'production';
  port: number;
  frontendUrl: string;
  apiBaseUrl?: string;

  // データベース設定
  database: {
    url: string;
    testUrl?: string;
    connectionLimit: number;
    connectionTimeout: number;
  };

  // 認証設定
  auth: {
    jwtSecret: string;
    sessionSecret?: string;
    cognito?: {
      endpoint: string;
      userPoolId: string;
      clientId: string;
      region: string;
    };
  };

  // AWS設定
  aws: {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };

  // メール設定
  email?: {
    ses?: {
      region: string;
      fromEmail: string;
    };
    smtp?: {
      host: string;
      port: number;
      user?: string;
      pass?: string;
    };
  };

  // ログ設定
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    output: 'console' | 'file';
  };

  // Docker設定
  docker: {
    postgresContainerName: string;
    cognitoContainerName: string;
    networkName: string;
  };

  // Prisma設定
  prisma?: {
    databaseUrl: string;
    testDatabaseUrl?: string;
  };

  // パフォーマンス設定
  performance: {
    apiTimeout: number;
  };

  // 機能フラグ
  features: {
    aiEnabled: boolean;
    emailEnabled: boolean;
    debugMode: boolean;
  };
}

/**
 * 検証済み環境変数からアプリケーション設定オブジェクトを作成
 *
 * @param validatedEnv - 検証済み環境変数
 * @returns アプリケーション設定オブジェクト
 */
export function createAppConfig(validatedEnv: ValidatedEnv): AppConfig {
  const config: AppConfig = {
    env: validatedEnv.NODE_ENV,
    port: validatedEnv.PORT,
    frontendUrl: validatedEnv.FRONTEND_URL,
    apiBaseUrl: validatedEnv.API_BASE_URL,

    database: {
      url: validatedEnv.DATABASE_URL,
      testUrl: validatedEnv.TEST_DATABASE_URL,
      connectionLimit: validatedEnv.DB_CONNECTION_LIMIT,
      connectionTimeout: validatedEnv.DB_CONNECTION_TIMEOUT,
    },

    auth: {
      jwtSecret: validatedEnv.JWT_SECRET,
      sessionSecret: validatedEnv.SESSION_SECRET,
    },

    aws: {
      region: validatedEnv.AWS_REGION,
      accessKeyId: validatedEnv.AWS_ACCESS_KEY_ID,
      secretAccessKey: validatedEnv.AWS_SECRET_ACCESS_KEY,
    },

    logging: {
      level: validatedEnv.LOG_LEVEL,
      output: validatedEnv.LOG_OUTPUT,
    },

    docker: {
      postgresContainerName: validatedEnv.POSTGRES_CONTAINER_NAME,
      cognitoContainerName: validatedEnv.COGNITO_CONTAINER_NAME,
      networkName: validatedEnv.DOCKER_NETWORK_NAME,
    },

    performance: {
      apiTimeout: validatedEnv.API_TIMEOUT,
    },

    features: {
      aiEnabled: validatedEnv.ENABLE_AI_FEATURES,
      emailEnabled: validatedEnv.ENABLE_EMAIL_FEATURES,
      debugMode: validatedEnv.DEBUG_MODE,
    },
  };

  // Cognito設定（開発環境用）
  if (
    validatedEnv.COGNITO_LOCAL_ENDPOINT &&
    validatedEnv.COGNITO_USER_POOL_ID &&
    validatedEnv.COGNITO_CLIENT_ID &&
    validatedEnv.COGNITO_REGION
  ) {
    config.auth.cognito = {
      endpoint: validatedEnv.COGNITO_LOCAL_ENDPOINT,
      userPoolId: validatedEnv.COGNITO_USER_POOL_ID,
      clientId: validatedEnv.COGNITO_CLIENT_ID,
      region: validatedEnv.COGNITO_REGION,
    };
  }

  // メール設定
  if (validatedEnv.SES_REGION && validatedEnv.SES_FROM_EMAIL) {
    config.email = {
      ses: {
        region: validatedEnv.SES_REGION,
        fromEmail: validatedEnv.SES_FROM_EMAIL,
      },
    };
  }

  if (validatedEnv.SMTP_HOST && validatedEnv.SMTP_PORT) {
    if (!config.email) config.email = {};
    config.email.smtp = {
      host: validatedEnv.SMTP_HOST,
      port: validatedEnv.SMTP_PORT,
      user: validatedEnv.SMTP_USER,
      pass: validatedEnv.SMTP_PASS,
    };
  }

  // Prisma設定
  if (validatedEnv.PRISMA_DATABASE_URL) {
    config.prisma = {
      databaseUrl: validatedEnv.PRISMA_DATABASE_URL,
      testDatabaseUrl: validatedEnv.PRISMA_TEST_DATABASE_URL,
    };
  }

  return config;
}

/**
 * 環境変数を検証してアプリケーション設定オブジェクトを作成
 *
 * @param env - 環境変数オブジェクト（デフォルトはprocess.env）
 * @returns アプリケーション設定オブジェクト
 */
export function createEnvConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV || 'development';

  let validatedEnv: ValidatedEnv;

  switch (nodeEnv) {
    case 'development':
      validatedEnv = validateDevelopmentEnv(env);
      break;
    case 'production':
      validatedEnv = validateProductionEnv(env);
      break;
    default:
      validatedEnv = validateEnv(env);
      break;
  }

  return createAppConfig(validatedEnv);
}

/**
 * 設定値の表示
 *
 * @param config - アプリケーション設定オブジェクト
 */
export function displayConfig(config: AppConfig): void {
  console.log('=== アプリケーション設定 ===');
  console.log(`環境: ${config.env}`);
  console.log(`ポート: ${config.port}`);
  console.log(`フロントエンドURL: ${config.frontendUrl}`);
  console.log(`AWSリージョン: ${config.aws.region}`);
  console.log(`ログレベル: ${config.logging.level}`);
  console.log(`AI機能: ${config.features.aiEnabled ? '有効' : '無効'}`);
  console.log(`メール機能: ${config.features.emailEnabled ? '有効' : '無効'}`);
  console.log(`デバッグモード: ${config.features.debugMode ? '有効' : '無効'}`);

  if (config.auth.cognito) {
    console.log(`Cognito: ${config.auth.cognito.endpoint}`);
  }

  console.log('============================');
}
