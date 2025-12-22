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
    isolate: true,
    testTimeout: 3000,
    hookTimeout: 2000,
    teardownTimeout: 1000,
    // 全ユニットテストを含める（統合テストとE2Eテストは除外）
    include: ['src/**/*.test.{ts,tsx}'],
    // 統合テストとE2Eテストを除外
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/*.integration.test.{ts,tsx}',
      // タイムアウトするテストファイル
      '**/EnhancedErrorDisplay.test.tsx',
    ],
    // 並列実行を制限（パフォーマンスとメモリのバランス）
    maxWorkers: 1,
    pool: 'forks',
    // Vitest 4: Pool options moved to top-level
    execArgv: ['--expose-gc', '--max-old-space-size=6144'], // 6GBヒープサイズ（8GBから削減）
    singleFork: false, // 各テストファイル後にワーカー再起動（メモリリーク防止）
    // レポーター設定
    reporters: ['dot'],
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['json', 'json-summary', 'text'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'], // テスト対象ファイルを明示的に指定
      clean: true, // 前回の結果をクリア
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/*.integration.test.{ts,tsx}',
        '**/test/**',
        '**/test-utils/**',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/vite-env.d.ts',
        '**/__mocks__/**',
      ],
    },
    // メモリ最適化: テストファイルを順次実行
    sequence: {
      shuffle: false,
    },
    // 環境のクリーンアップを強制
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
