/**
 * Reminder Test Routes
 *
 * Hono routes for reminder testing functionality.
 * Requirements: 10.1, 10.2
 */

import { Hono } from 'hono';
import { reminderTestHandler } from './reminder-test.js';

const reminderTestRoutes = new Hono();

/**
 * Manual trigger endpoint
 *
 * POST /api/v1/reminders/test/trigger
 *
 * Requirements: 10.1
 */
reminderTestRoutes.post('/trigger', async c => {
  return reminderTestHandler.manualTrigger(c);
});

/**
 * Email preview endpoint
 *
 * POST /api/v1/reminders/test/preview
 *
 * Requirements: 10.2
 */
reminderTestRoutes.post('/preview', async c => {
  return reminderTestHandler.emailPreview(c);
});

/**
 * Test mode status endpoint
 *
 * GET /api/v1/reminders/test/status
 *
 * Requirements: 10.4, 10.5
 */
reminderTestRoutes.get('/status', async c => {
  const { emailService } = await import('../services/email.service.js');

  return c.json({
    testMode: emailService.isTestMode(),
    environment: process.env.NODE_ENV || 'development',
    emailTestMode: process.env.EMAIL_TEST_MODE || 'false',
  });
});

export default reminderTestRoutes;
