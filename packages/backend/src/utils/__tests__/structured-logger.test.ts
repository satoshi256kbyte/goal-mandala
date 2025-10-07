/**
 * 構造化ロガーのテスト
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StructuredLogger, LogLevel } from '../structured-logger.js';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    logger = new StructuredLogger('test-service');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('ログ出力', () => {
    it('INFOレベルのログを出力できる', () => {
      logger.info('テストメッセージ', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(logOutput).toMatchObject({
        level: 'INFO',
        service: 'test-service',
        message: 'テストメッセージ',
        key: 'value',
      });
      expect(logOutput.timestamp).toBeDefined();
    });

    it('WARNレベルのログを出力できる', () => {
      logger.warn('警告メッセージ', { warning: 'test' });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleWarnSpy.mock.calls[0][0] as string);

      expect(logOutput).toMatchObject({
        level: 'WARN',
        service: 'test-service',
        message: '警告メッセージ',
        warning: 'test',
      });
    });

    it('ERRORレベルのログを出力できる', () => {
      const error = new Error('テストエラー');
      logger.error('エラーメッセージ', { error });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);

      expect(logOutput).toMatchObject({
        level: 'ERROR',
        service: 'test-service',
        message: 'エラーメッセージ',
      });
      expect(logOutput.error).toMatchObject({
        message: 'テストエラー',
        name: 'Error',
      });
    });

    it('DEBUGレベルのログを出力できる', () => {
      logger.debug('デバッグメッセージ', { debug: 'info' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(logOutput).toMatchObject({
        level: 'DEBUG',
        service: 'test-service',
        message: 'デバッグメッセージ',
        debug: 'info',
      });
    });
  });

  describe('機密情報のマスキング', () => {
    it('パスワードをマスキングする', () => {
      logger.info('ログイン', { password: 'secret123' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logOutput.password).toBe('***MASKED***');
    });

    it('トークンをマスキングする', () => {
      logger.info('認証', { token: 'abc123xyz', accessToken: 'def456' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logOutput.token).toBe('***MASKED***');
      expect(logOutput.accessToken).toBe('***MASKED***');
    });

    it('APIキーをマスキングする', () => {
      logger.info('API呼び出し', { apiKey: 'key123', api_key: 'key456' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logOutput.apiKey).toBe('***MASKED***');
      expect(logOutput.api_key).toBe('***MASKED***');
    });
  });

  describe('エラーオブジェクトの処理', () => {
    it('Errorオブジェクトを適切にシリアライズする', () => {
      const error = new Error('テストエラー');
      error.stack = 'Error: テストエラー\n  at test.ts:1:1';

      logger.error('エラー発生', { error });

      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(logOutput.error).toMatchObject({
        message: 'テストエラー',
        name: 'Error',
        stack: 'Error: テストエラー\n  at test.ts:1:1',
      });
    });

    it('カスタムエラープロパティも含める', () => {
      const error = new Error('カスタムエラー') as Error & { code: string };
      error.code = 'CUSTOM_ERROR';

      logger.error('カスタムエラー発生', { error });

      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
      expect(logOutput.error.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('コンテキスト情報', () => {
    it('リクエストIDを含める', () => {
      logger.info('リクエスト処理', { requestId: 'req-123' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logOutput.requestId).toBe('req-123');
    });

    it('ユーザーIDを含める', () => {
      logger.info('ユーザー操作', { userId: 'user-456' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logOutput.userId).toBe('user-456');
    });
  });

  describe('パフォーマンス測定', () => {
    it('処理時間を記録できる', () => {
      logger.info('処理完了', { duration: 123, durationMs: 123 });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(logOutput.duration).toBe(123);
      expect(logOutput.durationMs).toBe(123);
    });
  });
});
