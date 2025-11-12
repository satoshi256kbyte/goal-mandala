import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MandalaListPage from '../../pages/MandalaListPage';
import { useAuth } from '../../hooks/useAuth';
import { GoalsService } from '../../services/mandala-list/goals-api';
import { GoalStatus } from '../../types/mandala-list';
import {
  setupIntegrationTest,
  cleanupIntegrationTest,
  renderWithProviders,
  waitForLoadingToFinish,
} from '../../test/utils/integration-test-utils';
import { testDataGenerator } from '../../test/utils/TestDataGenerator';

// Mock dependencies
vi.mock('../../hooks/useAuth');
vi.mock('../../services/mandala-list/goals-api');

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock data generation function
function generateMockMandalas(userId: string) {
  return [
    {
      id: '1',
      title: 'プロジェクトマネージャーになる',
      description: 'チームをリードし、プロジェクトを成功に導く',
      deadline: new Date('2025-12-31'),
      status: GoalStatus.ACTIVE,
      progress: 45,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-15'),
    },
    {
      id: '2',
      title: 'TOEIC 800点を取得する',
      description: '英語力を向上させてグローバルに活躍する',
      deadline: new Date('2025-06-30'),
      status: GoalStatus.ACTIVE,
      progress: 60,
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-20'),
    },
  ];
}

