# ProgressBar コンポーネント使用方法ドキュメント

## 概要

ProgressBarコンポーネントは、進捗値を視覚的に表示するための再利用可能なReactコンポーネントです。進捗値に応じた色分け、サイズバリエーション、ツールチップ機能、アクセシビリティ対応を提供します。

## 基本的な使用方法

### 最小限の実装

```tsx
import { ProgressBar } from '../components/common/ProgressBar';

function MyComponent() {
  return <ProgressBar value={75} />;
}
```

### 基本的なプロパティ

```tsx
<ProgressBar value={75} size="medium" showLabel={true} animated={true} />
```

## プロパティ詳細

### 必須プロパティ

#### value: number

進捗値（0-100の範囲）

```tsx
<ProgressBar value={50} />  // 50%の進捗
<ProgressBar value={100} /> // 完了状態
<ProgressBar value={0} />   // 未開始状態
```

### オプションプロパティ

#### size: 'small' | 'medium' | 'large'

プログレスバーのサイズを指定

```tsx
<ProgressBar value={75} size="small" />  // 高さ: 4px
<ProgressBar value={75} size="medium" /> // 高さ: 8px (デフォルト)
<ProgressBar value={75} size="large" />  // 高さ: 16px
```

#### showLabel: boolean

進捗値のラベル表示を制御

```tsx
<ProgressBar value={75} showLabel={true} />
// 表示: "進捗" と "75%" のラベル
```

#### animated: boolean

アニメーション効果の有効/無効

```tsx
<ProgressBar value={75} animated={true} />  // スムーズなアニメーション
<ProgressBar value={75} animated={false} /> // アニメーションなし
```

## 色分け機能

### デフォルトカラースキーム

```tsx
<ProgressBar value={0} />   // グレー（未開始）
<ProgressBar value={25} />  // 赤（低進捗: 1-49%）
<ProgressBar value={65} />  // オレンジ（中進捗: 50-79%）
<ProgressBar value={90} />  // 緑（高進捗: 80%以上）
```

### カスタムカラースキーム

```tsx
<ProgressBar
  value={75}
  colorScheme="custom"
  customColors={{
    background: '#f3f4f6',
    fill: '#8b5cf6',
    text: '#374151',
    progressColors: {
      zero: '#6b7280',
      low: '#3b82f6',
      medium: '#8b5cf6',
      high: '#10b981',
    },
  }}
/>
```

### 固定カラースキーム

```tsx
<ProgressBar value={75} colorScheme="success" />  // 緑色
<ProgressBar value={75} colorScheme="warning" />  // 黄色
<ProgressBar value={75} colorScheme="danger" />   // 赤色
```

## アクセシビリティ対応

### 基本的なアクセシビリティ

```tsx
<ProgressBar value={75} aria-label="プロジェクトの進捗" showLabel={true} />
```

### ハイコントラストモード

```tsx
<ProgressBar value={75} highContrast={true} colorBlindFriendly={true} />
```

### アクセシブルカラースキーム

```tsx
<ProgressBar
  value={75}
  colorScheme="accessible" // WCAG AA準拠の色
/>
```

## ツールチップ機能

### 基本的なツールチップ

```tsx
<ProgressBar value={75} tooltip="現在の進捗状況" />
```

### 高度なツールチップ設定

```tsx
<ProgressBar
  value={75}
  tooltipConfig={{
    position: 'top',
    delay: 300,
    touchEnabled: true,
    content: (
      <div>
        <h4>詳細な進捗情報</h4>
        <p>完了: 15/20 タスク</p>
      </div>
    ),
  }}
/>
```

### 進捗専用ツールチップ

```tsx
<ProgressBar
  value={75}
  progressTooltip={{
    previousValue: 60,
    targetValue: 100,
    completedTasks: 15,
    totalTasks: 20,
    lastUpdated: new Date(),
    estimatedCompletion: new Date('2024-12-31'),
    progressType: 'goal',
    showDetails: true,
  }}
/>
```

## エラーハンドリング

### エラー状態の表示

```tsx
<ProgressBar
  value={-2} // エラー状態を示す特別な値
  error={{
    hasError: true,
    errorType: ProgressCalculationError.CALCULATION_TIMEOUT,
    errorMessage: '進捗の計算がタイムアウトしました',
    showRetry: true,
    onRetry: () => {
      // 再試行処理
      console.log('進捗計算を再試行します');
    },
  }}
/>
```

### ローディング状態

```tsx
<ProgressBar value={0} loading={true} />
```

## イベントハンドリング

### 達成時のコールバック

