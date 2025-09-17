import { PrismaClient } from '@prisma/client';
import { SeedDataSet, ValidationResult } from './types';

type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export class SeedManager {
  constructor(private prisma: PrismaClient) {}

  async seedDatabase(dataSet: SeedDataSet): Promise<void> {
    console.log(`シードデータ投入開始: ${dataSet.name}`);

    await this.prisma.$transaction(async tx => {
      try {
        // データ検証
        const validation = this.validateDataSet(dataSet);
        if (!validation.isValid) {
          throw new Error(`データ検証エラー: ${validation.errors.join(', ')}`);
        }

        // 既存データのクリーンアップ
        await this.cleanupExistingData(tx);

        // ユーザーデータ投入
        await this.insertUsers(tx, dataSet.users);

        // 目標データ投入
        await this.insertGoals(tx, dataSet.goals);

        console.log(
          `シードデータ投入完了: ${dataSet.name} (${dataSet.metadata.estimatedRecords}件)`
        );
      } catch (error) {
        console.error('シードデータ投入エラー:', error);
        throw error;
      }
    });
  }

  private validateDataSet(dataSet: SeedDataSet): ValidationResult {
    const errors: string[] = [];

    // マンダラ構造検証
    for (const goal of dataSet.goals) {
      if (goal.sub_goals.length !== 8) {
        errors.push(
          `目標 "${goal.title}" のサブ目標数が8個ではありません (${goal.sub_goals.length}個)`
        );
      }

      for (const subGoal of goal.sub_goals) {
        if (subGoal.actions.length !== 8) {
          errors.push(
            `サブ目標 "${subGoal.title}" のアクション数が8個ではありません (${subGoal.actions.length}個)`
          );
        }

        // 位置の重複チェック
        const positions = subGoal.actions.map(a => a.position);
        const uniquePositions = new Set(positions);
        if (positions.length !== uniquePositions.size) {
          errors.push(`サブ目標 "${subGoal.title}" でアクションの位置が重複しています`);
        }
      }

      // サブ目標の位置重複チェック
      const subGoalPositions = goal.sub_goals.map(sg => sg.position);
      const uniqueSubGoalPositions = new Set(subGoalPositions);
      if (subGoalPositions.length !== uniqueSubGoalPositions.size) {
        errors.push(`目標 "${goal.title}" でサブ目標の位置が重複しています`);
      }
    }

    // ユーザーのメール重複チェック
    const emails = dataSet.users.map(u => u.email);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      errors.push('ユーザーのメールアドレスが重複しています');
    }

    return { isValid: errors.length === 0, errors };
  }

  private async cleanupExistingData(tx: PrismaTransaction): Promise<void> {
    console.log('既存データをクリーンアップ中...');

    // 外部キー制約を考慮した順序で削除
    await tx.taskReminder.deleteMany();
    await tx.task.deleteMany();
    await tx.action.deleteMany();
    await tx.subGoal.deleteMany();
    await tx.reflection.deleteMany();
    await tx.goal.deleteMany();
    await tx.user.deleteMany();

    console.log('既存データのクリーンアップ完了');
  }

  private async insertUsers(tx: PrismaTransaction, users: SeedDataSet['users']): Promise<void> {
    console.log(`ユーザーデータ投入中... (${users.length}件)`);

    for (const user of users) {
      await tx.user.create({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          industry: user.industry,
          company_size: user.company_size,
          job_title: user.job_title,
          position: user.position,
        },
      });
    }

    console.log('ユーザーデータ投入完了');
  }

  private async insertGoals(tx: PrismaTransaction, goals: SeedDataSet['goals']): Promise<void> {
    console.log(`目標データ投入中... (${goals.length}件)`);

    for (const goal of goals) {
      // 目標作成
      await tx.goal.create({
        data: {
          id: goal.id,
          user_id: goal.user_id,
          title: goal.title,
          description: goal.description,
          deadline: goal.deadline,
          background: goal.background,
          constraints: goal.constraints,
          status: goal.status,
          progress: goal.progress,
        },
      });

      // サブ目標作成
      for (const subGoal of goal.sub_goals) {
        await tx.subGoal.create({
          data: {
            id: subGoal.id,
            goal_id: goal.id,
            title: subGoal.title,
            description: subGoal.description,
            background: subGoal.background,
            constraints: subGoal.constraints,
            position: subGoal.position,
            progress: subGoal.progress,
          },
        });

        // アクション作成
        for (const action of subGoal.actions) {
          await tx.action.create({
            data: {
              id: action.id,
              sub_goal_id: subGoal.id,
              title: action.title,
              description: action.description,
              background: action.background,
              constraints: action.constraints,
              type: action.type,
              position: action.position,
              progress: action.progress,
            },
          });

          // タスク作成
          for (const task of action.tasks) {
            await tx.task.create({
              data: {
                id: task.id,
                action_id: action.id,
                title: task.title,
                description: task.description,
                type: task.type,
                status: task.status,
                estimated_minutes: task.estimated_minutes,
                completed_at: task.completed_at,
              },
            });

            // リマインダー作成
            for (const reminder of task.reminders) {
              await tx.taskReminder.create({
                data: {
                  id: reminder.id,
                  task_id: task.id,
                  reminder_date: reminder.reminder_date,
                  sent: reminder.sent,
                  sent_at: reminder.sent_at,
                },
              });
            }
          }
        }
      }

      // 振り返り作成
      for (const reflection of goal.reflections) {
        await tx.reflection.create({
          data: {
            id: reflection.id,
            goal_id: goal.id,
            summary: reflection.summary,
            regretful_actions: reflection.regretful_actions,
            slow_progress_actions: reflection.slow_progress_actions,
            untouched_actions: reflection.untouched_actions,
          },
        });
      }
    }

    console.log('目標データ投入完了');
  }
}
