# 進捗表示機能パフォーマンステスト

このディレクトリには、進捗表示機能のパフォーマンステストが含まれています。

## テストファイル

### progress-display.performance.test.tsx

プログレスバーコンポーネントのパフォーマンステスト

- 大量データでの進捗計算パフォーマンス
- アニメーション処理のパフォーマンス
- メモリ使用量とレンダリング性能

### progress-history.performance.test.tsx

進捗履歴表示機能のパフォーマンステスト

- 大量履歴データでのチャート表示性能
- チャートインタラクション性能
- データ更新性能

## パフォーマンス要件

### プログレスバーコンポーネント

- **100個のプログレスバー**: 500ms以内でレンダリング
- **1000個のプログレスバー**: 2秒以内でレンダリング
- **進捗値一括更新**: 300ms以内で完了
- **アニメーション**: 60FPS以上で実行
- **メモリリーク**: 5MB以下の増加

### 進捗履歴表示

- **30日間の履歴**: 1秒以内でレンダリング
- **90日間の履歴**: 2秒以内でレンダリング
- **ツールチップ表示**: 100ms以内で実行
- **データ更新**: 200ms以内で反映
- **メモリリーク**: 10MB以下の増加

## テスト実行方法

### 個別実行

```bash
# 進捗表示コンポーネントのテスト
npx vitest --run src/test/performance/progress-display.performance.test.tsx

# 進捗履歴表示のテスト
npx vitest --run src/test/performance/progress-history.performance.test.tsx
```

### 一括実行

```bash
# パフォーマンステスト実行スクリプト
./scripts/performance-test.sh
```

### npm スクリプト

```bash
npm run test:performance
```

## テスト環境

### 必要な設定

- Node.js 18以上
- メモリ: 最低4GB推奨
- `global.gc`が利用可能な環境（`--expose-gc`フラグ）

### 環境変数

```bash
NODE_ENV=test
VITEST_PERFORMANCE_TEST=true
```

## パフォーマンス測定

### 測定項目

1. **レンダリング時間**: コンポーネントの初回レンダリング時間
2. **更新時間**: プロパティ変更時の再レンダリング時間
3. **アニメーション性能**: フレームレートとスムーズさ
4. **メモリ使用量**: ヒープメモリの使用量とリーク検出
5. **インタラクション応答性**: ユーザー操作への応答時間

### 測定ヘルパー

```typescript
// パフォーマンス測定
const measurePerformance = async (
  operation: () => Promise<void> | void
): Promise<number> => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

// メモリ使用量測定
const measureMemoryUsage = (): number => {
  if ((performance as any).memory?.usedJSHeapSize) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};
```

## トラブルシューティング

### よくある問題

#### メモリ測定ができない

```bash
# --expose-gc フラグを追加
node --expose-gc node_modules/.bin/vitest
```

#### ResizeObserver エラー

```typescript
// テストファイルでモックを設定
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

#### アニメーション測定の不安定性

```typescript
// フレーム時間の測定を安定化
await new Promise(resolve => setTimeout(resolve, 16.67)); // 60FPS相当
```

### パフォーマンス改善のヒント

#### React最適化

- `React.memo`でコンポーネントをメモ化
- `useMemo`で重い計算をキャッシュ
- `useCallback`でイベントハンドラーを最適化

#### アニメーション最適化

- CSS transformsを使用
- `will-change`プロパティで最適化ヒント
- アニメーション中断機能の実装

#### メモリ最適化

- 不要なイベントリスナーの削除
- 大量データの仮想化
- 適切なクリーンアップ処理

## CI/CD統合

### GitHub Actions

```yaml
- name: Run Performance Tests
  run: |
    npm run test:performance
    npm run test:performance:coverage
```

### パフォーマンス回帰検出

- ベースライン値との比較
- 閾値を超えた場合のアラート
- パフォーマンスレポートの生成

## 関連ドキュメント

- [テストガイド](../../../docs/testing-guide.md)
- [パフォーマンス最適化](../../../docs/performance-optimization.md)
- [アニメーション設計](../../../docs/animation-design.md)
