# マンダラチャート一覧画面 コンポーネントガイド

## 概要

このドキュメントでは、マンダラチャート一覧画面を構成するコンポーネントの詳細について説明します。

## コンポーネント構成

```
MandalaListPage (ページコンポーネント)
├── AppLayout (レイアウトコンポーネント)
│   ├── Header
│   │   ├── Logo
│   │   ├── SearchBar (検索バー)
│   │   └── UserMenu (ユーザーメニュー)
│   ├── MandalaListContainer (一覧コンテナ)
│   │   ├── FilterBar (フィルター・ソートバー)
│   │   │   ├── StatusFilter (状態フィルター)
│   │   │   ├── SortDropdown (ソートドロップダウン)
│   │   │   └── CreateButton (新規作成ボタン)
│   │   ├── MandalaGrid (マンダラグリッド)
│   │   │   └── MandalaCard[] (マンダラカード配列)
│   │   │       ├── CardHeader (カードヘッダー)
│   │   │       │   ├── StatusBadge (状態バッジ)
│   │   │       │   └── DeadlineWarning (期限警告)
│   │   │       ├── CardBody (カード本体)
│   │   │       │   ├── Title (タイトル)
│   │   │       │   ├── Description (説明)
│   │   │       │   └── ProgressCircle (進捗円グラフ)
│   │   │       └── CardFooter (カードフッター)
│   │   │           ├── Deadline (達成期限)
│   │   │           └── Timestamps (作成・更新日時)
│   │   ├── EmptyState (空状態表示)
│   │   └── Pagination (ページネーション)
│   └── Footer
├── LoadingSpinner (ローディング表示)
├── ErrorAlert (エラー表示)
└── SkeletonLoader (スケルトンローダー)
```

## コンポーネント詳細

### 1. MandalaListPage

**責務**: ページ全体の状態管理と認証チェック

**Props**:
```typescript
interface MandalaListPageProps {
  className?: string;
}
```

**State**:
```typescript
interface PageState {
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}
```

**主要機能**:
- 認証状態の確認
- プロフィール設定状態の確認
- データ取得とキャッシュ管理
- エラーハンドリング
- リダイレクト処理

**使用例**:
```typescript
import { MandalaListPage } from '@/pages/MandalaListPage';

function App() {
  return <MandalaListPage />;
}
```

### 2. MandalaCard

**責務**: マンダラチャートの概要表示

**Props**:
```typescript
interface MandalaCardProps {
  mandala: MandalaChartSummary;
  onClick: (id: string) => void;
  className?: string;
}

interface MandalaChartSummary {
  id: string;
  title: string;
  description: string;
  deadline: Date;
  status: GoalStatus;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**主要機能**:
- マンダラチャートの概要表示
- 進捗率の視覚化
- 状態バッジの表示
- クリックイベントの処理
- キーボードイベントの処理

**使用例**:
```typescript
import { MandalaCard } from '@/components/mandala-list/MandalaCard';

function MandalaGrid({ mandalas }: { mandalas: MandalaChartSummary[] }) {
  const navigate = useNavigate();

  return (
    <div className="mandala-grid">
      {mandalas.map(mandala => (
        <MandalaCard
          key={mandala.id}
          mandala={mandala}
          onClick={(id) => navigate(`/mandala/${id}`)}
        />
      ))}
    </div>
  );
}
```

### 3. SearchBar

**責務**: 検索キーワードの入力とクリア

**Props**:
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
}
```

**主要機能**:
- 検索キーワードの入力
- リアルタイム検索
- 検索クリア機能
- デバウンス処理（300ms）

**使用例**:
```typescript
import { SearchBar } from '@/components/mandala-list/SearchBar';

function FilterBar() {
  const [searchKeyword, setSearchKeyword] = useState('');

  return (
    <SearchBar
      value={searchKeyword}
      onChange={setSearchKeyword}
      onClear={() => setSearchKeyword('')}
      placeholder="目標を検索..."
    />
  );
}
```

### 4. StatusFilter

**責務**: 目標状態によるフィルタリング

**Props**:
```typescript
interface StatusFilterProps {
  value: GoalStatus | 'all';
  onChange: (status: GoalStatus | 'all') => void;
  disabled?: boolean;
}

enum GoalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}
```

**主要機能**:
- 目標状態によるフィルタリング
- フィルター条件の表示

**使用例**:
```typescript
import { StatusFilter } from '@/components/mandala-list/StatusFilter';

function FilterBar() {
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');

  return (
    <StatusFilter
      value={statusFilter}
      onChange={setStatusFilter}
    />
  );
}
```

### 5. SortDropdown

**責務**: ソート条件の選択

**Props**:
```typescript
interface SortDropdownProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
  disabled?: boolean;
}

type SortOption =
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'deadline_asc'
  | 'deadline_desc'
  | 'progress_desc'
  | 'progress_asc';
```

