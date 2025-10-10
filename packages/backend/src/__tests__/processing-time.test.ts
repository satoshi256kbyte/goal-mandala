/**
 * 処理時間計測機能のテスト
 */

import { createTimer, logger } from '../utils/logger';

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

describe('処理時間計測機能', () => {
  describe('createTimer', () => {
    it('開始時刻と終了時刻を記録できる', async () => {
      const timer = createTimer();
      const startTime = Date.now();

      // 20ms待機
      await new Promise(resolve => setTimeout(resolve, 20));

      const duration = timer.end();
      const endTime = Date.now();

      // 処理時間が20ms以上であることを確認
      expect(duration).toBeGreaterThanOrEqual(20);

      // 処理時間が実際の経過時間と近いことを確認（±10msの誤差を許容）
      const actualDuration = endTime - startTime;
      expect(Math.abs(duration - actualDuration)).toBeLessThan(10);
    });

    it('処理時間を計算してログ出力できる', () => {
      const timer = createTimer();
      const duration = timer.end();

      logger.info('処理完了', {
        userId: 'user-123',
        actionId: 'action-456',
        duration: `${duration}ms`,
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.context.duration).toMatch(/^\d+ms$/);

      // durationから数値を抽出
      const durationValue = parseInt(logEntry.context.duration.replace('ms', ''), 10);
      expect(durationValue).toBeGreaterThanOrEqual(0);
    });

    it('複数の処理時間を個別に計測できる', async () => {
      const timer1 = createTimer();
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration1 = timer1.end();

      const timer2 = createTimer();
      await new Promise(resolve => setTimeout(resolve, 20));
      const duration2 = timer2.end();

      // timer2の方が長い処理時間
      expect(duration2).toBeGreaterThan(duration1);

      // timer1は10ms以上
      expect(duration1).toBeGreaterThanOrEqual(10);

      // timer2は20ms以上
      expect(duration2).toBeGreaterThanOrEqual(20);
    });

    it('ネストした処理時間を計測できる', async () => {
      const totalTimer = createTimer();

      const step1Timer = createTimer();
      await new Promise(resolve => setTimeout(resolve, 10));
      const step1Duration = step1Timer.end();

      const step2Timer = createTimer();
      await new Promise(resolve => setTimeout(resolve, 15));
      const step2Duration = step2Timer.end();

      const totalDuration = totalTimer.end();

      // 各ステップの処理時間が正しく計測されている
      expect(step1Duration).toBeGreaterThanOrEqual(10);
      expect(step2Duration).toBeGreaterThanOrEqual(15);

      // 合計処理時間が各ステップの合計以上
      expect(totalDuration).toBeGreaterThanOrEqual(step1Duration + step2Duration);
    });
  });

  describe('タスク生成フローの処理時間計測', () => {
    it('各ステップの処理時間を記録できる', () => {
      const userId = 'user-123';
      const actionId = 'action-456';

      // 全体の処理時間計測開始
      const totalTimer = createTimer();

      // ステップ1: コンテキスト取得
      const contextTimer = createTimer();
      // ... 処理 ...
      const contextDuration = contextTimer.end();
      logger.info('コンテキスト取得完了', {
        userId,
        actionId,
        duration: `${contextDuration}ms`,
        action: 'context_retrieved',
      });

      // ステップ2: AI生成
      const aiTimer = createTimer();
      // ... 処理 ...
      const aiDuration = aiTimer.end();
      logger.info('AI生成完了', {
        userId,
        actionId,
        taskCount: 3,
        duration: `${aiDuration}ms`,
        action: 'ai_generation_completed',
      });

      // 全体の処理時間
      const totalDuration = totalTimer.end();
      logger.info('タスク生成処理完了', {
        userId,
        actionId,
        totalDuration: `${totalDuration}ms`,
        action: 'generate_and_save_tasks_completed',
      });

      // ログが3つ出力されている
      expect(consoleOutput).toHaveLength(3);

      // 各ログエントリを検証
      const logs = consoleOutput.map(log => JSON.parse(log));

      // コンテキスト取得のログ
      expect(logs[0].message).toBe('コンテキスト取得完了');
      expect(logs[0].context.duration).toMatch(/^\d+ms$/);

      // AI生成のログ
      expect(logs[1].message).toBe('AI生成完了');
      expect(logs[1].context.duration).toMatch(/^\d+ms$/);

      // 全体処理のログ
      expect(logs[2].message).toBe('タスク生成処理完了');
      expect(logs[2].context.totalDuration).toMatch(/^\d+ms$/);
    });

    it('Lambda Handlerレベルの処理時間を記録できる', () => {
      const requestId = 'req-test-123';
      const userId = 'user-123';
      const actionId = 'action-456';

      // リクエスト全体の処理時間計測
      const requestTimer = createTimer();

      // ... 処理 ...

      const duration = requestTimer.end();
      logger.info('タスク生成成功', {
        requestId,
        userId,
        actionId,
        action: 'task_generation_success',
        duration: `${duration}ms`,
        metadata: {
          taskCount: 3,
          tokensUsed: 2500,
          estimatedCost: 0.00038,
        },
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.message).toBe('タスク生成成功');
      expect(logEntry.context.duration).toMatch(/^\d+ms$/);
      expect(logEntry.context.requestId).toBe(requestId);
    });

    it('エラー発生時も処理時間を記録できる', () => {
      const requestId = 'req-test-456';

      const timer = createTimer();

      // ... エラーが発生 ...

      const duration = timer.end();
      logger.error('タスク生成エラー', {
        requestId,
        action: 'task_generation_error',
        duration: `${duration}ms`,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力データが不正です',
        },
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.level).toBe('error');
      expect(logEntry.context.duration).toMatch(/^\d+ms$/);
    });
  });

  describe('処理時間のフォーマット', () => {
    it('ミリ秒単位で出力される', () => {
      const timer = createTimer();
      const duration = timer.end();

      logger.info('処理完了', {
        duration: `${duration}ms`,
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.context.duration).toMatch(/^\d+ms$/);
    });

    it('数値として処理時間を取得できる', () => {
      const timer = createTimer();
      const duration = timer.end();

      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('処理時間が妥当な範囲である', async () => {
      const timer = createTimer();

      // 50ms待機
      await new Promise(resolve => setTimeout(resolve, 50));

      const duration = timer.end();

      // 50ms以上100ms未満（余裕を持たせる）
      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('パフォーマンス監視', () => {
    it('処理時間が閾値を超えた場合に警告できる', () => {
      const timer = createTimer();
      const duration = timer.end();

      const threshold = 30000; // 30秒

      if (duration > threshold) {
        logger.warn('処理時間が閾値を超えました', {
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          action: 'performance_warning',
        });
      } else {
        logger.info('処理完了', {
          duration: `${duration}ms`,
        });
      }

      const logEntry = JSON.parse(consoleOutput[0]);

      // 通常は閾値を超えないので、infoログが出力される
      expect(logEntry.level).toBe('info');
      expect(logEntry.message).toBe('処理完了');
    });

    it('各ステップの処理時間を比較できる', () => {
      const contextDuration = 50;
      const aiDuration = 2500;
      const dbDuration = 100;

      logger.info('処理時間サマリー', {
        contextDuration: `${contextDuration}ms`,
        aiDuration: `${aiDuration}ms`,
        dbDuration: `${dbDuration}ms`,
        totalDuration: `${contextDuration + aiDuration + dbDuration}ms`,
      });

      const logEntry = JSON.parse(consoleOutput[0]);
      expect(logEntry.context.contextDuration).toBe('50ms');
      expect(logEntry.context.aiDuration).toBe('2500ms');
      expect(logEntry.context.dbDuration).toBe('100ms');
      expect(logEntry.context.totalDuration).toBe('2650ms');
    });
  });
});
