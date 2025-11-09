import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { MandalaListContainer } from '../MandalaListContainer';
import { useMandalaList } from '../../../hooks/mandala-list/useMandalaList';
import { GoalStatus } from '../../../types/mandala';
import type { MandalaChartSummary } from '../../../types/mandala-list';

// モック
vi.mock('../../../hooks/mandala-list/useMandalaList');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockUseMandalaList = useMandalaList as ReturnType<typeof vi.fn>;

describe('MandalaListContainer', () => {
  const mockMandalas: MandalaChartSummary[] = [
    {
      id: 'test-id-1',
      title: 'テスト目標1',
      description: 'テスト説明1',
      deadline: new Date('2025-12-31'),
      status: GoalStatus.ACTIVE,
      progress: 50,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-15'),
    },
    {
      id: 'test-id-2',
      title: 'テスト目標2',
      description: 'テスト説明2',
      deadline: new Date('2025-11-30'),
      status: GoalStatus.DRAFT,
      progress: 20,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-16'),
    },
  ];

  const defaultMockReturn = {
    mandalas: mockMandalas,
    totalItems: 2,
    totalPages: 1,
    isLoading: false,
    isFetching: false,
    error: null,
    searchKeyword: '',
    statusFilter: 'all' as const,
    sortOption: 'created_at_desc' as const,
    currentPage: 1,
    setSearchKeyword: vi.fn(),
    setStatusFilter: vi.fn(),
    setSortOption: vi.fn(),
    setCurrentPage: vi.fn(),
    refetch: vi.fn(),
    clearFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMandalaList.mockReturnValue(defaultMockReturn);
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('データ表示のテスト', () => {
    it('マンダラチャート一覧が正しく表示される', () => {
      renderWithRouter(<MandalaListContainer />);

      expect(screen.getByText('テスト目標1')).toBeInTheDocument();
      expect(screen.getByText('テスト目標2')).toBeInTheDocument();
    });

    it('ローディング中はスピナーが表示される', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        mandalas: [],
      });

      renderWithRouter(<MandalaListContainer />);

      expect(screen.getByText('データを読み込んでいます...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    });

    it('エラー発生時はエラーメッセージと再試行ボタンが表示される', () => {
      const mockRefetch = vi.fn();
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        error: 'データの取得に失敗しました',
        mandalas: [],
        refetch: mockRefetch,
      });

      renderWithRouter(<MandalaListContainer />);

      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();

      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('データが空の場合、空状態メッセージが表示される', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        mandalas: [],
        totalItems: 0,
      });

      renderWithRouter(<MandalaListContainer />);

      expect(screen.getByText('まだマンダラチャートがありません')).toBeInTheDocument();
      expect(
        screen.getByText('新しい目標を作成して、マンダラチャートを始めましょう。')
      ).toBeInTheDocument();
    });

    it('フィルター適用時にデータが空の場合、フィルター用の空状態メッセージが表示される', () => {
      const mockClearFilters = vi.fn();
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        mandalas: [],
        totalItems: 0,
        searchKeyword: 'test',
        clearFilters: mockClearFilters,
      });

      renderWithRouter(<MandalaListContainer />);

      expect(
        screen.getByText('該当するマンダラチャートが見つかりませんでした')
      ).toBeInTheDocument();
      expect(
        screen.getByText('検索条件を変更するか、フィルターをクリアしてください。')
      ).toBeInTheDocument();

      const clearButton = screen.getByText('フィルターをクリア');
      fireEvent.click(clearButton);
      expect(mockClearFilters).toHaveBeenCalledTimes(1);
    });

    it('データ取得中はオーバーレイが表示される', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        isFetching: true,
        isLoading: false,
      });

      renderWithRouter(<MandalaListContainer />);

      expect(screen.getByText('更新中...')).toBeInTheDocument();
    });
  });

  describe('検索機能のテスト', () => {
    it('検索バーが表示される', () => {
      renderWithRouter(<MandalaListContainer />);

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', '目標を検索...');
    });

    it('検索キーワードを入力すると、setSearchKeywordが呼ばれる', async () => {
      const mockSetSearchKeyword = vi.fn();
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        setSearchKeyword: mockSetSearchKeyword,
      });

      renderWithRouter(<MandalaListContainer />);

      const searchInput = screen.getByRole('searchbox');
      fireEvent.change(searchInput, { target: { value: 'テスト' } });

      await waitFor(() => {
        expect(mockSetSearchKeyword).toHaveBeenCalledWith('テスト');
      });
    });

    it('検索クリアボタンをクリックすると、検索キーワードがクリアされる', async () => {
      const mockSetSearchKeyword = vi.fn();
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        searchKeyword: 'テスト',
        setSearchKeyword: mockSetSearchKeyword,
      });

      renderWithRouter(<MandalaListContainer />);

      const clearButton = screen.getByLabelText('検索をクリア');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(mockSetSearchKeyword).toHaveBeenCalledWith('');
      });
    });
  });

  describe('フィルター機能のテスト', () => {
    it('状態フィルタードロップダウンが表示される', () => {
      renderWithRouter(<MandalaListContainer />);

      const filterDropdown = screen.getByLabelText('目標状態でフィルター');
      expect(filterDropdown).toBeInTheDocument();
    });

    it('フィルター条件を変更すると、setStatusFilterが呼ばれる', async () => {
      const mockSetStatusFilter = vi.fn();
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        setStatusFilter: mockSetStatusFilter,
      });

      renderWithRouter(<MandalaListContainer />);

      const filterDropdown = screen.getByLabelText('目標状態でフィルター');
      fireEvent.change(filterDropdown, { target: { value: GoalStatus.ACTIVE } });

      await waitFor(() => {
        expect(mockSetStatusFilter).toHaveBeenCalledWith(GoalStatus.ACTIVE);
      });
    });
  });

  describe('ソート機能のテスト', () => {
    it('ソートドロップダウンが表示される', () => {
      renderWithRouter(<MandalaListContainer />);

      const sortDropdown = screen.getByLabelText('並び替え');
      expect(sortDropdown).toBeInTheDocument();
    });

    it('ソート条件を変更すると、setSortOptionが呼ばれる', async () => {
      const mockSetSortOption = vi.fn();
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        setSortOption: mockSetSortOption,
      });

      renderWithRouter(<MandalaListContainer />);

      const sortDropdown = screen.getByLabelText('並び替え');
      fireEvent.change(sortDropdown, { target: { value: 'deadline_asc' } });

      await waitFor(() => {
        expect(mockSetSortOption).toHaveBeenCalledWith('deadline_asc');
      });
    });
  });

  describe('ページネーション機能のテスト', () => {
    it('複数ページある場合、ページネーションが表示される', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 3,
        totalItems: 60,
      });

      renderWithRouter(<MandalaListContainer />);

      expect(screen.getByLabelText('ページネーション')).toBeInTheDocument();
      expect(screen.getByText('前へ')).toBeInTheDocument();
      expect(screen.getByText('次へ')).toBeInTheDocument();
    });

    it('ページ番号をクリックすると、setCurrentPageが呼ばれる', async () => {
      const mockSetCurrentPage = vi.fn();
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 3,
        totalItems: 60,
        setCurrentPage: mockSetCurrentPage,
      });

      renderWithRouter(<MandalaListContainer />);

      const page2Button = screen.getByLabelText('ページ2');
      fireEvent.click(page2Button);

      await waitFor(() => {
        expect(mockSetCurrentPage).toHaveBeenCalledWith(2);
      });
    });

    it('1ページのみの場合、ページネーションが表示されない', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 1,
        totalItems: 10,
      });

      renderWithRouter(<MandalaListContainer />);

      expect(screen.queryByLabelText('ページネーション')).not.toBeInTheDocument();
    });
  });

  describe('新規作成ボタンのテスト', () => {
    it('新規作成ボタンが表示される', () => {
      renderWithRouter(<MandalaListContainer />);

      const createButton = screen.getByText('新規作成');
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveAttribute('aria-label', '新規マンダラチャートを作成');
    });
  });

  describe('アクセシビリティのテスト', () => {
    it('マンダラグリッドに適切なaria-labelが設定されている', () => {
      renderWithRouter(<MandalaListContainer />);

      const grid = screen.getByRole('list');
      expect(grid).toHaveAttribute('aria-label', 'マンダラチャート一覧');
    });

    it('ローディング状態がaria-liveで通知される', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
        mandalas: [],
      });

      renderWithRouter(<MandalaListContainer />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-busy', 'true');
    });

    it('エラーメッセージがaria-liveで通知される', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        error: 'エラーが発生しました',
        mandalas: [],
      });

      renderWithRouter(<MandalaListContainer />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('検索バーに適切なaria-labelが設定されている', () => {
      renderWithRouter(<MandalaListContainer />);

      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveAttribute('aria-label', 'マンダラチャートを検索');
      expect(searchInput).toHaveAttribute('aria-describedby', 'search-description');
    });

    it('フィルタードロップダウンに適切なaria-labelが設定されている', () => {
      renderWithRouter(<MandalaListContainer />);

      const filterDropdown = screen.getByLabelText('目標状態でフィルター');
      expect(filterDropdown).toHaveAttribute('aria-describedby', 'filter-description');
    });

    it('ソートドロップダウンに適切なaria-labelが設定されている', () => {
      renderWithRouter(<MandalaListContainer />);

      const sortDropdown = screen.getByLabelText('並び替え');
      expect(sortDropdown).toHaveAttribute('aria-describedby', 'sort-description');
    });

    it('新規作成ボタンに適切なaria-labelが設定されている', () => {
      renderWithRouter(<MandalaListContainer />);

      const createButton = screen.getByLabelText('新規マンダラチャートを作成');
      expect(createButton).toBeInTheDocument();
    });

    it('データ取得中のオーバーレイがaria-liveで通知される', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        isFetching: true,
        isLoading: false,
      });

      renderWithRouter(<MandalaListContainer />);

      const status = screen.getByRole('status', { name: /更新中/ });
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-busy', 'true');
    });

    it('すべてのインタラクティブ要素がキーボードでアクセス可能', () => {
      renderWithRouter(<MandalaListContainer />);

      // 検索バー
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).not.toHaveAttribute('tabindex', '-1');

      // フィルタードロップダウン
      const filterDropdown = screen.getByLabelText('目標状態でフィルター');
      expect(filterDropdown).not.toHaveAttribute('tabindex', '-1');

      // ソートドロップダウン
      const sortDropdown = screen.getByLabelText('並び替え');
      expect(sortDropdown).not.toHaveAttribute('tabindex', '-1');

      // 新規作成ボタン
      const createButton = screen.getByText('新規作成');
      expect(createButton).not.toHaveAttribute('tabindex', '-1');
    });

    it('マンダラカードがキーボードでアクセス可能', () => {
      renderWithRouter(<MandalaListContainer />);

      const cards = screen.getAllByRole('button');
      cards.forEach(card => {
        // role="button"の要素はtabIndex=0を持つべき
        if (card.getAttribute('role') === 'button') {
          expect(card).toHaveAttribute('tabindex', '0');
        }
      });
    });

    it('ページネーションボタンに適切なaria-labelが設定されている', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 3,
        totalItems: 60,
        currentPage: 2,
      });

      renderWithRouter(<MandalaListContainer />);

      expect(screen.getByLabelText('前のページ')).toBeInTheDocument();
      expect(screen.getByLabelText('次のページ')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ1')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ2')).toBeInTheDocument();
      expect(screen.getByLabelText('ページ3')).toBeInTheDocument();
    });

    it('現在のページにaria-currentが設定されている', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 3,
        totalItems: 60,
        currentPage: 2,
      });

      renderWithRouter(<MandalaListContainer />);

      const currentPageButton = screen.getByLabelText('ページ2');
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });

    it('無効化されたボタンにaria-disabledが設定されている', () => {
      mockUseMandalaList.mockReturnValue({
        ...defaultMockReturn,
        totalPages: 3,
        totalItems: 60,
        currentPage: 1,
      });

      renderWithRouter(<MandalaListContainer />);

      const prevButton = screen.getByLabelText('前のページ');
      expect(prevButton).toHaveAttribute('aria-disabled', 'true');
      expect(prevButton).toBeDisabled();
    });
  });

  describe('カスタムクラスのテスト', () => {
    it('classNameプロパティが正しく適用される', () => {
      const { container } = renderWithRouter(<MandalaListContainer className="custom-class" />);

      const mainDiv = container.firstChild;
      expect(mainDiv).toHaveClass('custom-class');
    });
  });
});
