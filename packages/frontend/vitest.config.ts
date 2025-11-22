import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@goal-mandala/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // テスト分離を有効化（安定性優先）
    isolate: true,
    // タイムアウト設定
    testTimeout: 10000,
    hookTimeout: 8000,
    teardownTimeout: 5000,
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
      // __tests__ディレクトリ内の統合テストとE2Eテストのみ除外
      '**/__tests__/**/*.integration.test.ts',
      '**/__tests__/**/*.integration.test.tsx',
      '**/__tests__/**/*.e2e.test.ts',
      '**/__tests__/**/*.e2e.test.tsx',
      'packages/frontend/src/test/integration/**',
      '**/*performance*.test.*',
      '**/*accessibility*.test.*',
      '**/*perf*.test.*',
      '**/*a11y*.test.*',
      '**/src/test/performance/**',
      '**/src/test/accessibility/**',
      '**/src/__tests__/performance/**',
      '**/src/__tests__/accessibility/**',
      '**/src/test/e2e/**',
      '**/src/__tests__/e2e/**',
    ],
    // 並列実行の制限
    maxConcurrency: 4,
    // レポーター設定
    reporter: ['dot'],
    // カバレッジ設定
    coverage: {
      enabled: false, // デフォルトで無効（test:coverageコマンドで有効化）
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/*.spec.ts',
        '**/*.e2e.test.ts',
        '**/*.integration.test.ts',
        '**/*.integration.test.tsx',
        '**/test/**',
        '**/src/test/**',
        '**/__tests__/**',
        '**/src/__tests__/**',
        '**/src/components/forms/**', // formsディレクトリを除外
        '**/*performance*.test.*',
        '**/*accessibility*.test.*',
        '**/*perf*.test.*',
        '**/*a11y*.test.*',
      ],
    },
  },
});
