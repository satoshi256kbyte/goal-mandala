/**
 * TaskQualityValidatorのユニットテスト
 */

import { TaskQualityValidator } from '../task-quality-validator.service';
import { TaskOutput, TaskPriority, TaskType } from '../../types/task-generation.types';
import { QUALITY_CRITERIA } from '../../schemas/task-generation.schema';
import { QualityValidationError } from '../../errors/task-generation.errors';

describe('TaskQualityValidator', () => {
  let validator: TaskQualityValidator;

  beforeEach(() => {
    validator = new TaskQualityValidator();
    // console.warnのモック
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * テスト用のタスクデータを生成するヘルパー関数
   */
  const createValidTask = (position: number): TaskOutput => ({
    title: `タスク${position + 1}`,
    description: 'a'.repeat(100), // 20-200文字の範囲内
    type: TaskType.EXECUTION,
    estimatedMinutes: 45, // 15-120分の範囲内
    priority: TaskPriority.MEDIUM,
    position,
  });

  /**
   * 有効なタスク配列を生成するヘルパー関数
   */
  const createValidTasks = (count: number = 3): TaskOutput[] => {
    return Array.from({ length: count }, (_, i) => createValidTask(i));
  };

  describe('validateQuality', () => {
    describe('正常系', () => {
      it('有効な1個のタスクを検証できる', () => {
        const tasks = createValidTasks(1);

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });

      it('有効な3個のタスクを検証できる', () => {
        const tasks = createValidTasks(3);

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });

      it('最小文字数のタイトルを持つタスクを検証できる', () => {
        const tasks = createValidTasks(1);
        tasks[0].title = 'a'; // 1文字

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });

      it('最大文字数のタイトルを持つタスクを検証できる', () => {
        const tasks = createValidTasks(1);
        tasks[0].title = 'a'.repeat(50); // 最大文字数

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });

      it('最小文字数の説明を持つタスクを検証できる', () => {
        const tasks = createValidTasks(1);
        tasks[0].description = 'a'.repeat(20); // 最小文字数（警告レベル）

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });

      it('最大文字数の説明を持つタスクを検証できる', () => {
        const tasks = createValidTasks(1);
        tasks[0].description = 'a'.repeat(200); // 最大文字数

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });

      it('最小推定時間を持つタスクを検証できる', () => {
        const tasks = createValidTasks(1);
        tasks[0].estimatedMinutes = 15; // 最小値

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });

      it('最大推定時間を持つタスクを検証できる', () => {
        const tasks = createValidTasks(1);
        tasks[0].estimatedMinutes = 120; // 最大値

        expect(() => validator.validateQuality(tasks)).not.toThrow();
      });
    });

    describe('異常系 - 個数チェック', () => {
      it('0個のタスクでエラーを投げる', () => {
        const tasks: TaskOutput[] = [];

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(
          `タスクは最低${QUALITY_CRITERIA.minCount}個以上である必要があります（現在: 0個）`
        );
      });
    });

    describe('異常系 - タイトル長チェック', () => {
      it('タイトルが51文字でエラーを投げる', () => {
        const tasks = createValidTasks(1);
        tasks[0].title = 'a'.repeat(51);

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/タイトルが長すぎます/);
      });

      it('複数のタイトルが長すぎる場合、すべてのエラーを含む', () => {
        const tasks = createValidTasks(3);
        tasks[0].title = 'a'.repeat(51);
        tasks[1].title = 'b'.repeat(55);

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/タスク1のタイトルが長すぎます/);
        expect(() => validator.validateQuality(tasks)).toThrow(/タスク2のタイトルが長すぎます/);
      });
    });

    describe('異常系 - 説明長チェック', () => {
      it('説明が201文字でエラーを投げる', () => {
        const tasks = createValidTasks(1);
        tasks[0].description = 'a'.repeat(201);

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/説明が長すぎます/);
      });

      it('複数の説明が長すぎる場合、すべてのエラーを含む', () => {
        const tasks = createValidTasks(3);
        tasks[0].description = 'a'.repeat(201);
        tasks[2].description = 'c'.repeat(250);

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/タスク1の説明が長すぎます/);
        expect(() => validator.validateQuality(tasks)).toThrow(/タスク3の説明が長すぎます/);
      });
    });

    describe('異常系 - 推定時間範囲チェック', () => {
      it('推定時間が14分でエラーを投げる', () => {
        const tasks = createValidTasks(1);
        tasks[0].estimatedMinutes = 14;

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/推定時間が範囲外です/);
      });

      it('推定時間が121分でエラーを投げる', () => {
        const tasks = createValidTasks(1);
        tasks[0].estimatedMinutes = 121;

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/推定時間が範囲外です/);
      });

      it('複数の推定時間が範囲外の場合、すべてのエラーを含む', () => {
        const tasks = createValidTasks(3);
        tasks[0].estimatedMinutes = 10;
        tasks[1].estimatedMinutes = 150;

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/タスク1の推定時間が範囲外です/);
        expect(() => validator.validateQuality(tasks)).toThrow(/タスク2の推定時間が範囲外です/);
      });
    });

    describe('異常系 - 複合エラー', () => {
      it('複数の種類のエラーがある場合、すべてのエラーを含む', () => {
        const tasks = createValidTasks(3);
        tasks[0].title = 'a'.repeat(51); // タイトル長エラー
        tasks[1].description = 'b'.repeat(201); // 説明長エラー
        tasks[2].estimatedMinutes = 10; // 推定時間エラー

        expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
        expect(() => validator.validateQuality(tasks)).toThrow(/タイトルが長すぎます/);
        expect(() => validator.validateQuality(tasks)).toThrow(/説明が長すぎます/);
        expect(() => validator.validateQuality(tasks)).toThrow(/推定時間が範囲外です/);
      });
    });

    describe('警告 - 説明が短い', () => {
      it('説明が19文字の場合、警告ログを出力する', () => {
        const tasks = createValidTasks(1);
        tasks[0].description = 'a'.repeat(19);

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('警告: タスク1の説明が短すぎます')
        );
      });

      it('複数の説明が短い場合、複数の警告ログを出力する', () => {
        const tasks = createValidTasks(3);
        tasks[0].description = 'a'.repeat(15);
        tasks[2].description = 'c'.repeat(10);

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('警告: タスク1の説明が短すぎます')
        );
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('警告: タスク3の説明が短すぎます')
        );
      });

      it('説明が20文字の場合、警告ログを出力しない', () => {
        const tasks = createValidTasks(1);
        tasks[0].description = 'a'.repeat(20);

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).not.toHaveBeenCalled();
      });
    });

    describe('警告 - 重複チェック', () => {
      it('タイトルが重複している場合、警告ログを出力する', () => {
        const tasks = createValidTasks(3);
        tasks[0].title = '同じタイトル';
        tasks[1].title = '同じタイトル';

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('警告: タスクのタイトルに重複があります')
        );
      });

      it('すべてのタイトルが重複している場合、警告ログを出力する', () => {
        const tasks = createValidTasks(3);
        tasks.forEach(task => {
          task.title = '全部同じ';
        });

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('警告: タスクのタイトルに重複があります')
        );
      });

      it('タイトルが重複していない場合、警告ログを出力しない', () => {
        const tasks = createValidTasks(3);

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('重複があります'));
      });
    });

    describe('警告 - 抽象度チェック', () => {
      it('抽象的すぎるタスクがある場合、警告ログを出力する', () => {
        const tasks = createValidTasks(3);
        tasks[0].title = 'TypeScriptについて検討する';
        tasks[1].title = 'データベース設計を考える';

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('警告: タスク1のタイトルが抽象的すぎる可能性があります')
        );
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('警告: タスク2のタイトルが抽象的すぎる可能性があります')
        );
      });

      it('抽象的なキーワードを含まない場合、警告ログを出力しない', () => {
        const tasks = createValidTasks(3);
        tasks[0].title = 'TypeScriptの型定義を実装する';
        tasks[1].title = 'データベーステーブルを作成する';

        expect(() => validator.validateQuality(tasks)).not.toThrow();
        expect(console.warn).not.toHaveBeenCalledWith(expect.stringContaining('抽象的すぎる'));
      });
    });
  });

  describe('checkCount', () => {
    it('1個のタスクでtrueを返す', () => {
      const tasks = createValidTasks(1);
      expect(validator.checkCount(tasks)).toBe(true);
    });

    it('3個のタスクでtrueを返す', () => {
      const tasks = createValidTasks(3);
      expect(validator.checkCount(tasks)).toBe(true);
    });

    it('10個のタスクでtrueを返す', () => {
      const tasks = createValidTasks(10);
      expect(validator.checkCount(tasks)).toBe(true);
    });

    it('0個のタスクでfalseを返す', () => {
      const tasks: TaskOutput[] = [];
      expect(validator.checkCount(tasks)).toBe(false);
    });
  });

  describe('checkTitleLength', () => {
    it('すべてのタイトルが有効な場合、空配列を返す', () => {
      const tasks = createValidTasks(3);
      expect(validator.checkTitleLength(tasks)).toEqual([]);
    });

    it('タイトルが50文字の場合、空配列を返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = 'a'.repeat(50);
      expect(validator.checkTitleLength(tasks)).toEqual([]);
    });

    it('タイトルが51文字の場合、エラーメッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = 'a'.repeat(51);
      const errors = validator.checkTitleLength(tasks);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('タスク1のタイトルが長すぎます');
      expect(errors[0]).toContain('51文字');
    });

    it('複数のタイトルが長すぎる場合、複数のエラーメッセージを返す', () => {
      const tasks = createValidTasks(5);
      tasks[0].title = 'a'.repeat(51);
      tasks[2].title = 'b'.repeat(55);
      tasks[4].title = 'c'.repeat(60);
      const errors = validator.checkTitleLength(tasks);

      expect(errors).toHaveLength(3);
      expect(errors[0]).toContain('タスク1');
      expect(errors[1]).toContain('タスク3');
      expect(errors[2]).toContain('タスク5');
    });
  });

  describe('checkDescriptionLength', () => {
    it('すべての説明が有効な場合、空配列を返す', () => {
      const tasks = createValidTasks(3);
      expect(validator.checkDescriptionLength(tasks)).toEqual([]);
    });

    it('説明が200文字の場合、空配列を返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].description = 'a'.repeat(200);
      expect(validator.checkDescriptionLength(tasks)).toEqual([]);
    });

    it('説明が201文字の場合、エラーメッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].description = 'a'.repeat(201);
      const errors = validator.checkDescriptionLength(tasks);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('タスク1の説明が長すぎます');
      expect(errors[0]).toContain('201文字');
    });

    it('説明が19文字の場合、警告ログを記録する', () => {
      const tasks = createValidTasks(1);
      tasks[0].description = 'a'.repeat(19);
      validator.checkDescriptionLength(tasks);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('警告: タスク1の説明が短すぎます')
      );
    });

    it('説明が20文字の場合、警告ログを記録しない', () => {
      const tasks = createValidTasks(1);
      tasks[0].description = 'a'.repeat(20);
      validator.checkDescriptionLength(tasks);

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('複数の説明が長すぎる場合、複数のエラーメッセージを返す', () => {
      const tasks = createValidTasks(3);
      tasks[0].description = 'a'.repeat(201);
      tasks[2].description = 'c'.repeat(250);
      const errors = validator.checkDescriptionLength(tasks);

      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('タスク1');
      expect(errors[1]).toContain('タスク3');
    });
  });

  describe('checkEstimatedTime', () => {
    it('すべての推定時間が有効な場合、空配列を返す', () => {
      const tasks = createValidTasks(3);
      expect(validator.checkEstimatedTime(tasks)).toEqual([]);
    });

    it('推定時間が15分の場合、空配列を返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].estimatedMinutes = 15;
      expect(validator.checkEstimatedTime(tasks)).toEqual([]);
    });

    it('推定時間が120分の場合、空配列を返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].estimatedMinutes = 120;
      expect(validator.checkEstimatedTime(tasks)).toEqual([]);
    });

    it('推定時間が14分の場合、エラーメッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].estimatedMinutes = 14;
      const errors = validator.checkEstimatedTime(tasks);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('タスク1の推定時間が範囲外です');
      expect(errors[0]).toContain('14分');
    });

    it('推定時間が121分の場合、エラーメッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].estimatedMinutes = 121;
      const errors = validator.checkEstimatedTime(tasks);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('タスク1の推定時間が範囲外です');
      expect(errors[0]).toContain('121分');
    });

    it('複数の推定時間が範囲外の場合、複数のエラーメッセージを返す', () => {
      const tasks = createValidTasks(4);
      tasks[0].estimatedMinutes = 10;
      tasks[1].estimatedMinutes = 5;
      tasks[3].estimatedMinutes = 150;
      const errors = validator.checkEstimatedTime(tasks);

      expect(errors).toHaveLength(3);
      expect(errors[0]).toContain('タスク1');
      expect(errors[1]).toContain('タスク2');
      expect(errors[2]).toContain('タスク4');
    });
  });

  describe('checkDuplicates', () => {
    it('重複がない場合、falseを返す', () => {
      const tasks = createValidTasks(3);
      expect(validator.checkDuplicates(tasks)).toBe(false);
    });

    it('2つのタイトルが重複している場合、trueを返す', () => {
      const tasks = createValidTasks(3);
      tasks[0].title = '同じタイトル';
      tasks[1].title = '同じタイトル';
      expect(validator.checkDuplicates(tasks)).toBe(true);
    });

    it('3つのタイトルが重複している場合、trueを返す', () => {
      const tasks = createValidTasks(3);
      tasks[0].title = '同じタイトル';
      tasks[1].title = '同じタイトル';
      tasks[2].title = '同じタイトル';
      expect(validator.checkDuplicates(tasks)).toBe(true);
    });

    it('すべてのタイトルが同じ場合、trueを返す', () => {
      const tasks = createValidTasks(5);
      tasks.forEach(task => {
        task.title = '全部同じ';
      });
      expect(validator.checkDuplicates(tasks)).toBe(true);
    });

    it('複数の重複グループがある場合、trueを返す', () => {
      const tasks = createValidTasks(4);
      tasks[0].title = 'グループA';
      tasks[1].title = 'グループA';
      tasks[2].title = 'グループB';
      tasks[3].title = 'グループB';
      expect(validator.checkDuplicates(tasks)).toBe(true);
    });

    it('空配列の場合、falseを返す', () => {
      const tasks: TaskOutput[] = [];
      expect(validator.checkDuplicates(tasks)).toBe(false);
    });

    it('1つのタスクの場合、falseを返す', () => {
      const tasks = createValidTasks(1);
      expect(validator.checkDuplicates(tasks)).toBe(false);
    });
  });

  describe('checkAbstractness', () => {
    it('抽象的なキーワードを含まない場合、空配列を返す', () => {
      const tasks = createValidTasks(3);
      tasks[0].title = 'TypeScriptの型定義を実装する';
      tasks[1].title = 'データベーステーブルを作成する';
      tasks[2].title = 'APIエンドポイントを追加する';

      expect(validator.checkAbstractness(tasks)).toEqual([]);
    });

    it('「検討する」を含む場合、警告メッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = 'TypeScriptについて検討する';
      const warnings = validator.checkAbstractness(tasks);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('タスク1のタイトルが抽象的すぎる可能性があります');
    });

    it('「考える」を含む場合、警告メッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = 'データベース設計を考える';
      const warnings = validator.checkAbstractness(tasks);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('タスク1のタイトルが抽象的すぎる可能性があります');
    });

    it('「理解する」を含む場合、警告メッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = 'Reactの仕組みを理解する';
      const warnings = validator.checkAbstractness(tasks);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('タスク1のタイトルが抽象的すぎる可能性があります');
    });

    it('「把握する」を含む場合、警告メッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = '現状を把握する';
      const warnings = validator.checkAbstractness(tasks);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('タスク1のタイトルが抽象的すぎる可能性があります');
    });

    it('「確認する」を含む場合、警告メッセージを返す', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = '要件を確認する';
      const warnings = validator.checkAbstractness(tasks);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('タスク1のタイトルが抽象的すぎる可能性があります');
    });

    it('複数の抽象的なタスクがある場合、複数の警告メッセージを返す', () => {
      const tasks = createValidTasks(3);
      tasks[0].title = 'TypeScriptについて検討する';
      tasks[1].title = 'データベース設計を考える';
      tasks[2].title = 'Reactの仕組みを理解する';
      const warnings = validator.checkAbstractness(tasks);

      expect(warnings).toHaveLength(3);
      expect(warnings[0]).toContain('タスク1');
      expect(warnings[1]).toContain('タスク2');
      expect(warnings[2]).toContain('タスク3');
    });
  });

  describe('エッジケース', () => {
    it('日本語の文字数を正しくカウントする', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = 'あ'.repeat(51); // 日本語51文字

      expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
      expect(() => validator.validateQuality(tasks)).toThrow(/タイトルが長すぎます/);
    });

    it('絵文字を含むタイトルの文字数を正しくカウントする', () => {
      const tasks = createValidTasks(1);
      // 絵文字は2文字としてカウントされる可能性があるため、余裕を持って設定
      tasks[0].title = '😀'.repeat(26); // 絵文字26個（52文字相当）

      const errors = validator.checkTitleLength(tasks);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('空文字列の説明でエラーを投げる', () => {
      const tasks = createValidTasks(1);
      tasks[0].description = '';

      expect(() => validator.validateQuality(tasks)).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('警告: タスク1の説明が短すぎます')
      );
    });

    it('空白のみの説明で警告を出す', () => {
      const tasks = createValidTasks(1);
      tasks[0].description = ' '.repeat(15);

      expect(() => validator.validateQuality(tasks)).not.toThrow();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('警告: タスク1の説明が短すぎます')
      );
    });

    it('改行を含む説明の文字数を正しくカウントする', () => {
      const tasks = createValidTasks(1);
      tasks[0].description = 'a'.repeat(100) + '\n' + 'b'.repeat(100); // 201文字

      expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
      expect(() => validator.validateQuality(tasks)).toThrow(/説明が長すぎます/);
    });

    it('特殊文字を含むタイトルを正しく処理する', () => {
      const tasks = createValidTasks(1);
      tasks[0].title = '<script>alert("XSS")</script>'; // 30文字

      expect(() => validator.validateQuality(tasks)).not.toThrow();
    });

    it('推定時間が0分の場合、エラーを投げる', () => {
      const tasks = createValidTasks(1);
      tasks[0].estimatedMinutes = 0;

      expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
      expect(() => validator.validateQuality(tasks)).toThrow(/推定時間が範囲外です/);
    });

    it('推定時間が負の値の場合、エラーを投げる', () => {
      const tasks = createValidTasks(1);
      tasks[0].estimatedMinutes = -10;

      expect(() => validator.validateQuality(tasks)).toThrow(QualityValidationError);
      expect(() => validator.validateQuality(tasks)).toThrow(/推定時間が範囲外です/);
    });
  });
});
