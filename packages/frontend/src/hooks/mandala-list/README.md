# マンダラチャート一覧カスタムフック

このディレクトリには、マンダラチャート一覧画面で使用するカスタムフックが含まれます。

## フック一覧

### useMandalaList

マンダラチャート一覧の取得、検索、フィルター、ソート、ページネーション機能を提供するメインフック。

**機能:**

- データ取得とキャッシュ管理
- 検索キーワード管理
- フィルター条件管理
- ソート条件管理
- ページネーション管理
- エラーハンドリング

**使用例:**

```tsx
import { useMandalaList } from '@/hooks/mandala-list';

function MandalaListPage() {
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
  } = useMandalaList({
    initialPage: 1,
    itemsPerPage: 20,
  });

  // コンポーネントの実装
}
```

## 設計原則

- フックは単一責任の原則に従う
- 型定義は`types/mandala-list.ts`で定義
- エラーハンドリングを適切に実装
- パフォーマンスを考慮した実装
