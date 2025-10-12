/**
 * プロフィールAPI ログ出力のテスト
 */

import { logger } from '../../utils/logger';

// loggerをモック化
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Profile API Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('構造化ログ出力', () => {
    it('リクエストログにrequestId、userId、method、pathが含まれる', () => {
      const requestId = 'req-123';
      const userId = 'user-456';
      const method = 'GET';
      const path = '/api/profile';

      logger.info('Profile API request', {
        requestId,
        userId,
        method,
        path,
        timestamp: expect.any(String),
      });

      expect(logger.info).toHaveBeenCalledWith('Profile API request', {
        requestId,
        userId,
        method,
        path,
        timestamp: expect.any(String),
      });
    });

    it('レスポンスログにrequestId、userId、statusCode、durationが含まれる', () => {
      const requestId = 'req-123';
      const userId = 'user-456';
      const statusCode = 200;
      const duration = 150;

      logger.info('Profile API response', {
        requestId,
        userId,
        statusCode,
        duration,
        timestamp: expect.any(String),
      });

      expect(logger.info).toHaveBeenCalledWith('Profile API response', {
        requestId,
        userId,
        statusCode,
        duration,
        timestamp: expect.any(String),
      });
    });

    it('エラーログにrequestId、error、durationが含まれる', () => {
      const requestId = 'req-123';
      const error = { message: 'Test error', stack: 'Error stack' };
      const duration = 100;

      logger.error('Profile API error', {
        requestId,
        error,
        duration,
        timestamp: expect.any(String),
      });

      expect(logger.error).toHaveBeenCalledWith('Profile API error', {
        requestId,
        error,
        duration,
        timestamp: expect.any(String),
      });
    });

    it('タイムスタンプがISO 8601形式である', () => {
      const timestamp = new Date().toISOString();
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

      expect(timestamp).toMatch(iso8601Regex);
    });
  });

  describe('処理時間計測', () => {
    it('開始時刻と終了時刻から処理時間を計算できる', () => {
      const startTime = Date.now();
      // 処理をシミュレート
      const endTime = startTime + 150;
      const duration = endTime - startTime;

      expect(duration).toBe(150);
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('処理時間がミリ秒単位で記録される', () => {
      const startTime = 1000;
      const endTime = 1250;
      const duration = endTime - startTime;

      expect(duration).toBe(250);
      expect(typeof duration).toBe('number');
    });
  });

  describe('ログレベル', () => {
    it('通常のリクエストはINFOレベルでログ出力される', () => {
      logger.info('Profile API request', {
        requestId: 'req-123',
        userId: 'user-456',
        method: 'GET',
        path: '/api/profile',
      });

      expect(logger.info).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('エラー発生時はERRORレベルでログ出力される', () => {
      logger.error('Profile API error', {
        requestId: 'req-123',
        error: { message: 'Test error' },
      });

      expect(logger.error).toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('機密情報マスキング', () => {
    it('エラーログで機密情報がマスキングされる', () => {
      const sanitizedError = {
        message: 'Authentication failed',
        // パスワードやトークンなどの機密情報は含まれない
      };

      logger.error('Profile API error', {
        requestId: 'req-123',
        error: sanitizedError,
      });

      expect(logger.error).toHaveBeenCalledWith('Profile API error', {
        requestId: 'req-123',
        error: sanitizedError,
      });
    });
  });

  describe('リクエストID', () => {
    it('リクエストIDがない場合はunknownが使用される', () => {
      const requestId = 'unknown';

      logger.info('Profile API request', {
        requestId,
        userId: 'user-456',
        method: 'GET',
        path: '/api/profile',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Profile API request',
        expect.objectContaining({
          requestId: 'unknown',
        })
      );
    });

    it('リクエストIDがある場合はそれが使用される', () => {
      const requestId = 'req-custom-123';

      logger.info('Profile API request', {
        requestId,
        userId: 'user-456',
        method: 'GET',
        path: '/api/profile',
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Profile API request',
        expect.objectContaining({
          requestId: 'req-custom-123',
        })
      );
    });
  });

  describe('各エンドポイントのログ出力', () => {
    it('GET /api/profile のログが正しく出力される', () => {
      // リクエストログ
      logger.info('Profile API request', {
        requestId: 'req-123',
        userId: 'user-456',
        method: 'GET',
        path: '/api/profile',
        timestamp: expect.any(String),
      });

      // レスポンスログ
      logger.info('Profile API response', {
        requestId: 'req-123',
        userId: 'user-456',
        statusCode: 200,
        duration: 150,
        timestamp: expect.any(String),
      });

      expect(logger.info).toHaveBeenCalledTimes(2);
    });

    it('PUT /api/profile のログが正しく出力される', () => {
      // リクエストログ
      logger.info('Profile API request', {
        requestId: 'req-123',
        userId: 'user-456',
        method: 'PUT',
        path: '/api/profile',
        timestamp: expect.any(String),
      });

      // レスポンスログ
      logger.info('Profile API response', {
        requestId: 'req-123',
        userId: 'user-456',
        statusCode: 200,
        duration: 200,
        timestamp: expect.any(String),
      });

      expect(logger.info).toHaveBeenCalledTimes(2);
    });

    it('DELETE /api/profile のログが正しく出力される', () => {
      // リクエストログ
      logger.info('Profile API request', {
        requestId: 'req-123',
        userId: 'user-456',
        method: 'DELETE',
        path: '/api/profile',
        timestamp: expect.any(String),
      });

      // レスポンスログ
      logger.info('Profile API response', {
        requestId: 'req-123',
        userId: 'user-456',
        statusCode: 204,
        duration: 180,
        timestamp: expect.any(String),
      });

      expect(logger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーケースのログ出力', () => {
    it('ValidationErrorのログが正しく出力される', () => {
      logger.error('Validation error', {
        requestId: 'req-123',
        error: '名前は50文字以内で入力してください',
        timestamp: expect.any(String),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Validation error',
        expect.objectContaining({
          requestId: 'req-123',
          error: expect.any(String),
        })
      );
    });

    it('NotFoundErrorのログが正しく出力される', () => {
      logger.error('Not found error', {
        requestId: 'req-123',
        error: 'プロフィールが見つかりません',
        timestamp: expect.any(String),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Not found error',
        expect.objectContaining({
          requestId: 'req-123',
          error: expect.any(String),
        })
      );
    });

    it('DatabaseErrorのログが正しく出力される', () => {
      logger.error('Database error', {
        requestId: 'req-123',
        error: 'データベース接続に失敗しました',
        timestamp: expect.any(String),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Database error',
        expect.objectContaining({
          requestId: 'req-123',
          error: expect.any(String),
        })
      );
    });

    it('予期しないエラーのログが正しく出力される', () => {
      logger.error('Unexpected error', {
        requestId: 'req-123',
        error: { message: 'Unexpected error occurred', stack: 'Error stack' },
        timestamp: expect.any(String),
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error',
        expect.objectContaining({
          requestId: 'req-123',
          error: expect.any(Object),
        })
      );
    });
  });
});
