/**
 * ログユーティリティのテスト
 */

import { logger, logError, logRequest, createTimer } from './logger';

describe('Logger Utilities', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('logger', () => {
    it('info ログが正しく出力される', () => {
      logger.info('Test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"info"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"Test message"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"context":{"key":"value"}'));
    });

    it('error ログが正しく出力される', () => {
      logger.error('Error message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"error"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"Error message"'));
    });

    it('warn ログが正しく出力される', () => {
      logger.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"warn"'));
    });

    it('debug ログが正しく出力される', () => {
      logger.debug('Debug message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"debug"'));
    });
  });

  describe('logError', () => {
    it('エラーオブジェクトが正しくログ出力される', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      logError(error, { userId: '123' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"error"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"Test error"'));
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"stack":"Error stack trace"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"userId":"123"'));
    });
  });

  describe('logRequest', () => {
    it('APIリクエストログが正しく出力される', () => {
      logRequest('GET', '/api/test', 200, 150);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"API Request"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"method":"GET"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"path":"/api/test"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"statusCode":200'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"duration":"150ms"'));
    });

    it('duration なしでもログが出力される', () => {
      logRequest('POST', '/api/create', 201);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('"method":"POST"'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.not.stringContaining('"duration"'));
    });
  });

  describe('createTimer', () => {
    it('タイマーが正しく動作する', async () => {
      const timer = createTimer();

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = timer.end();

      expect(duration).toBeGreaterThanOrEqual(10);
      expect(typeof duration).toBe('number');
    });
  });
});
