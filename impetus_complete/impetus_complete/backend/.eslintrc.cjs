/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
  },
  ignorePatterns: ['node_modules', 'scripts', '*.cjs']
};
