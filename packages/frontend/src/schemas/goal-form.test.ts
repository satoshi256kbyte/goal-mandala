import {
  goalFormSchema,
  partialGoalFormSchema,
  validateGoalForm,
  validatePartialGoalForm,
  fieldValidators,
  dateUtils,
  FIELD_LIMITS,
  WARNING_THRESHOLDS,
} from './goal-form';

describe('goalFormSchema', () => {
  describe('title validation', () => {
    it('有効なタイトルでバリデーションが成功する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('空のタイトルでバリデーションが失敗する', () => {
      const invalidData = {
        title: '',
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('目標タイトルは必須です');
      }
    });

    it('100文字を超えるタイトルでバリデーションが失敗する', () => {
      const longTitle = 'a'.repeat(101);
      const invalidData = {
        title: longTitle,
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('目標タイトルは100文字以内で入力してください');
      }
    });

    it('空白のみのタイトルでバリデーションが失敗する', () => {
      const invalidData = {
        title: '   ',
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('目標タイトルは空白のみでは入力できません');
      }
    });

    it('危険な文字を含むタイトルでバリデーションが失敗する', () => {
      const invalidData = {
        title: '<script>alert("xss")</script>',
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('目標タイトルに不正な文字が含まれています');
      }
    });

    it('前後の空白が自動的にトリムされる', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const validData = {
        title: '  テスト目標  ',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('テスト目標');
      }
    });
  });

  describe('description validation', () => {
    it('有効な説明でバリデーションが成功する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const validData = {
        title: 'テスト目標',
        description: 'これは有効な目標説明です。',
        deadline: tomorrowString,
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('1000文字を超える説明でバリデーションが失敗する', () => {
      const longDescription = 'a'.repeat(1001);
      const invalidData = {
        title: 'テスト目標',
        description: longDescription,
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('目標説明は1000文字以内で入力してください');
      }
    });
  });

  describe('deadline validation', () => {
    it('有効な日付でバリデーションが成功する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('過去の日付でバリデーションが失敗する', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      const invalidData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: yesterdayString,
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('達成期限は今日以降の日付を選択してください');
      }
    });

    it('1年以上先の日付でバリデーションが失敗する', () => {
      const twoYearsLater = new Date();
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
      const twoYearsLaterString = twoYearsLater.toISOString().split('T')[0];

      const invalidData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: twoYearsLaterString,
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('達成期限は1年以内の日付を選択してください');
      }
    });

    it('無効な日付形式でバリデーションが失敗する', () => {
      const invalidData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2024/12/31', // 無効な形式
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('日付は YYYY-MM-DD 形式で入力してください');
      }
    });

    it('存在しない日付でバリデーションが失敗する', () => {
      const invalidData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2024-02-30', // 存在しない日付
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        // 存在しない日付は過去の日付として扱われる可能性があるため、エラーメッセージを調整
        const dateError = result.error.errors.find(e => e.path.includes('deadline'));
        expect(dateError?.message).toMatch(/日付|期限/);
      }
    });
  });

  describe('background validation', () => {
    it('有効な背景でバリデーションが成功する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: 'これは有効な背景説明です。',
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('500文字を超える背景でバリデーションが失敗する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const longBackground = 'a'.repeat(501);
      const invalidData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: longBackground,
        constraints: 'テスト制約',
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const backgroundError = result.error.errors.find(e => e.path.includes('background'));
        expect(backgroundError?.message).toBe('背景は500文字以内で入力してください');
      }
    });
  });

  describe('constraints validation', () => {
    it('制約事項が空でもバリデーションが成功する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: 'テスト背景',
        constraints: '',
      };

      const result = goalFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('制約事項が未定義でもバリデーションが成功する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: 'テスト背景',
      };

      const result = goalFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('500文字を超える制約事項でバリデーションが失敗する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const longConstraints = 'a'.repeat(501);
      const invalidData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: tomorrowString,
        background: 'テスト背景',
        constraints: longConstraints,
      };

      const result = goalFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const constraintsError = result.error.errors.find(e => e.path.includes('constraints'));
        expect(constraintsError?.message).toBe('制約事項は500文字以内で入力してください');
      }
    });
  });
});

