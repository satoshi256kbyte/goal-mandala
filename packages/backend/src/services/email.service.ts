/**
 * Email Service
 *
 * Generates and sends reminder emails using Amazon SES.
 * Requirements: 1.1, 1.4, 2.1-2.4, 3.1, 9.1
 */

import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { deepLinkService } from './deep-link.service.js';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  estimatedMinutes: number;
}

export interface Goal {
  id: string;
  title: string;
}

export interface EmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export interface ReminderEmailData {
  user: User;
  tasks: Task[];
  goal: Goal;
  frontendUrl: string;
}

export class EmailService {
  private sesClient: SESClient;
  private template: HandlebarsTemplateDelegate | null = null;
  private readonly FROM_EMAIL: string;
  private readonly AWS_REGION: string;
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly TEST_MODE: boolean;

  constructor() {
    this.AWS_REGION = process.env.AWS_REGION || 'ap-northeast-1';
    this.FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@goal-mandala.com';
    this.TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';
    this.sesClient = new SESClient({ region: this.AWS_REGION });
  }

  /**
   * Load and compile email template
   *
   * Requirements: 2.1-2.4
   */
  private loadTemplate(): HandlebarsTemplateDelegate {
    if (this.template) {
      return this.template;
    }

    try {
      // Use relative path from the services directory
      const templatePath = join(__dirname, '..', 'templates', 'reminder-email.hbs');
      const templateSource = readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateSource);
      return this.template;
    } catch (error) {
      console.error('Failed to load email template:', error);
      throw new Error('Failed to load email template');
    }
  }

  /**
   * Generate email HTML content
   *
   * Requirements: 2.1-2.4, 3.1, 9.1
   */
  async generateEmailHtml(data: ReminderEmailData): Promise<string> {
    const template = this.loadTemplate();

    // Generate deep links for each task
    const tasksWithDeepLinks = await Promise.all(
      data.tasks.map(async task => {
        const token = await deepLinkService.generateToken({
          userId: data.user.id,
          taskId: task.id,
        });
        const deepLink = `${data.frontendUrl}/tasks/${task.id}?token=${token}`;
        return {
          ...task,
          deepLink,
        };
      })
    );

    // Calculate total estimated time
    const totalMinutes = data.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

    // Generate unsubscribe link
    const unsubscribeToken = await deepLinkService.generateToken({
      userId: data.user.id,
      taskId: 'unsubscribe', // Special task ID for unsubscribe
    });
    const unsubscribeLink = `${data.frontendUrl}/api/reminders/unsubscribe/${unsubscribeToken}`;

    // Compile template with data
    const html = template({
      userName: data.user.name,
      goalTitle: data.goal.title,
      tasks: tasksWithDeepLinks,
      totalMinutes,
      unsubscribeLink,
    });

    return html;
  }

  /**
   * Send reminder email with retry logic
   *
   * Requirements: 1.1, 1.4, 10.4, 10.5
   */
  async sendReminderEmail(data: ReminderEmailData): Promise<EmailResult> {
    // Test mode: log email instead of sending
    if (this.TEST_MODE) {
      return this.logEmailInTestMode(data);
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Generate email HTML
        const html = await this.generateEmailHtml(data);

        // Prepare SES command
        const params: SendEmailCommandInput = {
          Source: this.FROM_EMAIL,
          Destination: {
            ToAddresses: [data.user.email],
          },
          Message: {
            Subject: {
              Data: `今日のタスクリマインド - ${data.goal.title}`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: html,
                Charset: 'UTF-8',
              },
            },
          },
        };

        // Send email
        const command = new SendEmailCommand(params);
        const response = await this.sesClient.send(command);

        // Return success result
        return {
          messageId: response.MessageId || '',
          success: true,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Email send attempt ${attempt + 1} failed:`, error);

        // If this is not the last attempt, wait before retrying
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    return {
      messageId: '',
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }

  /**
   * Log email in test mode instead of sending
   *
   * Requirements: 10.4, 10.5
   */
  private async logEmailInTestMode(data: ReminderEmailData): Promise<EmailResult> {
    try {
      // Generate email HTML
      const html = await this.generateEmailHtml(data);

      // Log email details
      console.log('=== TEST MODE: Email would be sent ===');
      console.log('From:', this.FROM_EMAIL);
      console.log('To:', data.user.email);
      console.log('Subject:', `今日のタスクリマインド - ${data.goal.title}`);
      console.log('User:', data.user.name);
      console.log('Goal:', data.goal.title);
      console.log('Tasks:', data.tasks.length);
      console.log('Task details:', JSON.stringify(data.tasks, null, 2));
      console.log('HTML length:', html.length, 'characters');
      console.log('=====================================');

      // Return mock success result
      return {
        messageId: `test-mode-${Date.now()}`,
        success: true,
      };
    } catch (error) {
      console.error('Test mode email generation failed:', error);
      return {
        messageId: '',
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   *
   * Requirements: 1.4
   */
  private calculateRetryDelay(attempt: number): number {
    return this.INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if test mode is enabled
   *
   * Requirements: 10.4, 10.5
   */
  isTestMode(): boolean {
    return this.TEST_MODE;
  }

  /**
   * Clear template cache (useful for testing)
   */
  clearCache(): void {
    this.template = null;
  }
}

// Export singleton instance
export const emailService = new EmailService();
