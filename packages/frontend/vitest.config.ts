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
    // E2Eテストとspecファイルを除外
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts', '**/*.spec.tsx'],
    // 並列実行の制限
    maxConcurrency: 4,
    // レポーター設定
    reporter: ['dot'],
    // カバレッジ設定
    coverage: {
      enabled: false, // デフォルトで無効（test:coverageコマンドで有効化）
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts', '**/*.spec.tsx'],
    },
  },
});
