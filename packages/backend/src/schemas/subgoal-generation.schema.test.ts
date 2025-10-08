/**
 * サブ目標生成APIバリデーションスキーマのテスト
 */

import { describe, it, expect } from '@jest/globals';
import {
  SubGoalGenerationRequestSchema,
  SubGoalOutputSchema,
  SubGoalsArraySchema,
  VALIDATION_RULES,
  QUALITY_CRITERIA,
} from './subgoal-generation.schema';

describe('SubGoalGenerationRequestSchema', () => {
  describe('有効なリクエスト', () => {
    it('全ての必須フィールドが正しい場合、検証に成功する', () => {
      const validRequest = {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得し、実務で活用できるレベルになる',
        deadline: '2025-12-31T23:59:59Z',
        background: 'フロントエンド開発者として、型安全性の高いコードを書けるようになりたい',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('オプショナルフィールド（constraints）を含む場合、検証に成功する', () => {
      const validRequest = {
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: '2025-12-31T23:59:59Z',
        background: 'フロントエンド開発者として成長したい',
        constraints: '平日は2時間、週末は4時間の学習時間を確保できる',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('オプショナルフィールド（goalId）を含む場合、検証に成功する', () => {
      const validRequest = {
        goalId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'TypeScriptのエキスパートになる',
        description: '6ヶ月でTypeScriptの高度な機能を習得する',
        deadline: '2025-12-31T23:59:59Z',
        background: 'フロントエンド開発者として成長したい',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('titleフィールドのバリデーション', () => {
    it('titleが空文字列の場合、エラーを返す', () => {
      const invalidRequest = {
        title: '',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('目標タイトルは必須です');
      }
    });

    it('titleが200文字を超える場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'a'.repeat(201),
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('200文字以内');
      }
    });

    it('titleが200文字ちょうどの場合、検証に成功する', () => {
      const validRequest = {
        title: 'a'.repeat(200),
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('titleが欠けている場合、エラーを返す', () => {
      const invalidRequest = {
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('descriptionフィールドのバリデーション', () => {
    it('descriptionが空文字列の場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'タイトル',
        description: '',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('目標説明は必須です');
      }
    });

    it('descriptionが2000文字を超える場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'タイトル',
        description: 'a'.repeat(2001),
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('2000文字以内');
      }
    });

    it('descriptionが2000文字ちょうどの場合、検証に成功する', () => {
      const validRequest = {
        title: 'タイトル',
        description: 'a'.repeat(2000),
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('deadlineフィールドのバリデーション', () => {
    it('deadlineが過去の日付の場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2020-01-01T00:00:00Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('未来の日付');
      }
    });

    it('deadlineが不正な形式の場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('日時形式');
      }
    });

    it('deadlineが未来の日付の場合、検証に成功する', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const validRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: futureDate.toISOString(),
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('backgroundフィールドのバリデーション', () => {
    it('backgroundが空文字列の場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('背景情報は必須です');
      }
    });

    it('backgroundが1000文字を超える場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'a'.repeat(1001),
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('1000文字以内');
      }
    });

    it('backgroundが1000文字ちょうどの場合、検証に成功する', () => {
      const validRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: 'a'.repeat(1000),
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('constraintsフィールドのバリデーション', () => {
    it('constraintsが1000文字を超える場合、エラーを返す', () => {
      const invalidRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
        constraints: 'a'.repeat(1001),
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('1000文字以内');
      }
    });

    it('constraintsが1000文字ちょうどの場合、検証に成功する', () => {
      const validRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
        constraints: 'a'.repeat(1000),
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('constraintsが空文字列の場合、検証に成功する', () => {
      const validRequest = {
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
        constraints: '',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('goalIdフィールドのバリデーション', () => {
    it('goalIdが不正なUUID形式の場合、エラーを返す', () => {
      const invalidRequest = {
        goalId: 'invalid-uuid',
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('goalIdが正しいUUID形式の場合、検証に成功する', () => {
      const validRequest = {
        goalId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: '説明',
        deadline: '2025-12-31T23:59:59Z',
        background: '背景',
      };

      const result = SubGoalGenerationRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });
});

describe('SubGoalOutputSchema', () => {
  describe('有効なサブ目標出力', () => {
    it('全てのフィールドが正しい場合、検証に成功する', () => {
      const validOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'TypeScriptの基礎文法を習得する',
        description:
          '型システム、インターフェース、ジェネリクスなどの基本概念を理解し、実践できるようになる。これにより、より安全で保守性の高いコードを書くことができる。',
        background: 'TypeScriptの基礎がなければ、高度な機能を理解することは困難である',
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('titleフィールドのバリデーション', () => {
    it('titleが30文字を超える場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'a'.repeat(31),
        description: 'a'.repeat(100),
        background: '背景',
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('30文字以内');
      }
    });

    it('titleが30文字ちょうどの場合、検証に成功する', () => {
      const validOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'a'.repeat(30),
        description: 'a'.repeat(100),
        background: '背景',
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('descriptionフィールドのバリデーション', () => {
    it('descriptionが50文字未満の場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(49),
        background: '背景',
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('50文字以上');
      }
    });

    it('descriptionが200文字を超える場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(201),
        background: '背景',
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('200文字以内');
      }
    });

    it('descriptionが50文字ちょうどの場合、検証に成功する', () => {
      const validOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(50),
        background: '背景',
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('descriptionが200文字ちょうどの場合、検証に成功する', () => {
      const validOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(200),
        background: '背景',
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('backgroundフィールドのバリデーション', () => {
    it('backgroundが100文字を超える場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(100),
        background: 'a'.repeat(101),
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100文字以内');
      }
    });

    it('backgroundが100文字ちょうどの場合、検証に成功する', () => {
      const validOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(100),
        background: 'a'.repeat(100),
        position: 0,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('positionフィールドのバリデーション', () => {
    it('positionが0未満の場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(100),
        background: '背景',
        position: -1,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('positionが7を超える場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(100),
        background: '背景',
        position: 8,
        progress: 0,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('positionが0から7の範囲内の場合、検証に成功する', () => {
      for (let i = 0; i <= 7; i++) {
        const validOutput = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'タイトル',
          description: 'a'.repeat(100),
          background: '背景',
          position: i,
          progress: 0,
          createdAt: '2025-10-07T10:00:00Z',
          updatedAt: '2025-10-07T10:00:00Z',
        };

        const result = SubGoalOutputSchema.safeParse(validOutput);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('progressフィールドのバリデーション', () => {
    it('progressが0未満の場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(100),
        background: '背景',
        position: 0,
        progress: -1,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('progressが100を超える場合、エラーを返す', () => {
      const invalidOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(100),
        background: '背景',
        position: 0,
        progress: 101,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('progressが0から100の範囲内の場合、検証に成功する', () => {
      const validOutput = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'タイトル',
        description: 'a'.repeat(100),
        background: '背景',
        position: 0,
        progress: 50,
        createdAt: '2025-10-07T10:00:00Z',
        updatedAt: '2025-10-07T10:00:00Z',
      };

      const result = SubGoalOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });
});

describe('SubGoalsArraySchema', () => {
  it('8個のサブ目標がある場合、検証に成功する', () => {
    const validArray = Array.from({ length: 8 }, (_, i) => ({
      id: `123e4567-e89b-12d3-a456-42661417400${i}`,
      title: `サブ目標${i + 1}`,
      description: 'a'.repeat(100),
      background: '背景',
      position: i,
      progress: 0,
      createdAt: '2025-10-07T10:00:00Z',
      updatedAt: '2025-10-07T10:00:00Z',
    }));

    const result = SubGoalsArraySchema.safeParse(validArray);
    expect(result.success).toBe(true);
  });

  it('7個のサブ目標の場合、エラーを返す', () => {
    const invalidArray = Array.from({ length: 7 }, (_, i) => ({
      id: `123e4567-e89b-12d3-a456-42661417400${i}`,
      title: `サブ目標${i + 1}`,
      description: 'a'.repeat(100),
      background: '背景',
      position: i,
      progress: 0,
      createdAt: '2025-10-07T10:00:00Z',
      updatedAt: '2025-10-07T10:00:00Z',
    }));

    const result = SubGoalsArraySchema.safeParse(invalidArray);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8個');
    }
  });

  it('9個のサブ目標の場合、エラーを返す', () => {
    const invalidArray = Array.from({ length: 9 }, (_, i) => ({
      id: `123e4567-e89b-12d3-a456-42661417400${i}`,
      title: `サブ目標${i + 1}`,
      description: 'a'.repeat(100),
      background: '背景',
      position: i,
      progress: 0,
      createdAt: '2025-10-07T10:00:00Z',
      updatedAt: '2025-10-07T10:00:00Z',
    }));

    const result = SubGoalsArraySchema.safeParse(invalidArray);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8個');
    }
  });

  it('空配列の場合、エラーを返す', () => {
    const result = SubGoalsArraySchema.safeParse([]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('8個');
    }
  });
});

describe('VALIDATION_RULES', () => {
  it('正しい定数値が定義されている', () => {
    expect(VALIDATION_RULES.title.required).toBe(true);
    expect(VALIDATION_RULES.title.minLength).toBe(1);
    expect(VALIDATION_RULES.title.maxLength).toBe(200);

    expect(VALIDATION_RULES.description.required).toBe(true);
    expect(VALIDATION_RULES.description.minLength).toBe(1);
    expect(VALIDATION_RULES.description.maxLength).toBe(2000);

    expect(VALIDATION_RULES.deadline.required).toBe(true);
    expect(VALIDATION_RULES.deadline.format).toBe('ISO8601');
    expect(VALIDATION_RULES.deadline.minDate).toBe('now');

    expect(VALIDATION_RULES.background.required).toBe(true);
    expect(VALIDATION_RULES.background.minLength).toBe(1);
    expect(VALIDATION_RULES.background.maxLength).toBe(1000);

    expect(VALIDATION_RULES.constraints.required).toBe(false);
    expect(VALIDATION_RULES.constraints.maxLength).toBe(1000);
  });
});

describe('QUALITY_CRITERIA', () => {
  it('正しい定数値が定義されている', () => {
    expect(QUALITY_CRITERIA.count).toBe(8);
    expect(QUALITY_CRITERIA.titleMaxLength).toBe(30);
    expect(QUALITY_CRITERIA.descriptionMinLength).toBe(50);
    expect(QUALITY_CRITERIA.descriptionMaxLength).toBe(200);
    expect(QUALITY_CRITERIA.backgroundMaxLength).toBe(100);
    expect(QUALITY_CRITERIA.allowDuplicateTitles).toBe(false);
  });
});
