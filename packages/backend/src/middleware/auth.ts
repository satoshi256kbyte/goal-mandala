/**
 * 認証ミドルウェア
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface JWTPayload {
  sub: string; // ユーザーID
  email: string;
  iat: number;
  exp: number;
}

/**
 * JWT認証ミドルウェア
 */
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
      throw new HTTPException(401, { message: 'Authorization header is required' });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      throw new HTTPException(401, { message: 'Bearer token is required' });
    }

    // JWT検証
    const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

    // ユーザー情報をコンテキストに設定
    c.set('user', {
      id: payload.sub,
      email: payload.email,
    });

    logger.info('User authenticated', {
      userId: payload.sub,
      email: payload.email,
    });

    await next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      throw new HTTPException(401, { message: 'Invalid token' });
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token', { error: error.message });
      throw new HTTPException(401, { message: 'Token expired' });
    }

    throw error;
  }
};

/**
 * オプショナル認証ミドルウェア（認証されていなくてもエラーにしない）
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');

      if (token) {
        const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;

        c.set('user', {
          id: payload.sub,
          email: payload.email,
        });
      }
    }
  } catch (error) {
    // オプショナル認証なのでエラーは無視
    logger.debug('Optional auth failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  await next();
};

/**
 * ユーザー情報を取得するヘルパー関数
 */
export const getCurrentUser = (c: Context) => {
  const user = c.get('user');

  if (!user) {
    throw new HTTPException(401, { message: 'User not authenticated' });
  }

  return user;
};

/**
 * オプショナルユーザー情報を取得するヘルパー関数
 */
export const getCurrentUserOptional = (c: Context) => {
  return c.get('user') || null;
};
