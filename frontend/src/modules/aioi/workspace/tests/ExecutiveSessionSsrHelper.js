'use strict';

/**
 * AIOI-P6.9 — SSR helper Session (test-only)
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const TESTS_ROOT = path.resolve(__dirname);
const SESSION_ROOT = path.resolve(__dirname, '../../session');

async function bundleSessionProviderSsr(options = {}) {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveSessionSsrEntry.jsx');
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
    plugins: [
      {
        name: 'css-stub',
        setup(build) {
          build.onLoad({ filter: /\.module\.css$/ }, () => ({
            contents: 'module.exports = new Proxy({}, { get: (_, k) => String(k) });',
            loader: 'js'
          }));
        }
      },
      {
        name: 'router-stub',
        setup(build) {
          build.onResolve({ filter: /^react-router-dom$/ }, () => ({
            path: path.join(TESTS_ROOT, '.router-stub.cjs'),
            namespace: 'router-stub'
          }));
          build.onLoad({ filter: /.*/, namespace: 'router-stub' }, () => ({
            contents: `
              const React = require('react');
              module.exports = {
                useLocation: () => ({ pathname: '/executive-portal/cockpit' }),
                MemoryRouter: ({ children }) => React.createElement(React.Fragment, null, children)
              };
            `,
            loader: 'js'
          }));
        }
      }
    ]
  });
  const { requireBundledModule } = require('../../tests/ssrTestBundleUtils.cjs');
  const mod = requireBundledModule(SESSION_ROOT, 'session', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const Provider = mod.ExecutiveSessionProvider;
  const props = {};
  if (options.storageAdapter) props.storageAdapter = options.storageAdapter;

  return renderToStaticMarkup(
    React.createElement(Provider, props, React.createElement('div', { 'data-testid': 'sess-child' }, 'Child'))
  );
}

module.exports = { bundleSessionProviderSsr };
