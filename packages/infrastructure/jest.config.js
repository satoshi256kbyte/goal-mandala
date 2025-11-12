/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    'src/index.test.ts',
    'src/constructs/ses-construct.test.ts',
    'src/workflows/ai-generation-workflow.test.ts',
    'src/constructs/lambda-construct.test.ts',
    'src/constructs/secrets-manager-integration.test.ts',
    'src/config/environment.test.ts',
    'src/stacks/ai-generation-stack.test.ts',
    'src/stacks/cognito-stack.integration.test.ts',
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts', // CDKアプリケーションエントリーポイントは除外
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // ファイル別の詳細な閾値設定
    './src/config/environment.ts': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    './src/constructs/database-construct.ts': {
      branches: 75,
      functions: 80,
      lines: 75,
      statements: 75,
    },
    './src/constructs/lambda-construct.ts': {
      branches: 75,
      functions: 80,
      lines: 75,
      statements: 75,
    },
  },
  moduleNameMapper: {
    '^@goal-mandala/shared/(.*)$': '<rootDir>/../shared/src/$1',
    '^@goal-mandala/shared$': '<rootDir>/../shared/src/index.ts',
  },
  // テスト実行時の設定
  verbose: true,
  testTimeout: 30000, // CDKテストは時間がかかる場合があるため
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  // 並列実行の設定
  maxWorkers: '50%',
  // キャッシュ設定
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  // エラー時の詳細表示
  errorOnDeprecated: true,
  // テスト結果の詳細表示
  collectCoverage: false, // デフォルトでは無効、--coverageオプションで有効化
};
