'use strict';

/**
 * AIOI-P7.3 — SSR helper Capability Contracts (test-only)
 */

const path = require('path');
const { createRequire } = require('module');

const CONTRACTS_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

async function bundleCapabilityContractsProviderSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveCapabilityContractsSsrEntry.jsx');
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
  const mod = requireBundledModule(CONTRACTS_ROOT, 'capability-contracts', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const Provider = mod.ExecutiveCapabilityContractsProvider;

  return renderToStaticMarkup(
    React.createElement(Provider, null, React.createElement('div', { 'data-testid': 'ctr-child' }, 'Child'))
  );
}

module.exports = { bundleCapabilityContractsProviderSsr };
