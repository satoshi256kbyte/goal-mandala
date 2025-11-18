import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProfileForm } from '../useProfileForm';
import { updateProfile } from '../../services/profileService';

// Mock the profile service
vi.mock('../../services/profileService');
const mockUpdateProfile = vi.mocked(updateProfile);

describe('useProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('デフォルト値で初期化される', () => {
      const { result } = renderHook(() => useProfileForm());

      expect(result.current.formData).toEqual({
        industry: '',
        companySize: '',
        jobTitle: '',
        position: '',
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBeNull();
    });
  });

  describe('フォーム状態管理', () => {
    it('setFieldValueでフィールド値を更新できる', () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
      });

      expect(result.current.formData.industry).toBe('it-communication');
    });

    it('setFieldValueでエラーがクリアされる', () => {
      const { result } = renderHook(() => useProfileForm());

      // まずエラーを発生させる
      act(() => {
        result.current.setFieldTouched('jobTitle', true);
      });

      expect(result.current.errors.jobTitle).toBe('職種を入力してください');

      // 値を設定してエラーをクリア
      act(() => {
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      // 値が設定されたことを確認
      expect(result.current.formData.jobTitle).toBe('エンジニア');

      // バリデーションを再実行してエラーをクリア
      act(() => {
        result.current.validateField('jobTitle');
      });

      expect(result.current.errors.jobTitle).toBeUndefined();
    });

    it('setFieldTouchedでタッチ状態を設定できる', () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setFieldTouched('industry', true);
      });

      expect(result.current.touched.industry).toBe(true);
    });

    it('setFieldTouchedでバリデーションが実行される', () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setFieldTouched('industry', true);
      });

      expect(result.current.errors.industry).toBe('業種を選択してください');
    });

    it('resetFormでフォームがリセットされる', () => {
      const { result } = renderHook(() => useProfileForm());

      // フォームに値を設定
      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('jobTitle', 'エンジニア');
        result.current.setFieldTouched('industry', true);
      });

      // リセット
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData).toEqual({
        industry: '',
        companySize: '',
        jobTitle: '',
        position: '',
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.error).toBeNull();
      expect(result.current.successMessage).toBeNull();
    });
  });

  describe('バリデーション機能', () => {
    describe('validateField', () => {
      it('業種が未選択の場合エラーを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        const error = result.current.validateField('industry');

        expect(error).toBe('業種を選択してください');
      });

      it('組織規模が未選択の場合エラーを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        const error = result.current.validateField('companySize');

        expect(error).toBe('組織規模を選択してください');
      });

      it('職種が未入力の場合エラーを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        const error = result.current.validateField('jobTitle');

        expect(error).toBe('職種を入力してください');
      });

      it('職種が100文字を超える場合エラーを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        act(() => {
          result.current.setFieldValue('jobTitle', 'a'.repeat(101));
        });

        const error = result.current.validateField('jobTitle');

        expect(error).toBe('職種は100文字以内で入力してください');
      });

      it('役職が100文字を超える場合エラーを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        act(() => {
          result.current.setFieldValue('position', 'a'.repeat(101));
        });

        const error = result.current.validateField('position');

        expect(error).toBe('役職は100文字以内で入力してください');
      });

      it('役職が空の場合エラーを返さない（任意項目）', () => {
        const { result } = renderHook(() => useProfileForm());

        const error = result.current.validateField('position');

        expect(error).toBeUndefined();
      });

      it('有効な値の場合エラーを返さない', () => {
        const { result } = renderHook(() => useProfileForm());

        act(() => {
          result.current.setFieldValue('industry', 'it-communication');
          result.current.setFieldValue('companySize', '11-50');
          result.current.setFieldValue('jobTitle', 'エンジニア');
          result.current.setFieldValue('position', 'マネージャー');
        });

        expect(result.current.validateField('industry')).toBeUndefined();
        expect(result.current.validateField('companySize')).toBeUndefined();
        expect(result.current.validateField('jobTitle')).toBeUndefined();
        expect(result.current.validateField('position')).toBeUndefined();
      });
    });

    describe('validateForm', () => {
      it('全フィールドが有効な場合trueを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        act(() => {
          result.current.setFieldValue('industry', 'it-communication');
          result.current.setFieldValue('companySize', '11-50');
          result.current.setFieldValue('jobTitle', 'エンジニア');
        });

        let isValid: boolean = false;
        act(() => {
          isValid = result.current.validateForm();
        });

        expect(isValid).toBe(true);
        expect(result.current.errors).toEqual({});
      });

      it('必須フィールドが未入力の場合falseを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        let isValid: boolean = true;
        act(() => {
          isValid = result.current.validateForm();
        });

        expect(isValid).toBe(false);
        expect(result.current.errors).toEqual({
          industry: '業種を選択してください',
          companySize: '組織規模を選択してください',
          jobTitle: '職種を入力してください',
        });
      });

      it('一部のフィールドが無効な場合falseを返す', () => {
        const { result } = renderHook(() => useProfileForm());

        act(() => {
          result.current.setFieldValue('industry', 'it-communication');
          result.current.setFieldValue('jobTitle', 'a'.repeat(101));
        });

        let isValid: boolean = true;
        act(() => {
          isValid = result.current.validateForm();
        });

        expect(isValid).toBe(false);
        expect(result.current.errors).toMatchObject({
          companySize: '組織規模を選択してください',
          jobTitle: '職種は100文字以内で入力してください',
        });
      });
    });
  });

  describe('API通信機能', () => {
    it('handleSubmitで正常にプロフィールを更新できる', async () => {
      const onSuccess = vi.fn();
      mockUpdateProfile.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useProfileForm({ onSuccess }));

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
        result.current.setFieldValue('position', 'マネージャー');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        industry: 'it-communication',
        companySize: '11-50',
        jobTitle: 'エンジニア',
        position: 'マネージャー',
      });
      expect(result.current.successMessage).toBe('プロフィールを保存しました');
      expect(result.current.error).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
      expect(onSuccess).toHaveBeenCalled();
    });

    it('handleSubmit中はisSubmittingがtrueになる', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>(resolve => {
        resolvePromise = resolve;
      });

      mockUpdateProfile.mockReturnValue(promise);

      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      // 送信開始
      act(() => {
        result.current.handleSubmit();
      });

      // 送信中はisSubmittingがtrue
      expect(result.current.isSubmitting).toBe(true);

      // Promise を解決
      await act(async () => {
        resolvePromise!();
        await promise;
      });

      // 完了後はisSubmittingがfalse
      expect(result.current.isSubmitting).toBe(false);
    });

    it('バリデーションエラーがある場合API呼び出しをしない', async () => {
      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.handleSubmit();
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
      expect(result.current.touched).toEqual({
        industry: true,
        companySize: true,
        jobTitle: true,
        position: true,
      });
    });

    it('API呼び出しでエラーが発生した場合エラーメッセージを設定する', async () => {
      const onError = vi.fn();
      const errorMessage = 'プロフィールの保存に失敗しました';
      mockUpdateProfile.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useProfileForm({ onError }));

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.successMessage).toBeNull();
      expect(result.current.isSubmitting).toBe(false);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('予期しないエラーの場合デフォルトメッセージを設定する', async () => {
      mockUpdateProfile.mockRejectedValue('string error');

      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.error).toBe('予期しないエラーが発生しました');
    });
  });

  describe('エラーハンドリング', () => {
    it('clearErrorでエラーメッセージをクリアできる', async () => {
      const { result } = renderHook(() => useProfileForm());

      // エラーを設定（内部的に設定するため、API呼び出しエラーをシミュレート）
      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      mockUpdateProfile.mockRejectedValue(new Error('エラー'));

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.error).toBe('エラー');

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('clearSuccessで成功メッセージをクリアできる', async () => {
      mockUpdateProfile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfileForm());

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(result.current.successMessage).toBe('プロフィールを保存しました');

      // 成功メッセージをクリア
      act(() => {
        result.current.clearSuccess();
      });

      expect(result.current.successMessage).toBeNull();
    });

    it('onSuccessコールバックが呼ばれる', async () => {
      const onSuccess = vi.fn();
      mockUpdateProfile.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProfileForm({ onSuccess }));

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('onErrorコールバックが呼ばれる', async () => {
      const onError = vi.fn();
      const error = new Error('エラー');
      mockUpdateProfile.mockRejectedValue(error);

      const { result } = renderHook(() => useProfileForm({ onError }));

      act(() => {
        result.current.setFieldValue('industry', 'it-communication');
        result.current.setFieldValue('companySize', '11-50');
        result.current.setFieldValue('jobTitle', 'エンジニア');
      });

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
