module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['packages/**', 'node_modules/**', 'dist/**', '.eslintrc.cjs'],
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn',
  },
};
