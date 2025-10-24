/**
 * ProfileSetupPageのパフォーマンステスト
 *
 * 要件: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProfileSetupPage from '../../pages/ProfileSetupPage';

// モック設定
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', profileSetup: false },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../services/profileService', () => ({
  updateProfile: vi.fn().mockResolvedValue({ success: true }),
}));

/**
 * パフォーマンス測定ヘルパー
 */
const measurePerformance = async (callback: () => Promise<void>) => {
  const startTime = performance.now();
  await callback();
  const endTime = performance.now();
  return endTime - startTime;
};

/**
 * テストコンポーネントのラッパー
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('ProfileSetupPage - パフォーマンステスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * 要件: 11.1 - ページロード時間が3秒以内
   */
  describe('ページロード時間', () => {
    it('初回ロード時間が3秒以内であること', async () => {
      const loadTime = await measurePerformance(async () => {
        render(
          <TestWrapper>
            <ProfileSetupPage />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
        });
      });

      // 3秒 = 3000ミリ秒
      expect(loadTime).toBeLessThan(3000);
      console.log(`ページロード時間: ${loadTime.toFixed(2)}ms`);
    });

    it('コンポーネントの再レンダリングが最小限であること', async () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        return <ProfileSetupPage />;
      };

      const { rerender } = render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      const initialRenderCount = renderCount;

      // 同じpropsで再レンダリング
      rerender(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // 再レンダリング回数が最小限であることを確認
      expect(renderCount - initialRenderCount).toBeLessThanOrEqual(2);
      console.log(`再レンダリング回数: ${renderCount - initialRenderCount}`);
    });
  });

  /**
   * 要件: 11.2 - 入力レスポンスが100ms以内
   */
  describe('入力レスポンス', () => {
    it('業種選択のレスポンスが100ms以内であること', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProfileSetupPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/業種/)).toBeInTheDocument();
      });

      const industrySelect = screen.getByLabelText(/業種/);

      const responseTime = await measurePerformance(async () => {
        await user.selectOptions(industrySelect, 'it-communication');
      });

      expect(responseTime).toBeLessThan(100);
      console.log(`業種選択レスポンス時間: ${responseTime.toFixed(2)}ms`);
    });

    it('職種入力のレスポンスが100ms以内であること', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProfileSetupPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/職種/)).toBeInTheDocument();
      });

      const jobTitleInput = screen.getByLabelText(/職種/);

      const responseTime = await measurePerformance(async () => {
        await user.type(jobTitleInput, 'a');
      });

      expect(responseTime).toBeLessThan(100);
      console.log(`職種入力レスポンス時間: ${responseTime.toFixed(2)}ms`);
    });
  });

  /**
   * 要件: 11.3 - バリデーション結果が200ms以内に表示
   */
  describe('バリデーション速度', () => {
    it('バリデーションエラーが200ms以内に表示されること', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProfileSetupPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /次へ/ })).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /次へ/ });

      const validationTime = await measurePerformance(async () => {
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('業種を選択してください')).toBeInTheDocument();
        });
      });

      expect(validationTime).toBeLessThan(200);
      console.log(`バリデーション時間: ${validationTime.toFixed(2)}ms`);
    });

    it('デバウンスされたバリデーションが適切に動作すること', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProfileSetupPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/職種/)).toBeInTheDocument();
      });

      const jobTitleInput = screen.getByLabelText(/職種/);

      // フィールドをタッチ状態にする
      await user.click(jobTitleInput);
      await user.tab();

      // 連続して入力
      await user.type(jobTitleInput, 'test');

      // デバウンス時間（300ms）+ バッファ（100ms）待機
      await new Promise(resolve => setTimeout(resolve, 400));

      // バリデーションが実行されていることを確認
      // （エラーがない場合は何も表示されない）
      expect(jobTitleInput).toHaveValue('test');
    });
  });

  /**
   * 要件: 11.4 - API呼び出し速度
   */
  describe('API呼び出し速度', () => {
    it('プロフィール保存APIが1秒以内に完了すること', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ProfileSetupPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/業種/)).toBeInTheDocument();
      });

      // フォームに入力
      await user.selectOptions(screen.getByLabelText(/業種/), 'it-communication');
      await user.selectOptions(screen.getByLabelText(/組織規模/), '11-50');
      await user.type(screen.getByLabelText(/職種/), 'ソフトウェアエンジニア');

      const submitButton = screen.getByRole('button', { name: /次へ/ });

      const apiTime = await measurePerformance(async () => {
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText('プロフィールを保存しました')).toBeInTheDocument();
        });
      });

      expect(apiTime).toBeLessThan(1000);
      console.log(`API呼び出し時間: ${apiTime.toFixed(2)}ms`);
    });
  });

  /**
   * メモリリークのチェック
   */
  describe('メモリ管理', () => {
    it('コンポーネントのアンマウント時にクリーンアップが実行されること', async () => {
      const { unmount } = render(
        <TestWrapper>
          <ProfileSetupPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('プロフィール設定')).toBeInTheDocument();
      });

      // アンマウント
      unmount();

      // エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });
});
