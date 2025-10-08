import { SubGoalOutput } from '../types/subgoal-generation.types';
import { QUALITY_CRITERIA } from '../schemas/subgoal-generation.schema';
import { QualityError } from '../errors/subgoal-generation.errors';

/**
 * サブ目標品質検証サービスのインターフェース
 */
export interface ISubGoalQualityValidator {
  validateQuality(subGoals: SubGoalOutput[]): void;
  checkCount(subGoals: SubGoalOutput[]): boolean;
  checkTitleLength(subGoals: SubGoalOutput[]): string[];
  checkDescriptionLength(subGoals: SubGoalOutput[]): string[];
  checkBackgroundLength(subGoals: SubGoalOutput[]): string[];
  checkDuplicates(subGoals: SubGoalOutput[]): boolean;
}

/**
 * サブ目標品質検証サービス
 */
export class SubGoalQualityValidator implements ISubGoalQualityValidator {
  validateQuality(subGoals: SubGoalOutput[]): void {
    const errors: string[] = [];

    // 個数チェック
    if (!this.checkCount(subGoals)) {
      throw new QualityError(
        `サブ目標は${QUALITY_CRITERIA.count}個である必要があります（現在: ${subGoals.length}個）`
      );
    }

    // タイトル長チェック
    const titleErrors = this.checkTitleLength(subGoals);
    errors.push(...titleErrors);

    // 説明長チェック
    const descriptionErrors = this.checkDescriptionLength(subGoals);
    errors.push(...descriptionErrors);

    // 背景長チェック
    const backgroundErrors = this.checkBackgroundLength(subGoals);
    errors.push(...backgroundErrors);

    // エラーがある場合は例外をスロー
    if (errors.length > 0) {
      throw new QualityError(`品質基準を満たしていません:\n${errors.join('\n')}`);
    }

    // 重複チェック（警告のみ）
    if (this.checkDuplicates(subGoals)) {
      console.warn('警告: サブ目標のタイトルに重複があります');
    }
  }

  checkCount(subGoals: SubGoalOutput[]): boolean {
    return subGoals.length === QUALITY_CRITERIA.count;
  }

  checkTitleLength(subGoals: SubGoalOutput[]): string[] {
    const errors: string[] = [];
    subGoals.forEach((subGoal, index) => {
      if (subGoal.title.length > QUALITY_CRITERIA.titleMaxLength) {
        errors.push(
          `サブ目標${index + 1}のタイトルが長すぎます（${subGoal.title.length}文字、上限: ${QUALITY_CRITERIA.titleMaxLength}文字）`
        );
      }
    });
    return errors;
  }

  checkDescriptionLength(subGoals: SubGoalOutput[]): string[] {
    const errors: string[] = [];
    subGoals.forEach((subGoal, index) => {
      const length = subGoal.description.length;
      if (length < QUALITY_CRITERIA.descriptionMinLength) {
        errors.push(
          `サブ目標${index + 1}の説明が短すぎます（${length}文字、下限: ${QUALITY_CRITERIA.descriptionMinLength}文字）`
        );
      } else if (length > QUALITY_CRITERIA.descriptionMaxLength) {
        errors.push(
          `サブ目標${index + 1}の説明が長すぎます（${length}文字、上限: ${QUALITY_CRITERIA.descriptionMaxLength}文字）`
        );
      }
    });
    return errors;
  }

  checkBackgroundLength(subGoals: SubGoalOutput[]): string[] {
    const errors: string[] = [];
    subGoals.forEach((subGoal, index) => {
      if (subGoal.background.length > QUALITY_CRITERIA.backgroundMaxLength) {
        errors.push(
          `サブ目標${index + 1}の背景が長すぎます（${subGoal.background.length}文字、上限: ${QUALITY_CRITERIA.backgroundMaxLength}文字）`
        );
      }
    });
    return errors;
  }

  checkDuplicates(subGoals: SubGoalOutput[]): boolean {
    const titles = subGoals.map(sg => sg.title);
    const uniqueTitles = new Set(titles);
    return uniqueTitles.size !== titles.length;
  }
}
