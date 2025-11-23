/**
 * セキュアフォームラッパーコンポーネントのテスト
 *
 * テスト内容:
 * - セキュリティラッパーの動作テスト
 * - 認証・認可の統合テスト
 * - CSRF保護のテスト
 *
 * 要件: 要件1, 要件2
 */

import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { SecureFormWrapper } from '../SecureFormWrapper';
import { AuthContext } from '../../../services/form-security';
import * as useFormSecurityModule from '../../../hooks/useFormSecurity';

// useFormSecurityフックをモック
vi.mock('../../../hooks/useFormSecurity', () => ({
  useFormSecurity: () => ({
    isAuthenticated: true,
    isValidating: false,
    securityErrors: [],
    securityWarnings: [],
    setAuthContext: vi.fn(),
    hasPermission: vi.fn(() => true),
    validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
    generateSecureHeaders: vi.fn(() => ({
      'X-CSRF-Token': 'test-csrf-token',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
    })),
    getCSRFToken: vi.fn(() => 'test-csrf-token'),
    clearSecurityErrors: vi.fn(),
  }),
}));

describe('SecureFormWrapper', () => {
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

  describe('基本的なレンダリング', () => {
    it('子コンポーネントを正しくレンダリングする', () => {
      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <div data-testid="child-component">テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('テストコンテンツ')).toBeInTheDocument();
    });

    it('CSRFトークンを隠しフィールドとして追加する', () => {
      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <form data-testid="test-form">
            <input type="text" name="title" />
          </form>
        </SecureFormWrapper>
      );

      const csrfInput = screen.getByDisplayValue('test-csrf-token');
      expect(csrfInput).toBeInTheDocument();
      expect(csrfInput).toHaveAttribute('type', 'hidden');
      expect(csrfInput).toHaveAttribute('name', '_csrf_token');
    });

    it('セキュリティヘッダーをメタタグとして追加する', () => {
      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <div>テストコンテンツ</div>
        </SecureFormWrapper>
      );

      // メタタグは隠されているが、DOM内に存在する
      const metaTags = document.querySelectorAll('meta[name^="security-"]');
      expect(metaTags.length).toBeGreaterThan(0);
    });
  });

  describe('認証・認可のテスト', () => {
    it('認証されていない場合はエラーを表示する', () => {
      // useFormSecurityフックを認証されていない状態でモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: false,
        isValidating: false,
        securityErrors: [],
        securityWarnings: [],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => false),
        validateRequest: vi.fn(() => ({
          isValid: false,
          errors: ['認証が必要です'],
          warnings: [],
        })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: vi.fn(() => ''),
        validateSubGoalData: vi.fn(() =>
          Promise.resolve({ isValid: true, errors: [], warnings: [] })
        ),
        validateActionData: vi.fn(() =>
          Promise.resolve({ isValid: true, errors: [], warnings: [] })
        ),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper requiredPermissions={['subgoal:edit']}>
          <div>テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByText(/権限が不足しています/)).toBeInTheDocument();
    });

    it('必要な権限がない場合はエラーを表示する', () => {
      // useFormSecurityフックを権限不足の状態でモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: false,
        securityErrors: [],
        securityWarnings: [],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(permission => permission !== 'admin:delete'),
        validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: vi.fn(() => 'test-csrf-token'),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper authContext={mockAuthContext} requiredPermissions={['admin:delete']}>
          <div>テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByText(/権限が不足しています: admin:delete/)).toBeInTheDocument();
    });

    it('適切な権限がある場合はコンテンツを表示する', () => {
      render(
        <SecureFormWrapper authContext={mockAuthContext} requiredPermissions={['subgoal:edit']}>
          <div data-testid="protected-content">保護されたコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('保護されたコンテンツ')).toBeInTheDocument();
    });
  });

  describe('セキュリティエラーの表示', () => {
    it('セキュリティエラーを表示する', () => {
      // useFormSecurityフックをエラー状態でモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: false,
        securityErrors: ['XSS攻撃の可能性があります'],
        securityWarnings: [],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => true),
        validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: vi.fn(() => 'test-csrf-token'),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <div>テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByText('XSS攻撃の可能性があります')).toBeInTheDocument();
    });

    it('セキュリティ警告を表示する', () => {
      // useFormSecurityフックを警告状態でモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: false,
        securityErrors: [],
        securityWarnings: ['危険な可能性のある文字列が含まれています'],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => true),
        validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: vi.fn(() => 'test-csrf-token'),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <div>テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByText('危険な可能性のある文字列が含まれています')).toBeInTheDocument();
    });
  });

  describe('検証中の状態', () => {
    it('検証中はローディング表示をする', () => {
      // useFormSecurityフックを検証中の状態でモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: true,
        securityErrors: [],
        securityWarnings: [],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => true),
        validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: vi.fn(() => 'test-csrf-token'),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <div data-testid="content">テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByText('検証中...')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument(); // コンテンツも表示される
    });

    it('初期化中はローディング表示をする', () => {
      render(
        <SecureFormWrapper>
          <div data-testid="content">テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(screen.getByText('セキュリティ検証中...')).toBeInTheDocument();
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });
  });

  describe('フォーム送信の監視', () => {
    it('フォーム送信時にCSRFトークンを検証する', async () => {
      const mockValidateRequest = vi.fn(() => ({ isValid: true, errors: [], warnings: [] }));

      // useFormSecurityフックをモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: false,
        securityErrors: [],
        securityWarnings: [],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => true),
        validateRequest: mockValidateRequest,
        generateSecureHeaders: vi.fn(() => ({
          'X-CSRF-Token': 'test-csrf-token',
        })),
        getCSRFToken: vi.fn(() => 'test-csrf-token'),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <form data-testid="test-form">
            <input type="text" name="title" defaultValue="テストタイトル" />
            <button type="submit">送信</button>
          </form>
        </SecureFormWrapper>
      );

      const form = screen.getByTestId('test-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockValidateRequest).toHaveBeenCalledWith({
          method: 'POST',
          url: expect.any(String),
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token',
          }),
          body: expect.objectContaining({
            title: 'テストタイトル',
            _csrf_token: 'test-csrf-token',
          }),
        });
      });
    });

    it('CSRFトークンが無効な場合はフォーム送信を阻止する', async () => {
      const mockGetCSRFToken = vi.fn(() => 'valid-token');

      // useFormSecurityフックをモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: false,
        securityErrors: [],
        securityWarnings: [],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => true),
        validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: mockGetCSRFToken,
        clearSecurityErrors: vi.fn(),
      });

      const mockSubmit = vi.fn();

      render(
        <SecureFormWrapper authContext={mockAuthContext}>
          <form data-testid="test-form" onSubmit={mockSubmit}>
            <input type="hidden" name="_csrf_token" value="invalid-token" />
            <input type="text" name="title" defaultValue="テストタイトル" />
            <button type="submit">送信</button>
          </form>
        </SecureFormWrapper>
      );

      const form = screen.getByTestId('test-form');
      fireEvent.submit(form);

      // フォーム送信が阻止されることを確認
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('コールバック関数', () => {
    it('セキュリティエラー時にコールバックを呼び出す', () => {
      const mockOnSecurityError = vi.fn();

      // useFormSecurityフックをエラー状態でモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: false,
        securityErrors: ['テストエラー'],
        securityWarnings: [],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => true),
        validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: vi.fn(() => 'test-csrf-token'),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper authContext={mockAuthContext} onSecurityError={mockOnSecurityError}>
          <div>テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(mockOnSecurityError).toHaveBeenCalledWith(['テストエラー']);
    });

    it('セキュリティ警告時にコールバックを呼び出す', () => {
      const mockOnSecurityWarning = vi.fn();

      // useFormSecurityフックを警告状態でモック
      const mockUseFormSecurity = vi.spyOn(useFormSecurityModule, 'useFormSecurity');
      mockUseFormSecurity.mockReturnValueOnce({
        isAuthenticated: true,
        isValidating: false,
        securityErrors: [],
        securityWarnings: ['テスト警告'],
        setAuthContext: vi.fn(),
        hasPermission: vi.fn(() => true),
        validateRequest: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
        generateSecureHeaders: vi.fn(() => ({})),
        getCSRFToken: vi.fn(() => 'test-csrf-token'),
        clearSecurityErrors: vi.fn(),
      });

      render(
        <SecureFormWrapper authContext={mockAuthContext} onSecurityWarning={mockOnSecurityWarning}>
          <div>テストコンテンツ</div>
        </SecureFormWrapper>
      );

      expect(mockOnSecurityWarning).toHaveBeenCalledWith(['テスト警告']);
    });

    it('カスタム送信バリデーションを実行する', async () => {
      const mockOnSubmitValidation = vi.fn(() => Promise.resolve(true));

      render(
        <SecureFormWrapper
          authContext={mockAuthContext}
          onSubmitValidation={mockOnSubmitValidation}
        >
          <form data-testid="test-form">
            <input type="text" name="title" defaultValue="テストタイトル" />
            <button type="submit">送信</button>
          </form>
        </SecureFormWrapper>
      );

      const form = screen.getByTestId('test-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSubmitValidation).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'テストタイトル',
            _csrf_token: 'test-csrf-token',
          })
        );
      });
    });
  });
});
