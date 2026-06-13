'use strict';

/**
 * AIOI-P8.3 — SSR helper Runtime Audit (test-only)
 */

const path = require('path');
const { createRequire } = require('module');

const AUDIT_ROOT = path.resolve(__dirname, '..');
const TESTS_ROOT = __dirname;

async function bundleRuntimeAuditProviderSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(TESTS_ROOT, 'ExecutiveRuntimeAuditSsrEntry.jsx');
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
  const mod = requireBundledModule(AUDIT_ROOT, 'runtime-audit', result.outputFiles[0].text);

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
                    React.createElement('div', { 'data-testid': 'audit-child' }, 'Child')
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

module.exports = { bundleRuntimeAuditProviderSsr };
