export default {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    // TypeScript関連のルール（@typescript-eslint/recommendedの主要ルールを手動で追加）
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/ban-ts-comment': 'error',
    '@typescript-eslint/ban-types': 'error',
    '@typescript-eslint/no-array-constructor': 'error',
    '@typescript-eslint/no-duplicate-enum-values': 'error',
    '@typescript-eslint/no-extra-non-null-assertion': 'error',
    '@typescript-eslint/no-misused-new': 'error',
    '@typescript-eslint/no-namespace': 'error',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
    '@typescript-eslint/no-this-alias': 'error',
    '@typescript-eslint/no-unnecessary-type-constraint': 'error',
    '@typescript-eslint/no-unsafe-declaration-merging': 'error',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/triple-slash-reference': 'error',

    // Import関連のルール
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-unresolved': 'off', // TypeScriptコンパイラに任せる

    // 一般的なJavaScript/TypeScriptルール
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-expressions': 'error',
    'no-duplicate-imports': 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'eol-last': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
  },
  overrides: [
    // React/Frontend固有の設定
    {
      files: ['packages/frontend/**/*.{ts,tsx}'],
      extends: [
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
      ],
      plugins: ['react', 'react-hooks', 'jsx-a11y'],
      settings: {
        react: {
          version: 'detect',
        },
      },
      rules: {
        'react/react-in-jsx-scope': 'off', // React 17+では不要
        'react/prop-types': 'off', // TypeScriptを使用するため
        'react/jsx-uses-react': 'off', // React 17+では不要
        'react/jsx-uses-vars': 'error',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'jsx-a11y/anchor-is-valid': 'warn',
        'jsx-a11y/click-events-have-key-events': 'warn',
        'jsx-a11y/no-static-element-interactions': 'warn',
      },
    },
    // Backend/Node.js固有の設定
    {
      files: ['packages/backend/**/*.ts'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off', // サーバーサイドではconsole.logを許可
        '@typescript-eslint/no-var-requires': 'off', // CommonJS requireを許可する場合
      },
    },
    // Infrastructure/CDK固有の設定
    {
      files: ['packages/infrastructure/**/*.ts'],
      env: {
        node: true,
        browser: false,
      },
      rules: {
        'no-console': 'off', // CDKスクリプトではconsole.logを許可
        '@typescript-eslint/no-var-requires': 'off',
        // CDK固有のルール調整
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_|^props$', // CDKのpropsパラメータを許可
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },
    // Shared package固有の設定
    {
      files: ['packages/shared/**/*.ts'],
      env: {
        node: true,
        browser: true, // 共通ライブラリは両方の環境で使用される可能性
      },
      rules: {
        // 共通ライブラリでは厳格なルールを適用
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': 'warn',
      },
    },
    // テストファイル固有の設定
    {
      files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // テストではanyを許可
        'no-console': 'off', // テストではconsole.logを許可
      },
    },
    // 設定ファイル固有の設定
    {
      files: [
        '*.config.{js,ts}',
        '*.config.*.{js,ts}',
        'vite.config.ts',
        'jest.config.ts',
        'turbo.json',
        '.eslintrc.js',
      ],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'build/',
    'coverage/',
    'node_modules/',
    '*.min.js',
    'cdk.out/',
    '.turbo/',
    '.next/',
    '.vite/',
    '*.d.ts',
  ],
};
