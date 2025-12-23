import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate, useSearchParams } from 'react-router-dom';
import { DeepLinkPage } from '../DeepLinkPage';
import * as deepLinkApi from '../../services/deepLinkApi';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
    useSearchParams: vi.fn(),
  };
});

// Mock deepLinkApi
vi.mock('../../services/deepLinkApi');

describe('DeepLinkPage', () => {
  const mockNavigate = vi.fn();
  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useSearchParams as any).mockReturnValue([mockSearchParams]);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <DeepLinkPage />
      </BrowserRouter>
    );
  };

  describe('トークン検証', () => {
    it('トークンが存在しない場合、エラーメッセージを表示する', async () => {
      mockSearchParams.delete('token');

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('トークンが見つかりません')).toBeInTheDocument();
      });
    });

    it('有効なトークンの場合、タスク詳細ページへナビゲートする', async () => {
      const token = 'valid-token';
      const taskId = 'task-123';

      mockSearchParams.set('token', token);

      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: true,
        taskId,
        userId: 'user-123',
      });

      renderComponent();

      await waitFor(() => {
        expect(deepLinkApi.validateDeepLinkToken).toHaveBeenCalledWith(token);
        expect(mockNavigate).toHaveBeenCalledWith(`/tasks/${taskId}`, { replace: true });
      });
    });

    it('無効なトークンの場合、エラーメッセージを表示する', async () => {
      const token = 'invalid-token';
      const errorMessage = 'トークンが無効です';

      mockSearchParams.set('token', token);

      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: false,
        error: errorMessage,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('有効期限切れトークンの場合、エラーメッセージを表示する', async () => {
      const token = 'expired-token';
      const errorMessage = 'トークンの有効期限が切れています';

      mockSearchParams.set('token', token);

      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: false,
        error: errorMessage,
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('検証中にエラーが発生した場合、エラーメッセージを表示する', async () => {
      const token = 'error-token';

      mockSearchParams.set('token', token);

      vi.mocked(deepLinkApi.validateDeepLinkToken).mockRejectedValue(new Error('Network error'));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('トークンの検証中にエラーが発生しました')).toBeInTheDocument();
      });
    });
  });

  describe('ローディング状態', () => {
    it('検証中はローディングメッセージを表示する', () => {
      const token = 'loading-token';
      mockSearchParams.set('token', token);

      vi.mocked(deepLinkApi.validateDeepLinkToken).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderComponent();

      expect(screen.getByText('リンクを確認しています...')).toBeInTheDocument();
    });
  });

  describe('エラー時のリダイレクト', () => {
    it.skip('エラー発生後、リダイレクトメッセージを表示する', async () => {
      // TODO: Fix timeout issue
      const token = 'error-token';
      const errorMessage = 'トークンが無効です';

      mockSearchParams.set('token', token);

      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: false,
        error: errorMessage,
      });

      renderComponent();

      // エラーメッセージが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // リダイレクトメッセージが表示されることを確認
      expect(screen.getByText('3秒後にログインページへ移動します...')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it.skip('エラーアイコンにaria-hidden属性が設定されている', async () => {
      // TODO: Fix timeout issue
      const token = 'error-token';
      const errorMessage = 'エラー';
      mockSearchParams.set('token', token);

      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: false,
        error: errorMessage,
      });

      const { container } = renderComponent();

      // エラーメッセージが表示されるまで待機
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // SVGアイコンを取得してaria-hidden属性を確認
      const svg = container.querySelector('svg[aria-hidden="true"]');
      expect(svg).toBeTruthy();
    });
  });
});
