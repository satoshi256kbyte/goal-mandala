/**
 * 環境変数検証モジュール
 *
 * アプリケーション起動時に必要な環境変数が設定されているかチェックし、
 * 型安全な環境変数アクセスを提供します。
 */

import { z } from 'zod';

/**
 * 環境変数スキーマ定義
 */
const envSchema = z.object({
  // データベース設定
  DATABASE_URL: z.string().url('DATABASE_URLは有効なURL形式である必要があります'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORDは必須です'),
  TEST_DATABASE_URL: z
    .string()
    .url('TEST_DATABASE_URLは有効なURL形式である必要があります')
    .optional(),

  // Cognito設定
  COGNITO_LOCAL_ENDPOINT: z
    .string()
    .url('COGNITO_LOCAL_ENDPOINTは有効なURL形式である必要があります')
    .optional(),
  COGNITO_USER_POOL_ID: z.string().min(1, 'COGNITO_USER_POOL_IDは必須です').optional(),
  COGNITO_CLIENT_ID: z.string().min(1, 'COGNITO_CLIENT_IDは必須です').optional(),
  COGNITO_REGION: z.string().min(1, 'COGNITO_REGIONは必須です').optional(),

  // アプリケーション設定
  NODE_ENV: z.enum(['development', 'test', 'production'], {
    errorMap: () => ({
      message: 'NODE_ENVはdevelopment, test, productionのいずれかである必要があります',
    }),
  }),
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORTは数値である必要があります')
    .transform(Number)
    .refine(port => port >= 1 && port <= 65535, 'PORTは1-65535の範囲である必要があります'),
  FRONTEND_URL: z.string().url('FRONTEND_URLは有効なURL形式である必要があります'),
  API_BASE_URL: z.string().url('API_BASE_URLは有効なURL形式である必要があります').optional(),

  // AWS設定
  AWS_REGION: z.string().min(1, 'AWS_REGIONは必須です'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_IDは必須です').optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEYは必須です').optional(),

  // セキュリティ設定
  JWT_SECRET: z.string().min(32, 'JWT_SECRETは32文字以上である必要があります'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRETは16文字以上である必要があります').optional(),

  // メール設定（将来の実装用）
  SES_REGION: z.string().optional(),
  SES_FROM_EMAIL: z
    .string()
    .email('SES_FROM_EMAILは有効なメールアドレス形式である必要があります')
    .optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // ログ設定
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'], {
      errorMap: () => ({
        message: 'LOG_LEVELはerror, warn, info, debugのいずれかである必要があります',
      }),
    })
    .default('info'),
  LOG_OUTPUT: z
    .enum(['console', 'file'], {
      errorMap: () => ({ message: 'LOG_OUTPUTはconsole, fileのいずれかである必要があります' }),
    })
    .default('console'),

  // Docker Compose設定
  POSTGRES_CONTAINER_NAME: z.string().default('goal-mandala-postgres'),
  COGNITO_CONTAINER_NAME: z.string().default('goal-mandala-cognito'),
  DOCKER_NETWORK_NAME: z.string().default('goal-mandala-network'),

  // 開発ツール設定
  PRISMA_DATABASE_URL: z
    .string()
    .url('PRISMA_DATABASE_URLは有効なURL形式である必要があります')
    .optional(),
  PRISMA_TEST_DATABASE_URL: z
    .string()
    .url('PRISMA_TEST_DATABASE_URLは有効なURL形式である必要があります')
    .optional(),

  // パフォーマンス設定
  DB_CONNECTION_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('10'),
  DB_CONNECTION_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  API_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),

  // 機能フラグ
  ENABLE_AI_FEATURES: z
    .string()
    .transform(val => val.toLowerCase() === 'true')
    .default('true'),
  ENABLE_EMAIL_FEATURES: z
    .string()
    .transform(val => val.toLowerCase() === 'true')
    .default('false'),
  DEBUG_MODE: z
    .string()
    .transform(val => val.toLowerCase() === 'true')
    .default('false'),
});

/**
 * 検証済み環境変数の型
 */
export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * 環境変数検証エラー
 */
export class EnvValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: z.ZodError['errors']
  ) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * 環境変数を検証し、型安全なオブジェクトを返す
 *
 * @param env - 検証する環境変数オブジェクト（デフォルトはprocess.env）
 * @returns 検証済み環境変数オブジェクト
 * @throws {EnvValidationError} 検証に失敗した場合
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): ValidatedEnv {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage =
        '環境変数の検証に失敗しました:\n' +
        error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');

      throw new EnvValidationError(errorMessage, error.errors);
    }
    throw error;
  }
}

