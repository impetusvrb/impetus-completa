'use strict';

/**
 * AIOI-P8.4 — SSR helper Insights Runtime (test-only)
 */

const path = require('path');
const { createRequire } = require('module');

const INSIGHTS_RUNTIME_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

async function bundleInsightsRuntimeProviderSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveInsightsRuntimeSsrEntry.jsx');
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
  const mod = requireBundledModule(INSIGHTS_RUNTIME_ROOT, 'insights-runtime', result.outputFiles[0].text);

  const req = createRequire(entry);
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const ContractsProvider = mod.ExecutiveCapabilityContractsProvider;
  const InsightsProvider = mod.ExecutiveInsightsFoundationProvider;
  const RecommendationsProvider = mod.ExecutiveRecommendationsFoundationProvider;
  const AssistantProvider = mod.ExecutiveAssistantFoundationProvider;
  const RuntimeProvider = mod.ExecutiveCognitiveRuntimeProvider;
  const GovernanceProvider = mod.ExecutiveRuntimeGovernanceProvider;
  const AuthorizationProvider = mod.ExecutiveRuntimeAuthorizationProvider;
  const AuditProvider = mod.ExecutiveRuntimeAuditProvider;
  const InsightsRuntimeProvider = mod.ExecutiveInsightsRuntimeProvider;

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
              React.createElement(
                GovernanceProvider,
                null,
                React.createElement(
                  AuthorizationProvider,
                  null,
                  React.createElement(
                    AuditProvider,
                    null,
                    React.createElement(
                      InsightsRuntimeProvider,
                      null,
                      React.createElement('div', { 'data-testid': 'insights-runtime-child' }, 'Child')
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}

module.exports = { bundleInsightsRuntimeProviderSsr };
