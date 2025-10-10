/**
 * タスク品質検証サービス
 *
 * 生成されたタスクの品質を検証し、品質基準を満たさない場合はエラーを投げる
 */

import { TaskOutput } from '../types/task-generation.types';
import { QUALITY_CRITERIA } from '../schemas/task-generation.schema';
import { QualityValidationError } from '../errors/task-generation.errors';

/**
 * タスク品質検証インターフェース
 */
export interface ITaskQualityValidator {
  /**
   * タスクの品質を検証する
   * @param tasks 検証対象のタスク配列
   * @throws {QualityValidationError} 品質基準を満たさない場合
   */
  validateQuality(tasks: TaskOutput[]): void;

  /**
   * タスク個数をチェックする
   * @param tasks タスク配列
   * @returns 個数が有効な場合true
   */
  checkCount(tasks: TaskOutput[]): boolean;

  /**
   * タイトル長をチェックする
   * @param tasks タスク配列
   * @returns エラーメッセージの配列
   */
  checkTitleLength(tasks: TaskOutput[]): string[];

  /**
   * 説明長をチェックする
   * @param tasks タスク配列
   * @returns エラーメッセージの配列
   */
  checkDescriptionLength(tasks: TaskOutput[]): string[];

  /**
   * 推定時間範囲をチェックする
   * @param tasks タスク配列
   * @returns エラーメッセージの配列
   */
  checkEstimatedTime(tasks: TaskOutput[]): string[];

  /**
   * 重複をチェックする
   * @param tasks タスク配列
   * @returns 重複がある場合true
   */
  checkDuplicates(tasks: TaskOutput[]): boolean;

  /**
   * 抽象度をチェックする
   * @param tasks タスク配列
   * @returns 警告メッセージの配列
   */
  checkAbstractness(tasks: TaskOutput[]): string[];
}

/**
 * タスク品質検証サービスの実装
 */
export class TaskQualityValidator implements ITaskQualityValidator {
  /**
   * タスクの品質を検証する
   */
  validateQuality(tasks: TaskOutput[]): void {
    const errors: string[] = [];

    // 1. 個数チェック
    if (!this.checkCount(tasks)) {
      errors.push(
        `タスクは最低${QUALITY_CRITERIA.minCount}個以上である必要があります（現在: ${tasks.length}個）`
      );
    }

    // 2. タイトル長チェック
    const titleErrors = this.checkTitleLength(tasks);
    errors.push(...titleErrors);

    // 3. 説明長チェック
    const descriptionErrors = this.checkDescriptionLength(tasks);
    errors.push(...descriptionErrors);

    // 4. 推定時間範囲チェック
    const timeErrors = this.checkEstimatedTime(tasks);
    errors.push(...timeErrors);

    // 5. 重複チェック（警告のみ）
    if (this.checkDuplicates(tasks)) {
      console.warn('警告: タスクのタイトルに重複があります');
    }

    // 6. 抽象度チェック（警告のみ）
    const abstractnessWarnings = this.checkAbstractness(tasks);
    abstractnessWarnings.forEach(warning => console.warn(warning));

    // エラーがある場合は例外を投げる
    if (errors.length > 0) {
      throw new QualityValidationError(
        `タスクの品質検証に失敗しました:\n${errors.join('\n')}`,
        errors.map(error => ({ field: 'tasks', message: error }))
      );
    }
  }

  /**
   * タスク個数をチェックする
   */
  checkCount(tasks: TaskOutput[]): boolean {
    return tasks.length >= QUALITY_CRITERIA.minCount;
  }

  /**
   * タイトル長をチェックする
   */
  checkTitleLength(tasks: TaskOutput[]): string[] {
    const errors: string[] = [];

    tasks.forEach((task, index) => {
      const titleLength = task.title.length;
      if (titleLength > QUALITY_CRITERIA.titleMaxLength) {
        errors.push(
          `タスク${index + 1}のタイトルが長すぎます（${titleLength}文字、最大${QUALITY_CRITERIA.titleMaxLength}文字）`
        );
      }
    });

    return errors;
  }

  /**
   * 説明長をチェックする
   */
  checkDescriptionLength(tasks: TaskOutput[]): string[] {
    const errors: string[] = [];

    tasks.forEach((task, index) => {
      const descriptionLength = task.description.length;

      // 警告レベル: 最小文字数未満
      if (descriptionLength < QUALITY_CRITERIA.descriptionMinLength) {
        console.warn(
          `警告: タスク${index + 1}の説明が短すぎます（${descriptionLength}文字、推奨${QUALITY_CRITERIA.descriptionMinLength}文字以上）`
        );
      }

      // エラーレベル: 最大文字数超過
      if (descriptionLength > QUALITY_CRITERIA.descriptionMaxLength) {
        errors.push(
          `タスク${index + 1}の説明が長すぎます（${descriptionLength}文字、最大${QUALITY_CRITERIA.descriptionMaxLength}文字）`
        );
      }
    });

    return errors;
  }

  /**
   * 推定時間範囲をチェックする
   */
  checkEstimatedTime(tasks: TaskOutput[]): string[] {
    const errors: string[] = [];

    tasks.forEach((task, index) => {
      const estimatedMinutes = task.estimatedMinutes;

      if (
        estimatedMinutes < QUALITY_CRITERIA.estimatedMinutesMin ||
        estimatedMinutes > QUALITY_CRITERIA.estimatedMinutesMax
      ) {
        errors.push(
          `タスク${index + 1}の推定時間が範囲外です（${estimatedMinutes}分、範囲${QUALITY_CRITERIA.estimatedMinutesMin}-${QUALITY_CRITERIA.estimatedMinutesMax}分）`
        );
      }
    });

    return errors;
  }

  /**
   * 重複をチェックする
   */
  checkDuplicates(tasks: TaskOutput[]): boolean {
    if (tasks.length <= 1) {
      return false;
    }

    const titles = tasks.map(task => task.title);
    const uniqueTitles = new Set(titles);

    return titles.length !== uniqueTitles.size;
  }

  /**
   * 抽象度をチェックする
   */
  checkAbstractness(tasks: TaskOutput[]): string[] {
    const warnings: string[] = [];

    tasks.forEach((task, index) => {
      const title = task.title;

      // 抽象的すぎるキーワードをチェック
      const hasAbstractKeyword = QUALITY_CRITERIA.abstractnessKeywords.some(keyword =>
        title.includes(keyword)
      );

      if (hasAbstractKeyword) {
        warnings.push(
          `警告: タスク${index + 1}のタイトルが抽象的すぎる可能性があります: "${title}"`
        );
      }
    });

    return warnings;
  }
}
