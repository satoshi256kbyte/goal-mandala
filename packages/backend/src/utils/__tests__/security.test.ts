import {
  maskSensitiveData,
  maskEmail,
  maskStackTrace,
  maskSensitiveFields,
  sanitizeErrorForLogging,
} from '../security';

describe('Security Utils', () => {
  describe('maskSensitiveData', () => {
    it('null/undefinedの場合は***を返す', () => {
      expect(maskSensitiveData(null)).toBe('***');
      expect(maskSensitiveData(undefined)).toBe('***');
    });

    it('短い文字列は全てマスキング', () => {
      expect(maskSensitiveData('abc')).toBe('***');
      expect(maskSensitiveData('1234')).toBe('****');
    });

    it('長い文字列は前後を表示', () => {
      expect(maskSensitiveData('1234567890')).toBe('1234***7890');
    });
  });

  describe('maskEmail', () => {
    it('null/undefinedの場合はデフォルト値を返す', () => {
      expect(maskEmail(null)).toBe('***@***.***');
      expect(maskEmail(undefined)).toBe('***@***.***');
    });

    it('不正な形式のメールアドレス', () => {
      expect(maskEmail('invalid-email')).toBe('in*********il');
    });

    it('正常なメールアドレスをマスキング', () => {
      expect(maskEmail('test@example.com')).toBe('****@e*****e.com');
    });

    it('ドメインが単一部分の場合', () => {
      expect(maskEmail('test@localhost')).toBe('****@l*******t');
    });
  });

  describe('maskStackTrace', () => {
    it('undefinedの場合はundefinedを返す', () => {
      expect(maskStackTrace(undefined)).toBeUndefined();
    });

    it('ユーザーパスをマスキング', () => {
      const stack = 'Error at /Users/john/project/file.js:10:5';
      expect(maskStackTrace(stack)).toBe('Error at /Users/***/project/file.js:10:5');
    });

    it('データベース接続文字列をマスキング', () => {
      const stack = 'Error: postgresql://user:pass@host/db failed';
      expect(maskStackTrace(stack)).toBe('Error: postgresql://***:***@***/*** failed');
    });

    it('AWSアクセスキーをマスキング', () => {
      const stack = 'Error: AKIA1234567890123456 invalid';
      expect(maskStackTrace(stack)).toBe('Error: AKIA**************** invalid');
    });

    it('JWTトークンをマスキング', () => {
      const stack =
        'Error: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U invalid';
      expect(maskStackTrace(stack)).toBe('Error: eyJ***.***.***.*** invalid');
    });
  });

  describe('maskSensitiveFields', () => {
    it('機密フィールドをマスキング', () => {
      const obj = {
        username: 'john',
        password: 'secret123',
        token: 'abc123',
        data: 'normal',
      };

      const result = maskSensitiveFields(obj);
      expect(result.password).toBe('***MASKED***');
      expect(result.token).toBe('***MASKED***');
      expect(result.username).toBe('john');
      expect(result.data).toBe('normal');
    });

    it('メールフィールドをマスキング', () => {
      const obj = { email: 'test@example.com', userEmail: 'user@test.com' };
      const result = maskSensitiveFields(obj);
      expect(result.email).toBe('****@e*****e.com');
      expect(result.userEmail).toBe('****@t***t.com');
    });

    it('ネストされたオブジェクトを処理', () => {
      const obj = {
        user: {
          name: 'john',
          password: 'secret',
        },
      };

      const result = maskSensitiveFields(obj);
      expect((result.user as any).password).toBe('***MASKED***');
      expect((result.user as any).name).toBe('john');
    });

    it('配列を処理', () => {
      const obj = {
        users: [
          { name: 'john', password: 'secret1' },
          { name: 'jane', password: 'secret2' },
        ],
      };

      const result = maskSensitiveFields(obj);
      const users = result.users as any[];
      expect(users[0].password).toBe('***MASKED***');
      expect(users[1].password).toBe('***MASKED***');
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('非Errorオブジェクトを処理', () => {
      const result = sanitizeErrorForLogging('string error');
      expect(result.name).toBe('UnknownError');
      expect(result.message).toBe('string error');
    });

    it('Errorオブジェクトを処理', () => {
      const error = new Error('test error');
      error.name = 'TestError';

      const result = sanitizeErrorForLogging(error);
      expect(result.name).toBe('TestError');
      expect(result.message).toBe('test error');
    });

    it('追加プロパティを持つErrorオブジェクト', () => {
      const error = new Error('test error') as any;
      error.details = { password: 'secret', data: 'normal' };

      const result = sanitizeErrorForLogging(error);
      expect((result.details as any).password).toBe('***MASKED***');
      expect((result.details as any).data).toBe('normal');
    });
  });
});
