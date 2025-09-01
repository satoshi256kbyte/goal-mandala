module.exports = {
  root: true, // このディレクトリをESLintのルートとして設定
  env: { node: true, es2022: true },
  extends: [
    'eslint:recommended', // ルート設定の基本ルールを継承
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'cdk.out', '**/*.test.ts', 'node_modules'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // ルート設定のルールを継承
    'no-console': 'off',
    'no-unused-vars': 'off', // TypeScriptルールを優先
    // TypeScript固有のルール
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
  },
};
