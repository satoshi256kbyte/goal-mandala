import { Context, Next } from 'hono';
import { z } from 'zod';

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return async (c: Context, next: Next) => {
    const clientId = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();

    const current = rateLimitMap.get(clientId);

    if (!current || now > current.resetTime) {
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      return c.json({ error: 'Too many requests' }, 429);
    }

    current.count++;
    return next();
  };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// Validation schemas with security constraints
export const secureTaskSchema = z.object({
  title: z.string().min(1).max(200).transform(sanitizeInput),
  description: z
    .string()
    .max(2000)
    .optional()
    .transform(val => (val ? sanitizeInput(val) : val)),
  status: z.enum(['not_started', 'in_progress', 'completed', 'skipped']),
});

export const secureNoteSchema = z.object({
  content: z.string().min(1).max(5000).transform(sanitizeInput),
});

// Resource access control
export const authorizeTaskAccess = async (c: Context, next: Next) => {
  const taskId = c.req.param('id');
  const userId = c.get('userId');

  if (!taskId || !userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Verify task belongs to user (would need Prisma instance)
  // This is a simplified version - in real implementation, check database

  return next();
};

// CORS security
export const corsPolicy = (c: Context, next: Next) => {
  const origin = c.req.header('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  return next();
};

// Security headers
export const securityHeaders = (c: Context, next: Next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  return next();
};
