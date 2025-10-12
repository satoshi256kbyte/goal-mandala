/**
 * ログ出力統合テスト
 * サブ目標生成APIのログ出力機能を検証
 */

import { logger, logError, logRequest, createTimer } from '../../utils/logger';

describe('ログ出力統合テスト', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('構造化ログ出力', () => {
    it('infoレベルのログが正しく出力される', () => {
      logger.info('サブ目標生成開始', {
        requestId: 'req-123',
        userId: 'user-456',
        goalTitle: 'TypeScriptのエキスパートになる',
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('info');
      expect(loggedData.message).toBe('サブ目標生成開始');
      expect(loggedData.timestamp).toBeDefined();
      expect(loggedData.context.requestId).toBe('req-123');
      expect(loggedData.context.userId).toBe('user-456');
      expect(loggedData.context.goalTitle).toBe('TypeScriptのエキスパートになる');
    });

    it('warnレベルのログが正しく出力される', () => {
      logger.warn('サブ目標の重複を検出', {
        requestId: 'req-123',
        duplicateCount: 2,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('warn');
      expect(loggedData.message).toBe('サブ目標の重複を検出');
      expect(loggedData.context.duplicateCount).toBe(2);
    });

    it('errorレベルのログが正しく出力される', () => {
      logger.error('サブ目標生成失敗', {
        requestId: 'req-123',
        errorCode: 'BEDROCK_ERROR',
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('error');
      expect(loggedData.message).toBe('サブ目標生成失敗');
      expect(loggedData.context.errorCode).toBe('BEDROCK_ERROR');
    });

    it('debugレベルのログが正しく出力される', () => {
      logger.debug('プロンプト生成完了', {
        promptLength: 1500,
        modelId: 'amazon.nova-micro-v1:0',
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('debug');
      expect(loggedData.message).toBe('プロンプト生成完了');
      expect(loggedData.context.promptLength).toBe(1500);
    });
  });

  describe('エラーログ出力', () => {
    it('エラーオブジェクトが正しくログ出力される', () => {
      const error = new Error('Bedrock API呼び出しエラー');
      error.name = 'BedrockError';

      logError(error, {
        requestId: 'req-123',
        userId: 'user-456',
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('error');
      expect(loggedData.message).toBe('Bedrock API呼び出しエラー');
      expect(loggedData.context.name).toBe('BedrockError');
      expect(loggedData.context.stack).toBeDefined();
      expect(loggedData.context.requestId).toBe('req-123');
      expect(loggedData.context.userId).toBe('user-456');
    });

    it('スタックトレースが含まれる', () => {
      const error = new Error('テストエラー');
      logError(error);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.context.stack).toBeDefined();
      expect(typeof loggedData.context.stack).toBe('string');
    });
  });

  describe('APIリクエストログ出力', () => {
    it('APIリクエストログが正しく出力される', () => {
      logRequest('POST', '/api/ai/generate/subgoals', 200, 1500);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('info');
      expect(loggedData.message).toBe('API Request');
      expect(loggedData.context.method).toBe('POST');
      expect(loggedData.context.path).toBe('/api/ai/generate/subgoals');
      expect(loggedData.context.statusCode).toBe(200);
      expect(loggedData.context.duration).toBe('1500ms');
    });

    it('処理時間なしでもログ出力される', () => {
      logRequest('GET', '/api/goals', 200);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.context.method).toBe('GET');
      expect(loggedData.context.path).toBe('/api/goals');
      expect(loggedData.context.statusCode).toBe(200);
      expect(loggedData.context.duration).toBeUndefined();
    });
  });

  describe('タイマー機能', () => {
    it('処理時間が正しく計測される', async () => {
      const timer = createTimer();

      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));

      const duration = timer.end();

      expect(duration).toBeGreaterThanOrEqual(90); // 少し余裕を持たせる
      expect(duration).toBeLessThan(200); // 余裕を持たせる
    });

    it('複数のタイマーが独立して動作する', async () => {
      const timer1 = createTimer();
      await new Promise(resolve => setTimeout(resolve, 50));

      const timer2 = createTimer();
      await new Promise(resolve => setTimeout(resolve, 50));

      const duration1 = timer1.end();
      const duration2 = timer2.end();

      expect(duration1).toBeGreaterThanOrEqual(100);
      expect(duration2).toBeGreaterThanOrEqual(50);
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('ログ出力フォーマット', () => {
    it('タイムスタンプがISO 8601形式である', () => {
      logger.info('テストメッセージ');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      // ISO 8601形式の正規表現
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(loggedData.timestamp).toMatch(iso8601Regex);
    });

    it('JSON形式で出力される', () => {
      logger.info('テストメッセージ', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0] as string;

      // JSON形式であることを確認
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('コンテキストがない場合でも正しく出力される', () => {
      logger.info('シンプルなメッセージ');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('info');
      expect(loggedData.message).toBe('シンプルなメッセージ');
      expect(loggedData.timestamp).toBeDefined();
      expect(loggedData.context).toBeUndefined();
    });
  });

  describe('実際のユースケース', () => {
    it('サブ目標生成の開始から終了までのログが正しく出力される', () => {
      const requestId = 'req-123';
      const userId = 'user-456';

      // 開始ログ
      logger.info('サブ目標生成開始', {
        requestId,
        userId,
        goalTitle: 'TypeScriptのエキスパートになる',
      });

      // 処理中ログ
      logger.debug('Bedrock API呼び出し', {
        requestId,
        modelId: 'amazon.nova-micro-v1:0',
      });

      // 完了ログ
      logger.info('サブ目標生成完了', {
        requestId,
        userId,
        subGoalCount: 8,
        duration: 1500,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);

      const logs = consoleLogSpy.mock.calls.map(call => JSON.parse(call[0] as string));

      expect(logs[0].message).toBe('サブ目標生成開始');
      expect(logs[1].message).toBe('Bedrock API呼び出し');
      expect(logs[2].message).toBe('サブ目標生成完了');

      // すべてのログにrequestIdが含まれる
      expect(logs[0].context.requestId).toBe(requestId);
      expect(logs[1].context.requestId).toBe(requestId);
      expect(logs[2].context.requestId).toBe(requestId);
    });

    it('エラー発生時のログが正しく出力される', () => {
      const requestId = 'req-123';
      const userId = 'user-456';

      // 開始ログ
      logger.info('サブ目標生成開始', { requestId, userId });

      // エラーログ
      const error = new Error('品質基準を満たしませんでした');
      logError(error, {
        requestId,
        userId,
        errorType: 'QualityError',
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);

      const logs = consoleLogSpy.mock.calls.map(call => JSON.parse(call[0] as string));

      expect(logs[0].level).toBe('info');
      expect(logs[1].level).toBe('error');
      expect(logs[1].message).toBe('品質基準を満たしませんでした');
      expect(logs[1].context.errorType).toBe('QualityError');
    });

    it('警告ログが正しく出力される', () => {
      const requestId = 'req-123';

      logger.warn('サブ目標のタイトルに重複があります', {
        requestId,
        duplicateTitles: ['基礎文法の習得', '基礎文法の習得'],
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.level).toBe('warn');
      expect(loggedData.message).toBe('サブ目標のタイトルに重複があります');
      expect(loggedData.context.duplicateTitles).toHaveLength(2);
    });
  });

  describe('パフォーマンス測定', () => {
    it('処理時間がログに記録される', () => {
      const timer = createTimer();
      const requestId = 'req-123';

      // 処理をシミュレート
      const duration = timer.end();

      logger.info('処理完了', {
        requestId,
        duration: `${duration}ms`,
      });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);

      expect(loggedData.context.duration).toMatch(/^\d+ms$/);
    });
  });
});
