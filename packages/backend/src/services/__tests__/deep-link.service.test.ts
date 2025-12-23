import { deepLinkService } from '../deep-link.service';
import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Mock AWS Secrets Manager
jest.mock('@aws-sdk/client-secrets-manager');

const mockSend = jest.fn();
const mockSecretsManagerClient = {
  send: mockSend,
};

(SecretsManagerClient as jest.MockedClass<typeof SecretsManagerClient>).mockImplementation(
  () => mockSecretsManagerClient as any
);

describe('DeepLinkService', () => {
  const TEST_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
  const TEST_USER_ID = 'user-123';
  const TEST_TASK_ID = 'task-456';

  beforeEach(() => {
    // Clear cache before each test
    deepLinkService.clearCache();

    // Reset mocks
    mockSend.mockReset();

    // Set environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('トークンを正常に生成できること', async () => {
      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format: header.payload.signature
    });

    it('生成されたトークンに正しいペイロードが含まれること', async () => {
      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded.userId).toBe(TEST_USER_ID);
      expect(decoded.taskId).toBe(TEST_TASK_ID);
      expect(decoded.expiresAt).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('デフォルトで24時間の有効期限が設定されること', async () => {
      const beforeGeneration = Date.now();

      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      const expiresAt = new Date(decoded.expiresAt).getTime();
      const expectedExpiration = beforeGeneration + 24 * 60 * 60 * 1000;

      // Allow 1 second tolerance
      expect(Math.abs(expiresAt - expectedExpiration)).toBeLessThan(1000);
    });

    it('カスタム有効期限を設定できること', async () => {
      const customExpiresIn = 3600; // 1 hour
      const beforeGeneration = Date.now();

      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
        expiresIn: customExpiresIn,
      });

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      const expiresAt = new Date(decoded.expiresAt).getTime();
      const expectedExpiration = beforeGeneration + customExpiresIn * 1000;

      // Allow 1 second tolerance
      expect(Math.abs(expiresAt - expectedExpiration)).toBeLessThan(1000);
    });

    it('userIdが空の場合はエラーをスローすること', async () => {
      await expect(
        deepLinkService.generateToken({
          userId: '',
          taskId: TEST_TASK_ID,
        })
      ).rejects.toThrow('Invalid userId');
    });

    it('taskIdが空の場合はエラーをスローすること', async () => {
      await expect(
        deepLinkService.generateToken({
          userId: TEST_USER_ID,
          taskId: '',
        })
      ).rejects.toThrow('Invalid taskId');
    });

    it('expiresInが0以下の場合はエラーをスローすること', async () => {
      await expect(
        deepLinkService.generateToken({
          userId: TEST_USER_ID,
          taskId: TEST_TASK_ID,
          expiresIn: 0,
        })
      ).rejects.toThrow('Invalid expiresIn');

      await expect(
        deepLinkService.generateToken({
          userId: TEST_USER_ID,
          taskId: TEST_TASK_ID,
          expiresIn: -100,
        })
      ).rejects.toThrow('Invalid expiresIn');
    });
  });

  describe('validateToken', () => {
    it('有効なトークンを正常に検証できること', async () => {
      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      const result = await deepLinkService.validateToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe(TEST_USER_ID);
      expect(result.payload?.taskId).toBe(TEST_TASK_ID);
      expect(result.payload?.expiresAt).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('有効期限切れのトークンを拒否すること', async () => {
      // Generate token with 1 second expiration
      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
        expiresIn: 1,
      });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await deepLinkService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toContain('expired');
    });

    it('不正な形式のトークンを拒否すること', async () => {
      const result = await deepLinkService.validateToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('空のトークンを拒否すること', async () => {
      const result = await deepLinkService.validateToken('');

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toContain('must be a non-empty string');
    });

    it('異なるシークレットで署名されたトークンを拒否すること', async () => {
      // Generate token with different secret
      const differentSecret = 'different-secret-key';
      const token = jwt.sign(
        {
          userId: TEST_USER_ID,
          taskId: TEST_TASK_ID,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        differentSecret,
        { algorithm: 'HS256' }
      );

      const result = await deepLinkService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('必須フィールドが欠けているトークンを拒否すること', async () => {
      // Generate token without taskId
      const token = jwt.sign(
        {
          userId: TEST_USER_ID,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        TEST_SECRET,
        { algorithm: 'HS256' }
      );

      const result = await deepLinkService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toContain('missing required fields');
    });

    it('不正な有効期限形式のトークンを拒否すること', async () => {
      const token = jwt.sign(
        {
          userId: TEST_USER_ID,
          taskId: TEST_TASK_ID,
          expiresAt: 'invalid-date',
        },
        TEST_SECRET,
        { algorithm: 'HS256' }
      );

      const result = await deepLinkService.validateToken(token);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeUndefined();
      expect(result.error).toContain('invalid expiration date');
    });
  });

  describe('シークレット管理', () => {
    it('本番環境ではSecrets Managerからシークレットを取得すること', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      // Mock Secrets Manager response
      mockSend.mockResolvedValue({
        SecretString: TEST_SECRET,
      });

      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      expect(token).toBeDefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('Secrets ManagerのJSONレスポンスを正しくパースすること', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      // Mock Secrets Manager with JSON response
      mockSend.mockResolvedValue({
        SecretString: JSON.stringify({ jwtSecret: TEST_SECRET }),
      });

      const token = await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      expect(token).toBeDefined();
    });

    it('シークレットをキャッシュすること', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      mockSend.mockResolvedValue({
        SecretString: TEST_SECRET,
      });

      // First call
      await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      // Second call (should use cache)
      await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      // Should only call Secrets Manager once
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('Secrets Manager取得失敗時はエラーをスローすること', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      mockSend.mockRejectedValue(new Error('Access denied'));

      await expect(
        deepLinkService.generateToken({
          userId: TEST_USER_ID,
          taskId: TEST_TASK_ID,
        })
      ).rejects.toThrow('Failed to retrieve JWT secret');
    });
  });

  describe('clearCache', () => {
    it('キャッシュをクリアできること', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      mockSend.mockResolvedValue({
        SecretString: TEST_SECRET,
      });

      // First call
      await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      // Clear cache
      deepLinkService.clearCache();

      // Second call (should fetch again)
      await deepLinkService.generateToken({
        userId: TEST_USER_ID,
        taskId: TEST_TASK_ID,
      });

      // Should call Secrets Manager twice
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});
