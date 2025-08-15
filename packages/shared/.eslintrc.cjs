module.exports = {
  root: true,
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', '.eslintrc.cjs', '*.test.ts'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
