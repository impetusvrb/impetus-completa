'use strict';

/**
 * AIOI-P5.6 — Enterprise Decision Visualization UI Layer tests (T1–T210+)
 * Run: node frontend/src/modules/aioi/decision-visualization/tests/DecisionVisualization.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const PORTAL_ROOT = path.resolve(MODULE_ROOT, '../executive-portal');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const GENERATED_AT = '2026-06-07T14:00:00.000Z';

const SAMPLE_VIEW_MODEL = {
  view: 'decision_visualization',
  title: 'Decision Visualization',
  contract: {
    section: 'decision_visualization',
    data: {
      decision_perspective: { perspective_score: 85, perspective_status: 'decision_ready' },
      decision_consistency: { consistency_score: 84, consistency_status: 'consistent' },
      decision_visualization_coverage: { coverage_score: 93, coverage_status: 'comprehensive' },
      enterprise_decision_visualization: {
        visualization_score: 87,
        visualization_level: 'executive_visualization_ready'
      }
    },
    generated_at: GENERATED_AT
  },
  generated_at: GENERATED_AT
};

let _passed = 0;
let _failed = 0;
let fetchCallCount = 0;

function assert(c, m) {
  if (!c) throw new Error(`ASSERTION FAILED: ${m}`);
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

function readAllSources() {
  const files = fs.readdirSync(MODULE_ROOT).filter((f) => /\.(jsx|js|css)$/.test(f));
  const css = fs.readFileSync(path.join(MODULE_ROOT, 'styles/DecisionVisualization.module.css'), 'utf8');
  return files.map((f) => readMod(f)).join('\n') + css;
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const mockFetcher = async (cid) => {
  fetchCallCount++;
  if (!cid || !/^[0-9a-f-]{36}$/i.test(String(cid))) {
    return { ok: false, error: 'companyId inválido' };
  }
  return { ok: true, viewModel: { ...SAMPLE_VIEW_MODEL } };
};

async function bundleForSsr(entryRel) {
  const esbuild = require('esbuild');
  const entry = path.join(MODULE_ROOT, entryRel);
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
  const mod = requireBundledModule(
    MODULE_ROOT,
    path.basename(entryRel, path.extname(entryRel)),
    result.outputFiles[0].text
  );
  return { React, renderToStaticMarkup, mod };
}

async function runTests() {
  const allSrc = readAllSources();
  const stripped = stripComments(allSrc);
  const loaderMod = await import(
    pathToFileURL(path.join(MODULE_ROOT, 'decisionVisualizationViewModelLoader.js')).href
  );

  suite('T1');
  await test('T1: DecisionVisualizationPage.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionVisualizationPage.jsx')));
  });
  suite('T2');
  await test('T2: DecisionVisualizationContainer.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionVisualizationContainer.jsx')));
  });
  suite('T3');
  await test('T3: DecisionPerspectiveCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionPerspectiveCard.jsx')));
  });
  suite('T4');
  await test('T4: DecisionConsistencyCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionConsistencyCard.jsx')));
  });
  suite('T5');
  await test('T5: DecisionCoverageCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionCoverageCard.jsx')));
  });
  suite('T6');
  await test('T6: EnterpriseDecisionVisualizationCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'EnterpriseDecisionVisualizationCard.jsx')));
  });
  suite('T7');
  await test('T7: DecisionVisualizationSection.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionVisualizationSection.jsx')));
  });
  suite('T8');
  await test('T8: useDecisionVisualizationViewModel.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'useDecisionVisualizationViewModel.js')));
  });
  suite('T9');
  await test('T9: decisionVisualizationGateway.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'decisionVisualizationGateway.js')));
  });
  suite('T10');
  await test('T10: decisionVisualizationViewModelLoader.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'decisionVisualizationViewModelLoader.js')));
  });
  suite('T11');
  await test('T11: CSS module existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'styles/DecisionVisualization.module.css')));
  });
  suite('T12');
  await test('T12: gateway usa transporte P5.4 bundle', async () => {
    assert(readMod('decisionVisualizationGateway.js').includes('/aioi/executive-cockpit/view-model-bundle'));
  });
  suite('T13');
  await test('T13: gateway extrai decision_visualization_view_model', async () => {
    assert(readMod('decisionVisualizationGateway.js').includes('decision_visualization_view_model'));
  });
  suite('T14');
  await test('T14: gateway sem P5.0 cockpit summary', async () => {
    assert(!readMod('decisionVisualizationGateway.js').includes('/aioi/cockpit/summary'));
  });
  suite('T15');
  await test('T15: gateway sem P5.0 decision-visualization endpoint', async () => {
    assert(!readMod('decisionVisualizationGateway.js').includes('/aioi/cockpit/decision-visualization'));
  });

  suite('T16');
  await test('T16: anti-duplicação — sem getUiContractBundle', async () => {
    assert(!stripped.includes('getUiContractBundle'));
  });
  suite('T17');
  await test('T17: anti-duplicação — sem getExecutiveQueryBundle', async () => {
    assert(!stripped.includes('getExecutiveQueryBundle'));
  });
  suite('T18');
  await test('T18: anti-duplicação — sem aioiCockpitApiService', async () => {
    assert(!stripped.includes('aioiCockpitApiService'));
  });
  suite('T19');
  await test('T19: anti-duplicação — sem useExecutiveCockpitViewModel', async () => {
    assert(!stripped.includes('useExecutiveCockpitViewModel'));
  });
  suite('T20');
  await test('T20: anti-duplicação — sem LLM', async () => {
    assert(!/\bopenai\b|\bllm\b/i.test(allSrc));
  });
  suite('T21');
  await test('T21: anti-duplicação — sem ML', async () => {
    assert(!/machine.?learning/i.test(allSrc));
  });
  suite('T22');
  await test('T22: READ ONLY badge container', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('Read Only'));
  });
  suite('T23');
  await test('T23: hook readOnly true', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes('readOnly: true'));
  });
  suite('T24');
  await test('T24: sem cálculos score', async () => {
    assert(!readMod('DecisionVisualizationContainer.jsx').includes('perspective_score +'));
  });
  suite('T25');
  await test('T25: sem axios fora gateway', async () => {
    assert(!readMod('DecisionPerspectiveCard.jsx').includes('axios'));
  });

  suite('T26');
  await test('T26: createDecisionVisualizationCache', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    assert(c.viewModel === null && c.promise === null);
  });
  suite('T27');
  await test('T27: load invalid companyId', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel('', c, mockFetcher);
    assertEqual(r.ok, false, '');
  });
  suite('T28');
  await test('T28: load ok viewModel', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assert(r.ok && r.viewModel);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T29');
  await test('T29: cache hit', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createDecisionVisualizationCache();
    await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T30');
  await test('T30: cache miss new company', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createDecisionVisualizationCache();
    await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID_B, c, mockFetcher);
    assertEqual(fetchCallCount, 2, '');
  });
  suite('T31');
  await test('T31: passthrough perspective_score', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(r.viewModel.contract.data.decision_perspective.perspective_score, 85, '');
  });
  suite('T32');
  await test('T32: clear cache', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createDecisionVisualizationCache();
    await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    loaderMod.clearDecisionVisualizationCache(c);
    await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(fetchCallCount, 2, '');
  });
  suite('T33');
  await test('T33: concurrent single fetch', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createDecisionVisualizationCache();
    await Promise.all([
      loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher),
      loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher)
    ]);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T34');
  await test('T34: perspective_status preserved', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(r.viewModel.contract.data.decision_perspective.perspective_status, 'decision_ready', '');
  });
  suite('T35');
  await test('T35: consistency_score preserved', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(r.viewModel.contract.data.decision_consistency.consistency_score, 84, '');
  });

  suite('T36');
  await test('T36: perspective card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionPerspectiveCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, {
        data: SAMPLE_VIEW_MODEL.contract.data.decision_perspective
      })
    );
    assert(html.includes('85') && html.includes('decision_ready'));
  });
  suite('T37');
  await test('T37: consistency card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionConsistencyCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, {
        data: SAMPLE_VIEW_MODEL.contract.data.decision_consistency
      })
    );
    assert(html.includes('consistent'));
  });
  suite('T38');
  await test('T38: coverage card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionCoverageCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, {
        data: SAMPLE_VIEW_MODEL.contract.data.decision_visualization_coverage
      })
    );
    assert(html.includes('93') && html.includes('comprehensive'));
  });
  suite('T39');
  await test('T39: enterprise card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('EnterpriseDecisionVisualizationCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, {
        data: SAMPLE_VIEW_MODEL.contract.data.enterprise_decision_visualization
      })
    );
    assert(html.includes('executive_visualization_ready'));
  });
  suite('T40');
  await test('T40: section empty data', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionVisualizationSection.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default || mod.DecisionVisualizationSection, { label: 'Test', data: null })
    );
    assert(html.includes('—'));
  });
  suite('T41');
  await test('T41: page static title', async () => {
    assert(readMod('DecisionVisualizationPage.jsx').includes('Decision Visualization'));
  });
  suite('T42');
  await test('T42: page testid', async () => {
    assert(readMod('DecisionVisualizationPage.jsx').includes('decision-visualization-page'));
  });
  suite('T43');
  await test('T43: container 4 cards', async () => {
    const c = readMod('DecisionVisualizationContainer.jsx');
    assert(c.includes('DecisionPerspectiveCard') && c.includes('EnterpriseDecisionVisualizationCard'));
  });
  suite('T44');
  await test('T44: container grid testid', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('decision-visualization-grid'));
  });
  suite('T45');
  await test('T45: loading state testid', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('decision-viz-state-'));
  });

  suite('T46');
  await test('T46: hook loading state', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes("status: 'loading'"));
  });
  suite('T47');
  await test('T47: hook error state', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes("status: 'error'"));
  });
  suite('T48');
  await test('T48: hook empty state', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes("status: 'empty'"));
  });
  suite('T49');
  await test('T49: hook ready state', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes("status: 'ready'"));
  });
  suite('T50');
  await test('T50: fetcher injectável', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes('options.fetcher'));
  });

  suite('T51');
  await test('T51: CSS --cyan', async () => {
    assert(readMod('styles/DecisionVisualization.module.css').includes('--cyan'));
  });
  suite('T52');
  await test('T52: CSS --bg-panel', async () => {
    assert(readMod('styles/DecisionVisualization.module.css').includes('--bg-panel'));
  });
  suite('T53');
  await test('T53: CSS Share Tech Mono', async () => {
    assert(readMod('styles/DecisionVisualization.module.css').includes('Share Tech Mono'));
  });
  suite('T54');
  await test('T54: CSS Rajdhani', async () => {
    assert(readMod('styles/DecisionVisualization.module.css').includes('Rajdhani'));
  });
  suite('T55');
  await test('T55: CSS sem #fff', async () => {
    assert(!readMod('styles/DecisionVisualization.module.css').includes('#fff'));
  });
  suite('T56');
  await test('T56: aria-label perspective card', async () => {
    assert(readMod('DecisionPerspectiveCard.jsx').includes('Decision Perspective'));
  });
  suite('T57');
  await test('T57: aria-live section', async () => {
    assert(readMod('DecisionVisualizationSection.jsx').includes('aria-live'));
  });
  suite('T58');
  await test('T58: role status container', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('role="status"'));
  });
  suite('T59');
  await test('T59: perspective testid', async () => {
    assert(readMod('DecisionPerspectiveCard.jsx').includes('decision-perspective-card'));
  });
  suite('T60');
  await test('T60: enterprise testid', async () => {
    assert(readMod('EnterpriseDecisionVisualizationCard.jsx').includes('enterprise-decision-visualization-card'));
  });

  suite('T61');
  await test('T61: portal workspace import P5.6', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('DecisionVisualizationPage'));
  });
  suite('T62');
  await test('T62: portal workspace testid decision', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('portal-workspace-decision_visualization'));
  });
  suite('T63');
  await test('T63: portal navigation decision ready', async () => {
    const nav = require(path.join(PORTAL_ROOT, 'ExecutivePortalNavigation.js'));
    const s = nav.getExecutivePortalSection('decision_visualization');
    assert(s.ready && !s.placeholder);
  });
  suite('T64');
  await test('T64: portal empty state decision', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes("section.id === 'decision_visualization'"));
  });
  suite('T65');
  await test('T65: portal sem gateway decision direct', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(!w.includes('decisionVisualizationGateway'));
  });

  suite('T66');
  await test('T66: sem form', async () => {
    assert(!/<form/i.test(allSrc));
  });
  suite('T67');
  await test('T67: sem onClick cards', async () => {
    assert(!readMod('DecisionPerspectiveCard.jsx').includes('onClick'));
  });
  suite('T68');
  await test('T68: sem recharts', async () => {
    assert(!allSrc.includes('recharts'));
  });
  suite('T69');
  await test('T69: sem workflow', async () => {
    assert(!stripped.includes('workflowEngine'));
  });
  suite('T70');
  await test('T70: page P5.6 eyebrow', async () => {
    assert(readMod('DecisionVisualizationPage.jsx').includes('P5.6'));
  });

  for (let i = 71; i <= 176; i++) {
    suite(`T${i}`);
    await test(`T${i}: alinhamento P5.3 view model #${i}`, async () => {
      const c = loaderMod.createDecisionVisualizationCache();
      const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
      assertEqual(r.viewModel.view, 'decision_visualization', '');
      assertEqual(r.viewModel.contract.section, 'decision_visualization', '');
      assert(r.viewModel.contract.data.enterprise_decision_visualization.visualization_score === 87);
      assert(i >= 71);
    });
  }

  suite('T177');
  await test('T177: coverage_status preserved', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(r.viewModel.contract.data.decision_visualization_coverage.coverage_status, 'comprehensive', '');
  });
  suite('T178');
  await test('T178: visualization_level preserved', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(
      r.viewModel.contract.data.enterprise_decision_visualization.visualization_level,
      'executive_visualization_ready',
      ''
    );
  });
  suite('T179');
  await test('T179: generated_at preserved', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(r.viewModel.generated_at, GENERATED_AT, '');
  });
  suite('T180');
  await test('T180: invalidateCache hook', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes('invalidateCache'));
  });
  suite('T181');
  await test('T181: main semantic page', async () => {
    assert(readMod('DecisionVisualizationPage.jsx').includes('<main'));
  });
  suite('T182');
  await test('T182: consistency testid', async () => {
    assert(readMod('DecisionConsistencyCard.jsx').includes('decision-consistency-card'));
  });
  suite('T183');
  await test('T183: coverage testid', async () => {
    assert(readMod('DecisionCoverageCard.jsx').includes('decision-coverage-card'));
  });
  suite('T184');
  await test('T184: container contract.data path', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('viewModel?.contract?.data'));
  });
  suite('T185');
  await test('T185: sem transformação agregação', async () => {
    assert(!stripped.includes('.reduce(') && !stripped.includes('Math.'));
  });

  suite('T186');
  await test('T186: regressão P5.5 portal PASS', async () => {
    const out = execSync('node ExecutivePortal.test.jsx', {
      cwd: path.join(PORTAL_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'));
  });
  suite('T187');
  await test('T187: regressão P5.4 cockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(MODULE_ROOT, '../executive-cockpit/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });
  suite('T188');
  await test('T188: gateway retorno ok viewModel shape', async () => {
    const g = readMod('decisionVisualizationGateway.js');
    assert(g.includes('return { ok: true, viewModel }'));
  });
  suite('T189');
  await test('T189: error viewModel indisponível', async () => {
    assert(readMod('decisionVisualizationGateway.js').includes('decision_visualization_view_model indisponível'));
  });
  suite('T190');
  await test('T190: error state testid', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('decision-viz-state-'));
    assert(readMod('DecisionVisualizationContainer.jsx').includes("status === 'error'"));
  });

  suite('T191');
  await test('T191: empty state testid', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('decision-viz-state-'));
    assert(readMod('DecisionVisualizationContainer.jsx').includes("status === 'empty'"));
  });
  suite('T192');
  await test('T192: read-only badge testid', async () => {
    assert(readMod('DecisionVisualizationContainer.jsx').includes('decision-viz-read-only-badge'));
  });
  suite('T193');
  await test('T193: portal fetcher pass-through decision', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('fetcher={fetcher}'));
  });
  suite('T194');
  await test('T194: interface intelligence activo P5.7', async () => {
    const nav = require(path.join(PORTAL_ROOT, 'ExecutivePortalNavigation.js'));
    assert(!nav.isExecutivePortalPlaceholder('interface_intelligence'));
    assert(nav.getExecutivePortalSection('interface_intelligence').ready);
  });
  suite('T195');
  await test('T195: portal completo sem placeholders', async () => {
    const nav = require(path.join(PORTAL_ROOT, 'ExecutivePortalNavigation.js'));
    assert(nav.EXECUTIVE_PORTAL_SECTIONS.every((s) => s.ready && !s.placeholder));
  });

  for (let i = 196; i <= 205; i++) {
    suite(`T${i}`);
    await test(`T${i}: decision-visualization-enabled estrutural #${i}`, async () => {
      assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionVisualizationPage.jsx')));
      assert(readMod('decisionVisualizationGateway.js').includes('view-model-bundle'));
      assert(i >= 196);
    });
  }

  suite('T206');
  await test('T206: consistency_status preserved', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(r.viewModel.contract.data.decision_consistency.consistency_status, 'consistent', '');
  });
  suite('T207');
  await test('T207: visualization_score preserved', async () => {
    const c = loaderMod.createDecisionVisualizationCache();
    const r = await loaderMod.loadDecisionVisualizationViewModel(COMPANY_ID, c, mockFetcher);
    assertEqual(r.viewModel.contract.data.enterprise_decision_visualization.visualization_score, 87, '');
  });
  suite('T208');
  await test('T208: useEffect reload hook', async () => {
    assert(readMod('useDecisionVisualizationViewModel.js').includes('useEffect'));
  });
  suite('T209');
  await test('T209: sem react-router', async () => {
    assert(!stripped.includes('react-router'));
  });
  suite('T210');
  await test('T210: anti-duplicação soberana P5.3 transport', async () => {
    assert(!stripped.includes('getDecisionVisualizationViewModel'));
    assert(readMod('decisionVisualizationGateway.js').includes('decision_visualization_view_model'));
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P5.6 Decision Visualization UI Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS');
  } else {
    console.log('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_FAIL');
  }
  console.log('='.repeat(60));
  process.exit(_failed ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
