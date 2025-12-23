/**
 * Email Service Unit Tests
 *
 * Feature: 3.2-reminder-functionality
 * Requirements: 1.4, 2.1-2.4, 3.1, 9.1
 */

import { emailService, EmailService, ReminderEmailData } from '../email.service';
import { deepLinkService } from '../deep-link.service';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

// Mock AWS SES Client
const sesMock = mockClient(SESClient);

// Mock Deep Link Service
jest.mock('../deep-link.service');

describe('EmailService', () => {
  const TEST_USER = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const TEST_GOAL = {
    id: 'goal-456',
    title: 'Test Goal',
  };

  const TEST_TASKS = [
    {
      id: 'task-1',
      title: 'Task 1',
      estimatedMinutes: 30,
    },
    {
      id: 'task-2',
      title: 'Task 2',
      estimatedMinutes: 45,
    },
  ];

  const TEST_FRONTEND_URL = 'https://example.com';

  const TEST_EMAIL_DATA: ReminderEmailData = {
    user: TEST_USER,
    tasks: TEST_TASKS,
    goal: TEST_GOAL,
    frontendUrl: TEST_FRONTEND_URL,
  };

  beforeEach(() => {
    // Clear all mocks
    sesMock.reset();
    jest.clearAllMocks();

    // Clear email service cache
    emailService.clearCache();

    // Set environment variables
    process.env.AWS_REGION = 'ap-northeast-1';
    process.env.FROM_EMAIL = 'noreply@goal-mandala.com';

    // Mock deep link service
    (deepLinkService.generateToken as jest.Mock).mockImplementation(async ({ taskId }) => {
      return `mock-token-${taskId}`;
    });
  });

  describe('generateEmailHtml', () => {
    it('メールHTMLを正常に生成できること', async () => {
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      expect(html).toBeDefined();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('生成されたHTMLにユーザー名が含まれること (Requirement 2.1)', async () => {
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      expect(html).toContain(TEST_USER.name);
      expect(html).toContain('こんにちは');
    });

    it('生成されたHTMLに目標タイトルが含まれること (Requirement 2.2)', async () => {
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      expect(html).toContain(TEST_GOAL.title);
      expect(html).toContain('目標:');
    });

    it('生成されたHTMLに全てのタスクが含まれること (Requirement 2.3)', async () => {
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      TEST_TASKS.forEach(task => {
        expect(html).toContain(task.title);
        expect(html).toContain(`${task.estimatedMinutes}分`);
      });
    });

    it('生成されたHTMLに合計所要時間が含まれること (Requirement 2.4)', async () => {
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      const totalMinutes = TEST_TASKS.reduce((sum, task) => sum + task.estimatedMinutes, 0);
      expect(html).toContain(`${totalMinutes}分`);
      expect(html).toContain('合計所要時間');
    });

    it('生成されたHTMLに各タスクのDeep Linkが含まれること (Requirement 3.1)', async () => {
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      TEST_TASKS.forEach(task => {
        // Handlebars escapes = to &#x3D; in HTML attributes
        const expectedLink = `${TEST_FRONTEND_URL}/tasks/${task.id}?token&#x3D;mock-token-${task.id}`;
        expect(html).toContain(expectedLink);
        expect(html).toContain('タスクを開始する');
      });

      // Verify deep link service was called for each task
      expect(deepLinkService.generateToken).toHaveBeenCalledTimes(TEST_TASKS.length + 1); // +1 for unsubscribe
    });

    it('生成されたHTMLに配信停止リンクが含まれること (Requirement 9.1)', async () => {
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      expect(html).toContain('配信停止');
      expect(html).toContain(
        `${TEST_FRONTEND_URL}/api/reminders/unsubscribe/mock-token-unsubscribe`
      );
    });

    it('タスクが0個の場合でもHTMLを生成できること', async () => {
      const dataWithNoTasks: ReminderEmailData = {
        ...TEST_EMAIL_DATA,
        tasks: [],
      };

      const html = await emailService.generateEmailHtml(dataWithNoTasks);

      expect(html).toBeDefined();
      expect(html).toContain(TEST_USER.name);
      expect(html).toContain(TEST_GOAL.title);
      expect(html).toContain('0分'); // Total time should be 0
    });

    it('タスクが多数ある場合でもHTMLを生成できること', async () => {
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        estimatedMinutes: 30,
      }));

      const dataWithManyTasks: ReminderEmailData = {
        ...TEST_EMAIL_DATA,
        tasks: manyTasks,
      };

      const html = await emailService.generateEmailHtml(dataWithManyTasks);

      expect(html).toBeDefined();
      manyTasks.forEach(task => {
        expect(html).toContain(task.title);
      });
    });

    it('特殊文字を含むタスクタイトルを正しくエスケープすること', async () => {
      const dataWithSpecialChars: ReminderEmailData = {
        ...TEST_EMAIL_DATA,
        tasks: [
          {
            id: 'task-1',
            title: '<script>alert("XSS")</script>',
            estimatedMinutes: 30,
          },
        ],
      };

      const html = await emailService.generateEmailHtml(dataWithSpecialChars);

      // Handlebars should escape HTML by default
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('sendReminderEmail', () => {
    it('メールを正常に送信できること (Requirement 1.1)', async () => {
      sesMock.on(SendEmailCommand).resolves({
        MessageId: 'test-message-id',
      });

      const result = await emailService.sendReminderEmail(TEST_EMAIL_DATA);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.error).toBeUndefined();
    });

    it('SESに正しいパラメータでメールを送信すること', async () => {
      sesMock.on(SendEmailCommand).resolves({
        MessageId: 'test-message-id',
      });

      await emailService.sendReminderEmail(TEST_EMAIL_DATA);

      expect(sesMock).toHaveReceivedCommandWith(SendEmailCommand, {
        Source: 'noreply@goal-mandala.com',
        Destination: {
          ToAddresses: [TEST_USER.email],
        },
        Message: {
          Subject: {
            Data: `今日のタスクリマインド - ${TEST_GOAL.title}`,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: expect.any(String),
              Charset: 'UTF-8',
            },
          },
        },
      });
    });

    it('送信失敗時にリトライすること (Requirement 1.4)', async () => {
      // First 2 attempts fail, 3rd succeeds
      sesMock
        .on(SendEmailCommand)
        .rejectsOnce(new Error('Throttling'))
        .rejectsOnce(new Error('Throttling'))
        .resolvesOnce({
          MessageId: 'test-message-id',
        });

      const result = await emailService.sendReminderEmail(TEST_EMAIL_DATA);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(sesMock).toHaveReceivedCommandTimes(SendEmailCommand, 3);
    });

    it('最大3回リトライすること (Requirement 1.4)', async () => {
      sesMock.on(SendEmailCommand).rejects(new Error('Permanent failure'));

      const result = await emailService.sendReminderEmail(TEST_EMAIL_DATA);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permanent failure');
      expect(sesMock).toHaveReceivedCommandTimes(SendEmailCommand, 3);
    });

    it('リトライ時にExponential Backoffを使用すること (Requirement 1.4)', async () => {
      sesMock.on(SendEmailCommand).rejects(new Error('Throttling'));

      const startTime = Date.now();
      await emailService.sendReminderEmail(TEST_EMAIL_DATA);
      const endTime = Date.now();

      // Expected delays: 1s (after 1st failure) + 2s (after 2nd failure) = 3s minimum
      // Note: The 3rd attempt fails immediately, so no delay after that
      const expectedMinDelay = 3000; // 1s + 2s
      const expectedMaxDelay = 4000; // Allow 1s tolerance for execution time
      const actualDelay = endTime - startTime;

      expect(actualDelay).toBeGreaterThanOrEqual(expectedMinDelay);
      expect(actualDelay).toBeLessThan(expectedMaxDelay);
    }, 10000); // 10 second timeout

    it('エラーメッセージをログに記録すること', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      sesMock.on(SendEmailCommand).rejects(new Error('Test error'));

      await emailService.sendReminderEmail(TEST_EMAIL_DATA);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email send attempt'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('テンプレートキャッシュ', () => {
    it('テンプレートをキャッシュすること', async () => {
      // First call
      const html1 = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      // Second call (should use cache)
      const html2 = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      expect(html1).toBe(html2);
    });

    it('clearCache()でキャッシュをクリアできること', async () => {
      // First call
      await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      // Clear cache
      emailService.clearCache();

      // Second call (should reload template)
      const html = await emailService.generateEmailHtml(TEST_EMAIL_DATA);

      expect(html).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('テンプレートファイルが見つからない場合はエラーをスローすること', async () => {
      // Create a new instance with invalid template path
      const invalidService = new EmailService();

      // Mock readFileSync to throw error
      const fs = require('fs');
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(invalidService.generateEmailHtml(TEST_EMAIL_DATA)).rejects.toThrow(
        'Failed to load email template'
      );

      // Restore original function
      fs.readFileSync = originalReadFileSync;
    });

    it('Deep Link生成失敗時はエラーをスローすること', async () => {
      (deepLinkService.generateToken as jest.Mock).mockRejectedValue(
        new Error('Token generation failed')
      );

      await expect(emailService.generateEmailHtml(TEST_EMAIL_DATA)).rejects.toThrow(
        'Token generation failed'
      );
    });

    it('SES送信失敗時は適切なエラーレスポンスを返すこと', async () => {
      sesMock.on(SendEmailCommand).rejects(new Error('SES error'));

      const result = await emailService.sendReminderEmail(TEST_EMAIL_DATA);

      expect(result.success).toBe(false);
      expect(result.messageId).toBe('');
      expect(result.error).toBe('SES error');
    });
  });

  describe('環境変数', () => {
    it('FROM_EMAILが設定されていない場合はデフォルト値を使用すること', async () => {
      delete process.env.FROM_EMAIL;
      const service = new EmailService();

      sesMock.on(SendEmailCommand).resolves({
        MessageId: 'test-message-id',
      });

      await service.sendReminderEmail(TEST_EMAIL_DATA);

      expect(sesMock).toHaveReceivedCommandWith(SendEmailCommand, {
        Source: 'noreply@goal-mandala.com',
        Destination: expect.any(Object),
        Message: expect.any(Object),
      });
    });

    it('AWS_REGIONが設定されていない場合はデフォルト値を使用すること', () => {
      delete process.env.AWS_REGION;
      const service = new EmailService();

      // Verify service was created successfully
      expect(service).toBeDefined();
    });
  });
});
