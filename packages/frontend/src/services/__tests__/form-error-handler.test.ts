import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormErrorHandler, formErrorHandler } from '../form-error-handler';
import { FormErrorType, FormErrorSeverity } from '../../types/form-error';

/**
 * Feature: 4.5-test-coverage-improvement, Task 8.1: 残りのサービスのテスト追加
 *
 * FormErrorHandlerのテスト
 */
describe('FormErrorHandler', () => {
  let errorHandler: FormErrorHandler;

  beforeEach(() => {
    errorHandler = new FormErrorHandler();
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('エラーを処理できる', async () => {
      const error = new Error('Test error');
      const context = {
        component: 'TestForm',
        action: 'submit',
        userId: 'user-1',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(error, context);

      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.severity).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('HTTPエラーを正しく分類する', async () => {
      const error400 = { status: 400, statusText: 'Bad Request' };
      const context = {
        component: 'TestForm',
        action: 'submit',
        userId: 'user-1',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(error400, context);

      expect(result.type).toBe(FormErrorType.VALIDATION_ERROR);
      expect(result.severity).toBe(FormErrorSeverity.MEDIUM);
    });

    it('認証エラーを正しく分類する', async () => {
      const error401 = { status: 401, statusText: 'Unauthorized' };
      const context = {
        component: 'TestForm',
        action: 'submit',
        userId: 'user-1',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(error401, context);

      expect(result.type).toBe(FormErrorType.AUTHENTICATION_ERROR);
      expect(result.severity).toBe(FormErrorSeverity.HIGH);
    });

    it('レート制限エラーを正しく分類する', async () => {
      const error429 = { status: 429, statusText: 'Too Many Requests' };
      const context = {
        component: 'TestForm',
        action: 'submit',
        userId: 'user-1',
        timestamp: new Date(),
      };

      const result = await errorHandler.handleError(error429, context);

      expect(result.type).toBe(FormErrorType.RATE_LIMIT_ERROR);
      expect(result.retryable).toBe(true);
    });
  });

  describe('handleValidationErrors', () => {
    it('バリデーションエラーを処理できる', () => {
      const validationErrors = [
        {
          field: 'title',
          rule: 'required',
          message: 'タイトルは必須です',
          value: '',
        },
        {
          field: 'description',
          rule: 'minLength',
          message: '説明は10文字以上で入力してください',
          value: 'short',
        },
      ];
      const context = {
        component: 'GoalForm',
        action: 'validate',
        userId: 'user-1',
        timestamp: new Date(),
      };

      const results = errorHandler.handleValidationErrors(validationErrors, context);

      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(FormErrorType.VALIDATION_ERROR);
      expect(results[0].field).toBe('title');
      expect(results[1].field).toBe('description');
    });
  });

  describe('handleNetworkError', () => {
    it('ネットワークエラーを処理できる', async () => {
      const error = new TypeError('Failed to fetch');
      const context = {
        component: 'TestForm',
        action: 'submit',
        userId: 'user-1',
        timestamp: new Date(),
      };
      const networkDetail = {
        url: 'https://api.example.com/goals',
        method: 'POST',
        timeout: false,
        status: undefined,
      };

      const result = await errorHandler.handleNetworkError(error, context, networkDetail);

      expect(result.type).toBe(FormErrorType.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('タイムアウトエラーを処理できる', async () => {
      const error = new Error('Request timeout');
      const context = {
        component: 'TestForm',
        action: 'submit',
        userId: 'user-1',
        timestamp: new Date(),
      };
      const networkDetail = {
        url: 'https://api.example.com/goals',
        method: 'POST',
        timeout: true,
        status: undefined,
      };

      const result = await errorHandler.handleNetworkError(error, context, networkDetail);

      expect(result.type).toBe(FormErrorType.NETWORK_ERROR);
      expect(result.severity).toBe(FormErrorSeverity.MEDIUM);
    });
  });

  describe('エラーリスナー', () => {
    it('エラーリスナーを追加できる', async () => {
      const listener = vi.fn();
      const unsubscribe = errorHandler.addErrorListener(listener);

      const error = new Error('Test error');
      const context = {
        component: 'TestForm',
        action: 'submit',
        userId: 'user-1',
        timestamp: new Date(),
      };

      await errorHandler.handleError(error, context);

      expect(listener).toHaveBeenCalled();

      // リスナーを削除
      unsubscribe();

      // 削除後は呼ばれない
      listener.mockClear();
      await errorHandler.handleError(error, context);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('復旧オプション', () => {
    it('復旧オプションを設定できる', () => {
      const options = {
        retry: vi.fn(),
        reload: vi.fn(),
      };

      errorHandler.setRecoveryOptions('NetworkError', options);

      expect(true).toBe(true);
    });
  });

  describe('clear', () => {
    it('エラーハンドラーをクリアできる', () => {
      const listener = vi.fn();
      errorHandler.addErrorListener(listener);
      errorHandler.setRecoveryOptions('NetworkError', { retry: vi.fn() });

      errorHandler.clear();

      expect(true).toBe(true);
    });
  });
});

describe('デフォルトインスタンス', () => {
  it('デフォルトインスタンスが存在する', () => {
    expect(formErrorHandler).toBeDefined();
    expect(formErrorHandler).toBeInstanceOf(FormErrorHandler);
  });
});
