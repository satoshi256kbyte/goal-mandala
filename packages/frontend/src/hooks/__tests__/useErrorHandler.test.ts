import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { AuthError } from '../../services/auth';

describe('useErrorHandler', () => {
  describe('初期状態', () => {
    it('初期状態が正しく設定されている', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });
  });

  describe('setError', () => {
    it('文字列エラーを設定できる', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError('テストエラー');
      });

      expect(result.current.error).toBe('テストエラー');
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });

    it('AuthErrorを設定できる', () => {
      const { result } = renderHook(() => useErrorHandler());
      const authError: AuthError = {
        code: 'UserNotFoundException',
        message: 'ユーザーが見つかりません',
      };

      act(() => {
        result.current.setError(authError);
      });

      expect(result.current.error).toBe('ユーザーが見つかりません');
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });

    it('NetworkErrorを正しく検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const networkError: AuthError = {
        code: 'NetworkError',
        message: 'ネットワークエラーが発生しました',
      };

      act(() => {
        result.current.setError(networkError);
      });

      expect(result.current.error).toBe('ネットワークエラーが発生しました');
      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isRetryable).toBe(true);
    });

    it('TimeoutErrorを正しく検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const timeoutError: AuthError = {
        code: 'TimeoutError',
        message: 'タイムアウトしました',
      };

      act(() => {
        result.current.setError(timeoutError);
      });

      expect(result.current.error).toBe('タイムアウトしました');
      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isRetryable).toBe(true);
    });

    it('ServiceUnavailableを正しく検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const serviceError: AuthError = {
        code: 'ServiceUnavailable',
        message: 'サービスが利用できません',
      };

      act(() => {
        result.current.setError(serviceError);
      });

      expect(result.current.error).toBe('サービスが利用できません');
      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isRetryable).toBe(true);
    });

    it('TooManyRequestsExceptionを再試行可能として検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const rateLimitError: AuthError = {
        code: 'TooManyRequestsException',
        message: 'リクエストが多すぎます',
      };

      act(() => {
        result.current.setError(rateLimitError);
      });

      expect(result.current.error).toBe('リクエストが多すぎます');
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(true);
    });

    it('LimitExceededExceptionを再試行可能として検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const limitError: AuthError = {
        code: 'LimitExceededException',
        message: '制限を超えました',
      };

      act(() => {
        result.current.setError(limitError);
      });

      expect(result.current.error).toBe('制限を超えました');
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(true);
    });

    it('Error型を設定できる', () => {
      const { result } = renderHook(() => useErrorHandler());
      const error = new Error('標準エラー');

      act(() => {
        result.current.setError(error);
      });

      expect(result.current.error).toBe('標準エラー');
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });

    it('ネットワーク関連のError型を正しく検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const networkError = new Error('Network request failed');

      act(() => {
        result.current.setError(networkError);
      });

      expect(result.current.error).toBe('Network request failed');
      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isRetryable).toBe(true);
    });

    it('fetch関連のError型を正しく検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const fetchError = new Error('Failed to fetch');

      act(() => {
        result.current.setError(fetchError);
      });

      expect(result.current.error).toBe('Failed to fetch');
      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isRetryable).toBe(true);
    });

    it('connection関連のError型を正しく検出する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const connectionError = new Error('Connection timeout');

      act(() => {
        result.current.setError(connectionError);
      });

      expect(result.current.error).toBe('Connection timeout');
      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isRetryable).toBe(true);
    });

    it('未知のオブジェクトをデフォルトメッセージで処理する', () => {
      const { result } = renderHook(() => useErrorHandler());
      const unknownError = { unknown: 'error' };

      act(() => {
        result.current.setError(unknownError);
      });

      expect(result.current.error).toBe(
        'エラーが発生しました。しばらく待ってから再試行してください'
      );
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });

    it('nullをデフォルトメッセージで処理する', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBe(
        'エラーが発生しました。しばらく待ってから再試行してください'
      );
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });

    it('undefinedをデフォルトメッセージで処理する', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError(undefined);
      });

      expect(result.current.error).toBe(
        'エラーが発生しました。しばらく待ってから再試行してください'
      );
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });
  });

  describe('clearError', () => {
    it('エラーをクリアできる', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError('テストエラー');
      });

      expect(result.current.error).toBe('テストエラー');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isRetryable).toBe(false);
    });

    it('ネットワークエラーフラグもクリアされる', () => {
      const { result } = renderHook(() => useErrorHandler());
      const networkError: AuthError = {
        code: 'NetworkError',
        message: 'ネットワークエラー',
      };

      act(() => {
        result.current.setError(networkError);
      });

      expect(result.current.isNetworkError).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.isNetworkError).toBe(false);
    });

    it('再試行可能フラグもクリアされる', () => {
      const { result } = renderHook(() => useErrorHandler());
      const retryableError: AuthError = {
        code: 'TooManyRequestsException',
        message: 'リクエストが多すぎます',
      };

      act(() => {
        result.current.setError(retryableError);
      });

      expect(result.current.isRetryable).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.isRetryable).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('連続してエラーを設定できる', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError('エラー1');
      });

      expect(result.current.error).toBe('エラー1');

      act(() => {
        result.current.setError('エラー2');
      });

      expect(result.current.error).toBe('エラー2');
    });

    it('エラー設定とクリアを繰り返せる', () => {
      const { result } = renderHook(() => useErrorHandler());

      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.setError(`エラー${i}`);
        });

        expect(result.current.error).toBe(`エラー${i}`);

        act(() => {
          result.current.clearError();
        });

        expect(result.current.error).toBeNull();
      }
    });

    it('空文字列のエラーを設定できる', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.setError('');
      });

      expect(result.current.error).toBe('');
    });
  });
});
