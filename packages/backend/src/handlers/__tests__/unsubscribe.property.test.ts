/**
 * Unsubscribe Handler Property-Based Tests
 *
 * Property-based tests for unsubscribe and re-enable functionality.
 *
 * Requirements: 9.2, 9.3, 9.5
 */

import * as fc from 'fast-check';
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
    findUnique: jest.fn(),
  },
} as any;

const mockDeepLinkService = {
  validateToken: jest.fn(),
} as any;

describe('Unsubscribe Handler - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Inject mock services
    setServices({
      prisma: mockPrisma,
      deepLinkService: mockDeepLinkService,
    });
  });

  /**
   * Property 30: Unsubscribe Preference Update
   *
   * For any user who clicks the unsubscribe link, the ReminderSystem should mark
   * the user's reminder preference as disabled.
   *
   * Validates: Requirements 9.2
   */
  describe('Property 30: Unsubscribe Preference Update', () => {
    it('配信停止リンクをクリックしたユーザーのリマインド設定が無効化されること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user ID (UUID format)
          fc.uuid(),
          // Generate random task ID (UUID format)
          fc.uuid(),
          async (userId, taskId) => {
            // Arrange
            const token = `token-${userId}-${taskId}`;

            mockDeepLinkService.validateToken.mockResolvedValue({
              valid: true,
              payload: {
                userId,
                taskId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });

            mockPrisma.user.findUnique.mockResolvedValue({
              id: userId,
              email: `${userId}@example.com`,
              name: `User ${userId}`,
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

            // Verify that upsert was called with enabled: false
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
          }
        ),
        { numRuns: 100 }
      );
    });

    it('無効なトークンの場合は設定が更新されないこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random invalid token (alphanumeric only to avoid JSON parsing issues)
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          async invalidToken => {
            // Arrange
            mockDeepLinkService.validateToken.mockResolvedValue({
              valid: false,
              error: 'Invalid token',
            });

            // Act
            const res = await unsubscribeHandler.request(`/unsubscribe/${invalidToken}`);

            // Try to parse as JSON, but handle plain text responses
            let data: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              data = await res.json();
            } else {
              // Plain text or HTML response
              data = { success: false };
            }

            // Assert
            expect(res.status).toBe(400);
            expect(data.success).toBe(false);

            // Verify that upsert was NOT called
            expect(mockPrisma.userReminderPreference.upsert).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('存在しないユーザーの場合は設定が更新されないこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user ID (UUID format)
          fc.uuid(),
          // Generate random task ID (UUID format)
          fc.uuid(),
          async (userId, taskId) => {
            // Arrange
            const token = `token-${userId}-${taskId}`;

            mockDeepLinkService.validateToken.mockResolvedValue({
              valid: true,
              payload: {
                userId,
                taskId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });

            mockPrisma.user.findUnique.mockResolvedValue(null);

            // Act
            const res = await unsubscribeHandler.request(`/unsubscribe/${token}`);

            // Try to parse as JSON, but handle plain text responses
            let data: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              data = await res.json();
            } else {
              // Plain text or HTML response
              const text = await res.text();
              data = { message: text };
            }

            // Assert
            expect(res.status).toBe(404);
            expect(data.message).toBeDefined();

            // Verify that upsert was NOT called
            expect(mockPrisma.userReminderPreference.upsert).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 31: No Email for Unsubscribed Users
   *
   * For any user who has disabled reminders, the ReminderSystem should not send
   * reminder emails.
   *
   * Validates: Requirements 9.3
   *
   * Note: This property is validated by checking that the user's reminder preference
   * is correctly set to disabled. The actual email sending logic is tested in the
   * Reminder Lambda Function tests.
   */
  describe('Property 31: No Email for Unsubscribed Users', () => {
    it('配信停止したユーザーのリマインド設定がenabledがfalseになること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user ID (UUID format)
          fc.uuid(),
          // Generate random task ID (UUID format)
          fc.uuid(),
          async (userId, taskId) => {
            // Arrange
            const token = `token-${userId}-${taskId}`;

            mockDeepLinkService.validateToken.mockResolvedValue({
              valid: true,
              payload: {
                userId,
                taskId,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });

            mockPrisma.user.findUnique.mockResolvedValue({
              id: userId,
              email: `${userId}@example.com`,
              name: `User ${userId}`,
            });

            let capturedPreference: any = null;
            mockPrisma.userReminderPreference.upsert.mockImplementation(async (args: any) => {
              capturedPreference = {
                userId: args.where.userId,
                enabled: args.update.enabled,
                unsubscribedAt: args.update.unsubscribedAt,
              };
              return capturedPreference;
            });

            // Act
            await unsubscribeHandler.request(`/unsubscribe/${token}`);

            // Assert: Verify that the preference is set to disabled
            expect(capturedPreference).not.toBeNull();
            expect(capturedPreference.userId).toBe(userId);
            expect(capturedPreference.enabled).toBe(false);
            expect(capturedPreference.unsubscribedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 32: Resume Email on Re-enable
   *
   * For any user who re-enables reminders, the ReminderSystem should resume sending
   * reminder emails starting the next weekday.
   *
   * Validates: Requirements 9.5
   *
   * Note: This property is validated by checking that the user's reminder preference
   * is correctly set to enabled. The actual email sending logic is tested in the
   * Reminder Lambda Function tests.
   */
  describe('Property 32: Resume Email on Re-enable', () => {
    it('再有効化したユーザーのリマインド設定がenabledがtrueになること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user ID (UUID format)
          fc.uuid(),
          async userId => {
            // Arrange
            mockPrisma.user.findUnique.mockResolvedValue({
              id: userId,
              email: `${userId}@example.com`,
              name: `User ${userId}`,
            });

            let capturedPreference: any = null;
            mockPrisma.userReminderPreference.upsert.mockImplementation(async (args: any) => {
              capturedPreference = {
                userId: args.where.userId,
                enabled: args.update.enabled,
                unsubscribedAt: args.update.unsubscribedAt,
              };
              return capturedPreference;
            });

            // Act
            await unsubscribeHandler.request('/enable', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId }),
            });

            // Assert: Verify that the preference is set to enabled
            expect(capturedPreference).not.toBeNull();
            expect(capturedPreference.userId).toBe(userId);
            expect(capturedPreference.enabled).toBe(true);
            expect(capturedPreference.unsubscribedAt).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('無効なuserIdの場合は設定が更新されないこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user ID (UUID format)
          fc.uuid(),
          async userId => {
            // Arrange
            mockPrisma.user.findUnique.mockResolvedValue(null);

            // Act
            const res = await unsubscribeHandler.request('/enable', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userId }),
            });

            // Try to parse as JSON, but handle plain text responses
            let data: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              data = await res.json();
            } else {
              // Plain text or HTML response
              const text = await res.text();
              data = { message: text };
            }

            // Assert
            expect(res.status).toBe(404);
            expect(data.message).toBeDefined();

            // Verify that upsert was NOT called
            expect(mockPrisma.userReminderPreference.upsert).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('userIdが指定されていない場合は設定が更新されないこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random invalid body (without userId)
          fc.record({
            invalidField: fc.string(),
          }),
          async invalidBody => {
            // Act
            const res = await unsubscribeHandler.request('/enable', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(invalidBody),
            });

            // Try to parse as JSON, but handle plain text responses
            let data: any;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              data = await res.json();
            } else {
              // Plain text or HTML response
              const text = await res.text();
              data = { message: text };
            }

            // Assert
            expect(res.status).toBe(400);
            expect(data.message).toBeDefined();

            // Verify that upsert was NOT called
            expect(mockPrisma.userReminderPreference.upsert).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
