'use strict';

/**
 * AIOI-P6.8 — SSR helper Shortcuts (test-only)
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const SHORTCUTS_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

/**
 * @param {{ storageAdapter?: object }} [options]
 */
async function bundleShortcutsProviderSsr(options = {}) {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveShortcutsSsrEntry.jsx');
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
  const mod = requireBundledModule(SHORTCUTS_ROOT, 'shortcuts', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const Provider = mod.ExecutiveShortcutsProvider;
  const props = {};
  if (options.storageAdapter) props.storageAdapter = options.storageAdapter;

  return renderToStaticMarkup(
    React.createElement(
      Provider,
      props,
      React.createElement('div', { 'data-testid': 'sc-child' }, 'Child')
    )
  );
}

module.exports = { bundleShortcutsProviderSsr };
