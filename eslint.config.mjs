import jest from 'eslint-plugin-jest';
import node from '@zaiusinc/eslint-config-presets/node.mjs';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  ...node,
  {
    files: ['**/*.test.ts'],

    plugins: {
      jest,
    },

    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'jest/unbound-method': 'error',
    },
  },
  eslintConfigPrettier,
];
