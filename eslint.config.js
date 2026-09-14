import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // --- Ignored paths ---
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'backend/drizzle/**', 'docs/.astro/**'],
  },

  // --- Backend: Node + TypeScript ---
  {
    files: ['backend/src/**/*.ts', 'scripts/**/*.mjs', 'vitest.config.ts', 'drizzle.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // --- Frontend: Browser + React + TypeScript ---
  {
    files: ['frontend/src/**/*.{ts,tsx}', 'frontend/vite.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // not needed with react-jsx transform
      'react/prop-types': 'off', // TypeScript handles this
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // --- Prettier: must be last to disable conflicting style rules ---
  prettierConfig,
);
