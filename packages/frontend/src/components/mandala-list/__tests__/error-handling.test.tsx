/**
 * マンダラチャート一覧画面のエラーハンドリングテスト
 *
 * 要件:
 * - 16.1: データ取得に失敗する THEN エラーメッセージが表示される
 * - 16.2: ネットワークエラーが発生する THEN 「ネットワークエラーが発生しました」と表示される
 * - 16.3: APIエラーが発生する THEN エラーの詳細メッセージが表示される
 * - 16.4: 認証エラーが発生する THEN 「認証エラーが発生しました」と表示される
 * - 16.5: エラーメッセージが表示される THEN 「再試行」ボタンが表示される
 * - 16.6: 「再試行」ボタンをクリックする THEN データの再取得が実行される
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { MandalaListContainer } from '../MandalaListContainer';
import { GoalsService, GoalsApiError } from '../../../services/mandala-list/goals-api';

// GoalsServiceのモック
vi.mock('../../../services/mandala-list/goals-api');
const mockGoalsService = GoalsService as any;

describe('マンダラチャート一覧画面 - エラーハンドリングテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('要件16.1: データ取得失敗時のエラー表示', () => {
    it('データ取得に失敗した場合、エラーメッセージが表示される', async () => {
      // APIエラーをモック
      mockGoalsService.getGoals.mockRejectedValue(
        new GoalsApiError('データの取得に失敗しました', 500)
      );

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('要件16.2: ネットワークエラーの表示', () => {
    it('ネットワークエラーが発生した場合、適切なメッセージが表示される', async () => {
      // ネットワークエラーをモック
      mockGoalsService.getGoals.mockRejectedValue(new TypeError('Failed to fetch'));

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // ネットワークエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/ネットワークエラーが発生しました/i)).toBeInTheDocument();
      });
    });

    it('タイムアウトエラーが発生した場合、ネットワークエラーとして表示される', async () => {
      // タイムアウトエラーをモック
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'AbortError';
      mockGoalsService.getGoals.mockRejectedValue(timeoutError);

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // ネットワークエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/ネットワークエラーが発生しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('要件16.3: APIエラーの詳細表示', () => {
    it('APIエラーが発生した場合、詳細メッセージが表示される', async () => {
      // APIエラーをモック
      mockGoalsService.getGoals.mockRejectedValue(new GoalsApiError('リクエストが不正です', 400));

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // APIエラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/リクエストが不正です/i)).toBeInTheDocument();
      });
    });

    it('404エラーが発生した場合、適切なメッセージが表示される', async () => {
      // 404エラーをモック
      mockGoalsService.getGoals.mockRejectedValue(
        new GoalsApiError('要求されたデータが見つかりませんでした', 404)
      );

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 404エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/要求されたデータが見つかりませんでした/i)).toBeInTheDocument();
      });
    });

    it('500エラーが発生した場合、適切なメッセージが表示される', async () => {
      // 500エラーをモック
      mockGoalsService.getGoals.mockRejectedValue(
        new GoalsApiError('サーバーエラーが発生しました', 500)
      );

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 500エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/サーバーエラーが発生しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('要件16.4: 認証エラーの表示', () => {
    it('401エラーが発生した場合、認証エラーメッセージが表示される', async () => {
      // 401エラーをモック
      mockGoalsService.getGoals.mockRejectedValue(
        new GoalsApiError('認証エラーが発生しました', 401)
      );

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 認証エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/認証エラーが発生しました/i)).toBeInTheDocument();
      });
    });

    it('403エラーが発生した場合、認証エラーメッセージが表示される', async () => {
      // 403エラーをモック
      mockGoalsService.getGoals.mockRejectedValue(
        new GoalsApiError('認証エラーが発生しました', 403)
      );

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 認証エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/認証エラーが発生しました/i)).toBeInTheDocument();
      });
    });
  });

  describe('要件16.5: 再試行ボタンの表示', () => {
    it('エラーメッセージが表示される場合、再試行ボタンが表示される', async () => {
      // APIエラーをモック
      mockGoalsService.getGoals.mockRejectedValue(
        new GoalsApiError('データの取得に失敗しました', 500)
      );

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 再試行ボタンが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /再試行/i })).toBeInTheDocument();
      });
    });
  });

  describe('要件16.6: 再試行機能', () => {
    it('再試行ボタンをクリックすると、データの再取得が実行される', async () => {
      const user = userEvent.setup();

      // 初回はエラー
      mockGoalsService.getGoals.mockRejectedValueOnce(
        new GoalsApiError('データの取得に失敗しました', 500)
      );

      // 再試行時は成功
      mockGoalsService.getGoals.mockResolvedValueOnce({
        success: true,
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      const initialCallCount = mockGoalsService.getGoals.mock.calls.length;

      // 再試行ボタンをクリック
      const retryButton = screen.getByRole('button', { name: /再試行/i });
      await user.click(retryButton);

      // API呼び出しが再実行されることを確認
      await waitFor(() => {
        expect(mockGoalsService.getGoals.mock.calls.length).toBeGreaterThan(initialCallCount);
      });

      // エラーメッセージが消えることを確認
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('再試行後もエラーが発生する場合、エラーメッセージが再表示される', async () => {
      const user = userEvent.setup();

      // 常にエラーを返す
      mockGoalsService.getGoals.mockRejectedValue(
        new GoalsApiError('データの取得に失敗しました', 500)
      );

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // 再試行ボタンをクリック
      const retryButton = screen.getByRole('button', { name: /再試行/i });
      await user.click(retryButton);

      // エラーメッセージが再表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/データの取得に失敗しました/i)).toBeInTheDocument();
      });
    });
  });
});
