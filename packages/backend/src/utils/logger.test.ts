/**
 * Logger機密情報保護機能のテスト
 */

import { sanitizeSensitiveData, sanitizeObject, logger, logError } from './logger';

describe('sanitizeSensitiveData', () => {
  it('APIキーをマスキングする', () => {
    const text = 'API Key: sk-1234567890abcdef';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe('API Key: sk-***');
  });

  it('Bearerトークンをマスキングする', () => {
    const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe('Authorization: Bearer ***');
  });

  it('パスワードをマスキングする', () => {
    const text = 'password: mySecretPassword123';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe('password: ***');
  });

  it('JWTトークンをマスキングする', () => {
    const text =
      'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe('Token: jwt.***');
  });

  it('メールアドレスを部分的にマスキングする', () => {
    const text = 'Email: user@example.com';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe('Email: ***@example.com');
  });

  it('クレジットカード番号をマスキングする', () => {
    const text = 'Card: 1234-5678-9012-3456';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe('Card: ****-****-****-****');
  });

  it('AWS Access Keyをマスキングする', () => {
    const text = 'Access Key: AKIAIOSFODNN7EXAMPLE';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe('Access Key: AKIA***');
  });

  it('複数の機密情報を同時にマスキングする', () => {
    const text = 'API Key: sk-abc123, Password: secret, Email: test@example.com';
    const result = sanitizeSensitiveData(text);
    expect(result).toContain('sk-***');
    expect(result).toContain('password: ***');
    expect(result).toContain('***@example.com');
  });

  it('機密情報が含まれていない場合は元の文字列を返す', () => {
    const text = 'This is a normal log message';
    const result = sanitizeSensitiveData(text);
    expect(result).toBe(text);
  });
});

describe('sanitizeObject', () => {
  it('文字列値の機密情報をマスキングする', () => {
    const obj = {
      message: 'API Key: sk-1234567890abcdef',
      status: 'success',
    };
    const result = sanitizeObject(obj) as Record<string, unknown>;
    expect(result.message).toBe('API Key: sk-***');
    expect(result.status).toBe('success');
  });

  it('機密情報を含むキー名の値をマスキングする', () => {
    const obj = {
      password: 'mySecretPassword',
      token: 'abc123',
      apiKey: 'key123',
      username: 'john',
    };
    const result = sanitizeObject(obj) as Record<string, unknown>;
    expect(result.password).toBe('***');
    expect(result.token).toBe('***');
    expect(result.apiKey).toBe('***');
    expect(result.username).toBe('john');
  });

  it('ネストされたオブジェクトの機密情報をマスキングする', () => {
    const obj = {
      user: {
        name: 'John',
        password: 'secret123',
        email: 'john@example.com',
      },
    };
    const result = sanitizeObject(obj) as Record<string, unknown>;
    const user = result.user as Record<string, unknown>;
    expect(user.name).toBe('John');
    expect(user.password).toBe('***');
    expect(user.email).toBe('***@example.com');
  });

  it('配列内の機密情報をマスキングする', () => {
    const obj = {
      items: ['API Key: sk-abc123', 'Normal text', 'password: secret'],
    };
    const result = sanitizeObject(obj) as Record<string, unknown>;
    const items = result.items as string[];
    expect(items[0]).toBe('API Key: sk-***');
    expect(items[1]).toBe('Normal text');
    expect(items[2]).toBe('password: ***');
  });

  it('nullやundefinedを適切に処理する', () => {
    expect(sanitizeObject(null)).toBe(null);
    expect(sanitizeObject(undefined)).toBe(undefined);
  });

  it('プリミティブ型を適切に処理する', () => {
    expect(sanitizeObject(123)).toBe(123);
    expect(sanitizeObject(true)).toBe(true);
    expect(sanitizeObject('text')).toBe('text');
  });
});

describe('logger', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('ログメッセージから機密情報を除外する', () => {
    logger.info('User logged in with token: Bearer abc123xyz');

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedData.message).toBe('User logged in with token: Bearer ***');
  });

  it('コンテキストから機密情報を除外する', () => {
    logger.info('User action', {
      userId: '123',
      password: 'secret123',
      apiKey: 'key-abc',
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedData.context.userId).toBe('123');
    expect(loggedData.context.password).toBe('***');
    expect(loggedData.context.apiKey).toBe('***');
  });

  it('ネストされたコンテキストから機密情報を除外する', () => {
    logger.info('Complex operation', {
      user: {
        name: 'John',
        email: 'john@example.com',
        credentials: {
          password: 'secret',
          token: 'Bearer xyz',
        },
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    const user = loggedData.context.user;
    expect(user.name).toBe('John');
    expect(user.email).toBe('***@example.com');
    expect(user.credentials.password).toBe('***');
    expect(user.credentials.token).toBe('***');
  });
});

describe('logError', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('エラーメッセージから機密情報を除外する', () => {
    const error = new Error('Authentication failed with token: Bearer abc123');
    logError(error);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedData.message).toBe('Authentication failed with token: Bearer ***');
  });

  it('スタックトレースから機密情報を除外する', () => {
    const error = new Error('API call failed');
    error.stack = `Error: API call failed with key sk-abc123
      at function1 (file.ts:10:5)
      at function2 (file.ts:20:3)`;

    logError(error);

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedData.context.stack).toContain('sk-***');
    expect(loggedData.context.stack).not.toContain('sk-abc123');
  });

  it('コンテキストから機密情報を除外する', () => {
    const error = new Error('Database connection failed');
    logError(error, {
      connectionString: 'postgresql://user:password@localhost:5432/db',
      apiKey: 'key-123',
    });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(loggedData.context.apiKey).toBe('***');
    // データベース接続文字列のパスワード部分がマスキングされていることを確認
    expect(loggedData.context.connectionString).toContain('postgresql://user:***@localhost');
  });
});
