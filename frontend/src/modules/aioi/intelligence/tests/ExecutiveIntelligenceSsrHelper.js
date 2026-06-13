'use strict';

/**
 * AIOI-P7.0 — SSR helper Intelligence (test-only)
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const INTELLIGENCE_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

async function bundleIntelligenceProviderSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveIntelligenceSsrEntry.jsx');
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
  const mod = requireBundledModule(INTELLIGENCE_ROOT, 'intelligence', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const Provider = mod.ExecutiveIntelligenceProvider;

  return renderToStaticMarkup(
    React.createElement(Provider, null, React.createElement('div', { 'data-testid': 'intel-child' }, 'Child'))
  );
}

module.exports = { bundleIntelligenceProviderSsr };