describe('MandalaList Integration Tests', () => {
  let testData: Awaited<ReturnType<typeof setupIntegrationTest>>;
  let mockMandalas: ReturnType<typeof generateMockMandalas>;

  beforeEach(async () => {
    // テストデータのセットアップ
    testData = await setupIntegrationTest();

    // モックマンダラデータの生成
    mockMandalas = generateMockMandalas(testData.user.id);

    // モックのセットアップ
    mockNavigate.mockClear();
    mockUseAuth.mockReturnValue({
      user: {
        id: testData.user.id,
        email: testData.user.email,
        name: testData.user.name,
        profileSetup: true,
      },
      isAuthenticated: true,
      isLoading: false,
      signOut: vi.fn(),
    });
  });

  afterEach(async () => {
    // テストデータのクリーンアップ
    await cleanupIntegrationTest();
  });

  describe('データ取得フロー', () => {
    it('should fetch and display mandala list on mount', async () => {
      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithProviders(<MandalaListPage />);

      // Check loading state
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();

      // Wait for loading to finish
      await waitForLoadingToFinish();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
        expect(screen.getByText('TOEIC 800点を取得する')).toBeInTheDocument();
      });

      // Check API was called
      expect(GoalsService.getGoals).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'created_at_desc',
          page: 1,
          limit: 20,
        })
      );
    });

    it('should handle empty data', async () => {
      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      renderWithProviders(<MandalaListPage />);

      // Wait for loading to finish
      await waitForLoadingToFinish();

      await waitFor(() => {
        expect(screen.getByText('まだマンダラチャートがありません')).toBeInTheDocument();
        expect(
          screen.getByText('新しい目標を作成して、マンダラチャートを始めましょう')
        ).toBeInTheDocument();
      });
    });

    it('should handle API error', async () => {
      vi.spyOn(GoalsService, 'getGoals').mockRejectedValueOnce(
        new Error('データの取得に失敗しました')
      );

      renderWithProviders(<MandalaListPage />);

      // Wait for loading to finish
      await waitForLoadingToFinish();

      await waitFor(() => {
        expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('検索フロー', () => {
    it('should search mandalas by keyword', async () => {
      const user = userEvent.setup();

      // Initial load
      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      // Search
      const searchInput = screen.getByPlaceholderText('目標を検索...');

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [mockMandalas[0]],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      await user.type(searchInput, 'プロジェクト');

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: 'プロジェクト',
          status: undefined,
          sort: 'created_at_desc',
          page: 1,
          limit: 20,
        });
      });
    });

    it('should clear search and show all mandalas', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValue({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('目標を検索...');
      await user.type(searchInput, 'test');
      await user.clear(searchInput);

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenLastCalledWith({
          search: '',
          status: undefined,
          sort: 'created_at_desc',
          page: 1,
          limit: 20,
        });
      });
    });

    it('should show no results message when search returns empty', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const searchInput = screen.getByPlaceholderText('目標を検索...');
      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(
          screen.getByText('該当するマンダラチャートが見つかりませんでした')
        ).toBeInTheDocument();
      });
    });
  });

  describe('フィルターフロー', () => {
    it('should filter mandalas by status', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [mockMandalas[0]],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const statusFilter = screen.getByLabelText('目標状態でフィルター');
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: '',
          status: 'active',
          sort: 'created_at_desc',
          page: 1,
          limit: 20,
        });
      });
    });

    it('should reset filter to show all mandalas', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValue({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText('目標状態でフィルター');
      await user.selectOptions(statusFilter, 'active');
      await user.selectOptions(statusFilter, 'all');

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenLastCalledWith({
          search: '',
          status: undefined,
          sort: 'created_at_desc',
          page: 1,
          limit: 20,
        });
      });
    });

    it('should show no results when filter returns empty', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const statusFilter = screen.getByLabelText('目標状態でフィルター');
      await user.selectOptions(statusFilter, 'completed');

      await waitFor(() => {
        expect(
          screen.getByText('該当するマンダラチャートが見つかりませんでした')
        ).toBeInTheDocument();
      });
    });
  });

  describe('ソートフロー', () => {
    it('should sort mandalas by creation date descending', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [...mockMandalas].reverse(),
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const sortDropdown = screen.getByLabelText('ソート条件');
      await user.selectOptions(sortDropdown, 'created_at_asc');

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: '',
          status: undefined,
          sort: 'created_at_asc',
          page: 1,
          limit: 20,
        });
      });
    });

    it('should sort mandalas by progress', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [mockMandalas[1], mockMandalas[0]],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const sortDropdown = screen.getByLabelText('ソート条件');
      await user.selectOptions(sortDropdown, 'progress_desc');

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: '',
          status: undefined,
          sort: 'progress_desc',
          page: 1,
          limit: 20,
        });
      });
    });

    it('should sort mandalas by deadline', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [mockMandalas[1], mockMandalas[0]],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const sortDropdown = screen.getByLabelText('ソート条件');
      await user.selectOptions(sortDropdown, 'deadline_asc');

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: '',
          status: undefined,
          sort: 'deadline_asc',
          page: 1,
          limit: 20,
        });
      });
    });
  });

  describe('ページネーションフロー', () => {
    it('should navigate to next page', async () => {
      const user = userEvent.setup();

      const page1Data = Array.from({ length: 20 }, (_, i) => ({
        ...mockMandalas[0],
        id: `${i + 1}`,
        title: `目標 ${i + 1}`,
      }));

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: page1Data,
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('目標 1')).toBeInTheDocument();
      });

      const page2Data = Array.from({ length: 5 }, (_, i) => ({
        ...mockMandalas[0],
        id: `${i + 21}`,
        title: `目標 ${i + 21}`,
      }));

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: page2Data,
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2,
      });

      const nextButton = screen.getByLabelText('次のページ');
      await user.click(nextButton);

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: '',
          status: undefined,
          sort: 'created_at_desc',
          page: 2,
          limit: 20,
        });
      });
    });

    it('should navigate to previous page', async () => {
      const user = userEvent.setup();

      const page2Data = Array.from({ length: 5 }, (_, i) => ({
        ...mockMandalas[0],
        id: `${i + 21}`,
        title: `目標 ${i + 21}`,
      }));

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: page2Data,
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('目標 21')).toBeInTheDocument();
      });

      const page1Data = Array.from({ length: 20 }, (_, i) => ({
        ...mockMandalas[0],
        id: `${i + 1}`,
        title: `目標 ${i + 1}`,
      }));

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: page1Data,
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      });

      const prevButton = screen.getByLabelText('前のページ');
      await user.click(prevButton);

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: '',
          status: undefined,
          sort: 'created_at_desc',
          page: 1,
          limit: 20,
        });
      });
    });

    it('should disable previous button on first page', async () => {
      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      const prevButton = screen.getByLabelText('前のページ');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', async () => {
      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      const nextButton = screen.getByLabelText('次のページ');
      expect(nextButton).toBeDisabled();
    });

    it('should reset to page 1 when search changes', async () => {
      const user = userEvent.setup();

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: mockMandalas,
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2,
      });

      renderWithRouter(<MandalaListPage />);

      await waitFor(() => {
        expect(screen.getByText('プロジェクトマネージャーになる')).toBeInTheDocument();
      });

      vi.spyOn(GoalsService, 'getGoals').mockResolvedValueOnce({
        success: true,
        data: [mockMandalas[0]],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const searchInput = screen.getByPlaceholderText('目標を検索...');
      await user.type(searchInput, 'プロジェクト');

      await waitFor(() => {
        expect(GoalsService.getGoals).toHaveBeenCalledWith({
          search: 'プロジェクト',
          status: undefined,
          sort: 'created_at_desc',
          page: 1,
          limit: 20,
        });
      });
    });
  });
});
