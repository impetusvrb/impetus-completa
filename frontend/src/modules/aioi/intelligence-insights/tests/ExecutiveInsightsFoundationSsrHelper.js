'use strict';

/**
 * AIOI-P7.4 — SSR helper Insights Foundation (test-only)
 */

const path = require('path');
const { createRequire } = require('module');

const INSIGHTS_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

async function bundleInsightsFoundationProviderSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveInsightsFoundationSsrEntry.jsx');
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
  const mod = requireBundledModule(INSIGHTS_ROOT, 'insights-foundation', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const ContractsProvider = mod.ExecutiveCapabilityContractsProvider;
  const InsightsProvider = mod.ExecutiveInsightsFoundationProvider;

  return renderToStaticMarkup(
    React.createElement(
      ContractsProvider,
      null,
      React.createElement(
        InsightsProvider,
        null,
        React.createElement('div', { 'data-testid': 'ins-child' }, 'Child')
      )
    )
  );
}

module.exports = { bundleInsightsFoundationProviderSsr };
