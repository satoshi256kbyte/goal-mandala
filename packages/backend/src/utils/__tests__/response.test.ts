/**
 * responseユーティリティのテスト
 */

import { createSuccessResponse, createErrorResponse } from '../response';

// モックのHonoコンテキスト
const mockContext = {
  json: jest.fn((data, status) => ({ data, status })),
};

describe('Response Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createSuccessResponse - 成功レスポンス作成', () => {
    const data = { id: '1', name: 'Test' };
    const result = createSuccessResponse(mockContext as any, data);

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data,
        timestamp: expect.any(String),
      }),
      200
    );
  });

  it('createErrorResponse - エラーレスポンス作成', () => {
    const result = createErrorResponse(mockContext as any, 400, 'Test error');

    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Test error',
        timestamp: expect.any(String),
      }),
      400
    );
  });
});
