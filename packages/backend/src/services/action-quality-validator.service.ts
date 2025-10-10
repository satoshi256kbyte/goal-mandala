/**
 * アクション品質検証サービス
 */

import { QualityError } from '../errors/action-generation.errors';
import { QUALITY_CRITERIA } from '../schemas/action-generation.schema';
import { ActionOutput } from '../types/action-generation.types';

/**
 * アクション品質検証サービスのインターフェース
 */
export interface IActionQualityValidator {
  /**
   * アクションの品質を検証する
   * @param actions 検証対象のアクション配列
   * @throws {QualityError} 品質基準を満たさない場合
   */
  validateQuality(actions: ActionOutput[]): void;

  /**
   * 2つのテキストの類似度を計算する（Jaccard係数）
   * @param text1 テキスト1
   * @param text2 テキスト2
   * @returns 類似度（0.0-1.0）
   */
  calculateSimilarity(text1: string, text2: string): number;
}

/**
 * アクション品質検証サービス
 */
export class ActionQualityValidator implements IActionQualityValidator {
  /**
   * アクションの品質を検証する
   */
  public validateQuality(actions: ActionOutput[]): void {
    // 個数チェック
    this.checkCount(actions);

    // 各アクションの文字数チェック
    actions.forEach((action, index) => {
      this.checkTitleLength(action, index);
      this.checkDescriptionLength(action, index);
      this.checkBackgroundLength(action, index);
    });

    // 重複チェック
    this.checkDuplicates(actions);

    // 類似度チェック
    this.checkSimilarity(actions);
  }

  /**
   * アクション個数をチェックする
   */
  private checkCount(actions: ActionOutput[]): void {
    if (actions.length !== QUALITY_CRITERIA.count) {
      throw new QualityError(
        `アクションは${QUALITY_CRITERIA.count}個である必要があります（現在: ${actions.length}個）`
      );
    }
  }

  /**
   * タイトルの文字数をチェックする
   */
  private checkTitleLength(action: ActionOutput, index: number): void {
    if (action.title.length > QUALITY_CRITERIA.titleMaxLength) {
      throw new QualityError(
        `アクション${index + 1}のタイトルが長すぎます（${action.title.length}文字、最大${QUALITY_CRITERIA.titleMaxLength}文字）`
      );
    }
  }

  /**
   * 説明の文字数をチェックする
   */
  private checkDescriptionLength(action: ActionOutput, index: number): void {
    const length = action.description.length;

    if (length < QUALITY_CRITERIA.descriptionMinLength) {
      throw new QualityError(
        `アクション${index + 1}の説明が短すぎます（${length}文字、最小${QUALITY_CRITERIA.descriptionMinLength}文字）`
      );
    }

    if (length > QUALITY_CRITERIA.descriptionMaxLength) {
      throw new QualityError(
        `アクション${index + 1}の説明が長すぎます（${length}文字、最大${QUALITY_CRITERIA.descriptionMaxLength}文字）`
      );
    }
  }

  /**
   * 背景の文字数をチェックする
   */
  private checkBackgroundLength(action: ActionOutput, index: number): void {
    if (action.background.length > QUALITY_CRITERIA.backgroundMaxLength) {
      throw new QualityError(
        `アクション${index + 1}の背景が長すぎます（${action.background.length}文字、最大${QUALITY_CRITERIA.backgroundMaxLength}文字）`
      );
    }
  }

  /**
   * タイトルの重複をチェックする
   */
  private checkDuplicates(actions: ActionOutput[]): void {
    const titles = actions.map(a => a.title);
    const uniqueTitles = new Set(titles);

    if (uniqueTitles.size !== titles.length) {
      console.warn('警告: アクションのタイトルに重複があります');
    }
  }

  /**
   * 説明の類似度をチェックする
   */
  private checkSimilarity(actions: ActionOutput[]): void {
    for (let i = 0; i < actions.length; i++) {
      for (let j = i + 1; j < actions.length; j++) {
        const similarity = this.calculateSimilarity(actions[i].description, actions[j].description);

        if (similarity > QUALITY_CRITERIA.similarityThreshold) {
          console.warn(
            `警告: アクション${i + 1}とアクション${j + 1}の説明が類似しています（類似度: ${similarity.toFixed(2)}）`
          );
        }
      }
    }
  }

  /**
   * 2つのテキストの類似度を計算する（Jaccard係数）
   */
  public calculateSimilarity(text1: string, text2: string): number {
    // 空文字列の場合は0.0を返す
    if (!text1 || !text2) {
      return 0.0;
    }

    // テキストを単語に分割してSetに変換
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 0));

    // 空のSetの場合は0.0を返す
    if (words1.size === 0 || words2.size === 0) {
      return 0.0;
    }

    // 積集合（共通する単語）
    const intersection = new Set([...words1].filter(x => words2.has(x)));

    // 和集合（全ての単語）
    const union = new Set([...words1, ...words2]);

    // Jaccard係数 = 積集合のサイズ / 和集合のサイズ
    return intersection.size / union.size;
  }
}
