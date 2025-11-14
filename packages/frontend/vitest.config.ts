import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // タイムアウト設定を短縮（高速化優先）
    testTimeout: 3000, // 5秒→3秒に短縮
    hookTimeout: 2000, // 3秒→2秒に短縮
    teardownTimeout: 1000, // 2秒→1秒に短縮
    // E2Eテストと統合テストを除外
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.spec.ts',
      '**/*.e2e.test.ts',
      '**/*.integration.test.ts',
      '**/*.integration.test.tsx',
      '**/test/integration/**',
      '**/src/test/integration/**',
      '**/src/__tests__/integration/**',
      '**/__tests__/**/*.integration.test.ts',
      '**/__tests__/**/*.integration.test.tsx',
    ],
    // 並列実行設定の最適化（メモリ効率優先）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 2, // 4→2に削減（メモリ効率優先）
        minForks: 1,
      },
    },
    // メモリリーク対策
    logHeapUsage: false,
    // 並列実行数を削減（メモリ効率優先）
    maxConcurrency: 4, // 8→4に削減
    // テスト分離を無効化（高速化優先）
    isolate: false, // true→falseに変更
    // テストファイルのキャッシュを有効化
    cache: {
      dir: 'node_modules/.vitest',
    },
    // レポーターを最小化（高速化優先）
    reporters: ['dot'], // basic→dotに変更
    // カバレッジをデフォルトで無効化
    coverage: {
      enabled: false, // デフォルトで無効化
      provider: 'v8',
      reporter: ['json'], // text→jsonのみに変更
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
