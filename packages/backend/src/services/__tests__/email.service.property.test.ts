/**
 * Email Service Property-Based Tests
 *
 * Feature: 3.2-reminder-functionality
 * Properties: 3, 4, 5, 6, 7, 8, 29
 * Validates: Requirements 1.4, 2.1-2.4, 3.1, 9.1
 */

import * as fc from 'fast-check';
import { emailService, EmailService, ReminderEmailData } from '../email.service';
import { deepLinkService } from '../deep-link.service';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { mockClient } from 'aws-sdk-client-mock';

// Mock AWS SES Client
const sesMock = mockClient(SESClient);

// Mock Deep Link Service
jest.mock('../deep-link.service');

/**
 * Helper function to escape HTML entities like Handlebars does
 * Handlebars escapes: & < > " ' ` =
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
    .replace(/=/g, '&#x3D;');
}

describe('EmailService - Property-Based Tests', () => {
  beforeEach(() => {
    // Clear all mocks
    sesMock.reset();
    jest.clearAllMocks();

    // Clear email service cache
    emailService.clearCache();

    // Set environment variables
    process.env.AWS_REGION = 'ap-northeast-1';
    process.env.FROM_EMAIL = 'noreply@goal-mandala.com';

    // Mock deep link service - reset mock implementation
    (deepLinkService.generateToken as jest.Mock).mockClear();
    (deepLinkService.generateToken as jest.Mock).mockImplementation(async ({ taskId }) => {
      return `token-${taskId}`;
    });
  });

  /**
   * Property 3: Email Retry with Exponential Backoff
   * Feature: 3.2-reminder-functionality, Property 3
   * Validates: Requirements 1.4
   *
   * For any failed email delivery, the ReminderSystem should retry up to 3 times with exponential backoff
   */
  describe('Property 3: Email Retry with Exponential Backoff', () => {
    it('全ての失敗したメール送信は最大3回リトライされること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user, goal, and tasks
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            // Reset mock before each iteration
            sesMock.reset();

            // Mock SES to always fail
            sesMock.on(SendEmailCommand).rejects(new Error('SES Error'));

            // Send email
            const result = await emailService.sendReminderEmail(emailData);

            // Verify retry count
            expect(sesMock.commandCalls(SendEmailCommand).length).toBe(3);
            expect(result.success).toBe(false);
          }
        ),
        { numRuns: 5 } // Reduced runs due to timeout (each run takes ~6 seconds)
      );
    }, 120000); // 120 second timeout (5 runs * 6 seconds * 3 retries = ~90 seconds + buffer)

    it('リトライ間隔はExponential Backoffに従うこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            sesMock.on(SendEmailCommand).rejects(new Error('Throttling'));

            const startTime = Date.now();
            await emailService.sendReminderEmail(emailData);
            const endTime = Date.now();

            // Expected delays: 1s + 2s = 3s minimum
            const actualDelay = endTime - startTime;
            expect(actualDelay).toBeGreaterThanOrEqual(3000);
            expect(actualDelay).toBeLessThan(4000); // Allow 1s tolerance
          }
        ),
        { numRuns: 10 } // Reduced runs due to timeout
      );
    }, 60000); // 60 second timeout
  });

  /**
   * Property 4: Email Contains User Name
   * Feature: 3.2-reminder-functionality, Property 4
   * Validates: Requirements 2.1
   *
   * For any reminder email generated, it should include the user's name in the greeting
   */
  describe('Property 4: Email Contains User Name', () => {
    it('全てのリマインドメールにユーザー名が含まれること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            const html = await emailService.generateEmailHtml(emailData);

            // Verify user name is in the email (accounting for HTML escaping)
            const escapedName = escapeHtml(emailData.user.name);
            expect(html).toContain(escapedName);
            expect(html).toContain('こんにちは');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Email Contains Goal Title
   * Feature: 3.2-reminder-functionality, Property 5
   * Validates: Requirements 2.2
   *
   * For any reminder email generated, it should include the goal title associated with the tasks
   */
  describe('Property 5: Email Contains Goal Title', () => {
    it('全てのリマインドメールに目標タイトルが含まれること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            const html = await emailService.generateEmailHtml(emailData);

            // Verify goal title is in the email (accounting for HTML escaping)
            const escapedTitle = escapeHtml(emailData.goal.title);
            expect(html).toContain(escapedTitle);
            expect(html).toContain('目標:');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Email Lists All Tasks
   * Feature: 3.2-reminder-functionality, Property 6
   * Validates: Requirements 2.3
   *
   * For any reminder email generated, it should list all tasks for the day with their titles and estimated time
   */
  describe('Property 6: Email Lists All Tasks', () => {
    it('全てのリマインドメールに全タスクのタイトルと所要時間が含まれること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            const html = await emailService.generateEmailHtml(emailData);

            // Verify all tasks are listed (accounting for HTML escaping)
            emailData.tasks.forEach(task => {
              const escapedTitle = escapeHtml(task.title);
              expect(html).toContain(escapedTitle);
              expect(html).toContain(`${task.estimatedMinutes}分`);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Email Contains Total Time
   * Feature: 3.2-reminder-functionality, Property 7
   * Validates: Requirements 2.4
   *
   * For any reminder email generated, it should include the correct total estimated time for all tasks
   */
  describe('Property 7: Email Contains Total Time', () => {
    it('全てのリマインドメールに正しい合計所要時間が含まれること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            const html = await emailService.generateEmailHtml(emailData);

            // Calculate expected total time
            const totalMinutes = emailData.tasks.reduce(
              (sum, task) => sum + task.estimatedMinutes,
              0
            );

            // Verify total time is in the email
            expect(html).toContain(`${totalMinutes}分`);
            expect(html).toContain('合計所要時間');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Deep Link in Email
   * Feature: 3.2-reminder-functionality, Property 8
   * Validates: Requirements 3.1
   *
   * For any task in a reminder email, the email should include a deep link to that task's detail page
   */
  describe('Property 8: Deep Link in Email', () => {
    it('全てのタスクにDeep Linkが含まれること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            // Clear mock before this test iteration
            (deepLinkService.generateToken as jest.Mock).mockClear();

            const html = await emailService.generateEmailHtml(emailData);

            // Verify deep links for all tasks
            emailData.tasks.forEach(task => {
              // Handlebars escapes special characters in URLs
              // Both the URL and task ID can contain special characters that get escaped
              const escapedFrontendUrl = escapeHtml(emailData.frontendUrl);
              const escapedTaskId = escapeHtml(task.id);
              const escapedToken = escapeHtml(`token-${task.id}`);

              // Build expected link with escaped characters
              const expectedLink = `${escapedFrontendUrl}/tasks/${escapedTaskId}?token&#x3D;${escapedToken}`;
              expect(html).toContain(expectedLink);
            });

            // Verify deep link service was called for each task
            expect(deepLinkService.generateToken).toHaveBeenCalledTimes(
              emailData.tasks.length + 1 // +1 for unsubscribe
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 29: Unsubscribe Link in Email
   * Feature: 3.2-reminder-functionality, Property 29
   * Validates: Requirements 9.1
   *
   * For any reminder email sent, it should include an unsubscribe link in the email footer
   */
  describe('Property 29: Unsubscribe Link in Email', () => {
    it('全てのリマインドメールに配信停止リンクが含まれること', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            goal: fc.record({
              id: fc.string({ minLength: 1, maxLength: 50 }),
              title: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            tasks: fc.array(
              fc.record({
                id: fc.string({ minLength: 1, maxLength: 50 }),
                title: fc.string({ minLength: 1, maxLength: 200 }),
                estimatedMinutes: fc.integer({ min: 1, max: 120 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            frontendUrl: fc.webUrl(),
          }),
          async emailData => {
            const html = await emailService.generateEmailHtml(emailData);

            // Verify unsubscribe link is in the email
            expect(html).toContain('配信停止');

            // Verify unsubscribe link with proper URL encoding
            // Handlebars escapes special characters in URLs
            const escapedFrontendUrl = escapeHtml(emailData.frontendUrl);
            const expectedUnsubscribeLink = `${escapedFrontendUrl}/api/reminders/unsubscribe/token-unsubscribe`;

            expect(html).toContain(expectedUnsubscribeLink);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
