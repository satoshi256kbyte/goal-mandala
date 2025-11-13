import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // タイムアウト設定を調整（パフォーマンス改善）
    testTimeout: 10000,
    hookTimeout: 5000,
    teardownTimeout: 3000,
    // E2Eテストと統合テストを除外
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.spec.ts',
      '**/*.e2e.test.ts',
      '**/*.integration.test.{ts,tsx}',
      '**/test/integration/**',
    ],
    // 並列実行設定の最適化
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 2, // メモリ不足を防ぐため2に削減
        minThreads: 1,
      },
    },
    // メモリリーク対策
    logHeapUsage: true,
    // 並列実行数を増加（パフォーマンス改善）
    maxConcurrency: 10,
    // テスト間の分離を無効化（高速化）
    isolate: false,
    // レポーター設定を追加
    reporters: ['default'],
    // カバレッジ設定（デフォルトでは無効、--coverageフラグで有効化）
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/*.stories.{js,jsx,ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      // カバレッジ閾値を80%に設定
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@goal-mandala/shared': '../shared/src',
    },
  },
});