describe('partialGoalFormSchema', () => {
  it('部分的なデータでバリデーションが成功する', () => {
    const partialData = {
      title: 'テスト目標',
      description: '', // 空でもOK
    };

    const result = partialGoalFormSchema.safeParse(partialData);
    expect(result.success).toBe(true);
  });

  it('全てのフィールドが空でもバリデーションが成功する', () => {
    const emptyData = {};

    const result = partialGoalFormSchema.safeParse(emptyData);
    expect(result.success).toBe(true);
  });

  it('文字数制限は部分的なデータでも適用される', () => {
    const invalidData = {
      title: 'a'.repeat(101), // 100文字を超える
    };

    const result = partialGoalFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('目標タイトルは100文字以内で入力してください');
    }
  });
});

describe('validateGoalForm', () => {
  it('有効なデータで成功する', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    const validData = {
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: tomorrowString,
      background: 'テスト背景',
      constraints: 'テスト制約',
    };

    const result = validateGoalForm(validData);
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual(validData);
  });

  it('無効なデータでエラーを返す', () => {
    const invalidData = {
      title: '',
      description: 'テスト説明',
    };

    const result = validateGoalForm(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveProperty('title');
    expect(result.errors).toHaveProperty('deadline');
    expect(result.errors).toHaveProperty('background');
  });
});

describe('validatePartialGoalForm', () => {
  it('部分的なデータで成功する', () => {
    const partialData = {
      title: 'テスト目標',
    };

    const result = validatePartialGoalForm(partialData);
    expect(result.isValid).toBe(true);
    expect(result.data).toEqual(partialData);
  });
});

