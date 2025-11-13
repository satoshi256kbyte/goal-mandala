import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * 統合テスト専用のVitest設定
 *
 * 使用方法:
 * - pnpm test:integration
 * - vitest --config vitest.integration.config.ts
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],

    // 統合テストは時間がかかるため、タイムアウトを長めに設定
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    // 統合テストのみを対象とする
    include: [
      '**/*.integration.test.{ts,tsx}',
      '**/test/integration/**/*.test.{ts,tsx}',
      '**/__tests__/integration/**/*.test.{ts,tsx}',
    ],

    // E2Eテストとユニットテストを除外
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts', '**/*.e2e.test.ts'],

    // 統合テストは並列実行を控えめに（データベースやAPIの競合を避ける）
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 2, // 統合テストは並列数を少なめに
        minThreads: 1,
      },
    },

    // 並列実行数を制限
    maxConcurrency: 5,

    // 統合テストは分離を有効化（データの整合性を保つ）
    isolate: true,

    // メモリリーク対策
    logHeapUsage: true,

    // レポーター設定
    reporters: ['default', 'verbose'],

    // カバレッジ設定（統合テストでは通常カバレッジを取らない）
    coverage: {
      enabled: false,
    },
  },
  resolve: {
    alias: {
      '@goal-mandala/shared': '../shared/src',
    },
  },
});
