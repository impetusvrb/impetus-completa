'use strict';

/**
 * AIOI-P6.7 — SSR helper Favorites (test-only)
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const FAVORITES_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

/**
 * @param {{ storageAdapter?: object }} [options]
 */
async function bundleFavoritesProviderSsr(options = {}) {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveFavoritesSsrEntry.jsx');
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    plugins: [
      {
        name: 'css-stub',
        setup(build) {
          build.onLoad({ filter: /\.module\.css$/ }, () => ({
            contents: 'module.exports = new Proxy({}, { get: (_, k) => String(k) });',
            loader: 'js'
          }));
        }
      }
    ]
  });
  const { requireBundledModule } = require('../../tests/ssrTestBundleUtils.cjs');
  const mod = requireBundledModule(FAVORITES_ROOT, 'favorites', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const Provider = mod.ExecutiveFavoritesProvider;
  const props = {};
  if (options.storageAdapter) props.storageAdapter = options.storageAdapter;

  return renderToStaticMarkup(
    React.createElement(
      Provider,
      props,
      React.createElement('div', { 'data-testid': 'fav-child' }, 'Child')
    )
  );
}

module.exports = { bundleFavoritesProviderSsr };
