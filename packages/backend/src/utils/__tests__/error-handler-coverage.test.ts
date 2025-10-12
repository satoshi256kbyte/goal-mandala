/**
 * error-handlerのカバレッジ改善テスト
 */

import { BedrockError } from '../../types/bedrock.types.js';
import {
  handleError,
  createErrorResponse,
  logError,
  isRetryableBedrockError,
  getErrorCode,
  sanitizeError,
  formatErrorForUser,
  classifyError,
} from '../error-handler';

describe('Error Handler Coverage Tests', () => {
  it('handleError - 一般的なエラー処理', () => {
    const error = new Error('Test error');
    const result = handleError(error);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Test error');
    expect(result.error.code).toBe('UNKNOWN_ERROR');
  });

  it('createErrorResponse - エラーレスポンス作成', () => {
    const error: BedrockError = {
      name: 'TestError',
      message: 'Test error',
      retryable: false,
      code: 'TEST_ERROR',
      type: 'UNKNOWN', // USER_FRIENDLY_MESSAGESに存在するタイプを使用
    };

    const response = createErrorResponse(error);

    expect(response.success).toBe(false);
    expect(response.error.message).toBe(
      '予期しないエラーが発生しました。しばらく待ってから再度お試しください。'
    );
    expect(response.error.code).toBe('UNKNOWN');
    expect(response.error.retryable).toBe(false);
  });

  it('logError - エラーログ出力', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Test error');

    logError(error, { context: 'test' });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('isRetryableError - リトライ可能エラー判定', () => {
    const retryableError = new Error('Connection timeout');
    retryableError.name = 'TimeoutError';

    const nonRetryableError = new Error('Validation failed');
    nonRetryableError.name = 'ValidationError';

    // classifyErrorを使ってBedrockErrorに変換してからテスト
    const retryableBedrockError = classifyError(retryableError);
    const nonRetryableBedrockError = classifyError(nonRetryableError);

    expect(isRetryableBedrockError(retryableBedrockError)).toBe(true);
    expect(isRetryableBedrockError(nonRetryableBedrockError)).toBe(false);
  });

  it('getErrorCode - エラーコード取得', () => {
    const error = new Error('Test error');
    error.name = 'ValidationError';

    expect(getErrorCode(error)).toBe('VALIDATION_ERROR');

    const unknownError = new Error('Unknown error');
    expect(getErrorCode(unknownError)).toBe('UNKNOWN_ERROR');
  });

  it('sanitizeError - エラー情報サニタイズ', () => {
    const error = new Error('Database password: secret123');
    const sanitized = sanitizeError(error);

    expect(sanitized.message).not.toContain('secret123');
    expect(sanitized.message).toContain('***');
  });

  it('formatErrorForUser - ユーザー向けエラーフォーマット', () => {
    const error = new Error('Internal database connection failed');
    const formatted = formatErrorForUser(error);

    expect(formatted).not.toContain('database');
    expect(formatted).toContain('システムエラー');
  });

  it('エラーハンドリング - null/undefined', () => {
    expect(() => handleError(null as any)).not.toThrow();
    expect(() => handleError(undefined as any)).not.toThrow();
  });

  it('エラーハンドリング - 文字列エラー', () => {
    const result = handleError('String error' as any);
    expect(result.error.message).toBe('String error');
  });

  it('エラーハンドリング - オブジェクトエラー', () => {
    const errorObj = { message: 'Object error', code: 'OBJ_ERROR' };
    const result = handleError(errorObj as any);
    expect(result.error.message).toBe('Object error');
  });
});
