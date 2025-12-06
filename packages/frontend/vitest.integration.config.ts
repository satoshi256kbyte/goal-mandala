import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // タイムアウト設定
    testTimeout: 10000, // 統合テストは少し長めに設定
    hookTimeout: 5000,
    teardownTimeout: 2000,
    // 統合テストのみを対象とする
    include: ['src/__tests__/integration/**/*.integration.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    // 並列実行設定
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
        maxForks: 2,
        minForks: 1,
        // メモリ制限を増加（安定性向上）
        execArgv: ['--max-old-space-size=4096', '--expose-gc'],
      },
    },
    maxConcurrency: 2, // 統合テストは並列数を抑える
    // レポーター設定
    reporters: ['dot'],
    // カバレッジは無効
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
