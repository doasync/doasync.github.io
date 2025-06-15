/** @type import('@typescript-eslint/types').ParserOptions */
const parserOptions = {
  ecmaVersion: 2020,
  sourceType: 'module',
  project: './tsconfig.json',
  tsconfigRootDir: './',
};

/** @type import('eslint').Linter.Config */
const config = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions,
  env: {
    es2020: true,
    browser: true,
    node: true,
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: {
        paths: ['src'],
      },
    },
    react: {
      version: 'detect',
    },
  },
  plugins: ['effector'],
  extends: [
    // Base language configs
    'plugin:unicorn/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',

    // Style configs (order matters!)
    'xo-space', // Base XO with 2-space indent
    'xo-react/space', // XO React rules with 2-space
    // 'xo-typescript/space',     // DISABLED: Rule format incompatible with @typescript-eslint v7
    'airbnb', // Airbnb base rules
    'airbnb/hooks', // Airbnb React hooks rules
    'airbnb-typescript', // Airbnb TypeScript rules

    // Plugin-specific configs
    'plugin:effector/recommended',
    'plugin:effector/react',
    'plugin:effector/future',
    'plugin:effector/patronum',

    // Framework configs
    // 'next/core-web-vitals',    // DISABLED: Conflicts with airbnb/hooks and xo-react
    'next/typescript', // Next.js TypeScript rules

    // Prettier MUST be last to override formatting
    'prettier', // Modern prettier config (replaces prettier/*)
  ],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      plugins: ['simple-import-sort'],
      rules: {
        'sort-imports': 'off',
        'import/order': 'off',
        'simple-import-sort/imports': [
          'error',
          {
            groups: [
              // Side effect imports.
              ['^\\u0000'],
              // Packages
              ['^@?\\w'],
              // Absolute imports
              ['^[^.]'],
              // Features
              ['^@/\\w'],
              // Relative imports
              ['^\\.'],
            ],
          },
        ],
        'simple-import-sort/exports': 'error',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
      },
    },
    {
      files: ['src/**/*.tsx'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
    {
      files: [
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.mjs',
        '**/*.config.ts',
        'next.config.mjs',
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/app/**/error.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/not-found.tsx',
        'src/app/**/default.tsx',
        'src/app/**/template.tsx',
        'src/app/**/(auth)/*.tsx',
        'src/app/api/**/*.ts',
      ],
      rules: {
        'import/no-default-export': 'off',
      },
    },
  ],
  rules: {
    // React rules
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    'react/require-default-props': [
      'warn',
      {
        forbidDefaultForRequired: true,
        ignoreFunctionalComponents: true,
      },
    ],

    // Import rules
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        mjs: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          './*.js',
          './*.mjs',
          '**/*.config.js',
          '**/*.config.mjs',
          '**/*.config.ts',
          'src/**/*.test.js',
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
        ],
      },
    ],
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'error',

    // General rules
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'no-restricted-syntax': [
      'error',
      'LabeledStatement',
      'WithStatement',
      'SequenceExpression',
    ],
    'no-restricted-imports': ['error', { patterns: ['../*', '~/@/*'] }],

    // Unicorn rules
    'unicorn/prevent-abbreviations': [
      'error',
      {
        allowList: {
          args: true,
          ref: true,
          Ref: true,
          props: true,
          Props: true,
          dev: true,
          Dev: true,
          prod: true,
          Prod: true,
          env: true,
          Env: true,
          params: true,
          Params: true,
          param: true,
          Param: true,
          config: true,
          Config: true,
        },
      },
    ],
    'unicorn/no-null': 'off',

    // TypeScript rules
    '@typescript-eslint/comma-dangle': 'off',

    // Effector/Patronum rules
    'effector/no-patronum-debug': 'off', // TODO: Enable this rule when ready for production
    'effector/mandatory-scope-binding': 'off', // Disabled: Not using Fork API or SSR

    // Fix XO TypeScript config incompatibility
    '@typescript-eslint/no-restricted-imports': 'off', // Disable problematic rule from xo-typescript

    // Next.js specific rules (since we removed next/core-web-vitals)
    'react/react-in-jsx-scope': 'off', // Not needed in Next.js 13+ with App Router
    'react/jsx-uses-react': 'off', // Not needed in Next.js 13+ with App Router
    'react/jsx-props-no-spreading': 'off', // Disabled for now during development
    'no-console': 'off', // Allow console statements during development
    '@typescript-eslint/no-unsafe-assignment': 'off', // Suppressed for now
    '@typescript-eslint/no-unsafe-member-access': 'off', // Suppressed for now
  },
};

module.exports = config;
