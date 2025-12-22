# Vitest 4アップグレードガイド

## 概要

このドキュメントは、Vitest 1.0.0から4.0.16へのアップグレードに関する情報をまとめたものです。主要な変更点、破壊的変更とその対応方法、パフォーマンス改善の結果、実装で得られた学びを記載しています。

## アップグレード実施日

2025年12月22日

## バージョン情報

- **アップグレード前**: Vitest 1.0.0
- **アップグレード後**: Vitest 4.0.16
- **対象パッケージ**: `@goal-mandala/frontend`

## 主要な変更点

### 1. 設定ファイルの変更

Vitest 4では、設定ファイルの構造が大幅に変更されました。

#### 1.1 reporter → reporters

**変更内容**: `test.reporter`が`test.reporters`に変更されました。

**変更前**:
```typescript
export default defineConfig({
  test: {
    reporter: ['dot'],
  },
});
```

**変更後**:
```typescript
export default defineConfig({
  test: {
    reporters: ['dot'],
  },
});
```

#### 1.2 maxConcurrency → maxWorkers

**変更内容**: `test.maxConcurrency`が`test.maxWorkers`に変更されました。

**変更前**:
```typescript
export default defineConfig({
  test: {
    maxConcurrency: 1,
  },
});
```

**変更後**:
```typescript
export default defineConfig({
  test: {
    maxWorkers: 1,
  },
});
```

#### 1.3 Pool設定の移行

**変更内容**: `poolOptions`が廃止され、全ての設定がトップレベルに移動しました。

**変更前**:
```typescript
export default defineConfig({
  test: {
    poolOptions: {
      forks: {
        execArgv: ['--expose-gc', '--max-old-space-size=6144'],
        isolate: true,
        singleFork: false,
      },
    },
  },
});
```

**変更後**:
```typescript
export default defineConfig({
  test: {
    execArgv: ['--expose-gc', '--max-old-space-size=6144'],
    isolate: true,
    singleFork: false,
  },
});
```

#### 1.4 カバレッジ設定の変更

**変更内容**: `coverage.all`が廃止され、`coverage.include`を使用するようになりました。

**変更前**:
```typescript
export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        // ...
      ],
    },
  },
});
```

**変更後**:
```typescript
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        // ...
      ],
    },
  },
});
```

## 破壊的変更とその対応方法

### 1. poolOptionsの廃止

**問題**: Vitest 4では`poolOptions`が廃止され、非推奨警告が表示されます。

**エラーメッセージ**:
```
DEPRECATED  `test.poolOptions` was removed in Vitest 4. All previous `poolOptions` are now top-level options.
```

**対応方法**:

1. `poolOptions.forks.execArgv` → `test.execArgv`に移動
2. `poolOptions.forks.isolate` → `test.isolate`に移動
3. `poolOptions.forks.singleFork` → `test.singleFork`に移動

**修正例**:
```typescript
// 修正前
export default defineConfig({
  test: {
    poolOptions: {
      forks: {
        execArgv: ['--expose-gc', '--max-old-space-size=6144'],
        isolate: true,
        singleFork: false,
      },
    },
  },
});

// 修正後
export default defineConfig({
  test: {
    execArgv: ['--expose-gc', '--max-old-space-size=6144'],
    isolate: true,
    singleFork: false,
  },
});
```

### 2. coverage.allの廃止

**問題**: `coverage.all`が廃止され、`coverage.include`を使用する必要があります。

**対応方法**:

1. `coverage.all`を削除
2. `coverage.include`を追加し、テスト対象ファイルを明示的に指定

**修正例**:
```typescript
// 修正前
export default defineConfig({
  test: {
    coverage: {
      all: true,
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});

// 修正後
export default defineConfig({
  test: {
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  },
});
```

## パフォーマンス改善の結果

### テスト実行時間

| 項目 | Vitest 1 | Vitest 4 | 改善率 |
|------|----------|----------|--------|
| テスト実行時間 | 59.23秒 | 53.13秒 | **-10.3%** ✅ |
| メモリ使用量 | 安定 | 安定 | 同等 ✅ |
| 統合テスト | - | 3.57秒 | - ✅ |

**結果**: Vitest 4の方が約10%高速になりました。

### メモリ使用量

- テスト実行中のメモリ使用量は安定
- メモリリークやクラッシュは発生せず
- Vitest 4の設定（`maxWorkers: 1`, `isolate: true`, `execArgv: ['--expose-gc', '--max-old-space-size=6144']`）により、メモリ管理は適切

### 統合テスト

```
Test Files: 1 passed (1)
Tests: 5 passed (5)
Duration: 3.57秒
```

**結果**: 統合テストは全て成功しました。

## 後方互換性

### テストコード

- ✅ 既存のテストコードは変更なしで動作（98.4%成功率）
- ⚠️ 22テストが失敗（既存の問題、Vitest 4の問題ではない）
- ✅ テストユーティリティは変更なしで動作
- ✅ モック機能は変更なしで動作（一部のモック設定は要修正）

### テストユーティリティ

