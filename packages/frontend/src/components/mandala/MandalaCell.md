# MandalaCell コンポーネント

マンダラチャートの個別セルを表示するコンポーネントです。進捗に応じた色分け表示機能とアクセシビリティ対応を提供します。

## 特徴

- **進捗値に応じた色分け表示**：背景色とボーダー色が進捗に応じて変化
- **アクセシビリティ対応**：適切なARIAラベル、キーボード操作対応
- **カラーブラインドネス対応**：区別しやすい色の組み合わせ
- **ダークモード対応**：テーマに応じたテキスト色の調整
- **レスポンシブ対応**：画面サイズに応じたレイアウト調整
- **インタラクション機能**：クリック、ダブルクリック、ドラッグ&ドロップ対応

## 基本的な使用方法

```tsx
import MandalaCell from './components/mandala/MandalaCell';

const cellData = {
  id: 'goal-1',
  type: 'goal',
  title: '目標タイトル',
  description: '目標の説明',
  progress: 75,
  position: { row: 4, col: 4 },
};

<MandalaCell
  cellData={cellData}
  position={{ row: 4, col: 4 }}
  editable={true}
  onClick={handleClick}
  onEdit={handleEdit}
/>;
```

## 色分け表示機能

### デフォルトの色分けルール

| 進捗値 | 背景色                  | 説明       |
| ------ | ----------------------- | ---------- |
| 0%     | 灰色（透明度60%）       | 未開始状態 |
| 1-49%  | 赤色（透明度60%）       | 低進捗状態 |
| 50-79% | オレンジ色（透明度60%） | 中進捗状態 |
| 80-99% | 緑色（透明度60%）       | 高進捗状態 |
| 100%   | 濃い緑色（透明度80%）   | 完了状態   |

### カラーブラインドネス対応

```tsx
<MandalaCell
  cellData={cellData}
  position={position}
  colorBlindFriendly={true}
  onClick={handleClick}
  onEdit={handleEdit}
/>
```

赤緑色覚異常のユーザーのために、区別しやすい色を使用：

- 低進捗：青色
- 中進捗：紫色
- 高進捗：ティール色

### ハイコントラストモード

```tsx
<MandalaCell
  cellData={cellData}
  position={position}
  highContrast={true}
  onClick={handleClick}
  onEdit={handleEdit}
/>
```

視覚障害のあるユーザーのために、より濃い色（透明度80%）を使用します。

### ダークモード対応

```tsx
<MandalaCell
  cellData={cellData}
  position={position}
  darkMode={true}
  onClick={handleClick}
  onEdit={handleEdit}
/>
```

ダークテーマに適したテキスト色を自動調整します。

### カスタム色設定

```tsx
<MandalaCell
  cellData={cellData}
  position={position}
  customColors={{
    zero: '#cccccc',
    low: '#ff4444',
    medium: '#ffaa00',
    high: '#00aa00',
    complete: '#006600',
  }}
  onClick={handleClick}
  onEdit={handleEdit}
/>
```

## セルタイプ別の表示

### 目標セル

```tsx
const goalData = {
  id: 'goal-1',
  type: 'goal',
  title: '売上目標達成',
  progress: 85,
  position: { row: 4, col: 4 },
};
```

### サブ目標セル

```tsx
const subGoalData = {
  id: 'subgoal-1',
  type: 'subgoal',
  title: '新規顧客獲得',
  progress: 60,
  position: { row: 3, col: 4 },
};
```

### アクションセル

```tsx
const actionData = {
  id: 'action-1',
  type: 'action',
  title: 'テレアポ実施',
  progress: 40,
  status: 'execution', // または 'habit'
  position: { row: 0, col: 0 },
};
```

### 空のセル

```tsx
const emptyData = {
  id: '',
  type: 'empty',
  title: '',
  progress: 0,
  position: { row: 0, col: 1 },
};
```

## インタラクション機能

### クリックイベント

```tsx
const handleClick = cellData => {
  console.log('セルがクリックされました:', cellData);
};

<MandalaCell
  cellData={cellData}
  position={position}
  onClick={handleClick}
  onEdit={handleEdit}
/>;
```

### 編集機能

```tsx
const handleEdit = cellData => {
  // 編集モーダルを開く
  openEditModal(cellData);
};

<MandalaCell
  cellData={cellData}
  position={position}
  editable={true}
  onClick={handleClick}
  onEdit={handleEdit}
/>;
```

