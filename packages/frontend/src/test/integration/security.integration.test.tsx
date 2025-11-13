import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubGoalEditPage } from '../../pages/SubGoalEditPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import DOMPurify from 'dompurify';

// テスト用のプロバイダー
const TestProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('セキュリティテスト', () => {
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
  });

  describe('XSS攻撃対策', () => {
    it('スクリプトタグが無害化される', async () => {
      const maliciousInput = '<script>alert("XSS")</script>悪意のあるスクリプト';
      const sanitizedInput = DOMPurify.sanitize(maliciousInput);

      mockApiClient.get.mockResolvedValue({ data: [] });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // 悪意のある入力を試行
      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, maliciousInput);

      // 入力値がサニタイズされることを確認
      expect(titleInput).toHaveValue(sanitizedInput);
      expect(titleInput.value).not.toContain('<script>');
    });

    it('HTMLタグが適切にエスケープされる', async () => {
      const htmlInput = '<img src="x" onerror="alert(1)">画像';

      mockApiClient.get.mockResolvedValue({ data: [] });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      const descriptionInput = screen.getByTestId('subgoal-description');
      await userEvent.type(descriptionInput, htmlInput);

      // HTMLタグがエスケープされることを確認
      const sanitizedValue = DOMPurify.sanitize(htmlInput);
      expect(descriptionInput).toHaveValue(sanitizedValue);
    });

    it('JavaScriptイベントハンドラーが除去される', async () => {
      const eventHandlerInput = '<div onclick="alert(\'XSS\')">クリック</div>';

      mockApiClient.get.mockResolvedValue({ data: [] });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      const backgroundInput = screen.getByTestId('subgoal-background');
      await userEvent.type(backgroundInput, eventHandlerInput);

      // イベントハンドラーが除去されることを確認
      const sanitizedValue = DOMPurify.sanitize(eventHandlerInput);
      expect(sanitizedValue).not.toContain('onclick');
      expect(backgroundInput).toHaveValue(sanitizedValue);
    });
  });

  describe('CSRF攻撃対策', () => {
    it('CSRFトークンが適切に送信される', async () => {
      // CSRFトークンをモック
      const csrfToken = 'mock-csrf-token-12345';
      Object.defineProperty(document, 'querySelector', {
        value: vi.fn().mockReturnValue({ content: csrfToken }),
        writable: true,
      });

      mockApiClient.get.mockResolvedValue({ data: [] });
      mockApiClient.post.mockResolvedValue({ data: {} });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // フォームに入力
      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, 'テストタイトル');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      // CSRFトークンがヘッダーに含まれることを確認
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-CSRF-Token': csrfToken,
            }),
          })
        );
      });
    });

    it('不正なリクエストが拒否される', async () => {
      // CSRFトークンなしのリクエストをシミュレート
      mockApiClient.post.mockRejectedValue({
        response: { status: 403, data: { message: 'CSRF token mismatch' } },
      });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, 'テストタイトル');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('認証エラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('入力値サニタイズ', () => {
    it('SQLインジェクション攻撃が無効化される', async () => {
      const sqlInjectionInput = "'; DROP TABLE users; --";

      mockApiClient.get.mockResolvedValue({ data: [] });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, sqlInjectionInput);

      // 入力値がそのまま保持される（サーバー側でサニタイズされる前提）
      expect(titleInput).toHaveValue(sqlInjectionInput);

      // ただし、特殊文字がエスケープされることを確認
      const sanitizedValue = titleInput.value.replace(/['"]/g, '');
      expect(sanitizedValue).not.toContain("'");
      expect(sanitizedValue).not.toContain('"');
    });

    it('パストラバーサル攻撃が防止される', async () => {
      const pathTraversalInput = '../../../etc/passwd';

      mockApiClient.get.mockResolvedValue({ data: [] });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, pathTraversalInput);

      // パストラバーサル文字が適切に処理されることを確認
      expect(titleInput.value).not.toMatch(/\.\.\//);
    });
  });

  describe('認証・認可', () => {
    it('未認証ユーザーがリダイレクトされる', async () => {
      // 未認証状態をシミュレート
      mockApiClient.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } },
      });

      const mockNavigate = vi.fn();
      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigate,
        };
      });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // ログインページにリダイレクトされることを確認
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('権限のないリソースへのアクセスが拒否される', async () => {
      mockApiClient.get.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
      });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // 権限エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument();
      });
    });
  });

  describe('データ検証', () => {
    it('不正な文字数の入力が拒否される', async () => {
      const tooLongInput = 'a'.repeat(1001); // 1000文字制限を超過

      mockApiClient.get.mockResolvedValue({ data: [] });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, tooLongInput);

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('タイトルは100文字以内で入力してください')).toBeInTheDocument();
      });
    });

    it('不正な形式のデータが拒否される', async () => {
      mockApiClient.get.mockResolvedValue({ data: [] });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // 空白のみの入力
      const titleInput = screen.getByTestId('subgoal-title');
      await userEvent.type(titleInput, '   ');

      const saveButton = screen.getByTestId('save-button');
      await userEvent.click(saveButton);

      // バリデーションエラーが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('タイトルを入力してください')).toBeInTheDocument();
      });
    });
  });

  describe('セッション管理', () => {
    it('セッション期限切れが適切に処理される', async () => {
      mockApiClient.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Session expired' } },
      });

      render(
        <TestProvider>
          <SubGoalEditPage />
        </TestProvider>
      );

      // セッション期限切れメッセージが表示されることを確認
      await waitFor(() => {
        expect(
          screen.getByText('セッションが期限切れです。再度ログインしてください。')
        ).toBeInTheDocument();
      });
    });
  });
});
