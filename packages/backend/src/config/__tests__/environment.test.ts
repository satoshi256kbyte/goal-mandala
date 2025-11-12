import { validateConfig, getConfig } from '../environment';

describe('Environment Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateConfig', () => {
    it('有効なPostgreSQLのDATABASE_URLを受け入れる', () => {
      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: false,
        COGNITO_USER_POOL_ID: 'ap-northeast-1_validpool',
        COGNITO_CLIENT_ID: 'validclientid123456789',
        NODE_ENV: 'development' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('テスト環境ではSQLiteのDATABASE_URLを受け入れる', () => {
      const config = {
        DATABASE_URL: 'file:./test.db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: true,
        COGNITO_USER_POOL_ID: 'test-pool',
        COGNITO_CLIENT_ID: 'test-client',
        NODE_ENV: 'test' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('無効なDATABASE_URLでエラーをスロー', () => {
      const config = {
        DATABASE_URL: 'invalid-url',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: true,
        COGNITO_USER_POOL_ID: 'test-pool',
        COGNITO_CLIENT_ID: 'test-client',
        NODE_ENV: 'development' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      expect(() => validateConfig(config)).toThrow(
        'DATABASE_URL must be a valid PostgreSQL connection string'
      );
    });

    it('短いJWT_SECRETで警告を出力', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'short',
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: true,
        COGNITO_USER_POOL_ID: 'test-pool',
        COGNITO_CLIENT_ID: 'test-client',
        NODE_ENV: 'development' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      validateConfig(config);
      expect(consoleSpy).toHaveBeenCalledWith(
        'JWT_SECRET should be at least 32 characters long for security'
      );

      consoleSpy.mockRestore();
    });

    it('無効なFRONTEND_URLでエラーをスロー', () => {
      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'invalid-url',
        ENABLE_MOCK_AUTH: true,
        COGNITO_USER_POOL_ID: 'test-pool',
        COGNITO_CLIENT_ID: 'test-client',
        NODE_ENV: 'development' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      expect(() => validateConfig(config)).toThrow('FRONTEND_URL must be a valid URL');
    });

    it('モック認証無効時にCognito設定が不正でエラーをスロー', () => {
      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: false,
        COGNITO_USER_POOL_ID: 'ap-northeast-1_xxxxxxxxx',
        COGNITO_CLIENT_ID: 'validclient',
        NODE_ENV: 'development' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      expect(() => validateConfig(config)).toThrow(
        'COGNITO_USER_POOL_ID must be set when mock auth is disabled'
      );
    });

    it('モック認証有効時に無効なメールでエラーをスロー', () => {
      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: true,
        COGNITO_USER_POOL_ID: 'test-pool',
        COGNITO_CLIENT_ID: 'test-client',
        NODE_ENV: 'development' as const,
        MOCK_USER_EMAIL: 'invalid-email',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      expect(() => validateConfig(config)).toThrow('MOCK_USER_EMAIL must be a valid email address');
    });

    it('本番環境でモック認証有効時に警告を出力', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: true,
        COGNITO_USER_POOL_ID: 'test-pool',
        COGNITO_CLIENT_ID: 'test-client',
        NODE_ENV: 'production' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 3600,
      };

      validateConfig(config);
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚠️  WARNING: Mock authentication is enabled in production environment. This is a security risk!'
      );

      consoleSpy.mockRestore();
    });

    it('JWT_CACHE_TTLが範囲外で警告を出力', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        ENABLE_MOCK_AUTH: true,
        COGNITO_USER_POOL_ID: 'test-pool',
        COGNITO_CLIENT_ID: 'test-client',
        NODE_ENV: 'development' as const,
        MOCK_USER_EMAIL: 'test@example.com',
        MOCK_USER_ID: 'testuser',
        JWT_CACHE_TTL: 100, // 範囲外
      };

      validateConfig(config);
      expect(consoleSpy).toHaveBeenCalledWith(
        'JWT_CACHE_TTL should be between 300 (5 minutes) and 86400 (24 hours) seconds'
      );

      consoleSpy.mockRestore();
    });
  });
});