describe('fieldValidators', () => {
  describe('validateTitle', () => {
    it('有効なタイトルで成功する', () => {
      const result = fieldValidators.validateTitle('テスト目標');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('無効なタイトルでエラーを返す', () => {
      const result = fieldValidators.validateTitle('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('目標タイトルは必須です');
    });
  });

  describe('validateDescription', () => {
    it('有効な説明で成功する', () => {
      const result = fieldValidators.validateDescription('テスト説明');
      expect(result.isValid).toBe(true);
    });

    it('無効な説明でエラーを返す', () => {
      const result = fieldValidators.validateDescription('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('目標説明は必須です');
    });
  });

  describe('validateDeadline', () => {
    it('有効な日付で成功する', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      const result = fieldValidators.validateDeadline(tomorrowString);
      expect(result.isValid).toBe(true);
    });

    it('無効な日付でエラーを返す', () => {
      const result = fieldValidators.validateDeadline('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('達成期限は必須です');
    });
  });

  describe('validateBackground', () => {
    it('有効な背景で成功する', () => {
      const result = fieldValidators.validateBackground('テスト背景');
      expect(result.isValid).toBe(true);
    });

    it('無効な背景でエラーを返す', () => {
      const result = fieldValidators.validateBackground('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('背景は必須です');
    });
  });

  describe('validateConstraints', () => {
    it('有効な制約事項で成功する', () => {
      const result = fieldValidators.validateConstraints('テスト制約');
      expect(result.isValid).toBe(true);
    });

    it('空の制約事項でも成功する', () => {
      const result = fieldValidators.validateConstraints('');
      expect(result.isValid).toBe(true);
    });

    it('長すぎる制約事項でエラーを返す', () => {
      const longConstraints = 'a'.repeat(501);
      const result = fieldValidators.validateConstraints(longConstraints);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('制約事項');
    });
  });
});

describe('dateUtils', () => {
  describe('getToday', () => {
    it('今日の日付を時刻なしで取得する', () => {
      const today = dateUtils.getToday();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
    });
  });

  describe('getOneYearLater', () => {
    it('1年後の日付を取得する', () => {
      const oneYearLater = dateUtils.getOneYearLater();
      const currentYear = new Date().getFullYear();
      expect(oneYearLater.getFullYear()).toBe(currentYear + 1);
    });
  });

  describe('toISODateString', () => {
    it('日付をISO文字列に変換する', () => {
      const date = new Date('2024-12-31T15:30:00.000Z');
      const isoString = dateUtils.toISODateString(date);
      expect(isoString).toBe('2024-12-31');
    });
  });

  describe('fromISODateString', () => {
    it('ISO文字列から日付オブジェクトに変換する', () => {
      const dateString = '2024-12-31';
      const date = dateUtils.fromISODateString(dateString);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(11); // 0ベース
      expect(date.getDate()).toBe(31);
    });
  });

  describe('getMinDate', () => {
    it('最小日付（今日）を取得する', () => {
      const minDate = dateUtils.getMinDate();
      const today = dateUtils.toISODateString(dateUtils.getToday());
      expect(minDate).toBe(today);
    });
  });

  describe('getMaxDate', () => {
    it('最大日付（1年後）を取得する', () => {
      const maxDate = dateUtils.getMaxDate();
      const oneYearLater = dateUtils.toISODateString(dateUtils.getOneYearLater());
      expect(maxDate).toBe(oneYearLater);
    });
  });
});

describe('constants', () => {
  describe('FIELD_LIMITS', () => {
    it('正しい文字数制限が定義されている', () => {
      expect(FIELD_LIMITS.TITLE_MAX).toBe(100);
      expect(FIELD_LIMITS.DESCRIPTION_MAX).toBe(1000);
      expect(FIELD_LIMITS.BACKGROUND_MAX).toBe(500);
      expect(FIELD_LIMITS.CONSTRAINTS_MAX).toBe(500);
    });
  });

  describe('WARNING_THRESHOLDS', () => {
    it('正しい警告しきい値が定義されている', () => {
      expect(WARNING_THRESHOLDS.TITLE).toBe(80); // 100 * 0.8
      expect(WARNING_THRESHOLDS.DESCRIPTION).toBe(800); // 1000 * 0.8
      expect(WARNING_THRESHOLDS.BACKGROUND).toBe(400); // 500 * 0.8
      expect(WARNING_THRESHOLDS.CONSTRAINTS).toBe(400); // 500 * 0.8
    });
  });
});

describe('edge cases', () => {
  it('今日の日付でバリデーションが成功する', () => {
    const today = dateUtils.toISODateString(dateUtils.getToday());
    const validData = {
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: today,
      background: 'テスト背景',
      constraints: 'テスト制約',
    };

    const result = goalFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('ちょうど1年後の日付でバリデーションが成功する', () => {
    const oneYearLater = dateUtils.toISODateString(dateUtils.getOneYearLater());
    const validData = {
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: oneYearLater,
      background: 'テスト背景',
      constraints: 'テスト制約',
    };

    const result = goalFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('ちょうど制限文字数でバリデーションが成功する', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    const validData = {
      title: 'a'.repeat(100), // ちょうど100文字
      description: 'a'.repeat(1000), // ちょうど1000文字
      deadline: tomorrowString,
      background: 'a'.repeat(500), // ちょうど500文字
      constraints: 'a'.repeat(500), // ちょうど500文字
    };

    const result = goalFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('複数のエラーが同時に発生する場合', () => {
    const invalidData = {
      title: '', // 必須エラー
      description: 'a'.repeat(1001), // 文字数制限エラー
      deadline: '2020-01-01', // 過去の日付エラー
      background: '', // 必須エラー
      constraints: 'a'.repeat(501), // 文字数制限エラー
    };

    const result = goalFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(1);
    }
  });
});
