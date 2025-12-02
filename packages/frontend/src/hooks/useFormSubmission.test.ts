import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import {
  useFormSubmission,
  useGoalFormSubmission,
  useDraftSubmission,
  SubmissionErrorType,
} from './useFormSubmission';

// fetchをモック化
global.fetch = vi.fn();
const mockFetch = fetch as unknown as any;

describe('useFormSubmission', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('基本的な送信機能', () => {
    it('有効なデータで送信が成功する', async () => {
      const { result } = renderHook(() => useFormSubmission());
      const mockSubmitFunction = vi.fn().mockResolvedValue({ id: '123' });

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(submissionResult.success).toBe(true);
      expect(submissionResult.data).toEqual({ id: '123' });
      expect(mockSubmitFunction).toHaveBeenCalledWith(validData);
      expect(result.current.submissionState.hasSubmitted).toBe(true);
      expect(result.current.submissionState.isSubmitting).toBe(false);
    });

    it('無効なデータで送信が失敗する', async () => {
      const { result } = renderHook(() => useFormSubmission());
      const mockSubmitFunction = vi.fn();

      const invalidData = {
        title: '', // 必須項目が空
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitForm(invalidData, mockSubmitFunction);
      });

      expect(submissionResult.success).toBe(false);
      expect(submissionResult.error?.type).toBe(SubmissionErrorType.VALIDATION_ERROR);
      expect(submissionResult.error?.details).toHaveProperty('title');
      expect(mockSubmitFunction).not.toHaveBeenCalled();
      expect(result.current.hasValidationErrors).toBe(true);
    });

    it('バリデーションを無効にした場合は無効なデータでも送信される', async () => {
      const { result } = renderHook(() => useFormSubmission({ validateBeforeSubmit: false }));
      const mockSubmitFunction = vi.fn().mockResolvedValue({ id: '123' });

      const invalidData = {
        title: '', // 必須項目が空
        description: 'テスト説明',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitForm(invalidData, mockSubmitFunction);
      });

      expect(submissionResult.success).toBe(true);
      expect(mockSubmitFunction).toHaveBeenCalledWith(invalidData);
    });
  });

  describe('重複送信防止', () => {
    it('短時間での重複送信を防止する', async () => {
      const { result } = renderHook(() => useFormSubmission({ preventDuplicateMs: 1000 }));
      const mockSubmitFunction = vi.fn().mockResolvedValue({ id: '123' });

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      // 最初の送信
      let firstResult: any;
      await act(async () => {
        firstResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(firstResult.success).toBe(true);

      // 即座に2回目の送信を試行
      let secondResult: any;
      await act(async () => {
        secondResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(secondResult.success).toBe(false);
      expect(secondResult.error?.type).toBe(SubmissionErrorType.VALIDATION_ERROR);
      expect(secondResult.error?.message).toContain('送信処理中');
      expect(mockSubmitFunction).toHaveBeenCalledTimes(1);
    });

    it('十分な時間が経過した後は再送信可能', async () => {
      const { result } = renderHook(() => useFormSubmission({ preventDuplicateMs: 1000 }));
      const mockSubmitFunction = vi.fn().mockResolvedValue({ id: '123' });

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      // 最初の送信
      await act(async () => {
        await result.current.submitForm(validData, mockSubmitFunction);
      });

      // 時間を進める
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      // 2回目の送信
      let secondResult: any;
      await act(async () => {
        secondResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(secondResult.success).toBe(true);
      expect(mockSubmitFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーを適切に処理する', async () => {
      const { result } = renderHook(() => useFormSubmission());
      const mockSubmitFunction = vi.fn().mockRejectedValue(new Error('fetch failed'));

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(submissionResult.success).toBe(false);
      expect(submissionResult.error?.type).toBe(SubmissionErrorType.NETWORK_ERROR);
      expect(result.current.submissionState.isSubmitting).toBe(false);
    });

    it('予期しないエラーを適切に処理する', async () => {
      const { result } = renderHook(() => useFormSubmission());
      const mockSubmitFunction = vi.fn().mockRejectedValue('unexpected error');

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(submissionResult.success).toBe(false);
      expect(submissionResult.error?.type).toBe(SubmissionErrorType.UNKNOWN_ERROR);
    });
  });

  describe('リトライ機能', () => {
    beforeEach(() => {
      vi.useRealTimers(); // リトライ機能テストでは実際のタイマーを使用
    });

    afterEach(() => {
      vi.useFakeTimers(); // 他のテストのために戻す
    });

    it('指定回数までリトライする', async () => {
      const { result } = renderHook(() => useFormSubmission({ maxRetries: 2, retryDelayMs: 100 }));

      let callCount = 0;
      const mockSubmitFunction = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('temporary error'));
        }
        return Promise.resolve({ id: '123' });
      });

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(submissionResult.success).toBe(true);
      expect(mockSubmitFunction).toHaveBeenCalledTimes(3);
    });

    it('最大リトライ回数を超えた場合はエラーになる', async () => {
      const { result } = renderHook(() => useFormSubmission({ maxRetries: 1, retryDelayMs: 100 }));

      const mockSubmitFunction = vi.fn().mockRejectedValue(new Error('persistent error'));

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(submissionResult.success).toBe(false);
      expect(mockSubmitFunction).toHaveBeenCalledTimes(2); // 初回 + 1回リトライ
    });
  });

  describe('API送信機能', () => {
    it('API送信が成功する', async () => {
      const { result } = renderHook(() => useFormSubmission());

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '123' }),
      } as Response);

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitToAPI(validData, '/api/goals');
      });

      expect(submissionResult.success).toBe(true);
      expect(submissionResult.data).toEqual({ id: '123' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/goals',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(validData),
        })
      );
    });

    it('APIエラーレスポンスを適切に処理する', async () => {
      const { result } = renderHook(() => useFormSubmission());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      let submissionResult: any;
      await act(async () => {
        submissionResult = await result.current.submitToAPI(validData, '/api/goals');
      });

      expect(submissionResult.success).toBe(false);
      expect(submissionResult.error?.type).toBe(SubmissionErrorType.SERVER_ERROR);
    });
  });

  describe('状態管理', () => {
    it('送信状態をリセットできる', async () => {
      const { result } = renderHook(() => useFormSubmission());
      const mockSubmitFunction = vi.fn().mockResolvedValue({ id: '123' });

      const validData = {
        title: 'テスト目標',
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      };

      await act(async () => {
        await result.current.submitForm(validData, mockSubmitFunction);
      });

      expect(result.current.submissionState.hasSubmitted).toBe(true);

      act(() => {
        result.current.resetSubmissionState();
      });

      expect(result.current.submissionState.hasSubmitted).toBe(false);
      expect(result.current.submissionState.submissionCount).toBe(0);
    });

    it('バリデーションエラーをクリアできる', async () => {
      const { result } = renderHook(() => useFormSubmission());
      const mockSubmitFunction = vi.fn();

      const invalidData = {
        title: '',
        description: 'テスト説明',
      };

      await act(async () => {
        await result.current.submitForm(invalidData, mockSubmitFunction);
      });

      expect(result.current.hasValidationErrors).toBe(true);

      act(() => {
        result.current.clearValidationErrors();
      });

      expect(result.current.hasValidationErrors).toBe(false);
    });
  });
});

describe('useGoalFormSubmission', () => {
  it('目標フォーム専用の送信フックが正常に動作する', async () => {
    const { result } = renderHook(() => useGoalFormSubmission());
    const mockSubmitFunction = vi.fn().mockResolvedValue({ id: '123' });

    const validData = {
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: '2025-12-31',
      background: 'テスト背景',
      constraints: 'テスト制約',
    };

    let submissionResult: any;
    await act(async () => {
      submissionResult = await result.current.submitForm(validData, mockSubmitFunction);
    });

    expect(submissionResult.success).toBe(true);
  });
});

describe('useDraftSubmission', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('下書き保存専用の送信フックが正常に動作する', async () => {
    const { result } = renderHook(() => useDraftSubmission());
    const mockSubmitFunction = vi.fn().mockResolvedValue({ draftId: '456' });

    // 部分的なデータ（必須項目が不完全でもOK）
    const partialData = {
      title: 'テスト目標',
      description: '', // 空でもOK
    };

    let submissionResult: any;
    await act(async () => {
      submissionResult = await result.current.submitForm(partialData, mockSubmitFunction, true);
    });

    expect(submissionResult.success).toBe(true);
    expect(submissionResult.data).toEqual({ draftId: '456' });
  });
});
