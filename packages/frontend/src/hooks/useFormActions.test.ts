import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useFormActions } from './useFormActions';
import { PartialGoalFormData } from '../schemas/goal-form';
import { draftUtils } from '../services/draftService';

// draftUtilsのモック
vi.mock('../services/draftService', () => ({
  draftUtils: {
    isWorthSaving: vi.fn(),
  },
}));

const mockDraftUtils = draftUtils as any;

describe('useFormActions', () => {
  const validFormData: PartialGoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2024-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  const emptyFormData: PartialGoalFormData = {
    title: '',
    description: '',
    deadline: '',
    background: '',
    constraints: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDraftUtils.isWorthSaving.mockReturnValue(true);
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
        })
      );

      expect(result.current.state.isDraftSaving).toBe(false);
      expect(result.current.state.isSubmitting).toBe(false);
      expect(result.current.state.lastDraftSaveTime).toBeNull();
      expect(result.current.state.draftSaveError).toBeNull();
      expect(result.current.state.submitError).toBeNull();
    });

    it('フォームが有効な場合は送信可能', () => {
      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
        })
      );

      expect(result.current.canSubmit).toBe(true);
    });

    it('フォームが無効な場合は送信不可', () => {
      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: false,
        })
      );

      expect(result.current.canSubmit).toBe(false);
    });

    it('保存価値のあるデータがある場合は下書き保存可能', () => {
      mockDraftUtils.isWorthSaving.mockReturnValue(true);

      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
        })
      );

      expect(result.current.canSaveDraft).toBe(true);
    });

    it('保存価値のあるデータがない場合は下書き保存不可', () => {
      mockDraftUtils.isWorthSaving.mockReturnValue(false);

      const { result } = renderHook(() =>
        useFormActions({
          formData: emptyFormData,
          isFormValid: false,
        })
      );

      expect(result.current.canSaveDraft).toBe(false);
    });
  });

  describe('下書き保存', () => {
    it('下書き保存が成功する', async () => {
      const onDraftSaveSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
          onDraftSaveSuccess,
        })
      );

      await act(async () => {
        await result.current.saveDraft();
      });

      expect(onDraftSaveSuccess).toHaveBeenCalledWith(validFormData);
      expect(result.current.state.lastDraftSaveTime).toBeInstanceOf(Date);
      expect(result.current.state.draftSaveError).toBeNull();
    });

    it('保存価値のないデータで下書き保存するとエラーになる', async () => {
      mockDraftUtils.isWorthSaving.mockReturnValue(false);
      const onDraftSaveError = vi.fn();

      const { result } = renderHook(() =>
        useFormActions({
          formData: emptyFormData,
          isFormValid: false,
          onDraftSaveError,
        })
      );

      await act(async () => {
        await result.current.saveDraft();
      });

      expect(onDraftSaveError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '保存するデータがありません',
        })
      );
      expect(result.current.state.draftSaveError).toEqual(
        expect.objectContaining({
          message: '保存するデータがありません',
        })
      );
    });

    it('下書き保存中は状態が正しく更新される', async () => {
      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
        })
      );

      // 保存開始
      act(() => {
        result.current.saveDraft();
      });

      expect(result.current.state.isDraftSaving).toBe(true);
      expect(result.current.canSaveDraft).toBe(false);
      expect(result.current.canSubmit).toBe(false);

      // 保存完了まで待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(result.current.state.isDraftSaving).toBe(false);
    });

    it('保存中に重複して保存を実行してもスキップされる', async () => {
      const onDraftSaveSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
          onDraftSaveSuccess,
        })
      );

      // 最初の保存を開始
      act(() => {
        result.current.saveDraft();
      });

      // 2回目の保存を試行（スキップされるはず）
      await act(async () => {
        await result.current.saveDraft();
      });

      // 最初の保存完了まで待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      // 成功コールバックは1回だけ呼ばれる
      expect(onDraftSaveSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('フォーム送信', () => {
    it('フォーム送信が成功する', async () => {
      const onSubmitSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
          onSubmitSuccess,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSubmitSuccess).toHaveBeenCalledWith(validFormData);
      expect(result.current.state.submitError).toBeNull();
    });

    it('無効なフォームで送信するとエラーになる', async () => {
      const onSubmitError = vi.fn();

      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: false,
          onSubmitError,
        })
      );

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSubmitError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '必須項目をすべて入力してください',
        })
      );
      expect(result.current.state.submitError).toEqual(
        expect.objectContaining({
          message: '必須項目をすべて入力してください',
        })
      );
    });

    it('フォーム送信中は状態が正しく更新される', async () => {
      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
        })
      );

      // 送信開始
      act(() => {
        result.current.submitForm();
      });

      expect(result.current.state.isSubmitting).toBe(true);
      expect(result.current.canSubmit).toBe(false);
      expect(result.current.canSaveDraft).toBe(false);

      // 送信完了まで待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2100));
      });

      expect(result.current.state.isSubmitting).toBe(false);
    });

    it('送信中に重複して送信を実行してもスキップされる', async () => {
      const onSubmitSuccess = vi.fn();

      const { result } = renderHook(() =>
        useFormActions({
          formData: validFormData,
          isFormValid: true,
          onSubmitSuccess,
        })
      );

      // 最初の送信を開始
      act(() => {
        result.current.submitForm();
      });

      // 2回目の送信を試行（スキップされるはず）
      await act(async () => {
        await result.current.submitForm();
      });

      // 最初の送信完了まで待機
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 2100));
      });

      // 成功コールバックは1回だけ呼ばれる
      expect(onSubmitSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラー管理', () => {
    it('エラーをクリアできる', async () => {
      mockDraftUtils.isWorthSaving.mockReturnValue(false);

      const { result } = renderHook(() =>
        useFormActions({
          formData: emptyFormData,
          isFormValid: false,
        })
      );

      // エラーを発生させる
      await act(async () => {
        await result.current.saveDraft();
        await result.current.submitForm();
      });

      expect(result.current.state.draftSaveError).not.toBeNull();
      expect(result.current.state.submitError).not.toBeNull();

      // エラーをクリア
      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.state.draftSaveError).toBeNull();
      expect(result.current.state.submitError).toBeNull();
    });
  });
});
