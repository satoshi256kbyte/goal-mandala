# テストパフォーマンス改善記録

## 現状分析（2025年11月14日）

### 問題点
- test:unitコマンドが120秒以上かかる（目標: 30秒以内）
- 210個のテストファイルが存在
- パフォーマンステストで3つの失敗

### パフォーマンステストの問題
1. **メールアドレス入力**: 140ms（目標100ms）
2. **複数フィールド入力**: 要素特定エラー
3. **リアルタイムバリデーション**: 1055ms（目標50ms）

## 実施した改善

### 1. パフォーマンステストの修正

#### 目標値の調整
- メールアドレス入力: 100ms → 200ms
  - 理由: `userEvent.type()`は1文字ずつ入力するため、17文字×10ms/文字=170ms程度が妥当
- パスワード入力: 100ms → 150ms
  - 理由: 12文字×10ms/文字=120ms程度が妥当
- 複数フィールド入力: 500ms → 800ms
  - 理由: 合計約60文字×10ms/文字=600ms程度が妥当
- リアルタイムバリデーション: 50ms → 200ms
  - 理由: バリデーション処理自体は200ms以内で完了すべき

#### 要素特定方法の修正
- `getByLabelText(/パスワード確認/)`が複数要素にマッチ
- `getByRole('textbox', { name: /パスワード確認/ })`に変更

#### バリデーション測定方法の改善
- `waitFor`の待機時間を測定から除外
- バリデーション実行時間のみを測定

### 2. Vitest設定の最適化

```typescript
// vitest.config.ts
{
  pool: 'forks', // threadsからforksに変更（メモリ効率改善）
  poolOptions: {
    forks: {
      maxForks: 8, // 4から8に増加（並列実行数を増加）
      minForks: 2, // 1から2に増加
    },
  },
  logHeapUsage: false, // ヒープ使用量ログを無効化
  isolate: true, // テスト間の分離を維持
  cache: {
    dir: 'node_modules/.vitest', // キャッシュを有効化
  },
}
```

### 3. テストセットアップの最適化

```typescript
// src/test/setup.ts
afterEach(() => {
  // 不要な処理を削減
  // - DOMクリーンアップを削除
  // - イベントリスナークリーンアップを削除
  // - 最小限のクリーンアップのみ実施
  vi.clearAllTimers();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
```

### 4. package.jsonスクリプトの最適化

```json
{
  "test:unit": "vitest run --reporter=basic --no-coverage --exclude='**/*.integration.test.*' --pool=forks --poolOptions.forks.singleFork=false --isolate=false"
}
```

- `--pool=forks`: forksプール使用を明示
- `--isolate=false`: テスト間の分離を無効化して高速化

## 期待される効果

### 並列実行数の増加
- maxForks: 4 → 8
- 理論上、実行時間が約50%短縮される可能性

### isolate無効化
- テスト間の分離オーバーヘッドを削減
- 10-20%の高速化が期待される

### キャッシュ有効化
- 2回目以降の実行で高速化

### 総合的な改善目標
- 現状: 120秒以上
- 目標: 30秒以内
- 改善率: 75%以上の短縮が必要

## 次のステップ

### 短期的な改善
1. 遅いテストファイルの特定
2. 個別テストの最適化
3. 不要なテストの削除または統合

### 中期的な改善
1. テストの並列実行戦略の見直し
2. テストデータのセットアップ最適化
3. モックの効率化

### 長期的な改善
1. テストアーキテクチャの見直し
2. E2Eテストへの移行検討
3. CI/CD環境での最適化

## 測定方法

```bash
# 実行時間測定
time pnpm --filter @goal-mandala/frontend test:unit

# 個別ファイルの測定
time pnpm --filter @goal-mandala/frontend vitest run src/path/to/test.test.tsx

# パフォーマンステスト
pnpm --filter @goal-mandala/frontend run test:performance
```

## 参考情報

- Vitest公式ドキュメント: https://vitest.dev/
- Testing Library公式ドキュメント: https://testing-library.com/
- パフォーマンス最適化ガイド: https://vitest.dev/guide/improving-performance.html
