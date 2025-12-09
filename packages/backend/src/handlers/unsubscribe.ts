/**
 * Unsubscribe Handler
 *
 * Handles unsubscribe and re-enable functionality for reminder emails.
 *
 * Requirements: 9.2, 9.4, 9.5
 */

import { Hono } from 'hono';
import { PrismaClient } from '../generated/prisma-client';
import { deepLinkService } from '../services/deep-link.service.js';
import { HTTPException } from 'hono/http-exception';

const app = new Hono();

// Services (can be injected for testing)
let prisma: PrismaClient = new PrismaClient();
let deepLink: typeof deepLinkService = deepLinkService;

/**
 * Set services for testing
 */
export function setServices(services: {
  prisma?: PrismaClient;
  deepLinkService?: typeof deepLinkService;
}) {
  if (services.prisma) prisma = services.prisma;
  if (services.deepLinkService) deepLink = services.deepLinkService;
}

/**
 * GET /api/reminders/unsubscribe/:token
 *
 * Unsubscribe a user from reminder emails using a token.
 *
 * Requirements: 9.2
 */
app.get('/unsubscribe/:token', async c => {
  const token = c.req.param('token');

  if (!token) {
    throw new HTTPException(400, { message: 'Token is required' });
  }

  try {
    // Validate token
    const validationResult = await deepLink.validateToken(token);

    if (!validationResult.valid) {
      return c.json(
        {
          success: false,
          message: validationResult.error || 'Invalid token',
        },
        400
      );
    }

    const { userId } = validationResult.payload!;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    // Update user reminder preference
    await prisma.userReminderPreference.upsert({
      where: { userId },
      update: {
        enabled: false,
        unsubscribedAt: new Date(),
      },
      create: {
        userId,
        enabled: false,
        unsubscribedAt: new Date(),
      },
    });

    console.log('User unsubscribed from reminders', { userId });

    return c.json({
      success: true,
      message: 'Successfully unsubscribed from reminder emails',
      userId,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    console.error('Unsubscribe error:', error);
    throw new HTTPException(500, {
      message: 'Failed to unsubscribe from reminder emails',
    });
  }
});

/**
 * POST /api/reminders/enable
 *
 * Re-enable reminder emails for a user.
 *
 * Requirements: 9.4, 9.5
 */
app.post('/enable', async c => {
  try {
    // Get userId from request body
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      throw new HTTPException(400, { message: 'userId is required' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    // Update user reminder preference
    await prisma.userReminderPreference.upsert({
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

    console.log('User re-enabled reminders', { userId });

    return c.json({
      success: true,
      message: 'Successfully re-enabled reminder emails',
      userId,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    console.error('Enable reminders error:', error);
    throw new HTTPException(500, {
      message: 'Failed to enable reminder emails',
    });
  }
});

export default app;
