# マンダラチャート一覧コンポーネント

このディレクトリには、マンダラチャート一覧画面（TOP画面）で使用するコンポーネントが含まれます。

## コンポーネント一覧

### 基本コンポーネント

- **StatusBadge**: 目標状態のバッジ表示
- **ProgressCircle**: 進捗率の円形表示
- **SearchBar**: 検索入力フィールド
- **StatusFilter**: 状態フィルタードロップダウン
- **SortDropdown**: ソートドロップダウン

### カードコンポーネント

- **MandalaCard**: マンダラチャートカード
  - CardHeader: カードヘッダー
  - CardBody: カード本体
  - CardFooter: カードフッター

### レイアウトコンポーネント

- **MandalaListContainer**: 一覧コンテナ
- **MandalaGrid**: マンダラグリッド
- **FilterBar**: フィルター・ソートバー

### ユーティリティコンポーネント

- **Pagination**: ページネーション
- **EmptyState**: 空状態表示
- **UserMenu**: ユーザーメニュー

## 使用方法

```tsx
import {
  MandalaCard,
  StatusBadge,
  ProgressCircle,
} from '@/components/mandala-list';

// コンポーネントの使用例
<MandalaCard mandala={mandalaData} onClick={handleCardClick} />;
```

## 設計原則

- 各コンポーネントは単一責任の原則に従う
- Props型は`types/mandala-list.ts`で定義
- スタイリングはTailwind CSSを使用
- アクセシビリティ対応を必須とする
