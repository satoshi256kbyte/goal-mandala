/**
 * 統合テスト - 環境設定、ログ、認証の連携テスト
 */

import { app } from './index';
import jwt from 'jsonwebtoken';
import { config } from './config/environment';

describe('Integration Tests', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Environment and Logging Integration', () => {
    it('ヘルスチェックエンドポイントが環境変数を使用して正しく動作する', async () => {
      const res = await app.request('/health');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.environment).toBe(config.NODE_ENV);
      expect(data.timestamp).toBeDefined();

      // リクエストログが出力されることを確認
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"API Request"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"method":"GET"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"path":"/health"'));
    });

    it('API v1エンドポイントが正しく動作する', async () => {
      const res = await app.request('/api/v1');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe('Goal Mandala API v1');
      expect(data.timestamp).toBeDefined();
    });

    it('404エラーが正しく処理される', async () => {
      const res = await app.request('/nonexistent');
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Not Found');
      expect(data.message).toBe('The requested resource was not found');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('CORSヘッダーが正しく設定される', async () => {
      const res = await app.request('/health', {
        method: 'OPTIONS',
        headers: {
          Origin: config.FRONTEND_URL,
          'Access-Control-Request-Method': 'GET',
        },
      });

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(config.FRONTEND_URL);
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    });
  });

  describe('Error Handling', () => {
    it('エラーログが構造化されて出力される', () => {
      // ログ出力の構造をテスト
      const { logger } = require('./utils/logger');

      logger.error('Test error message', { userId: '123', action: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"error"'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test error message"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"userId":"123"'));
    });
  });
});
