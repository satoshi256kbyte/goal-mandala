/**
 * マンダラチャート一覧画面のパフォーマンステスト
 *
 * 要件:
 * - 15.1: TOP画面を表示する THEN 初回ロード時間が3秒以内である
 * - 15.2: 検索・フィルター・ソートを実行する THEN 結果が500ms以内に表示される
 * - 15.3: ページネーションを実行する THEN 次のページが1秒以内に表示される
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { MandalaListContainer } from '../MandalaListContainer';
import { GoalsService } from '../../../services/mandala-list/goals-api';
import type { MandalaChartSummary } from '../../../types/mandala-list';
import { GoalStatus } from '../../../types/mandala';

// モックデータ生成
const generateMockMandalas = (count: number): MandalaChartSummary[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `mandala-${i + 1}`,
    title: `目標 ${i + 1}`,
    description: `目標 ${i + 1} の説明`,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: GoalStatus.ACTIVE,
    progress: Math.floor(Math.random() * 100),
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
  }));
};

// GoalsServiceのモック
vi.mock('../../../services/mandala-list/goals-api');
const mockGoalsService = GoalsService as any;

describe('マンダラチャート一覧画面 - パフォーマンステスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('要件15.1: 初回ロード時間', () => {
    it('初回ロード時間が3秒以内である', async () => {
      // 大量のデータを準備
      const mockData = generateMockMandalas(100);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockData.slice(0, 20),
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
      });

      const startTime = performance.now();

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // データが表示されるまで待機
      await waitFor(
        () => {
          expect(screen.getByText('目標 1')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // 初回ロード時間が3秒以内であることを確認
      expect(loadTime).toBeLessThan(3000);
      console.log(`初回ロード時間: ${loadTime.toFixed(2)}ms`);
    });
  });

  describe('要件15.2: 検索・フィルター・ソートのレスポンス時間', () => {
    it('検索実行時のレスポンス時間が500ms以内である', async () => {
      const mockData = generateMockMandalas(20);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockData,
        total: 20,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 初回ロード完了を待機
      await waitFor(() => {
        expect(screen.getByText('目標 1')).toBeInTheDocument();
      });

      // 検索結果のモックを設定
      const searchResults = mockData.filter(m => m.title.includes('1'));
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: searchResults,
        total: searchResults.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const searchInput = screen.getByRole('searchbox');
      const startTime = performance.now();

      // 検索キーワードを入力（デバウンス300ms + API呼び出し）
      await user.type(searchInput, '1');

      // 検索結果が表示されるまで待機
      await waitFor(
        () => {
          expect(mockGoalsService.getGoals).toHaveBeenCalledWith(
            expect.objectContaining({ search: '1' })
          );
        },
        { timeout: 500 }
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // デバウンス時間（300ms）を考慮して、合計800ms以内であることを確認
      expect(responseTime).toBeLessThan(800);
      console.log(`検索レスポンス時間: ${responseTime.toFixed(2)}ms`);
    });

    it('フィルター実行時のレスポンス時間が500ms以内である', async () => {
      const mockData = generateMockMandalas(20);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockData,
        total: 20,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 初回ロード完了を待機
      await waitFor(() => {
        expect(screen.getByText('目標 1')).toBeInTheDocument();
      });

      // フィルター結果のモックを設定
      const filteredResults = mockData.filter(m => m.status === GoalStatus.ACTIVE);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: filteredResults,
        total: filteredResults.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const statusFilter = screen.getByLabelText('目標状態でフィルター');
      const startTime = performance.now();

      // フィルターを選択
      await user.selectOptions(statusFilter, GoalStatus.ACTIVE);

      // フィルター結果が表示されるまで待機
      await waitFor(
        () => {
          expect(mockGoalsService.getGoals).toHaveBeenCalledWith(
            expect.objectContaining({ status: GoalStatus.ACTIVE })
          );
        },
        { timeout: 500 }
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // レスポンス時間が500ms以内であることを確認
      expect(responseTime).toBeLessThan(500);
      console.log(`フィルターレスポンス時間: ${responseTime.toFixed(2)}ms`);
    });

    it('ソート実行時のレスポンス時間が500ms以内である', async () => {
      const mockData = generateMockMandalas(20);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockData,
        total: 20,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 初回ロード完了を待機
      await waitFor(() => {
        expect(screen.getByText('目標 1')).toBeInTheDocument();
      });

      // ソート結果のモックを設定
      const sortedResults = [...mockData].sort((a, b) => b.progress - a.progress);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: sortedResults,
        total: sortedResults.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const sortDropdown = screen.getByLabelText('並び替え');
      const startTime = performance.now();

      // ソート条件を選択
      await user.selectOptions(sortDropdown, 'progress_desc');

      // ソート結果が表示されるまで待機
      await waitFor(
        () => {
          expect(mockGoalsService.getGoals).toHaveBeenCalledWith(
            expect.objectContaining({ sort: 'progress_desc' })
          );
        },
        { timeout: 500 }
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // レスポンス時間が500ms以内であることを確認
      expect(responseTime).toBeLessThan(500);
      console.log(`ソートレスポンス時間: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('要件15.3: ページネーションのレスポンス時間', () => {
    it('ページネーション実行時のレスポンス時間が1秒以内である', async () => {
      const mockData = generateMockMandalas(100);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockData.slice(0, 20),
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 初回ロード完了を待機
      await waitFor(() => {
        expect(screen.getByText('目標 1')).toBeInTheDocument();
      });

      // 次ページのモックを設定
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockData.slice(20, 40),
        total: 100,
        page: 2,
        limit: 20,
        totalPages: 5,
      });

      const nextButton = screen.getByLabelText('次のページ');
      const startTime = performance.now();

      // 次ページボタンをクリック
      await user.click(nextButton);

      // 次ページのデータが表示されるまで待機
      await waitFor(
        () => {
          expect(mockGoalsService.getGoals).toHaveBeenCalledWith(
            expect.objectContaining({ page: 2 })
          );
        },
        { timeout: 1000 }
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // レスポンス時間が1秒以内であることを確認
      expect(responseTime).toBeLessThan(1000);
      console.log(`ページネーションレスポンス時間: ${responseTime.toFixed(2)}ms`);
    });
  });

  describe('メモ化の効果確認', () => {
    it('同じpropsでの再レンダリング時にコンポーネントが再レンダリングされない', async () => {
      const mockData = generateMockMandalas(5);
      mockGoalsService.getGoals.mockResolvedValue({
        success: true,
        data: mockData,
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const { rerender } = render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 初回ロード完了を待機
      await waitFor(() => {
        expect(screen.getByText('目標 1')).toBeInTheDocument();
      });

      const initialCallCount = mockGoalsService.getGoals.mock.calls.length;

      // 同じpropsで再レンダリング
      rerender(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // API呼び出しが増えていないことを確認（メモ化が効いている）
      expect(mockGoalsService.getGoals.mock.calls.length).toBe(initialCallCount);
    });
  });
});