/**
 * 環境変数の検証を行い、結果を返す
 *
 * @param env - 検証する環境変数オブジェクト（デフォルトはprocess.env）
 * @returns 検証結果
 */
export function checkEnv(env: Record<string, string | undefined> = process.env): {
  success: boolean;
  data?: ValidatedEnv;
  errors?: z.ZodError['errors'];
} {
  try {
    const data = validateEnv(env);
    return { success: true, data };
  } catch (error) {
    if (error instanceof EnvValidationError) {
      return { success: false, errors: error.errors };
    }
    throw error;
  }
}

/**
 * 開発環境用の環境変数チェック
 * 開発環境でのみ必要な環境変数をチェックします
 */
export function validateDevelopmentEnv(
  env: Record<string, string | undefined> = process.env
): ValidatedEnv {
  const developmentSchema = envSchema.extend({
    COGNITO_LOCAL_ENDPOINT: z.string().url('開発環境ではCOGNITO_LOCAL_ENDPOINTが必須です'),
    COGNITO_USER_POOL_ID: z.string().min(1, '開発環境ではCOGNITO_USER_POOL_IDが必須です'),
    COGNITO_CLIENT_ID: z.string().min(1, '開発環境ではCOGNITO_CLIENT_IDが必須です'),
    COGNITO_REGION: z.string().min(1, '開発環境ではCOGNITO_REGIONが必須です'),
  });

  try {
    return developmentSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage =
        '開発環境の環境変数検証に失敗しました:\n' +
        error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');

      throw new EnvValidationError(errorMessage, error.errors);
    }
    throw error;
  }
}

/**
 * 本番環境用の環境変数チェック
 * 本番環境でのみ必要な環境変数をチェックします
 */
export function validateProductionEnv(
  env: Record<string, string | undefined> = process.env
): ValidatedEnv {
  const productionSchema = envSchema.extend({
    JWT_SECRET: z
      .string()
      .min(64, '本番環境ではJWT_SECRETは64文字以上である必要があります')
      .refine(
        secret => !secret.includes('your_jwt_secret_key_here'),
        '本番環境ではJWT_SECRETをデフォルト値から変更してください'
      ),
    POSTGRES_PASSWORD: z
      .string()
      .min(12, '本番環境ではPOSTGRES_PASSWORDは12文字以上である必要があります')
      .refine(
        password => !password.includes('your_secure_password_here'),
        '本番環境ではPOSTGRES_PASSWORDをデフォルト値から変更してください'
      ),
    SESSION_SECRET: z
      .string()
      .min(32, '本番環境ではSESSION_SECRETは32文字以上である必要があります'),
  });

  try {
    return productionSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage =
        '本番環境の環境変数検証に失敗しました:\n' +
        error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`).join('\n');

      throw new EnvValidationError(errorMessage, error.errors);
    }
    throw error;
  }
}

/**
 * 環境変数の設定状況を表示する
 */
export function displayEnvStatus(env: Record<string, string | undefined> = process.env): void {
  console.log('=== 環境変数設定状況 ===');

  const result = checkEnv(env);

  if (result.success && result.data) {
    console.log('✅ 環境変数の検証に成功しました');
    console.log('\n📋 設定値サマリー:');
    console.log(`NODE_ENV: ${result.data.NODE_ENV}`);
    console.log(`PORT: ${result.data.PORT}`);
    console.log(`FRONTEND_URL: ${result.data.FRONTEND_URL}`);
    console.log(`AWS_REGION: ${result.data.AWS_REGION}`);
    console.log(`LOG_LEVEL: ${result.data.LOG_LEVEL}`);
    console.log(`DEBUG_MODE: ${result.data.DEBUG_MODE}`);
    console.log(`ENABLE_AI_FEATURES: ${result.data.ENABLE_AI_FEATURES}`);
    console.log(`ENABLE_EMAIL_FEATURES: ${result.data.ENABLE_EMAIL_FEATURES}`);
  } else if (result.errors) {
    console.log('❌ 環境変数の検証に失敗しました');
    console.log('\n🔍 エラー詳細:');
    result.errors.forEach(error => {
      console.log(`  - ${error.path.join('.')}: ${error.message}`);
    });
    console.log('\n💡 .env.exampleファイルを参考に.envファイルを作成してください');
  }

  console.log('========================');
}
