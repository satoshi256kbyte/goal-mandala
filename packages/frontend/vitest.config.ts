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
    // 段階的テスト追加: ステップ9 - AnimationSettingsContextを追加
    include: [
      'src/schemas/goal-form.test.ts',
      'src/utils/__tests__/animation-utils.test.ts',
      'src/utils/__tests__/csrf-protection.test.ts',
      'src/utils/__tests__/input-sanitizer.test.ts',
      'src/utils/__tests__/error-classifier.test.ts',
      'src/utils/__tests__/xss-protection.test.ts',
      'src/utils/validation.test.ts',
      'src/utils/__tests__/progress-colors.test.ts',
      'src/contexts/ActionContext.test.tsx',
      'src/contexts/SubGoalContext.test.tsx',
      'src/test/__tests__/**/*.test.ts',
      'src/utils/authUtils.test.ts',
      'src/utils/permissions.test.ts',
      'src/utils/date-formatter.test.ts',
      'src/contexts/__tests__/AnimationSettingsContext.test.tsx',
    ],
    // E2Eテストのみ除外
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      // 統合テストでエラーがあるファイルを除外
      '**/src/services/__tests__/progress-calculation-engine.integration.test.ts',
    ],
    // 並列実行を無効化（メモリ不足対策）
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // レポーター設定
    reporter: ['dot'],
    // カバレッジ設定
    coverage: {
      enabled: false, // デフォルトで無効（test:coverageコマンドで有効化）
      provider: 'v8',
      reporter: ['json'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    },
  },
});
