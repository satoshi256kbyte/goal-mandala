/**
 * サブ目標生成APIのエラークラスのテスト
 */

import {
  ValidationError,
  QualityError,
  DatabaseError,
  BedrockError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
} from '../subgoal-generation.errors';
import { ValidationErrorDetail } from '../../types/subgoal-generation.types';

describe('ValidationError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new ValidationError('バリデーションエラーが発生しました');

    expect(error.message).toBe('バリデーションエラーが発生しました');
    expect(error.name).toBe('ValidationError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });

  it('詳細情報を含むエラーを作成できる', () => {
    const details: ValidationErrorDetail[] = [
      { field: 'title', message: 'タイトルは必須です' },
      { field: 'description', message: '説明は必須です' },
    ];
    const error = new ValidationError('入力データが不正です', details);

    expect(error.message).toBe('入力データが不正です');
    expect(error.details).toEqual(details);
    expect(error.details).toHaveLength(2);
  });

  it('詳細情報なしでエラーを作成できる', () => {
    const error = new ValidationError('エラー');

    expect(error.details).toBeUndefined();
  });
});

describe('QualityError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new QualityError('品質基準を満たしていません');

    expect(error.message).toBe('品質基準を満たしていません');
    expect(error.name).toBe('QualityError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(QualityError);
  });

  it('サブ目標の個数エラーメッセージを作成できる', () => {
    const error = new QualityError('サブ目標は8個である必要があります（現在: 7個）');

    expect(error.message).toContain('8個である必要があります');
    expect(error.message).toContain('7個');
  });
});

describe('DatabaseError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new DatabaseError('データベースエラーが発生しました');

    expect(error.message).toBe('データベースエラーが発生しました');
    expect(error.name).toBe('DatabaseError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DatabaseError);
  });

  it('元のエラーを含むエラーを作成できる', () => {
    const originalError = new Error('接続エラー');
    const error = new DatabaseError('データの保存に失敗しました', originalError);

    expect(error.message).toBe('データの保存に失敗しました');
    expect(error.originalError).toBe(originalError);
    expect(error.originalError?.message).toBe('接続エラー');
  });

  it('元のエラーなしでエラーを作成できる', () => {
    const error = new DatabaseError('エラー');

    expect(error.originalError).toBeUndefined();
  });
});

describe('BedrockError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new BedrockError('Bedrock APIエラーが発生しました');

    expect(error.message).toBe('Bedrock APIエラーが発生しました');
    expect(error.name).toBe('BedrockError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BedrockError);
  });

  it('デフォルトでretryableがtrueになる', () => {
    const error = new BedrockError('一時的なエラー');

    expect(error.retryable).toBe(true);
  });

  it('retryableをfalseに設定できる', () => {
    const error = new BedrockError('致命的なエラー', false);

    expect(error.retryable).toBe(false);
  });

  it('retryableを明示的にtrueに設定できる', () => {
    const error = new BedrockError('スロットリングエラー', true);

    expect(error.retryable).toBe(true);
  });
});

describe('AuthenticationError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new AuthenticationError('認証に失敗しました');

    expect(error.message).toBe('認証に失敗しました');
    expect(error.name).toBe('AuthenticationError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthenticationError);
  });

  it('トークン無効エラーメッセージを作成できる', () => {
    const error = new AuthenticationError('認証トークンが無効です');

    expect(error.message).toContain('認証トークン');
  });
});

describe('ForbiddenError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new ForbiddenError('アクセスが拒否されました');

    expect(error.message).toBe('アクセスが拒否されました');
    expect(error.name).toBe('ForbiddenError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ForbiddenError);
  });

  it('権限不足エラーメッセージを作成できる', () => {
    const error = new ForbiddenError('この目標を編集する権限がありません');

    expect(error.message).toContain('権限がありません');
  });
});

describe('NotFoundError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new NotFoundError('リソースが見つかりません');

    expect(error.message).toBe('リソースが見つかりません');
    expect(error.name).toBe('NotFoundError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('目標未検出エラーメッセージを作成できる', () => {
    const error = new NotFoundError('目標が見つかりません');

    expect(error.message).toContain('目標が見つかりません');
  });
});

describe('RateLimitError', () => {
  it('メッセージとnameプロパティが正しく設定される', () => {
    const error = new RateLimitError('レート制限を超えました');

    expect(error.message).toBe('レート制限を超えました');
    expect(error.name).toBe('RateLimitError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RateLimitError);
  });

  it('詳細なレート制限エラーメッセージを作成できる', () => {
    const error = new RateLimitError(
      'リクエスト制限を超えました。しばらく待ってから再試行してください。'
    );

    expect(error.message).toContain('リクエスト制限');
    expect(error.message).toContain('再試行');
  });
});

describe('エラークラスの継承関係', () => {
  it('すべてのカスタムエラーがErrorを継承している', () => {
    const errors = [
      new ValidationError('test'),
      new QualityError('test'),
      new DatabaseError('test'),
      new BedrockError('test'),
      new AuthenticationError('test'),
      new ForbiddenError('test'),
      new NotFoundError('test'),
      new RateLimitError('test'),
    ];

    errors.forEach(error => {
      expect(error).toBeInstanceOf(Error);
    });
  });

  it('各エラークラスが独自のnameプロパティを持つ', () => {
    const errorNames = [
      { error: new ValidationError('test'), name: 'ValidationError' },
      { error: new QualityError('test'), name: 'QualityError' },
      { error: new DatabaseError('test'), name: 'DatabaseError' },
      { error: new BedrockError('test'), name: 'BedrockError' },
      { error: new AuthenticationError('test'), name: 'AuthenticationError' },
      { error: new ForbiddenError('test'), name: 'ForbiddenError' },
      { error: new NotFoundError('test'), name: 'NotFoundError' },
      { error: new RateLimitError('test'), name: 'RateLimitError' },
    ];

    errorNames.forEach(({ error, name }) => {
      expect(error.name).toBe(name);
    });
  });
});
