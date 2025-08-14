/**
 * 環境変数管理のテスト
 */

import { getConfig, validateConfig } from './environment';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getConfig', () => {
    it('デフォルト値が正しく設定される', () => {
      // 環境変数をクリア
      delete process.env.NODE_ENV;
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;
      delete process.env.AWS_REGION;
      delete process.env.FRONTEND_URL;

      const config = getConfig();

      expect(config.NODE_ENV).toBe('development');
      expect(config.DATABASE_URL).toBe(
        'postgresql://postgres:password@localhost:5432/goal_mandala'
      );
      expect(config.JWT_SECRET).toBe('development-secret');
      expect(config.AWS_REGION).toBe('ap-northeast-1');
      expect(config.FRONTEND_URL).toBe('http://localhost:5173');
    });

    it('環境変数が正しく読み込まれる', () => {
      process.env.NODE_ENV = 'staging';
      process.env.DATABASE_URL = 'postgresql://test:test@test:5432/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.AWS_REGION = 'us-east-1';
      process.env.FRONTEND_URL = 'https://example.com';

      const config = getConfig();

      expect(config.NODE_ENV).toBe('staging');
      expect(config.DATABASE_URL).toBe('postgresql://test:test@test:5432/test');
      expect(config.JWT_SECRET).toBe('test-secret');
      expect(config.AWS_REGION).toBe('us-east-1');
      expect(config.FRONTEND_URL).toBe('https://example.com');
    });

    it('本番環境で必須環境変数が未設定の場合エラーが発生する', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      expect(() => getConfig()).toThrow(
        'Required environment variable DATABASE_URL is not set in production'
      );
    });
  });

  describe('validateConfig', () => {
    it('正しい設定値で検証が通る', () => {
      const config = {
        NODE_ENV: 'development' as const,
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/goal_mandala',
        JWT_SECRET: 'a-very-long-secret-key-for-testing-purposes',
        AWS_REGION: 'ap-northeast-1',
        FRONTEND_URL: 'http://localhost:5173',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('不正なDATABASE_URLでエラーが発生する', () => {
      const config = {
        NODE_ENV: 'development' as const,
        DATABASE_URL: 'invalid-url',
        JWT_SECRET: 'test-secret',
        AWS_REGION: 'ap-northeast-1',
        FRONTEND_URL: 'http://localhost:5173',
      };

      expect(() => validateConfig(config)).toThrow(
        'DATABASE_URL must be a valid PostgreSQL connection string'
      );
    });

    it('不正なFRONTEND_URLでエラーが発生する', () => {
      const config = {
        NODE_ENV: 'development' as const,
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/goal_mandala',
        JWT_SECRET: 'test-secret',
        AWS_REGION: 'ap-northeast-1',
        FRONTEND_URL: 'invalid-url',
      };

      expect(() => validateConfig(config)).toThrow('FRONTEND_URL must be a valid URL');
    });
  });
});
