import { PrismaClient, Task } from '../generated/prisma-client';

/**
 * 通知サービスインターフェース
 */
export interface INotificationService {
  /**
   * 期限リマインダーを送信
   */
  sendDeadlineReminder(task: Task): Promise<void>;

  /**
   * 期限超過通知を送信
   */
  sendOverdueNotification(task: Task): Promise<void>;

  /**
   * 通知をキャンセル
   */
  cancelNotification(taskId: string): Promise<void>;

  /**
   * 通知をスケジュール
   */
  scheduleNotification(task: Task): Promise<void>;
}

/**
 * 通知サービス実装
 */
export class NotificationService implements INotificationService {
  private prisma: PrismaClient;
  private sesClient: unknown;
  private eventBridgeClient: unknown;

  constructor(prisma: PrismaClient, sesClient?: unknown, eventBridgeClient?: unknown) {
    this.prisma = prisma;
    this.sesClient = sesClient;
    this.eventBridgeClient = eventBridgeClient;
  }

  /**
   * 期限リマインダーを送信
   */
  async sendDeadlineReminder(task: Task): Promise<void> {
    // タスクの所有者情報を取得
    const taskWithUser = await this.prisma.task.findUnique({
      where: { id: task.id },
      include: {
        action: {
          include: {
            subGoal: {
              include: {
                goal: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!taskWithUser || !taskWithUser.action?.subGoal?.goal?.user) {
      throw new Error('Task or user not found');
    }

    const user = taskWithUser.action.subGoal.goal.user;
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const deadlineStr = deadline ? deadline.toLocaleDateString('ja-JP') : '未設定';

    // メール内容を生成
    const subject = `【リマインド】タスクの期限が近づいています: ${task.title}`;
    const body = `
${user.name} 様

タスクの期限が近づいています。

■ タスク詳細
タイトル: ${task.title}
説明: ${task.description || ''}
期限: ${deadlineStr}
推定時間: ${task.estimatedMinutes}分

■ 関連情報
アクション: ${taskWithUser.action.title}
サブ目標: ${taskWithUser.action.subGoal.title}
目標: ${taskWithUser.action.subGoal.goal.title}

タスクの詳細を確認するには、以下のリンクをクリックしてください：
${process.env.FRONTEND_URL}/tasks/${task.id}

目標管理曼荼羅
    `.trim();

    // SESでメール送信
    if (this.sesClient) {
      const params = {
        Source: process.env.FROM_EMAIL || 'noreply@goal-mandala.com',
        Destination: {
          ToAddresses: [user.email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: body,
              Charset: 'UTF-8',
            },
          },
        },
      };

      await this.sesClient.sendEmail(params).promise();
    }

    // 送信履歴を記録
    await this.prisma.taskReminder.create({
      data: {
        taskId: task.id,
        reminderDate: new Date(),
        sent: true,
        sentAt: new Date(),
        createdAt: new Date(),
      },
    });
  }

  /**
   * 期限超過通知を送信
   */
  async sendOverdueNotification(task: Task): Promise<void> {
    // タスクの所有者情報を取得
    const taskWithUser = await this.prisma.task.findUnique({
      where: { id: task.id },
      include: {
        action: {
          include: {
            subGoal: {
              include: {
                goal: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!taskWithUser || !taskWithUser.action?.subGoal?.goal?.user) {
      throw new Error('Task or user not found');
    }

    const user = taskWithUser.action.subGoal.goal.user;
    const deadline = task.deadline ? new Date(task.deadline) : null;
    const deadlineStr = deadline ? deadline.toLocaleDateString('ja-JP') : '未設定';

    // メール内容を生成
    const subject = `【期限超過】タスクの期限が過ぎています: ${task.title}`;
    const body = `
${user.name} 様

タスクの期限が過ぎています。

■ タスク詳細
タイトル: ${task.title}
説明: ${task.description || ''}
期限: ${deadlineStr}
推定時間: ${task.estimatedMinutes}分

■ 関連情報
アクション: ${taskWithUser.action.title}
サブ目標: ${taskWithUser.action.subGoal.title}
目標: ${taskWithUser.action.subGoal.goal.title}

タスクの状態を更新するには、以下のリンクをクリックしてください：
${process.env.FRONTEND_URL}/tasks/${task.id}

目標管理曼荼羅
    `.trim();

    // SESでメール送信
    if (this.sesClient) {
      const params = {
        Source: process.env.FROM_EMAIL || 'noreply@goal-mandala.com',
        Destination: {
          ToAddresses: [user.email],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: body,
              Charset: 'UTF-8',
            },
          },
        },
      };

      await this.sesClient.sendEmail(params).promise();
    }

    // 送信履歴を記録
    await this.prisma.taskReminder.create({
      data: {
        taskId: task.id,
        reminderDate: new Date(),
        sent: true,
        sentAt: new Date(),
        createdAt: new Date(),
      },
    });
  }

  /**
   * 通知をキャンセル
   */
  async cancelNotification(taskId: string): Promise<void> {
    // EventBridgeのルールを無効化（実装は環境に依存）
    if (this.eventBridgeClient) {
      const ruleName = `task-reminder-${taskId}`;

      try {
        await this.eventBridgeClient
          .disableRule({
            Name: ruleName,
          })
          .promise();
      } catch (error) {
        // ルールが存在しない場合は無視
        console.warn(`Rule ${ruleName} not found or already disabled`);
      }
    }

    // 未送信のリマインダーを削除
    await this.prisma.taskReminder.deleteMany({
      where: {
        taskId,
        sent: false,
      },
    });
  }

  /**
   * 通知をスケジュール
   */
  async scheduleNotification(task: Task): Promise<void> {
    if (!task.deadline) {
      return; // 期限がない場合はスケジュールしない
    }

    const deadline = new Date(task.deadline);
    const now = new Date();
    const reminderTime = new Date(deadline.getTime() - 24 * 60 * 60 * 1000); // 24時間前

    // 既に期限を過ぎている場合はスケジュールしない
    if (deadline <= now) {
      return;
    }

    // リマインダー時刻が過去の場合はスケジュールしない
    if (reminderTime <= now) {
      return;
    }

    // EventBridgeでスケジュール（実装は環境に依存）
    if (this.eventBridgeClient) {
      const ruleName = `task-reminder-${task.id}`;
      const scheduleExpression = `at(${reminderTime.toISOString().slice(0, 19)})`;

      await this.eventBridgeClient
        .putRule({
          Name: ruleName,
          ScheduleExpression: scheduleExpression,
          Description: `Reminder for task ${task.id}`,
          State: 'ENABLED',
        })
        .promise();

      // ターゲットを設定（Lambda関数など）
      await this.eventBridgeClient
        .putTargets({
          Rule: ruleName,
          Targets: [
            {
              Id: '1',
              Arn: process.env.REMINDER_LAMBDA_ARN,
              Input: JSON.stringify({ taskId: task.id, type: 'deadline_reminder' }),
            },
          ],
        })
        .promise();
    }

    // リマインダー予定を記録
    await this.prisma.taskReminder.create({
      data: {
        taskId: task.id,
        reminderDate: reminderTime,
        sent: false,
        createdAt: new Date(),
      },
    });
  }
}
