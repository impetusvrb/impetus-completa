'use strict';

/**
 * AIOI-P6.4.1 — SSR helper com injeção de getters (test-only)
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');

/**
 * @param {{
 *   workspaceModelGetter?: () => object,
 *   workspaceHealthGetter?: () => object,
 *   childTestId?: string
 * }} [options]
 */
async function bundleProviderSsrWithInjection(options = {}) {
  const esbuild = require('esbuild');
  const entry = path.join(MODULE_ROOT, 'ExecutiveWorkspaceProvider.jsx');
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
  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const { requireBundledModule } = require('../../tests/ssrTestBundleUtils.cjs');
  const mod = requireBundledModule(MODULE_ROOT, 'workspace-inject', result.outputFiles[0].text);
  const Provider = mod.default || mod.ExecutiveWorkspaceProvider;
  const childId = options.childTestId || 'ws-child';
  const props = {};
  if (options.workspaceModelGetter) props.workspaceModelGetter = options.workspaceModelGetter;
  if (options.workspaceHealthGetter) props.workspaceHealthGetter = options.workspaceHealthGetter;
  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      props,
      React.createElement('div', { 'data-testid': childId }, 'Child')
    )
  );
  return html;
}

module.exports = { bundleProviderSsrWithInjection };