**主要機能**:
- ソート条件の選択
- ソート順序の管理

**使用例**:
```typescript
import { SortDropdown } from '@/components/mandala-list/SortDropdown';

function FilterBar() {
  const [sortOption, setSortOption] = useState<SortOption>('created_at_desc');

  return (
    <SortDropdown
      value={sortOption}
      onChange={setSortOption}
    />
  );
}
```

### 6. ProgressCircle

**責務**: 進捗率の円形表示

**Props**:
```typescript
interface ProgressCircleProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}
```

**主要機能**:
- 進捗率の円形表示
- 色分け表示（0-30%: 赤、31-70%: 黄、71-100%: 緑）
- SVGによる円グラフ描画

**使用例**:
```typescript
import { ProgressCircle } from '@/components/mandala-list/ProgressCircle';

function MandalaCard({ mandala }: { mandala: MandalaChartSummary }) {
  return (
    <div className="card">
      <ProgressCircle
        progress={mandala.progress}
        size="md"
        showLabel={true}
      />
    </div>
  );
}
```

### 7. StatusBadge

**責務**: 目標状態のバッジ表示

**Props**:
```typescript
interface StatusBadgeProps {
  status: GoalStatus;
  className?: string;
}
```

**主要機能**:
- 目標状態のバッジ表示
- 状態に応じた色分け

**使用例**:
```typescript
import { StatusBadge } from '@/components/mandala-list/StatusBadge';

function MandalaCard({ mandala }: { mandala: MandalaChartSummary }) {
  return (
    <div className="card">
      <StatusBadge status={mandala.status} />
    </div>
  );
}
```

### 8. Pagination

**責務**: ページネーション表示と遷移

**Props**:
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}
```

**主要機能**:
- ページネーション表示
- ページ遷移処理
- ボタンの有効/無効制御

**使用例**:
```typescript
import { Pagination } from '@/components/mandala-list/Pagination';

