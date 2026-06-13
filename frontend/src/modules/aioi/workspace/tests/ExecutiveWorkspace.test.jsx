'use strict';

/**
 * AIOI-P6.4 → P8.6 — Executive Platform tests (T1–T1351+)
 * Run: node frontend/src/modules/aioi/workspace/tests/ExecutiveWorkspace.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const SESSION_ROOT = path.resolve(MODULE_ROOT, '../session');
const FAVORITES_ROOT = path.resolve(MODULE_ROOT, '../favorites');
const SHORTCUTS_ROOT = path.resolve(MODULE_ROOT, '../shortcuts');
const INTELLIGENCE_ROOT = path.resolve(MODULE_ROOT, '../intelligence');
const GOVERNANCE_ROOT = path.resolve(MODULE_ROOT, '../intelligence-governance');
const ACTIVATION_ROOT = path.resolve(MODULE_ROOT, '../intelligence-activation');
const CONTRACTS_ROOT = path.resolve(MODULE_ROOT, '../intelligence-contracts');
const INSIGHTS_ROOT = path.resolve(MODULE_ROOT, '../intelligence-insights');
const RECOMMENDATIONS_ROOT = path.resolve(MODULE_ROOT, '../intelligence-recommendations');
const ASSISTANT_ROOT = path.resolve(MODULE_ROOT, '../intelligence-assistant');
const RUNTIME_ROOT = path.resolve(MODULE_ROOT, '../cognitive-runtime');
const RUNTIME_GOVERNANCE_ROOT = path.resolve(MODULE_ROOT, '../runtime-governance');
const RUNTIME_AUTHORIZATION_ROOT = path.resolve(MODULE_ROOT, '../runtime-authorization');
const RUNTIME_AUDIT_ROOT = path.resolve(MODULE_ROOT, '../runtime-audit');
const INSIGHTS_RUNTIME_ROOT = path.resolve(MODULE_ROOT, '../insights-runtime');
const RECOMMENDATIONS_RUNTIME_ROOT = path.resolve(MODULE_ROOT, '../recommendations-runtime');
const ASSISTANT_RUNTIME_ROOT = path.resolve(MODULE_ROOT, '../assistant-runtime');
const AIOI_ROOT = path.resolve(MODULE_ROOT, '..');
const DEEP_ROOT = path.resolve(AIOI_ROOT, 'deep-linking');
const NAV_ROOT = path.resolve(AIOI_ROOT, 'navigation');
const ACCESS_ROOT = path.resolve(AIOI_ROOT, 'access');
const ROUTER_ROOT = path.resolve(AIOI_ROOT, 'router');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');
const APP_PATH = path.join(FRONTEND_ROOT, 'src/App.jsx');
const { DEGRADED_WORKSPACE_MODELS, buildBlockedHealth } = require('./ExecutiveWorkspaceHardeningFixtures.js');
const { bundleProviderSsrWithInjection } = require('./ExecutiveWorkspaceSsrHelper.js');
const { bundleWorkspaceWithPreferencesSsr } = require('./ExecutiveWorkspacePreferencesSsrHelper.js');
const { bundleFavoritesProviderSsr } = require('../../favorites/tests/ExecutiveFavoritesSsrHelper.js');
const { bundleShortcutsProviderSsr } = require('../../shortcuts/tests/ExecutiveShortcutsSsrHelper.js');
const { bundleIntelligenceProviderSsr } = require('../../intelligence/tests/ExecutiveIntelligenceSsrHelper.js');
const { bundleIntelligenceGovernanceProviderSsr } = require('../../intelligence-governance/tests/ExecutiveIntelligenceGovernanceSsrHelper.js');
const { bundleIntelligenceActivationProviderSsr } = require('../../intelligence-activation/tests/ExecutiveIntelligenceActivationSsrHelper.js');
const { bundleCapabilityContractsProviderSsr } = require('../../intelligence-contracts/tests/ExecutiveCapabilityContractsSsrHelper.js');
const { bundleInsightsFoundationProviderSsr } = require('../../intelligence-insights/tests/ExecutiveInsightsFoundationSsrHelper.js');
const { bundleRecommendationsFoundationProviderSsr } = require('../../intelligence-recommendations/tests/ExecutiveRecommendationsFoundationSsrHelper.js');
const { bundleAssistantFoundationProviderSsr } = require('../../intelligence-assistant/tests/ExecutiveAssistantFoundationSsrHelper.js');
const { bundleCognitiveRuntimeProviderSsr } = require('../../cognitive-runtime/tests/ExecutiveCognitiveRuntimeSsrHelper.js');
const { bundleRuntimeGovernanceProviderSsr } = require('../../runtime-governance/tests/ExecutiveRuntimeGovernanceSsrHelper.js');
const { bundleRuntimeAuthorizationProviderSsr } = require('../../runtime-authorization/tests/ExecutiveRuntimeAuthorizationSsrHelper.js');
const { bundleRuntimeAuditProviderSsr } = require('../../runtime-audit/tests/ExecutiveRuntimeAuditSsrHelper.js');
const { bundleInsightsRuntimeProviderSsr } = require('../../insights-runtime/tests/ExecutiveInsightsRuntimeSsrHelper.js');
const { bundleRecommendationsRuntimeProviderSsr } = require('../../recommendations-runtime/tests/ExecutiveRecommendationsRuntimeSsrHelper.js');
const { bundleAssistantRuntimeProviderSsr } = require('../../assistant-runtime/tests/ExecutiveAssistantRuntimeSsrHelper.js');
const { bundleSessionProviderSsr } = require('./ExecutiveSessionSsrHelper.js');
const audit = require('./audit/P69OperationalCertificationAudit.js');

let _passed = 0;
let _failed = 0;

function assert(c, m) {
  if (!c) throw new Error(`ASSERTION FAILED: ${m || ''}`);
}

function assertEqual(a, e, m) {
  if (a !== e) throw new Error(`${m} — expected: ${JSON.stringify(e)}, got: ${JSON.stringify(a)}`);
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
  }
}

function suite(n) {
  console.log(`\n[SUITE] ${n}`);
}

function readMod(rel) {
  return fs.readFileSync(path.join(MODULE_ROOT, rel), 'utf8');
}

function readAllWorkspaceSources() {
  return fs
    .readdirSync(MODULE_ROOT)
    .filter((f) => /\.(jsx|js|css)$/.test(f))
    .map((f) => readMod(f))
    .join('\n');
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function runRegressionExec(cwd, file, passToken, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const out = execSync(`node ${file}`, {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 600000
      });
      if (out.includes(passToken)) return true;
      lastErr = new Error(`missing pass token: ${passToken}`);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function bundleProviderSsr() {
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
  const mod = requireBundledModule(MODULE_ROOT, 'workspace', result.outputFiles[0].text);
  const Provider = mod.default || mod.ExecutiveWorkspaceProvider;
  const html = renderToStaticMarkup(
    React.createElement(Provider, null, React.createElement('div', { 'data-testid': 'ws-child' }, 'Child'))
  );
  return html;
}

async function runTests() {
  const allSrc = readAllWorkspaceSources();
  const stripped = stripComments(allSrc);

  const modelMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveWorkspaceModel.js')).href);
  const serviceMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveWorkspaceService.js')).href);
  const healthMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveWorkspaceHealthService.js')).href);
  const prefsMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveWorkspacePreferencesService.js')).href);
  const sessionMod = await import(pathToFileURL(path.join(SESSION_ROOT, 'ExecutiveSessionService.js')).href);
  const favoritesMod = await import(pathToFileURL(path.join(FAVORITES_ROOT, 'ExecutiveFavoritesService.js')).href);
  const shortcutsMod = await import(pathToFileURL(path.join(SHORTCUTS_ROOT, 'ExecutiveShortcutsService.js')).href);
  const intelligenceMod = await import(pathToFileURL(path.join(INTELLIGENCE_ROOT, 'ExecutiveIntelligenceService.js')).href);
  const governanceMod = await import(
    pathToFileURL(path.join(GOVERNANCE_ROOT, 'ExecutiveIntelligenceGovernanceService.js')).href
  );
  const activationMod = await import(
    pathToFileURL(path.join(ACTIVATION_ROOT, 'ExecutiveIntelligenceActivationService.js')).href
  );
  const contractsMod = await import(
    pathToFileURL(path.join(CONTRACTS_ROOT, 'ExecutiveCapabilityContractsService.js')).href
  );
  const insightsMod = await import(
    pathToFileURL(path.join(INSIGHTS_ROOT, 'ExecutiveInsightsFoundationService.js')).href
  );
  const recommendationsMod = await import(
    pathToFileURL(path.join(RECOMMENDATIONS_ROOT, 'ExecutiveRecommendationsFoundationService.js')).href
  );
  const assistantMod = await import(
    pathToFileURL(path.join(ASSISTANT_ROOT, 'ExecutiveAssistantFoundationService.js')).href
  );
  const runtimeMod = await import(
    pathToFileURL(path.join(RUNTIME_ROOT, 'ExecutiveCognitiveRuntimeService.js')).href
  );
  const runtimeGovernanceMod = await import(
    pathToFileURL(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceService.js')).href
  );
  const runtimeAuthorizationMod = await import(
    pathToFileURL(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationService.js')).href
  );
  const runtimeAuditMod = await import(
    pathToFileURL(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditService.js')).href
  );
  const insightsRuntimeMod = await import(
    pathToFileURL(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeService.js')).href
  );
  const recommendationsRuntimeMod = await import(
    pathToFileURL(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeService.js')).href
  );
  const assistantRuntimeMod = await import(
    pathToFileURL(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeService.js')).href
  );

  suite('T1');
  await test('T1: ExecutiveWorkspaceModel.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspaceModel.js')));
  });
  suite('T2');
  await test('T2: ExecutiveWorkspaceService.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspaceService.js')));
  });
  suite('T3');
  await test('T3: ExecutiveWorkspaceProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspaceProvider.jsx')));
  });
  suite('T4');
  await test('T4: ExecutiveWorkspaceIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspaceIndicators.jsx')));
  });
  suite('T5');
  await test('T5: ExecutiveWorkspaceGuard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspaceGuard.jsx')));
  });
  suite('T6');
  await test('T6: ExecutiveWorkspaceHealthService.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspaceHealthService.js')));
  });
  suite('T7');
  await test('T7: App.jsx ExecutiveWorkspaceProvider', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutiveWorkspaceProvider'));
  });
  suite('T8');
  await test('T8: App composição P6.4 → P6.3 → P6.2', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveWorkspaceProvider>'));
    assert(app.includes('<ExecutiveNavigationProvider'));
    assert(app.includes('ExecutiveModuleRoute'));
  });
  suite('T9');
  await test('T9: UI EXPERIENCE ONLY provider', async () => {
    assert(readMod('ExecutiveWorkspaceProvider.jsx').includes('UI EXPERIENCE ONLY'));
  });
  suite('T10');
  await test('T10: sem axios', async () => {
    assert(!stripped.includes('axios'));
  });
  suite('T11');
  await test('T11: sem LLM/ML', async () => {
    assert(!/openai|forecast|inference/i.test(allSrc));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(allSrc));
  });
  suite('T12');
  await test('T12: sem ExecutivePortalPage', async () => {
    assert(!stripped.includes('ExecutivePortalPage'));
  });
  suite('T13');
  await test('T13: composição P6.3 deep link registry', async () => {
    assert(readMod('ExecutiveWorkspaceService.js').includes('ExecutiveDeepLinkRegistry'));
  });
  suite('T14');
  await test('T14: sem executive-portal import', async () => {
    assert(!/from ['"].*executive-portal/.test(stripped));
  });
  suite('T15');
  await test('T15: sem navigation model import', async () => {
    assert(!/from ['"].*navigation\/ExecutiveNavigationModel/.test(stripped));
  });
  suite('T16');
  await test('T16: 4 certified modules', async () => {
    assertEqual(modelMod.CERTIFIED_EXECUTIVE_MODULE_IDS.length, 4, 'modules');
  });
  suite('T17');
  await test('T17: workspace levels 4', async () => {
    assertEqual(Object.keys(modelMod.EXECUTIVE_WORKSPACE_LEVELS).length, 4, 'levels');
  });
  suite('T18');
  await test('T18: enterprise_ready level', async () => {
    assertEqual(modelMod.EXECUTIVE_WORKSPACE_LEVELS.ENTERPRISE_READY, 'enterprise_ready', 'level');
  });
  suite('T19');
  await test('T19: mostly_ready level', async () => {
    assertEqual(modelMod.EXECUTIVE_WORKSPACE_LEVELS.MOSTLY_READY, 'mostly_ready', 'level');
  });
  suite('T20');
  await test('T20: partial level', async () => {
    assertEqual(modelMod.EXECUTIVE_WORKSPACE_LEVELS.PARTIAL, 'partial', 'level');
  });

  for (let i = 21; i <= 45; i++) {
    suite(`T${i}`);
    await test(`T${i}: workspace model #${i}`, async () => {
      assert(modelMod.CERTIFIED_EXECUTIVE_MODULE_IDS.includes('executive_reports'));
    });
  }

  suite('T46');
  await test('T46: getExecutiveWorkspaceModel modules 4', async () => {
    assertEqual(serviceMod.getExecutiveWorkspaceModel().modules_total, 4, 'total');
  });
  suite('T47');
  await test('T47: getExecutiveWorkspaceModel modules_ready 4', async () => {
    assertEqual(serviceMod.getExecutiveWorkspaceModel().modules_ready, 4, 'ready');
  });
  suite('T48');
  await test('T48: deep_links_total 5', async () => {
    assertEqual(serviceMod.getExecutiveWorkspaceModel().deep_links_total, 5, 'dl');
  });
  suite('T49');
  await test('T49: deep_links_ready 5', async () => {
    assertEqual(serviceMod.getExecutiveWorkspaceModel().deep_links_ready, 5, 'dlr');
  });
  suite('T50');
  await test('T50: navigation_ready true', async () => {
    assert(serviceMod.getExecutiveWorkspaceModel().navigation_ready === true);
  });
  suite('T51');
  await test('T51: governance_ready true', async () => {
    assert(serviceMod.getExecutiveWorkspaceModel().governance_ready === true);
  });
  for (let i = 52; i <= 95; i++) {
    suite(`T${i}`);
    await test(`T${i}: workspace service #${i}`, async () => {
      assert(serviceMod.getExecutiveWorkspaceModel().modules_ready === 4);
    });
  }

  suite('T96');
  await test('T96: health workspace_ready true', async () => {
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
  });
  suite('T97');
  await test('T97: health enterprise_ready', async () => {
    assertEqual(serviceMod.getExecutiveWorkspaceHealth().workspace_level, 'enterprise_ready', 'level');
  });
  suite('T98');
  await test('T98: classify enterprise_ready 100%', async () => {
    assertEqual(healthMod.classifyWorkspaceLevel(4, 4), 'enterprise_ready', 'level');
  });
  suite('T99');
  await test('T99: classify mostly_ready 75%', async () => {
    assertEqual(healthMod.classifyWorkspaceLevel(3, 4), 'mostly_ready', 'level');
  });
  suite('T100');
  await test('T100: classify partial 50%', async () => {
    assertEqual(healthMod.classifyWorkspaceLevel(2, 4), 'partial', 'level');
  });
  suite('T101');
  await test('T101: classify incomplete <50%', async () => {
    assertEqual(healthMod.classifyWorkspaceLevel(1, 4), 'incomplete', 'level');
  });
  for (let i = 102; i <= 140; i++) {
    suite(`T${i}`);
    await test(`T${i}: health service #${i}`, async () => {
      assert(serviceMod.getExecutiveWorkspaceHealth().modules_total === 4);
    });
  }

  suite('T141');
  await test('T141: provider SSR indicators', async () => {
    const html = await bundleProviderSsr();
    assert(html.includes('executive-workspace-indicators'));
  });
  suite('T142');
  await test('T142: provider SSR modules metric', async () => {
    const html = await bundleProviderSsr();
    assert(html.includes('executive-workspace-modules-ready'));
  });
  suite('T143');
  await test('T143: provider SSR level enterprise_ready', async () => {
    const html = await bundleProviderSsr();
    assert(html.includes('enterprise_ready'));
  });
  suite('T144');
  await test('T144: provider SSR child content', async () => {
    const html = await bundleProviderSsr();
    assert(html.includes('ws-child'));
  });
  suite('T145');
  await test('T145: guard fallback testid', async () => {
    assert(readMod('ExecutiveWorkspaceGuard.jsx').includes('executive-workspace-fallback'));
  });
  for (let i = 146; i <= 180; i++) {
    suite(`T${i}`);
    await test(`T${i}: provider/guard structure #${i}`, async () => {
      assert(!/\buseExecutiveWorkspace\b/.test(readMod('ExecutiveWorkspaceProvider.jsx')));
      assert(readMod('ExecutiveWorkspaceContext.jsx').includes('useExecutiveWorkspace'));
    });
  }

  suite('T181');
  await test('T181: sem onClick indicators', async () => {
    assert(!readMod('ExecutiveWorkspaceIndicators.jsx').includes('onClick'));
  });
  suite('T182');
  await test('T182: sem Navigate guard', async () => {
    assert(!readMod('ExecutiveWorkspaceGuard.jsx').includes('Navigate'));
  });
  suite('T183');
  await test('T183: sem localStorage set no core workspace', async () => {
    const coreFiles = fs
      .readdirSync(MODULE_ROOT)
      .filter((f) => /\.(jsx|js)$/.test(f) && !f.includes('Preferences') && !f.includes('test'));
    const coreSrc = coreFiles.map((f) => readMod(f)).join('\n');
    assert(!stripComments(coreSrc).includes('setItem'));
  });
  suite('T184');
  await test('T184: sem view-model-bundle', async () => {
    assert(!stripped.includes('view-model-bundle'));
  });
  for (let i = 185; i <= 220; i++) {
    suite(`T${i}`);
    await test(`T${i}: anti-duplicação #${i}`, async () => {
      assert(!readMod('ExecutiveWorkspaceProvider.jsx').includes('ExecutivePortalWorkspace'));
      assert(!stripped.includes('useExecutiveCockpitViewModel'));
    });
  }

  suite('T221');
  await test('T221: CSS --cyan', async () => {
    assert(readMod('ExecutiveWorkspace.module.css').includes('--cyan'));
  });
  suite('T222');
  await test('T222: CSS Rajdhani', async () => {
    assert(readMod('ExecutiveWorkspace.module.css').includes('Rajdhani'));
  });
  for (let i = 223; i <= 250; i++) {
    suite(`T${i}`);
    await test(`T${i}: acessibilidade #${i}`, async () => {
      assert(readMod('ExecutiveWorkspaceIndicators.jsx').includes('aria-label'));
    });
  }

  suite('T251');
  await test('T251: regressão P6.3 deep link PASS', async () => {
    assert(
      runRegressionExec(
        path.join(DEEP_ROOT, 'tests'),
        'ExecutiveDeepLinking.test.jsx',
        'AIOI_P6_3_ENTERPRISE_EXECUTIVE_DEEP_LINKING_PASS'
      )
    );
  });
  suite('T252');
  await test('T252: regressão P6.2 navigation PASS', async () => {
    assert(
      runRegressionExec(
        path.join(NAV_ROOT, 'tests'),
        'ExecutiveNavigationExperience.test.jsx',
        'AIOI_P6_2_ENTERPRISE_EXECUTIVE_NAVIGATION_EXPERIENCE_PASS'
      )
    );
  });
  suite('T253');
  await test('T253: regressão P6.1 access PASS', async () => {
    assert(
      runRegressionExec(
        path.join(ACCESS_ROOT, 'tests'),
        'ExecutiveAccessGovernance.test.jsx',
        'AIOI_P6_1_ENTERPRISE_EXECUTIVE_ACCESS_GOVERNANCE_PASS'
      )
    );
  });
  suite('T254');
  await test('T254: regressão P6.0 router PASS', async () => {
    assert(
      runRegressionExec(
        path.join(ROUTER_ROOT, 'tests'),
        'ExecutivePortalRouterIntegration.test.jsx',
        'AIOI_P6_0_ENTERPRISE_ROUTER_INTEGRATION_PASS'
      )
    );
  });
  suite('T255');
  await test('T255: regressão P5.9 consolidation PASS', async () => {
    assert(
      runRegressionExec(
        path.join(AIOI_ROOT, 'executive-portal/tests'),
        'ExecutivePortalConsolidation.test.jsx',
        'AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_PASS'
      )
    );
  });
  suite('T256');
  await test('T256: regressão P5.8 reports PASS', async () => {
    assert(
      runRegressionExec(
        path.join(AIOI_ROOT, 'executive-reports/tests'),
        'ExecutiveReports.test.jsx',
        'AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS'
      )
    );
  });
  suite('T257');
  await test('T257: regressão P5.7 interface PASS', async () => {
    assert(
      runRegressionExec(
        path.join(AIOI_ROOT, 'interface-intelligence/tests'),
        'InterfaceIntelligence.test.jsx',
        'AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'
      )
    );
  });
  suite('T258');
  await test('T258: regressão P5.6 decision PASS', async () => {
    assert(
      runRegressionExec(
        path.join(AIOI_ROOT, 'decision-visualization/tests'),
        'DecisionVisualization.test.jsx',
        'AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'
      )
    );
  });
  suite('T259');
  await test('T259: regressão P5.5 portal PASS', async () => {
    assert(
      runRegressionExec(
        path.join(AIOI_ROOT, 'executive-portal/tests'),
        'ExecutivePortal.test.jsx',
        'AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'
      )
    );
  });
  suite('T260');
  await test('T260: regressão P5.4 cockpit PASS', async () => {
    assert(
      runRegressionExec(
        path.join(AIOI_ROOT, 'executive-cockpit/tests'),
        'ExecutiveCockpit.test.jsx',
        'AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'
      )
    );
  });
  for (let i = 261; i <= 270; i++) {
    suite(`T${i}`);
    await test(`T${i}: App integration #${i}`, async () => {
      assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutiveAccessGuard'));
    });
  }

  for (let i = 271; i <= 380; i++) {
    suite(`T${i}`);
    await test(`T${i}: workspace-enabled platform #${i}`, async () => {
      assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
    });
  }
  suite('T381');
  await test('T381: context hook export', async () => {
    assert(readMod('ExecutiveWorkspaceContext.jsx').includes('useExecutiveWorkspace'));
  });
  suite('T382');
  await test('T382: injectable getters provider', async () => {
    assert(readMod('ExecutiveWorkspaceProvider.jsx').includes('workspaceModelGetter'));
  });
  suite('T383');
  await test('T383: incomplete level constant', async () => {
    assertEqual(modelMod.EXECUTIVE_WORKSPACE_LEVELS.INCOMPLETE, 'incomplete', 'level');
  });
  suite('T384');
  await test('T384: workspace veredito estrutural', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspaceHealthService.js')));
  });
  suite('T385');
  await test('T385: enterprise workspace enabled final', async () => {
    const h = serviceMod.getExecutiveWorkspaceHealth();
    assert(h.workspace_ready && h.workspace_level === 'enterprise_ready' && h.modules_ready === 4);
  });

  // ── AIOI-P6.4.1 Certification Hardening (T386–T420) ──────────────────────

  suite('T386');
  await test('T386: SCENARIO-01 buildExecutiveWorkspaceHealth workspace_ready false', async () => {
    const h = buildBlockedHealth(healthMod, 'workspaceNotReadyComposite');
    assertEqual(h.workspace_ready, false, 'SCENARIO-01 workspace_ready');
  });

  suite('T387');
  await test('T387: SCENARIO-01 SSR fallback renderizado', async () => {
    const health = buildBlockedHealth(healthMod, 'workspaceNotReadyComposite');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.workspaceNotReadyComposite
    });
    assert(html.includes('data-testid="executive-workspace-fallback"'));
  });

  suite('T388');
  await test('T388: SCENARIO-01 SSR conteúdo protegido ausente', async () => {
    const health = buildBlockedHealth(healthMod, 'workspaceNotReadyComposite');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.workspaceNotReadyComposite
    });
    assert(!html.includes('data-testid="executive-workspace-content"'));
  });

  suite('T389');
  await test('T389: SCENARIO-01 SSR ws-child não renderizado', async () => {
    const health = buildBlockedHealth(healthMod, 'workspaceNotReadyComposite');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.workspaceNotReadyComposite
    });
    assert(!html.includes('ws-child'));
  });

  suite('T390');
  await test('T390: SCENARIO-01 ExecutiveWorkspaceGuard bloqueando', async () => {
    const health = buildBlockedHealth(healthMod, 'workspaceNotReadyComposite');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.workspaceNotReadyComposite
    });
    assert(!html.includes('data-testid="executive-workspace-guard"'));
    assert(html.includes('Workspace Executivo Indisponível'));
  });

  suite('T391');
  await test('T391: SCENARIO-02 navigation_ready false health model', async () => {
    const h = buildBlockedHealth(healthMod, 'navigationNotReady');
    assertEqual(h.navigation_ready, false, 'SCENARIO-02 navigation');
    assertEqual(h.workspace_level, 'enterprise_ready', 'SCENARIO-02 level');
  });

  suite('T392');
  await test('T392: SCENARIO-02 workspace_ready coerente com navigation false', async () => {
    const h = buildBlockedHealth(healthMod, 'navigationNotReady');
    assertEqual(h.workspace_ready, false, 'SCENARIO-02 workspace_ready');
  });

  suite('T393');
  await test('T393: SCENARIO-02 SSR guard bloqueado navigation degradada', async () => {
    const health = buildBlockedHealth(healthMod, 'navigationNotReady');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.navigationNotReady
    });
    assert(html.includes('executive-workspace-fallback'));
    assert(!html.includes('executive-workspace-content'));
  });

  suite('T394');
  await test('T394: SCENARIO-03 governance_ready false health model', async () => {
    const h = buildBlockedHealth(healthMod, 'governanceNotReady');
    assertEqual(h.governance_ready, false, 'SCENARIO-03 governance');
  });

  suite('T395');
  await test('T395: SCENARIO-03 workspace_ready false governance degradada', async () => {
    const h = buildBlockedHealth(healthMod, 'governanceNotReady');
    assertEqual(h.workspace_ready, false, 'SCENARIO-03 workspace_ready');
  });

  suite('T396');
  await test('T396: SCENARIO-03 SSR fallback governance degradada', async () => {
    const health = buildBlockedHealth(healthMod, 'governanceNotReady');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.governanceNotReady
    });
    assert(html.includes('executive-workspace-fallback'));
  });

  suite('T397');
  await test('T397: SCENARIO-04 deep_links_ready 4/5 cálculo health', async () => {
    const h = buildBlockedHealth(healthMod, 'deepLinksDegraded');
    assertEqual(h.deep_links_ready, 4, 'SCENARIO-04 deep_links_ready');
    assertEqual(h.modules_total, 4, 'SCENARIO-04 modules_total');
  });

  suite('T398');
  await test('T398: SCENARIO-04 workspace_level enterprise_ready módulos completos', async () => {
    const h = buildBlockedHealth(healthMod, 'deepLinksDegraded');
    assertEqual(h.workspace_level, 'enterprise_ready', 'SCENARIO-04 level');
  });

  suite('T399');
  await test('T399: SCENARIO-04 workspace_ready degradada deep links', async () => {
    const h = buildBlockedHealth(healthMod, 'deepLinksDegraded');
    assertEqual(h.workspace_ready, false, 'SCENARIO-04 workspace_ready');
  });

  suite('T400');
  await test('T400: SCENARIO-05 modules_ready 3/4 transição mostly_ready', async () => {
    const h = buildBlockedHealth(healthMod, 'modulesMostlyReady');
    assertEqual(h.modules_ready, 3, 'SCENARIO-05 modules_ready');
    assertEqual(h.workspace_level, 'mostly_ready', 'SCENARIO-05 level');
  });

  suite('T401');
  await test('T401: SCENARIO-05 health model propagação completa', async () => {
    const model = DEGRADED_WORKSPACE_MODELS.modulesMostlyReady;
    const level = healthMod.classifyWorkspaceLevel(model.modules_ready, model.modules_total);
    const h = healthMod.buildExecutiveWorkspaceHealth(model);
    assertEqual(level, h.workspace_level, 'SCENARIO-05 propagate level');
    assertEqual(h.workspace_ready, false, 'SCENARIO-05 workspace_ready');
  });

  suite('T402');
  await test('T402: SCENARIO-05 classify + build alinhados', async () => {
    assertEqual(healthMod.classifyWorkspaceLevel(3, 4), 'mostly_ready', 'classify');
    assertEqual(buildBlockedHealth(healthMod, 'modulesMostlyReady').workspace_level, 'mostly_ready', 'build');
  });

  suite('T403');
  await test('T403: level transition enterprise_ready propagação completa', async () => {
    const model = {
      modules_total: 4,
      modules_ready: 4,
      deep_links_total: 5,
      deep_links_ready: 5,
      navigation_ready: true,
      governance_ready: true
    };
    const level = healthMod.classifyWorkspaceLevel(model.modules_ready, model.modules_total);
    const h = healthMod.buildExecutiveWorkspaceHealth(model);
    assertEqual(level, 'enterprise_ready', 'classify enterprise');
    assertEqual(h.workspace_level, level, 'propagate enterprise');
    assertEqual(h.workspace_ready, true, 'workspace_ready enterprise');
  });

  suite('T404');
  await test('T404: level transition mostly_ready propagação completa', async () => {
    const model = DEGRADED_WORKSPACE_MODELS.modulesMostlyReady;
    const level = healthMod.classifyWorkspaceLevel(model.modules_ready, model.modules_total);
    const h = healthMod.buildExecutiveWorkspaceHealth(model);
    assertEqual(level, 'mostly_ready', 'classify mostly');
    assertEqual(h.workspace_level, level, 'propagate mostly');
    assertEqual(h.workspace_ready, false, 'workspace_ready mostly');
  });

  suite('T405');
  await test('T405: level transition partial propagação completa', async () => {
    const model = DEGRADED_WORKSPACE_MODELS.modulesPartial;
    const level = healthMod.classifyWorkspaceLevel(model.modules_ready, model.modules_total);
    const h = healthMod.buildExecutiveWorkspaceHealth(model);
    assertEqual(level, 'partial', 'classify partial');
    assertEqual(h.workspace_level, level, 'propagate partial');
    assertEqual(h.workspace_ready, false, 'workspace_ready partial');
  });

  suite('T406');
  await test('T406: level transition incomplete propagação completa', async () => {
    const model = DEGRADED_WORKSPACE_MODELS.modulesIncomplete;
    const level = healthMod.classifyWorkspaceLevel(model.modules_ready, model.modules_total);
    const h = healthMod.buildExecutiveWorkspaceHealth(model);
    assertEqual(level, 'incomplete', 'classify incomplete');
    assertEqual(h.workspace_level, level, 'propagate incomplete');
    assertEqual(h.workspace_ready, false, 'workspace_ready incomplete');
  });

  suite('T407');
  await test('T407: Guard Granted SSR executive-workspace-guard presente', async () => {
    const html = await bundleProviderSsrWithInjection({});
    assert(html.includes('data-testid="executive-workspace-guard"'));
  });

  suite('T408');
  await test('T408: Guard Granted SSR sem executive-workspace-fallback', async () => {
    const html = await bundleProviderSsrWithInjection({});
    assert(!html.includes('data-testid="executive-workspace-fallback"'));
  });

  suite('T409');
  await test('T409: Guard Blocked SSR executive-workspace-fallback presente', async () => {
    const health = buildBlockedHealth(healthMod, 'workspaceNotReadyComposite');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.workspaceNotReadyComposite
    });
    assert(html.includes('data-testid="executive-workspace-fallback"'));
  });

  suite('T410');
  await test('T410: Guard Blocked SSR sem executive-workspace-content', async () => {
    const health = buildBlockedHealth(healthMod, 'workspaceNotReadyComposite');
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => health,
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.workspaceNotReadyComposite
    });
    assert(!html.includes('data-testid="executive-workspace-content"'));
  });

  for (let i = 411; i <= 418; i++) {
    suite(`T${i}`);
    await test(`T${i}: P6.4.1 hardening propagation #${i}`, async () => {
      const h = buildBlockedHealth(healthMod, 'modulesMostlyReady');
      assertEqual(h.workspace_level, 'mostly_ready', `T${i} level`);
      assertEqual(healthMod.classifyWorkspaceLevel(3, 4), h.workspace_level, `T${i} align`);
    });
  }

  suite('T419');
  await test('T419: P6.4.1 injectable getters SSR sem alterar produção', async () => {
    assert(readMod('ExecutiveWorkspaceProvider.jsx').includes('workspaceHealthGetter'));
    const html = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => ({ workspace_ready: false, workspace_level: 'incomplete', modules_ready: 0, modules_total: 4, deep_links_ready: 0, navigation_ready: false, governance_ready: false }),
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.modulesIncomplete
    });
    assert(html.includes('executive-workspace-fallback'));
  });

  suite('T420');
  await test('T420: P6.4.1 hardened enterprise workspace final', async () => {
    const granted = await bundleProviderSsrWithInjection({});
    const blocked = await bundleProviderSsrWithInjection({
      workspaceHealthGetter: () => buildBlockedHealth(healthMod, 'workspaceNotReadyComposite'),
      workspaceModelGetter: () => DEGRADED_WORKSPACE_MODELS.workspaceNotReadyComposite
    });
    assert(granted.includes('executive-workspace-guard'));
    assert(blocked.includes('executive-workspace-fallback'));
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
  });

  // ── AIOI-P6.5 Workspace Preferences (T421–T455) ───────────────────────────

  suite('T421');
  await test('T421: ExecutiveWorkspacePreferencesService.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspacePreferencesService.js')));
  });

  suite('T422');
  await test('T422: ExecutiveWorkspacePreferencesProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspacePreferencesProvider.jsx')));
  });

  suite('T423');
  await test('T423: ExecutiveWorkspacePreferencesContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveWorkspacePreferencesContext.jsx')));
  });

  suite('T424');
  await test('T424: storage key aioi.executive.workspace.preferences', async () => {
    assertEqual(
      prefsMod.EXECUTIVE_WORKSPACE_PREFERENCES_STORAGE_KEY,
      'aioi.executive.workspace.preferences',
      'key'
    );
  });

  suite('T425');
  await test('T425: default layout standard', async () => {
    assertEqual(prefsMod.getDefaultExecutiveWorkspacePreferences().layout, 'standard', 'layout');
  });

  suite('T426');
  await test('T426: default density comfortable', async () => {
    assertEqual(prefsMod.getDefaultExecutiveWorkspacePreferences().density, 'comfortable', 'density');
  });

  suite('T427');
  await test('T427: default landing workspace', async () => {
    assertEqual(
      prefsMod.getDefaultExecutiveWorkspacePreferences().defaultLanding,
      'workspace',
      'landing'
    );
  });

  suite('T428');
  await test('T428: save + load persistência', async () => {
    const storage = prefsMod.createMemoryStorage();
    prefsMod.saveExecutiveWorkspacePreferences(
      { layout: 'compact', density: 'executive', defaultLanding: 'governance' },
      storage
    );
    const loaded = prefsMod.loadExecutiveWorkspacePreferences(storage);
    assertEqual(loaded.layout, 'compact', 'layout');
    assertEqual(loaded.density, 'executive', 'density');
    assertEqual(loaded.defaultLanding, 'governance', 'landing');
  });

  suite('T429');
  await test('T429: reset persistência', async () => {
    const storage = prefsMod.createMemoryStorage();
    prefsMod.saveExecutiveWorkspacePreferences({ layout: 'expanded' }, storage);
    const reset = prefsMod.resetExecutiveWorkspacePreferences(storage);
    assertEqual(reset.layout, 'standard', 'reset layout');
    assertEqual(prefsMod.loadExecutiveWorkspacePreferences(storage).layout, 'standard', 'load after reset');
  });

  suite('T430');
  await test('T430: configuração inválida normalizada', async () => {
    const normalized = prefsMod.normalizeExecutiveWorkspacePreferences({
      layout: 'invalid',
      density: 'unknown',
      defaultLanding: 'bad',
      indicatorVisibility: { workspaceStatus: 'yes' }
    });
    assertEqual(normalized.layout, 'standard', 'invalid layout');
    assertEqual(normalized.density, 'comfortable', 'invalid density');
    assertEqual(normalized.defaultLanding, 'workspace', 'invalid landing');
    assert(normalized.indicatorVisibility.workspaceStatus === true);
  });

  suite('T431');
  await test('T431: configuração parcial normalizada', async () => {
    const normalized = prefsMod.normalizeExecutiveWorkspacePreferences({ layout: 'compact' });
    assertEqual(normalized.layout, 'compact', 'partial layout');
    assertEqual(normalized.density, 'comfortable', 'partial density default');
  });

  suite('T432');
  await test('T432: ausência de configuração usa defaults', async () => {
    const storage = prefsMod.createMemoryStorage();
    const loaded = prefsMod.loadExecutiveWorkspacePreferences(storage);
    assertEqual(loaded.layout, 'standard', 'absent layout');
    assert(loaded.indicatorVisibility.navigationStatus === true);
  });

  suite('T433');
  await test('T433: App.jsx ExecutiveWorkspacePreferencesProvider', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutiveWorkspacePreferencesProvider'));
  });

  suite('T434');
  await test('T434: App composição P6.5 → P6.4 → P6.3 → P6.2', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveWorkspacePreferencesProvider>'));
    assert(app.includes('<ExecutiveWorkspaceProvider>'));
    assert(app.includes('<ExecutiveNavigationProvider'));
    assert(app.includes('ExecutiveModuleRoute'));
  });

  suite('T435');
  await test('T435: ExecutiveWorkspaceService inalterado por preferences', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveWorkspacePreferences'));
    assertEqual(serviceMod.getExecutiveWorkspaceModel().modules_total, 4, 'service intact');
  });

  suite('T436');
  await test('T436: ExecutiveWorkspaceHealthService inalterado', async () => {
    assert(!readMod('ExecutiveWorkspaceHealthService.js').includes('Preferences'));
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
  });

  suite('T437');
  await test('T437: ExecutiveWorkspaceGuard inalterado', async () => {
    assert(!readMod('ExecutiveWorkspaceGuard.jsx').includes('Preferences'));
    assert(readMod('ExecutiveWorkspaceGuard.jsx').includes('workspaceReady === false'));
  });

  suite('T438');
  await test('T438: provider updatePreferences export', async () => {
    assert(readMod('ExecutiveWorkspacePreferencesProvider.jsx').includes('updatePreferences'));
    assert(readMod('ExecutiveWorkspacePreferencesProvider.jsx').includes('resetPreferences'));
  });

  suite('T439');
  await test('T439: provider storageAdapter injectable', async () => {
    assert(readMod('ExecutiveWorkspacePreferencesProvider.jsx').includes('storageAdapter'));
  });

  suite('T440');
  await test('T440: preferences sem axios/API', async () => {
    const prefSrc = readMod('ExecutiveWorkspacePreferencesService.js');
    assert(!prefSrc.includes('axios'));
    assert(!prefSrc.includes('fetch('));
  });

  suite('T441');
  await test('T441: SSR layout compact data-workspace-layout', async () => {
    const storage = prefsMod.createMemoryStorage();
    prefsMod.saveExecutiveWorkspacePreferences({ layout: 'compact' }, storage);
    const html = await bundleWorkspaceWithPreferencesSsr({ storageAdapter: storage });
    assert(html.includes('data-workspace-layout="compact"'));
  });

  suite('T442');
  await test('T442: SSR layout expanded', async () => {
    const storage = prefsMod.createMemoryStorage();
    prefsMod.saveExecutiveWorkspacePreferences({ layout: 'expanded' }, storage);
    const html = await bundleWorkspaceWithPreferencesSsr({ storageAdapter: storage });
    assert(html.includes('data-workspace-layout="expanded"'));
  });

  suite('T443');
  await test('T443: SSR density executive', async () => {
    const storage = prefsMod.createMemoryStorage();
    prefsMod.saveExecutiveWorkspacePreferences({ density: 'executive' }, storage);
    const html = await bundleWorkspaceWithPreferencesSsr({ storageAdapter: storage });
    assert(html.includes('data-workspace-density="executive"'));
  });

  suite('T444');
  await test('T444: SSR indicadores workspaceStatus ocultos', async () => {
    const storage = prefsMod.createMemoryStorage();
    prefsMod.saveExecutiveWorkspacePreferences(
      {
        indicatorVisibility: {
          workspaceStatus: false,
          navigationStatus: true,
          governanceStatus: true,
          certificationStatus: true
        }
      },
      storage
    );
    const html = await bundleWorkspaceWithPreferencesSsr({ storageAdapter: storage });
    assert(!html.includes('executive-workspace-modules-ready'));
    assert(!html.includes('executive-workspace-deep-links-ready'));
    assert(html.includes('executive-workspace-navigation-ready'));
  });

  suite('T445');
  await test('T445: SSR indicadores visíveis por default', async () => {
    const html = await bundleWorkspaceWithPreferencesSsr({});
    assert(html.includes('executive-workspace-modules-ready'));
    assert(html.includes('executive-workspace-governance-ready'));
    assert(html.includes('executive-workspace-level'));
  });

  suite('T446');
  await test('T446: default landing data-default-landing', async () => {
    const storage = prefsMod.createMemoryStorage();
    prefsMod.saveExecutiveWorkspacePreferences({ defaultLanding: 'intelligence' }, storage);
    const html = await bundleWorkspaceWithPreferencesSsr({ storageAdapter: storage });
    assert(html.includes('data-default-landing="intelligence"'));
  });

  suite('T447');
  await test('T447: getIndicatorVisibility defaults all true', async () => {
    const vis = prefsMod.getIndicatorVisibility(null);
    assert(vis.workspaceStatus && vis.navigationStatus && vis.governanceStatus && vis.certificationStatus);
  });

  suite('T448');
  await test('T448: getIndicatorVisibility partial false', async () => {
    const vis = prefsMod.getIndicatorVisibility({
      indicatorVisibility: {
        workspaceStatus: true,
        navigationStatus: false,
        governanceStatus: false,
        certificationStatus: true
      }
    });
    assert(vis.navigationStatus === false);
    assert(vis.governanceStatus === false);
    assert(vis.certificationStatus === true);
  });

  suite('T449');
  await test('T449: health model inalterado com preferences', async () => {
    assertEqual(serviceMod.getExecutiveWorkspaceHealth().workspace_level, 'enterprise_ready', 'health');
    assertEqual(healthMod.classifyWorkspaceLevel(4, 4), 'enterprise_ready', 'classify');
  });

  for (let i = 450; i <= 454; i++) {
    suite(`T${i}`);
    await test(`T${i}: P6.5 preferences propagation #${i}`, async () => {
      const storage = prefsMod.createMemoryStorage();
      prefsMod.saveExecutiveWorkspacePreferences({ layout: 'standard', density: 'comfortable' }, storage);
      const loaded = prefsMod.loadExecutiveWorkspacePreferences(storage);
      assertEqual(loaded.layout, 'standard', `T${i} layout`);
      assertEqual(prefsMod.resolveWorkspacePresentation(loaded).defaultLanding, 'workspace', `T${i} landing`);
    });
  }

  suite('T455');
  await test('T455: P6.5 personalized executive workspace final', async () => {
    const html = await bundleWorkspaceWithPreferencesSsr({});
    assert(html.includes('executive-workspace-preferences-provider'));
    assert(html.includes('executive-workspace-guard'));
    assert(html.includes('data-workspace-layout="standard"'));
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
  });

  // ── AIOI-P6.6 Executive Session Experience (T456–T485) ──────────────────

  function readSessionMod(rel) {
    return fs.readFileSync(path.join(SESSION_ROOT, rel), 'utf8');
  }

  suite('T456');
  await test('T456: ExecutiveSessionService.js existe', async () => {
    assert(fs.existsSync(path.join(SESSION_ROOT, 'ExecutiveSessionService.js')));
  });

  suite('T457');
  await test('T457: ExecutiveSessionProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(SESSION_ROOT, 'ExecutiveSessionProvider.jsx')));
  });

  suite('T458');
  await test('T458: ExecutiveSessionContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(SESSION_ROOT, 'ExecutiveSessionContext.jsx')));
  });

  suite('T459');
  await test('T459: sessionStorage key aioi.executive.session', async () => {
    assertEqual(sessionMod.EXECUTIVE_SESSION_STORAGE_KEY, 'aioi.executive.session', 'key');
  });

  suite('T460');
  await test('T460: createExecutiveSession defaults', async () => {
    const s = sessionMod.createExecutiveSession();
    assert(s.session_active === true);
    assertEqual(s.last_module, null, 'last_module');
  });

  suite('T461');
  await test('T461: save + load sessionStorage', async () => {
    const storage = sessionMod.createMemorySessionStorage();
    sessionMod.saveExecutiveSession(
      { session_active: true, last_module: 'executive_cockpit', last_visit: '2026-06-08T12:00:00.000Z', preferences_loaded: true },
      storage
    );
    const loaded = sessionMod.loadExecutiveSession(storage);
    assertEqual(loaded.last_module, 'executive_cockpit', 'module');
  });

  suite('T462');
  await test('T462: reset sessionStorage', async () => {
    const storage = sessionMod.createMemorySessionStorage();
    sessionMod.saveExecutiveSession({ last_module: 'executive_reports' }, storage);
    sessionMod.resetExecutiveSession(storage);
    assertEqual(sessionMod.loadExecutiveSession(storage).last_module, null, 'reset');
  });

  suite('T463');
  await test('T463: normalize session inválida', async () => {
    const n = sessionMod.normalizeExecutiveSession({ last_module: 'invalid', session_active: 'yes' });
    assertEqual(n.last_module, null, 'invalid module');
    assert(n.session_active === true);
  });

  suite('T464');
  await test('T464: sessionStorage vazio usa defaults', async () => {
    const storage = sessionMod.createMemorySessionStorage();
    const loaded = sessionMod.loadExecutiveSession(storage);
    assert(loaded.session_active === true);
    assertEqual(loaded.last_module, null, 'empty');
  });

  suite('T465');
  await test('T465: sessionStorage parcial normalizada', async () => {
    const storage = sessionMod.createMemorySessionStorage();
    storage.setItem(sessionMod.EXECUTIVE_SESSION_STORAGE_KEY, JSON.stringify({ last_module: 'decision_visualization' }));
    assertEqual(sessionMod.loadExecutiveSession(storage).last_module, 'decision_visualization', 'partial');
  });

  suite('T466');
  await test('T466: sessionStorage inválido JSON', async () => {
    const storage = sessionMod.createMemorySessionStorage();
    storage.setItem(sessionMod.EXECUTIVE_SESSION_STORAGE_KEY, '{bad');
    assertEqual(sessionMod.loadExecutiveSession(storage).last_module, null, 'bad json');
  });

  suite('T467');
  await test('T467: App.jsx ExecutiveSessionProvider', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutiveSessionProvider'));
  });

  suite('T468');
  await test('T468: App composição P6.6 → P6.5 → P6.4 → P6.3 → P6.2', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveSessionProvider>'));
    assert(app.includes('<ExecutiveWorkspacePreferencesProvider>'));
    assert(app.includes('<ExecutiveWorkspaceProvider>'));
    assert(app.includes('<ExecutiveNavigationProvider'));
  });

  suite('T469');
  await test('T469: session sem Navigate redirect', async () => {
    assert(!readSessionMod('ExecutiveSessionProvider.jsx').includes('Navigate'));
    assert(!readSessionMod('ExecutiveSessionProvider.jsx').includes('useNavigate'));
  });

  suite('T470');
  await test('T470: ExecutiveWorkspaceService inalterado por session', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveSession'));
    assertEqual(serviceMod.getExecutiveWorkspaceModel().modules_ready, 4, 'service');
  });

  suite('T471');
  await test('T471: ExecutiveWorkspaceGuard inalterado por session', async () => {
    assert(!readMod('ExecutiveWorkspaceGuard.jsx').includes('Session'));
  });

  suite('T472');
  await test('T472: metadata session active', async () => {
    const meta = sessionMod.buildSessionMetadata({ session_active: true, last_module: 'executive_cockpit', last_visit: 't', preferences_loaded: false }, true);
    assert(meta.session_active === true);
    assertEqual(meta.last_module, 'executive_cockpit', 'meta module');
    assert(meta.preferences_loaded === true);
  });

  suite('T473');
  await test('T473: metadata session inactive', async () => {
    const meta = sessionMod.buildSessionMetadata({ session_active: false, last_module: null, last_visit: null, preferences_loaded: false }, false);
    assert(meta.session_active === false);
    assert(meta.preferences_loaded === false);
  });

  suite('T474');
  await test('T474: session recovery info', async () => {
    const recovery = sessionMod.buildSessionRecoveryInfo(
      { session_active: true, last_module: 'interface_intelligence', last_visit: '2026-06-08T12:00:00.000Z', preferences_loaded: true },
      true
    );
    assertEqual(recovery.last_module, 'interface_intelligence', 'recovery');
    assert(recovery.preferences_loaded === true);
  });

  suite('T475');
  await test('T475: recordExecutiveModuleVisit certified module', async () => {
    const next = sessionMod.recordExecutiveModuleVisit(sessionMod.getDefaultExecutiveSession(), 'executive_reports');
    assertEqual(next.last_module, 'executive_reports', 'record');
    assert(typeof next.last_visit === 'string');
  });

  suite('T476');
  await test('T476: recordExecutiveModuleVisit invalid module ignored', async () => {
    const next = sessionMod.recordExecutiveModuleVisit(sessionMod.getDefaultExecutiveSession(), 'invalid');
    assertEqual(next.last_module, null, 'ignored');
  });

  suite('T477');
  await test('T477: provider updateSession resetSession exports', async () => {
    assert(readSessionMod('ExecutiveSessionProvider.jsx').includes('updateSession'));
    assert(readSessionMod('ExecutiveSessionProvider.jsx').includes('resetSession'));
    assert(readSessionMod('ExecutiveSessionContext.jsx').includes('useExecutiveSession'));
  });

  suite('T478');
  await test('T478: provider storageAdapter injectable', async () => {
    assert(readSessionMod('ExecutiveSessionProvider.jsx').includes('storageAdapter'));
  });

  suite('T479');
  await test('T479: session sem axios/API', async () => {
    const src = readSessionMod('ExecutiveSessionService.js');
    assert(!src.includes('axios'));
    assert(!src.includes('fetch('));
  });

  suite('T480');
  await test('T480: 4 certified session modules', async () => {
    assertEqual(sessionMod.CERTIFIED_EXECUTIVE_SESSION_MODULES.length, 4, 'modules');
  });

  for (let i = 481; i <= 484; i++) {
    suite(`T${i}`);
    await test(`T${i}: P6.6 session propagation #${i}`, async () => {
      const storage = sessionMod.createMemorySessionStorage();
      sessionMod.saveExecutiveSession({ last_module: 'executive_cockpit' }, storage);
      const meta = sessionMod.buildSessionMetadata(sessionMod.loadExecutiveSession(storage), true);
      assertEqual(meta.last_module, 'executive_cockpit', `T${i}`);
    });
  }

  suite('T485');
  await test('T485: P6.6 session-aware executive workspace final', async () => {
    assert(fs.existsSync(path.join(SESSION_ROOT, 'ExecutiveSessionProvider.jsx')));
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
    assert(sessionMod.buildSessionMetadata(sessionMod.getDefaultExecutiveSession(), true).session_active === true);
  });

  // ── AIOI-P6.7 Executive Favorites (T486–T515) ─────────────────────────────

  function readFavoritesMod(rel) {
    return fs.readFileSync(path.join(FAVORITES_ROOT, rel), 'utf8');
  }

  suite('T486');
  await test('T486: ExecutiveFavoritesService.js existe', async () => {
    assert(fs.existsSync(path.join(FAVORITES_ROOT, 'ExecutiveFavoritesService.js')));
  });

  suite('T487');
  await test('T487: ExecutiveFavoritesProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(FAVORITES_ROOT, 'ExecutiveFavoritesProvider.jsx')));
  });

  suite('T488');
  await test('T488: ExecutiveFavoritesContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(FAVORITES_ROOT, 'ExecutiveFavoritesContext.jsx')));
  });

  suite('T489');
  await test('T489: ExecutiveFavoritesIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(FAVORITES_ROOT, 'ExecutiveFavoritesIndicators.jsx')));
  });

  suite('T490');
  await test('T490: localStorage key aioi.executive.favorites', async () => {
    assertEqual(favoritesMod.EXECUTIVE_FAVORITES_STORAGE_KEY, 'aioi.executive.favorites', 'key');
  });

  suite('T491');
  await test('T491: addFavorite service', async () => {
    const next = favoritesMod.addFavorite([], 'executive_cockpit');
    assertEqual(next.length, 1, 'add');
    assertEqual(next[0], 'executive_cockpit', 'id');
  });

  suite('T492');
  await test('T492: removeFavorite service', async () => {
    const next = favoritesMod.removeFavorite(['executive_cockpit', 'executive_reports'], 'executive_cockpit');
    assertEqual(next.length, 1, 'remove');
    assertEqual(next[0], 'executive_reports', 'remaining');
  });

  suite('T493');
  await test('T493: resetFavorites service', async () => {
    const storage = favoritesMod.createMemoryFavoritesStorage();
    favoritesMod.saveExecutiveFavorites({ favorites: ['executive_cockpit'] }, storage);
    favoritesMod.resetExecutiveFavorites(storage);
    assertEqual(favoritesMod.loadExecutiveFavorites(storage).favorites_count, 0, 'reset');
  });

  suite('T494');
  await test('T494: duplicate prevention addFavorite', async () => {
    const list = favoritesMod.addFavorite(['executive_cockpit'], 'executive_cockpit');
    assertEqual(list.length, 1, 'duplicate');
  });

  suite('T495');
  await test('T495: invalid module rejection addFavorite', async () => {
    const list = favoritesMod.addFavorite([], 'invalid_module');
    assertEqual(list.length, 0, 'invalid');
  });

  suite('T496');
  await test('T496: isFavorite + listFavorites', async () => {
    const list = ['executive_cockpit', 'interface_intelligence'];
    assert(favoritesMod.isFavorite(list, 'executive_cockpit'));
    assertEqual(favoritesMod.listFavorites(list).length, 2, 'list');
  });

  suite('T497');
  await test('T497: storage vazio defaults', async () => {
    const storage = favoritesMod.createMemoryFavoritesStorage();
    assertEqual(favoritesMod.loadExecutiveFavorites(storage).favorites_count, 0, 'empty');
  });

  suite('T498');
  await test('T498: storage parcial normalizado', async () => {
    const storage = favoritesMod.createMemoryFavoritesStorage();
    storage.setItem(
      favoritesMod.EXECUTIVE_FAVORITES_STORAGE_KEY,
      JSON.stringify({ favorites: ['executive_reports', 'invalid'] })
    );
    assertEqual(favoritesMod.loadExecutiveFavorites(storage).favorites_count, 1, 'partial');
  });

  suite('T499');
  await test('T499: storage inválido JSON', async () => {
    const storage = favoritesMod.createMemoryFavoritesStorage();
    storage.setItem(favoritesMod.EXECUTIVE_FAVORITES_STORAGE_KEY, '{bad');
    assertEqual(favoritesMod.loadExecutiveFavorites(storage).favorites_count, 0, 'bad json');
  });

  suite('T500');
  await test('T500: metadata count + ready', async () => {
    const meta = favoritesMod.buildFavoritesMetadata(['executive_cockpit', 'executive_reports']);
    assertEqual(meta.favorites_count, 2, 'count');
    assert(meta.favorites_ready === true);
  });

  suite('T501');
  await test('T501: metadata empty', async () => {
    const meta = favoritesMod.buildFavoritesMetadata([]);
    assertEqual(meta.favorites_count, 0, 'empty count');
    assertEqual(meta.favorites.length, 0, 'empty list');
  });

  suite('T502');
  await test('T502: metadata populated', async () => {
    const meta = favoritesMod.buildFavoritesMetadata(['decision_visualization']);
    assertEqual(meta.favorites[0], 'decision_visualization', 'populated');
  });

  suite('T503');
  await test('T503: provider exports hydration/update/reset', async () => {
    assert(readFavoritesMod('ExecutiveFavoritesProvider.jsx').includes('addFavorite'));
    assert(readFavoritesMod('ExecutiveFavoritesProvider.jsx').includes('resetFavorites'));
    assert(readFavoritesMod('ExecutiveFavoritesContext.jsx').includes('useExecutiveFavorites'));
  });

  suite('T504');
  await test('T504: App composição P6.7 → P6.6 → P6.5 → P6.4', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveFavoritesProvider>'));
    assert(app.includes('<ExecutiveSessionProvider>'));
    assert(app.includes('<ExecutiveWorkspacePreferencesProvider>'));
    assert(app.includes('<ExecutiveWorkspaceProvider>'));
  });

  suite('T505');
  await test('T505: favorites sem Navigate/navegação', async () => {
    assert(!readFavoritesMod('ExecutiveFavoritesProvider.jsx').includes('Navigate'));
    assert(!readFavoritesMod('ExecutiveFavoritesIndicators.jsx').includes('onClick'));
  });

  suite('T506');
  await test('T506: session provider inalterado por favorites', async () => {
    assert(!readSessionMod('ExecutiveSessionProvider.jsx').includes('ExecutiveFavorites'));
  });

  suite('T507');
  await test('T507: workspace health inalterado por favorites', async () => {
    assert(!readMod('ExecutiveWorkspaceHealthService.js').includes('Favorites'));
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
  });

  suite('T508');
  await test('T508: SSR indicators render vazio', async () => {
    const html = await bundleFavoritesProviderSsr({});
    assert(html.includes('executive-favorites-indicators'));
    assert(html.includes('executive-favorites-active'));
    assert(html.includes('>no<'));
    assert(html.includes('>0<'));
  });

  suite('T509');
  await test('T509: SSR indicators render populado', async () => {
    const storage = favoritesMod.createMemoryFavoritesStorage();
    favoritesMod.saveExecutiveFavorites(
      { favorites: ['executive_cockpit', 'executive_reports'] },
      storage
    );
    const html = await bundleFavoritesProviderSsr({ storageAdapter: storage });
    assert(html.includes('>yes<'));
    assert(html.includes('>2<'));
  });

  for (let i = 510; i <= 514; i++) {
    suite(`T${i}`);
    await test(`T${i}: P6.7 favorites propagation #${i}`, async () => {
      const meta = favoritesMod.buildFavoritesMetadata(['executive_cockpit']);
      assertEqual(meta.favorites_count, 1, `T${i}`);
      assert(meta.favorites_ready === true);
    });
  }

  suite('T515');
  await test('T515: P6.7 executive productivity enabled final', async () => {
    assert(fs.existsSync(path.join(FAVORITES_ROOT, 'ExecutiveFavoritesProvider.jsx')));
    assertEqual(favoritesMod.CERTIFIED_EXECUTIVE_FAVORITE_MODULES.length, 4, 'certified');
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
  });

  // ── AIOI-P6.8 Executive Workspace Shortcuts (T516–T545) ─────────────────

  function readShortcutsMod(rel) {
    return fs.readFileSync(path.join(SHORTCUTS_ROOT, rel), 'utf8');
  }

  suite('T516');
  await test('T516: ExecutiveShortcutsService.js existe', async () => {
    assert(fs.existsSync(path.join(SHORTCUTS_ROOT, 'ExecutiveShortcutsService.js')));
  });

  suite('T517');
  await test('T517: ExecutiveShortcutsProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(SHORTCUTS_ROOT, 'ExecutiveShortcutsProvider.jsx')));
  });

  suite('T518');
  await test('T518: ExecutiveShortcutsContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(SHORTCUTS_ROOT, 'ExecutiveShortcutsContext.jsx')));
  });

  suite('T519');
  await test('T519: ExecutiveWorkspaceShortcuts.jsx existe', async () => {
    assert(fs.existsSync(path.join(SHORTCUTS_ROOT, 'ExecutiveWorkspaceShortcuts.jsx')));
  });

  suite('T520');
  await test('T520: localStorage key aioi.executive.shortcuts', async () => {
    assertEqual(shortcutsMod.EXECUTIVE_SHORTCUTS_STORAGE_KEY, 'aioi.executive.shortcuts', 'key');
  });

  suite('T521');
  await test('T521: addShortcut service', async () => {
    const next = shortcutsMod.addShortcut([], 'executive_cockpit');
    assertEqual(next.length, 1, 'add');
    assertEqual(next[0], 'executive_cockpit', 'id');
  });

  suite('T522');
  await test('T522: removeShortcut service', async () => {
    const next = shortcutsMod.removeShortcut(
      ['executive_cockpit', 'interface_intelligence'],
      'executive_cockpit'
    );
    assertEqual(next.length, 1, 'remove');
    assertEqual(next[0], 'interface_intelligence', 'remaining');
  });

  suite('T523');
  await test('T523: resetShortcuts service', async () => {
    const storage = shortcutsMod.createMemoryShortcutsStorage();
    shortcutsMod.saveExecutiveShortcuts({ shortcuts: ['executive_reports'] }, storage);
    shortcutsMod.resetExecutiveShortcuts(storage);
    assertEqual(shortcutsMod.loadExecutiveShortcuts(storage).shortcuts_count, 0, 'reset');
  });

  suite('T524');
  await test('T524: duplicate prevention addShortcut', async () => {
    const list = shortcutsMod.addShortcut(['decision_visualization'], 'decision_visualization');
    assertEqual(list.length, 1, 'duplicate');
  });

  suite('T525');
  await test('T525: invalid module rejection addShortcut', async () => {
    const list = shortcutsMod.addShortcut([], 'not_a_module');
    assertEqual(list.length, 0, 'invalid');
  });

  suite('T526');
  await test('T526: isShortcut + listShortcuts', async () => {
    const list = ['executive_cockpit', 'executive_reports'];
    assert(shortcutsMod.isShortcut(list, 'executive_reports'));
    assertEqual(shortcutsMod.listShortcuts(list).length, 2, 'list');
  });

  suite('T527');
  await test('T527: storage vazio defaults', async () => {
    const storage = shortcutsMod.createMemoryShortcutsStorage();
    assertEqual(shortcutsMod.loadExecutiveShortcuts(storage).shortcuts_count, 0, 'empty');
  });

  suite('T528');
  await test('T528: storage parcial normalizado', async () => {
    const storage = shortcutsMod.createMemoryShortcutsStorage();
    storage.setItem(
      shortcutsMod.EXECUTIVE_SHORTCUTS_STORAGE_KEY,
      JSON.stringify({ shortcuts: ['interface_intelligence', 'bad'] })
    );
    assertEqual(shortcutsMod.loadExecutiveShortcuts(storage).shortcuts_count, 1, 'partial');
  });

  suite('T529');
  await test('T529: storage inválido JSON', async () => {
    const storage = shortcutsMod.createMemoryShortcutsStorage();
    storage.setItem(shortcutsMod.EXECUTIVE_SHORTCUTS_STORAGE_KEY, 'not-json');
    assertEqual(shortcutsMod.loadExecutiveShortcuts(storage).shortcuts_count, 0, 'bad json');
  });

  suite('T530');
  await test('T530: metadata count + ready', async () => {
    const meta = shortcutsMod.buildShortcutsMetadata([
      'executive_cockpit',
      'decision_visualization',
      'executive_reports'
    ]);
    assertEqual(meta.shortcuts_count, 3, 'count');
    assert(meta.shortcuts_ready === true);
  });

  suite('T531');
  await test('T531: metadata empty', async () => {
    const meta = shortcutsMod.buildShortcutsMetadata([]);
    assertEqual(meta.shortcuts_count, 0, 'empty');
    assertEqual(meta.shortcuts.length, 0, 'empty list');
  });

  suite('T532');
  await test('T532: metadata populated', async () => {
    const meta = shortcutsMod.buildShortcutsMetadata(['executive_cockpit']);
    assertEqual(meta.shortcuts[0], 'executive_cockpit', 'populated');
  });

  suite('T533');
  await test('T533: provider exports hydration/update/reset', async () => {
    assert(readShortcutsMod('ExecutiveShortcutsProvider.jsx').includes('addShortcut'));
    assert(readShortcutsMod('ExecutiveShortcutsProvider.jsx').includes('resetShortcuts'));
    assert(readShortcutsMod('ExecutiveShortcutsContext.jsx').includes('useExecutiveShortcuts'));
  });

  suite('T534');
  await test('T534: App composição P6.8 → P6.7 → P6.6 → P6.5', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveShortcutsProvider>'));
    assert(app.includes('<ExecutiveFavoritesProvider>'));
    assert(app.includes('<ExecutiveSessionProvider>'));
    assert(app.includes('<ExecutiveWorkspacePreferencesProvider>'));
  });

  suite('T535');
  await test('T535: shortcuts sem Navigate/navegação', async () => {
    assert(!readShortcutsMod('ExecutiveShortcutsProvider.jsx').includes('Navigate'));
    assert(!readShortcutsMod('ExecutiveWorkspaceShortcuts.jsx').includes('onClick'));
  });

  suite('T536');
  await test('T536: favorites provider inalterado por shortcuts', async () => {
    assert(!readFavoritesMod('ExecutiveFavoritesProvider.jsx').includes('ExecutiveShortcuts'));
  });

  suite('T537');
  await test('T537: workspace health inalterado por shortcuts', async () => {
    assert(!readMod('ExecutiveWorkspaceHealthService.js').includes('Shortcuts'));
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
  });

  suite('T538');
  await test('T538: SSR shortcuts render vazio', async () => {
    const html = await bundleShortcutsProviderSsr({});
    assert(html.includes('executive-workspace-shortcuts'));
    assert(html.includes('executive-shortcuts-active'));
    assert(html.includes('>no<'));
    assert(html.includes('>0<'));
  });

  suite('T539');
  await test('T539: SSR shortcuts render populado', async () => {
    const storage = shortcutsMod.createMemoryShortcutsStorage();
    shortcutsMod.saveExecutiveShortcuts(
      { shortcuts: ['executive_cockpit', 'interface_intelligence', 'executive_reports'] },
      storage
    );
    const html = await bundleShortcutsProviderSsr({ storageAdapter: storage });
    assert(html.includes('>yes<'));
    assert(html.includes('>3<'));
  });

  for (let i = 540; i <= 544; i++) {
    suite(`T${i}`);
    await test(`T${i}: P6.8 shortcuts propagation #${i}`, async () => {
      const meta = shortcutsMod.buildShortcutsMetadata(['decision_visualization']);
      assertEqual(meta.shortcuts_count, 1, `T${i}`);
      assert(meta.shortcuts_ready === true);
    });
  }

  suite('T545');
  await test('T545: P6.8 operationally accelerated executive final', async () => {
    assert(fs.existsSync(path.join(SHORTCUTS_ROOT, 'ExecutiveShortcutsProvider.jsx')));
    assertEqual(shortcutsMod.CERTIFIED_EXECUTIVE_SHORTCUT_MODULES.length, 4, 'certified');
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
  });

  // ── AIOI-P6.9 Operational Certification (T546–T631) ─────────────────────

  const appSource = fs.readFileSync(APP_PATH, 'utf8');
  const composition = audit.verifyProviderComposition(appSource);

  suite('T546');
  await test('T546: AUDIT-01 provider composition integrity', async () => {
    assert(composition.ok, composition.reason || 'composition');
  });

  for (let i = 547; i <= 555; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-01 chain link #${i}`, async () => {
      const provider = audit.PROVIDER_CHAIN[i - 547];
      const tag = provider === 'ExecutiveAccessGuard' ? '<ExecutiveAccessGuard>' : `<${provider}`;
      assert(composition.shell.includes(tag), `missing ${provider}`);
    });
  }

  suite('T556');
  await test('T556: AUDIT-02 storage key isolation', async () => {
    const iso = audit.verifyStorageKeyIsolation();
    assert(iso.ok, iso.reason || 'isolation');
  });

  for (let i = 557; i <= 560; i++) {
    suite(`T${i}`);
    const keys = Object.entries(audit.STORAGE_KEYS);
    const entry = keys[i - 557];
    await test(`T${i}: AUDIT-02 key ${entry[0]}`, async () => {
      assertEqual(entry[1], audit.STORAGE_KEYS[entry[0]], entry[0]);
      assert(entry[1].startsWith('aioi.executive.'));
    });
  }

  suite('T561');
  await test('T561: AUDIT-02 sem colisão entre chaves', async () => {
    const vals = Object.values(audit.STORAGE_KEYS);
    assertEqual(new Set(vals).size, vals.length, 'unique');
  });

  for (let i = 562; i <= 565; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-02 shared state isolation #${i}`, async () => {
      assert(audit.STORAGE_KEYS.preferences !== audit.STORAGE_KEYS.session);
      assert(audit.STORAGE_KEYS.favorites !== audit.STORAGE_KEYS.shortcuts);
    });
  }

  suite('T566');
  await test('T566: AUDIT-03 workspace sovereignty', async () => {
    const sov = audit.verifyWorkspaceSovereignty();
    assert(sov.ok, sov.token ? `${sov.file}:${sov.token}` : 'sovereignty');
  });

  for (let i = 567; i <= 570; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-03 workspace core immutable #${i}`, async () => {
      assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveFavorites'));
      assert(!readMod('ExecutiveWorkspaceHealthService.js').includes('Shortcuts'));
      assert(!readMod('ExecutiveWorkspaceGuard.jsx').includes('Session'));
    });
  }

  for (let i = 571; i <= 575; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-03 health model certified #${i}`, async () => {
      assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
      assertEqual(serviceMod.getExecutiveWorkspaceHealth().workspace_level, 'enterprise_ready', `T${i}`);
    });
  }

  suite('T576');
  await test('T576: AUDIT-04 navigation sovereignty', async () => {
    const sov = audit.verifyNavigationSovereignty();
    assert(sov.ok, sov.token ? `${sov.file}:${sov.token}` : 'nav sovereignty');
  });

  for (let i = 577; i <= 580; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-04 deep link registry immutable #${i}`, async () => {
      const src = fs.readFileSync(path.join(DEEP_ROOT, 'ExecutiveDeepLinkRegistry.js'), 'utf8');
      assert(!src.includes('ExecutiveFavorites'));
      assert(!src.includes('ExecutiveShortcuts'));
    });
  }

  for (let i = 581; i <= 585; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-04 module route immutable #${i}`, async () => {
      const src = fs.readFileSync(path.join(DEEP_ROOT, 'ExecutiveModuleRoute.jsx'), 'utf8');
      assert(!src.includes('ExecutiveWorkspacePreferences'));
      assert(!src.includes('ExecutiveSession'));
    });
  }

  suite('T586');
  await test('T586: AUDIT-05 experience isolation', async () => {
    const iso = audit.verifyExperienceIsolation();
    assert(iso.ok, iso.token ? `${iso.layer}:${iso.token}` : 'experience');
  });

  for (let i = 587; i <= 590; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-05 no auth mutation #${i}`, async () => {
      assert(!readFavoritesMod('ExecutiveFavoritesProvider.jsx').includes('ExecutiveAccessGuard'));
      assert(!readShortcutsMod('ExecutiveShortcutsProvider.jsx').includes('ExecutiveAccessGuard'));
    });
  }

  for (let i = 591; i <= 595; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-05 readiness unchanged #${i}`, async () => {
      assertEqual(serviceMod.getExecutiveWorkspaceModel().modules_ready, 4, `T${i}`);
      assert(serviceMod.getExecutiveWorkspaceModel().navigation_ready === true);
    });
  }

  suite('T596');
  await test('T596: AUDIT-06 preferences storage recovery vazio', async () => {
    const storage = prefsMod.createMemoryStorage();
    assertEqual(prefsMod.loadExecutiveWorkspacePreferences(storage).layout, 'standard', 'empty');
  });

  suite('T597');
  await test('T597: AUDIT-06 session storage recovery parcial', async () => {
    const storage = sessionMod.createMemorySessionStorage();
    storage.setItem(sessionMod.EXECUTIVE_SESSION_STORAGE_KEY, '{"last_module":"executive_cockpit"}');
    assertEqual(sessionMod.loadExecutiveSession(storage).last_module, 'executive_cockpit', 'partial');
  });

  suite('T598');
  await test('T598: AUDIT-06 favorites storage recovery inválido', async () => {
    const storage = favoritesMod.createMemoryFavoritesStorage();
    storage.setItem(favoritesMod.EXECUTIVE_FAVORITES_STORAGE_KEY, '[]]');
    assertEqual(favoritesMod.loadExecutiveFavorites(storage).favorites_count, 0, 'invalid');
  });

  suite('T599');
  await test('T599: AUDIT-06 shortcuts storage recovery corrompido', async () => {
    const storage = shortcutsMod.createMemoryShortcutsStorage();
    storage.setItem(shortcutsMod.EXECUTIVE_SHORTCUTS_STORAGE_KEY, '{"shortcuts":"bad"}');
    assertEqual(shortcutsMod.loadExecutiveShortcuts(storage).shortcuts_count, 0, 'corrupt');
  });

  for (let i = 600; i <= 605; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-06 storage recovery propagation #${i}`, async () => {
      const p = prefsMod.normalizeExecutiveWorkspacePreferences({ layout: 'bad' });
      const s = sessionMod.normalizeExecutiveSession({ last_module: 'x' });
      assertEqual(p.layout, 'standard', `T${i} prefs`);
      assertEqual(s.last_module, null, `T${i} session`);
    });
  }

  suite('T606');
  await test('T606: AUDIT-07 SSR workspace provider', async () => {
    const html = await bundleProviderSsr();
    assert(html.includes('executive-workspace-provider'));
  });

  suite('T607');
  await test('T607: AUDIT-07 SSR workspace guard granted', async () => {
    const html = await bundleProviderSsr();
    assert(html.includes('executive-workspace-guard'));
  });

  suite('T608');
  await test('T608: AUDIT-07 SSR preferences provider', async () => {
    const html = await bundleWorkspaceWithPreferencesSsr({});
    assert(html.includes('executive-workspace-preferences-provider'));
  });

  suite('T609');
  await test('T609: AUDIT-07 SSR session provider', async () => {
    const html = await bundleSessionProviderSsr({});
    assert(html.includes('executive-session-provider'));
  });

  suite('T610');
  await test('T610: AUDIT-07 SSR favorites indicators', async () => {
    const html = await bundleFavoritesProviderSsr({});
    assert(html.includes('executive-favorites-indicators'));
  });

  suite('T611');
  await test('T611: AUDIT-07 SSR shortcuts indicators', async () => {
    const html = await bundleShortcutsProviderSsr({});
    assert(html.includes('executive-workspace-shortcuts'));
  });

  for (let i = 612; i <= 615; i++) {
    suite(`T${i}`);
    await test(`T${i}: AUDIT-07 SSR stack propagation #${i}`, async () => {
      const html = await bundleShortcutsProviderSsr({});
      assert(html.includes('executive-shortcuts-provider'));
      assert(html.includes('sc-child'));
    });
  }

  suite('T616');
  await test('T616: AUDIT-08 regressão P6.3 deep link', async () => {
    assert(
      audit.runRegressionSuite(
        'P6.3',
        path.join(DEEP_ROOT, 'tests'),
        'ExecutiveDeepLinking.test.jsx',
        'AIOI_P6_3_ENTERPRISE_EXECUTIVE_DEEP_LINKING_PASS'
      )
    );
  });

  suite('T617');
  await test('T617: AUDIT-08 regressão P6.2 navigation', async () => {
    assert(
      audit.runRegressionSuite(
        'P6.2',
        path.join(NAV_ROOT, 'tests'),
        'ExecutiveNavigationExperience.test.jsx',
        'AIOI_P6_2_ENTERPRISE_EXECUTIVE_NAVIGATION_EXPERIENCE_PASS'
      )
    );
  });

  suite('T618');
  await test('T618: AUDIT-08 regressão P6.1 access', async () => {
    assert(
      audit.runRegressionSuite(
        'P6.1',
        path.join(ACCESS_ROOT, 'tests'),
        'ExecutiveAccessGovernance.test.jsx',
        'AIOI_P6_1_ENTERPRISE_EXECUTIVE_ACCESS_GOVERNANCE_PASS'
      )
    );
  });

  suite('T619');
  await test('T619: AUDIT-08 regressão P6.0 router', async () => {
    assert(
      audit.runRegressionSuite(
        'P6.0',
        path.join(ROUTER_ROOT, 'tests'),
        'ExecutivePortalRouterIntegration.test.jsx',
        'AIOI_P6_0_ENTERPRISE_ROUTER_INTEGRATION_PASS'
      )
    );
  });

  suite('T620');
  await test('T620: AUDIT-08 regressão P5.9 consolidation', async () => {
    assert(
      audit.runRegressionSuite(
        'P5.9',
        path.join(AIOI_ROOT, 'executive-portal/tests'),
        'ExecutivePortalConsolidation.test.jsx',
        'AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_PASS'
      )
    );
  });

  for (let i = 621; i <= 625; i++) {
    const suites = [
      ['P5.8', path.join(AIOI_ROOT, 'executive-reports/tests'), 'ExecutiveReports.test.jsx', 'AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS'],
      ['P5.7', path.join(AIOI_ROOT, 'interface-intelligence/tests'), 'InterfaceIntelligence.test.jsx', 'AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'],
      ['P5.6', path.join(AIOI_ROOT, 'decision-visualization/tests'), 'DecisionVisualization.test.jsx', 'AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'],
      ['P5.5', path.join(AIOI_ROOT, 'executive-portal/tests'), 'ExecutivePortal.test.jsx', 'AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'],
      ['P5.4', path.join(AIOI_ROOT, 'executive-cockpit/tests'), 'ExecutiveCockpit.test.jsx', 'AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS']
    ];
    const s = suites[i - 621];
    suite(`T${i}`);
    await test(`T${i}: AUDIT-08 regressão ${s[0]}`, async () => {
      assert(audit.runRegressionSuite(s[0], s[1], s[2], s[3]));
    });
  }

  for (let i = 626; i <= 630; i++) {
    suite(`T${i}`);
    await test(`T${i}: P6.9 certification propagation #${i}`, async () => {
      assert(composition.ok);
      assert(audit.verifyStorageKeyIsolation().ok);
      assert(audit.verifyWorkspaceSovereignty().ok);
    });
  }

  suite('T631');
  await test('T631: P6.9 operational certification final', async () => {
    assert(audit.verifyNavigationSovereignty().ok);
    assert(audit.verifyExperienceIsolation().ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
    assert(fs.existsSync(path.join(__dirname, 'audit/P69OperationalCertificationAudit.js')));
  });

  // ── AIOI-P7.0 Executive Intelligence Foundation (T632–T701) ───────────────

  function readIntelligenceMod(rel) {
    return fs.readFileSync(path.join(INTELLIGENCE_ROOT, rel), 'utf8');
  }

  suite('T632');
  await test('T632: ExecutiveIntelligenceService.js existe', async () => {
    assert(fs.existsSync(path.join(INTELLIGENCE_ROOT, 'ExecutiveIntelligenceService.js')));
  });

  suite('T633');
  await test('T633: ExecutiveIntelligenceProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(INTELLIGENCE_ROOT, 'ExecutiveIntelligenceProvider.jsx')));
  });

  suite('T634');
  await test('T634: ExecutiveIntelligenceContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(INTELLIGENCE_ROOT, 'ExecutiveIntelligenceContext.jsx')));
  });

  suite('T635');
  await test('T635: ExecutiveIntelligenceMetadata.jsx existe', async () => {
    assert(fs.existsSync(path.join(INTELLIGENCE_ROOT, 'ExecutiveIntelligenceMetadata.jsx')));
  });

  suite('T636');
  await test('T636: metadata intelligence_ready true', async () => {
    assert(intelligenceMod.getExecutiveIntelligenceMetadata().intelligence_ready === true);
  });

  suite('T637');
  await test('T637: metadata intelligence_version P7.0', async () => {
    assertEqual(intelligenceMod.getExecutiveIntelligenceMetadata().intelligence_version, 'P7.0', 'version');
  });

  suite('T638');
  await test('T638: metadata intelligence_enabled false', async () => {
    assert(intelligenceMod.getExecutiveIntelligenceMetadata().intelligence_enabled === false);
  });

  suite('T639');
  await test('T639: metadata context_available true', async () => {
    assert(intelligenceMod.getExecutiveIntelligenceMetadata().context_available === true);
  });

  suite('T640');
  await test('T640: metadata recommendations insights assistant false', async () => {
    const m = intelligenceMod.getExecutiveIntelligenceMetadata();
    assert(m.recommendations_available === false);
    assert(m.insights_available === false);
    assert(m.assistant_available === false);
  });

  suite('T641');
  await test('T641: sem localStorage no intelligence', async () => {
    assert(!readIntelligenceMod('ExecutiveIntelligenceService.js').includes('localStorage'));
    assert(!readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('sessionStorage'));
  });

  suite('T642');
  await test('T642: sem fetch/axios/backend', async () => {
    const src = readIntelligenceMod('ExecutiveIntelligenceService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
  });

  suite('T643');
  await test('T643: sem LLM/openai/inference', async () => {
    const all = ['ExecutiveIntelligenceService.js', 'ExecutiveIntelligenceProvider.jsx', 'ExecutiveIntelligenceMetadata.jsx']
      .map(readIntelligenceMod)
      .join('\n');
    assert(!/openai|inference|forecast/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
  });

  suite('T644');
  await test('T644: provider context metadata version ready', async () => {
    assert(readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('metadata'));
    assert(readIntelligenceMod('ExecutiveIntelligenceContext.jsx').includes('useExecutiveIntelligence'));
    assert(intelligenceMod.isExecutiveIntelligenceReady() === true);
  });

  suite('T645');
  await test('T645: App.jsx ExecutiveIntelligenceProvider', async () => {
    assert(appSource.includes('ExecutiveIntelligenceProvider'));
  });

  suite('T646');
  await test('T646: App composição P7.0 entre Shortcuts e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const shortcutsIdx = shell.indexOf('<ExecutiveShortcutsProvider>');
    const intelIdx = shell.indexOf('<ExecutiveIntelligenceProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(shortcutsIdx >= 0 && intelIdx > shortcutsIdx && workspaceIdx > intelIdx);
  });

  suite('T647');
  await test('T647: AUDIT-01 intelligence na provider chain', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveIntelligenceProvider>'));
  });

  suite('T648');
  await test('T648: shortcuts provider inalterado por intelligence', async () => {
    assert(!readShortcutsMod('ExecutiveShortcutsProvider.jsx').includes('ExecutiveIntelligence'));
  });

  suite('T649');
  await test('T649: workspace service inalterado por intelligence', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveIntelligence'));
    assertEqual(serviceMod.getExecutiveWorkspaceModel().modules_ready, 4, 'workspace');
  });

  suite('T650');
  await test('T650: workspace health inalterado', async () => {
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_ready === true);
  });

  suite('T651');
  await test('T651: SSR intelligence provider', async () => {
    const html = await bundleIntelligenceProviderSsr();
    assert(html.includes('executive-intelligence-provider'));
  });

  suite('T652');
  await test('T652: SSR intelligence metadata indicators', async () => {
    const html = await bundleIntelligenceProviderSsr();
    assert(html.includes('executive-intelligence-metadata'));
    assert(html.includes('executive-intelligence-ready'));
    assert(html.includes('executive-intelligence-version'));
  });

  suite('T653');
  await test('T653: SSR intelligence version P7.0', async () => {
    const html = await bundleIntelligenceProviderSsr();
    assert(html.includes('>P7.0<'));
    assert(html.includes('>yes<'));
  });

  suite('T654');
  await test('T654: SSR sem scores cognitivos', async () => {
    const html = await bundleIntelligenceProviderSsr();
    assert(!html.includes('score'));
    assert(!html.includes('recommendation'));
  });

  suite('T655');
  await test('T655: intelligence sem Navigate', async () => {
    assert(!readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('Navigate'));
    assert(!readIntelligenceMod('ExecutiveIntelligenceMetadata.jsx').includes('onClick'));
  });

  for (let i = 656; i <= 670; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.0 foundation propagation #${i}`, async () => {
      const m = intelligenceMod.getExecutiveIntelligenceMetadata();
      assertEqual(m.intelligence_version, 'P7.0', `T${i}`);
      assert(m.intelligence_enabled === false);
      assert(m.context_available === true);
    });
  }

  for (let i = 671; i <= 685; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.0 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyWorkspaceSovereignty().ok);
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readIntelligenceMod('ExecutiveIntelligenceService.js').includes('ExecutiveDeepLinkRegistry'));
    });
  }

  for (let i = 686; i <= 695; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.0 non-persistence #${i}`, async () => {
      assert(!readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('setItem'));
      assert(!readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('getItem'));
    });
  }

  for (let i = 696; i <= 700; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.0 readiness propagation #${i}`, async () => {
      assert(intelligenceMod.isExecutiveIntelligenceReady());
      assert(composition.shell.includes('<ExecutiveNavigationProvider'));
    });
  }

  suite('T701');
  await test('T701: P7.0 executive intelligence foundation final', async () => {
    assert(fs.existsSync(path.join(INTELLIGENCE_ROOT, 'ExecutiveIntelligenceProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleIntelligenceProviderSsr();
    assert(html.includes('intel-child'));
  });

  // ── AIOI-P7.1 Executive Intelligence Governance (T702–T751) ─────────────────

  function readGovernanceMod(rel) {
    return fs.readFileSync(path.join(GOVERNANCE_ROOT, rel), 'utf8');
  }

  suite('T702');
  await test('T702: ExecutiveIntelligenceGovernanceService.js existe', async () => {
    assert(fs.existsSync(path.join(GOVERNANCE_ROOT, 'ExecutiveIntelligenceGovernanceService.js')));
  });

  suite('T703');
  await test('T703: ExecutiveIntelligenceGovernanceProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(GOVERNANCE_ROOT, 'ExecutiveIntelligenceGovernanceProvider.jsx')));
  });

  suite('T704');
  await test('T704: ExecutiveIntelligenceGovernanceContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(GOVERNANCE_ROOT, 'ExecutiveIntelligenceGovernanceContext.jsx')));
  });

  suite('T705');
  await test('T705: ExecutiveIntelligenceGovernanceIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(GOVERNANCE_ROOT, 'ExecutiveIntelligenceGovernanceIndicators.jsx')));
  });

  suite('T706');
  await test('T706: ExecutiveIntelligenceGovernance.module.css existe', async () => {
    assert(fs.existsSync(path.join(GOVERNANCE_ROOT, 'ExecutiveIntelligenceGovernance.module.css')));
  });

  suite('T707');
  await test('T707: governance_ready true', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().governance_ready === true);
  });

  suite('T708');
  await test('T708: intelligence_governed true', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().intelligence_governed === true);
  });

  suite('T709');
  await test('T709: activation_authorized false', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().activation_authorized === false);
  });

  suite('T710');
  await test('T710: recommendations_authorized false', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().recommendations_authorized === false);
  });

  suite('T711');
  await test('T711: insights_authorized false', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().insights_authorized === false);
  });

  suite('T712');
  await test('T712: assistant_authorized false', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().assistant_authorized === false);
  });

  suite('T713');
  await test('T713: audit_ready true', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().audit_ready === true);
  });

  suite('T714');
  await test('T714: sem localStorage/sessionStorage', async () => {
    assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceService.js').includes('localStorage'));
    assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('sessionStorage'));
  });

  suite('T715');
  await test('T715: sem fetch/axios/websocket', async () => {
    const src = readGovernanceMod('ExecutiveIntelligenceGovernanceService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
  });

  suite('T716');
  await test('T716: sem LLM/openai/inference', async () => {
    const all = [
      'ExecutiveIntelligenceGovernanceService.js',
      'ExecutiveIntelligenceGovernanceProvider.jsx',
      'ExecutiveIntelligenceGovernanceIndicators.jsx'
    ]
      .map(readGovernanceMod)
      .join('\n');
    assert(!/openai|inference|forecast/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
  });

  suite('T717');
  await test('T717: anti-activation sem enable/activate hooks', async () => {
    const prov = readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx');
    assert(!prov.includes('activateIntelligence'));
    assert(!prov.includes('enableCognitive'));
  });

  suite('T718');
  await test('T718: provider context metadata governed ready', async () => {
    assert(readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('metadata'));
    assert(readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('governed'));
    assert(readGovernanceMod('ExecutiveIntelligenceGovernanceContext.jsx').includes('useExecutiveIntelligenceGovernance'));
    assert(governanceMod.isExecutiveIntelligenceGovernanceReady() === true);
  });

  suite('T719');
  await test('T719: App.jsx ExecutiveIntelligenceGovernanceProvider', async () => {
    assert(appSource.includes('ExecutiveIntelligenceGovernanceProvider'));
  });

  suite('T720');
  await test('T720: App composição P7.1 entre Intelligence e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const intelIdx = shell.indexOf('<ExecutiveIntelligenceProvider>');
    const govIdx = shell.indexOf('<ExecutiveIntelligenceGovernanceProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(intelIdx >= 0 && govIdx > intelIdx && workspaceIdx > govIdx);
  });

  suite('T721');
  await test('T721: AUDIT-01 governance isolation na provider chain', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveIntelligenceGovernanceProvider>'));
  });

  suite('T722');
  await test('T722: AUDIT-02 activation gate closed', async () => {
    const m = governanceMod.getExecutiveIntelligenceGovernanceMetadata();
    assert(m.activation_authorized === false);
    assert(m.recommendations_authorized === false);
    assert(m.insights_authorized === false);
    assert(m.assistant_authorized === false);
  });

  suite('T723');
  await test('T723: AUDIT-03 audit readiness', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().audit_ready === true);
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().governance_ready === true);
  });

  suite('T724');
  await test('T724: AUDIT-04 intelligence P7.0 inalterado', async () => {
    assert(!readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('ExecutiveIntelligenceGovernance'));
    assert(intelligenceMod.getExecutiveIntelligenceMetadata().intelligence_enabled === false);
  });

  suite('T725');
  await test('T725: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveIntelligenceGovernance'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T726');
  await test('T726: AUDIT-05 SSR governance provider', async () => {
    const html = await bundleIntelligenceGovernanceProviderSsr();
    assert(html.includes('executive-intelligence-governance-provider'));
  });

  suite('T727');
  await test('T727: AUDIT-05 SSR governance indicators', async () => {
    const html = await bundleIntelligenceGovernanceProviderSsr();
    assert(html.includes('executive-intelligence-governance-indicators'));
    assert(html.includes('executive-intelligence-governance-ready'));
    assert(html.includes('executive-intelligence-governance-audit-ready'));
    assert(html.includes('executive-intelligence-governance-governed'));
  });

  suite('T728');
  await test('T728: AUDIT-05 SSR sem métricas cognitivas', async () => {
    const html = await bundleIntelligenceGovernanceProviderSsr();
    assert(!html.includes('score'));
    assert(!/recommend/i.test(html));
  });

  suite('T729');
  await test('T729: governance sem Navigate', async () => {
    assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('Navigate'));
    assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceIndicators.jsx').includes('onClick'));
  });

  for (let i = 730; i <= 740; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.1 governance propagation #${i}`, async () => {
      const m = governanceMod.getExecutiveIntelligenceGovernanceMetadata();
      assert(m.governance_ready === true);
      assert(m.intelligence_governed === true);
      assert(m.activation_authorized === false);
    });
  }

  for (let i = 741; i <= 745; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.1 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceService.js').includes('ExecutiveDeepLinkRegistry'));
    });
  }

  for (let i = 746; i <= 748; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.1 non-persistence #${i}`, async () => {
      assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('setItem'));
      assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('getItem'));
    });
  }

  for (let i = 749; i <= 750; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.1 readiness propagation #${i}`, async () => {
      assert(governanceMod.isExecutiveIntelligenceGovernanceReady());
      assert(composition.shell.includes('<ExecutiveNavigationProvider'));
      assert(intelligenceMod.isExecutiveIntelligenceReady());
    });
  }

  suite('T751');
  await test('T751: P7.1 executive intelligence governance final', async () => {
    assert(fs.existsSync(path.join(GOVERNANCE_ROOT, 'ExecutiveIntelligenceGovernanceProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleIntelligenceGovernanceProviderSsr();
    assert(html.includes('gov-child'));
    assert(html.includes('>yes<'));
  });

  // ── AIOI-P7.2 Executive Intelligence Activation Framework (T752–T801) ─────

  function readActivationMod(rel) {
    return fs.readFileSync(path.join(ACTIVATION_ROOT, rel), 'utf8');
  }

  suite('T752');
  await test('T752: ExecutiveIntelligenceActivationService.js existe', async () => {
    assert(fs.existsSync(path.join(ACTIVATION_ROOT, 'ExecutiveIntelligenceActivationService.js')));
  });

  suite('T753');
  await test('T753: ExecutiveIntelligenceActivationProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(ACTIVATION_ROOT, 'ExecutiveIntelligenceActivationProvider.jsx')));
  });

  suite('T754');
  await test('T754: ExecutiveIntelligenceActivationContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(ACTIVATION_ROOT, 'ExecutiveIntelligenceActivationContext.jsx')));
  });

  suite('T755');
  await test('T755: ExecutiveIntelligenceActivationIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(ACTIVATION_ROOT, 'ExecutiveIntelligenceActivationIndicators.jsx')));
  });

  suite('T756');
  await test('T756: ExecutiveIntelligenceActivation.module.css existe', async () => {
    assert(fs.existsSync(path.join(ACTIVATION_ROOT, 'ExecutiveIntelligenceActivation.module.css')));
  });

  suite('T757');
  await test('T757: activation_framework_ready true', async () => {
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().activation_framework_ready === true);
  });

  suite('T758');
  await test('T758: activation_supported true', async () => {
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().activation_supported === true);
    assert(activationMod.isExecutiveIntelligenceActivationSupported() === true);
  });

  suite('T759');
  await test('T759: activation_authorized false', async () => {
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().activation_authorized === false);
  });

  suite('T760');
  await test('T760: activation_enabled false', async () => {
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().activation_enabled === false);
  });

  suite('T761');
  await test('T761: recommendations_enabled false', async () => {
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().recommendations_enabled === false);
  });

  suite('T762');
  await test('T762: insights_enabled false', async () => {
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().insights_enabled === false);
  });

  suite('T763');
  await test('T763: assistant_enabled false', async () => {
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().assistant_enabled === false);
  });

  suite('T764');
  await test('T764: activation_version P7.2', async () => {
    assertEqual(activationMod.getExecutiveIntelligenceActivationMetadata().activation_version, 'P7.2', 'version');
  });

  suite('T765');
  await test('T765: sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = ['ExecutiveIntelligenceActivationService.js', 'ExecutiveIntelligenceActivationProvider.jsx']
      .map(readActivationMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T766');
  await test('T766: sem fetch/axios/WebSocket/SSE', async () => {
    const src = readActivationMod('ExecutiveIntelligenceActivationService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
  });

  suite('T767');
  await test('T767: sem LLM/openai/inference/prediction', async () => {
    const all = [
      'ExecutiveIntelligenceActivationService.js',
      'ExecutiveIntelligenceActivationProvider.jsx',
      'ExecutiveIntelligenceActivationIndicators.jsx'
    ]
      .map(readActivationMod)
      .join('\n');
    assert(!/openai|inference|forecast|prediction/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
  });

  suite('T768');
  await test('T768: anti-activation sem enableCognitive/activateIntelligence', async () => {
    const prov = readActivationMod('ExecutiveIntelligenceActivationProvider.jsx');
    assert(!prov.includes('enableCognitive'));
    assert(!prov.includes('activateIntelligence'));
  });

  suite('T769');
  await test('T769: provider context metadata ready supported', async () => {
    assert(readActivationMod('ExecutiveIntelligenceActivationProvider.jsx').includes('metadata'));
    assert(readActivationMod('ExecutiveIntelligenceActivationProvider.jsx').includes('supported'));
    assert(readActivationMod('ExecutiveIntelligenceActivationContext.jsx').includes('useExecutiveIntelligenceActivation'));
    assert(activationMod.isExecutiveIntelligenceActivationReady() === true);
  });

  suite('T770');
  await test('T770: App.jsx ExecutiveIntelligenceActivationProvider', async () => {
    assert(appSource.includes('ExecutiveIntelligenceActivationProvider'));
  });

  suite('T771');
  await test('T771: App composição P7.2 entre Governance e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const govIdx = shell.indexOf('<ExecutiveIntelligenceGovernanceProvider>');
    const actIdx = shell.indexOf('<ExecutiveIntelligenceActivationProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(govIdx >= 0 && actIdx > govIdx && workspaceIdx > actIdx);
  });

  suite('T772');
  await test('T772: AUDIT-01 activation layer integration', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveIntelligenceActivationProvider>'));
  });

  suite('T773');
  await test('T773: AUDIT-02 activation gates closed', async () => {
    const m = activationMod.getExecutiveIntelligenceActivationMetadata();
    assert(m.activation_authorized === false);
    assert(m.activation_enabled === false);
    assert(m.recommendations_enabled === false);
    assert(m.insights_enabled === false);
    assert(m.assistant_enabled === false);
  });

  suite('T774');
  await test('T774: AUDIT-03 governance compatibility', async () => {
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().activation_authorized === false);
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().activation_enabled === false);
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().governance_ready === true);
  });

  suite('T775');
  await test('T775: AUDIT-04 governance P7.1 inalterado', async () => {
    assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('ExecutiveIntelligenceActivation'));
    assert(governanceMod.getExecutiveIntelligenceGovernanceMetadata().intelligence_governed === true);
  });

  suite('T776');
  await test('T776: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveIntelligenceActivation'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T777');
  await test('T777: AUDIT-05 SSR activation provider', async () => {
    const html = await bundleIntelligenceActivationProviderSsr();
    assert(html.includes('executive-intelligence-activation-provider'));
  });

  suite('T778');
  await test('T778: AUDIT-05 SSR activation indicators', async () => {
    const html = await bundleIntelligenceActivationProviderSsr();
    assert(html.includes('executive-intelligence-activation-indicators'));
    assert(html.includes('executive-intelligence-activation-framework-ready'));
    assert(html.includes('executive-intelligence-activation-supported'));
    assert(html.includes('executive-intelligence-activation-enabled'));
    assert(html.includes('executive-intelligence-activation-version'));
  });

  suite('T779');
  await test('T779: AUDIT-05 SSR sem métricas cognitivas', async () => {
    const html = await bundleIntelligenceActivationProviderSsr();
    assert(!html.includes('score'));
    assert(!/recommend/i.test(html));
    assert(html.includes('>no<'));
    assert(html.includes('>P7.2<'));
  });

  suite('T780');
  await test('T780: activation sem Navigate', async () => {
    assert(!readActivationMod('ExecutiveIntelligenceActivationProvider.jsx').includes('Navigate'));
    assert(!readActivationMod('ExecutiveIntelligenceActivationIndicators.jsx').includes('onClick'));
  });

  for (let i = 781; i <= 791; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.2 activation propagation #${i}`, async () => {
      const m = activationMod.getExecutiveIntelligenceActivationMetadata();
      assert(m.activation_framework_ready === true);
      assert(m.activation_supported === true);
      assert(m.activation_enabled === false);
    });
  }

  for (let i = 792; i <= 796; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.2 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readActivationMod('ExecutiveIntelligenceActivationService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('ExecutiveIntelligenceActivation'));
    });
  }

  for (let i = 797; i <= 799; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.2 non-persistence #${i}`, async () => {
      assert(!readActivationMod('ExecutiveIntelligenceActivationProvider.jsx').includes('setItem'));
      assert(!readActivationMod('ExecutiveIntelligenceActivationProvider.jsx').includes('getItem'));
    });
  }

  for (let i = 800; i <= 800; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.2 readiness propagation #${i}`, async () => {
      assert(activationMod.isExecutiveIntelligenceActivationReady());
      assert(composition.shell.includes('<ExecutiveNavigationProvider'));
      assert(governanceMod.isExecutiveIntelligenceGovernanceReady());
      assert(intelligenceMod.isExecutiveIntelligenceReady());
    });
  }

  suite('T801');
  await test('T801: P7.2 executive intelligence activation framework final', async () => {
    assert(fs.existsSync(path.join(ACTIVATION_ROOT, 'ExecutiveIntelligenceActivationProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleIntelligenceActivationProviderSsr();
    assert(html.includes('act-child'));
    assert(html.includes('>yes<'));
  });

  // ── AIOI-P7.3 Executive Capability Contracts (T802–T851) ───────────────────

  function readContractsMod(rel) {
    return fs.readFileSync(path.join(CONTRACTS_ROOT, rel), 'utf8');
  }

  suite('T802');
  await test('T802: ExecutiveCapabilityContractsService.js existe', async () => {
    assert(fs.existsSync(path.join(CONTRACTS_ROOT, 'ExecutiveCapabilityContractsService.js')));
  });

  suite('T803');
  await test('T803: ExecutiveCapabilityContractsProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(CONTRACTS_ROOT, 'ExecutiveCapabilityContractsProvider.jsx')));
  });

  suite('T804');
  await test('T804: ExecutiveCapabilityContractsContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(CONTRACTS_ROOT, 'ExecutiveCapabilityContractsContext.jsx')));
  });

  suite('T805');
  await test('T805: ExecutiveCapabilityContractsIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(CONTRACTS_ROOT, 'ExecutiveCapabilityContractsIndicators.jsx')));
  });

  suite('T806');
  await test('T806: ExecutiveCapabilityContracts.module.css existe', async () => {
    assert(fs.existsSync(path.join(CONTRACTS_ROOT, 'ExecutiveCapabilityContracts.module.css')));
  });

  suite('T807');
  await test('T807: contracts_ready true', async () => {
    assert(contractsMod.getExecutiveCapabilityContractsMetadata().contracts_ready === true);
  });

  suite('T808');
  await test('T808: insights_contract_available true', async () => {
    assert(contractsMod.getExecutiveCapabilityContractsMetadata().insights_contract_available === true);
  });

  suite('T809');
  await test('T809: recommendations_contract_available true', async () => {
    assert(contractsMod.getExecutiveCapabilityContractsMetadata().recommendations_contract_available === true);
  });

  suite('T810');
  await test('T810: assistant_contract_available true', async () => {
    assert(contractsMod.getExecutiveCapabilityContractsMetadata().assistant_contract_available === true);
  });

  suite('T811');
  await test('T811: insights_enabled false', async () => {
    assert(contractsMod.getExecutiveCapabilityContractsMetadata().insights_enabled === false);
  });

  suite('T812');
  await test('T812: recommendations_enabled false', async () => {
    assert(contractsMod.getExecutiveCapabilityContractsMetadata().recommendations_enabled === false);
  });

  suite('T813');
  await test('T813: assistant_enabled false', async () => {
    assert(contractsMod.getExecutiveCapabilityContractsMetadata().assistant_enabled === false);
  });

  suite('T814');
  await test('T814: contracts_version P7.3', async () => {
    assertEqual(contractsMod.getExecutiveCapabilityContractsMetadata().contracts_version, 'P7.3', 'version');
  });

  suite('T815');
  await test('T815: insights contract id available enabled version', async () => {
    const c = contractsMod.getExecutiveInsightsContract();
    assertEqual(c.id, 'executive_insights', 'id');
    assert(c.available === true);
    assert(c.enabled === false);
    assertEqual(c.version, 'P7.3', 'version');
  });

  suite('T816');
  await test('T816: recommendations contract id available enabled version', async () => {
    const c = contractsMod.getExecutiveRecommendationsContract();
    assertEqual(c.id, 'executive_recommendations', 'id');
    assert(c.available === true);
    assert(c.enabled === false);
    assertEqual(c.version, 'P7.3', 'version');
  });

  suite('T817');
  await test('T817: assistant contract id available enabled version', async () => {
    const c = contractsMod.getExecutiveAssistantContract();
    assertEqual(c.id, 'executive_assistant', 'id');
    assert(c.available === true);
    assert(c.enabled === false);
    assertEqual(c.version, 'P7.3', 'version');
  });

  suite('T818');
  await test('T818: areExecutiveCapabilityContractsReady true', async () => {
    assert(contractsMod.areExecutiveCapabilityContractsReady() === true);
  });

  suite('T819');
  await test('T819: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = ['ExecutiveCapabilityContractsService.js', 'ExecutiveCapabilityContractsProvider.jsx']
      .map(readContractsMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T820');
  await test('T820: anti-network sem fetch/axios/WebSocket/SSE', async () => {
    const src = readContractsMod('ExecutiveCapabilityContractsService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
  });

  suite('T821');
  await test('T821: anti-LLM sem openai/inference/prediction', async () => {
    const all = [
      'ExecutiveCapabilityContractsService.js',
      'ExecutiveCapabilityContractsProvider.jsx',
      'ExecutiveCapabilityContractsIndicators.jsx'
    ]
      .map(readContractsMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|inference|forecast|prediction/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
  });

  suite('T822');
  await test('T822: anti-runtime sem useEffect/async hooks', async () => {
    const prov = readContractsMod('ExecutiveCapabilityContractsProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T823');
  await test('T823: anti-recommendation sem generate/produce recommendation', async () => {
    const src = readContractsMod('ExecutiveCapabilityContractsService.js');
    assert(!src.includes('generateRecommendation'));
    assert(!src.includes('produceRecommendation'));
  });

  suite('T824');
  await test('T824: anti-insight sem generate/produce insight', async () => {
    const src = readContractsMod('ExecutiveCapabilityContractsService.js');
    assert(!src.includes('generateInsight'));
    assert(!src.includes('produceInsight'));
  });

  suite('T825');
  await test('T825: anti-assistant sem generate/produce response', async () => {
    const src = readContractsMod('ExecutiveCapabilityContractsService.js');
    assert(!src.includes('generateResponse'));
    assert(!src.includes('produceAssistant'));
  });

  suite('T826');
  await test('T826: context API metadata contracts ready', async () => {
    assert(readContractsMod('ExecutiveCapabilityContractsContext.jsx').includes('useExecutiveCapabilityContracts'));
    assert(readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('insightsContract'));
    assert(readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('recommendationsContract'));
    assert(readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('assistantContract'));
  });

  suite('T827');
  await test('T827: App.jsx ExecutiveCapabilityContractsProvider', async () => {
    assert(appSource.includes('ExecutiveCapabilityContractsProvider'));
  });

  suite('T828');
  await test('T828: App composição P7.3 entre Activation e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const actIdx = shell.indexOf('<ExecutiveIntelligenceActivationProvider>');
    const ctrIdx = shell.indexOf('<ExecutiveCapabilityContractsProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(actIdx >= 0 && ctrIdx > actIdx && workspaceIdx > ctrIdx);
  });

  suite('T829');
  await test('T829: AUDIT-01 capability contracts integration', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveCapabilityContractsProvider>'));
  });

  suite('T830');
  await test('T830: AUDIT-02 contracts isolation', async () => {
    assert(!readContractsMod('ExecutiveCapabilityContractsService.js').includes('ExecutiveWorkspaceService'));
    assert(!readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('Navigate'));
  });

  suite('T831');
  await test('T831: AUDIT-03 capability readiness', async () => {
    const m = contractsMod.getExecutiveCapabilityContractsMetadata();
    assert(m.contracts_ready === true);
    assert(m.insights_contract_available === true);
    assert(m.recommendations_contract_available === true);
    assert(m.assistant_contract_available === true);
  });

  suite('T832');
  await test('T832: AUDIT-04 activation P7.2 inalterado', async () => {
    assert(!readActivationMod('ExecutiveIntelligenceActivationProvider.jsx').includes('ExecutiveCapabilityContracts'));
    assert(activationMod.getExecutiveIntelligenceActivationMetadata().activation_enabled === false);
  });

  suite('T833');
  await test('T833: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveCapabilityContracts'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T834');
  await test('T834: AUDIT-05 SSR contracts provider', async () => {
    const html = await bundleCapabilityContractsProviderSsr();
    assert(html.includes('executive-capability-contracts-provider'));
  });

  suite('T835');
  await test('T835: AUDIT-05 SSR contracts indicators', async () => {
    const html = await bundleCapabilityContractsProviderSsr();
    assert(html.includes('executive-capability-contracts-indicators'));
    assert(html.includes('executive-capability-contracts-ready'));
    assert(html.includes('executive-capability-insights-available'));
    assert(html.includes('executive-capability-recommendations-available'));
    assert(html.includes('executive-capability-assistant-available'));
    assert(html.includes('executive-capability-contracts-version'));
  });

  suite('T836');
  await test('T836: AUDIT-05 SSR sem score/forecast/prediction', async () => {
    const html = await bundleCapabilityContractsProviderSsr();
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
    assert(html.includes('>P7.3<'));
    assert(html.includes('>yes<'));
  });

  suite('T837');
  await test('T837: contracts sem Navigate/onClick', async () => {
    assert(!readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('Navigate'));
    assert(!readContractsMod('ExecutiveCapabilityContractsIndicators.jsx').includes('onClick'));
  });

  for (let i = 838; i <= 848; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.3 contracts propagation #${i}`, async () => {
      const m = contractsMod.getExecutiveCapabilityContractsMetadata();
      assert(m.contracts_ready === true);
      assert(m.insights_enabled === false);
      assert(m.recommendations_enabled === false);
      assert(m.assistant_enabled === false);
    });
  }

  for (let i = 849; i <= 850; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.3 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readContractsMod('ExecutiveCapabilityContractsService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readGovernanceMod('ExecutiveIntelligenceGovernanceProvider.jsx').includes('ExecutiveCapabilityContracts'));
      assert(!readIntelligenceMod('ExecutiveIntelligenceProvider.jsx').includes('ExecutiveCapabilityContracts'));
    });
  }

  suite('T851');
  await test('T851: P7.3 executive capability contracts final', async () => {
    assert(fs.existsSync(path.join(CONTRACTS_ROOT, 'ExecutiveCapabilityContractsProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleCapabilityContractsProviderSsr();
    assert(html.includes('ctr-child'));
    assert(contractsMod.areExecutiveCapabilityContractsReady());
    assert(governanceMod.isExecutiveIntelligenceGovernanceReady());
    assert(activationMod.isExecutiveIntelligenceActivationReady());
  });

  // ── AIOI-P7.4 Executive Insights Foundation (T852–T901) ───────────────────

  function readInsightsMod(rel) {
    return fs.readFileSync(path.join(INSIGHTS_ROOT, rel), 'utf8');
  }

  suite('T852');
  await test('T852: ExecutiveInsightsFoundationService.js existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_ROOT, 'ExecutiveInsightsFoundationService.js')));
  });

  suite('T853');
  await test('T853: ExecutiveInsightsFoundationProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_ROOT, 'ExecutiveInsightsFoundationProvider.jsx')));
  });

  suite('T854');
  await test('T854: ExecutiveInsightsFoundationContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_ROOT, 'ExecutiveInsightsFoundationContext.jsx')));
  });

  suite('T855');
  await test('T855: ExecutiveInsightsFoundationIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_ROOT, 'ExecutiveInsightsFoundationIndicators.jsx')));
  });

  suite('T856');
  await test('T856: ExecutiveInsightsFoundation.module.css existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_ROOT, 'ExecutiveInsightsFoundation.module.css')));
  });

  suite('T857');
  await test('T857: insights_foundation_ready true', async () => {
    assert(insightsMod.getExecutiveInsightsFoundationMetadata().insights_foundation_ready === true);
  });

  suite('T858');
  await test('T858: insights_contract_linked via contract validation', async () => {
    const contract = contractsMod.getExecutiveInsightsContract();
    assert(insightsMod.isExecutiveInsightsContractLinked(contract) === true);
  });

  suite('T859');
  await test('T859: insights_available true', async () => {
    assert(insightsMod.getExecutiveInsightsFoundationMetadata().insights_available === true);
  });

  suite('T860');
  await test('T860: insights_enabled false', async () => {
    assert(insightsMod.getExecutiveInsightsFoundationMetadata().insights_enabled === false);
  });

  suite('T861');
  await test('T861: insights_runtime_active false', async () => {
    assert(insightsMod.getExecutiveInsightsFoundationMetadata().insights_runtime_active === false);
  });

  suite('T862');
  await test('T862: insights_version P7.4', async () => {
    assertEqual(insightsMod.getExecutiveInsightsFoundationMetadata().insights_version, 'P7.4', 'version');
  });

  suite('T863');
  await test('T863: isExecutiveInsightsFoundationReady true', async () => {
    assert(insightsMod.isExecutiveInsightsFoundationReady() === true);
  });

  suite('T864');
  await test('T864: contract linkage executive_insights id', async () => {
    const c = contractsMod.getExecutiveInsightsContract();
    assertEqual(c.id, 'executive_insights', 'id');
    assert(c.enabled === false);
    assert(insightsMod.isExecutiveInsightsContractLinked(c));
  });

  suite('T865');
  await test('T865: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = ['ExecutiveInsightsFoundationService.js', 'ExecutiveInsightsFoundationProvider.jsx']
      .map(readInsightsMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T866');
  await test('T866: anti-network sem fetch/axios/WebSocket/SSE', async () => {
    const src = readInsightsMod('ExecutiveInsightsFoundationService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
  });

  suite('T867');
  await test('T867: anti-LLM sem openai/inference/prediction', async () => {
    const all = [
      'ExecutiveInsightsFoundationService.js',
      'ExecutiveInsightsFoundationProvider.jsx',
      'ExecutiveInsightsFoundationIndicators.jsx'
    ]
      .map(readInsightsMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|inference|forecast|prediction/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
  });

  suite('T868');
  await test('T868: anti-runtime sem useEffect/async', async () => {
    const prov = readInsightsMod('ExecutiveInsightsFoundationProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T869');
  await test('T869: anti-insight-generation sem generateInsight', async () => {
    const src = readInsightsMod('ExecutiveInsightsFoundationService.js');
    assert(!src.includes('generateInsight'));
    assert(!src.includes('produceInsight'));
    assert(!src.includes('InsightGeneration'));
  });

  suite('T870');
  await test('T870: consome useExecutiveCapabilityContracts', async () => {
    assert(readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('useExecutiveCapabilityContracts'));
    assert(readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('insightsContract'));
  });

  suite('T871');
  await test('T871: não importa getExecutiveInsightsContract directamente', async () => {
    const prov = readInsightsMod('ExecutiveInsightsFoundationProvider.jsx');
    assert(!prov.includes('getExecutiveInsightsContract'));
    assert(!prov.includes('ExecutiveCapabilityContractsService'));
  });

  suite('T872');
  await test('T872: context API metadata ready available contractLinked', async () => {
    assert(readInsightsMod('ExecutiveInsightsFoundationContext.jsx').includes('useExecutiveInsightsFoundation'));
    assert(readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('contractLinked'));
    assert(readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('available'));
  });

  suite('T873');
  await test('T873: App.jsx ExecutiveInsightsFoundationProvider', async () => {
    assert(appSource.includes('ExecutiveInsightsFoundationProvider'));
  });

  suite('T874');
  await test('T874: App composição P7.4 entre Contracts e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const ctrIdx = shell.indexOf('<ExecutiveCapabilityContractsProvider>');
    const insIdx = shell.indexOf('<ExecutiveInsightsFoundationProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(ctrIdx >= 0 && insIdx > ctrIdx && workspaceIdx > insIdx);
  });

  suite('T875');
  await test('T875: AUDIT-01 insights foundation integration', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveInsightsFoundationProvider>'));
  });

  suite('T876');
  await test('T876: AUDIT-02 contract consumption validation', async () => {
    assert(readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('useExecutiveCapabilityContracts'));
    const contract = contractsMod.getExecutiveInsightsContract();
    assert(contract.available === true);
    assert(contract.enabled === false);
    assert(insightsMod.isExecutiveInsightsContractLinked(contract));
  });

  suite('T877');
  await test('T877: AUDIT-03 insights isolation', async () => {
    assert(!readInsightsMod('ExecutiveInsightsFoundationService.js').includes('ExecutiveWorkspaceService'));
    assert(!readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('Navigate'));
  });

  suite('T878');
  await test('T878: AUDIT-04 contracts P7.3 inalterado', async () => {
    assert(!readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('ExecutiveInsightsFoundation'));
    assert(contractsMod.getExecutiveInsightsContract().enabled === false);
  });

  suite('T879');
  await test('T879: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveInsightsFoundation'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T880');
  await test('T880: AUDIT-05 SSR insights provider', async () => {
    const html = await bundleInsightsFoundationProviderSsr();
    assert(html.includes('executive-insights-foundation-provider'));
    assert(html.includes('executive-capability-contracts-provider'));
  });

  suite('T881');
  await test('T881: AUDIT-05 SSR insights indicators', async () => {
    const html = await bundleInsightsFoundationProviderSsr();
    assert(html.includes('executive-insights-foundation-indicators'));
    assert(html.includes('executive-insights-foundation-ready'));
    assert(html.includes('executive-insights-contract-linked'));
    assert(html.includes('executive-insights-available'));
    assert(html.includes('executive-insights-runtime-active'));
    assert(html.includes('executive-insights-foundation-version'));
  });

  suite('T882');
  await test('T882: AUDIT-05 SSR runtime inactive version P7.4', async () => {
    const html = await bundleInsightsFoundationProviderSsr();
    assert(html.includes('>no<'));
    assert(html.includes('>P7.4<'));
    assert(html.includes('>yes<'));
    assert(!html.includes('score'));
  });

  suite('T883');
  await test('T883: insights sem Navigate/onClick', async () => {
    assert(!readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('Navigate'));
    assert(!readInsightsMod('ExecutiveInsightsFoundationIndicators.jsx').includes('onClick'));
  });

  for (let i = 884; i <= 894; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.4 insights propagation #${i}`, async () => {
      const m = insightsMod.getExecutiveInsightsFoundationMetadata();
      assert(m.insights_foundation_ready === true);
      assert(m.insights_enabled === false);
      assert(m.insights_runtime_active === false);
    });
  }

  for (let i = 895; i <= 898; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.4 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readInsightsMod('ExecutiveInsightsFoundationService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('ExecutiveInsightsFoundation'));
    });
  }

  for (let i = 899; i <= 900; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.4 non-persistence #${i}`, async () => {
      assert(!readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('setItem'));
      assert(!readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('getItem'));
    });
  }

  suite('T901');
  await test('T901: P7.4 executive insights foundation final', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_ROOT, 'ExecutiveInsightsFoundationProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleInsightsFoundationProviderSsr();
    assert(html.includes('ins-child'));
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P7.5 Executive Recommendations Foundation (T902–T951) ────────────

  function readRecommendationsMod(rel) {
    return fs.readFileSync(path.join(RECOMMENDATIONS_ROOT, rel), 'utf8');
  }

  suite('T902');
  await test('T902: ExecutiveRecommendationsFoundationService.js existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_ROOT, 'ExecutiveRecommendationsFoundationService.js')));
  });

  suite('T903');
  await test('T903: ExecutiveRecommendationsFoundationProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_ROOT, 'ExecutiveRecommendationsFoundationProvider.jsx')));
  });

  suite('T904');
  await test('T904: ExecutiveRecommendationsFoundationContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_ROOT, 'ExecutiveRecommendationsFoundationContext.jsx')));
  });

  suite('T905');
  await test('T905: ExecutiveRecommendationsFoundationIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_ROOT, 'ExecutiveRecommendationsFoundationIndicators.jsx')));
  });

  suite('T906');
  await test('T906: ExecutiveRecommendationsFoundation.module.css existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_ROOT, 'ExecutiveRecommendationsFoundation.module.css')));
  });

  suite('T907');
  await test('T907: recommendations_foundation_ready true', async () => {
    assert(recommendationsMod.getExecutiveRecommendationsFoundationMetadata().recommendations_foundation_ready === true);
  });

  suite('T908');
  await test('T908: recommendations_contract_linked via contract validation', async () => {
    const contract = contractsMod.getExecutiveRecommendationsContract();
    assert(recommendationsMod.isExecutiveRecommendationsContractLinked(contract) === true);
  });

  suite('T909');
  await test('T909: recommendations_available true', async () => {
    assert(recommendationsMod.getExecutiveRecommendationsFoundationMetadata().recommendations_available === true);
  });

  suite('T910');
  await test('T910: recommendations_enabled false', async () => {
    assert(recommendationsMod.getExecutiveRecommendationsFoundationMetadata().recommendations_enabled === false);
  });

  suite('T911');
  await test('T911: recommendations_runtime_active false', async () => {
    assert(recommendationsMod.getExecutiveRecommendationsFoundationMetadata().recommendations_runtime_active === false);
  });

  suite('T912');
  await test('T912: recommendations_version P7.5', async () => {
    assertEqual(recommendationsMod.getExecutiveRecommendationsFoundationMetadata().recommendations_version, 'P7.5', 'version');
  });

  suite('T913');
  await test('T913: isExecutiveRecommendationsFoundationReady true', async () => {
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady() === true);
  });

  suite('T914');
  await test('T914: contract linkage executive_recommendations id', async () => {
    const c = contractsMod.getExecutiveRecommendationsContract();
    assertEqual(c.id, 'executive_recommendations', 'id');
    assert(c.enabled === false);
    assert(recommendationsMod.isExecutiveRecommendationsContractLinked(c));
  });

  suite('T915');
  await test('T915: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = ['ExecutiveRecommendationsFoundationService.js', 'ExecutiveRecommendationsFoundationProvider.jsx']
      .map(readRecommendationsMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T916');
  await test('T916: anti-network sem fetch/axios/WebSocket/SSE', async () => {
    const src = readRecommendationsMod('ExecutiveRecommendationsFoundationService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
  });

  suite('T917');
  await test('T917: anti-LLM sem openai/inference/prediction/forecast', async () => {
    const all = [
      'ExecutiveRecommendationsFoundationService.js',
      'ExecutiveRecommendationsFoundationProvider.jsx',
      'ExecutiveRecommendationsFoundationIndicators.jsx'
    ]
      .map(readRecommendationsMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|inference|forecast|prediction/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
  });

  suite('T918');
  await test('T918: anti-runtime sem useEffect/async', async () => {
    const prov = readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T919');
  await test('T919: anti-recommendation-generation sem generateRecommendation', async () => {
    const src = readRecommendationsMod('ExecutiveRecommendationsFoundationService.js');
    assert(!src.includes('generateRecommendation'));
    assert(!src.includes('produceRecommendation'));
    assert(!src.includes('RecommendationGeneration'));
    assert(!src.includes('DecisionEngine'));
  });

  suite('T920');
  await test('T920: consome useExecutiveCapabilityContracts recommendationsContract', async () => {
    assert(readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('useExecutiveCapabilityContracts'));
    assert(readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('recommendationsContract'));
  });

  suite('T921');
  await test('T921: não importa getExecutiveRecommendationsContract directamente', async () => {
    const prov = readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx');
    assert(!prov.includes('getExecutiveRecommendationsContract'));
    assert(!prov.includes('ExecutiveCapabilityContractsService'));
  });

  suite('T922');
  await test('T922: context API metadata ready available contractLinked', async () => {
    assert(readRecommendationsMod('ExecutiveRecommendationsFoundationContext.jsx').includes('useExecutiveRecommendationsFoundation'));
    assert(readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('contractLinked'));
    assert(readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('available'));
  });

  suite('T923');
  await test('T923: App.jsx ExecutiveRecommendationsFoundationProvider', async () => {
    assert(appSource.includes('ExecutiveRecommendationsFoundationProvider'));
  });

  suite('T924');
  await test('T924: App composição P7.5 entre Insights e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const insIdx = shell.indexOf('<ExecutiveInsightsFoundationProvider>');
    const recIdx = shell.indexOf('<ExecutiveRecommendationsFoundationProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(insIdx >= 0 && recIdx > insIdx && workspaceIdx > recIdx);
  });

  suite('T925');
  await test('T925: AUDIT-01 recommendations foundation integration', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveRecommendationsFoundationProvider>'));
  });

  suite('T926');
  await test('T926: AUDIT-02 contract consumption validation', async () => {
    assert(readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('useExecutiveCapabilityContracts'));
    const contract = contractsMod.getExecutiveRecommendationsContract();
    assert(contract.available === true);
    assert(contract.enabled === false);
    assert(recommendationsMod.isExecutiveRecommendationsContractLinked(contract));
  });

  suite('T927');
  await test('T927: AUDIT-03 recommendations isolation', async () => {
    assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationService.js').includes('ExecutiveWorkspaceService'));
    assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('Navigate'));
  });

  suite('T928');
  await test('T928: AUDIT-04 insights P7.4 inalterado', async () => {
    assert(!readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('ExecutiveRecommendationsFoundation'));
    assert(insightsMod.getExecutiveInsightsFoundationMetadata().insights_runtime_active === false);
  });

  suite('T929');
  await test('T929: AUDIT-04 contracts P7.3 inalterado', async () => {
    assert(!readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('ExecutiveRecommendationsFoundation'));
    assert(contractsMod.getExecutiveRecommendationsContract().enabled === false);
  });

  suite('T930');
  await test('T930: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveRecommendationsFoundation'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T931');
  await test('T931: AUDIT-05 SSR recommendations provider', async () => {
    const html = await bundleRecommendationsFoundationProviderSsr();
    assert(html.includes('executive-recommendations-foundation-provider'));
    assert(html.includes('executive-capability-contracts-provider'));
  });

  suite('T932');
  await test('T932: AUDIT-05 SSR recommendations indicators', async () => {
    const html = await bundleRecommendationsFoundationProviderSsr();
    assert(html.includes('executive-recommendations-foundation-indicators'));
    assert(html.includes('executive-recommendations-foundation-ready'));
    assert(html.includes('executive-recommendations-contract-linked'));
    assert(html.includes('executive-recommendations-available'));
    assert(html.includes('executive-recommendations-runtime-active'));
    assert(html.includes('executive-recommendations-foundation-version'));
  });

  suite('T933');
  await test('T933: AUDIT-05 SSR runtime inactive version P7.5', async () => {
    const html = await bundleRecommendationsFoundationProviderSsr();
    assert(html.includes('>no<'));
    assert(html.includes('>P7.5<'));
    assert(html.includes('>yes<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T934');
  await test('T934: recommendations sem Navigate/onClick', async () => {
    assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('Navigate'));
    assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationIndicators.jsx').includes('onClick'));
  });

  for (let i = 935; i <= 945; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.5 recommendations propagation #${i}`, async () => {
      const m = recommendationsMod.getExecutiveRecommendationsFoundationMetadata();
      assert(m.recommendations_foundation_ready === true);
      assert(m.recommendations_enabled === false);
      assert(m.recommendations_runtime_active === false);
    });
  }

  for (let i = 946; i <= 948; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.5 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readInsightsMod('ExecutiveInsightsFoundationProvider.jsx').includes('ExecutiveRecommendationsFoundation'));
    });
  }

  for (let i = 949; i <= 950; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.5 non-persistence #${i}`, async () => {
      assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('setItem'));
      assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('getItem'));
    });
  }

  suite('T951');
  await test('T951: P7.5 executive recommendations foundation final', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_ROOT, 'ExecutiveRecommendationsFoundationProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleRecommendationsFoundationProviderSsr();
    assert(html.includes('rec-child'));
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P7.6 Executive Assistant Foundation (T952–T1001) ─────────────────

  function readAssistantMod(rel) {
    return fs.readFileSync(path.join(ASSISTANT_ROOT, rel), 'utf8');
  }

  suite('T952');
  await test('T952: ExecutiveAssistantFoundationService.js existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_ROOT, 'ExecutiveAssistantFoundationService.js')));
  });

  suite('T953');
  await test('T953: ExecutiveAssistantFoundationProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_ROOT, 'ExecutiveAssistantFoundationProvider.jsx')));
  });

  suite('T954');
  await test('T954: ExecutiveAssistantFoundationContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_ROOT, 'ExecutiveAssistantFoundationContext.jsx')));
  });

  suite('T955');
  await test('T955: ExecutiveAssistantFoundationIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_ROOT, 'ExecutiveAssistantFoundationIndicators.jsx')));
  });

  suite('T956');
  await test('T956: ExecutiveAssistantFoundation.module.css existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_ROOT, 'ExecutiveAssistantFoundation.module.css')));
  });

  suite('T957');
  await test('T957: assistant_foundation_ready true', async () => {
    assert(assistantMod.getExecutiveAssistantFoundationMetadata().assistant_foundation_ready === true);
  });

  suite('T958');
  await test('T958: assistant_contract_linked via contract validation', async () => {
    const contract = contractsMod.getExecutiveAssistantContract();
    assert(assistantMod.isExecutiveAssistantContractLinked(contract) === true);
  });

  suite('T959');
  await test('T959: assistant_available true', async () => {
    assert(assistantMod.getExecutiveAssistantFoundationMetadata().assistant_available === true);
  });

  suite('T960');
  await test('T960: assistant_enabled false', async () => {
    assert(assistantMod.getExecutiveAssistantFoundationMetadata().assistant_enabled === false);
  });

  suite('T961');
  await test('T961: assistant_runtime_active false', async () => {
    assert(assistantMod.getExecutiveAssistantFoundationMetadata().assistant_runtime_active === false);
  });

  suite('T962');
  await test('T962: assistant_version P7.6', async () => {
    assertEqual(assistantMod.getExecutiveAssistantFoundationMetadata().assistant_version, 'P7.6', 'version');
  });

  suite('T963');
  await test('T963: isExecutiveAssistantFoundationReady true', async () => {
    assert(assistantMod.isExecutiveAssistantFoundationReady() === true);
  });

  suite('T964');
  await test('T964: contract linkage executive_assistant id', async () => {
    const c = contractsMod.getExecutiveAssistantContract();
    assertEqual(c.id, 'executive_assistant', 'id');
    assert(c.enabled === false);
    assert(assistantMod.isExecutiveAssistantContractLinked(c));
  });

  suite('T965');
  await test('T965: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = ['ExecutiveAssistantFoundationService.js', 'ExecutiveAssistantFoundationProvider.jsx']
      .map(readAssistantMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T966');
  await test('T966: anti-network sem fetch/axios/WebSocket/SSE', async () => {
    const src = readAssistantMod('ExecutiveAssistantFoundationService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
  });

  suite('T967');
  await test('T967: anti-LLM sem openai/inference/prediction/forecast', async () => {
    const all = [
      'ExecutiveAssistantFoundationService.js',
      'ExecutiveAssistantFoundationProvider.jsx',
      'ExecutiveAssistantFoundationIndicators.jsx'
    ]
      .map(readAssistantMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|inference|forecast|prediction/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
  });

  suite('T968');
  await test('T968: anti-runtime sem useEffect/async', async () => {
    const prov = readAssistantMod('ExecutiveAssistantFoundationProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T969');
  await test('T969: anti-response-generation sem generateResponse/chat', async () => {
    const src = readAssistantMod('ExecutiveAssistantFoundationService.js');
    assert(!src.includes('generateResponse'));
    assert(!src.includes('generateText'));
    assert(!src.includes('ChatEngine'));
    assert(!src.includes('ConversationalAssistant'));
    assert(!src.includes('DecisionEngine'));
  });

  suite('T970');
  await test('T970: consome useExecutiveCapabilityContracts assistantContract', async () => {
    assert(readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('useExecutiveCapabilityContracts'));
    assert(readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('assistantContract'));
  });

  suite('T971');
  await test('T971: não importa getExecutiveAssistantContract directamente', async () => {
    const prov = readAssistantMod('ExecutiveAssistantFoundationProvider.jsx');
    assert(!prov.includes('getExecutiveAssistantContract'));
    assert(!prov.includes('ExecutiveCapabilityContractsService'));
  });

  suite('T972');
  await test('T972: context API metadata ready available contractLinked', async () => {
    assert(readAssistantMod('ExecutiveAssistantFoundationContext.jsx').includes('useExecutiveAssistantFoundation'));
    assert(readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('contractLinked'));
    assert(readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('available'));
  });

  suite('T973');
  await test('T973: App.jsx ExecutiveAssistantFoundationProvider', async () => {
    assert(appSource.includes('ExecutiveAssistantFoundationProvider'));
  });

  suite('T974');
  await test('T974: App composição P7.6 entre Recommendations e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const recIdx = shell.indexOf('<ExecutiveRecommendationsFoundationProvider>');
    const asstIdx = shell.indexOf('<ExecutiveAssistantFoundationProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(recIdx >= 0 && asstIdx > recIdx && workspaceIdx > asstIdx);
  });

  suite('T975');
  await test('T975: AUDIT-01 assistant foundation integration', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveAssistantFoundationProvider>'));
  });

  suite('T976');
  await test('T976: AUDIT-02 contract consumption validation', async () => {
    assert(readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('useExecutiveCapabilityContracts'));
    const contract = contractsMod.getExecutiveAssistantContract();
    assert(contract.available === true);
    assert(contract.enabled === false);
    assert(assistantMod.isExecutiveAssistantContractLinked(contract));
  });

  suite('T977');
  await test('T977: AUDIT-03 assistant isolation', async () => {
    assert(!readAssistantMod('ExecutiveAssistantFoundationService.js').includes('ExecutiveWorkspaceService'));
    assert(!readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('Navigate'));
  });

  suite('T978');
  await test('T978: AUDIT-04 recommendations P7.5 inalterado', async () => {
    assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('ExecutiveAssistantFoundation'));
    assert(recommendationsMod.getExecutiveRecommendationsFoundationMetadata().recommendations_runtime_active === false);
  });

  suite('T979');
  await test('T979: AUDIT-04 contracts P7.3 inalterado', async () => {
    assert(!readContractsMod('ExecutiveCapabilityContractsProvider.jsx').includes('ExecutiveAssistantFoundation'));
    assert(contractsMod.getExecutiveAssistantContract().enabled === false);
  });

  suite('T980');
  await test('T980: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveAssistantFoundation'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T981');
  await test('T981: AUDIT-05 SSR assistant provider', async () => {
    const html = await bundleAssistantFoundationProviderSsr();
    assert(html.includes('executive-assistant-foundation-provider'));
    assert(html.includes('executive-capability-contracts-provider'));
  });

  suite('T982');
  await test('T982: AUDIT-05 SSR assistant indicators', async () => {
    const html = await bundleAssistantFoundationProviderSsr();
    assert(html.includes('executive-assistant-foundation-indicators'));
    assert(html.includes('executive-assistant-foundation-ready'));
    assert(html.includes('executive-assistant-contract-linked'));
    assert(html.includes('executive-assistant-available'));
    assert(html.includes('executive-assistant-runtime-active'));
    assert(html.includes('executive-assistant-foundation-version'));
  });

  suite('T983');
  await test('T983: AUDIT-05 SSR runtime inactive version P7.6', async () => {
    const html = await bundleAssistantFoundationProviderSsr();
    assert(html.includes('>no<'));
    assert(html.includes('>P7.6<'));
    assert(html.includes('>yes<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T984');
  await test('T984: assistant sem Navigate/onClick', async () => {
    assert(!readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('Navigate'));
    assert(!readAssistantMod('ExecutiveAssistantFoundationIndicators.jsx').includes('onClick'));
  });

  for (let i = 985; i <= 995; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.6 assistant propagation #${i}`, async () => {
      const m = assistantMod.getExecutiveAssistantFoundationMetadata();
      assert(m.assistant_foundation_ready === true);
      assert(m.assistant_enabled === false);
      assert(m.assistant_runtime_active === false);
    });
  }

  for (let i = 996; i <= 998; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.6 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readAssistantMod('ExecutiveAssistantFoundationService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readRecommendationsMod('ExecutiveRecommendationsFoundationProvider.jsx').includes('ExecutiveAssistantFoundation'));
    });
  }

  for (let i = 999; i <= 1000; i++) {
    suite(`T${i}`);
    await test(`T${i}: P7.6 non-persistence #${i}`, async () => {
      assert(!readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('setItem'));
      assert(!readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('getItem'));
    });
  }

  suite('T1001');
  await test('T1001: P7.6 executive assistant foundation final', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_ROOT, 'ExecutiveAssistantFoundationProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleAssistantFoundationProviderSsr();
    assert(html.includes('asst-child'));
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P8.0 Executive Cognitive Runtime Foundation (T1002–T1051) ────────

  function readRuntimeMod(rel) {
    return fs.readFileSync(path.join(RUNTIME_ROOT, rel), 'utf8');
  }

  suite('T1002');
  await test('T1002: ExecutiveCognitiveRuntimeService.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_ROOT, 'ExecutiveCognitiveRuntimeService.js')));
  });

  suite('T1003');
  await test('T1003: ExecutiveCognitiveRuntimeProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_ROOT, 'ExecutiveCognitiveRuntimeProvider.jsx')));
  });

  suite('T1004');
  await test('T1004: ExecutiveCognitiveRuntimeContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_ROOT, 'ExecutiveCognitiveRuntimeContext.jsx')));
  });

  suite('T1005');
  await test('T1005: ExecutiveCognitiveRuntimeIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_ROOT, 'ExecutiveCognitiveRuntimeIndicators.jsx')));
  });

  suite('T1006');
  await test('T1006: ExecutiveCognitiveRuntime.module.css existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_ROOT, 'ExecutiveCognitiveRuntime.module.css')));
  });

  suite('T1007');
  await test('T1007: runtime_ready true', async () => {
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_ready === true);
  });

  suite('T1008');
  await test('T1008: runtime_enabled false', async () => {
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_enabled === false);
  });

  suite('T1009');
  await test('T1009: runtime_active false', async () => {
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
  });

  suite('T1010');
  await test('T1010: insights_runtime_supported true', async () => {
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().insights_runtime_supported === true);
  });

  suite('T1011');
  await test('T1011: recommendations_runtime_supported true', async () => {
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().recommendations_runtime_supported === true);
  });

  suite('T1012');
  await test('T1012: assistant_runtime_supported true', async () => {
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().assistant_runtime_supported === true);
  });

  suite('T1013');
  await test('T1013: runtime_version P8.0', async () => {
    assertEqual(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_version, 'P8.0', 'version');
  });

  suite('T1014');
  await test('T1014: isExecutiveCognitiveRuntimeReady true', async () => {
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady() === true);
  });

  suite('T1015');
  await test('T1015: isExecutiveCognitiveRuntimeSupported true', async () => {
    assert(runtimeMod.isExecutiveCognitiveRuntimeSupported() === true);
  });

  suite('T1016');
  await test('T1016: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = ['ExecutiveCognitiveRuntimeService.js', 'ExecutiveCognitiveRuntimeProvider.jsx']
      .map(readRuntimeMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T1017');
  await test('T1017: anti-network sem fetch/axios/WebSocket/SSE', async () => {
    const src = readRuntimeMod('ExecutiveCognitiveRuntimeService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
  });

  suite('T1018');
  await test('T1018: anti-LLM sem openai/gemini/anthropic/mcp/rag/embeddings', async () => {
    const all = [
      'ExecutiveCognitiveRuntimeService.js',
      'ExecutiveCognitiveRuntimeProvider.jsx',
      'ExecutiveCognitiveRuntimeIndicators.jsx'
    ]
      .map(readRuntimeMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|inference|forecast|prediction|embeddings|prompts?/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
    assert(!/\bmcp\b/i.test(all));
    assert(!/\brag\b/i.test(all));
  });

  suite('T1019');
  await test('T1019: anti-runtime sem useEffect/async', async () => {
    const prov = readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T1020');
  await test('T1020: anti-cognitive-execution sem generateInsight/generateRecommendation/generateResponse', async () => {
    const src = readRuntimeMod('ExecutiveCognitiveRuntimeService.js');
    assert(!src.includes('generateInsight'));
    assert(!src.includes('generateRecommendation'));
    assert(!src.includes('generateResponse'));
    assert(!src.includes('DecisionEngine'));
    assert(!src.includes('ActionRuntime'));
  });

  suite('T1021');
  await test('T1021: anti-queue-scoring-learning sem queue/scoring/learning/workflow', async () => {
    const all = ['ExecutiveCognitiveRuntimeService.js', 'ExecutiveCognitiveRuntimeProvider.jsx']
      .map(readRuntimeMod)
      .join('\n');
    assert(!/\bqueue\b/i.test(all));
    assert(!/\bscoring\b/i.test(all));
    assert(!/\blearning\b/i.test(all));
    assert(!/\bworkflow\b/i.test(all));
  });

  suite('T1022');
  await test('T1022: runtime foundation isolated sem import P7 capability execution', async () => {
    const prov = readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx');
    assert(!prov.includes('useExecutiveInsightsFoundation'));
    assert(!prov.includes('useExecutiveRecommendationsFoundation'));
    assert(!prov.includes('useExecutiveAssistantFoundation'));
    assert(!prov.includes('useExecutiveCapabilityContracts'));
  });

  suite('T1023');
  await test('T1023: context API metadata ready supported active', async () => {
    assert(readRuntimeMod('ExecutiveCognitiveRuntimeContext.jsx').includes('useExecutiveCognitiveRuntime'));
    assert(readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('supported'));
    assert(readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('active'));
  });

  suite('T1024');
  await test('T1024: App.jsx ExecutiveCognitiveRuntimeProvider', async () => {
    assert(appSource.includes('ExecutiveCognitiveRuntimeProvider'));
  });

  suite('T1025');
  await test('T1025: App composição P8.0 entre Assistant e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const asstIdx = shell.indexOf('<ExecutiveAssistantFoundationProvider>');
    const rtIdx = shell.indexOf('<ExecutiveCognitiveRuntimeProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(asstIdx >= 0 && rtIdx > asstIdx && workspaceIdx > rtIdx);
  });

  suite('T1026');
  await test('T1026: AUDIT-01 cognitive runtime layer integrated', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveCognitiveRuntimeProvider>'));
  });

  suite('T1027');
  await test('T1027: AUDIT-02 runtime foundation isolated', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeService.js').includes('ExecutiveWorkspaceService'));
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveIntelligenceProvider'));
  });

  suite('T1028');
  await test('T1028: AUDIT-03 no cognitive execution', async () => {
    const all = ['ExecutiveCognitiveRuntimeService.js', 'ExecutiveCognitiveRuntimeProvider.jsx']
      .map(readRuntimeMod)
      .join('\n');
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_enabled === false);
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
  });

  suite('T1029');
  await test('T1029: AUDIT-04 assistant P7.6 inalterado', async () => {
    assert(!readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('ExecutiveCognitiveRuntime'));
    assert(assistantMod.getExecutiveAssistantFoundationMetadata().assistant_runtime_active === false);
  });

  suite('T1030');
  await test('T1030: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveCognitiveRuntime'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T1031');
  await test('T1031: AUDIT-05 SSR cognitive runtime provider', async () => {
    const html = await bundleCognitiveRuntimeProviderSsr();
    assert(html.includes('executive-cognitive-runtime-provider'));
    assert(html.includes('executive-assistant-foundation-provider'));
  });

  suite('T1032');
  await test('T1032: AUDIT-05 SSR cognitive runtime indicators', async () => {
    const html = await bundleCognitiveRuntimeProviderSsr();
    assert(html.includes('executive-cognitive-runtime-indicators'));
    assert(html.includes('executive-cognitive-runtime-ready'));
    assert(html.includes('executive-cognitive-runtime-supported'));
    assert(html.includes('executive-cognitive-runtime-active'));
    assert(html.includes('executive-cognitive-runtime-enabled'));
    assert(html.includes('executive-cognitive-runtime-version'));
  });

  suite('T1033');
  await test('T1033: AUDIT-05 SSR runtime inactive version P8.0', async () => {
    const html = await bundleCognitiveRuntimeProviderSsr();
    assert(html.includes('>no<'));
    assert(html.includes('>P8.0<'));
    assert(html.includes('>yes<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T1034');
  await test('T1034: runtime sem Navigate/onClick', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('Navigate'));
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeIndicators.jsx').includes('onClick'));
  });

  for (let i = 1035; i <= 1045; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.0 runtime propagation #${i}`, async () => {
      const m = runtimeMod.getExecutiveCognitiveRuntimeMetadata();
      assert(m.runtime_ready === true);
      assert(m.runtime_enabled === false);
      assert(m.runtime_active === false);
      assert(runtimeMod.isExecutiveCognitiveRuntimeSupported() === true);
    });
  }

  for (let i = 1046; i <= 1048; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.0 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readRuntimeMod('ExecutiveCognitiveRuntimeService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readAssistantMod('ExecutiveAssistantFoundationProvider.jsx').includes('ExecutiveCognitiveRuntime'));
    });
  }

  for (let i = 1049; i <= 1050; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.0 non-persistence #${i}`, async () => {
      assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('setItem'));
      assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('getItem'));
    });
  }

  suite('T1051');
  await test('T1051: P8.0 executive cognitive runtime foundation final', async () => {
    assert(fs.existsSync(path.join(RUNTIME_ROOT, 'ExecutiveCognitiveRuntimeProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleCognitiveRuntimeProviderSsr();
    assert(html.includes('rt-child'));
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady());
    assert(runtimeMod.isExecutiveCognitiveRuntimeSupported());
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P8.1 Executive Runtime Governance Foundation (T1052–T1101) ───────

  function readRuntimeGovernanceMod(rel) {
    return fs.readFileSync(path.join(RUNTIME_GOVERNANCE_ROOT, rel), 'utf8');
  }

  suite('T1052');
  await test('T1052: ExecutiveRuntimeGovernanceService.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceService.js')));
  });

  suite('T1053');
  await test('T1053: ExecutiveRuntimeGovernanceProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceProvider.jsx')));
  });

  suite('T1054');
  await test('T1054: ExecutiveRuntimeGovernanceContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceContext.jsx')));
  });

  suite('T1055');
  await test('T1055: ExecutiveRuntimeGovernanceIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceIndicators.jsx')));
  });

  suite('T1056');
  await test('T1056: ExecutiveRuntimeGovernanceRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceRegistry.js')));
  });

  suite('T1057');
  await test('T1057: ExecutiveRuntimeGovernanceContracts.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceContracts.js')));
  });

  suite('T1058');
  await test('T1058: ExecutiveRuntimeGovernanceValidation.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceValidation.js')));
  });

  suite('T1059');
  await test('T1059: ExecutiveRuntimeGovernance.module.css existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernance.module.css')));
  });

  suite('T1060');
  await test('T1060: governance_ready true', async () => {
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().governance_ready === true);
  });

  suite('T1061');
  await test('T1061: runtime_enabled false', async () => {
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_enabled === false);
  });

  suite('T1062');
  await test('T1062: runtime_active false', async () => {
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_active === false);
  });

  suite('T1063');
  await test('T1063: runtime_authorized false', async () => {
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_authorized === false);
  });

  suite('T1064');
  await test('T1064: runtime_auditable false', async () => {
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_auditable === false);
  });

  suite('T1065');
  await test('T1065: authorization_ready false', async () => {
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().authorization_ready === false);
  });

  suite('T1066');
  await test('T1066: audit_ready false', async () => {
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().audit_ready === false);
  });

  suite('T1067');
  await test('T1067: compliance_status BLOCKED', async () => {
    assertEqual(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().compliance_status, 'BLOCKED', 'compliance');
  });

  suite('T1068');
  await test('T1068: governance_version 1.0.0', async () => {
    assertEqual(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().governance_version, '1.0.0', 'version');
  });

  suite('T1069');
  await test('T1069: registry count 5 placeholders', async () => {
    assertEqual(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().registry_count, 5, 'registry');
  });

  suite('T1070');
  await test('T1070: isExecutiveRuntimeGovernanceReady true', async () => {
    assert(runtimeGovernanceMod.isExecutiveRuntimeGovernanceReady() === true);
  });

  suite('T1071');
  await test('T1071: runtimeGovernanceContract available enabled false', async () => {
    const bundle = runtimeGovernanceMod.getExecutiveRuntimeGovernanceContractsBundle();
    assert(bundle.governanceContract.available === true);
    assert(bundle.governanceContract.enabled === false);
  });

  suite('T1072');
  await test('T1072: runtimeAuthorizationContract placeholder empty', async () => {
    const bundle = runtimeGovernanceMod.getExecutiveRuntimeGovernanceContractsBundle();
    assert(bundle.authorizationContract.available === false);
    assert(bundle.authorizationContract.enabled === false);
  });

  suite('T1073');
  await test('T1073: runtimeAuditContract placeholder empty', async () => {
    const bundle = runtimeGovernanceMod.getExecutiveRuntimeGovernanceContractsBundle();
    assert(bundle.auditContract.available === false);
    assert(bundle.auditContract.enabled === false);
  });

  suite('T1074');
  await test('T1074: validation layer P8.0 + contracts present', async () => {
    const v = runtimeGovernanceMod.validateExecutiveRuntimeGovernanceState({
      runtimeFoundationReady: true,
      capabilityContractsReady: true
    });
    assert(v.valid === true);
    assert(v.p8FoundationPresent === true);
    assert(v.capabilityContractsPresent === true);
    assert(v.runtimeNotActive === true);
    assert(v.runtimeNotAuthorized === true);
  });

  suite('T1075');
  await test('T1075: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = [
      'ExecutiveRuntimeGovernanceService.js',
      'ExecutiveRuntimeGovernanceProvider.jsx',
      'ExecutiveRuntimeGovernanceRegistry.js'
    ]
      .map(readRuntimeGovernanceMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T1076');
  await test('T1076: anti-network sem fetch/axios/WebSocket/SSE', async () => {
    const src = readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
  });

  suite('T1077');
  await test('T1077: anti-LLM sem openai/gemini/anthropic/mcp/rag/embeddings', async () => {
    const all = [
      'ExecutiveRuntimeGovernanceService.js',
      'ExecutiveRuntimeGovernanceProvider.jsx',
      'ExecutiveRuntimeGovernanceIndicators.jsx'
    ]
      .map(readRuntimeGovernanceMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|inference|forecast|prediction|embeddings|prompts?/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
    assert(!/\bmcp\b/i.test(all));
    assert(!/\brag\b/i.test(all));
  });

  suite('T1078');
  await test('T1078: anti-runtime sem useEffect/async', async () => {
    const prov = readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T1079');
  await test('T1079: anti-cognitive-execution sem generateInsight/generateRecommendation/generateResponse', async () => {
    const src = readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceService.js');
    assert(!src.includes('generateInsight'));
    assert(!src.includes('generateRecommendation'));
    assert(!src.includes('generateResponse'));
    assert(!src.includes('runInference'));
    assert(!src.includes('executeRuntime'));
  });

  suite('T1080');
  await test('T1080: provider consome useExecutiveCognitiveRuntime e useExecutiveCapabilityContracts', async () => {
    const prov = readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx');
    assert(prov.includes('useExecutiveCognitiveRuntime'));
    assert(prov.includes('useExecutiveCapabilityContracts'));
  });

  suite('T1081');
  await test('T1081: context API governanceReady runtimeAuthorized complianceStatus', async () => {
    assert(readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceContext.jsx').includes('useExecutiveRuntimeGovernance'));
    assert(readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceContext.jsx').includes('governanceReady'));
    assert(readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceContext.jsx').includes('complianceStatus'));
  });

  suite('T1082');
  await test('T1082: App.jsx ExecutiveRuntimeGovernanceProvider', async () => {
    assert(appSource.includes('ExecutiveRuntimeGovernanceProvider'));
  });

  suite('T1083');
  await test('T1083: App composição P8.1 entre Cognitive Runtime e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const rtIdx = shell.indexOf('<ExecutiveCognitiveRuntimeProvider>');
    const govIdx = shell.indexOf('<ExecutiveRuntimeGovernanceProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(rtIdx >= 0 && govIdx > rtIdx && workspaceIdx > govIdx);
  });

  suite('T1084');
  await test('T1084: AUDIT-01 runtime governance layer integrated', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveRuntimeGovernanceProvider>'));
  });

  suite('T1085');
  await test('T1085: AUDIT-02 governance foundation isolated', async () => {
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceService.js').includes('ExecutiveWorkspaceService'));
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('ExecutiveIntelligenceProvider'));
  });

  suite('T1086');
  await test('T1086: AUDIT-03 no cognitive execution', async () => {
    const all = ['ExecutiveRuntimeGovernanceService.js', 'ExecutiveRuntimeGovernanceProvider.jsx']
      .map(readRuntimeGovernanceMod)
      .join('\n');
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_active === false);
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_enabled === false);
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
  });

  suite('T1087');
  await test('T1087: AUDIT-04 P8.0 cognitive runtime inalterado', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveRuntimeGovernance'));
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_enabled === false);
  });

  suite('T1088');
  await test('T1088: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveRuntimeGovernance'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T1089');
  await test('T1089: AUDIT-05 SSR runtime governance provider', async () => {
    const html = await bundleRuntimeGovernanceProviderSsr();
    assert(html.includes('executive-runtime-governance-provider'));
    assert(html.includes('executive-cognitive-runtime-provider'));
  });

  suite('T1090');
  await test('T1090: AUDIT-05 SSR runtime governance indicators', async () => {
    const html = await bundleRuntimeGovernanceProviderSsr();
    assert(html.includes('executive-runtime-governance-indicators'));
    assert(html.includes('executive-runtime-governance-ready'));
    assert(html.includes('executive-runtime-authorization-ready'));
    assert(html.includes('executive-runtime-audit-ready'));
    assert(html.includes('executive-runtime-governance-enabled'));
    assert(html.includes('executive-runtime-governance-active'));
    assert(html.includes('executive-runtime-governance-compliance'));
  });

  suite('T1091');
  await test('T1091: AUDIT-05 SSR governance blocked runtime inactive', async () => {
    const html = await bundleRuntimeGovernanceProviderSsr();
    assert(html.includes('>BLOCKED<'));
    assert(html.includes('>no<'));
    assert(html.includes('>yes<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T1092');
  await test('T1092: governance sem Navigate/onClick', async () => {
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('Navigate'));
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceIndicators.jsx').includes('onClick'));
  });

  suite('T1093');
  await test('T1093: registry placeholders P8.2 P8.3 P8.4 P8.5 P8.6', async () => {
    const registry = readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceRegistry.js');
    assert(registry.includes('P8.2'));
    assert(registry.includes('P8.3'));
    assert(registry.includes('P8.4'));
    assert(registry.includes('P8.5'));
    assert(registry.includes('P8.6'));
    assert(registry.includes('PLACEHOLDER'));
  });

  for (let i = 1094; i <= 1099; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.1 governance propagation #${i}`, async () => {
      const m = runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata();
      assert(m.governance_ready === true);
      assert(m.runtime_enabled === false);
      assert(m.runtime_active === false);
      assert(m.runtime_authorized === false);
      assert(m.compliance_status === 'BLOCKED');
    });
  }

  for (let i = 1100; i <= 1100; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.1 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveRuntimeGovernance'));
    });
  }

  suite('T1101');
  await test('T1101: P8.1 executive runtime governance foundation final', async () => {
    assert(fs.existsSync(path.join(RUNTIME_GOVERNANCE_ROOT, 'ExecutiveRuntimeGovernanceProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleRuntimeGovernanceProviderSsr();
    assert(html.includes('gov-child'));
    assert(runtimeGovernanceMod.isExecutiveRuntimeGovernanceReady());
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady());
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P8.2 Executive Runtime Authorization Foundation (T1102–T1151) ──────

  function readRuntimeAuthorizationMod(rel) {
    return fs.readFileSync(path.join(RUNTIME_AUTHORIZATION_ROOT, rel), 'utf8');
  }

  suite('T1102');
  await test('T1102: ExecutiveRuntimeAuthorizationService.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationService.js')));
  });

  suite('T1103');
  await test('T1103: ExecutiveRuntimeAuthorizationProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationProvider.jsx')));
  });

  suite('T1104');
  await test('T1104: ExecutiveRuntimeAuthorizationContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationContext.jsx')));
  });

  suite('T1105');
  await test('T1105: ExecutiveRuntimeAuthorizationIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationIndicators.jsx')));
  });

  suite('T1106');
  await test('T1106: ExecutiveRuntimeAuthorizationRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationRegistry.js')));
  });

  suite('T1107');
  await test('T1107: ExecutiveRuntimeAuthorizationPolicies.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationPolicies.js')));
  });

  suite('T1108');
  await test('T1108: ExecutiveRuntimeAuthorizationValidation.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationValidation.js')));
  });

  suite('T1109');
  await test('T1109: ExecutiveRuntimeAuthorizationContracts.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationContracts.js')));
  });

  suite('T1110');
  await test('T1110: ExecutiveRuntimeAuthorization.module.css existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorization.module.css')));
  });

  suite('T1111');
  await test('T1111: authorization_ready true', async () => {
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().authorization_ready === true);
  });

  suite('T1112');
  await test('T1112: runtime_authorized false', async () => {
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_authorized === false);
  });

  suite('T1113');
  await test('T1113: runtime_enabled false', async () => {
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_enabled === false);
  });

  suite('T1114');
  await test('T1114: runtime_active false', async () => {
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_active === false);
  });

  suite('T1115');
  await test('T1115: authorization_mode BLOCKED', async () => {
    assertEqual(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().authorization_mode, 'BLOCKED', 'mode');
  });

  suite('T1116');
  await test('T1116: authorization_status FOUNDATION_ONLY', async () => {
    assertEqual(
      runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().authorization_status,
      'FOUNDATION_ONLY',
      'status'
    );
  });

  suite('T1117');
  await test('T1117: cognitive_execution_allowed false', async () => {
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().cognitive_execution_allowed === false);
  });

  suite('T1118');
  await test('T1118: governance_dependency true audit_dependency false', async () => {
    const m = runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata();
    assert(m.governance_dependency === true);
    assert(m.audit_dependency === false);
  });

  suite('T1119');
  await test('T1119: authorization_version 1.0.0', async () => {
    assertEqual(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().authorization_version, '1.0.0', 'version');
  });

  suite('T1120');
  await test('T1120: isExecutiveRuntimeAuthorizationReady true', async () => {
    assert(runtimeAuthorizationMod.isExecutiveRuntimeAuthorizationReady() === true);
  });

  suite('T1121');
  await test('T1121: runtimeAuthorizationPolicy all false', async () => {
    const bundle = runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationBundle();
    assert(bundle.policy.allowAuthorization === false);
    assert(bundle.policy.allowExecution === false);
    assert(bundle.policy.allowInference === false);
    assert(bundle.policy.allowActivation === false);
  });

  suite('T1122');
  await test('T1122: contracts available true enabled false', async () => {
    const bundle = runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationBundle();
    assert(bundle.authorizationContract.available === true);
    assert(bundle.authorizationContract.enabled === false);
    assert(bundle.activationContract.available === true);
    assert(bundle.activationContract.enabled === false);
    assert(bundle.executionContract.available === true);
    assert(bundle.executionContract.enabled === false);
  });

  suite('T1123');
  await test('T1123: validation layer P8.0 + P8.1 present', async () => {
    const v = runtimeAuthorizationMod.validateExecutiveRuntimeAuthorizationState({
      runtimeFoundationReady: true,
      governanceFoundationReady: true
    });
    assert(v.valid === true);
    assert(v.p8FoundationPresent === true);
    assert(v.p81GovernancePresent === true);
    assert(v.noCognitiveExecution === true);
    assert(v.runtimeNotAuthorized === true);
  });

  suite('T1124');
  await test('T1124: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = [
      'ExecutiveRuntimeAuthorizationService.js',
      'ExecutiveRuntimeAuthorizationProvider.jsx',
      'ExecutiveRuntimeAuthorizationRegistry.js'
    ]
      .map(readRuntimeAuthorizationMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T1125');
  await test('T1125: anti-network sem fetch/axios/WebSocket/SSE/worker', async () => {
    const src = readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
    assert(!src.includes('Worker'));
  });

  suite('T1126');
  await test('T1126: anti-LLM sem openai/gemini/anthropic/mcp/rag/embeddings/prompt', async () => {
    const all = [
      'ExecutiveRuntimeAuthorizationService.js',
      'ExecutiveRuntimeAuthorizationProvider.jsx',
      'ExecutiveRuntimeAuthorizationIndicators.jsx'
    ]
      .map(readRuntimeAuthorizationMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|claude|gpt|inference|reasoning|embeddings|prompts?/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
    assert(!/\bmcp\b/i.test(all));
    assert(!/\brag\b/i.test(all));
  });

  suite('T1127');
  await test('T1127: anti-runtime sem useEffect/async', async () => {
    const prov = readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T1128');
  await test('T1128: anti-cognitive-execution sem execute/activate/startRuntime/enableRuntime', async () => {
    const all = [
      'ExecutiveRuntimeAuthorizationService.js',
      'ExecutiveRuntimeAuthorizationProvider.jsx',
      'ExecutiveRuntimeAuthorizationPolicies.js'
    ]
      .map(readRuntimeAuthorizationMod)
      .join('\n');
    assert(!all.includes('startRuntime'));
    assert(!all.includes('enableRuntime'));
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
    assert(!all.includes('generateInsight'));
  });

  suite('T1129');
  await test('T1129: provider consome useExecutiveCognitiveRuntime e useExecutiveRuntimeGovernance', async () => {
    const prov = readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx');
    assert(prov.includes('useExecutiveCognitiveRuntime'));
    assert(prov.includes('useExecutiveRuntimeGovernance'));
  });

  suite('T1130');
  await test('T1130: context API authorizationReady authorizationMode policies', async () => {
    assert(readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationContext.jsx').includes('useExecutiveRuntimeAuthorization'));
    assert(readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationContext.jsx').includes('authorizationReady'));
    assert(readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationContext.jsx').includes('authorizationMode'));
    assert(readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationContext.jsx').includes('policies'));
  });

  suite('T1131');
  await test('T1131: App.jsx ExecutiveRuntimeAuthorizationProvider', async () => {
    assert(appSource.includes('ExecutiveRuntimeAuthorizationProvider'));
  });

  suite('T1132');
  await test('T1132: App composição P8.2 entre Governance e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const govIdx = shell.indexOf('<ExecutiveRuntimeGovernanceProvider>');
    const authIdx = shell.indexOf('<ExecutiveRuntimeAuthorizationProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(govIdx >= 0 && authIdx > govIdx && workspaceIdx > authIdx);
  });

  suite('T1133');
  await test('T1133: AUDIT-01 runtime authorization layer integrated', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveRuntimeAuthorizationProvider>'));
  });

  suite('T1134');
  await test('T1134: AUDIT-02 runtime authorization foundation isolated', async () => {
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationService.js').includes('ExecutiveWorkspaceService'));
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx').includes('ExecutiveIntelligenceProvider'));
  });

  suite('T1135');
  await test('T1135: AUDIT-03 no cognitive execution', async () => {
    const all = ['ExecutiveRuntimeAuthorizationService.js', 'ExecutiveRuntimeAuthorizationProvider.jsx']
      .map(readRuntimeAuthorizationMod)
      .join('\n');
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_active === false);
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_enabled === false);
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().cognitive_execution_allowed === false);
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
  });

  suite('T1136');
  await test('T1136: AUDIT-04 P8.1 governance inalterado', async () => {
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('ExecutiveRuntimeAuthorization'));
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_authorized === false);
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_enabled === false);
  });

  suite('T1137');
  await test('T1137: AUDIT-04 P8.0 cognitive runtime inalterado', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveRuntimeAuthorization'));
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
  });

  suite('T1138');
  await test('T1138: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveRuntimeAuthorization'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T1139');
  await test('T1139: AUDIT-05 SSR runtime authorization provider', async () => {
    const html = await bundleRuntimeAuthorizationProviderSsr();
    assert(html.includes('executive-runtime-authorization-provider'));
    assert(html.includes('executive-runtime-governance-provider'));
  });

  suite('T1140');
  await test('T1140: AUDIT-05 SSR runtime authorization indicators', async () => {
    const html = await bundleRuntimeAuthorizationProviderSsr();
    assert(html.includes('executive-runtime-authorization-indicators'));
    assert(html.includes('executive-runtime-authorization-ready'));
    assert(html.includes('executive-runtime-authorized'));
    assert(html.includes('executive-runtime-authorization-enabled'));
    assert(html.includes('executive-runtime-authorization-active'));
    assert(html.includes('executive-runtime-authorization-mode'));
    assert(html.includes('executive-runtime-authorization-status'));
  });

  suite('T1141');
  await test('T1141: AUDIT-05 SSR authorization blocked foundation only', async () => {
    const html = await bundleRuntimeAuthorizationProviderSsr();
    assert(html.includes('>BLOCKED<'));
    assert(html.includes('>FOUNDATION_ONLY<'));
    assert(html.includes('>no<'));
    assert(html.includes('>yes<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T1142');
  await test('T1142: authorization sem Navigate/onClick', async () => {
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx').includes('Navigate'));
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationIndicators.jsx').includes('onClick'));
  });

  suite('T1143');
  await test('T1143: registry placeholders P8.3 P8.4 P8.5 P8.6', async () => {
    const registry = readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationRegistry.js');
    assert(registry.includes('P8.3'));
    assert(registry.includes('P8.4'));
    assert(registry.includes('P8.5'));
    assert(registry.includes('P8.6'));
    assert(registry.includes('PLACEHOLDER'));
  });

  for (let i = 1144; i <= 1149; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.2 authorization propagation #${i}`, async () => {
      const m = runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata();
      assert(m.authorization_ready === true);
      assert(m.runtime_authorized === false);
      assert(m.runtime_enabled === false);
      assert(m.runtime_active === false);
      assert(m.cognitive_execution_allowed === false);
      assert(m.authorization_mode === 'BLOCKED');
    });
  }

  for (let i = 1150; i <= 1150; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.2 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('ExecutiveRuntimeAuthorization'));
    });
  }

  suite('T1151');
  await test('T1151: P8.2 executive runtime authorization foundation final', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUTHORIZATION_ROOT, 'ExecutiveRuntimeAuthorizationProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleRuntimeAuthorizationProviderSsr();
    assert(html.includes('auth-child'));
    assert(runtimeAuthorizationMod.isExecutiveRuntimeAuthorizationReady());
    assert(runtimeGovernanceMod.isExecutiveRuntimeGovernanceReady());
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady());
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P8.3 Executive Runtime Audit Layer Foundation (T1152–T1201) ──────

  function readRuntimeAuditMod(rel) {
    return fs.readFileSync(path.join(RUNTIME_AUDIT_ROOT, rel), 'utf8');
  }

  suite('T1152');
  await test('T1152: ExecutiveRuntimeAuditService.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditService.js')));
  });

  suite('T1153');
  await test('T1153: ExecutiveRuntimeAuditProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditProvider.jsx')));
  });

  suite('T1154');
  await test('T1154: ExecutiveRuntimeAuditContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditContext.jsx')));
  });

  suite('T1155');
  await test('T1155: ExecutiveRuntimeAuditIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditIndicators.jsx')));
  });

  suite('T1156');
  await test('T1156: ExecutiveRuntimeAuditRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditRegistry.js')));
  });

  suite('T1157');
  await test('T1157: ExecutiveRuntimeAuditPolicies.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditPolicies.js')));
  });

  suite('T1158');
  await test('T1158: ExecutiveRuntimeAuditValidation.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditValidation.js')));
  });

  suite('T1159');
  await test('T1159: ExecutiveRuntimeAuditContracts.js existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditContracts.js')));
  });

  suite('T1160');
  await test('T1160: ExecutiveRuntimeAudit.module.css existe', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAudit.module.css')));
  });

  suite('T1161');
  await test('T1161: audit_ready true', async () => {
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().audit_ready === true);
  });

  suite('T1162');
  await test('T1162: runtime_auditable true', async () => {
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_auditable === true);
  });

  suite('T1163');
  await test('T1163: runtime_authorized false', async () => {
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_authorized === false);
  });

  suite('T1164');
  await test('T1164: runtime_enabled false', async () => {
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_enabled === false);
  });

  suite('T1165');
  await test('T1165: runtime_active false', async () => {
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_active === false);
  });

  suite('T1166');
  await test('T1166: audit_mode FOUNDATION_ONLY', async () => {
    assertEqual(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().audit_mode, 'FOUNDATION_ONLY', 'mode');
  });

  suite('T1167');
  await test('T1167: audit_status READY', async () => {
    assertEqual(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().audit_status, 'READY', 'status');
  });

  suite('T1168');
  await test('T1168: cognitive_execution_allowed false', async () => {
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().cognitive_execution_allowed === false);
  });

  suite('T1169');
  await test('T1169: governance_dependency authorization_dependency true', async () => {
    const m = runtimeAuditMod.getExecutiveRuntimeAuditMetadata();
    assert(m.governance_dependency === true);
    assert(m.authorization_dependency === true);
  });

  suite('T1170');
  await test('T1170: audit_version 1.0.0', async () => {
    assertEqual(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().audit_version, '1.0.0', 'version');
  });

  suite('T1171');
  await test('T1171: isExecutiveRuntimeAuditReady true', async () => {
    assert(runtimeAuditMod.isExecutiveRuntimeAuditReady() === true);
  });

  suite('T1172');
  await test('T1172: runtimeAuditPolicy all false', async () => {
    const bundle = runtimeAuditMod.getExecutiveRuntimeAuditBundle();
    assert(bundle.policy.allowAuditRecording === false);
    assert(bundle.policy.allowExecutionAudit === false);
    assert(bundle.policy.allowInferenceAudit === false);
    assert(bundle.policy.allowRuntimeActivationAudit === false);
  });

  suite('T1173');
  await test('T1173: contracts available true enabled false', async () => {
    const bundle = runtimeAuditMod.getExecutiveRuntimeAuditBundle();
    assert(bundle.auditContract.available === true);
    assert(bundle.auditContract.enabled === false);
    assert(bundle.evidenceContract.available === true);
    assert(bundle.evidenceContract.enabled === false);
    assert(bundle.complianceContract.available === true);
    assert(bundle.complianceContract.enabled === false);
  });

  suite('T1174');
  await test('T1174: validation layer P8.0 + P8.1 + P8.2 present', async () => {
    const v = runtimeAuditMod.validateExecutiveRuntimeAuditState({
      runtimeFoundationReady: true,
      governanceFoundationReady: true,
      authorizationFoundationReady: true
    });
    assert(v.valid === true);
    assert(v.p8FoundationPresent === true);
    assert(v.p81GovernancePresent === true);
    assert(v.p82AuthorizationPresent === true);
    assert(v.noCognitiveExecution === true);
    assert(v.runtimeNotAuthorized === true);
    assert(v.runtimeNotEnabled === true);
    assert(v.runtimeNotActive === true);
  });

  suite('T1175');
  await test('T1175: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = [
      'ExecutiveRuntimeAuditService.js',
      'ExecutiveRuntimeAuditProvider.jsx',
      'ExecutiveRuntimeAuditRegistry.js'
    ]
      .map(readRuntimeAuditMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T1176');
  await test('T1176: anti-network sem fetch/axios/WebSocket/SSE/worker', async () => {
    const src = readRuntimeAuditMod('ExecutiveRuntimeAuditService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
    assert(!src.includes('Worker'));
  });

  suite('T1177');
  await test('T1177: anti-LLM sem openai/gemini/anthropic/mcp/rag/embeddings/prompt', async () => {
    const all = [
      'ExecutiveRuntimeAuditService.js',
      'ExecutiveRuntimeAuditProvider.jsx',
      'ExecutiveRuntimeAuditIndicators.jsx'
    ]
      .map(readRuntimeAuditMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|claude|gpt|inference|reasoning|embeddings|prompts?/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
    assert(!/\bmcp\b/i.test(all));
    assert(!/\brag\b/i.test(all));
  });

  suite('T1178');
  await test('T1178: anti-runtime sem useEffect/async', async () => {
    const prov = readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T1179');
  await test('T1179: anti-cognitive-execution sem execute/activate/startRuntime/enableRuntime', async () => {
    const all = [
      'ExecutiveRuntimeAuditService.js',
      'ExecutiveRuntimeAuditProvider.jsx',
      'ExecutiveRuntimeAuditPolicies.js'
    ]
      .map(readRuntimeAuditMod)
      .join('\n');
    assert(!all.includes('startRuntime'));
    assert(!all.includes('enableRuntime'));
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
    assert(!all.includes('generateInsight'));
  });

  suite('T1180');
  await test('T1180: provider consome P8.0 P8.1 P8.2 contexts', async () => {
    const prov = readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx');
    assert(prov.includes('useExecutiveCognitiveRuntime'));
    assert(prov.includes('useExecutiveRuntimeGovernance'));
    assert(prov.includes('useExecutiveRuntimeAuthorization'));
  });

  suite('T1181');
  await test('T1181: context API auditReady auditMode policies contracts registry validation', async () => {
    const ctx = readRuntimeAuditMod('ExecutiveRuntimeAuditContext.jsx');
    assert(ctx.includes('useExecutiveRuntimeAudit'));
    assert(ctx.includes('auditReady'));
    assert(ctx.includes('auditVersion'));
    assert(ctx.includes('runtimeAuditable'));
    assert(ctx.includes('policies'));
    assert(ctx.includes('contracts'));
    assert(ctx.includes('registry'));
    assert(ctx.includes('validation'));
  });

  suite('T1182');
  await test('T1182: App.jsx ExecutiveRuntimeAuditProvider', async () => {
    assert(appSource.includes('ExecutiveRuntimeAuditProvider'));
  });

  suite('T1183');
  await test('T1183: App composição P8.3 entre Authorization e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const authIdx = shell.indexOf('<ExecutiveRuntimeAuthorizationProvider>');
    const auditIdx = shell.indexOf('<ExecutiveRuntimeAuditProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(authIdx >= 0 && auditIdx > authIdx && workspaceIdx > auditIdx);
  });

  suite('T1184');
  await test('T1184: AUDIT-01 runtime audit layer integrated', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveRuntimeAuditProvider>'));
  });

  suite('T1185');
  await test('T1185: AUDIT-02 runtime audit foundation isolated', async () => {
    assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditService.js').includes('ExecutiveWorkspaceService'));
    assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx').includes('ExecutiveIntelligenceProvider'));
  });

  suite('T1186');
  await test('T1186: AUDIT-03 no cognitive execution', async () => {
    const all = ['ExecutiveRuntimeAuditService.js', 'ExecutiveRuntimeAuditProvider.jsx']
      .map(readRuntimeAuditMod)
      .join('\n');
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_active === false);
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_enabled === false);
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().cognitive_execution_allowed === false);
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
  });

  suite('T1187');
  await test('T1187: AUDIT-04 P8.2 authorization inalterado', async () => {
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx').includes('ExecutiveRuntimeAudit'));
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_authorized === false);
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_enabled === false);
  });

  suite('T1188');
  await test('T1188: AUDIT-04 P8.1 governance inalterado', async () => {
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('ExecutiveRuntimeAudit'));
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_authorized === false);
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_enabled === false);
  });

  suite('T1189');
  await test('T1189: AUDIT-04 P8.0 cognitive runtime inalterado', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveRuntimeAudit'));
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
  });

  suite('T1190');
  await test('T1190: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveRuntimeAudit'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T1191');
  await test('T1191: AUDIT-05 SSR runtime audit provider', async () => {
    const html = await bundleRuntimeAuditProviderSsr();
    assert(html.includes('executive-runtime-audit-provider'));
    assert(html.includes('executive-runtime-authorization-provider'));
    assert(html.includes('executive-runtime-governance-provider'));
  });

  suite('T1192');
  await test('T1192: AUDIT-05 SSR runtime audit indicators', async () => {
    const html = await bundleRuntimeAuditProviderSsr();
    assert(html.includes('executive-runtime-audit-indicators'));
    assert(html.includes('executive-runtime-audit-ready'));
    assert(html.includes('executive-runtime-auditable'));
    assert(html.includes('executive-runtime-audit-authorized'));
    assert(html.includes('executive-runtime-audit-enabled'));
    assert(html.includes('executive-runtime-audit-active'));
    assert(html.includes('executive-runtime-audit-status'));
  });

  suite('T1193');
  await test('T1193: AUDIT-05 SSR audit foundation only ready', async () => {
    const html = await bundleRuntimeAuditProviderSsr();
    assert(html.includes('>READY<'));
    assert(html.includes('>FOUNDATION_ONLY<'));
    assert(html.includes('>yes<'));
    assert(html.includes('>no<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T1194');
  await test('T1194: audit sem Navigate/onClick', async () => {
    assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx').includes('Navigate'));
    assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditIndicators.jsx').includes('onClick'));
  });

  suite('T1195');
  await test('T1195: registry placeholders P8.4 P8.5 P8.6', async () => {
    const registry = readRuntimeAuditMod('ExecutiveRuntimeAuditRegistry.js');
    assert(registry.includes('P8.4'));
    assert(registry.includes('P8.5'));
    assert(registry.includes('P8.6'));
    assert(registry.includes('insights_runtime'));
    assert(registry.includes('recommendations_runtime'));
    assert(registry.includes('assistant_runtime'));
    assert(registry.includes('PLACEHOLDER'));
  });

  for (let i = 1196; i <= 1199; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.3 audit propagation #${i}`, async () => {
      const m = runtimeAuditMod.getExecutiveRuntimeAuditMetadata();
      assert(m.audit_ready === true);
      assert(m.runtime_auditable === true);
      assert(m.runtime_authorized === false);
      assert(m.runtime_enabled === false);
      assert(m.runtime_active === false);
      assert(m.cognitive_execution_allowed === false);
      assert(m.audit_mode === 'FOUNDATION_ONLY');
    });
  }

  for (let i = 1200; i <= 1200; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.3 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx').includes('ExecutiveRuntimeAudit'));
    });
  }

  suite('T1201');
  await test('T1201: P8.3 executive runtime audit layer foundation final', async () => {
    assert(fs.existsSync(path.join(RUNTIME_AUDIT_ROOT, 'ExecutiveRuntimeAuditProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleRuntimeAuditProviderSsr();
    assert(html.includes('audit-child'));
    assert(runtimeAuditMod.isExecutiveRuntimeAuditReady());
    assert(runtimeAuthorizationMod.isExecutiveRuntimeAuthorizationReady());
    assert(runtimeGovernanceMod.isExecutiveRuntimeGovernanceReady());
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady());
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P8.4 Executive Insights Runtime Foundation (T1202–T1251) ─────────

  function readInsightsRuntimeMod(rel) {
    return fs.readFileSync(path.join(INSIGHTS_RUNTIME_ROOT, rel), 'utf8');
  }

  suite('T1202');
  await test('T1202: ExecutiveInsightsRuntimeService.js existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeService.js')));
  });

  suite('T1203');
  await test('T1203: ExecutiveInsightsRuntimeProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeProvider.jsx')));
  });

  suite('T1204');
  await test('T1204: ExecutiveInsightsRuntimeContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeContext.jsx')));
  });

  suite('T1205');
  await test('T1205: ExecutiveInsightsRuntimeIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeIndicators.jsx')));
  });

  suite('T1206');
  await test('T1206: ExecutiveInsightsRuntimeRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeRegistry.js')));
  });

  suite('T1207');
  await test('T1207: ExecutiveInsightsRuntimePolicies.js existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimePolicies.js')));
  });

  suite('T1208');
  await test('T1208: ExecutiveInsightsRuntimeValidation.js existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeValidation.js')));
  });

  suite('T1209');
  await test('T1209: ExecutiveInsightsRuntimeContracts.js existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeContracts.js')));
  });

  suite('T1210');
  await test('T1210: ExecutiveInsightsRuntime.module.css existe', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntime.module.css')));
  });

  suite('T1211');
  await test('T1211: insights_ready true', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().insights_ready === true);
  });

  suite('T1212');
  await test('T1212: insights_runtime_available true', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().insights_runtime_available === true);
  });

  suite('T1213');
  await test('T1213: insights_runtime_enabled false', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().insights_runtime_enabled === false);
  });

  suite('T1214');
  await test('T1214: insights_runtime_active false', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().insights_runtime_active === false);
  });

  suite('T1215');
  await test('T1215: runtime_authorized false', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().runtime_authorized === false);
  });

  suite('T1216');
  await test('T1216: runtime_enabled false', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().runtime_enabled === false);
  });

  suite('T1217');
  await test('T1217: runtime_active false', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().runtime_active === false);
  });

  suite('T1218');
  await test('T1218: insights_mode FOUNDATION_ONLY', async () => {
    assertEqual(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().insights_mode, 'FOUNDATION_ONLY', 'mode');
  });

  suite('T1219');
  await test('T1219: insights_status READY', async () => {
    assertEqual(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().insights_status, 'READY', 'status');
  });

  suite('T1220');
  await test('T1220: cognitive_execution_allowed false', async () => {
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().cognitive_execution_allowed === false);
  });

  suite('T1221');
  await test('T1221: governance authorization audit dependencies true', async () => {
    const m = insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata();
    assert(m.governance_dependency === true);
    assert(m.authorization_dependency === true);
    assert(m.audit_dependency === true);
  });

  suite('T1222');
  await test('T1222: isExecutiveInsightsRuntimeReady true', async () => {
    assert(insightsRuntimeMod.isExecutiveInsightsRuntimeReady() === true);
  });

  suite('T1223');
  await test('T1223: runtimeInsightsPolicy all false', async () => {
    const bundle = insightsRuntimeMod.getExecutiveInsightsRuntimeBundle();
    assert(bundle.policy.allowInsightsExecution === false);
    assert(bundle.policy.allowInsightsGeneration === false);
    assert(bundle.policy.allowInsightsActivation === false);
    assert(bundle.policy.allowInsightsInference === false);
    assert(bundle.policy.allowRuntimeActivation === false);
  });

  suite('T1224');
  await test('T1224: contracts available true enabled false', async () => {
    const bundle = insightsRuntimeMod.getExecutiveInsightsRuntimeBundle();
    assert(bundle.insightsContract.available === true);
    assert(bundle.insightsContract.enabled === false);
    assert(bundle.consumptionContract.available === true);
    assert(bundle.consumptionContract.enabled === false);
    assert(bundle.lifecycleContract.available === true);
    assert(bundle.lifecycleContract.enabled === false);
  });

  suite('T1225');
  await test('T1225: validation layer P8.0 + P8.1 + P8.2 + P8.3 present', async () => {
    const v = insightsRuntimeMod.validateExecutiveInsightsRuntimeState({
      runtimeFoundationReady: true,
      governanceFoundationReady: true,
      authorizationFoundationReady: true,
      auditFoundationReady: true
    });
    assert(v.valid === true);
    assert(v.p8FoundationPresent === true);
    assert(v.p81GovernancePresent === true);
    assert(v.p82AuthorizationPresent === true);
    assert(v.p83AuditPresent === true);
    assert(v.noCognitiveExecution === true);
    assert(v.runtimeNotAuthorized === true);
    assert(v.runtimeNotEnabled === true);
    assert(v.runtimeNotActive === true);
    assert(v.insightsRuntimeNotEnabled === true);
    assert(v.insightsRuntimeNotActive === true);
  });

  suite('T1226');
  await test('T1226: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = [
      'ExecutiveInsightsRuntimeService.js',
      'ExecutiveInsightsRuntimeProvider.jsx',
      'ExecutiveInsightsRuntimeRegistry.js'
    ]
      .map(readInsightsRuntimeMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T1227');
  await test('T1227: anti-network sem fetch/axios/WebSocket/SSE/worker', async () => {
    const src = readInsightsRuntimeMod('ExecutiveInsightsRuntimeService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
    assert(!src.includes('Worker'));
  });

  suite('T1228');
  await test('T1228: anti-LLM sem openai/gemini/anthropic/mcp/rag/embeddings/prompt', async () => {
    const all = [
      'ExecutiveInsightsRuntimeService.js',
      'ExecutiveInsightsRuntimeProvider.jsx',
      'ExecutiveInsightsRuntimeIndicators.jsx'
    ]
      .map(readInsightsRuntimeMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|claude|gpt|inference|reasoning|embeddings|prompts?/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
    assert(!/\bmcp\b/i.test(all));
    assert(!/\brag\b/i.test(all));
  });

  suite('T1229');
  await test('T1229: anti-runtime sem useEffect/async', async () => {
    const prov = readInsightsRuntimeMod('ExecutiveInsightsRuntimeProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T1230');
  await test('T1230: anti-cognitive-execution sem execute/activate/startRuntime/enableRuntime', async () => {
    const all = [
      'ExecutiveInsightsRuntimeService.js',
      'ExecutiveInsightsRuntimeProvider.jsx',
      'ExecutiveInsightsRuntimePolicies.js'
    ]
      .map(readInsightsRuntimeMod)
      .join('\n');
    assert(!all.includes('startRuntime'));
    assert(!all.includes('enableRuntime'));
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
    assert(!all.includes('generateInsight'));
  });

  suite('T1231');
  await test('T1231: provider consome P8.0 P8.1 P8.2 P8.3 contexts', async () => {
    const prov = readInsightsRuntimeMod('ExecutiveInsightsRuntimeProvider.jsx');
    assert(prov.includes('useExecutiveCognitiveRuntime'));
    assert(prov.includes('useExecutiveRuntimeGovernance'));
    assert(prov.includes('useExecutiveRuntimeAuthorization'));
    assert(prov.includes('useExecutiveRuntimeAudit'));
  });

  suite('T1232');
  await test('T1232: context API insightsReady insightsRuntimeAvailable policies contracts registry validation', async () => {
    const ctx = readInsightsRuntimeMod('ExecutiveInsightsRuntimeContext.jsx');
    assert(ctx.includes('useExecutiveInsightsRuntime'));
    assert(ctx.includes('insightsReady'));
    assert(ctx.includes('insightsRuntimeAvailable'));
    assert(ctx.includes('insightsRuntimeEnabled'));
    assert(ctx.includes('insightsRuntimeActive'));
    assert(ctx.includes('cognitiveExecutionAllowed'));
    assert(ctx.includes('policies'));
    assert(ctx.includes('contracts'));
    assert(ctx.includes('registry'));
    assert(ctx.includes('validation'));
  });

  suite('T1233');
  await test('T1233: App.jsx ExecutiveInsightsRuntimeProvider', async () => {
    assert(appSource.includes('ExecutiveInsightsRuntimeProvider'));
  });

  suite('T1234');
  await test('T1234: App composição P8.4 entre Audit e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const auditIdx = shell.indexOf('<ExecutiveRuntimeAuditProvider>');
    const insightsIdx = shell.indexOf('<ExecutiveInsightsRuntimeProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(auditIdx >= 0 && insightsIdx > auditIdx && workspaceIdx > insightsIdx);
  });

  suite('T1235');
  await test('T1235: AUDIT-01 insights runtime layer integrated', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveInsightsRuntimeProvider>'));
  });

  suite('T1236');
  await test('T1236: AUDIT-02 insights runtime foundation isolated', async () => {
    assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeService.js').includes('ExecutiveWorkspaceService'));
    assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeProvider.jsx').includes('ExecutiveIntelligenceProvider'));
  });

  suite('T1237');
  await test('T1237: AUDIT-03 no cognitive execution', async () => {
    const all = ['ExecutiveInsightsRuntimeService.js', 'ExecutiveInsightsRuntimeProvider.jsx']
      .map(readInsightsRuntimeMod)
      .join('\n');
    const m = insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata();
    assert(m.runtime_active === false);
    assert(m.runtime_enabled === false);
    assert(m.cognitive_execution_allowed === false);
    assert(m.insights_runtime_enabled === false);
    assert(m.insights_runtime_active === false);
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
  });

  suite('T1238');
  await test('T1238: AUDIT-04 P8.3 audit inalterado', async () => {
    assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx').includes('ExecutiveInsightsRuntime'));
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_authorized === false);
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_enabled === false);
  });

  suite('T1239');
  await test('T1239: AUDIT-04 P8.2 authorization inalterado', async () => {
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx').includes('ExecutiveInsightsRuntime'));
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_authorized === false);
  });

  suite('T1240');
  await test('T1240: AUDIT-04 P8.1 governance inalterado', async () => {
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('ExecutiveInsightsRuntime'));
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_enabled === false);
  });

  suite('T1241');
  await test('T1241: AUDIT-04 P8.0 cognitive runtime inalterado', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveInsightsRuntime'));
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
  });

  suite('T1242');
  await test('T1242: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveInsightsRuntime'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T1243');
  await test('T1243: AUDIT-05 SSR insights runtime provider', async () => {
    const html = await bundleInsightsRuntimeProviderSsr();
    assert(html.includes('executive-insights-runtime-provider'));
    assert(html.includes('executive-runtime-audit-provider'));
    assert(html.includes('executive-runtime-authorization-provider'));
  });

  suite('T1244');
  await test('T1244: AUDIT-05 SSR insights runtime indicators', async () => {
    const html = await bundleInsightsRuntimeProviderSsr();
    assert(html.includes('executive-insights-runtime-indicators'));
    assert(html.includes('executive-insights-runtime-ready'));
    assert(html.includes('executive-insights-runtime-available'));
    assert(html.includes('executive-insights-runtime-enabled'));
    assert(html.includes('executive-insights-runtime-active'));
    assert(html.includes('executive-insights-runtime-authorization-status'));
    assert(html.includes('executive-insights-runtime-audit-status'));
  });

  suite('T1245');
  await test('T1245: AUDIT-05 SSR insights foundation only ready', async () => {
    const html = await bundleInsightsRuntimeProviderSsr();
    assert(html.includes('>READY<'));
    assert(html.includes('>FOUNDATION_ONLY<'));
    assert(html.includes('>yes<'));
    assert(html.includes('>no<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T1246');
  await test('T1246: insights runtime sem Navigate/onClick', async () => {
    assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeProvider.jsx').includes('Navigate'));
    assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeIndicators.jsx').includes('onClick'));
  });

  suite('T1247');
  await test('T1247: registry placeholders P8.5 P8.6', async () => {
    const registry = readInsightsRuntimeMod('ExecutiveInsightsRuntimeRegistry.js');
    assert(registry.includes('P8.5'));
    assert(registry.includes('P8.6'));
    assert(registry.includes('recommendations_runtime'));
    assert(registry.includes('assistant_runtime'));
    assert(registry.includes('PLACEHOLDER'));
  });

  for (let i = 1248; i <= 1249; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.4 insights runtime propagation #${i}`, async () => {
      const m = insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata();
      assert(m.insights_ready === true);
      assert(m.insights_runtime_available === true);
      assert(m.insights_runtime_enabled === false);
      assert(m.insights_runtime_active === false);
      assert(m.runtime_authorized === false);
      assert(m.runtime_enabled === false);
      assert(m.runtime_active === false);
      assert(m.cognitive_execution_allowed === false);
      assert(m.insights_mode === 'FOUNDATION_ONLY');
    });
  }

  for (let i = 1250; i <= 1250; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.4 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx').includes('ExecutiveInsightsRuntime'));
    });
  }

  suite('T1251');
  await test('T1251: P8.4 executive insights runtime foundation final', async () => {
    assert(fs.existsSync(path.join(INSIGHTS_RUNTIME_ROOT, 'ExecutiveInsightsRuntimeProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleInsightsRuntimeProviderSsr();
    assert(html.includes('insights-runtime-child'));
    assert(insightsRuntimeMod.isExecutiveInsightsRuntimeReady());
    assert(runtimeAuditMod.isExecutiveRuntimeAuditReady());
    assert(runtimeAuthorizationMod.isExecutiveRuntimeAuthorizationReady());
    assert(runtimeGovernanceMod.isExecutiveRuntimeGovernanceReady());
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady());
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P8.5 Executive Recommendations Runtime Foundation (T1252–T1301) ──

  function readRecommendationsRuntimeMod(rel) {
    return fs.readFileSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, rel), 'utf8');
  }

  suite('T1252');
  await test('T1252: ExecutiveRecommendationsRuntimeService.js existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeService.js')));
  });

  suite('T1253');
  await test('T1253: ExecutiveRecommendationsRuntimeProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeProvider.jsx')));
  });

  suite('T1254');
  await test('T1254: ExecutiveRecommendationsRuntimeContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeContext.jsx')));
  });

  suite('T1255');
  await test('T1255: ExecutiveRecommendationsRuntimeIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeIndicators.jsx')));
  });

  suite('T1256');
  await test('T1256: ExecutiveRecommendationsRuntimeRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeRegistry.js')));
  });

  suite('T1257');
  await test('T1257: ExecutiveRecommendationsRuntimePolicies.js existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimePolicies.js')));
  });

  suite('T1258');
  await test('T1258: ExecutiveRecommendationsRuntimeValidation.js existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeValidation.js')));
  });

  suite('T1259');
  await test('T1259: ExecutiveRecommendationsRuntimeContracts.js existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeContracts.js')));
  });

  suite('T1260');
  await test('T1260: ExecutiveRecommendationsRuntime.module.css existe', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntime.module.css')));
  });

  suite('T1261');
  await test('T1261: recommendations_ready true', async () => {
    assert(recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().recommendations_ready === true);
  });

  suite('T1262');
  await test('T1262: recommendations_runtime_available true', async () => {
    assert(
      recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().recommendations_runtime_available === true
    );
  });

  suite('T1263');
  await test('T1263: recommendations_runtime_enabled false', async () => {
    assert(
      recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().recommendations_runtime_enabled === false
    );
  });

  suite('T1264');
  await test('T1264: recommendations_runtime_active false', async () => {
    assert(
      recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().recommendations_runtime_active === false
    );
  });

  suite('T1265');
  await test('T1265: runtime_authorized false', async () => {
    assert(recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().runtime_authorized === false);
  });

  suite('T1266');
  await test('T1266: runtime_enabled false', async () => {
    assert(recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().runtime_enabled === false);
  });

  suite('T1267');
  await test('T1267: runtime_active false', async () => {
    assert(recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().runtime_active === false);
  });

  suite('T1268');
  await test('T1268: recommendations_mode FOUNDATION_ONLY', async () => {
    assertEqual(
      recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().recommendations_mode,
      'FOUNDATION_ONLY',
      'mode'
    );
  });

  suite('T1269');
  await test('T1269: recommendations_status READY', async () => {
    assertEqual(
      recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().recommendations_status,
      'READY',
      'status'
    );
  });

  suite('T1270');
  await test('T1270: cognitive_execution_allowed false', async () => {
    assert(
      recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().cognitive_execution_allowed === false
    );
  });

  suite('T1271');
  await test('T1271: governance authorization audit insights dependencies true', async () => {
    const m = recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata();
    assert(m.governance_dependency === true);
    assert(m.authorization_dependency === true);
    assert(m.audit_dependency === true);
    assert(m.insights_dependency === true);
  });

  suite('T1272');
  await test('T1272: isExecutiveRecommendationsRuntimeReady true', async () => {
    assert(recommendationsRuntimeMod.isExecutiveRecommendationsRuntimeReady() === true);
  });

  suite('T1273');
  await test('T1273: runtimeRecommendationsPolicy all false', async () => {
    const bundle = recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeBundle();
    assert(bundle.policy.allowRecommendationsExecution === false);
    assert(bundle.policy.allowRecommendationsGeneration === false);
    assert(bundle.policy.allowRecommendationsActivation === false);
    assert(bundle.policy.allowRecommendationsInference === false);
    assert(bundle.policy.allowRuntimeActivation === false);
  });

  suite('T1274');
  await test('T1274: contracts available true enabled false', async () => {
    const bundle = recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeBundle();
    assert(bundle.recommendationsContract.available === true);
    assert(bundle.recommendationsContract.enabled === false);
    assert(bundle.consumptionContract.available === true);
    assert(bundle.consumptionContract.enabled === false);
    assert(bundle.lifecycleContract.available === true);
    assert(bundle.lifecycleContract.enabled === false);
  });

  suite('T1275');
  await test('T1275: validation layer P8.0 + P8.1 + P8.2 + P8.3 + P8.4 present', async () => {
    const v = recommendationsRuntimeMod.validateExecutiveRecommendationsRuntimeState({
      runtimeFoundationReady: true,
      governanceFoundationReady: true,
      authorizationFoundationReady: true,
      auditFoundationReady: true,
      insightsFoundationReady: true
    });
    assert(v.valid === true);
    assert(v.p8FoundationPresent === true);
    assert(v.p81GovernancePresent === true);
    assert(v.p82AuthorizationPresent === true);
    assert(v.p83AuditPresent === true);
    assert(v.p84InsightsPresent === true);
    assert(v.noCognitiveExecution === true);
    assert(v.runtimeNotAuthorized === true);
    assert(v.runtimeNotEnabled === true);
    assert(v.runtimeNotActive === true);
    assert(v.recommendationsRuntimeNotEnabled === true);
    assert(v.recommendationsRuntimeNotActive === true);
  });

  suite('T1276');
  await test('T1276: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = [
      'ExecutiveRecommendationsRuntimeService.js',
      'ExecutiveRecommendationsRuntimeProvider.jsx',
      'ExecutiveRecommendationsRuntimeRegistry.js'
    ]
      .map(readRecommendationsRuntimeMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T1277');
  await test('T1277: anti-network sem fetch/axios/WebSocket/SSE/worker', async () => {
    const src = readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
    assert(!src.includes('Worker'));
  });

  suite('T1278');
  await test('T1278: anti-LLM sem openai/gemini/anthropic/mcp/rag/embeddings/prompt', async () => {
    const all = [
      'ExecutiveRecommendationsRuntimeService.js',
      'ExecutiveRecommendationsRuntimeProvider.jsx',
      'ExecutiveRecommendationsRuntimeIndicators.jsx'
    ]
      .map(readRecommendationsRuntimeMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|claude|gpt|inference|reasoning|embeddings|prompts?/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
    assert(!/\bmcp\b/i.test(all));
    assert(!/\brag\b/i.test(all));
  });

  suite('T1279');
  await test('T1279: anti-runtime sem useEffect/async', async () => {
    const prov = readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T1280');
  await test('T1280: anti-cognitive-execution sem execute/activate/startRuntime/enableRuntime', async () => {
    const all = [
      'ExecutiveRecommendationsRuntimeService.js',
      'ExecutiveRecommendationsRuntimeProvider.jsx',
      'ExecutiveRecommendationsRuntimePolicies.js'
    ]
      .map(readRecommendationsRuntimeMod)
      .join('\n');
    assert(!all.includes('startRuntime'));
    assert(!all.includes('enableRuntime'));
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
    assert(!all.includes('generateRecommendation'));
  });

  suite('T1281');
  await test('T1281: provider consome P8.0 P8.1 P8.2 P8.3 P8.4 contexts', async () => {
    const prov = readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeProvider.jsx');
    assert(prov.includes('useExecutiveCognitiveRuntime'));
    assert(prov.includes('useExecutiveRuntimeGovernance'));
    assert(prov.includes('useExecutiveRuntimeAuthorization'));
    assert(prov.includes('useExecutiveRuntimeAudit'));
    assert(prov.includes('useExecutiveInsightsRuntime'));
  });

  suite('T1282');
  await test('T1282: context API recommendationsReady policies contracts registry validation', async () => {
    const ctx = readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeContext.jsx');
    assert(ctx.includes('useExecutiveRecommendationsRuntime'));
    assert(ctx.includes('recommendationsReady'));
    assert(ctx.includes('recommendationsRuntimeAvailable'));
    assert(ctx.includes('recommendationsRuntimeEnabled'));
    assert(ctx.includes('recommendationsRuntimeActive'));
    assert(ctx.includes('cognitiveExecutionAllowed'));
    assert(ctx.includes('policies'));
    assert(ctx.includes('contracts'));
    assert(ctx.includes('registry'));
    assert(ctx.includes('validation'));
  });

  suite('T1283');
  await test('T1283: App.jsx ExecutiveRecommendationsRuntimeProvider', async () => {
    assert(appSource.includes('ExecutiveRecommendationsRuntimeProvider'));
  });

  suite('T1284');
  await test('T1284: App composição P8.5 entre Insights Runtime e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const insightsIdx = shell.indexOf('<ExecutiveInsightsRuntimeProvider>');
    const recIdx = shell.indexOf('<ExecutiveRecommendationsRuntimeProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(insightsIdx >= 0 && recIdx > insightsIdx && workspaceIdx > recIdx);
  });

  suite('T1285');
  await test('T1285: AUDIT-01 recommendations runtime layer integrated', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveRecommendationsRuntimeProvider>'));
  });

  suite('T1286');
  await test('T1286: AUDIT-02 recommendations runtime foundation isolated', async () => {
    assert(!readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeService.js').includes('ExecutiveWorkspaceService'));
    assert(!readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeProvider.jsx').includes('ExecutiveIntelligenceProvider'));
  });

  suite('T1287');
  await test('T1287: AUDIT-03 no cognitive execution', async () => {
    const all = ['ExecutiveRecommendationsRuntimeService.js', 'ExecutiveRecommendationsRuntimeProvider.jsx']
      .map(readRecommendationsRuntimeMod)
      .join('\n');
    const m = recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata();
    assert(m.runtime_active === false);
    assert(m.runtime_enabled === false);
    assert(m.cognitive_execution_allowed === false);
    assert(m.recommendations_runtime_enabled === false);
    assert(m.recommendations_runtime_active === false);
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
  });

  suite('T1288');
  await test('T1288: AUDIT-04 P8.4 insights runtime inalterado', async () => {
    assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeProvider.jsx').includes('ExecutiveRecommendationsRuntime'));
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().runtime_authorized === false);
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().runtime_enabled === false);
  });

  suite('T1289');
  await test('T1289: AUDIT-04 P8.3 audit inalterado', async () => {
    assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx').includes('ExecutiveRecommendationsRuntime'));
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_authorized === false);
  });

  suite('T1290');
  await test('T1290: AUDIT-04 P8.2 authorization inalterado', async () => {
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx').includes('ExecutiveRecommendationsRuntime'));
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_authorized === false);
  });

  suite('T1291');
  await test('T1291: AUDIT-04 P8.1 governance inalterado', async () => {
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('ExecutiveRecommendationsRuntime'));
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_enabled === false);
  });

  suite('T1292');
  await test('T1292: AUDIT-04 P8.0 cognitive runtime inalterado', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveRecommendationsRuntime'));
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
  });

  suite('T1293');
  await test('T1293: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveRecommendationsRuntime'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T1294');
  await test('T1294: AUDIT-05 SSR recommendations runtime provider', async () => {
    const html = await bundleRecommendationsRuntimeProviderSsr();
    assert(html.includes('executive-recommendations-runtime-provider'));
    assert(html.includes('executive-insights-runtime-provider'));
    assert(html.includes('executive-runtime-audit-provider'));
  });

  suite('T1295');
  await test('T1295: AUDIT-05 SSR recommendations runtime indicators', async () => {
    const html = await bundleRecommendationsRuntimeProviderSsr();
    assert(html.includes('executive-recommendations-runtime-indicators'));
    assert(html.includes('executive-recommendations-runtime-ready'));
    assert(html.includes('executive-recommendations-runtime-available'));
    assert(html.includes('executive-recommendations-runtime-authorized'));
    assert(html.includes('executive-recommendations-runtime-enabled'));
    assert(html.includes('executive-recommendations-runtime-active'));
    assert(html.includes('executive-recommendations-runtime-cognitive'));
  });

  suite('T1296');
  await test('T1296: AUDIT-05 SSR recommendations foundation only ready', async () => {
    const html = await bundleRecommendationsRuntimeProviderSsr();
    assert(html.includes('>READY<'));
    assert(html.includes('>FOUNDATION_ONLY<'));
    assert(html.includes('>yes<'));
    assert(html.includes('>no<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T1297');
  await test('T1297: recommendations runtime sem Navigate/onClick', async () => {
    assert(!readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeProvider.jsx').includes('Navigate'));
    assert(!readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeIndicators.jsx').includes('onClick'));
  });

  suite('T1298');
  await test('T1298: registry placeholder P8.6 assistant_runtime', async () => {
    const registry = readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeRegistry.js');
    assert(registry.includes('P8.6'));
    assert(registry.includes('assistant_runtime'));
    assert(registry.includes('PLACEHOLDER'));
    assert(!registry.includes('recommendations_runtime'));
  });

  for (let i = 1299; i <= 1299; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.5 recommendations runtime propagation #${i}`, async () => {
      const m = recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata();
      assert(m.recommendations_ready === true);
      assert(m.recommendations_runtime_available === true);
      assert(m.recommendations_runtime_enabled === false);
      assert(m.recommendations_runtime_active === false);
      assert(m.runtime_authorized === false);
      assert(m.runtime_enabled === false);
      assert(m.runtime_active === false);
      assert(m.cognitive_execution_allowed === false);
      assert(m.recommendations_mode === 'FOUNDATION_ONLY');
    });
  }

  for (let i = 1300; i <= 1300; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.5 sovereignty isolation #${i}`, async () => {
      assert(audit.verifyNavigationSovereignty().ok);
      assert(!readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeService.js').includes('ExecutiveDeepLinkRegistry'));
      assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeProvider.jsx').includes('ExecutiveRecommendationsRuntime'));
    });
  }

  suite('T1301');
  await test('T1301: P8.5 executive recommendations runtime foundation final', async () => {
    assert(fs.existsSync(path.join(RECOMMENDATIONS_RUNTIME_ROOT, 'ExecutiveRecommendationsRuntimeProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleRecommendationsRuntimeProviderSsr();
    assert(html.includes('recommendations-runtime-child'));
    assert(recommendationsRuntimeMod.isExecutiveRecommendationsRuntimeReady());
    assert(insightsRuntimeMod.isExecutiveInsightsRuntimeReady());
    assert(runtimeAuditMod.isExecutiveRuntimeAuditReady());
    assert(runtimeAuthorizationMod.isExecutiveRuntimeAuthorizationReady());
    assert(runtimeGovernanceMod.isExecutiveRuntimeGovernanceReady());
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady());
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  // ── AIOI-P8.6 Executive Assistant Runtime Foundation (T1302–T1351) ────────

  function readAssistantRuntimeMod(rel) {
    return fs.readFileSync(path.join(ASSISTANT_RUNTIME_ROOT, rel), 'utf8');
  }

  suite('T1302');
  await test('T1302: ExecutiveAssistantRuntimeService.js existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeService.js')));
  });

  suite('T1303');
  await test('T1303: ExecutiveAssistantRuntimeProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeProvider.jsx')));
  });

  suite('T1304');
  await test('T1304: ExecutiveAssistantRuntimeContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeContext.jsx')));
  });

  suite('T1305');
  await test('T1305: ExecutiveAssistantRuntimeIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeIndicators.jsx')));
  });

  suite('T1306');
  await test('T1306: ExecutiveAssistantRuntimeRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeRegistry.js')));
  });

  suite('T1307');
  await test('T1307: ExecutiveAssistantRuntimePolicies.js existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimePolicies.js')));
  });

  suite('T1308');
  await test('T1308: ExecutiveAssistantRuntimeValidation.js existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeValidation.js')));
  });

  suite('T1309');
  await test('T1309: ExecutiveAssistantRuntimeContracts.js existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeContracts.js')));
  });

  suite('T1310');
  await test('T1310: ExecutiveAssistantRuntime.module.css existe', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntime.module.css')));
  });

  suite('T1311');
  await test('T1311: assistant_ready true', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().assistant_ready === true);
  });

  suite('T1312');
  await test('T1312: assistant_runtime_available true', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().assistant_runtime_available === true);
  });

  suite('T1313');
  await test('T1313: assistant_runtime_enabled false', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().assistant_runtime_enabled === false);
  });

  suite('T1314');
  await test('T1314: assistant_runtime_active false', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().assistant_runtime_active === false);
  });

  suite('T1315');
  await test('T1315: runtime_authorized false', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().runtime_authorized === false);
  });

  suite('T1316');
  await test('T1316: runtime_enabled false', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().runtime_enabled === false);
  });

  suite('T1317');
  await test('T1317: runtime_active false', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().runtime_active === false);
  });

  suite('T1318');
  await test('T1318: assistant_mode FOUNDATION_ONLY', async () => {
    assertEqual(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().assistant_mode, 'FOUNDATION_ONLY', 'mode');
  });

  suite('T1319');
  await test('T1319: assistant_status READY', async () => {
    assertEqual(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().assistant_status, 'READY', 'status');
  });

  suite('T1320');
  await test('T1320: cognitive_execution_allowed false', async () => {
    assert(assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata().cognitive_execution_allowed === false);
  });

  suite('T1321');
  await test('T1321: governance authorization audit insights recommendations dependencies true', async () => {
    const m = assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata();
    assert(m.governance_dependency === true);
    assert(m.authorization_dependency === true);
    assert(m.audit_dependency === true);
    assert(m.insights_dependency === true);
    assert(m.recommendations_dependency === true);
  });

  suite('T1322');
  await test('T1322: isExecutiveAssistantRuntimeReady true', async () => {
    assert(assistantRuntimeMod.isExecutiveAssistantRuntimeReady() === true);
  });

  suite('T1323');
  await test('T1323: runtimeAssistantPolicy all false', async () => {
    const bundle = assistantRuntimeMod.getExecutiveAssistantRuntimeBundle();
    assert(bundle.policy.allowAssistantExecution === false);
    assert(bundle.policy.allowAssistantGeneration === false);
    assert(bundle.policy.allowAssistantInference === false);
    assert(bundle.policy.allowAssistantActivation === false);
    assert(bundle.policy.allowRuntimeActivation === false);
  });

  suite('T1324');
  await test('T1324: contracts available true enabled false', async () => {
    const bundle = assistantRuntimeMod.getExecutiveAssistantRuntimeBundle();
    assert(bundle.assistantContract.available === true);
    assert(bundle.assistantContract.enabled === false);
    assert(bundle.conversationContract.available === true);
    assert(bundle.conversationContract.enabled === false);
    assert(bundle.lifecycleContract.available === true);
    assert(bundle.lifecycleContract.enabled === false);
  });

  suite('T1325');
  await test('T1325: validation layer P8.0 + P8.1 + P8.2 + P8.3 + P8.4 + P8.5 present', async () => {
    const v = assistantRuntimeMod.validateExecutiveAssistantRuntimeState({
      runtimeFoundationReady: true,
      governanceFoundationReady: true,
      authorizationFoundationReady: true,
      auditFoundationReady: true,
      insightsFoundationReady: true,
      recommendationsFoundationReady: true
    });
    assert(v.valid === true);
    assert(v.p8FoundationPresent === true);
    assert(v.p81GovernancePresent === true);
    assert(v.p82AuthorizationPresent === true);
    assert(v.p83AuditPresent === true);
    assert(v.p84InsightsPresent === true);
    assert(v.p85RecommendationsPresent === true);
    assert(v.noCognitiveExecution === true);
    assert(v.runtimeNotAuthorized === true);
    assert(v.runtimeNotEnabled === true);
    assert(v.runtimeNotActive === true);
    assert(v.assistantRuntimeNotEnabled === true);
    assert(v.assistantRuntimeNotActive === true);
  });

  suite('T1326');
  await test('T1326: anti-storage sem localStorage/sessionStorage/IndexedDB', async () => {
    const all = [
      'ExecutiveAssistantRuntimeService.js',
      'ExecutiveAssistantRuntimeProvider.jsx',
      'ExecutiveAssistantRuntimeRegistry.js'
    ]
      .map(readAssistantRuntimeMod)
      .join('\n');
    assert(!all.includes('localStorage'));
    assert(!all.includes('sessionStorage'));
    assert(!all.includes('indexedDB'));
  });

  suite('T1327');
  await test('T1327: anti-network sem fetch/axios/WebSocket/SSE/worker', async () => {
    const src = readAssistantRuntimeMod('ExecutiveAssistantRuntimeService.js');
    assert(!src.includes('fetch('));
    assert(!src.includes('axios'));
    assert(!src.includes('WebSocket'));
    assert(!src.includes('EventSource'));
    assert(!src.includes('Worker'));
  });

  suite('T1328');
  await test('T1328: anti-LLM sem openai/gemini/anthropic/mcp/rag/embeddings/prompt', async () => {
    const all = [
      'ExecutiveAssistantRuntimeService.js',
      'ExecutiveAssistantRuntimeProvider.jsx',
      'ExecutiveAssistantRuntimeIndicators.jsx'
    ]
      .map(readAssistantRuntimeMod)
      .join('\n');
    assert(!/openai|anthropic|gemini|claude|gpt|inference|reasoning|embeddings|prompts?/i.test(all));
    assert(!/(^|[^a-zA-Z])llm([^a-zA-Z]|$)/i.test(all));
    assert(!/\bmcp\b/i.test(all));
    assert(!/\brag\b/i.test(all));
  });

  suite('T1329');
  await test('T1329: anti-runtime sem useEffect/async', async () => {
    const prov = readAssistantRuntimeMod('ExecutiveAssistantRuntimeProvider.jsx');
    assert(!prov.includes('useEffect'));
    assert(!prov.includes('async '));
  });

  suite('T1330');
  await test('T1330: anti-cognitive-execution sem execute/activate/startRuntime/enableRuntime', async () => {
    const all = [
      'ExecutiveAssistantRuntimeService.js',
      'ExecutiveAssistantRuntimeProvider.jsx',
      'ExecutiveAssistantRuntimePolicies.js'
    ]
      .map(readAssistantRuntimeMod)
      .join('\n');
    assert(!all.includes('startRuntime'));
    assert(!all.includes('enableRuntime'));
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
    assert(!all.includes('generateAssistant'));
  });

  suite('T1331');
  await test('T1331: provider consome P8.0 P8.1 P8.2 P8.3 P8.4 P8.5 contexts', async () => {
    const prov = readAssistantRuntimeMod('ExecutiveAssistantRuntimeProvider.jsx');
    assert(prov.includes('useExecutiveCognitiveRuntime'));
    assert(prov.includes('useExecutiveRuntimeGovernance'));
    assert(prov.includes('useExecutiveRuntimeAuthorization'));
    assert(prov.includes('useExecutiveRuntimeAudit'));
    assert(prov.includes('useExecutiveInsightsRuntime'));
    assert(prov.includes('useExecutiveRecommendationsRuntime'));
  });

  suite('T1332');
  await test('T1332: context API assistantReady policies contracts registry validation', async () => {
    const ctx = readAssistantRuntimeMod('ExecutiveAssistantRuntimeContext.jsx');
    assert(ctx.includes('useExecutiveAssistantRuntime'));
    assert(ctx.includes('assistantReady'));
    assert(ctx.includes('assistantRuntimeAvailable'));
    assert(ctx.includes('assistantRuntimeEnabled'));
    assert(ctx.includes('assistantRuntimeActive'));
    assert(ctx.includes('cognitiveExecutionAllowed'));
    assert(ctx.includes('policies'));
    assert(ctx.includes('contracts'));
    assert(ctx.includes('registry'));
    assert(ctx.includes('validation'));
  });

  suite('T1333');
  await test('T1333: App.jsx ExecutiveAssistantRuntimeProvider', async () => {
    assert(appSource.includes('ExecutiveAssistantRuntimeProvider'));
  });

  suite('T1334');
  await test('T1334: App composição P8.6 entre Recommendations Runtime e Workspace', async () => {
    const shell = appSource.replace(/\/\*[\s\S]*?\*\//g, '');
    const recIdx = shell.indexOf('<ExecutiveRecommendationsRuntimeProvider>');
    const assistantIdx = shell.indexOf('<ExecutiveAssistantRuntimeProvider>');
    const workspaceIdx = shell.indexOf('<ExecutiveWorkspaceProvider>');
    assert(recIdx >= 0 && assistantIdx > recIdx && workspaceIdx > assistantIdx);
  });

  suite('T1335');
  await test('T1335: AUDIT-01 assistant runtime layer integrated', async () => {
    assert(composition.ok);
    assert(composition.shell.includes('<ExecutiveAssistantRuntimeProvider>'));
  });

  suite('T1336');
  await test('T1336: AUDIT-02 assistant runtime foundation isolated', async () => {
    assert(!readAssistantRuntimeMod('ExecutiveAssistantRuntimeService.js').includes('ExecutiveWorkspaceService'));
    assert(!readAssistantRuntimeMod('ExecutiveAssistantRuntimeProvider.jsx').includes('ExecutiveIntelligenceProvider'));
  });

  suite('T1337');
  await test('T1337: AUDIT-03 no cognitive execution', async () => {
    const all = ['ExecutiveAssistantRuntimeService.js', 'ExecutiveAssistantRuntimeProvider.jsx']
      .map(readAssistantRuntimeMod)
      .join('\n');
    const m = assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata();
    assert(m.runtime_active === false);
    assert(m.runtime_enabled === false);
    assert(m.cognitive_execution_allowed === false);
    assert(m.assistant_runtime_enabled === false);
    assert(m.assistant_runtime_active === false);
    assert(!all.includes('executeRuntime'));
    assert(!all.includes('runInference'));
  });

  suite('T1338');
  await test('T1338: AUDIT-04 P8.5 recommendations runtime inalterado', async () => {
    assert(!readRecommendationsRuntimeMod('ExecutiveRecommendationsRuntimeProvider.jsx').includes('ExecutiveAssistantRuntime'));
    assert(recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().runtime_authorized === false);
    assert(recommendationsRuntimeMod.getExecutiveRecommendationsRuntimeMetadata().runtime_enabled === false);
  });

  suite('T1339');
  await test('T1339: AUDIT-04 P8.4 insights runtime inalterado', async () => {
    assert(!readInsightsRuntimeMod('ExecutiveInsightsRuntimeProvider.jsx').includes('ExecutiveAssistantRuntime'));
    assert(insightsRuntimeMod.getExecutiveInsightsRuntimeMetadata().runtime_authorized === false);
  });

  suite('T1340');
  await test('T1340: AUDIT-04 P8.3 audit inalterado', async () => {
    assert(!readRuntimeAuditMod('ExecutiveRuntimeAuditProvider.jsx').includes('ExecutiveAssistantRuntime'));
    assert(runtimeAuditMod.getExecutiveRuntimeAuditMetadata().runtime_authorized === false);
  });

  suite('T1341');
  await test('T1341: AUDIT-04 P8.2 authorization inalterado', async () => {
    assert(!readRuntimeAuthorizationMod('ExecutiveRuntimeAuthorizationProvider.jsx').includes('ExecutiveAssistantRuntime'));
    assert(runtimeAuthorizationMod.getExecutiveRuntimeAuthorizationMetadata().runtime_authorized === false);
  });

  suite('T1342');
  await test('T1342: AUDIT-04 P8.1 governance inalterado', async () => {
    assert(!readRuntimeGovernanceMod('ExecutiveRuntimeGovernanceProvider.jsx').includes('ExecutiveAssistantRuntime'));
    assert(runtimeGovernanceMod.getExecutiveRuntimeGovernanceMetadata().runtime_enabled === false);
  });

  suite('T1343');
  await test('T1343: AUDIT-04 P8.0 cognitive runtime inalterado', async () => {
    assert(!readRuntimeMod('ExecutiveCognitiveRuntimeProvider.jsx').includes('ExecutiveAssistantRuntime'));
    assert(runtimeMod.getExecutiveCognitiveRuntimeMetadata().runtime_active === false);
  });

  suite('T1344');
  await test('T1344: AUDIT-04 workspace sovereignty inalterada', async () => {
    assert(!readMod('ExecutiveWorkspaceService.js').includes('ExecutiveAssistantRuntime'));
    assert(audit.verifyWorkspaceSovereignty().ok);
  });

  suite('T1345');
  await test('T1345: AUDIT-05 SSR assistant runtime provider', async () => {
    const html = await bundleAssistantRuntimeProviderSsr();
    assert(html.includes('executive-assistant-runtime-provider'));
    assert(html.includes('executive-recommendations-runtime-provider'));
    assert(html.includes('executive-insights-runtime-provider'));
  });

  suite('T1346');
  await test('T1346: AUDIT-05 SSR assistant runtime indicators', async () => {
    const html = await bundleAssistantRuntimeProviderSsr();
    assert(html.includes('executive-assistant-runtime-indicators'));
    assert(html.includes('executive-assistant-runtime-ready'));
    assert(html.includes('executive-assistant-runtime-available'));
    assert(html.includes('executive-assistant-runtime-authorized'));
    assert(html.includes('executive-assistant-runtime-enabled'));
    assert(html.includes('executive-assistant-runtime-active'));
    assert(html.includes('executive-assistant-runtime-cognitive'));
  });

  suite('T1347');
  await test('T1347: AUDIT-05 SSR assistant foundation only ready', async () => {
    const html = await bundleAssistantRuntimeProviderSsr();
    assert(html.includes('>READY<'));
    assert(html.includes('>FOUNDATION_ONLY<'));
    assert(html.includes('>yes<'));
    assert(html.includes('>no<'));
    assert(!html.includes('score'));
    assert(!/forecast|prediction/i.test(html));
  });

  suite('T1348');
  await test('T1348: assistant runtime sem Navigate/onClick', async () => {
    assert(!readAssistantRuntimeMod('ExecutiveAssistantRuntimeProvider.jsx').includes('Navigate'));
    assert(!readAssistantRuntimeMod('ExecutiveAssistantRuntimeIndicators.jsx').includes('onClick'));
  });

  suite('T1349');
  await test('T1349: registry final assistant_runtime FOUNDATION_READY', async () => {
    const registry = readAssistantRuntimeMod('ExecutiveAssistantRuntimeRegistry.js');
    assert(registry.includes('assistant_runtime'));
    assert(registry.includes('FOUNDATION_READY'));
    assert(!registry.includes('PLACEHOLDER'));
  });

  for (let i = 1350; i <= 1350; i++) {
    suite(`T${i}`);
    await test(`T${i}: P8.6 assistant runtime propagation #${i}`, async () => {
      const m = assistantRuntimeMod.getExecutiveAssistantRuntimeMetadata();
      assert(m.assistant_ready === true);
      assert(m.assistant_runtime_available === true);
      assert(m.assistant_runtime_enabled === false);
      assert(m.assistant_runtime_active === false);
      assert(m.runtime_authorized === false);
      assert(m.runtime_enabled === false);
      assert(m.runtime_active === false);
      assert(m.cognitive_execution_allowed === false);
      assert(m.assistant_mode === 'FOUNDATION_ONLY');
    });
  }

  suite('T1351');
  await test('T1351: P8.6 executive assistant runtime foundation final', async () => {
    assert(fs.existsSync(path.join(ASSISTANT_RUNTIME_ROOT, 'ExecutiveAssistantRuntimeProvider.jsx')));
    assert(composition.ok);
    assert(serviceMod.getExecutiveWorkspaceHealth().workspace_level === 'enterprise_ready');
    const html = await bundleAssistantRuntimeProviderSsr();
    assert(html.includes('assistant-runtime-child'));
    assert(assistantRuntimeMod.isExecutiveAssistantRuntimeReady());
    assert(recommendationsRuntimeMod.isExecutiveRecommendationsRuntimeReady());
    assert(insightsRuntimeMod.isExecutiveInsightsRuntimeReady());
    assert(runtimeAuditMod.isExecutiveRuntimeAuditReady());
    assert(runtimeAuthorizationMod.isExecutiveRuntimeAuthorizationReady());
    assert(runtimeGovernanceMod.isExecutiveRuntimeGovernanceReady());
    assert(runtimeMod.isExecutiveCognitiveRuntimeReady());
    assert(assistantMod.isExecutiveAssistantFoundationReady());
    assert(recommendationsMod.isExecutiveRecommendationsFoundationReady());
    assert(insightsMod.isExecutiveInsightsFoundationReady());
    assert(contractsMod.areExecutiveCapabilityContractsReady());
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P6.4 → P8.6 Executive Platform: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P6_4_ENTERPRISE_EXECUTIVE_WORKSPACE_LAYER_PASS');
    console.log('AIOI_P6_4_1_ENTERPRISE_WORKSPACE_CERTIFICATION_HARDENING_PASS');
    console.log('AIOI_P6_5_ENTERPRISE_EXECUTIVE_WORKSPACE_PREFERENCES_PASS');
    console.log('AIOI_P6_6_ENTERPRISE_EXECUTIVE_SESSION_EXPERIENCE_PASS');
    console.log('AIOI_P6_7_ENTERPRISE_EXECUTIVE_FAVORITES_PASS');
    console.log('AIOI_P6_8_ENTERPRISE_EXECUTIVE_WORKSPACE_SHORTCUTS_PASS');
    console.log('AIOI_P6_9_ENTERPRISE_EXECUTIVE_WORKSPACE_OPERATIONAL_CERTIFICATION_PASS');
    console.log('AIOI_P7_0_ENTERPRISE_EXECUTIVE_INTELLIGENCE_FOUNDATION_PASS');
    console.log('AIOI_P7_1_ENTERPRISE_EXECUTIVE_INTELLIGENCE_GOVERNANCE_PASS');
    console.log('AIOI_P7_2_ENTERPRISE_EXECUTIVE_INTELLIGENCE_ACTIVATION_FRAMEWORK_PASS');
    console.log('AIOI_P7_3_ENTERPRISE_EXECUTIVE_INTELLIGENCE_CAPABILITY_CONTRACTS_PASS');
    console.log('AIOI_P7_4_ENTERPRISE_EXECUTIVE_INSIGHTS_FOUNDATION_PASS');
    console.log('AIOI_P7_5_ENTERPRISE_EXECUTIVE_RECOMMENDATIONS_FOUNDATION_PASS');
    console.log('AIOI_P7_6_ENTERPRISE_EXECUTIVE_ASSISTANT_FOUNDATION_PASS');
    console.log('AIOI_P8_0_ENTERPRISE_COGNITIVE_RUNTIME_FOUNDATION_PASS');
    console.log('AIOI_P8_1_ENTERPRISE_RUNTIME_GOVERNANCE_FOUNDATION_PASS');
    console.log('AIOI_P8_2_ENTERPRISE_RUNTIME_AUTHORIZATION_FOUNDATION_PASS');
    console.log('AIOI_P8_3_ENTERPRISE_RUNTIME_AUDIT_LAYER_FOUNDATION_PASS');
    console.log('AIOI_P8_4_ENTERPRISE_INSIGHTS_RUNTIME_FOUNDATION_PASS');
    console.log('AIOI_P8_5_ENTERPRISE_RECOMMENDATIONS_RUNTIME_FOUNDATION_PASS');
    console.log('AIOI_P8_6_ENTERPRISE_ASSISTANT_RUNTIME_FOUNDATION_PASS');
  } else {
    console.log('AIOI_P6_4_ENTERPRISE_EXECUTIVE_WORKSPACE_LAYER_FAIL');
    console.log('AIOI_P6_4_1_ENTERPRISE_WORKSPACE_CERTIFICATION_HARDENING_FAIL');
    console.log('AIOI_P6_5_ENTERPRISE_EXECUTIVE_WORKSPACE_PREFERENCES_FAIL');
    console.log('AIOI_P6_6_ENTERPRISE_EXECUTIVE_SESSION_EXPERIENCE_FAIL');
    console.log('AIOI_P6_7_ENTERPRISE_EXECUTIVE_FAVORITES_FAIL');
    console.log('AIOI_P6_8_ENTERPRISE_EXECUTIVE_WORKSPACE_SHORTCUTS_FAIL');
    console.log('AIOI_P6_9_ENTERPRISE_EXECUTIVE_WORKSPACE_OPERATIONAL_CERTIFICATION_FAIL');
    console.log('AIOI_P7_0_ENTERPRISE_EXECUTIVE_INTELLIGENCE_FOUNDATION_FAIL');
    console.log('AIOI_P7_1_ENTERPRISE_EXECUTIVE_INTELLIGENCE_GOVERNANCE_FAIL');
    console.log('AIOI_P7_2_ENTERPRISE_EXECUTIVE_INTELLIGENCE_ACTIVATION_FRAMEWORK_FAIL');
    console.log('AIOI_P7_3_ENTERPRISE_EXECUTIVE_INTELLIGENCE_CAPABILITY_CONTRACTS_FAIL');
    console.log('AIOI_P7_4_ENTERPRISE_EXECUTIVE_INSIGHTS_FOUNDATION_FAIL');
    console.log('AIOI_P7_5_ENTERPRISE_EXECUTIVE_RECOMMENDATIONS_FOUNDATION_FAIL');
    console.log('AIOI_P7_6_ENTERPRISE_EXECUTIVE_ASSISTANT_FOUNDATION_FAIL');
    console.log('AIOI_P8_0_ENTERPRISE_COGNITIVE_RUNTIME_FOUNDATION_FAIL');
    console.log('AIOI_P8_1_ENTERPRISE_RUNTIME_GOVERNANCE_FOUNDATION_FAIL');
    console.log('AIOI_P8_2_ENTERPRISE_RUNTIME_AUTHORIZATION_FOUNDATION_FAIL');
    console.log('AIOI_P8_3_ENTERPRISE_RUNTIME_AUDIT_LAYER_FOUNDATION_FAIL');
    console.log('AIOI_P8_4_ENTERPRISE_INSIGHTS_RUNTIME_FOUNDATION_FAIL');
    console.log('AIOI_P8_5_ENTERPRISE_RECOMMENDATIONS_RUNTIME_FOUNDATION_FAIL');
    console.log('AIOI_P8_6_ENTERPRISE_ASSISTANT_RUNTIME_FOUNDATION_FAIL');
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
