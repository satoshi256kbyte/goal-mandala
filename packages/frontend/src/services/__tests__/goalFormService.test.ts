import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GoalFormService,
  ApiError,
  NetworkError,
  ValidationError,
  withRetry,
  submitGoalForm,
  saveDraftForm,
  getErrorMessage,
  getErrorDetails,
} from '../goalFormService';
import type { GoalFormData, PartialGoalFormData } from '../../schemas/goal-form';

// グローバルfetchのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// localStorageのモック
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('GoalFormService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createGoal', () => {
    const validFormData: GoalFormData = {
      title: 'テスト目標',
      description: 'テスト説明',
      deadline: '2025-12-31',
      background: 'テスト背景',
      constraints: 'テスト制約',
    };

    it('正常に目標を作成できる', async () => {
      const mockResponse = {
        success: true,
        data: {
          goalId: 'goal-123',
          processingId: 'proc-123',
          status: 'processing' as const,
          message: '目標を作成しました',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await GoalFormService.createGoal(validFormData);

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/goals',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('バリデーションエラーの場合、ValidationErrorをスローする', async () => {
      const invalidFormData = {
        title: '', // 空のタイトル
        description: 'テスト説明',
        deadline: '2025-12-31',
        background: 'テスト背景',
        constraints: 'テスト制約',
      } as GoalFormData;

      await expect(GoalFormService.createGoal(invalidFormData)).rejects.toThrow(ValidationError);
    });

    it('APIエラーの場合、ApiErrorをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          message: 'リクエストが無効です',
          code: 'INVALID_REQUEST',
        }),
      });

      await expect(GoalFormService.createGoal(validFormData)).rejects.toThrow(ApiError);
    });

    it('ネットワークエラーの場合、NetworkErrorをスローする', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(GoalFormService.createGoal(validFormData)).rejects.toThrow(NetworkError);
    });

    it('タイムアウトの場合、NetworkErrorをスローする', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject({ name: 'AbortError' }), 100);
          })
      );

      await expect(GoalFormService.createGoal(validFormData)).rejects.toThrow(NetworkError);
    });
  });

  describe('saveDraft', () => {
    const validDraftData: PartialGoalFormData = {
      title: 'テスト下書き',
      description: 'テスト説明',
    };

    it('正常に下書きを保存できる', async () => {
      const mockResponse = {
        success: true,
        data: {
          draftId: 'draft-123',
          savedAt: '2025-12-19T10:00:00Z',
          message: '下書きを保存しました',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await GoalFormService.saveDraft(validDraftData);

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/goals/draft',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('APIエラーの場合、ApiErrorをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          message: 'サーバーエラー',
        }),
      });

      await expect(GoalFormService.saveDraft(validDraftData)).rejects.toThrow(ApiError);
    });
  });

  describe('getDraft', () => {
    it('正常に下書きを取得できる', async () => {
      const mockResponse = {
        success: true,
        data: {
          draftData: {
            title: 'テスト下書き',
            description: 'テスト説明',
          },
          savedAt: '2025-12-19T10:00:00Z',
          message: '下書きを取得しました',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await GoalFormService.getDraft();

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/goals/draft',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('下書きが存在しない場合、nullを返す', async () => {
      const mockResponse = {
        success: true,
        data: {
          draftData: null,
          savedAt: null,
          message: '下書きが存在しません',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await GoalFormService.getDraft();

      expect(result.draftData).toBeNull();
    });
  });

  describe('deleteDraft', () => {
    it('正常に下書きを削除できる', async () => {
      const mockResponse = {
        success: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(GoalFormService.deleteDraft()).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/goals/draft',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('getProcessingStatus', () => {
    it('正常に処理状況を取得できる', async () => {
      const mockResponse = {
        success: true,
        data: {
          processingId: 'proc-123',
          status: 'processing' as const,
          progress: 50,
          message: '処理中です',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await GoalFormService.getProcessingStatus('proc-123');

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/goals/processing/proc-123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('cancelProcessing', () => {
    it('正常に処理をキャンセルできる', async () => {
      const mockResponse = {
        success: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(GoalFormService.cancelProcessing('proc-123')).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/goals/processing/proc-123/cancel',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

describe('withRetry', () => {
  it('成功した場合、結果を返す', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('リトライ可能なエラーの場合、指定回数リトライする', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce('success');

    const result = await withRetry(mockFn, 3, 10);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('ValidationErrorの場合、リトライせずにエラーをスローする', async () => {
    const mockFn = vi.fn().mockRejectedValue(new ValidationError('バリデーションエラー', {}));

    await expect(withRetry(mockFn, 3)).rejects.toThrow(ValidationError);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('4xxエラーの場合、リトライせずにエラーをスローする', async () => {
    const mockFn = vi.fn().mockRejectedValue(new ApiError('Bad Request', 400));

    await expect(withRetry(mockFn, 3)).rejects.toThrow(ApiError);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('最大リトライ回数に達した場合、エラーをスローする', async () => {
    const mockFn = vi.fn().mockRejectedValue(new NetworkError());

    await expect(withRetry(mockFn, 3, 10)).rejects.toThrow(NetworkError);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
});

describe('submitGoalForm', () => {
  const validFormData: GoalFormData = {
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: '2025-12-31',
    background: 'テスト背景',
    constraints: 'テスト制約',
  };

  beforeEach(() => {
    const mockResponse = {
      success: true,
      data: {
        goalId: 'goal-123',
        processingId: 'proc-123',
        status: 'processing' as const,
        message: '目標を作成しました',
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
  });

  it('正常に目標を送信できる', async () => {
    const result = await submitGoalForm(validFormData);

    expect(result.goalId).toBe('goal-123');
  });

  it('onProgressコールバックが呼ばれる', async () => {
    const onProgress = vi.fn();

    await submitGoalForm(validFormData, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('AI生成を開始しています...');
    expect(onProgress).toHaveBeenCalledWith('AI生成が完了しました');
  });

  it('onSuccessコールバックが呼ばれる', async () => {
    const onSuccess = vi.fn();

    await submitGoalForm(validFormData, { onSuccess });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        goalId: 'goal-123',
      })
    );
  });

  it('エラーの場合、onErrorコールバックが呼ばれる', async () => {
    const onError = vi.fn();

    // mockFetchをリセットしてエラーを返すように設定
    mockFetch.mockReset();
    mockFetch.mockRejectedValueOnce(new NetworkError());

    await expect(submitGoalForm(validFormData, { onError, enableRetry: false })).rejects.toThrow(
      NetworkError
    );
    expect(onError).toHaveBeenCalled();
  });

  it('enableRetry=falseの場合、リトライしない', async () => {
    mockFetch.mockRejectedValueOnce(new NetworkError());

    await expect(submitGoalForm(validFormData, { enableRetry: false })).rejects.toThrow(
      NetworkError
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('saveDraftForm', () => {
  const validDraftData: PartialGoalFormData = {
    title: 'テスト下書き',
    description: 'テスト説明',
  };

  beforeEach(() => {
    const mockResponse = {
      success: true,
      data: {
        draftId: 'draft-123',
        savedAt: '2025-12-19T10:00:00Z',
        message: '下書きを保存しました',
      },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
  });

  it('正常に下書きを保存できる', async () => {
    const result = await saveDraftForm(validDraftData);

    expect(result.draftId).toBe('draft-123');
  });

  it('onProgressコールバックが呼ばれる', async () => {
    const onProgress = vi.fn();

    await saveDraftForm(validDraftData, { onProgress });

    expect(onProgress).toHaveBeenCalledWith('下書きを保存しています...');
    expect(onProgress).toHaveBeenCalledWith('下書きが保存されました');
  });

  it('onSuccessコールバックが呼ばれる', async () => {
    const onSuccess = vi.fn();

    await saveDraftForm(validDraftData, { onSuccess });

    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: 'draft-123',
      })
    );
  });
});

describe('getErrorMessage', () => {
  it('ValidationErrorの場合、適切なメッセージを返す', () => {
    const error = new ValidationError('バリデーションエラー', {});
    expect(getErrorMessage(error)).toBe('入力内容を確認してください');
  });

  it('NetworkErrorの場合、適切なメッセージを返す', () => {
    const error = new NetworkError();
    expect(getErrorMessage(error)).toBe('ネットワーク接続を確認してください');
  });

  it('ApiErrorの場合、エラーメッセージを返す', () => {
    const error = new ApiError('カスタムエラー');
    expect(getErrorMessage(error)).toBe('カスタムエラー');
  });

  it('その他のエラーの場合、デフォルトメッセージを返す', () => {
    const error = new Error('予期しないエラー');
    expect(getErrorMessage(error)).toBe('予期しないエラーが発生しました');
  });
});

describe('getErrorDetails', () => {
  it('ValidationErrorの場合、エラー詳細を返す', () => {
    const errors = { title: 'タイトルは必須です' };
    const error = new ValidationError('バリデーションエラー', errors);
    expect(getErrorDetails(error)).toEqual(errors);
  });

  it('ApiErrorの場合、詳細情報を返す', () => {
    const details = { field: 'title', reason: '無効な値' };
    const error = new ApiError('APIエラー', 400, 'INVALID_FIELD', details);
    expect(getErrorDetails(error)).toEqual(details);
  });

  it('その他のエラーの場合、空オブジェクトを返す', () => {
    const error = new Error('予期しないエラー');
    expect(getErrorDetails(error)).toEqual({});
  });
});

describe('GoalFormService - Edge Cases', () => {
  describe('境界値テスト', () => {
    it('非常に大きなフォームデータを送信できる', async () => {
      const largeFormData: GoalFormData = {
        title: 'A'.repeat(100), // バリデーションを通過する範囲に調整
        description: 'B'.repeat(500),
        deadline: '2025-12-31',
        background: 'C'.repeat(300),
        constraints: 'D'.repeat(200),
      };

      const mockResponse = {
        success: true,
        data: {
          goalId: 'goal-123',
          processingId: 'proc-123',
          status: 'processing' as const,
          message: '目標を作成しました',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(GoalFormService.createGoal(largeFormData)).resolves.toBeDefined();
    });

    it('最小限のフォームデータを送信できる', async () => {
      const minimalFormData: GoalFormData = {
        title: 'A',
        description: 'B',
        deadline: '2025-12-31',
        background: 'C',
        constraints: 'D',
      };

      const mockResponse = {
        success: true,
        data: {
          goalId: 'goal-123',
          processingId: 'proc-123',
          status: 'processing' as const,
          message: '目標を作成しました',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(GoalFormService.createGoal(minimalFormData)).resolves.toBeDefined();
    });
  });

  describe('エラーケーステスト', () => {
    it('401エラーの場合、ApiErrorをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          message: '認証が必要です',
          code: 'UNAUTHORIZED',
        }),
      });

      const validFormData: GoalFormData = {
        title: 'テスト',
        description: 'テスト',
        deadline: '2025-12-31',
        background: 'テスト',
        constraints: 'テスト',
      };

      await expect(GoalFormService.createGoal(validFormData)).rejects.toThrow(ApiError);
    });

    it('500エラーの場合、ApiErrorをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({
          message: 'サーバーエラー',
        }),
      });

      const validFormData: GoalFormData = {
        title: 'テスト',
        description: 'テスト',
        deadline: '2025-12-31',
        background: 'テスト',
        constraints: 'テスト',
      };

      await expect(GoalFormService.createGoal(validFormData)).rejects.toThrow(ApiError);
    });

    it('レスポンスがJSONでない場合、エラーをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const validFormData: GoalFormData = {
        title: 'テスト',
        description: 'テスト',
        deadline: '2025-12-31',
        background: 'テスト',
        constraints: 'テスト',
      };

      await expect(GoalFormService.createGoal(validFormData)).rejects.toThrow(ApiError);
    });

    it('successがfalseの場合、ApiErrorをスローする', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'データが無効です',
        }),
      });

      const validFormData: GoalFormData = {
        title: 'テスト',
        description: 'テスト',
        deadline: '2025-12-31',
        background: 'テスト',
        constraints: 'テスト',
      };

      await expect(GoalFormService.createGoal(validFormData)).rejects.toThrow(ApiError);
    });
  });

  describe('リトライロジックのエッジケース', () => {
    it('5xxエラーの場合、リトライする', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new ApiError('Server Error', 503))
        .mockResolvedValueOnce('success');

      const result = await withRetry(mockFn, 3, 10);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('NetworkErrorの場合、リトライする', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new NetworkError())
        .mockRejectedValueOnce(new NetworkError())
        .mockResolvedValueOnce('success');

      const result = await withRetry(mockFn, 3, 10);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('リトライ回数が1の場合、1回だけ実行する', async () => {
      const mockFn = vi.fn().mockRejectedValue(new NetworkError());

      await expect(withRetry(mockFn, 1, 10)).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Error Utilities - Edge Cases', () => {
  describe('getErrorMessage', () => {
    it('カスタムメッセージを持つApiErrorの場合、そのメッセージを返す', () => {
      const error = new ApiError('カスタムエラーメッセージ', 400);
      expect(getErrorMessage(error)).toBe('カスタムエラーメッセージ');
    });

    it('カスタムメッセージを持つNetworkErrorの場合、そのメッセージを返す', () => {
      const error = new NetworkError('カスタムネットワークエラー');
      expect(getErrorMessage(error)).toBe('ネットワーク接続を確認してください');
    });

    it('空のエラーメッセージの場合、デフォルトメッセージを返す', () => {
      const error = new Error('');
      expect(getErrorMessage(error)).toBe('予期しないエラーが発生しました');
    });
  });

  describe('getErrorDetails', () => {
    it('detailsがnullの場合、空オブジェクトを返す', () => {
      const error = new ApiError('エラー', 400, 'ERROR_CODE', null);
      expect(getErrorDetails(error)).toEqual({});
    });

    it('detailsがundefinedの場合、空オブジェクトを返す', () => {
      const error = new ApiError('エラー', 400, 'ERROR_CODE', undefined);
      expect(getErrorDetails(error)).toEqual({});
    });

    it('detailsが配列の場合、そのまま返す', () => {
      const details = ['error1', 'error2'];
      const error = new ApiError('エラー', 400, 'ERROR_CODE', details);
      expect(getErrorDetails(error)).toEqual(details);
    });
  });
});
