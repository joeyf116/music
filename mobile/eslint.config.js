// Expo's recommended rules (React, hooks, imports, TypeScript), plus a few that keep the code honest.
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/*', 'android/*', 'ios/*', '.expo/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'react-hooks/exhaustive-deps': 'error',
    },
  },
])
