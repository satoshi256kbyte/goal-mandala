# Mandala Chart Components

マンダラチャート表示用のReactコンポーネント群です。

## Components

### MandalaChart

メインのマンダラチャートコンポーネント。9×9のグリッドで目標、サブ目標、アクションを表示します。

#### Props

```typescript
interface MandalaChartProps {
  goalId: string; // 表示する目標のID
  editable?: boolean; // 編集可能かどうか
  onCellClick?: (cellData: CellData) => void; // セルクリック時のコールバック
  onCellEdit?: (cellData: CellData) => void; // セル編集時のコールバック
  className?: string; // 追加のCSSクラス
}
```

#### Usage

```tsx
import { MandalaChart } from '@/components/mandala';

function MyComponent() {
  const handleCellClick = cellData => {
    console.log('Clicked:', cellData);
  };

  return (
    <MandalaChart
      goalId="my-goal-id"
      editable={true}
      onCellClick={handleCellClick}
    />
  );
}
```

### MandalaCell

個別のセルを表示するコンポーネント。

#### Props

```typescript
interface MandalaCellProps {
  cellData: CellData; // セルのデータ
  position: Position; // グリッド内の位置
  editable: boolean; // 編集可能かどうか
  onClick: (cellData: CellData) => void; // クリック時のコールバック
  onEdit: (cellData: CellData) => void; // 編集時のコールバック
  onDragStart?: (position: Position) => void; // ドラッグ開始時
  onDragEnd?: (position: Position) => void; // ドラッグ終了時
}
```

## Features

- ✅ 9×9グリッドレイアウト
- ✅ 進捗色分け表示
- ✅ レスポンシブデザイン
- ✅ アクセシビリティ対応
- ✅ キーボードナビゲーション
- ✅ ドラッグ&ドロップ
- ✅ ローディング・エラー状態

## Accessibility

- ARIA属性による構造化情報
- キーボードナビゲーション（Tab, 矢印キー）
- スクリーンリーダー対応
- 高コントラストモード対応
- 色覚障害対応の色選択

## Performance

- React.memoによる最適化
- 仮想化対応（大量データ）
- 遅延読み込み対応
