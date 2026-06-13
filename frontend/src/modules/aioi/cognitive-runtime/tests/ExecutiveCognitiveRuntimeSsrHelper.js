'use strict';

/**
 * AIOI-P8.0 — SSR helper Cognitive Runtime (test-only)
 */

const path = require('path');
const { createRequire } = require('module');

const RUNTIME_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

async function bundleCognitiveRuntimeProviderSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveCognitiveRuntimeSsrEntry.jsx');
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
  const mod = requireBundledModule(RUNTIME_ROOT, 'cognitive-runtime', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const ContractsProvider = mod.ExecutiveCapabilityContractsProvider;
  const InsightsProvider = mod.ExecutiveInsightsFoundationProvider;
  const RecommendationsProvider = mod.ExecutiveRecommendationsFoundationProvider;
  const AssistantProvider = mod.ExecutiveAssistantFoundationProvider;
  const RuntimeProvider = mod.ExecutiveCognitiveRuntimeProvider;

  return renderToStaticMarkup(
    React.createElement(
      ContractsProvider,
      null,
      React.createElement(
        InsightsProvider,
        null,
        React.createElement(
          RecommendationsProvider,
          null,
          React.createElement(
            AssistantProvider,
            null,
            React.createElement(
              RuntimeProvider,
              null,
              React.createElement('div', { 'data-testid': 'rt-child' }, 'Child')
            )
          )
        )
      )
    )
  );
}

module.exports = { bundleCognitiveRuntimeProviderSsr };
