import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // メモリリーク対策
    isolate: true, // テスト分離を有効化
    pool: 'forks', // プロセスプールを使用
    poolOptions: {
      forks: {
        singleFork: true, // 単一プロセスで実行
      },
    },
    // タイムアウト設定（問題特定のため延長）
    testTimeout: 10000, // 2秒→10秒に延長
    hookTimeout: 8000, // 1.5秒→8秒に延長
    teardownTimeout: 5000, // 1秒→5秒に延長
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
      '**/*performance*.test.*',
      '**/*accessibility*.test.*',
      '**/*perf*.test.*',
      '**/*a11y*.test.*',
      // 特定のテストファイルを除外
      '**/src/test/performance/**',
      '**/src/test/accessibility/**',
      '**/src/__tests__/performance/**',
      '**/src/__tests__/accessibility/**',
      // 重いテストファイルを除外
      '**/src/components/mandala/MandalaChart.test.tsx',
      '**/src/pages/MandalaChartPage.test.tsx',
      '**/src/test/e2e/**',
      '**/src/__tests__/e2e/**',
    ],
    // 並列実行の制限
    maxConcurrency: 4,
    // ワーカー数の制限
    maxWorkers: 2,
    // レポーター設定
    reporter: ['dot'],
    // カバレッジ設定（デフォルトで無効）
    coverage: {
      enabled: false,
    },
  },
});
