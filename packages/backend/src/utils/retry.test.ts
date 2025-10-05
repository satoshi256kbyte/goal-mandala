import { retryWithBackoff, RetryConfig } from './retry';

describe('Retry Logic', () => {
  describe('retryWithBackoff', () => {
    it('成功した関数は1回だけ実行される', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('リトライ可能なエラーで最大3回リトライする', async () => {
      const error = new Error('ThrottlingException');
      error.name = 'ThrottlingException';

      const fn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const config: RetryConfig = {
        maxRetries: 3,
        baseDelay: 10, // 短い遅延
        maxDelay: 100,
        backoffMultiplier: 2,
      };

      const result = await retryWithBackoff(fn, config);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('リトライ不可能なエラーは即座に失敗する', async () => {
      const error = new Error('ValidationException');
      error.name = 'ValidationException';

      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn)).rejects.toThrow('ValidationException');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('最大リトライ回数を超えたら失敗する', async () => {
      const error = new Error('ThrottlingException');
      error.name = 'ThrottlingException';

      const fn = jest.fn().mockRejectedValue(error);

      const config: RetryConfig = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
      };

      await expect(retryWithBackoff(fn, config)).rejects.toThrow('ThrottlingException');
      expect(fn).toHaveBeenCalledTimes(4); // 初回 + 3回のリトライ
    });

    it('カスタム設定でリトライする', async () => {
      const error = new Error('ServiceUnavailableException');
      error.name = 'ServiceUnavailableException';

      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const config: RetryConfig = {
        maxRetries: 5,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 3,
      };

      const result = await retryWithBackoff(fn, config);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('リトライ中に異なるエラーが発生した場合', async () => {
      const throttlingError = new Error('ThrottlingException');
      throttlingError.name = 'ThrottlingException';

      const validationError = new Error('ValidationException');
      validationError.name = 'ValidationException';

      const fn = jest
        .fn()
        .mockRejectedValueOnce(throttlingError)
        .mockRejectedValueOnce(validationError);

      const config: RetryConfig = {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
      };

      await expect(retryWithBackoff(fn, config)).rejects.toThrow('ValidationException');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('リトライ回数が0の場合は1回だけ実行する', async () => {
      const error = new Error('ThrottlingException');
      error.name = 'ThrottlingException';

      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, { maxRetries: 0 })).rejects.toThrow('ThrottlingException');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラータイプ別のリトライ動作', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2,
    };

    it('ThrottlingExceptionはリトライする', async () => {
      const error = new Error('ThrottlingException');
      error.name = 'ThrottlingException';

      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const result = await retryWithBackoff(fn, config);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('ServiceUnavailableExceptionはリトライする', async () => {
      const error = new Error('ServiceUnavailableException');
      error.name = 'ServiceUnavailableException';

      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const result = await retryWithBackoff(fn, config);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('InternalServerExceptionはリトライする', async () => {
      const error = new Error('InternalServerException');
      error.name = 'InternalServerException';

      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const result = await retryWithBackoff(fn, config);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('TimeoutErrorはリトライする', async () => {
      const error = new Error('TimeoutError');
      error.name = 'TimeoutError';

      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const result = await retryWithBackoff(fn, config);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('ValidationExceptionはリトライしない', async () => {
      const error = new Error('ValidationException');
      error.name = 'ValidationException';

      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, config)).rejects.toThrow('ValidationException');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('AccessDeniedExceptionはリトライしない', async () => {
      const error = new Error('AccessDeniedException');
      error.name = 'AccessDeniedException';

      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, config)).rejects.toThrow('AccessDeniedException');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('ParseErrorはリトライしない', async () => {
      const error = new Error('ParseError');
      error.name = 'ParseError';

      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, config)).rejects.toThrow('ParseError');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('エッジケース', () => {
    it('nullを返す関数を処理する', async () => {
      const fn = jest.fn().mockResolvedValue(null);

      const result = await retryWithBackoff(fn);

      expect(result).toBeNull();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('undefinedを返す関数を処理する', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);

      const result = await retryWithBackoff(fn);

      expect(result).toBeUndefined();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('複雑なオブジェクトを返す関数を処理する', async () => {
      const complexObject = {
        data: { nested: { value: 'test' } },
        array: [1, 2, 3],
      };

      const fn = jest.fn().mockResolvedValue(complexObject);

      const result = await retryWithBackoff(fn);

      expect(result).toEqual(complexObject);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
