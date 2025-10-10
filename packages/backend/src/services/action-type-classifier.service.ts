/**
 * ActionTypeClassifier
 * アクションの種別（実行/習慣）を判定するサービス
 */

import { ActionType, ActionOutput } from '../types/action-generation.types';
import { CLASSIFICATION_RULES } from '../schemas/action-generation.schema';

/**
 * ActionTypeClassifierインターフェース
 */
export interface IActionTypeClassifier {
  /**
   * アクション配列の各アクションに種別を設定する
   * @param actions アクション配列（type未設定）
   * @returns 種別が設定されたアクション配列
   */
  classifyActions(actions: Omit<ActionOutput, 'type'>[]): ActionOutput[];

  /**
   * 単一アクションの種別を判定する
   * @param action アクション（type未設定）
   * @returns アクション種別（EXECUTION/HABIT）
   */
  classifyActionType(action: Omit<ActionOutput, 'type'>): ActionType;
}

/**
 * ActionTypeClassifier実装クラス
 */
export class ActionTypeClassifier implements IActionTypeClassifier {
  /**
   * アクション配列の各アクションに種別を設定する
   * @param actions アクション配列（type未設定）
   * @returns 種別が設定されたアクション配列
   */
  classifyActions(actions: Omit<ActionOutput, 'type'>[]): ActionOutput[] {
    return actions.map(action => ({
      ...action,
      type: this.classifyActionType(action),
    }));
  }

  /**
   * 単一アクションの種別を判定する
   * @param action アクション（type未設定）
   * @returns アクション種別（EXECUTION/HABIT）
   */
  classifyActionType(action: Omit<ActionOutput, 'type'>): ActionType {
    const text = `${action.title} ${action.description}`;

    // 習慣キーワードを含む場合はHABIT
    if (this.containsHabitKeywords(text)) {
      return ActionType.HABIT;
    }

    // 実行キーワードを含む場合はEXECUTION
    if (this.containsExecutionKeywords(text)) {
      return ActionType.EXECUTION;
    }

    // デフォルトはEXECUTION
    return ActionType.EXECUTION;
  }

  /**
   * テキストに習慣キーワードが含まれているかチェック
   * @param text チェック対象のテキスト
   * @returns 習慣キーワードが含まれている場合true
   */
  private containsHabitKeywords(text: string): boolean {
    return CLASSIFICATION_RULES.habitKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * テキストに実行キーワードが含まれているかチェック
   * @param text チェック対象のテキスト
   * @returns 実行キーワードが含まれている場合true
   */
  private containsExecutionKeywords(text: string): boolean {
    return CLASSIFICATION_RULES.executionKeywords.some(keyword => text.includes(keyword));
  }
}