```tsx
<ProgressBar
  value={100}
  onAchievement={() => {
    console.log('目標達成！');
    // 達成時の処理（通知、アニメーションなど）
  }}
/>
```

### 進捗変化時のコールバック

```tsx
<ProgressBar
  value={75}
  onProgressChange={(newValue, previousValue) => {
    console.log(`進捗が ${previousValue}% から ${newValue}% に変更されました`);
  }}
/>
```

## 実用的な使用例

### タスク進捗の表示

```tsx
function TaskProgress({ task }) {
  const progress = (task.completedSubtasks / task.totalSubtasks) * 100;

  return (
    <ProgressBar
      value={progress}
      size="medium"
      showLabel={true}
      tooltip={`${task.completedSubtasks}/${task.totalSubtasks} 完了`}
      onAchievement={() => {
        // タスク完了時の処理
        notifyTaskCompletion(task.id);
      }}
    />
  );
}
```

### 目標達成状況の表示

```tsx
function GoalProgress({ goal }) {
  return (
    <ProgressBar
      value={goal.progress}
      size="large"
      showLabel={true}
      colorScheme="accessible"
      progressTooltip={{
        previousValue: goal.previousProgress,
        targetValue: 100,
        lastUpdated: goal.updatedAt,
        estimatedCompletion: goal.deadline,
        progressType: 'goal',
        showDetails: true,
      }}
      onProgressChange={(newValue, previousValue) => {
        // 進捗変化をログに記録
        logProgressChange(goal.id, newValue, previousValue);
      }}
    />
  );
}
```

### エラー処理付きの進捗表示

```tsx
function RobustProgressBar({ progressData, onRetry }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <ProgressBar
      value={progressData?.value || 0}
      loading={loading}
      error={
        error
          ? {
              hasError: true,
              errorMessage: error.message,
              showRetry: true,
              onRetry: async () => {
                setLoading(true);
                setError(null);
                try {
                  await onRetry();
                } catch (err) {
                  setError(err);
                } finally {
                  setLoading(false);
                }
              },
            }
          : undefined
      }
    />
  );
}
```

## スタイリング

### カスタムCSSクラス

```tsx
<ProgressBar value={75} className="my-custom-progress-bar" />
```

```css
.my-custom-progress-bar {
  margin: 1rem 0;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### Tailwind CSSとの組み合わせ

```tsx
<ProgressBar value={75} className="mx-4 my-2 shadow-lg" />
```

## パフォーマンス最適化

### React.memoの使用

```tsx
import React, { memo } from 'react';

const OptimizedProgressBar = memo(ProgressBar, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.loading === nextProps.loading &&
    prevProps.error?.hasError === nextProps.error?.hasError
  );
});
```

### 大量データでの使用

```tsx
function ProgressList({ items }) {
  return (
    <div>
      {items.map(item => (
        <ProgressBar
          key={item.id}
          value={item.progress}
          animated={false} // 大量表示時はアニメーションを無効化
          showLabel={false} // ラベルを非表示にしてパフォーマンス向上
        />
      ))}
    </div>
  );
}
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. アニメーションが動作しない

```tsx
// アニメーション設定を確認
<ProgressBar
  value={75}
  animated={true} // アニメーションを有効化
/>
```

#### 2. ツールチップが表示されない

```tsx
// ツールチップの設定を確認
<ProgressBar
  value={75}
  tooltip="進捗情報"
  tooltipConfig={{
    position: 'top',
    delay: 0, // 遅延を短くする
  }}
/>
```

#### 3. 色が期待通りに表示されない

```tsx
// カラースキームの設定を確認
<ProgressBar
  value={75}
  colorScheme="default" // または適切なスキーム
  highContrast={false} // ハイコントラストモードを確認
/>
```

## ベストプラクティス

### 1. 適切なサイズの選択

- **small**: リスト項目や小さなカード内
- **medium**: 一般的な用途（デフォルト）
- **large**: 重要な進捗や大きな表示領域

### 2. アクセシビリティの考慮

- 常に`aria-label`を設定
- カラーブラインドネス対応を検討
- ハイコントラストモードをサポート

### 3. パフォーマンスの最適化

- 大量表示時はアニメーションを無効化
- 不要な再レンダリングを避ける
- 適切なメモ化を実装

### 4. エラーハンドリング

- エラー状態を適切に表示
- ユーザーに再試行の機会を提供
- ローディング状態を明確に示す

## 更新履歴

- v1.0.0: 基本機能実装
- v1.1.0: ツールチップ機能追加
- v1.2.0: アクセシビリティ対応強化
- v1.3.0: エラーハンドリング機能追加
- v1.4.0: カスタムカラースキーム対応
