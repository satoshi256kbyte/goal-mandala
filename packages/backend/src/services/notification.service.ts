import { PrismaClient } from '../generated/prisma-client';
import { logger } from '../utils/logger';

/**
 * 通知サービスインターフェース
 */
export interface INotificationService {
  /**
   * 期限リマインダーを送信
   */
  sendDeadlineReminder(taskId: string): Promise<void>;

  /**
   * 期限超過通知を送信
   */
  sendOverdueNotification(taskId: string): Promise<void>;

  /**
   * 通知をキャンセル
   */
  cancelNotification(taskId: string): Promise<void>;

  /**
   * 通知をスケジュール
   */
  scheduleNotification(taskId: string): Promise<void>;
}

/**
 * 通知サービス実装
 */
export class NotificationService implements INotificationService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * 期限リマインダーを送信
   */
  async sendDeadlineReminder(taskId: string): Promise<void> {
    try {
      // 実装は将来的にSESと連携
      logger.info('Deadline reminder sent', { taskId });
    } catch (error) {
      logger.error('Failed to send deadline reminder', { taskId, error });
      throw error;
    }
  }

  /**
   * 期限超過通知を送信
   */
  async sendOverdueNotification(taskId: string): Promise<void> {
    try {
      // 実装は将来的にSESと連携
      logger.info('Overdue notification sent', { taskId });
    } catch (error) {
      logger.error('Failed to send overdue notification', { taskId, error });
      throw error;
    }
  }

  /**
   * 通知をキャンセル
   */
  async cancelNotification(taskId: string): Promise<void> {
    try {
      // 実装は将来的にEventBridgeと連携
      logger.info('Notification cancelled', { taskId });
    } catch (error) {
      logger.error('Failed to cancel notification', { taskId, error });
      throw error;
    }
  }

  /**
   * 通知をスケジュール
   */
  async scheduleNotification(taskId: string): Promise<void> {
    try {
      // 実装は将来的にEventBridgeと連携
      logger.info('Notification scheduled', { taskId });
    } catch (error) {
      logger.error('Failed to schedule notification', { taskId, error });
      throw error;
    }
  }
}
