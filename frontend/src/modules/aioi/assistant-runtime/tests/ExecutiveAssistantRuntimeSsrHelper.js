'use strict';

/**
 * AIOI-P8.6 — SSR helper Assistant Runtime (test-only)
 */

const path = require('path');
const { createRequire } = require('module');

const ASSISTANT_RUNTIME_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

async function bundleAssistantRuntimeProviderSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveAssistantRuntimeSsrEntry.jsx');
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
  const mod = requireBundledModule(ASSISTANT_RUNTIME_ROOT, 'assistant-runtime', result.outputFiles[0].text);

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
  const RecommendationsRuntimeProvider = mod.ExecutiveRecommendationsRuntimeProvider;
  const AssistantRuntimeProvider = mod.ExecutiveAssistantRuntimeProvider;

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
                      React.createElement(
                        RecommendationsRuntimeProvider,
                        null,
                        React.createElement(
                          AssistantRuntimeProvider,
                          null,
                          React.createElement('div', { 'data-testid': 'assistant-runtime-child' }, 'Child')
                        )
                      )
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

module.exports = { bundleAssistantRuntimeProviderSsr };
