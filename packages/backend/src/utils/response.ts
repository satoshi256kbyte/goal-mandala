import { Context } from 'hono';

/**
 * 統一されたレスポンス形式を作成するユーティリティ
 */
export const createResponse = (c: Context, status: number, message: string, data?: unknown) => {
  const response = {
    success: status < 400,
    message,
    timestamp: new Date().toISOString(),
    ...(data ? { data } : {}),
  };

  return c.json(response, status as 200 | 201 | 400 | 401 | 403 | 404 | 500);
};

/**
 * 成功レスポンスを作成する
 */
export const createSuccessResponse = (c: Context, data?: unknown, message?: string) => {
  return createResponse(c, 200, message || 'Success', data);
};

/**
 * エラーレスポンスを作成する
 */
export const createErrorResponse = (c: Context, status: number, message: string) => {
  return createResponse(c, status, message);
};
