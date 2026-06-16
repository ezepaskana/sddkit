import js from '@eslint/js';

/**
 * Config base de ESLint (flat) para sddkit. Proyecto ESM puro sobre Node ≥ 18.
 * Pragmático: errores en bugs reales (variables no definidas, returns rotos),
 * advertencias en higiene (variables sin usar) para no frenar el desarrollo.
 */
export default [
  {
    ignores: ['node_modules/**', '**/__fixtures__/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        __dirname: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
];
