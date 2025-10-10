/**
 * ActionTypeClassifierのテスト
 */

import { ActionTypeClassifier } from '../action-type-classifier.service';
import { ActionType, ActionOutput } from '../../types/action-generation.types';

describe('ActionTypeClassifier', () => {
  let classifier: ActionTypeClassifier;

  beforeEach(() => {
    classifier = new ActionTypeClassifier();
  });

  describe('classifyActionType', () => {
    it('習慣キーワードを含むアクションをHABITと判定する - 毎日', () => {
      const action = {
        title: '毎日TypeScriptコードを書く',
        description: '毎日最低30分はTypeScriptでコードを書き、型システムの理解を深める習慣を作る',
        background: '継続的な実践により、TypeScriptの型システムが自然に身につく',
        position: 0,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.HABIT);
    });

    it('習慣キーワードを含むアクションをHABITと判定する - 継続', () => {
      const action = {
        title: 'TypeScriptの学習を継続する',
        description: '継続的にTypeScriptの学習を行い、理解を深める',
        background: '継続が重要',
        position: 1,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.HABIT);
    });

    it('習慣キーワードを含むアクションをHABITと判定する - 定期的', () => {
      const action = {
        title: '定期的にコードレビューを受ける',
        description: '定期的にコードレビューを受けて、コーディングスキルを向上させる',
        background: '定期的なフィードバックが成長につながる',
        position: 2,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.HABIT);
    });

    it('実行キーワードを含むアクションをEXECUTIONと判定する - 作成', () => {
      const action = {
        title: 'TypeScript公式ドキュメントを読む',
        description:
          'TypeScript公式ドキュメントの基礎編を1日1章ずつ読み進め、サンプルコードを作成して理解を深める',
        background: '公式ドキュメントは最も正確で体系的な情報源である',
        position: 0,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.EXECUTION);
    });

    it('実行キーワードを含むアクションをEXECUTIONと判定する - 実装', () => {
      const action = {
        title: 'サンプルアプリを実装する',
        description: 'TypeScriptでサンプルアプリを実装して、実践的なスキルを身につける',
        background: '実装経験が重要',
        position: 1,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.EXECUTION);
    });

    it('実行キーワードを含むアクションをEXECUTIONと判定する - 登壇', () => {
      const action = {
        title: '技術カンファレンスで登壇する',
        description: '技術カンファレンスで登壇して、学んだ内容を発表する',
        background: 'アウトプットが学習を深める',
        position: 2,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.EXECUTION);
    });

    it('キーワードがない場合デフォルトでEXECUTIONと判定する', () => {
      const action = {
        title: 'TypeScriptを学ぶ',
        description: 'TypeScriptの基礎を学習する',
        background: '基礎が重要',
        position: 0,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.EXECUTION);
    });

    it('習慣キーワードと実行キーワードの両方を含む場合、習慣を優先する', () => {
      const action = {
        title: '毎日サンプルコードを作成する',
        description: '毎日サンプルコードを作成して、TypeScriptの理解を深める',
        background: '継続的な実践が重要',
        position: 0,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.HABIT);
    });

    it('タイトルと説明の両方からキーワードを検出する', () => {
      const action = {
        title: 'TypeScriptを学ぶ',
        description: '毎日TypeScriptの学習を行う',
        background: '基礎が重要',
        position: 0,
      };

      const result = classifier.classifyActionType(action);
      expect(result).toBe(ActionType.HABIT);
    });
  });

  describe('classifyActions', () => {
    it('アクション配列の各アクションに種別を設定する', () => {
      const actions: Omit<ActionOutput, 'type'>[] = [
        {
          title: '毎日コードを書く',
          description: '毎日最低30分はコードを書く習慣を作る',
          background: '継続が重要',
          position: 0,
        },
        {
          title: 'アプリを作成する',
          description: 'サンプルアプリを作成して理解を深める',
          background: '実装経験が重要',
          position: 1,
        },
        {
          title: '学習する',
          description: '基礎を学習する',
          background: '基礎が重要',
          position: 2,
        },
      ];

      const result = classifier.classifyActions(actions);

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe(ActionType.HABIT);
      expect(result[1].type).toBe(ActionType.EXECUTION);
      expect(result[2].type).toBe(ActionType.EXECUTION);
    });

    it('空の配列を渡しても正常に動作する', () => {
      const actions: Omit<ActionOutput, 'type'>[] = [];

      const result = classifier.classifyActions(actions);

      expect(result).toHaveLength(0);
    });

    it('元のアクションオブジェクトを変更しない', () => {
      const actions: Omit<ActionOutput, 'type'>[] = [
        {
          title: '毎日コードを書く',
          description: '毎日最低30分はコードを書く習慣を作る',
          background: '継続が重要',
          position: 0,
        },
      ];

      const originalAction = { ...actions[0] };
      classifier.classifyActions(actions);

      expect(actions[0]).toEqual(originalAction);
    });
  });
});