function MandalaListContainer() {
  const { currentPage, totalPages, totalItems, setCurrentPage } = useMandalaList();

  return (
    <div>
      {/* マンダラグリッド */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={20}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

### 9. EmptyState

**責務**: 空状態の表示

**Props**:
```typescript
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}
```

**主要機能**:
- 空状態の表示
- 新規作成への誘導

**使用例**:
```typescript
import { EmptyState } from '@/components/mandala-list/EmptyState';

function MandalaListContainer() {
  const { mandalas } = useMandalaList();
  const navigate = useNavigate();

  if (mandalas.length === 0) {
    return (
      <EmptyState
        title="まだマンダラチャートがありません"
        description="新しい目標を作成して、マンダラチャートを始めましょう"
        actionLabel="新規作成"
        onAction={() => navigate('/mandala/create/goal')}
      />
    );
  }

  return <MandalaGrid mandalas={mandalas} />;
}
```

### 10. UserMenu

**責務**: ユーザーメニューの表示

**Props**:
```typescript
interface UserMenuProps {
  userName: string;
  userEmail: string;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
}
```

**主要機能**:
- ユーザーメニューの表示
- 設定・ログアウト機能

**使用例**:
```typescript
import { UserMenu } from '@/components/mandala-list/UserMenu';

function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header>
      <UserMenu
        userName={user.name}
        userEmail={user.email}
        onSettingsClick={() => navigate('/settings')}
        onLogoutClick={() => logout()}
      />
    </header>
  );
}
```

## カスタムフック

### useMandalaList

**責務**: マンダラチャート一覧の取得と管理

**インターフェース**:
```typescript
interface UseMandalaListOptions {
  initialPage?: number;
  itemsPerPage?: number;
}

interface UseMandalaListReturn {
  // データ
  mandalas: MandalaChartSummary[];
  totalItems: number;
  totalPages: number;
  
  // 状態
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  
  // フィルター・検索・ソート
  searchKeyword: string;
  statusFilter: GoalStatus | 'all';
  sortOption: SortOption;
  currentPage: number;
  
  // メソッド
  setSearchKeyword: (keyword: string) => void;
  setStatusFilter: (status: GoalStatus | 'all') => void;
  setSortOption: (option: SortOption) => void;
  setCurrentPage: (page: number) => void;
  refetch: () => Promise<void>;
  clearFilters: () => void;
}

function useMandalaList(options?: UseMandalaListOptions): UseMandalaListReturn;
```

**主要機能**:
- マンダラチャート一覧の取得
- 検索・フィルター・ソート処理
- ページネーション管理
- キャッシュ管理

**使用例**:
```typescript
import { useMandalaList } from '@/hooks/useMandalaList';

function MandalaListContainer() {
  const {
    mandalas,
    totalItems,
    totalPages,
    isLoading,
    error,
    searchKeyword,
    statusFilter,
    sortOption,
    currentPage,
    setSearchKeyword,
    setStatusFilter,
    setSortOption,
    setCurrentPage,
    refetch,
    clearFilters,
  } = useMandalaList({ itemsPerPage: 20 });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} onRetry={refetch} />;

  return (
    <div>
      <FilterBar
        searchKeyword={searchKeyword}
        onSearchChange={setSearchKeyword}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onClearFilters={clearFilters}
      />
      <MandalaGrid mandalas={mandalas} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={20}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

## スタイリング

### Tailwind CSSクラス

#### ページコンテナ

```css
.page-container {
  @apply min-h-screen bg-gray-50;
}

.content-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8;
}
```

#### マンダラグリッド

```css
.mandala-grid {
  @apply grid gap-6
         grid-cols-1
         sm:grid-cols-2
         lg:grid-cols-3;
}
```

#### マンダラカード

```css
.mandala-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200
         hover:shadow-md hover:border-blue-300
         focus:outline-none focus:ring-2 focus:ring-blue-500
         transition-all duration-200 cursor-pointer;
}

.card-header {
  @apply flex items-center justify-between p-4 border-b border-gray-100;
}

.card-body {
  @apply p-4;
}

.card-footer {
  @apply px-4 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg;
}
```

#### 状態バッジ

```css
.status-badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.status-draft {
  @apply bg-gray-100 text-gray-800;
}

.status-active {
  @apply bg-blue-100 text-blue-800;
}

.status-completed {
  @apply bg-green-100 text-green-800;
}

.status-paused {
  @apply bg-orange-100 text-orange-800;
}

.status-cancelled {
  @apply bg-red-100 text-red-800;
}
```

#### 進捗円グラフ

```css
.progress-circle {
  @apply relative inline-flex items-center justify-center;
}

.progress-low {
  @apply stroke-red-500;
}

.progress-medium {
  @apply stroke-yellow-500;
}

.progress-high {
  @apply stroke-green-500;
}
```

## テスト

### ユニットテスト例

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MandalaCard } from '@/components/mandala-list/MandalaCard';

describe('MandalaCard', () => {
  const mockMandala: MandalaChartSummary = {
    id: '1',
    title: 'テスト目標',
    description: 'テスト説明',
    deadline: new Date('2025-12-31'),
    status: 'active',
    progress: 50,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-10-24'),
  };

  it('マンダラカードが正しく表示される', () => {
    render(<MandalaCard mandala={mockMandala} onClick={() => {}} />);
    
    expect(screen.getByText('テスト目標')).toBeInTheDocument();
    expect(screen.getByText('テスト説明')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('クリック時にonClickが呼ばれる', () => {
    const handleClick = jest.fn();
    render(<MandalaCard mandala={mockMandala} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith('1');
  });
});
```

### E2Eテスト例

```typescript
import { test, expect } from '@playwright/test';

test('マンダラチャート一覧画面の表示', async ({ page }) => {
  await page.goto('/');
  
  // ログイン
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // マンダラチャート一覧が表示される
  await expect(page.locator('.mandala-card')).toHaveCount(3);
  
  // 検索機能
  await page.fill('input[placeholder="目標を検索..."]', 'プログラミング');
  await expect(page.locator('.mandala-card')).toHaveCount(1);
  
  // フィルター機能
  await page.selectOption('select[aria-label="目標状態でフィルター"]', 'active');
  await expect(page.locator('.mandala-card')).toHaveCount(2);
});
```

## パフォーマンス最適化

### メモ化

```typescript
import { memo, useCallback, useMemo } from 'react';

// コンポーネントのメモ化
export const MandalaCard = memo(MandalaCardComponent);

// コールバックのメモ化
const handleCardClick = useCallback((id: string) => {
  navigate(`/mandala/${id}`);
}, [navigate]);

// 値のメモ化
const filteredMandalas = useMemo(() => {
  return mandalas.filter(mandala => {
    // フィルター処理
  });
}, [mandalas, statusFilter, searchKeyword]);
```

### デバウンス

```typescript
import { useMemo } from 'react';
import { debounce } from 'lodash';

const debouncedSearch = useMemo(
  () => debounce((keyword: string) => {
    setSearchKeyword(keyword);
  }, 300),
  []
);
```

## アクセシビリティ

### ARIA属性

```typescript
// 検索バー
<input
  type="search"
  role="searchbox"
  aria-label="マンダラチャートを検索"
  aria-describedby="search-description"
/>

// マンダラカード
<article
  role="button"
  tabIndex={0}
  aria-label={`${title}のマンダラチャート、進捗率${progress}%`}
  onClick={handleClick}
  onKeyPress={handleKeyPress}
>
  {/* カード内容 */}
</article>
```

## 関連ドキュメント

- [使用方法ガイド](./mandala-list-screen-usage.md)
- [APIドキュメント](./mandala-list-screen-api.md)
- [トラブルシューティングガイド](./mandala-list-screen-troubleshooting.md)
