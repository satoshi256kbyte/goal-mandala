import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // タイムアウト設定（無限ループを防ぐため短縮）
    testTimeout: 2000, // 5秒→2秒に短縮
    hookTimeout: 1500, // 3秒→1.5秒に短縮
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
      // 統合テストディレクトリを完全に除外
      'packages/frontend/src/test/integration/**',
      // パフォーマンステストとアクセシビリティテストを除外
      '**/*performance*',
      '**/*accessibility*',
      '**/performance/**',
      '**/accessibility/**',
    ],
    // 統合テストを明示的に除外するincludeパターン
    include: [
      '**/*.test.{ts,tsx}',
      '!**/*.integration.test.{ts,tsx}',
      '!**/test/integration/**',
      '!**/*performance*',
      '!**/*accessibility*',
    ],
    // 並列実行設定の最適化（安定性優先）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // 単一フォークで実行
        maxForks: 1,
        minForks: 1,
      },
    },
    // メモリリーク対策
    logHeapUsage: false,
    // 並列実行数を1に固定
    maxConcurrency: 1,
    // テスト分離を無効化（高速化優先）
    isolate: false,
    // テストファイルのキャッシュを有効化
    cache: {
      dir: 'node_modules/.vitest',
    },
    // レポーターを最小化
    reporters: ['dot'],
    // カバレッジをデフォルトで無効化
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['json'],
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
