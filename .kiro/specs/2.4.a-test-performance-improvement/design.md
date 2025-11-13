# 設計ドキュメント

## 概要

フロントエンドテストの実行速度を改善し、60秒以内に完了させるための設計。

## アーキテクチャ

### 現在の問題点

1. **統合テストの混在**: ユニットテストと統合テストが混在し、すべて実行される
2. **カバレッジ計算のオーバーヘッド**: デフォルトでカバレッジが計算され、実行が遅い
3. **並列実行の非最適化**: スレッド数が適切に設定されていない
4. **大量の警告**: React act()やRouter警告が大量に出力される
5. **タイムアウト設定**: 一部のテストでタイムアウトが発生する

### 解決策

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Command Layer                        │
├─────────────────────────────────────────────────────────────┤
│  test:unit     │ test:integration │ test:fast │ test:coverage│
└────────┬────────┴──────────┬───────┴─────┬─────┴──────┬──────┘
         │                   │             │            │
         ▼                   ▼             ▼            ▼
┌────────────────┐  ┌────────────────┐  ┌──────────┐  ┌──────────┐
│  Unit Tests    │  │ Integration    │  │  Fast    │  │ Coverage │
│  (exclude      │  │ Tests          │  │  Mode    │  │  Mode    │
│  integration)  │  │  (only         │  │  (no     │  │  (full   │
│                │  │  integration)  │  │  coverage│  │  coverage│
└────────┬───────┘  └────────┬───────┘  └────┬─────┘  └────┬─────┘
         │                   │               │             │
         └───────────────────┴───────────────┴─────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Vitest Config │
                    │  Optimization  │
                    └────────────────┘
```

## コンポーネントと設計

### 1. Vitest設定の最適化

#### 1.1 テストファイルパターンの分離

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // ユニットテストのみ（デフォルト）
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/__tests__/**/*.test.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.spec.ts',
      '**/*.e2e.test.ts',
      '**/*.integration.test.{ts,tsx}', // 統合テストを除外
      '**/test/integration/**'
    ],
  }
});
```

#### 1.2 並列実行の最適化

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,  // CPU数に応じて調整
        minThreads: 1,
      },
    },
    maxConcurrency: 10,  // 5から10に増加
    isolate: false,  // テスト間の分離を無効化（高速化）
  }
});
```

#### 1.3 タイムアウト設定の最適化

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 10000,  // 5秒から10秒に増加
    hookTimeout: 5000,   // 3秒から5秒に増加
    teardownTimeout: 3000, // 2秒から3秒に増加
  }
});
```

#### 1.4 警告の抑制

```typescript
// src/test/setup.ts
import { configure } from '@testing-library/react';

// React Testing Libraryの設定
configure({
  // act()警告を抑制
  reactStrictMode: false,
});

// コンソール警告のフィルタリング
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  // React Router警告を抑制
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React Router Future Flag Warning') ||
     args[0].includes('act(...)'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  // npm警告を抑制
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Unknown user config')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};
```

### 2. package.jsonスクリプトの改善

```json
{
  "scripts": {
    "test": "vitest run --reporter=basic --no-coverage",
    "test:unit": "vitest run --reporter=basic --no-coverage",
    "test:integration": "vitest run --reporter=basic --no-coverage src/__tests__/integration src/test/integration",
    "test:fast": "vitest run --reporter=basic --no-coverage --isolate=false",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### 3. test-with-timeout.shスクリプトの改善

```bash
case "$package_name" in
    "frontend")
        # カバレッジなし、基本レポーター、分離なしで高速化
        run_with_timeout "cd $package_path && npx vitest run --reporter=basic --no-coverage --isolate=false" $TIMEOUT "frontend"
        ;;
esac
```

### 4. 統合テストの分離

#### 4.1 ファイル命名規則

- ユニットテスト: `*.test.ts`, `*.test.tsx`
- 統合テスト: `*.integration.test.ts`, `*.integration.test.tsx`
- E2Eテスト: `*.e2e.test.ts`, `*.spec.ts`

#### 4.2 ディレクトリ構造

```
src/
├── __tests__/
│   ├── unit/           # ユニットテスト
│   └── integration/    # 統合テスト
├── components/
│   └── __tests__/      # コンポーネントユニットテスト
└── test/
    ├── integration/    # 統合テストユーティリティ
    └── setup.ts        # テストセットアップ
```

## データモデル

### テスト実行メトリクス

```typescript
interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;  // ミリ秒
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}
```

## エラーハンドリング

### タイムアウトエラー

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    onConsoleLog(log: string, type: 'stdout' | 'stderr'): boolean {
      // タイムアウトエラーを検出
      if (log.includes('timeout') || log.includes('TIMEOUT')) {
        console.error('Test timeout detected:', log);
      }
      return true;
    },
  }
});
```

### メモリリーク対策

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    logHeapUsage: true,
    // テスト後のクリーンアップ
    setupFiles: ['./src/test/setup.ts'],
    globalSetup: ['./src/test/global-setup.ts'],
  }
});
```

## テスト戦略

### 1. 高速フィードバックループ

```
開発中 → test:fast (10-20秒)
  ↓
コミット前 → test:unit (30-40秒)
  ↓
PR作成 → test:coverage + test:integration (60-90秒)
  ↓
マージ前 → test:e2e (2-3分)
```

### 2. CI/CD統合

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:unit
  
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - run: pnpm test:integration
  
  coverage:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - run: pnpm test:coverage
```

## パフォーマンス目標

| テストタイプ | 現在 | 目標 | 改善率 |
|------------|------|------|--------|
| test:fast | 60秒+ | 15秒 | 75% |
| test:unit | 60秒+ | 30秒 | 50% |
| test:integration | N/A | 45秒 | N/A |
| test:coverage | 120秒+ | 60秒 | 50% |

## セキュリティ考慮事項

- テスト実行時の環境変数の適切な管理
- モックデータの機密情報除外
- テストレポートの機密情報フィルタリング

## 監視とログ

### テスト実行ログ

```typescript
// src/test/logger.ts
export const testLogger = {
  logTestStart: (testName: string) => {
    console.log(`[TEST START] ${testName}`);
  },
  logTestEnd: (testName: string, duration: number) => {
    console.log(`[TEST END] ${testName} (${duration}ms)`);
  },
  logTestError: (testName: string, error: Error) => {
    console.error(`[TEST ERROR] ${testName}:`, error);
  },
};
```

## 今後の拡張

1. **テストキャッシュ**: 変更されていないテストをスキップ
2. **並列実行の最適化**: ワーカー数の動的調整
3. **テストシャーディング**: 大規模テストの分散実行
4. **スマートテスト選択**: 変更されたコードに関連するテストのみ実行
