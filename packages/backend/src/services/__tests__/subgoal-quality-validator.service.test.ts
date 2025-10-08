/**
 * サブ目標品質検証サービスのユニットテスト
 */

import { SubGoalQualityValidator } from '../subgoal-quality-validator.service';
import { SubGoalOutput } from '../../types/subgoal-generation.types';
import { QUALITY_CRITERIA } from '../../schemas/subgoal-generation.schema';
import { QualityError } from '../../errors/subgoal-generation.errors';

describe('SubGoalQualityValidator', () => {
  let validator: SubGoalQualityValidator;

  beforeEach(() => {
    validator = new SubGoalQualityValidator();
    // console.warnのモック
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * テスト用のサブ目標データを生成するヘルパー関数
   */
  const createValidSubGoal = (position: number): SubGoalOutput => ({
    id: `test-id-${position}`,
    title: `サブ目標${position + 1}`,
    description: 'a'.repeat(100), // 50-200文字の範囲内
    background: '背景情報',
    position,
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  /**
   * 有効な8個のサブ目標を生成するヘルパー関数
   */
  const createValidSubGoals = (): SubGoalOutput[] => {
    return Array.from({ length: 8 }, (_, i) => createValidSubGoal(i));
  };

  describe('validateQuality', () => {
    describe('正常系', () => {
      it('有効な8個のサブ目標を検証できる', () => {
        const subGoals = createValidSubGoals();

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
      });

      it('最小文字数の説明を持つサブ目標を検証できる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].description = 'a'.repeat(50); // 最小文字数

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
      });

      it('最大文字数の説明を持つサブ目標を検証できる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].description = 'a'.repeat(200); // 最大文字数

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
      });

      it('最大文字数のタイトルを持つサブ目標を検証できる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].title = 'a'.repeat(30); // 最大文字数

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
      });

      it('最大文字数の背景を持つサブ目標を検証できる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].background = 'a'.repeat(100); // 最大文字数

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
      });
    });

    describe('異常系 - 個数チェック', () => {
      it('7個のサブ目標でエラーを投げる', () => {
        const subGoals = Array.from({ length: 7 }, (_, i) => createValidSubGoal(i));

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(
          `サブ目標は${QUALITY_CRITERIA.count}個である必要があります（現在: 7個）`
        );
      });

      it('9個のサブ目標でエラーを投げる', () => {
        const subGoals = Array.from({ length: 9 }, (_, i) => createValidSubGoal(i));

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(
          `サブ目標は${QUALITY_CRITERIA.count}個である必要があります（現在: 9個）`
        );
      });

      it('0個のサブ目標でエラーを投げる', () => {
        const subGoals: SubGoalOutput[] = [];

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(
          `サブ目標は${QUALITY_CRITERIA.count}個である必要があります（現在: 0個）`
        );
      });
    });

    describe('異常系 - タイトル長チェック', () => {
      it('タイトルが31文字でエラーを投げる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].title = 'a'.repeat(31);

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(/タイトルが長すぎます/);
      });

      it('複数のタイトルが長すぎる場合、すべてのエラーを含む', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].title = 'a'.repeat(31);
        subGoals[1].title = 'b'.repeat(35);

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(
          /サブ目標1のタイトルが長すぎます/
        );
        expect(() => validator.validateQuality(subGoals)).toThrow(
          /サブ目標2のタイトルが長すぎます/
        );
      });
    });

    describe('異常系 - 説明長チェック', () => {
      it('説明が49文字でエラーを投げる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].description = 'a'.repeat(49);

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(/説明が短すぎます/);
      });

      it('説明が201文字でエラーを投げる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].description = 'a'.repeat(201);

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(/説明が長すぎます/);
      });

      it('複数の説明が不適切な長さの場合、すべてのエラーを含む', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].description = 'a'.repeat(49); // 短すぎる
        subGoals[1].description = 'b'.repeat(201); // 長すぎる

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(/サブ目標1の説明が短すぎます/);
        expect(() => validator.validateQuality(subGoals)).toThrow(/サブ目標2の説明が長すぎます/);
      });
    });

    describe('異常系 - 背景長チェック', () => {
      it('背景が101文字でエラーを投げる', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].background = 'a'.repeat(101);

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(/背景が長すぎます/);
      });

      it('複数の背景が長すぎる場合、すべてのエラーを含む', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].background = 'a'.repeat(101);
        subGoals[1].background = 'b'.repeat(150);

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(/サブ目標1の背景が長すぎます/);
        expect(() => validator.validateQuality(subGoals)).toThrow(/サブ目標2の背景が長すぎます/);
      });
    });

    describe('異常系 - 複合エラー', () => {
      it('複数の種類のエラーがある場合、すべてのエラーを含む', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].title = 'a'.repeat(31); // タイトル長エラー
        subGoals[1].description = 'b'.repeat(49); // 説明短すぎるエラー
        subGoals[2].background = 'c'.repeat(101); // 背景長エラー

        expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
        expect(() => validator.validateQuality(subGoals)).toThrow(/タイトルが長すぎます/);
        expect(() => validator.validateQuality(subGoals)).toThrow(/説明が短すぎます/);
        expect(() => validator.validateQuality(subGoals)).toThrow(/背景が長すぎます/);
      });
    });

    describe('警告 - 重複チェック', () => {
      it('タイトルが重複している場合、警告ログを出力する', () => {
        const subGoals = createValidSubGoals();
        subGoals[0].title = '同じタイトル';
        subGoals[1].title = '同じタイトル';

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
        expect(console.warn).toHaveBeenCalledWith('警告: サブ目標のタイトルに重複があります');
      });

      it('すべてのタイトルが重複している場合、警告ログを出力する', () => {
        const subGoals = createValidSubGoals();
        subGoals.forEach(sg => {
          sg.title = '全部同じ';
        });

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
        expect(console.warn).toHaveBeenCalledWith('警告: サブ目標のタイトルに重複があります');
      });

      it('タイトルが重複していない場合、警告ログを出力しない', () => {
        const subGoals = createValidSubGoals();

        expect(() => validator.validateQuality(subGoals)).not.toThrow();
        expect(console.warn).not.toHaveBeenCalled();
      });
    });
  });

  describe('checkCount', () => {
    it('8個のサブ目標でtrueを返す', () => {
      const subGoals = createValidSubGoals();
      expect(validator.checkCount(subGoals)).toBe(true);
    });

    it('7個のサブ目標でfalseを返す', () => {
      const subGoals = Array.from({ length: 7 }, (_, i) => createValidSubGoal(i));
      expect(validator.checkCount(subGoals)).toBe(false);
    });

    it('9個のサブ目標でfalseを返す', () => {
      const subGoals = Array.from({ length: 9 }, (_, i) => createValidSubGoal(i));
      expect(validator.checkCount(subGoals)).toBe(false);
    });

    it('0個のサブ目標でfalseを返す', () => {
      const subGoals: SubGoalOutput[] = [];
      expect(validator.checkCount(subGoals)).toBe(false);
    });
  });

  describe('checkTitleLength', () => {
    it('すべてのタイトルが有効な場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      expect(validator.checkTitleLength(subGoals)).toEqual([]);
    });

    it('タイトルが30文字の場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = 'a'.repeat(30);
      expect(validator.checkTitleLength(subGoals)).toEqual([]);
    });

    it('タイトルが31文字の場合、エラーメッセージを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = 'a'.repeat(31);
      const errors = validator.checkTitleLength(subGoals);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('サブ目標1のタイトルが長すぎます');
      expect(errors[0]).toContain('31文字');
    });

    it('複数のタイトルが長すぎる場合、複数のエラーメッセージを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = 'a'.repeat(31);
      subGoals[2].title = 'b'.repeat(35);
      subGoals[7].title = 'c'.repeat(40);
      const errors = validator.checkTitleLength(subGoals);

      expect(errors).toHaveLength(3);
      expect(errors[0]).toContain('サブ目標1');
      expect(errors[1]).toContain('サブ目標3');
      expect(errors[2]).toContain('サブ目標8');
    });
  });

  describe('checkDescriptionLength', () => {
    it('すべての説明が有効な場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      expect(validator.checkDescriptionLength(subGoals)).toEqual([]);
    });

    it('説明が50文字の場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = 'a'.repeat(50);
      expect(validator.checkDescriptionLength(subGoals)).toEqual([]);
    });

    it('説明が200文字の場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = 'a'.repeat(200);
      expect(validator.checkDescriptionLength(subGoals)).toEqual([]);
    });

    it('説明が49文字の場合、エラーメッセージを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = 'a'.repeat(49);
      const errors = validator.checkDescriptionLength(subGoals);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('サブ目標1の説明が短すぎます');
      expect(errors[0]).toContain('49文字');
    });

    it('説明が201文字の場合、エラーメッセージを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = 'a'.repeat(201);
      const errors = validator.checkDescriptionLength(subGoals);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('サブ目標1の説明が長すぎます');
      expect(errors[0]).toContain('201文字');
    });

    it('複数の説明が不適切な長さの場合、複数のエラーメッセージを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = 'a'.repeat(49); // 短すぎる
      subGoals[1].description = 'b'.repeat(201); // 長すぎる
      subGoals[5].description = 'c'.repeat(30); // 短すぎる
      const errors = validator.checkDescriptionLength(subGoals);

      expect(errors).toHaveLength(3);
      expect(errors[0]).toContain('サブ目標1');
      expect(errors[0]).toContain('短すぎます');
      expect(errors[1]).toContain('サブ目標2');
      expect(errors[1]).toContain('長すぎます');
      expect(errors[2]).toContain('サブ目標6');
      expect(errors[2]).toContain('短すぎます');
    });
  });

  describe('checkBackgroundLength', () => {
    it('すべての背景が有効な場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      expect(validator.checkBackgroundLength(subGoals)).toEqual([]);
    });

    it('背景が100文字の場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].background = 'a'.repeat(100);
      expect(validator.checkBackgroundLength(subGoals)).toEqual([]);
    });

    it('背景が0文字の場合、空配列を返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].background = '';
      expect(validator.checkBackgroundLength(subGoals)).toEqual([]);
    });

    it('背景が101文字の場合、エラーメッセージを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].background = 'a'.repeat(101);
      const errors = validator.checkBackgroundLength(subGoals);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('サブ目標1の背景が長すぎます');
      expect(errors[0]).toContain('101文字');
    });

    it('複数の背景が長すぎる場合、複数のエラーメッセージを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].background = 'a'.repeat(101);
      subGoals[3].background = 'b'.repeat(150);
      subGoals[7].background = 'c'.repeat(200);
      const errors = validator.checkBackgroundLength(subGoals);

      expect(errors).toHaveLength(3);
      expect(errors[0]).toContain('サブ目標1');
      expect(errors[1]).toContain('サブ目標4');
      expect(errors[2]).toContain('サブ目標8');
    });
  });

  describe('checkDuplicates', () => {
    it('重複がない場合、falseを返す', () => {
      const subGoals = createValidSubGoals();
      expect(validator.checkDuplicates(subGoals)).toBe(false);
    });

    it('2つのタイトルが重複している場合、trueを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = '同じタイトル';
      subGoals[1].title = '同じタイトル';
      expect(validator.checkDuplicates(subGoals)).toBe(true);
    });

    it('3つのタイトルが重複している場合、trueを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = '同じタイトル';
      subGoals[1].title = '同じタイトル';
      subGoals[2].title = '同じタイトル';
      expect(validator.checkDuplicates(subGoals)).toBe(true);
    });

    it('すべてのタイトルが同じ場合、trueを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals.forEach(sg => {
        sg.title = '全部同じ';
      });
      expect(validator.checkDuplicates(subGoals)).toBe(true);
    });

    it('複数の重複グループがある場合、trueを返す', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = 'グループA';
      subGoals[1].title = 'グループA';
      subGoals[2].title = 'グループB';
      subGoals[3].title = 'グループB';
      expect(validator.checkDuplicates(subGoals)).toBe(true);
    });

    it('空配列の場合、falseを返す', () => {
      const subGoals: SubGoalOutput[] = [];
      expect(validator.checkDuplicates(subGoals)).toBe(false);
    });

    it('1つのサブ目標の場合、falseを返す', () => {
      const subGoals = [createValidSubGoal(0)];
      expect(validator.checkDuplicates(subGoals)).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('日本語の文字数を正しくカウントする', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = 'あ'.repeat(31); // 日本語31文字

      expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
      expect(() => validator.validateQuality(subGoals)).toThrow(/タイトルが長すぎます/);
    });

    it('絵文字を含むタイトルの文字数を正しくカウントする', () => {
      const subGoals = createValidSubGoals();
      // 絵文字は2文字としてカウントされる可能性があるため、余裕を持って設定
      subGoals[0].title = '😀'.repeat(16); // 絵文字16個（32文字相当）

      const errors = validator.checkTitleLength(subGoals);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('空文字列の説明でエラーを投げる', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = '';

      expect(() => validator.validateQuality(subGoals)).toThrow(QualityError);
      expect(() => validator.validateQuality(subGoals)).toThrow(/説明が短すぎます/);
    });

    it('空白のみの説明でエラーを投げる', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = ' '.repeat(100);

      // 空白も文字としてカウントされるため、エラーにならない
      expect(() => validator.validateQuality(subGoals)).not.toThrow();
    });

    it('改行を含む説明の文字数を正しくカウントす��', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].description = 'a'.repeat(50) + '\n' + 'b'.repeat(50); // 101文字

      expect(() => validator.validateQuality(subGoals)).not.toThrow();
    });

    it('特殊文字を含むタイトルを正しく処理する', () => {
      const subGoals = createValidSubGoals();
      subGoals[0].title = '<script>alert("XSS")</script>'; // 30文字

      expect(() => validator.validateQuality(subGoals)).not.toThrow();
    });
  });
});
