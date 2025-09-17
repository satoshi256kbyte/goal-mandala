import { SeedDataSet, ValidationResult } from './types';

export class DataValidator {
  validateDataSet(dataSet: SeedDataSet): ValidationResult {
    const errors: string[] = [];

    // 基本構造検証
    this.validateBasicStructure(dataSet, errors);

    // マンダラ構造検証
    this.validateMandalaStructure(dataSet, errors);

    // データ整合性検証
    this.validateDataIntegrity(dataSet, errors);

    // 制約条件検証
    this.validateConstraints(dataSet, errors);

    return { isValid: errors.length === 0, errors };
  }

  private validateBasicStructure(dataSet: SeedDataSet, errors: string[]): void {
    if (!dataSet.name || dataSet.name.trim().length === 0) {
      errors.push('データセット名が設定されていません');
    }

    if (!dataSet.users || dataSet.users.length === 0) {
      errors.push('ユーザーデータが存在しません');
    }

    if (!dataSet.goals || dataSet.goals.length === 0) {
      errors.push('目標データが存在しません');
    }

    if (!dataSet.metadata) {
      errors.push('メタデータが設定されていません');
    }
  }

  private validateMandalaStructure(dataSet: SeedDataSet, errors: string[]): void {
    for (const goal of dataSet.goals) {
      // サブ目標数チェック
      if (goal.sub_goals.length !== 8) {
        errors.push(
          `目標 "${goal.title}" のサブ目標数が8個ではありません (${goal.sub_goals.length}個)`
        );
      }

      // サブ目標の位置重複チェック
      const subGoalPositions = goal.sub_goals.map(sg => sg.position);
      const uniqueSubGoalPositions = new Set(subGoalPositions);
      if (subGoalPositions.length !== uniqueSubGoalPositions.size) {
        errors.push(`目標 "${goal.title}" でサブ目標の位置が重複しています`);
      }

      // サブ目標の位置範囲チェック
      for (const subGoal of goal.sub_goals) {
        if (subGoal.position < 0 || subGoal.position > 7) {
          errors.push(`サブ目標 "${subGoal.title}" の位置が範囲外です (${subGoal.position})`);
        }

        // アクション数チェック
        if (subGoal.actions.length !== 8) {
          errors.push(
            `サブ目標 "${subGoal.title}" のアクション数が8個ではありません (${subGoal.actions.length}個)`
          );
        }

        // アクションの位置重複チェック
        const actionPositions = subGoal.actions.map(a => a.position);
        const uniqueActionPositions = new Set(actionPositions);
        if (actionPositions.length !== uniqueActionPositions.size) {
          errors.push(`サブ目標 "${subGoal.title}" でアクションの位置が重複しています`);
        }

        // アクションの位置範囲チェック
        for (const action of subGoal.actions) {
          if (action.position < 0 || action.position > 7) {
            errors.push(`アクション "${action.title}" の位置が範囲外です (${action.position})`);
          }
        }
      }
    }
  }

  private validateDataIntegrity(dataSet: SeedDataSet, errors: string[]): void {
    // ユーザーIDの重複チェック
    const userIds = dataSet.users.map(u => u.id);
    const uniqueUserIds = new Set(userIds);
    if (userIds.length !== uniqueUserIds.size) {
      errors.push('ユーザーIDが重複しています');
    }

    // メールアドレスの重複チェック
    const emails = dataSet.users.map(u => u.email);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      errors.push('ユーザーのメールアドレスが重複しています');
    }

    // 目標IDの重複チェック
    const goalIds = dataSet.goals.map(g => g.id);
    const uniqueGoalIds = new Set(goalIds);
    if (goalIds.length !== uniqueGoalIds.size) {
      errors.push('目標IDが重複しています');
    }

    // 外部キー参照チェック
    const validUserIds = new Set(userIds);
    for (const goal of dataSet.goals) {
      if (!validUserIds.has(goal.user_id)) {
        errors.push(
          `目標 "${goal.title}" が存在しないユーザーID "${goal.user_id}" を参照しています`
        );
      }
    }
  }

  private validateConstraints(dataSet: SeedDataSet, errors: string[]): void {
    // 進捗率の範囲チェック
    for (const goal of dataSet.goals) {
      if (goal.progress < 0 || goal.progress > 100) {
        errors.push(`目標 "${goal.title}" の進捗率が範囲外です (${goal.progress}%)`);
      }

      for (const subGoal of goal.sub_goals) {
        if (subGoal.progress < 0 || subGoal.progress > 100) {
          errors.push(`サブ目標 "${subGoal.title}" の進捗率が範囲外です (${subGoal.progress}%)`);
        }

        for (const action of subGoal.actions) {
          if (action.progress < 0 || action.progress > 100) {
            errors.push(`アクション "${action.title}" の進捗率が範囲外です (${action.progress}%)`);
          }

          for (const task of action.tasks) {
            if (task.estimated_minutes <= 0) {
              errors.push(
                `タスク "${task.title}" の推定時間が無効です (${task.estimated_minutes}分)`
              );
            }
          }
        }
      }
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const user of dataSet.users) {
      if (!emailRegex.test(user.email)) {
        errors.push(`ユーザー "${user.name}" のメールアドレス形式が無効です: ${user.email}`);
      }
    }
  }

  generateValidationReport(dataSet: SeedDataSet): string {
    const validation = this.validateDataSet(dataSet);

    let report = `データセット検証レポート: ${dataSet.name}\n`;
    report += `${'='.repeat(50)}\n\n`;

    report += `基本情報:\n`;
    report += `  名前: ${dataSet.name}\n`;
    report += `  環境: ${dataSet.environment}\n`;
    report += `  ユーザー数: ${dataSet.users.length}\n`;
    report += `  目標数: ${dataSet.goals.length}\n`;
    report += `  推定レコード数: ${dataSet.metadata.estimatedRecords}\n\n`;

    if (validation.isValid) {
      report += `✅ 検証結果: 合格\n`;
      report += `すべての検証項目をクリアしました。\n`;
    } else {
      report += `❌ 検証結果: 不合格\n`;
      report += `以下のエラーが見つかりました:\n\n`;

      validation.errors.forEach((error, index) => {
        report += `  ${index + 1}. ${error}\n`;
      });
    }

    return report;
  }
}
