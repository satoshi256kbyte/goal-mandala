import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { MandalaListContainer } from '../MandalaListContainer';
import { useMandalaList } from '../../../hooks/mandala-list/useMandalaList';
import { GoalStatus } from '../../../types/mandala';

// useMandalaListフックをモック
vi.mock('../../../hooks/mandala-list/useMandalaList');

const mockUseMandalaList = useMandalaList as ReturnType<typeof vi.fn>;

// モックデータ
const mockMandalas = [
  {
    id: '1',
    title: 'テスト目標1',
    description: 'テスト説明1',
    deadline: new Date('2024-12-31'),
    status: GoalStatus.ACTIVE,
    progress: 50,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    title: 'テスト目標2',
    description: 'テスト説明2',
    deadline: new Date('2024-12-31'),
    status: GoalStatus.DRAFT,
    progress: 0,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-16'),
  },
];

describe('レスポンシブデザインのテスト', () => {
  beforeEach(() => {
    mockUseMandalaList.mockReturnValue({
      mandalas: mockMandalas,
      totalItems: 2,
      totalPages: 1,
      isLoading: false,
      isFetching: false,
      error: null,
      searchKeyword: '',
      statusFilter: 'all',
      sortOption: 'created_at_desc',
      currentPage: 1,
      setSearchKeyword: vi.fn(),
      setStatusFilter: vi.fn(),
      setSortOption: vi.fn(),
      setCurrentPage: vi.fn(),
      refetch: vi.fn(),
      clearFilters: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('モバイル表示（< 768px）', () => {
    beforeEach(() => {
      // モバイルビューポートを設定
      global.innerWidth = 375;
      global.innerHeight = 667;
    });

    it('1カラムグリッドで表示される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      const grid = screen.getByRole('list', { name: 'マンダラチャート一覧' });
      expect(grid).toHaveClass('grid-cols-1');
    });

    it('検索・フィルター・ソートが縦配置される', () => {
      const { container } = render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // フィルターバーが縦配置（flex-col）
      // MandalaListContainerのルート要素の最初の子要素（フィルターバー）を取得
      const rootElement = container.firstChild as HTMLElement;
      const filterBar = rootElement.firstChild as HTMLElement;
      expect(filterBar).toHaveClass('flex-col');
    });

    it('タッチ操作対応のボタンサイズ（最小44px）が確保される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 新規作成ボタン
      const createButton = screen.getByRole('button', { name: '新規マンダラチャートを作成' });
      expect(createButton).toHaveClass('min-h-[44px]');

      // 検索バー
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveClass('min-h-[44px]');

      // フィルター
      const statusFilter = screen.getByLabelText('目標状態でフィルター');
      expect(statusFilter).toHaveClass('min-h-[44px]');

      // ソート
      const sortDropdown = screen.getByLabelText('並び替え');
      expect(sortDropdown).toHaveClass('min-h-[44px]');
    });

    it('タッチ操作対応のクラスが適用される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // 新規作成ボタン
      const createButton = screen.getByRole('button', { name: '新規マンダラチャートを作成' });
      expect(createButton).toHaveClass('touch-manipulation');

      // 検索バー
      const searchInput = screen.getByRole('searchbox');
      expect(searchInput).toHaveClass('touch-manipulation');

      // フィルター
      const statusFilter = screen.getByLabelText('目標状態でフィルター');
      expect(statusFilter).toHaveClass('touch-manipulation');

      // ソート
      const sortDropdown = screen.getByLabelText('並び替え');
      expect(sortDropdown).toHaveClass('touch-manipulation');
    });

    it('マンダラカードにタッチ操作対応が適用される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      const cards = screen.getAllByRole('button', { name: /のマンダラチャート/ });
      cards.forEach(card => {
        expect(card).toHaveClass('touch-manipulation');
      });
    });
  });

  describe('タブレット表示（768px - 1024px）', () => {
    beforeEach(() => {
      // タブレットビューポートを設定
      global.innerWidth = 768;
      global.innerHeight = 1024;
    });

    it('2カラムグリッドで表示される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      const grid = screen.getByRole('list', { name: 'マンダラチャート一覧' });
      expect(grid).toHaveClass('sm:grid-cols-2');
    });

    it('検索・フィルター・ソートが横配置される', () => {
      const { container } = render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // フィルターバーが横配置（sm:flex-row）
      // MandalaListContainerのルート要素の最初の子要素（フィルターバー）を取得
      const rootElement = container.firstChild as HTMLElement;
      const filterBar = rootElement.firstChild as HTMLElement;
      expect(filterBar).toHaveClass('sm:flex-row');
    });
  });

  describe('デスクトップ表示（> 1024px）', () => {
    beforeEach(() => {
      // デスクトップビューポートを設定
      global.innerWidth = 1440;
      global.innerHeight = 900;
    });

    it('3カラムグリッドで表示される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      const grid = screen.getByRole('list', { name: 'マンダラチャート一覧' });
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('最大幅制限（max-w-7xl）が適用される', () => {
      const { container } = render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // MandalaListContainerのルート要素を取得
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toHaveClass('max-w-7xl');
    });
  });

  describe('レスポンシブグリッドの動作', () => {
    it('全てのブレークポイントでグリッドクラスが適用される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      const grid = screen.getByRole('list', { name: 'マンダラチャート一覧' });

      // 全てのブレークポイントのクラスが存在することを確認
      expect(grid).toHaveClass('grid-cols-1'); // モバイル
      expect(grid).toHaveClass('sm:grid-cols-2'); // タブレット
      expect(grid).toHaveClass('lg:grid-cols-3'); // デスクトップ
    });

    it('グリッドギャップが適切に設定される', () => {
      render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      const grid = screen.getByRole('list', { name: 'マンダラチャート一覧' });
      expect(grid).toHaveClass('gap-6');
    });
  });

  describe('パディングとマージンの調整', () => {
    it('モバイルで適切なパディングが適用される', () => {
      global.innerWidth = 375;

      const { container } = render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // MandalaListContainerのルート要素を取得
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toHaveClass('py-4');
      expect(rootElement).toHaveClass('sm:py-8');
    });

    it('タブレット以上で適切なパディングが適用される', () => {
      global.innerWidth = 768;

      const { container } = render(
        <BrowserRouter>
          <MandalaListContainer />
        </BrowserRouter>
      );

      // MandalaListContainerのルート要素を取得
      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement).toHaveClass('sm:py-8');
    });
  });
});
