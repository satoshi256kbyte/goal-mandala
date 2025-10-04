# ProgressBar コンポーネント

進捗値を視覚的に表示するプログレスバーコンポーネントです。アクセシビリティとカラーブラインドネス対応を考慮した色分け表示機能を提供します。

## 特徴

- **進捗値に応じた色分け表示**：0%（灰色）、1-49%（赤色）、50-79%（オレンジ色）、80%以上（緑色）
- **アクセシビリティ対応**：WCAG AA準拠のコントラスト比、ハイコントラストモード対応
- **カラーブラインドネス対応**：赤緑色覚異常に配慮した色選択
- **カスタムカラースキーム**：固定スキーム（success、warning、danger、accessible）とカスタム色設定
- **レスポンシブ対応**：3つのサイズバリエーション（small、medium、large）
- **アニメーション効果**：スムーズな進捗変化アニメーション
- **ツールチップ機能**：詳細情報の表示

## 基本的な使用方法

```tsx
import { ProgressBar } from './components/common/ProgressBar';

// 基本的な使用
<ProgressBar value={75} />

// ラベル表示付き
<ProgressBar value={50} showLabel={true} />

// カスタムサイズ
<ProgressBar value={30} size="large" />
```

## 色分け表示機能

### デフォルトの色分けルール

| 進捗値 | 色         | 説明       |
| ------ | ---------- | ---------- |
| 0%     | 灰色       | 未開始状態 |
| 1-49%  | 赤色       | 低進捗状態 |
| 50-79% | オレンジ色 | 中進捗状態 |
| 80-99% | 緑色       | 高進捗状態 |
| 100%   | 濃い緑色   | 完了状態   |

### カスタムカラースキーム

```tsx
// 固定スキーム
<ProgressBar value={75} colorScheme="success" />
<ProgressBar value={50} colorScheme="warning" />
<ProgressBar value={25} colorScheme="danger" />
<ProgressBar value={60} colorScheme="accessible" />

// カスタム色設定
<ProgressBar
  value={75}
  colorScheme="custom"
  customColors={{
    background: '#f0f0f0',
    fill: '#ff6b6b',
    text: '#333333'
  }}
/>

// 進捗値別のカスタム色設定
<ProgressBar
  value={75}
  colorScheme="custom"
  customColors={{
    progressColors: {
      zero: '#cccccc',
      low: '#ff4444',
      medium: '#ffaa00',
      high: '#00aa00',
      complete: '#006600'
    }
  }}
/>
```

## アクセシビリティ機能

### ハイコントラストモード

```tsx
<ProgressBar value={50} highContrast={true} />
```

視覚障害のあるユーザーのために、より高いコントラスト比の色を使用します。

### カラーブラインドネス対応

```tsx
<ProgressBar value={50} colorBlindFriendly={true} />
```

赤緑色覚異常のユーザーのために、区別しやすい色の組み合わせを使用します：

- 低進捗：青色
- 中進捗：紫色
- 高進捗：ティール色

### WCAG AA準拠スキーム

```tsx
<ProgressBar value={50} colorScheme="accessible" />
```

WCAG AA準拠のコントラスト比を保証する色の組み合わせを使用します。

## ツールチップ機能

```tsx
// 基本的なツールチップ
<ProgressBar value={75} tooltip="詳細な進捗情報" />

// 高度なツールチップ設定
<ProgressBar
  value={75}
  tooltipConfig={{
    content: <div>カスタムツールチップ内容</div>,
    position: 'bottom',
    delay: 100,
    touchEnabled: true
  }}
/>
```

## アニメーション制御

```tsx
// アニメーション有効（デフォルト）
<ProgressBar value={75} animated={true} />

// アニメーション無効
<ProgressBar value={75} animated={false} />
```

## プロパティ一覧

| プロパティ           | 型                                                                            | デフォルト  | 説明                           |
| -------------------- | ----------------------------------------------------------------------------- | ----------- | ------------------------------ |
| `value`              | `number`                                                                      | -           | 進捗値（0-100）                |
| `size`               | `'small' \| 'medium' \| 'large'`                                              | `'medium'`  | サイズバリエーション           |
| `showLabel`          | `boolean`                                                                     | `false`     | 進捗値ラベルの表示・非表示     |
| `animated`           | `boolean`                                                                     | `true`      | アニメーション有効・無効       |
| `colorScheme`        | `'default' \| 'success' \| 'warning' \| 'danger' \| 'custom' \| 'accessible'` | `'default'` | カラースキーム                 |
| `customColors`       | `CustomColors`                                                                | -           | カスタム色設定                 |
| `tooltip`            | `string`                                                                      | -           | ツールチップテキスト           |
| `tooltipConfig`      | `TooltipConfig`                                                               | -           | 高度なツールチップ設定         |
| `className`          | `string`                                                                      | -           | 追加のCSSクラス                |
| `aria-label`         | `string`                                                                      | -           | アクセシビリティ用ラベル       |
| `highContrast`       | `boolean`                                                                     | `false`     | ハイコントラストモード         |
| `colorBlindFriendly` | `boolean`                                                                     | `false`     | カラーブラインドネス対応モード |

## 使用例

### 基本的な進捗表示

```tsx
function TaskProgress({ completedTasks, totalTasks }) {
  const progress = (completedTasks / totalTasks) * 100;

  return (
    <div>
      <h3>タスク進捗</h3>
      <ProgressBar
        value={progress}
        showLabel={true}
        tooltip={`${completedTasks}/${totalTasks} タスク完了`}
      />
    </div>
  );
}
```

### アクセシビリティ対応

```tsx
function AccessibleProgress({ value }) {
  return (
    <ProgressBar
      value={value}
      colorScheme="accessible"
      highContrast={true}
      showLabel={true}
      aria-label={`プロジェクト進捗 ${value}%`}
    />
  );
}
```

### カスタムデザイン

```tsx
function CustomProgress({ value }) {
  return (
    <ProgressBar
      value={value}
      size="large"
      colorScheme="custom"
      customColors={{
        progressColors: {
          zero: '#e5e7eb',
          low: '#fca5a5',
          medium: '#fbbf24',
          high: '#34d399',
          complete: '#10b981',
        },
      }}
      animated={true}
      showLabel={true}
    />
  );
}
```

## 注意事項

- 進捗値は0-100の範囲で指定してください。範囲外の値は自動的に制限されます。
- カスタム色を使用する場合は、十分なコントラスト比を確保してください。
- アニメーション無効設定（`prefers-reduced-motion`）に対応しています。
- ダークモードに対応したスタイルが適用されます。