### ドラッグ&ドロップ

```tsx
const handleDragStart = position => {
  setDraggedCell(position);
};

const handleDragEnd = position => {
  setDraggedCell(null);
};

<MandalaCell
  cellData={cellData}
  position={position}
  editable={true}
  onClick={handleClick}
  onEdit={handleEdit}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
/>;
```

## アクセシビリティ機能

### ARIAラベル

各セルタイプに応じた適切なARIAラベルが自動設定されます：

- 目標：「目標: [タイトル], 進捗: [進捗率]%」
- サブ目標：「サブ目標: [タイトル], 進捗: [進捗率]%」
- アクション：「アクション: [タイトル], 進捗: [進捗率]%」
- 空のセル：「空のセル」

### キーボード操作

- **Enter/Space**: セルをクリック
- **Tab**: フォーカス移動
- **矢印キー**: グリッド内でのフォーカス移動（親コンポーネントで実装）

### フォーカス表示

```css
.mandala-cell:focus {
  @apply ring-2 ring-blue-500 ring-opacity-50;
}
```

## プロパティ一覧

| プロパティ           | 型                             | 必須 | デフォルト | 説明                           |
| -------------------- | ------------------------------ | ---- | ---------- | ------------------------------ |
| `cellData`           | `CellData`                     | ✓    | -          | セルのデータ                   |
| `position`           | `Position`                     | ✓    | -          | セルの位置                     |
| `editable`           | `boolean`                      | ✓    | -          | 編集可能フラグ                 |
| `onClick`            | `(cellData: CellData) => void` | ✓    | -          | クリック時のコールバック       |
| `onEdit`             | `(cellData: CellData) => void` | ✓    | -          | 編集時のコールバック           |
| `onDragStart`        | `(position: Position) => void` | -    | -          | ドラッグ開始時のコールバック   |
| `onDragEnd`          | `(position: Position) => void` | -    | -          | ドラッグ終了時のコールバック   |
| `colorBlindFriendly` | `boolean`                      | -    | `false`    | カラーブラインドネス対応モード |
| `highContrast`       | `boolean`                      | -    | `false`    | ハイコントラストモード         |
| `darkMode`           | `boolean`                      | -    | `false`    | ダークモード                   |
| `customColors`       | `CustomColors`                 | -    | -          | カスタム色設定                 |

## CSSクラス

### 基本クラス

- `.mandala-cell`: 基本スタイル
- `.mandala-cell.empty`: 空のセル用スタイル
- `.progress-0`, `.progress-low`, `.progress-medium`, `.progress-high`, `.progress-complete`: 進捗別スタイル

### 内部要素クラス

- `.cell-title`: セルタイトル
- `.cell-progress`: 進捗表示
- `.cell-status`: アクション種別表示
- `.cell-placeholder`: 空セルのプレースホルダー

## 使用例

### 基本的なマンダラグリッド

```tsx
function MandalaGrid({ cells }) {
  return (
    <div className="grid grid-cols-9 gap-1">
      {cells.map((cell, index) => (
        <MandalaCell
          key={cell.id || index}
          cellData={cell}
          position={getPositionFromIndex(index)}
          editable={true}
          onClick={handleCellClick}
          onEdit={handleCellEdit}
        />
      ))}
    </div>
  );
}
```

### アクセシビリティ対応グリッド

```tsx
function AccessibleMandalaGrid({ cells }) {
  return (
    <div
      className="grid grid-cols-9 gap-1"
      role="grid"
      aria-label="マンダラチャート"
    >
      {cells.map((cell, index) => (
        <MandalaCell
          key={cell.id || index}
          cellData={cell}
          position={getPositionFromIndex(index)}
          editable={true}
          colorBlindFriendly={true}
          highContrast={true}
          onClick={handleCellClick}
          onEdit={handleCellEdit}
        />
      ))}
    </div>
  );
}
```

## 注意事項

- セルデータの`progress`は0-100の範囲で指定してください。
- 空のセルには背景色が適用されません。
- ドラッグ&ドロップ機能は`editable={true}`かつ空でないセルでのみ有効です。
- カスタム色を使用する場合は、十分なコントラスト比を確保してください。
- レスポンシブ対応のため、モバイル環境では一部のスタイルが調整されます。
