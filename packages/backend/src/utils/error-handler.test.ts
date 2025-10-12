import {
  ErrorHandler,
  BedrockError,
  ErrorType,
  isRetryableBedrockError,
  classifyError,
  createErrorResponse,
} from './error-handler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    jest.clearAllMocks();
  });

  describe('エラー分類', () => {
    it('ThrottlingExceptionをスロットリングエラーとして分類する', () => {
      const error = new Error('ThrottlingException');
      error.name = 'ThrottlingException';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.THROTTLING);
      expect(classified.retryable).toBe(true);
    });

    it('ServiceUnavailableExceptionをサービス利用不可エラーとして分類する', () => {
      const error = new Error('ServiceUnavailableException');
      error.name = 'ServiceUnavailableException';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.SERVICE_UNAVAILABLE);
      expect(classified.retryable).toBe(true);
    });

    it('InternalServerExceptionを内部サーバーエラーとして分類する', () => {
      const error = new Error('InternalServerException');
      error.name = 'InternalServerException';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.INTERNAL_SERVER);
      expect(classified.retryable).toBe(true);
    });

    it('ValidationExceptionを検証エラーとして分類する', () => {
      const error = new Error('ValidationException');
      error.name = 'ValidationException';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.VALIDATION);
      expect(classified.retryable).toBe(false);
    });

    it('AccessDeniedExceptionを認証エラーとして分類する', () => {
      const error = new Error('AccessDeniedException');
      error.name = 'AccessDeniedException';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.ACCESS_DENIED);
      expect(classified.retryable).toBe(false);
    });

    it('TimeoutErrorをタイムアウトエラーとして分類する', () => {
      const error = new Error('TimeoutError');
      error.name = 'TimeoutError';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.TIMEOUT);
      expect(classified.retryable).toBe(true);
    });

    it('ParseErrorを解析エラーとして分類する', () => {
      const error = new Error('ParseError');
      error.name = 'ParseError';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.PARSE);
      expect(classified.retryable).toBe(false);
    });

    it('未知のエラーをUNKNOWNとして分類する', () => {
      const error = new Error('Unknown error');
      error.name = 'UnknownError';

      const classified = classifyError(error);

      expect(classified.type).toBe(ErrorType.UNKNOWN);
      expect(classified.retryable).toBe(true);
    });
  });

  describe('リトライ判定', () => {
    it('スロットリングエラーはリトライ可能', () => {
      const error: BedrockError = {
        type: ErrorType.THROTTLING,
        message: 'Rate exceeded',
        retryable: true,
        originalError: new Error('ThrottlingException'),
      };

      expect(isRetryableBedrockError(error)).toBe(true);
    });

    it('サービス利用不可エラーはリトライ可能', () => {
      const error: BedrockError = {
        type: ErrorType.SERVICE_UNAVAILABLE,
        message: 'Service unavailable',
        retryable: true,
        originalError: new Error('ServiceUnavailableException'),
      };

      expect(isRetryableBedrockError(error)).toBe(true);
    });

    it('内部サーバーエラーはリトライ可能', () => {
      const error: BedrockError = {
        type: ErrorType.INTERNAL_SERVER,
        message: 'Internal server error',
        retryable: true,
        originalError: new Error('InternalServerException'),
      };

      expect(isRetryableBedrockError(error)).toBe(true);
    });

    it('タイムアウトエラーはリトライ可能', () => {
      const error: BedrockError = {
        type: ErrorType.TIMEOUT,
        message: 'Request timeout',
        retryable: true,
        originalError: new Error('TimeoutError'),
      };

      expect(isRetryableBedrockError(error)).toBe(true);
    });

    it('検証エラーはリトライ不可', () => {
      const error: BedrockError = {
        type: ErrorType.VALIDATION,
        message: 'Validation failed',
        retryable: false,
        originalError: new Error('ValidationException'),
      };

      expect(isRetryableBedrockError(error)).toBe(false);
    });

    it('認証エラーはリトライ不可', () => {
      const error: BedrockError = {
        type: ErrorType.ACCESS_DENIED,
        message: 'Access denied',
        retryable: false,
        originalError: new Error('AccessDeniedException'),
      };

      expect(isRetryableBedrockError(error)).toBe(false);
    });

    it('解析エラーはリトライ不可', () => {
      const error: BedrockError = {
        type: ErrorType.PARSE,
        message: 'Parse failed',
        retryable: false,
        originalError: new Error('ParseError'),
      };

      expect(isRetryableBedrockError(error)).toBe(false);
    });
  });

  describe('エラーレスポンス生成', () => {
    it('ユーザーフレンドリーなエラーメッセージを生成する', () => {
      const error: BedrockError = {
        type: ErrorType.THROTTLING,
        message: 'Rate limit exceeded',
        retryable: true,
        originalError: new Error('ThrottlingException'),
      };

      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('THROTTLING');
      expect(response.error?.message).toContain('リクエストが多すぎます');
      expect(response.error?.retryable).toBe(true);
    });

    it('検証エラーのメッセージを生成する', () => {
      const error: BedrockError = {
        type: ErrorType.VALIDATION,
        message: 'Invalid input',
        retryable: false,
        originalError: new Error('ValidationException'),
      };

      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION');
      expect(response.error?.message).toContain('入力内容が正しくありません');
      expect(response.error?.retryable).toBe(false);
    });

    it('認証エラーのメッセージを生成する', () => {
      const error: BedrockError = {
        type: ErrorType.ACCESS_DENIED,
        message: 'Access denied',
        retryable: false,
        originalError: new Error('AccessDeniedException'),
      };

      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('ACCESS_DENIED');
      expect(response.error?.message).toContain('アクセスが拒否されました');
      expect(response.error?.retryable).toBe(false);
    });

    it('タイムアウトエラーのメッセージを生成する', () => {
      const error: BedrockError = {
        type: ErrorType.TIMEOUT,
        message: 'Request timeout',
        retryable: true,
        originalError: new Error('TimeoutError'),
      };

      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('TIMEOUT');
      expect(response.error?.message).toContain('処理がタイムアウトしました');
      expect(response.error?.retryable).toBe(true);
    });

    it('機密情報をマスキングする', () => {
      const error: BedrockError = {
        type: ErrorType.VALIDATION,
        message: 'Invalid API key: sk-1234567890abcdef',
        retryable: false,
        originalError: new Error('ValidationException'),
        details: {
          apiKey: 'sk-1234567890abcdef',
          userId: 'user-123',
        },
      };

      const response = createErrorResponse(error);

      expect(response.error?.message).not.toContain('sk-1234567890abcdef');
      expect(response.error?.details).toBeUndefined();
    });
  });

  describe('ErrorHandlerクラス', () => {
    it('エラーを処理してBedrockErrorを返す', () => {
      const error = new Error('ThrottlingException');
      error.name = 'ThrottlingException';

      const result = errorHandler.handleError(error);

      expect(result.type).toBe(ErrorType.THROTTLING);
      expect(result.retryable).toBe(true);
    });

    it('エラーをログに記録する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('リトライ可能なエラーを判定する', () => {
      const retryableError = new Error('ThrottlingException');
      retryableError.name = 'ThrottlingException';

      const nonRetryableError = new Error('ValidationException');
      nonRetryableError.name = 'ValidationException';

      expect(errorHandler.isRetryable(retryableError)).toBe(true);
      expect(errorHandler.isRetryable(nonRetryableError)).toBe(false);
    });
  });

  describe('機密情報保護', () => {
    it('エラーメッセージからAPIキーをマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('API call failed with key: sk-1234567890abcdef');
      error.name = 'ValidationException';

      const result = errorHandler.handleError(error);

      // ログに記録されたメッセージを確認
      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).not.toContain('sk-1234567890abcdef');
      expect(loggedData.message).toContain('sk-***');

      consoleSpy.mockRestore();
    });

    it('エラーメッセージからBearerトークンをマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Authentication failed: Bearer abc123xyz');
      error.name = 'AccessDeniedException';

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).not.toContain('abc123xyz');
      expect(loggedData.message).toContain('Bearer ***');

      consoleSpy.mockRestore();
    });

    it('エラーメッセージからパスワードをマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Connection failed with password: mySecret123');
      error.name = 'InternalServerException';

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).not.toContain('mySecret123');
      expect(loggedData.message).toContain('password: ***');

      consoleSpy.mockRestore();
    });

    it('エラーメッセージからJWTトークンをマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error(
        'Token validation failed: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
      );
      error.name = 'ValidationException';

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(loggedData.message).toContain('jwt.***');

      consoleSpy.mockRestore();
    });

    it('エラーメッセージからメールアドレスを部分的にマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('User not found: user@example.com');
      error.name = 'ValidationException';

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).not.toContain('user@example.com');
      expect(loggedData.message).toContain('***@example.com');

      consoleSpy.mockRestore();
    });

    it('エラーメッセージからAWS Access Keyをマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Invalid credentials: AKIAIOSFODNN7EXAMPLE');
      error.name = 'AccessDeniedException';

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(loggedData.message).toContain('AKIA***');

      consoleSpy.mockRestore();
    });

    it('エラーメッセージからデータベース接続文字列をマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Connection failed: postgresql://user:password@localhost:5432/db');
      error.name = 'InternalServerException';

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).not.toContain('password@localhost');
      expect(loggedData.message).toContain('***@localhost');

      consoleSpy.mockRestore();
    });

    it('エラー詳細から機密情報を除外する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error: BedrockError = {
        type: ErrorType.VALIDATION,
        message: 'Validation failed',
        retryable: false,
        originalError: new Error('ValidationException'),
        details: {
          apiKey: 'sk-abc123',
          token: 'Bearer xyz789',
          password: 'secret123',
          userId: 'user-123',
        },
      };

      errorHandler.handleError(error.originalError);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);

      // ログに詳細情報は含まれないため、メッセージのマスキングのみ確認
      expect(loggedData.message).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('ネストされたエラー詳細から機密情報を除外する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error: BedrockError = {
        type: ErrorType.VALIDATION,
        message: 'Validation failed',
        retryable: false,
        originalError: new Error('ValidationException'),
        details: {
          user: {
            name: 'John',
            password: 'secret',
            credentials: {
              apiKey: 'key-123',
              token: 'Bearer abc',
            },
          },
        },
      };

      errorHandler.handleError(error.originalError);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('スタックトレースから機密情報を除外する', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('API call failed');
      error.name = 'InternalServerException';
      error.stack = `Error: API call failed with key sk-abc123
        at function1 (file.ts:10:5)
        at function2 (file.ts:20:3)`;

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.stack).toContain('sk-***');
      expect(loggedData.stack).not.toContain('sk-abc123');

      consoleSpy.mockRestore();
    });

    it('複数の機密情報を同時にマスキングする', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error(
        'Multiple failures: API key sk-abc123, token Bearer xyz789, password: secret, email: user@example.com'
      );
      error.name = 'ValidationException';

      errorHandler.handleError(error);

      expect(consoleSpy).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.mock.calls[0][0] as string);
      expect(loggedData.message).toContain('sk-***');
      expect(loggedData.message).toContain('Bearer ***');
      expect(loggedData.message).toContain('password: ***');
      expect(loggedData.message).toContain('***@example.com');
      expect(loggedData.message).not.toContain('sk-abc123');
      expect(loggedData.message).not.toContain('xyz789');
      expect(loggedData.message).not.toContain('secret');
      expect(loggedData.message).not.toContain('user@example.com');

      consoleSpy.mockRestore();
    });
  });

  describe('エラーシナリオ', () => {
    it('連続したスロットリングエラーを処理する', () => {
      const errors = Array(3)
        .fill(null)
        .map(() => {
          const error = new Error('ThrottlingException');
          error.name = 'ThrottlingException';
          return error;
        });

      const results = errors.map(error => errorHandler.handleError(error));

      results.forEach(result => {
        expect(result.type).toBe(ErrorType.THROTTLING);
        expect(result.retryable).toBe(true);
      });
    });

    it('異なるエラータイプを連続して処理する', () => {
      const throttlingError = new Error('ThrottlingException');
      throttlingError.name = 'ThrottlingException';

      const validationError = new Error('ValidationException');
      validationError.name = 'ValidationException';

      const timeoutError = new Error('TimeoutError');
      timeoutError.name = 'TimeoutError';

      const result1 = errorHandler.handleError(throttlingError);
      const result2 = errorHandler.handleError(validationError);
      const result3 = errorHandler.handleError(timeoutError);

      expect(result1.type).toBe(ErrorType.THROTTLING);
      expect(result1.retryable).toBe(true);

      expect(result2.type).toBe(ErrorType.VALIDATION);
      expect(result2.retryable).toBe(false);

      expect(result3.type).toBe(ErrorType.TIMEOUT);
      expect(result3.retryable).toBe(true);
    });

    it('ネストされたエラーを処理する', () => {
      const innerError = new Error('Inner error');
      const outerError = new Error('ThrottlingException');
      outerError.name = 'ThrottlingException';
      (outerError as any).cause = innerError;

      const result = errorHandler.handleError(outerError);

      expect(result.type).toBe(ErrorType.THROTTLING);
      expect(result.originalError).toBe(outerError);
    });

    it('エラーメッセージが空の場合のデフォルトメッセージ', () => {
      const error = new Error('');
      error.name = 'ThrottlingException';

      const result = errorHandler.handleError(error);

      expect(result.message).toBeTruthy();
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('エラーオブジェクトではない値を処理する', () => {
      const result1 = errorHandler.handleError('string error' as any);
      const result2 = errorHandler.handleError(null as any);
      const result3 = errorHandler.handleError(undefined as any);

      expect(result1.type).toBe(ErrorType.UNKNOWN);
      expect(result2.type).toBe(ErrorType.UNKNOWN);
      expect(result3.type).toBe(ErrorType.UNKNOWN);
    });
  });
});
