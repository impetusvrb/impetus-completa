'use strict';

/**
 * AIOI-P6.5 — SSR helper com Preferences + Workspace (test-only · single bundle)
 */

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const TESTS_ROOT = path.resolve(__dirname);
const MODULE_ROOT = path.resolve(__dirname, '..');

const cssStubPlugin = {
  name: 'css-stub',
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, () => ({
      contents: 'module.exports = new Proxy({}, { get: (_, k) => String(k) });',
      loader: 'js'
    }));
  }
};

/**
 * @param {{
 *   storageAdapter?: object,
 *   workspaceModelGetter?: () => object,
 *   workspaceHealthGetter?: () => object,
 *   childTestId?: string
 * }} [options]
 */
async function bundleWorkspaceWithPreferencesSsr(options = {}) {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveWorkspacePreferencesSsrEntry.jsx');
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    plugins: [cssStubPlugin]
  });
  const { requireBundledModule } = require('../../tests/ssrTestBundleUtils.cjs');
  const mod = requireBundledModule(MODULE_ROOT, 'prefs-ws-bundle', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');

  const PrefsProvider = mod.ExecutiveWorkspacePreferencesProvider;
  const WorkspaceProvider = mod.ExecutiveWorkspaceProvider;

  const childId = options.childTestId || 'ws-child';
  const prefsProps = {};
  if (options.storageAdapter) prefsProps.storageAdapter = options.storageAdapter;
  const wsProps = {};
  if (options.workspaceModelGetter) wsProps.workspaceModelGetter = options.workspaceModelGetter;
  if (options.workspaceHealthGetter) wsProps.workspaceHealthGetter = options.workspaceHealthGetter;

  return renderToStaticMarkup(
    React.createElement(
      PrefsProvider,
      prefsProps,
      React.createElement(
        WorkspaceProvider,
        wsProps,
        React.createElement('div', { 'data-testid': childId }, 'Child')
      )
    )
  );
}

module.exports = { bundleWorkspaceWithPreferencesSsr };
