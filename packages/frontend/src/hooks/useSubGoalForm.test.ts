import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import {
  useSubGoalForm,
  useSubGoalFieldValidation,
  useSubGoalFormSubmission,
} from './useSubGoalForm';
import { renderHookWithProviders } from '../test/test-utils';
import { SubGoalFormData } from '../schemas/subgoal-form';

// テスト用のサンプルデータ
const sampleFormData: SubGoalFormData = {
  title: 'プログラミング基礎',
  description: 'プログラミングの基礎概念を学習し、基本的なコードが書けるようになる',
  background: 'プログラミング未経験だが、基礎をしっかり身につけたい',
  constraints: '学習時間は平日夜と週末のみ',
};

describe('useSubGoalForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe('基本機能', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHookWithProviders(() => useSubGoalForm({ subGoalId: 'subgoal-1' }));

      expect(result.current.formState.isValid).toBe(false);
      expect(result.current.formState.isDirty).toBe(false);
      expect(result.current.formState.isSubmitting).toBe(false);
      expect(result.current.formState.isValidating).toBe(false);
      expect(result.current.formState.hasErrors).toBe(false);
      expect(result.current.formState.hasUnsavedChanges).toBe(false);
      expect(result.current.formState.isDraftSaving).toBe(false);
    });

    it('初期データが正しく設定される', () => {
      const { result } = renderHookWithProviders(() =>
        useSubGoalForm({
          subGoalId: 'subgoal-1',
          initialData: sampleFormData,
        })
      );

      expect(result.current.watchedValues.title).toBe(sampleFormData.title);
      expect(result.current.watchedValues.description).toBe(sampleFormData.description);
      expect(result.current.watchedValues.background).toBe(sampleFormData.background);
      expect(result.current.watchedValues.constraints).toBe(sampleFormData.constraints);
    });

    it('フィールド状態を正しく取得できる', () => {
      const { result } = renderHookWithProviders(() =>
        useSubGoalForm({
          subGoalId: 'subgoal-1',
          initialData: sampleFormData,
        })
      );

      expect(result.current.getFieldState('title').isDirty).toBe(false);
      expect(result.current.getFieldState('title').invalid).toBe(false);
      expect(result.current.getFieldState('title').isTouched).toBe(false);
    });
  });
});

describe('useSubGoalFormSubmission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  it('フォーム送信が正しく動作する', async () => {
    const { result } = renderHookWithProviders(() => useSubGoalFormSubmission());

    const mockSubmitFn = vi.fn().mockResolvedValue(undefined);

    expect(result.current.submissionState.isSubmitting).toBe(false);
    expect(result.current.submissionState.error).toBeUndefined();
    expect(result.current.submissionState.success).toBe(false);

    await act(async () => {
      await result.current.submitForm(mockSubmitFn);
      vi.runAllTimers();
    });

    expect(mockSubmitFn).toHaveBeenCalled();
    expect(result.current.submissionState.success).toBe(true);
    expect(result.current.submissionState.error).toBeUndefined();
  });
});
