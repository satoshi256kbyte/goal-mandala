/**
 * ログ出力機能のテスト
 */

import { logger, createTimer } from '../utils/logger';

// console.logをモック化
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  console.log = jest.fn((message: string) => {
    consoleOutput.push(message);
  });
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('構造化ログ出力', () => {
  describe('logger.info', () => {
    it('基本的な情報ログを出力できる', () => {
      logger.info('テストメッセージ', {
        userId: 'user-123',
        actionId: 'action-456',
      });

      expect(consoleOutput).toHaveLength(1);
      const logEntry = JSON.parse(consoleOutput[0]);

      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('テストメッセージ');
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.context.userId).toBe('user-123');
      expect(logEntry.context.actionId).toBe('action-456');
    });

    it('requestIdを含むログを出力できる', () => {
      logger.info('リクエスト開始', {
        requestId: 'req-789',
        userId: 'user-123',
        actionId: 'action-456',
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.context.requestId).toBe('req-789');
    });

    it('処理時間を含むログを出力できる', () => {
      logger.info('処理完了', {
        userId: 'user-123',
        actionId: 'action-456',
        duration: '1234ms',
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.context.duration).toBe('1234ms');
    });

    it('コンテキストなしでもログを出力できる', () => {
      logger.info('シンプルなメッセージ');

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('シンプルなメッセージ');
      expect(logEntry.context).toBeUndefined();
    });
  });

  describe('logger.error', () => {
    it('エラーログを出力できる', () => {
      logger.error('エラーが発生しました', {
        userId: 'user-123',
        actionId: 'action-456',
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力データが不正です',
        },
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.level).toBe('error');
      expect(logEntry.message).toBe('エラーが発生しました');
      expect(logEntry.context.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('logger.warn', () => {
    it('警告ログを出力できる', () => {
      logger.warn('警告メッセージ', {
        userId: 'user-123',
        reason: 'タスク数が少ない',
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.level).toBe('warn');
      expect(logEntry.message).toBe('警告メッセージ');
    });
  });

  describe('logger.debug', () => {
    it('デバッグログを出力できる', () => {
      logger.debug('デバッグ情報', {
        data: { key: 'value' },
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.level).toBe('debug');
      expect(logEntry.message).toBe('デバッグ情報');
    });
  });
});

describe('処理時間計測', () => {
  describe('createTimer', () => {
    it('処理時間を計測できる', async () => {
      const timer = createTimer();

      // 10ms待機
      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = timer.end();

      // 10ms以上経過していることを確認
      expect(duration).toBeGreaterThanOrEqual(10);
      // 100ms以内に完了していることを確認（余裕を持たせる）
      expect(duration).toBeLessThan(100);
    });

    it('複数回end()を呼び出しても正しく動作する', () => {
      const timer = createTimer();

      const duration1 = timer.end();
      const duration2 = timer.end();

      // 2回目の方が時間が経過している
      expect(duration2).toBeGreaterThanOrEqual(duration1);
    });

    it('ログ出力と組み合わせて使用できる', () => {
      const timer = createTimer();
      const duration = timer.end();

      logger.info('処理完了', {
        userId: 'user-123',
        duration: `${duration}ms`,
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.context.duration).toMatch(/^\d+ms$/);
    });
  });
});

describe('タスク生成フローのログ出力', () => {
  it('タスク生成の各ステップでログが出力される', () => {
    const requestId = 'req-test-123';
    const userId = 'user-123';
    const actionId = 'action-456';

    // 1. リクエスト開始
    logger.info('タスク生成リクエスト開始', {
      requestId,
      userId,
      action: 'task_generation_start',
    });

    // 2. リクエスト検証成功
    logger.info('リクエスト検証成功', {
      requestId,
      userId,
      actionId,
      regenerate: false,
    });

    // 3. 認可チェック成功
    logger.info('認可チェック成功', {
      requestId,
      userId,
      actionId,
      action: 'authorization_check_success',
    });

    // 4. コンテキスト取得完了
    logger.info('コンテキスト取得完了', {
      userId,
      actionId,
      duration: '50ms',
      action: 'context_retrieved',
    });

    // 5. AI生成完了
    logger.info('AI生成完了', {
      userId,
      actionId,
      taskCount: 3,
      duration: '2500ms',
      action: 'ai_generation_completed',
    });

    // 6. 品質検証完了
    logger.info('品質検証完了', {
      userId,
      actionId,
      action: 'quality_validation_completed',
    });

    // 7. タスク種別継承完了
    logger.info('タスク種別継承完了', {
      userId,
      actionId,
      taskType: 'EXECUTION',
      action: 'task_type_inherited',
    });

    // 8. タスク保存完了
    logger.info('タスク保存完了', {
      userId,
      actionId,
      savedCount: 3,
      action: 'tasks_saved',
    });

    // 9. タスク生成成功
    logger.info('タスク生成成功', {
      requestId,
      userId,
      actionId,
      action: 'task_generation_success',
      duration: '3000ms',
      metadata: {
        taskCount: 3,
        tokensUsed: 2500,
        estimatedCost: 0.00038,
      },
    });

    // 9つのログが出力されていることを確認
    expect(consoleOutput).toHaveLength(9);

    // 各ログエントリを検証
    const logs = consoleOutput.map(log => JSON.parse(log));

    // 1. リクエスト開始
    expect(logs[0].message).toBe('タスク生成リクエスト開始');
    expect(logs[0].context.requestId).toBe(requestId);
    expect(logs[0].context.action).toBe('task_generation_start');

    // 5. AI生成完了
    expect(logs[4].message).toBe('AI生成完了');
    expect(logs[4].context.taskCount).toBe(3);
    expect(logs[4].context.duration).toBe('2500ms');

    // 9. タスク生成成功
    expect(logs[8].message).toBe('タスク生成成功');
    expect(logs[8].context.metadata.taskCount).toBe(3);
    // tokensUsedは機密情報としてマスキングされる可能性があるため、存在確認のみ
    expect(logs[8].context.metadata.tokensUsed).toBeDefined();
  });

  it('エラー発生時のログが出力される', () => {
    const requestId = 'req-test-456';
    const userId = 'user-123';

    logger.error('タスク生成エラー', {
      requestId,
      action: 'task_generation_error',
      duration: '1500ms',
      error: {
        code: 'VALIDATION_ERROR',
        message: '入力データが不正です',
        name: 'TaskValidationError',
      },
    });

    const logEntry = JSON.parse(consoleOutput[0]);
    expect(logEntry.level).toBe('error');
    expect(logEntry.message).toBe('タスク生成エラー');
    expect(logEntry.context.error.code).toBe('VALIDATION_ERROR');
    expect(logEntry.context.duration).toBe('1500ms');
  });
});

describe('ログ出力のフォーマット', () => {
  it('タイムスタンプがISO 8601形式である', () => {
    logger.info('テストメッセージ');

    const logEntry = JSON.parse(consoleOutput[0]);
    const timestamp = logEntry.timestamp;

    // ISO 8601形式の正規表現
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(timestamp).toMatch(iso8601Regex);

    // 有効な日付であることを確認
    const date = new Date(timestamp);
    expect(date.toString()).not.toBe('Invalid Date');
  });

  it('JSON形式で出力される', () => {
    logger.info('テストメッセージ', {
      userId: 'user-123',
      actionId: 'action-456',
    });

    // JSON.parseでパースできることを確認
    expect(() => JSON.parse(consoleOutput[0])).not.toThrow();

    const logEntry = JSON.parse(consoleOutput[0]);
    expect(typeof logEntry).toBe('object');
    expect(logEntry.level).toBeDefined();
    expect(logEntry.message).toBeDefined();
    expect(logEntry.timestamp).toBeDefined();
  });

  it('必須フィールドが含まれている', () => {
    logger.info('テストメッセージ', {
      userId: 'user-123',
    });

    const logEntry = JSON.parse(consoleOutput[0]);

    // 必須フィールド
    expect(logEntry).toHaveProperty('level');
    expect(logEntry).toHaveProperty('message');
    expect(logEntry).toHaveProperty('timestamp');

    // オプションフィールド
    expect(logEntry).toHaveProperty('context');
    expect(logEntry.context).toHaveProperty('userId');
  });
});
