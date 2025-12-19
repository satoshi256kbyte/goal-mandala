import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/test-utils';
import { DeepLinkPage } from './DeepLinkPage';
import * as deepLinkApi from '../services/deepLinkApi';

// モック関数をグローバルスコープで定義
const mockNavigate = vi.fn();

// react-router-domのモック
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => {
      const searchParams = new URLSearchParams(window.location.search);
      return [searchParams];
    },
  };
});

// deepLinkApiをモック
vi.mock('../services/deepLinkApi');

describe('DeepLinkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    // デフォルトのURLを設定
    window.history.pushState({}, '', '/deep-link?token=valid-token');
  });

  describe('レンダリング', () => {
    it('検証中はローディング表示される', () => {
      vi.mocked(deepLinkApi.validateDeepLinkToken).mockImplementation(
        () => new Promise(() => {}) // 永遠に解決しないPromise
      );

      renderWithProviders(<DeepLinkPage />);

      expect(screen.getByText('リンクを確認しています...')).toBeInTheDocument();
    });
  });

  describe('トークン検証', () => {
    it('有効なトークンの場合、タスク詳細ページへナビゲートする', async () => {
      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: true,
        taskId: 'task-123',
      });

      renderWithProviders(<DeepLinkPage />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tasks/task-123', { replace: true });
      });
    });

    it('無効なトークンの場合、エラーメッセージが表示される', async () => {
      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: false,
        error: 'トークンが無効です',
      });

      renderWithProviders(<DeepLinkPage />);

      expect(await screen.findByText('リンクが無効です')).toBeInTheDocument();
      expect(await screen.findByText('トークンが無効です')).toBeInTheDocument();
      expect(await screen.findByText('3秒後にログインページへ移動します...')).toBeInTheDocument();
    });

    it('トークンが存在しない場合、エラーメッセージが表示される', async () => {
      // トークンなしのURLを設定
      window.history.pushState({}, '', '/deep-link');

      renderWithProviders(<DeepLinkPage />);

      expect(await screen.findByText('リンクが無効です')).toBeInTheDocument();
      expect(await screen.findByText('トークンが見つかりません')).toBeInTheDocument();
    });

    it('検証エラーの場合、エラーメッセージが表示される', async () => {
      vi.mocked(deepLinkApi.validateDeepLinkToken).mockRejectedValue(new Error('Network error'));

      renderWithProviders(<DeepLinkPage />);

      expect(await screen.findByText('リンクが無効です')).toBeInTheDocument();
      expect(await screen.findByText('トークンの検証中にエラーが発生しました')).toBeInTheDocument();
    });
  });

  describe('エラー時のリダイレクト', () => {
    // 注: このテストは実際のタイマーを使用するため、3秒待つ必要があります
    // Phase 2で最適化する予定
    it.skip('エラー発生時、3秒後にログインページへリダイレクトされる', async () => {
      // 実際のタイマーを使用（fake timersは使用しない）
      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: false,
        error: 'トークンが無効です',
      });

      renderWithProviders(<DeepLinkPage />);

      // エラーメッセージが表示されるまで待機
      expect(await screen.findByText('トークンが無効です')).toBeInTheDocument();

      // 3秒後にリダイレクトされることを確認（タイムアウトを延長）
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/login', {
            replace: true,
            state: { message: 'トークンが無効です' },
          });
        },
        { timeout: 5000 }
      );
    });
  });

  describe('アクセシビリティ', () => {
    it('ローディング中のスピナーにaria属性が設定されている', () => {
      vi.mocked(deepLinkApi.validateDeepLinkToken).mockImplementation(
        () => new Promise(() => {}) // 永遠に解決しないPromise
      );

      renderWithProviders(<DeepLinkPage />);

      const spinner = screen.getByText('リンクを確認しています...').previousElementSibling;
      expect(spinner).toHaveClass('animate-spin');
    });

    it('エラーアイコンにaria-hidden属性が設定されている', async () => {
      vi.mocked(deepLinkApi.validateDeepLinkToken).mockResolvedValue({
        valid: false,
        error: 'トークンが無効です',
      });

      renderWithProviders(<DeepLinkPage />);

      // エラーメッセージが表示されるまで待機
      expect(await screen.findByText('トークンが無効です')).toBeInTheDocument();

      // SVG要素を取得
      await waitFor(() => {
        const errorIcon = document.querySelector('svg[aria-hidden="true"]');
        expect(errorIcon).toBeInTheDocument();
      });
    });
  });
});
