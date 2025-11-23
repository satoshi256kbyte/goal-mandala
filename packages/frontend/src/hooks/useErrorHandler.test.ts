import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { useErrorHandler } from './useErrorHandler';
import { AuthError } from '../services/auth';

describe('useErrorHandler', () => {
  it('初期状態では エラーがnullである', () => {
    const { result } = renderHook(() => useErrorHandler());

    expect(result.current.error).toBeNull();
    expect(result.current.isNetworkError).toBe(false);
    expect(result.current.isRetryable).toBe(false);
  });

  it('文字列エラーを正しく設定する', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError('テストエラー');
    });

    expect(result.current.error).toBe('テストエラー');
    expect(result.current.isNetworkError).toBe(false);
    expect(result.current.isRetryable).toBe(false);
  });

  it('AuthErrorを正しく処理する', () => {
    const { result } = renderHook(() => useErrorHandler());
    const authError: AuthError = {
      code: 'NetworkError',
      message: 'ネットワークエラーが発生しました',
    };

    act(() => {
      result.current.setError(authError);
    });

    expect(result.current.error).toBe('ネットワークエラーが発生しました');
    expect(result.current.isNetworkError).toBe(true);
    expect(result.current.isRetryable).toBe(true);
  });

  it('再試行可能なエラーを正しく判定する', () => {
    const { result } = renderHook(() => useErrorHandler());
    const retryableError: AuthError = {
      code: 'TooManyRequestsException',
      message: 'リクエストが多すぎます',
    };

    act(() => {
      result.current.setError(retryableError);
    });

    expect(result.current.isRetryable).toBe(true);
    expect(result.current.isNetworkError).toBe(false);
  });

  it('Errorオブジェクトを正しく処理する', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('network connection failed');

    act(() => {
      result.current.setError(error);
    });

    expect(result.current.error).toBe('network connection failed');
    expect(result.current.isNetworkError).toBe(true);
    expect(result.current.isRetryable).toBe(true);
  });

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

  it('不明なエラーオブジェクトを正しく処理する', () => {
    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.setError({ unknown: 'object' });
    });

    expect(result.current.error).toBe('エラーが発生しました。しばらく待ってから再試行してください');
    expect(result.current.isNetworkError).toBe(false);
    expect(result.current.isRetryable).toBe(false);
  });
});
