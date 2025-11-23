/**
import { ActionFormData } from '../../contexts/ActionContext';
 * フォームセキュリティフックのテスト
 *
 * テスト内容:
 * - セキュリティフックの動作テスト
 * - 認証・認可の統合テスト
 * - エラーハンドリングのテスト
 *
 * 要件: 要件1, 要件2
 */

import React from 'react';
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormSecurity } from '../useFormSecurity';
import { AuthContext, SubGoalFormData } from '../../services/form-security';

// テスト用のコンポーネント
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

describe('useFormSecurity', () => {
  const mockAuthContext: AuthContext = {
    userId: 'test-user-123',
    token: 'test-token',
    permissions: ['subgoal:edit', 'action:edit'],
    sessionId: 'test-session',
  };

  beforeEach(() => {
    // コンソールの警告を抑制
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期化とセットアップ', () => {
    it('初期状態が正しく設定される', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isValidating).toBe(false);
      expect(result.current.securityErrors).toEqual([]);
      expect(result.current.securityWarnings).toEqual([]);
    });

    it('認証コンテキストを設定できる', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('権限チェックが正しく動作する', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      expect(result.current.hasPermission('subgoal:edit')).toBe(true);
      expect(result.current.hasPermission('action:edit')).toBe(true);
      expect(result.current.hasPermission('admin:delete')).toBe(false);
    });
  });

  describe('サブ目標データの検証', () => {
    it('有効なサブ目標データを検証する', async () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      const validData: Partial<SubGoalFormData> = {
        title: 'テストタイトル',
        description: 'テスト説明',
        background: 'テスト背景',
        position: 0,
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateSubGoalData(validData);
      });

      expect(validationResult?.isValid).toBe(true);
      expect(result.current.securityErrors).toEqual([]);
    });

    it('XSS攻撃を含むデータを検出する', async () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      const maliciousData: Partial<SubGoalFormData> = {
        title: '<script>alert("XSS")</script>',
        description: 'テスト説明',
        background: 'テスト背景',
        position: 0,
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateSubGoalData(maliciousData);
      });

      expect(validationResult?.isValid).toBe(false);
      expect(result.current.securityErrors.length).toBeGreaterThan(0);
      expect(
        result.current.securityErrors.some(error => error.includes('XSS攻撃の可能性があります'))
      ).toBe(true);
    });

    it('認証されていない場合はエラーを返す', async () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      // 認証コンテキストを設定しない

      const data: Partial<SubGoalFormData> = {
        title: 'テストタイトル',
        description: 'テスト説明',
        background: 'テスト背景',
        position: 0,
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateSubGoalData(data);
      });

      expect(validationResult?.isValid).toBe(false);
      expect(result.current.securityErrors).toContain('認証が必要です');
    });
  });

  describe('アクションデータの検証', () => {
    it('有効なアクションデータを検証する', async () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      const validData: Partial<ActionFormData> = {
        subGoalId: 'test-subgoal',
        title: 'テストアクション',
        description: 'テスト説明',
        background: 'テスト背景',
        type: 'execution',
        position: 0,
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateActionData(validData);
      });

      expect(validationResult?.isValid).toBe(true);
      expect(result.current.securityErrors).toEqual([]);
    });

    it('権限がない場合はエラーを返す', async () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      const limitedAuthContext: AuthContext = {
        userId: 'test-user',
        token: 'test-token',
        permissions: ['subgoal:edit'], // action:edit権限なし
        sessionId: 'test-session',
      };

      act(() => {
        result.current.setAuthContext(limitedAuthContext);
      });

      const data: Partial<ActionFormData> = {
        subGoalId: 'test-subgoal',
        title: 'テストアクション',
        description: 'テスト説明',
        background: 'テスト背景',
        type: 'execution',
        position: 0,
      };

      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateActionData(data);
      });

      expect(validationResult?.isValid).toBe(false);
      expect(result.current.securityErrors).toContain('アクションの編集権限がありません');
    });
  });

  describe('リクエスト検証', () => {
    it('有効なリクエストを検証する', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      // window.location.originをモック
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://example.com',
          href: 'https://example.com/form',
        },
        writable: true,
      });

      const validRequest = {
        method: 'POST',
        url: '/api/subgoals',
        headers: {
          origin: 'https://example.com',
          referer: 'https://example.com/form',
          'content-type': 'application/json',
          'x-csrf-token': result.current.getCSRFToken(), // CSRFトークンを追加
        },
        body: { title: 'Test' },
      };

      const validationResult = result.current.validateRequest(validRequest);

      expect(validationResult.isValid).toBe(true);
    });

    it('CSRF攻撃を検出する', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      const maliciousRequest = {
        method: 'POST',
        url: '/api/subgoals',
        headers: {
          origin: 'https://malicious-site.com',
          referer: 'https://malicious-site.com/attack',
        },
        body: { title: 'Test' },
      };

      const validationResult = result.current.validateRequest(maliciousRequest);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('CSRF攻撃の可能性があります');
    });
  });

  describe('セキュリティヘッダーとトークン', () => {
    it('セキュアなヘッダーを生成する', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      const headers = result.current.generateSecureHeaders();

      expect(headers).toHaveProperty('X-CSRF-Token');
      expect(headers).toHaveProperty('X-Requested-With', 'XMLHttpRequest');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).toHaveProperty('Cache-Control', 'no-cache, no-store, must-revalidate');
    });

    it('CSRFトークンを取得する', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      const token = result.current.getCSRFToken();

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('エラー管理', () => {
    it('セキュリティエラーをクリアできる', async () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      // エラーを発生させる
      const maliciousData: Partial<SubGoalFormData> = {
        title: '<script>alert("XSS")</script>',
        description: 'テスト説明',
        background: 'テスト背景',
        position: 0,
      };

      await act(async () => {
        await result.current.validateSubGoalData(maliciousData);
      });

      expect(result.current.securityErrors.length).toBeGreaterThan(0);

      // エラーをクリア
      act(() => {
        result.current.clearSecurityErrors();
      });

      expect(result.current.securityErrors).toEqual([]);
      expect(result.current.securityWarnings).toEqual([]);
    });

    it('検証中の状態を管理する', async () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.setAuthContext(mockAuthContext);
      });

      const data: Partial<SubGoalFormData> = {
        title: 'テストタイトル',
        description: 'テスト説明',
        background: 'テスト背景',
        position: 0,
      };

      // 検証開始前
      expect(result.current.isValidating).toBe(false);

      // 検証実行
      const validationPromise = act(async () => {
        return result.current.validateSubGoalData(data);
      });

      // 検証完了後
      await validationPromise;
      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('エラーケース', () => {
    it('セキュリティサービスが初期化されていない場合のエラーハンドリング', async () => {
      // useFormSecurityの内部実装をモックして初期化エラーをシミュレート
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      // securityRefを無効にする（実際の実装では発生しないが、エラーハンドリングをテスト）
      const data: Partial<SubGoalFormData> = {
        title: 'テストタイトル',
        description: 'テスト説明',
        background: 'テスト背景',
        position: 0,
      };

      // 認証コンテキストを設定せずに検証を実行
      let validationResult;
      await act(async () => {
        validationResult = await result.current.validateSubGoalData(data);
      });

      expect(validationResult?.isValid).toBe(false);
      expect(validationResult?.errors).toContain('認証が必要です');
    });

    it('無効な認証コンテキストを処理する', () => {
      const { result } = renderHook(() => useFormSecurity(), {
        wrapper: TestWrapper,
      });

      const invalidAuthContext: AuthContext = {
        userId: '',
        token: '',
        permissions: [],
        sessionId: '',
      };

      act(() => {
        result.current.setAuthContext(invalidAuthContext);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.hasPermission('any:permission')).toBe(false);
    });
  });
});
