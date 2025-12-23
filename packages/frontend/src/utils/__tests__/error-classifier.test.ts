/**
 * エラー分類ユーティリティのテスト
 */

import { describe, it, afterEach } from 'vitest';
import { classifyError } from '../error-classifier';

afterEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

describe('classifyError', () => {
  describe('ネットワークエラーの分類', () => {
    it('fetch失敗をネットワークエラーとして分類する', () => {
      const error = new TypeError('Failed to fetch');
      const result = classifyError(error);

      expect(result.type).toBe('network');
      expect(result.message).toContain('ネットワークエラー');
    });

    it('オフラインエラーをネットワークエラーとして分類する', () => {
      const error = new Error('Network request failed: offline');
      const result = classifyError(error);

      expect(result.type).toBe('network');
      expect(result.message).toContain('ネットワークエラー');
    });

    it('接続エラーをネットワークエラーとして分類する', () => {
      const error = new Error('Connection refused');
      const result = classifyError(error);

      expect(result.type).toBe('network');
      expect(result.message).toContain('ネットワークエラー');
    });

    it('タイムアウトエラーをネットワークエラーとして分類する', () => {
      const error = new Error('Request timeout');
      const result = classifyError(error);

      expect(result.type).toBe('network');
      expect(result.message).toContain('ネットワークエラー');
    });
  });

  describe('認証エラーの分類', () => {
    it('401エラーを認証エラーとして分類する', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toContain('認証エラー');
    });

    it('403エラーを認証エラーとして分類する', () => {
      const error = { status: 403, message: 'Forbidden' };
      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toContain('認証エラー');
    });

    it('statusCodeプロパティの401を認証エラーとして分類する', () => {
      const error = { statusCode: 401, message: 'Unauthorized' };
      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toContain('認証エラー');
    });

    it('responseオブジェクト内の401を認証エラーとして分類する', () => {
      const error = { response: { status: 401 }, message: 'Unauthorized' };
      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toContain('認証エラー');
    });

    it('unauthorizedメッセージを認証エラーとして分類する', () => {
      const error = new Error('Unauthorized access');
      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toContain('認証エラー');
    });

    it('tokenエラーメッセージを認証エラーとして分類する', () => {
      const error = new Error('Invalid token');
      const result = classifyError(error);

      expect(result.type).toBe('auth');
      expect(result.message).toContain('認証エラー');
    });
  });

  describe('APIエラーの分類', () => {
    it('400エラーをAPIエラーとして分類する', () => {
      const error = { status: 400, message: 'Bad Request' };
      const result = classifyError(error);

      expect(result.type).toBe('api');
      expect(result.message).toBe('Bad Request');
    });

    it('404エラーをAPIエラーとして分類する', () => {
      const error = { status: 404, message: 'Not Found' };
      const result = classifyError(error);

      expect(result.type).toBe('api');
      expect(result.message).toBe('Not Found');
    });

    it('500エラーをAPIエラーとして分類する', () => {
      const error = { status: 500, message: 'Internal Server Error' };
      const result = classifyError(error);

      expect(result.type).toBe('api');
      expect(result.message).toBe('Internal Server Error');
    });

    it('503エラーをAPIエラーとして分類する', () => {
      const error = { status: 503, message: 'Service Unavailable' };
      const result = classifyError(error);

      expect(result.type).toBe('api');
      expect(result.message).toBe('Service Unavailable');
    });

    it('レスポンスボディのメッセージを使用する', () => {
      const error = {
        status: 400,
        response: {
          data: {
            message: 'カスタムエラーメッセージ',
          },
        },
      };
      const result = classifyError(error);

      expect(result.type).toBe('api');
      expect(result.message).toBe('カスタムエラーメッセージ');
    });

    it('statusCodeプロパティのエラーをAPIエラーとして分類する', () => {
      const error = { statusCode: 500, message: 'Server Error' };
      const result = classifyError(error);

      expect(result.type).toBe('api');
      expect(result.message).toBe('Server Error');
    });

    it('responseオブジェクト内のステータスをAPIエラーとして分類する', () => {
      const error = { response: { status: 500 }, message: 'Server Error' };
      const result = classifyError(error);

      expect(result.type).toBe('api');
      expect(result.message).toBe('Server Error');
    });
  });

  describe('不明なエラーの分類', () => {
    it('分類できないエラーを不明なエラーとして分類する', () => {
      const error = new Error('Unknown error');
      const result = classifyError(error);

      expect(result.type).toBe('unknown');
      expect(result.message).toContain('予期しないエラー');
    });

    it('nullをunknownエラーとして分類する', () => {
      const result = classifyError(null);

      expect(result.type).toBe('unknown');
      expect(result.message).toContain('予期しないエラー');
    });

    it('undefinedをunknownエラーとして分類する', () => {
      const result = classifyError(undefined);

      expect(result.type).toBe('unknown');
      expect(result.message).toContain('予期しないエラー');
    });

    it('文字列エラーをunknownエラーとして分類する', () => {
      const result = classifyError('Something went wrong');

      expect(result.type).toBe('unknown');
      expect(result.message).toContain('予期しないエラー');
    });

    it('数値エラーをunknownエラーとして分類する', () => {
      const result = classifyError(500);

      expect(result.type).toBe('unknown');
      expect(result.message).toContain('予期しないエラー');
    });
  });

  describe('originalErrorの保持', () => {
    it('元のエラーオブジェクトを保持する', () => {
      const originalError = new Error('Test error');
      const result = classifyError(originalError);

      expect(result.originalError).toBe(originalError);
    });
  });

  describe('エッジケース', () => {
    it('空のオブジェクトをunknownエラーとして分類する', () => {
      const result = classifyError({});

      expect(result.type).toBe('unknown');
    });

    it('複数の条件に該当する場合、優先順位に従って分類する', () => {
      // ネットワークエラーが最優先
      const networkError = new TypeError('Failed to fetch');
      expect(classifyError(networkError).type).toBe('network');

      // 認証エラーが次に優先
      const authError = { status: 401, message: 'Unauthorized' };
      expect(classifyError(authError).type).toBe('auth');

      // APIエラーが次に優先
      const apiError = { status: 500, message: 'Server Error' };
      expect(classifyError(apiError).type).toBe('api');
    });
  });
});
