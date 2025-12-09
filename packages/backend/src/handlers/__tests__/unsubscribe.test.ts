/**
 * Unsubscribe Handler Unit Tests
 *
 * Tests for unsubscribe and re-enable functionality.
 *
 * Requirements: 9.2, 9.4, 9.5
 */

import unsubscribeHandler, { setServices } from '../unsubscribe';

// Mock dependencies first
jest.mock('../../generated/prisma-client');
jest.mock('../../services/deep-link.service');

// Create mock services after mocking
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  userReminderPreference: {
    upsert: jest.fn(),
  },
} as any;

const mockDeepLinkService = {
  validateToken: jest.fn(),
} as any;

describe('Unsubscribe Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Inject mock services
    setServices({
      prisma: mockPrisma,
      deepLinkService: mockDeepLinkService,
    });
  });

  describe('GET /unsubscribe/:token', () => {
    it('配信停止が成功すること', async () => {
      // Arrange
      const userId = 'test-user-id';
      const token = 'valid-token';

      mockDeepLinkService.validateToken.mockResolvedValue({
        valid: true,
        payload: {
          userId,
          taskId: 'test-task-id',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      });

      mockPrisma.userReminderPreference.upsert.mockResolvedValue({
        userId,
        enabled: false,
        unsubscribedAt: new Date(),
      });

      // Act
      const res = await unsubscribeHandler.request(`/unsubscribe/${token}`);
      const data = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userId).toBe(userId);
      expect(mockPrisma.userReminderPreference.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          enabled: false,
          unsubscribedAt: expect.any(Date),
        },
        create: {
          userId,
          enabled: false,
          unsubscribedAt: expect.any(Date),
        },
      });
    });

    it('トークンが無効な場合はエラーを返すこと', async () => {
      // Arrange
      const token = 'invalid-token';

      mockDeepLinkService.validateToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      // Act
      const res = await unsubscribeHandler.request(`/unsubscribe/${token}`);
      const data = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(data.message).toBeDefined();
    });

    it('ユーザーが存在しない場合はエラーを返すこと', async () => {
      // Arrange
      const userId = 'non-existent-user';
      const token = 'valid-token';

      mockDeepLinkService.validateToken.mockResolvedValue({
        valid: true,
        payload: {
          userId,
          taskId: 'test-task-id',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const res = await unsubscribeHandler.request(`/unsubscribe/${token}`);
      const data = await res.json();

      // Assert
      expect(res.status).toBe(404);
      expect(data.message).toBeDefined();
    });
  });

  describe('POST /enable', () => {
    it('再有効化が成功すること', async () => {
      // Arrange
      const userId = 'test-user-id';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      });

      mockPrisma.userReminderPreference.upsert.mockResolvedValue({
        userId,
        enabled: true,
        unsubscribedAt: null,
      });

      // Act
      const res = await unsubscribeHandler.request('/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.userId).toBe(userId);
      expect(mockPrisma.userReminderPreference.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          enabled: true,
          unsubscribedAt: null,
        },
        create: {
          userId,
          enabled: true,
          unsubscribedAt: null,
        },
      });
    });

    it('userIdが指定されていない場合はエラーを返すこと', async () => {
      // Act
      const res = await unsubscribeHandler.request('/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      // Assert
      expect(res.status).toBe(400);
      expect(data.message).toBeDefined();
    });

    it('ユーザーが存在しない場合はエラーを返すこと', async () => {
      // Arrange
      const userId = 'non-existent-user';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const res = await unsubscribeHandler.request('/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      // Assert
      expect(res.status).toBe(404);
      expect(data.message).toBeDefined();
    });

    it('データベースエラーが発生した場合はエラーを返すこと', async () => {
      // Arrange
      const userId = 'test-user-id';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      });

      mockPrisma.userReminderPreference.upsert.mockRejectedValue(new Error('Database error'));

      // Act
      const res = await unsubscribeHandler.request('/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();

      // Assert
      expect(res.status).toBe(500);
      expect(data.message).toBeDefined();
    });
  });
});
