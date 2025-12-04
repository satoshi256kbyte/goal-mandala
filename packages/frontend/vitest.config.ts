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
    testTimeout: 5000,
    hookTimeout: 3000,
    teardownTimeout: 2000,
    // 全ユニットテストを含める（統合テストとE2Eテストは除外）
    include: ['src/**/*.test.{ts,tsx}'],
    // 統合テストとE2Eテストを除外
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.integration.test.{ts,tsx}'],
    // 並列実行を完全に無効化（メモリ不足対策）
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // 各テストファイル後にワーカーを再起動（メモリ最適化）
        isolate: true,
        execArgv: ['--max-old-space-size=2048'],
      },
    },
    // レポーター設定
    reporter: ['dot'],
    // カバレッジ設定
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['json'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.integration.test.{ts,tsx}'],
    },
    // メモリ最適化: テストファイルを順次実行
    sequence: {
      shuffle: false,
    },
  },
});
