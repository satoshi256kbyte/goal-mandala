import { deepLinkService } from '../deep-link.service';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';

/**
 * Property-Based Tests for Deep Link Service
 *
 * Feature: 3.2-reminder-functionality
 * Property 10: Deep Link Expiration Time
 * Validates: Requirements 3.3
 */

describe('DeepLinkService - Property-Based Tests', () => {
  const TEST_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';

  beforeEach(() => {
    // Clear cache before each test
    deepLinkService.clearCache();

    // Set environment variables for testing
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = TEST_SECRET;
  });

  describe('Property 10: Deep Link Expiration Time', () => {
    /**
     * For any deep link token generated, it should have an expiration time of exactly 24 hours
     *
     * Validates: Requirements 3.3
     */
    it('全てのトークンは正確に24時間の有効期限を持つこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random userId and taskId
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (userId, taskId) => {
            // Record time before token generation
            const beforeGeneration = Date.now();

            // Generate token with default expiration (24 hours)
            const token = await deepLinkService.generateToken({
              userId,
              taskId,
            });

            // Record time after token generation
            const afterGeneration = Date.now();

            // Decode token to get expiration time
            const decoded = jwt.decode(token) as jwt.JwtPayload;
            const expiresAt = new Date(decoded.expiresAt).getTime();

            // Calculate expected expiration (24 hours = 86400 seconds = 86400000 milliseconds)
            const expectedExpirationMin = beforeGeneration + 24 * 60 * 60 * 1000;
            const expectedExpirationMax = afterGeneration + 24 * 60 * 60 * 1000;

            // Verify expiration is within expected range
            // Allow small tolerance for execution time
            expect(expiresAt).toBeGreaterThanOrEqual(expectedExpirationMin);
            expect(expiresAt).toBeLessThanOrEqual(expectedExpirationMax);

            // Verify expiration is approximately 24 hours from now
            const actualExpirationDuration = expiresAt - beforeGeneration;
            const expectedExpirationDuration = 24 * 60 * 60 * 1000;
            const tolerance = 1000; // 1 second tolerance

            expect(Math.abs(actualExpirationDuration - expectedExpirationDuration)).toBeLessThan(
              tolerance
            );
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in the design
      );
    });

    it('カスタム有効期限を指定した場合、指定した時間の有効期限を持つこと', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random userId, taskId, and expiresIn (1 hour to 48 hours)
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 3600, max: 172800 }), // 1 hour to 48 hours in seconds
          async (userId, taskId, expiresIn) => {
            // Record time before token generation
            const beforeGeneration = Date.now();

            // Generate token with custom expiration
            const token = await deepLinkService.generateToken({
              userId,
              taskId,
              expiresIn,
            });

            // Record time after token generation
            const afterGeneration = Date.now();

            // Decode token to get expiration time
            const decoded = jwt.decode(token) as jwt.JwtPayload;
            const expiresAt = new Date(decoded.expiresAt).getTime();

            // Calculate expected expiration
            const expectedExpirationMin = beforeGeneration + expiresIn * 1000;
            const expectedExpirationMax = afterGeneration + expiresIn * 1000;

            // Verify expiration is within expected range
            expect(expiresAt).toBeGreaterThanOrEqual(expectedExpirationMin);
            expect(expiresAt).toBeLessThanOrEqual(expectedExpirationMax);

            // Verify expiration is approximately the specified duration from now
            const actualExpirationDuration = expiresAt - beforeGeneration;
            const expectedExpirationDuration = expiresIn * 1000;
            const tolerance = 1000; // 1 second tolerance

            expect(Math.abs(actualExpirationDuration - expectedExpirationDuration)).toBeLessThan(
              tolerance
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('有効期限切れのトークンは検証に失敗すること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random userId and taskId
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (userId, taskId) => {
            // Generate token with 1 second expiration
            const token = await deepLinkService.generateToken({
              userId,
              taskId,
              expiresIn: 1,
            });

            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Validate token
            const result = await deepLinkService.validateToken(token);

            // Verify token is invalid
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('expired');
          }
        ),
        { numRuns: 10 } // Reduced runs due to timeout (10 runs * 1.5s = 15s)
      );
    }, 60000); // 60 second timeout

    it('有効期限内のトークンは検証に成功すること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random userId and taskId
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (userId, taskId) => {
            // Generate token with 10 seconds expiration
            const token = await deepLinkService.generateToken({
              userId,
              taskId,
              expiresIn: 10,
            });

            // Validate token immediately
            const result = await deepLinkService.validateToken(token);

            // Verify token is valid
            expect(result.valid).toBe(true);
            expect(result.payload).toBeDefined();
            expect(result.payload?.userId).toBe(userId);
            expect(result.payload?.taskId).toBe(taskId);
            expect(result.payload?.expiresAt).toBeInstanceOf(Date);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('トークンの有効期限はJWT標準のexp claimと一致すること', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random userId, taskId, and expiresIn
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 3600, max: 172800 }),
          async (userId, taskId, expiresIn) => {
            // Generate token
            const token = await deepLinkService.generateToken({
              userId,
              taskId,
              expiresIn,
            });

            // Decode token
            const decoded = jwt.decode(token) as jwt.JwtPayload;

            // Verify exp claim exists
            expect(decoded.exp).toBeDefined();

            // Verify expiresAt matches exp claim
            const expiresAt = new Date(decoded.expiresAt).getTime();
            const expClaim = decoded.exp! * 1000; // Convert to milliseconds

            // Allow small tolerance for rounding
            expect(Math.abs(expiresAt - expClaim)).toBeLessThan(1000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
