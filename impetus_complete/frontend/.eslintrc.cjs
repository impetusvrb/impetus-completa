/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['react', 'react-hooks'],
  settings: { react: { version: '18.2' } },
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off'
  },
  ignorePatterns: ['dist', 'node_modules', 'scripts', '*.cjs']
};
