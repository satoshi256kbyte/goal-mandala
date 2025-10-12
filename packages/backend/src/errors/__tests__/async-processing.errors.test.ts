/**
 * async-processing.errorsのテスト
 */

import {
  ProcessingNotFoundError,
  ProcessingCancelledError,
  ProcessingAlreadyCompletedError,
  RetryLimitExceededError,
  CannotCancelError,
  CannotRetryError,
  TimeoutError,
  StepFunctionsError,
  ValidationError,
  DatabaseError,
  AIGenerationError,
  AuthenticationError,
  ForbiddenError,
} from '../async-processing.errors';

describe('AsyncProcessing Errors Tests', () => {
  it('ProcessingNotFoundError - 処理未発見エラー', () => {
    const error = new ProcessingNotFoundError('process-123');
    expect(error.name).toBe('ProcessingNotFoundError');
    expect(error.message).toBe('処理が見つかりません: process-123');
    expect(error.processId).toBe('process-123');
  });

  it('ProcessingCancelledError - 処理キャンセルエラー', () => {
    const error = new ProcessingCancelledError('process-123');
    expect(error.name).toBe('ProcessingCancelledError');
    expect(error.message).toBe('処理はキャンセルされました: process-123');
    expect(error.processId).toBe('process-123');
  });

  it('ProcessingAlreadyCompletedError - 処理完了済みエラー', () => {
    const error = new ProcessingAlreadyCompletedError('process-123');
    expect(error.name).toBe('ProcessingAlreadyCompletedError');
    expect(error.message).toBe('処理は既に完了しています: process-123');
    expect(error.processId).toBe('process-123');
  });

  it('RetryLimitExceededError - リトライ上限超過エラー', () => {
    const error = new RetryLimitExceededError('process-123', 3, 3);
    expect(error.name).toBe('RetryLimitExceededError');
    expect(error.message).toBe('リトライ上限を超えました: process-123 (3/3)');
    expect(error.processId).toBe('process-123');
    expect(error.retryCount).toBe(3);
    expect(error.maxRetryCount).toBe(3);
  });

  it('CannotCancelError - キャンセル不可エラー', () => {
    const error = new CannotCancelError('process-123', 'COMPLETED');
    expect(error.name).toBe('CannotCancelError');
    expect(error.message).toBe(
      'この状態の処理はキャンセルできません: process-123 (status: COMPLETED)'
    );
    expect(error.processId).toBe('process-123');
    expect(error.currentStatus).toBe('COMPLETED');
  });

  it('CannotRetryError - リトライ不可エラー', () => {
    const error = new CannotRetryError('process-123', 'COMPLETED');
    expect(error.name).toBe('CannotRetryError');
    expect(error.message).toBe(
      'この状態の処理はリトライできません: process-123 (status: COMPLETED)'
    );
    expect(error.processId).toBe('process-123');
    expect(error.currentStatus).toBe('COMPLETED');
  });

  it('TimeoutError - タイムアウトエラー', () => {
    const error = new TimeoutError('process-123', 300);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toBe('処理がタイムアウトしました: process-123 (300秒)');
    expect(error.processId).toBe('process-123');
    expect(error.timeoutSeconds).toBe(300);
  });

  it('StepFunctionsError - Step Functionsエラー', () => {
    const executionArn = 'arn:aws:states:...:execution:test';
    const originalError = new Error('Original error');
    const error = new StepFunctionsError(
      'process-123',
      'Execution failed',
      executionArn,
      originalError
    );

    expect(error.name).toBe('StepFunctionsError');
    expect(error.message).toBe('Execution failed');
    expect(error.processId).toBe('process-123');
    expect(error.executionArn).toBe(executionArn);
    expect(error.originalError).toBe(originalError);
  });

  it('ValidationError - バリデーションエラー', () => {
    const details = { field: 'type', message: 'Required' };
    const error = new ValidationError('Invalid request', details);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid request');
    expect(error.details).toEqual(details);
  });

  it('DatabaseError - データベースエラー', () => {
    const originalError = new Error('Connection failed');
    const error = new DatabaseError('Database connection failed', originalError);
    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Database connection failed');
    expect(error.originalError).toBe(originalError);
  });

  it('AIGenerationError - AI生成エラー', () => {
    const originalError = new Error('AI service error');
    const error = new AIGenerationError('AI generation failed', true, originalError);
    expect(error.name).toBe('AIGenerationError');
    expect(error.message).toBe('AI generation failed');
    expect(error.retryable).toBe(true);
    expect(error.originalError).toBe(originalError);
  });

  it('AuthenticationError - 認証エラー', () => {
    const error = new AuthenticationError('Authentication required');
    expect(error.name).toBe('AuthenticationError');
    expect(error.message).toBe('Authentication required');
  });

  it('ForbiddenError - 認可エラー', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.name).toBe('ForbiddenError');
    expect(error.message).toBe('Access denied');
  });

  it('エラーシリアライゼーション - JSON変換', () => {
    const error = new ProcessingNotFoundError('process-123');
    const json = JSON.stringify(error);
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe('ProcessingNotFoundError');
    expect(parsed.processId).toBe('process-123');
    // Note: Error.message is not enumerable by default, so it won't be in JSON.stringify output
    // This is expected behavior for Error objects
  });

  it('エラー継承チェック', () => {
    const error = new ProcessingNotFoundError('process-123');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ProcessingNotFoundError);
  });
});
