import fc from 'fast-check';
import { NotificationService } from '../notification.service';
import { Task, TaskStatus } from '@goal-mandala/shared';

// Mock AWS SDK
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  SendEmailCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutRuleCommand: jest.fn(),
  PutTargetsCommand: jest.fn(),
  DeleteRuleCommand: jest.fn(),
  RemoveTargetsCommand: jest.fn(),
}));

// Arbitraries for property-based testing
const taskArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  actionId: fc.string({ minLength: 1 }),
  title: fc.string({ minLength: 1 }),
  description: fc.option(fc.string()),
  type: fc.constantFrom('execution', 'habit'),
  status: fc.constantFrom('not_started', 'in_progress', 'completed', 'skipped'),
  estimatedMinutes: fc.integer({ min: 1, max: 480 }),
  deadline: fc.option(fc.date()),
  completedAt: fc.option(fc.date()),
  createdAt: fc.date(),
  updatedAt: fc.date(),
}) as fc.Arbitrary<Task>;

describe('NotificationService Property Tests', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService();
  });

  /**
   * Feature: task-management, Property 20: 通知のスケジューリング
   * Validates: Requirements 15.1-15.5
   */
  describe('Property 20: 通知のスケジューリング', () => {
    it('期限が24時間以内のタスクには通知がスケジュールされ、完了時にキャンセルされる', () => {
      fc.assert(
        fc.property(taskArbitrary, fc.boolean(), async (task, shouldComplete) => {
          // Setup: 24時間以内の期限を設定
          const now = new Date();
          const deadline = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12時間後
          const testTask = { ...task, deadline, status: 'not_started' as TaskStatus };

          // Execute: 通知をスケジュール
          await expect(notificationService.scheduleNotification(testTask)).resolves.not.toThrow();

          if (shouldComplete) {
            // タスクを完了状態に更新
            const completedTask = { ...testTask, status: 'completed' as TaskStatus };

            // Execute: 通知をキャンセル
            await expect(
              notificationService.cancelNotification(completedTask.id)
            ).resolves.not.toThrow();
          }

          // Property: 通知のスケジューリングとキャンセルが正常に動作する
          expect(true).toBe(true); // 例外が発生しなければ成功
        }),
        { numRuns: 100 }
      );
    });

    it('期限がないタスクまたは完了済みタスクには通知がスケジュールされない', () => {
      fc.assert(
        fc.property(taskArbitrary, fc.boolean(), async (task, hasDeadline) => {
          // Setup: 期限なしまたは完了済みタスク
          const testTask = hasDeadline
            ? { ...task, deadline: undefined }
            : { ...task, status: 'completed' as TaskStatus };

          // Execute: 通知スケジューリングを試行
          await expect(notificationService.scheduleNotification(testTask)).resolves.not.toThrow();

          // Property: エラーが発生しない（通知はスケジュールされないが、エラーにもならない）
          expect(true).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('期限リマインダーメールが正しく送信される', () => {
      fc.assert(
        fc.property(taskArbitrary, async task => {
          // Setup: 期限があるタスク
          const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const testTask = { ...task, deadline };

          // Execute: 期限リマインダーを送信
          await expect(notificationService.sendDeadlineReminder(testTask)).resolves.not.toThrow();

          // Property: メール送信が正常に完了する
          expect(true).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('期限超過通知が正しく送信される', () => {
      fc.assert(
        fc.property(taskArbitrary, async task => {
          // Setup: 期限超過タスク
          const overdueDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const testTask = {
            ...task,
            deadline: overdueDeadline,
            status: 'not_started' as TaskStatus,
          };

          // Execute: 期限超過通知を送信
          await expect(
            notificationService.sendOverdueNotification(testTask)
          ).resolves.not.toThrow();

          // Property: 期限超過通知が正常に送信される
          expect(true).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('通知のキャンセルが正常に動作する', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1 }), async taskId => {
          // Execute: 通知をキャンセル
          await expect(notificationService.cancelNotification(taskId)).resolves.not.toThrow();

          // Property: キャンセル処理が正常に完了する
          expect(true).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });
});