| 項目 | 状態 | 備考 |
|------|------|------|
| renderWithProviders | ✅ 正常 | 変更なしで動作 |
| renderHookWithProviders | ✅ 正常 | 変更なしで動作 |
| モック機能 | ✅ 正常 | vi.mock()、vi.mocked()が正常に動作 |
| プロパティベーステスト | ✅ 正常 | fast-checkが正常に動作 |
| テストユーティリティ | ✅ 正常 | mockData、mockApi、storage、waitが正常に動作 |

## 実装で得られた学び

### 1. 段階的なアップグレードの重要性

Vitest 4へのアップグレードは、以下の段階で実施しました：

1. **準備作業**: 現在の状態を記録し、バックアップを作成
2. **パッケージバージョン更新**: package.jsonを更新し、依存関係をインストール
3. **設定ファイルの更新**: vitest.config.tsを更新
4. **テスト実行の検証**: 全テストを実行し、成功率を確認
5. **パフォーマンス検証**: テスト実行時間とメモリ使用量を測定
6. **後方互換性の確認**: テストユーティリティの動作を確認

この段階的なアプローチにより、問題を早期に発見し、対処することができました。

### 2. 非推奨警告への対応

Vitest 4では、`poolOptions`が廃止され、非推奨警告が表示されました。この警告を無視せず、すぐに対応することで、将来的な問題を防ぐことができました。

**教訓**: 非推奨警告は無視せず、すぐに対応する。

### 3. テストの安定性の重要性

Vitest 4へのアップグレード前に、既存のテストが98.4%成功していたため、アップグレード後の問題を容易に特定できました。

**教訓**: アップグレード前にテストの安定性を確保する。

### 4. パフォーマンス測定の重要性

アップグレード前後でパフォーマンスを測定することで、改善効果を定量的に評価できました。

**教訓**: アップグレード前後でパフォーマンスを測定し、改善効果を確認する。

### 5. ドキュメントの重要性

アップグレード作業を通じて、以下のドキュメントを作成しました：

- `temp/vitest-1-baseline.md`: Vitest 1のベースライン測定結果
- `temp/vitest-4-performance.md`: Vitest 4のパフォーマンス測定結果
- `temp/vitest-4-test-utilities-verification.md`: テストユーティリティの動作確認結果

これらのドキュメントにより、アップグレード作業の記録を残し、将来的な参考資料とすることができました。

**教訓**: アップグレード作業の記録を残し、将来的な参考資料とする。

## トラブルシューティング

### 問題1: 非推奨警告が表示される

**症状**:
```
DEPRECATED  `test.poolOptions` was removed in Vitest 4.
```

**原因**: `poolOptions`が廃止されたため。

**解決方法**:
1. `poolOptions.forks.execArgv` → `test.execArgv`に移動
2. `poolOptions.forks.isolate` → `test.isolate`に移動
3. `poolOptions.forks.singleFork` → `test.singleFork`に移動

### 問題2: カバレッジが正しく測定されない

**症状**: カバレッジレポートが生成されない、または不正確。

**原因**: `coverage.all`が廃止されたため。

**解決方法**:
1. `coverage.all`を削除
2. `coverage.include`を追加し、テスト対象ファイルを明示的に指定

### 問題3: テストが失敗する

**症状**: Vitest 4にアップグレード後、一部のテストが失敗する。

**原因**: 既存のテストコードの問題（Vitest 4の問題ではない）。

**解決方法**:
1. テストコードを確認し、問題を特定
2. モック設定を修正
3. テストのセットアップを修正

## 推奨事項

### 1. 既存のテスト失敗の修正

現在、22テストが失敗しています（98.4%成功率）。これらは既存の問題であり、Vitest 4の問題ではありませんが、修正することを推奨します。

**主な失敗の原因**:
- LazyDeepLinkPageのモックエラー（約20テスト）
- BulkSelectionProviderのエラー（1テスト）
- AuthStateMonitorProviderのエラー（1テスト）

### 2. カバレッジ測定の再実施

全テストが成功した後に、カバレッジ測定を再実施することを推奨します。

### 3. CI/CD統合の検証

GitHub Actionsでの動作確認を実施することを推奨します。

## 参考資料

- [Vitest 4 Migration Guide](https://vitest.dev/guide/migration)
- [Vitest 4 Release Notes](https://github.com/vitest-dev/vitest/releases/tag/v4.0.0)
- `temp/vitest-1-baseline.md`: Vitest 1のベースライン測定結果
- `temp/vitest-4-performance.md`: Vitest 4のパフォーマンス測定結果
- `temp/vitest-4-test-utilities-verification.md`: テストユーティリティの動作確認結果

## まとめ

Vitest 4へのアップグレードは成功しました。パフォーマンスは約10%改善し、後方互換性も維持されています。既存のテスト失敗は、Vitest 4の問題ではなく、既存のテストコードの問題です。

### 主な成果

1. ✅ パフォーマンス改善: テスト実行時間が10.3%短縮
2. ✅ 後方互換性: 既存のテストコードは変更なしで動作
3. ✅ 設定ファイルの更新: 非推奨警告を解消
4. ✅ テストユーティリティの動作確認: 全て正常に動作

### 次のステップ

1. 既存のテスト失敗の修正（22テスト）
2. カバレッジ測定の再実施
3. CI/CD統合の検証

