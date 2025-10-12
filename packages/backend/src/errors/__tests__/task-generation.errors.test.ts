/**
 * task-generation.errorsのテスト
 */

import {
  TaskGenerationError,
  TaskGenerationErrorCode,
  TaskValidationError,
  ActionNotFoundError,
  AIGenerationError,
  QualityValidationError,
  DatabaseError,
  TimeoutError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
  TaskGenerationErrorFactory,
} from '../task-generation.errors';

describe('TaskGeneration Errors Tests', () => {
  it('TaskGenerationError - 基本エラー', () => {
    const error = new TaskGenerationError(TaskGenerationErrorCode.INTERNAL_ERROR, 'Test error');
    expect(error.name).toBe('TaskGenerationError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(TaskGenerationErrorCode.INTERNAL_ERROR);
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(false);
  });

  it('TaskValidationError - バリデーションエラー', () => {
    const error = new TaskValidationError('Invalid input', [
      { field: 'title', message: 'Required' },
    ]);
    expect(error.name).toBe('TaskValidationError');
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe(TaskGenerationErrorCode.VALIDATION_ERROR);
    expect(error.details).toEqual([{ field: 'title', message: 'Required' }]);
  });

  it('ActionNotFoundError - アクション未検出エラー', () => {
    const error = new ActionNotFoundError('action-123');
    expect(error.name).toBe('ActionNotFoundError');
    expect(error.message).toBe('アクションが見つかりません: action-123');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(TaskGenerationErrorCode.ACTION_NOT_FOUND);
  });

  it('ForbiddenError - 権限エラー', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.name).toBe('ForbiddenError');
    expect(error.message).toBe('Access denied');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe(TaskGenerationErrorCode.FORBIDDEN);
  });

  it('AIGenerationError - AI生成エラー', () => {
    const error = new AIGenerationError('AI service error');
    expect(error.name).toBe('AIGenerationError');
    expect(error.message).toBe('AI service error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe(TaskGenerationErrorCode.AI_GENERATION_FAILED);
    expect(error.retryable).toBe(true);
  });

  it('QualityValidationError - 品質エラー', () => {
    const error = new QualityValidationError('Quality check failed', [
      { field: 'tasks', message: 'Too few tasks' },
    ]);
    expect(error.name).toBe('QualityValidationError');
    expect(error.message).toBe('Quality check failed');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe(TaskGenerationErrorCode.QUALITY_VALIDATION_FAILED);
    expect(error.details).toEqual([{ field: 'tasks', message: 'Too few tasks' }]);
  });

  it('DatabaseError - データベースエラー', () => {
    const error = new DatabaseError('Connection failed');
    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Connection failed');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe(TaskGenerationErrorCode.DATABASE_ERROR);
    expect(error.retryable).toBe(true);
  });

  it('TimeoutError - タイムアウトエラー', () => {
    const error = new TimeoutError(5);
    expect(error.name).toBe('TimeoutError');
    expect(error.message).toBe('処理がタイムアウトしました（5秒）');
    expect(error.statusCode).toBe(504);
    expect(error.code).toBe(TaskGenerationErrorCode.TIMEOUT);
  });

  it('RateLimitError - レート制限エラー', () => {
    const error = new RateLimitError(10, '1分');
    expect(error.name).toBe('RateLimitError');
    expect(error.message).toBe('レート制限を超過しました（10回/1分）');
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe(TaskGenerationErrorCode.RATE_LIMIT_EXCEEDED);
  });

  it('UnauthorizedError - 認証エラー', () => {
    const error = new UnauthorizedError('Authentication required');
    expect(error.name).toBe('UnauthorizedError');
    expect(error.message).toBe('Authentication required');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe(TaskGenerationErrorCode.UNAUTHORIZED);
  });

  it('TaskGenerationErrorFactory.createError - エラーファクトリー', () => {
    const error = TaskGenerationErrorFactory.createError(
      TaskGenerationErrorCode.VALIDATION_ERROR,
      'Factory error'
    );

    expect(error).toBeInstanceOf(TaskGenerationError);
    expect(error.code).toBe(TaskGenerationErrorCode.VALIDATION_ERROR);
    expect(error.message).toBe('Factory error');
  });

  it('TaskGenerationErrorFactory.fromError - 標準エラー変換', () => {
    const originalError = new Error('Original error');
    const error = TaskGenerationErrorFactory.fromError(originalError);

    expect(error).toBeInstanceOf(TaskGenerationError);
    expect(error.code).toBe(TaskGenerationErrorCode.INTERNAL_ERROR);
    expect(error.message).toBe('Original error');
  });

  it('エラーシリアライゼーション - JSON変換', () => {
    const error = new TaskGenerationError(
      TaskGenerationErrorCode.INTERNAL_ERROR,
      'Serializable error'
    );
    const json = JSON.stringify(error);
    const parsed = JSON.parse(json);

    expect(parsed.name).toBe('TaskGenerationError');
    expect(parsed.message).toBe('Serializable error');
    expect(parsed.code).toBe(TaskGenerationErrorCode.INTERNAL_ERROR);
    expect(parsed.statusCode).toBe(500);
  });

  it('toJSON - エラーオブジェクトのJSON変換', () => {
    const error = new TaskValidationError('Test error', [
      { field: 'test', message: 'Test message' },
    ]);
    const json = error.toJSON();

    expect(json).toEqual({
      name: 'TaskValidationError',
      code: TaskGenerationErrorCode.VALIDATION_ERROR,
      message: 'Test error',
      details: [{ field: 'test', message: 'Test message' }],
      retryable: false,
      statusCode: 400,
    });
  });
});
