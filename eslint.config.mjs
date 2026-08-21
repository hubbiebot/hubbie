export default [
  {
    files: ['apps/**/*.js', 'packages/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly'
      }
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
