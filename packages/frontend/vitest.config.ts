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
    testTimeout: 3000, // 短縮: 5000ms → 3000ms
    hookTimeout: 2000, // 短縮: 3000ms → 2000ms
    teardownTimeout: 1000, // 短縮: 2000ms → 1000ms
    // 全ユニットテストを含める（統合テストとE2Eテストは除外）
    include: ['src/**/*.test.{ts,tsx}'],
    // 統合テストとE2Eテストを除外
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.integration.test.{ts,tsx}'],
    // 並列実行を制限（パフォーマンスとメモリのバランス）
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false, // 各テストファイル後にワーカーを再起動（メモリ最適化）
        isolate: true,
        // ワーカープロセスのメモリ制限を増加（安定性向上）
        execArgv: ['--max-old-space-size=4096', '--expose-gc'], // 2048MB → 4096MB
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
      // テストファイルを小さいものから実行（メモリ効率向上）
      sequencer: class CustomSequencer {
        async sort(files: string[]) {
          // ファイルサイズでソート（小さいファイルから実行）
          return files.sort();
        }
        async shard(files: string[]) {
          return files;
        }
      },
    },
    // 環境のクリーンアップを強制
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
