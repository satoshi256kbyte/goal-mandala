import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import {
  useRealtimeValidation,
  useFieldValidation,
  useFormValidation,
} from './useRealtimeValidation';

describe('useRealtimeValidation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('基本的なバリデーション機能', () => {
    it('フィールドのバリデーションが正常に動作する', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      act(() => {
        result.current.validateField('title', 'テスト目標');
      });

      const validation = result.current.getFieldValidation('title');
      expect(validation.isValid).toBe(true);
    });

    it('無効な値でバリデーションエラーが発生する', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      act(() => {
        result.current.validateField('title', '');
      });

      const validation = result.current.getFieldValidation('title');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('目標タイトルは必須です');
    });

    it('文字数制限を超えた場合にエラーが発生する', () => {
      const { result } = renderHook(() => useRealtimeValidation());
      const longTitle = 'a'.repeat(101); // 100文字を超える

      act(() => {
        result.current.validateField('title', longTitle);
      });

      const validation = result.current.getFieldValidation('title');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('目標タイトルは100文字以内で入力してください');
    });
  });

  describe('デバウンス機能', () => {
    it('デバウンス付きバリデーションが正常に動作する', () => {
      const { result } = renderHook(() => useRealtimeValidation({ debounceMs: 300 }));

      act(() => {
        result.current.debouncedValidate('title', 'テスト目標');
      });

      // デバウンス中はバリデーション中状態
      expect(result.current.isValidating).toBe(true);

      // タイマーを進める
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // バリデーション完了
      expect(result.current.isValidating).toBe(false);
      const validation = result.current.getFieldValidation('title');
      expect(validation.isValid).toBe(true);
    });

    it('連続した入力でデバウンスが正常に動作する', () => {
      const { result } = renderHook(() => useRealtimeValidation({ debounceMs: 300 }));

      // 連続して入力
      act(() => {
        result.current.debouncedValidate('title', 'テ');
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.debouncedValidate('title', 'テス');
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      act(() => {
        result.current.debouncedValidate('title', 'テスト');
      });

      // 最初の2つの入力はキャンセルされ、最後の入力のみ処理される
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const validation = result.current.getFieldValidation('title');
      expect(validation.isValid).toBe(true);
    });
  });

  describe('状態管理機能', () => {
    it('バリデーション状態をクリアできる', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      act(() => {
        result.current.validateField('title', '');
      });

      let validation = result.current.getFieldValidation('title');
      expect(validation.isValid).toBe(false);

      act(() => {
        result.current.clearValidation('title');
      });

      validation = result.current.getFieldValidation('title');
      expect(validation.isValid).toBe(true); // デフォルト状態に戻る
    });

    it('全てのバリデーション状態をクリアできる', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      act(() => {
        result.current.validateField('title', '');
        result.current.validateField('description', '');
      });

      expect(result.current.hasErrors()).toBe(true);

      act(() => {
        result.current.clearAllValidation();
      });

      expect(result.current.hasErrors()).toBe(false);
      expect(result.current.isAllValid()).toBe(true);
    });
  });

  describe('ヘルパー関数', () => {
    it('isAllValid が正常に動作する', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      // 初期状態では全て有効
      expect(result.current.isAllValid()).toBe(true);

      act(() => {
        result.current.validateField('title', 'テスト目標');
        result.current.validateField('description', 'テスト説明');
      });

      expect(result.current.isAllValid()).toBe(true);

      act(() => {
        result.current.validateField('title', ''); // 無効な値
      });

      expect(result.current.isAllValid()).toBe(false);
    });

    it('hasErrors が正常に動作する', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      expect(result.current.hasErrors()).toBe(false);

      act(() => {
        result.current.validateField('title', '');
      });

      expect(result.current.hasErrors()).toBe(true);
    });

    it('getErrorMessages が正常に動作する', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      act(() => {
        result.current.validateField('title', '');
        result.current.validateField('description', '');
      });

      const errorMessages = result.current.getErrorMessages();
      expect(errorMessages).toContain('目標タイトルは必須です');
      expect(errorMessages).toContain('目標説明は必須です');
    });
  });

  describe('日付バリデーション', () => {
    it('有効な日付でバリデーションが成功する', () => {
      const { result } = renderHook(() => useRealtimeValidation());
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = tomorrow.toISOString().split('T')[0];

      act(() => {
        result.current.validateField('deadline', tomorrowString);
      });

      const validation = result.current.getFieldValidation('deadline');
      expect(validation.isValid).toBe(true);
    });

    it('過去の日付でバリデーションエラーが発生する', () => {
      const { result } = renderHook(() => useRealtimeValidation());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toISOString().split('T')[0];

      act(() => {
        result.current.validateField('deadline', yesterdayString);
      });

      const validation = result.current.getFieldValidation('deadline');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('達成期限は今日以降の日付を選択してください');
    });

    it('1年以上先の日付でバリデーションエラーが発生する', () => {
      const { result } = renderHook(() => useRealtimeValidation());
      const twoYearsLater = new Date();
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
      const twoYearsLaterString = twoYearsLater.toISOString().split('T')[0];

      act(() => {
        result.current.validateField('deadline', twoYearsLaterString);
      });

      const validation = result.current.getFieldValidation('deadline');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('達成期限は1年以内の日付を選択してください');
    });

    it('無効な日付形式でバリデーションエラーが発生する', () => {
      const { result } = renderHook(() => useRealtimeValidation());

      act(() => {
        result.current.validateField('deadline', '2024/12/31'); // 無効な形式
      });

      const validation = result.current.getFieldValidation('deadline');
      expect(validation.isValid).toBe(false);
      expect(validation.error).toBe('日付は YYYY-MM-DD 形式で入力してください');
    });
  });
});

describe('useFieldValidation', () => {
  it('単一フィールドのバリデーションが正常に動作する', () => {
    const { result } = renderHook(() => useFieldValidation('title'));

    act(() => {
      result.current.validate('テスト目標');
    });

    expect(result.current.validationResult.isValid).toBe(true);

    act(() => {
      result.current.validate('');
    });

    expect(result.current.validationResult.isValid).toBe(false);
  });

  it('フィールドハンドラーが正常に生成される', () => {
    const { result } = renderHook(() =>
      useFieldValidation('title', { validateOnChange: true, validateOnBlur: true })
    );

    expect(result.current.handlers.onChange).toBeDefined();
    expect(result.current.handlers.onBlur).toBeDefined();
  });
});

describe('useFormValidation', () => {
  it('複数フィールドの一括バリデーションが正常に動作する', () => {
    const { result } = renderHook(() => useFormValidation());

    act(() => {
      result.current.validateFields({
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      });
    });

    expect(result.current.isAllValid()).toBe(true);
    expect(result.current.canSubmit()).toBe(true);
  });

  it('無効なフィールドがある場合に送信不可になる', () => {
    const { result } = renderHook(() => useFormValidation());

    act(() => {
      result.current.validateFields({
        title: '', // 無効
        description: 'テスト説明',
        deadline: '2024-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      });
    });

    expect(result.current.isAllValid()).toBe(false);
    expect(result.current.canSubmit()).toBe(false);
  });
});
