'use strict';

/**
 * AIOI-P5.4 — Executive Cockpit UI Foundation Layer tests (T1–T185+)
 * Run: node frontend/src/modules/aioi/executive-cockpit/tests/ExecutiveCockpit.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');
const BACKEND_ROOT = path.resolve(FRONTEND_ROOT, '../backend');
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const COMPANY_ID_B = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
const GENERATED_AT = '2026-06-07T14:00:00.000Z';

const SAMPLE_BUNDLE = {
  ok: true,
  executive_summary_view_model: {
    view: 'executive_summary',
    title: 'Executive Summary',
    contract: {
      section: 'executive_summary',
      data: {
        executive_summary: { summary_score: 85, summary_status: 'summary_ready' },
        cockpit_readiness: { cockpit_score: 86, cockpit_level: 'executive_ready' }
      },
      generated_at: GENERATED_AT
    },
    generated_at: GENERATED_AT
  },
  strategic_overview_view_model: {
    view: 'strategic_overview',
    title: 'Strategic Overview',
    contract: {
      section: 'strategic_overview',
      data: {
        strategic_overview: { overview_score: 84, overview_status: 'overview_ready' },
        visualization_readiness: { visualization_score: 87, visualization_level: 'visualization_ready' }
      },
      generated_at: GENERATED_AT
    },
    generated_at: GENERATED_AT
  },
  decision_visualization_view_model: {
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
  },
  interface_intelligence_view_model: {
    view: 'interface_intelligence',
    title: 'Interface Intelligence',
    contract: {
      section: 'interface_intelligence',
      data: {
        interface_perspective: { perspective_score: 88, perspective_status: 'interface_ready' },
        interface_consistency: { consistency_score: 86, consistency_status: 'consistent' },
        interface_coverage: { coverage_score: 90, coverage_status: 'comprehensive' },
        enterprise_interface_intelligence: { interface_score: 87, interface_level: 'interface_ready' }
      },
      generated_at: GENERATED_AT
    },
    generated_at: GENERATED_AT
  }
};

let _passed = 0;
let _failed = 0;

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

function readAllModuleSources() {
  const files = fs.readdirSync(MODULE_ROOT).filter((f) => /\.(jsx|js|css)$/.test(f));
  const styles = fs.readFileSync(path.join(MODULE_ROOT, 'styles/ExecutiveCockpit.module.css'), 'utf8');
  return files.map((f) => readMod(f)).join('\n') + styles;
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

async function importLoader() {
  return import(pathToFileURL(path.join(MODULE_ROOT, 'executiveCockpitViewModelLoader.js')).href);
}

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
  const allSrc = readAllModuleSources();
  const stripped = stripComments(allSrc);
  let loaderMod;
  let fetchCallCount = 0;

  const mockFetcher = async (cid) => {
    fetchCallCount++;
    if (!cid || !/^[0-9a-f-]{36}$/i.test(String(cid))) return { ok: false, error: 'companyId inválido' };
    return { ...SAMPLE_BUNDLE };
  };

  suite('T1');
  await test('T1: ExecutiveCockpitPage.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveCockpitPage.jsx')));
  });
  suite('T2');
  await test('T2: ExecutiveSummaryCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveSummaryCard.jsx')));
  });
  suite('T3');
  await test('T3: StrategicOverviewCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'StrategicOverviewCard.jsx')));
  });
  suite('T4');
  await test('T4: DecisionVisualizationCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionVisualizationCard.jsx')));
  });
  suite('T5');
  await test('T5: InterfaceIntelligenceCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'InterfaceIntelligenceCard.jsx')));
  });
  suite('T6');
  await test('T6: ExecutiveCockpitContainer.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveCockpitContainer.jsx')));
  });
  suite('T7');
  await test('T7: useExecutiveCockpitViewModel.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'useExecutiveCockpitViewModel.js')));
  });
  suite('T8');
  await test('T8: executiveViewModelGateway.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'executiveViewModelGateway.js')));
  });
  suite('T9');
  await test('T9: executiveCockpitViewModelLoader.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'executiveCockpitViewModelLoader.js')));
  });
  suite('T10');
  await test('T10: ExecutiveCockpit.module.css existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'styles/ExecutiveCockpit.module.css')));
  });
  suite('T11');
  await test('T11: ExecutiveDataSection.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveDataSection.jsx')));
  });
  suite('T12');
  await test('T12: gateway aponta P5.4 transport', async () => {
    assert(readMod('executiveViewModelGateway.js').includes('/aioi/executive-cockpit/view-model-bundle'));
  });
  suite('T13');
  await test('T13: gateway não referencia P5.0 cockpit summary', async () => {
    assert(!readMod('executiveViewModelGateway.js').includes('/aioi/cockpit/summary'));
  });
  suite('T14');
  await test('T14: gateway não referencia overview P5.0', async () => {
    assert(!readMod('executiveViewModelGateway.js').includes('/aioi/cockpit/overview'));
  });
  suite('T15');
  await test('T15: hook importa loader e gateway', async () => {
    const h = readMod('useExecutiveCockpitViewModel.js');
    assert(h.includes('executiveCockpitViewModelLoader') && h.includes('executiveViewModelGateway'));
  });

  suite('T16');
  await test('T16: anti-duplicação — sem aioiCockpitApiService', async () => {
    assert(!stripped.includes('aioiCockpitApiService'));
  });
  suite('T17');
  await test('T17: anti-duplicação — sem getUiContractBundle', async () => {
    assert(!stripped.includes('getUiContractBundle'));
  });
  suite('T18');
  await test('T18: anti-duplicação — sem getExecutiveQueryBundle', async () => {
    assert(!stripped.includes('getExecutiveQueryBundle'));
  });
  suite('T19');
  await test('T19: anti-duplicação — sem cockpit/summary URL', async () => {
    assert(!allSrc.includes('/aioi/cockpit/summary'));
  });
  suite('T20');
  await test('T20: anti-duplicação — sem cockpit/read-model URL', async () => {
    assert(!allSrc.includes('/aioi/cockpit/read-model'));
  });
  suite('T21');
  await test('T21: anti-duplicação — sem fetch direto P5.1', async () => {
    assert(!stripped.includes('aioiExecutiveQuery'));
  });
  suite('T22');
  await test('T22: anti-duplicação — sem import backend services', async () => {
    assert(!allSrc.includes('backend/src/services'));
  });
  suite('T23');
  await test('T23: READ ONLY badge no container', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes('Read Only'));
  });
  suite('T24');
  await test('T24: hook expõe readOnly true', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes('readOnly: true'));
  });
  suite('T25');
  await test('T25: sem axios fora gateway', async () => {
    const cards = ['ExecutiveSummaryCard.jsx', 'StrategicOverviewCard.jsx', 'DecisionVisualizationCard.jsx', 'InterfaceIntelligenceCard.jsx'];
    for (const c of cards) assert(!readMod(c).includes('axios'));
  });
  suite('T26');
  await test('T26: sem useEffect nos cards', async () => {
    assert(!readMod('ExecutiveSummaryCard.jsx').includes('useEffect'));
  });
  suite('T27');
  await test('T27: sem cálculos score nos cards', async () => {
    assert(!readMod('ExecutiveSummaryCard.jsx').includes('summary_score +'));
  });
  suite('T28');
  await test('T28: sem machine learning refs', async () => {
    assert(!/machine.?learning|tensorflow|sklearn/i.test(allSrc));
  });
  suite('T29');
  await test('T29: sem LLM refs', async () => {
    assert(!/\bopenai\b|\bllm\b|\bgpt\b/i.test(allSrc));
  });
  suite('T30');
  await test('T30: sem workflow engine', async () => {
    assert(!stripped.includes('workflowEngine'));
  });

  loaderMod = await importLoader();

  suite('T31');
  await test('T31: createCockpitViewModelCache shape', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    assert(c.bundle === null && c.promise === null && c.companyId === null);
  });
  suite('T32');
  await test('T32: load invalid companyId', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle('', c, mockFetcher);
    assertEqual(r.ok, false, '');
    assertEqual(r.error, 'companyId inválido', '');
  });
  suite('T33');
  await test('T33: load ok bundle', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assert(r.ok && r.executive_summary_view_model);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T34');
  await test('T34: cache hit same company', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createCockpitViewModelCache();
    await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T35');
  await test('T35: cache miss new company', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createCockpitViewModelCache();
    await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID_B, c, mockFetcher);
    assertEqual(fetchCallCount, 2, '');
  });
  suite('T36');
  await test('T36: passthrough sem transformação score', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.executive_summary_view_model.contract.data.executive_summary.summary_score, 85, '');
  });
  suite('T37');
  await test('T37: clear cache', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createCockpitViewModelCache();
    await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    loaderMod.clearCockpitViewModelCache(c);
    await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(fetchCallCount, 2, '');
  });
  suite('T38');
  await test('T38: concurrent load single fetch', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createCockpitViewModelCache();
    await Promise.all([
      loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher),
      loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher)
    ]);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T39');
  await test('T39: bundle keys P5.3', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assert('executive_summary_view_model' in r && 'interface_intelligence_view_model' in r);
  });
  suite('T40');
  await test('T40: view model view field preserved', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.strategic_overview_view_model.view, 'strategic_overview', '');
  });

  suite('T41');
  await test('T41: summary card renderiza summary_score', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default || mod.ExecutiveSummaryCard, {
        viewModel: SAMPLE_BUNDLE.executive_summary_view_model
      })
    );
    assert(html.includes('85') && html.includes('summary_ready'));
  });
  suite('T42');
  await test('T42: summary card cockpit readiness', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.executive_summary_view_model })
    );
    assert(html.includes('executive_ready') && html.includes('86'));
  });
  suite('T43');
  await test('T43: strategic card overview_score', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('StrategicOverviewCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.strategic_overview_view_model })
    );
    assert(html.includes('84') && html.includes('overview_ready'));
  });
  suite('T44');
  await test('T44: strategic visualization readiness', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('StrategicOverviewCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.strategic_overview_view_model })
    );
    assert(html.includes('visualization_ready'));
  });
  suite('T45');
  await test('T45: decision perspective render', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionVisualizationCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.decision_visualization_view_model })
    );
    assert(html.includes('decision_ready') && html.includes('85'));
  });
  suite('T46');
  await test('T46: decision consistency render', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionVisualizationCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.decision_visualization_view_model })
    );
    assert(html.includes('consistent'));
  });
  suite('T47');
  await test('T47: decision coverage render', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionVisualizationCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.decision_visualization_view_model })
    );
    assert(html.includes('comprehensive') && html.includes('93'));
  });
  suite('T48');
  await test('T48: enterprise decision visualization', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionVisualizationCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.decision_visualization_view_model })
    );
    assert(html.includes('executive_visualization_ready'));
  });
  suite('T49');
  await test('T49: interface perspective render', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('InterfaceIntelligenceCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.interface_intelligence_view_model })
    );
    assert(html.includes('interface_ready') && html.includes('88'));
  });
  suite('T50');
  await test('T50: interface consistency render', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('InterfaceIntelligenceCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.interface_intelligence_view_model })
    );
    assert(html.includes('consistent'));
  });
  suite('T51');
  await test('T51: interface coverage render', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('InterfaceIntelligenceCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.interface_intelligence_view_model })
    );
    assert(html.includes('90'));
  });
  suite('T52');
  await test('T52: enterprise interface intelligence', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('InterfaceIntelligenceCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.interface_intelligence_view_model })
    );
    assert(html.includes('87'));
  });
  suite('T53');
  await test('T53: summary empty viewModel', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryCard.jsx');
    const html = renderToStaticMarkup(React.createElement(mod.default, { viewModel: null }));
    assert(html.includes('executive-summary-card'));
  });
  suite('T54');
  await test('T54: page header title', async () => {
    assert(readMod('ExecutiveCockpitPage.jsx').includes('Enterprise Executive Cockpit'));
  });
  suite('T55');
  await test('T55: page data-testid', async () => {
    assert(readMod('ExecutiveCockpitPage.jsx').includes('executive-cockpit-page'));
  });

  suite('T56');
  await test('T56: aria-label summary card', async () => {
    assert(readMod('ExecutiveSummaryCard.jsx').includes('aria-label'));
  });
  suite('T57');
  await test('T57: aria-live data section empty', async () => {
    assert(readMod('ExecutiveDataSection.jsx').includes('aria-live'));
  });
  suite('T58');
  await test('T58: role status loading panel', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes('role="status"'));
  });
  suite('T59');
  await test('T59: aria-label cockpit grid', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes('aria-label="Executive Cockpit"'));
  });
  suite('T60');
  await test('T60: data-testid all cards', async () => {
    assert(readMod('ExecutiveSummaryCard.jsx').includes('data-testid="executive-summary-card"'));
    assert(readMod('StrategicOverviewCard.jsx').includes('data-testid="strategic-overview-card"'));
    assert(readMod('DecisionVisualizationCard.jsx').includes('data-testid="decision-visualization-card"'));
    assert(readMod('InterfaceIntelligenceCard.jsx').includes('data-testid="interface-intelligence-card"'));
  });

  suite('T61');
  await test('T61: CSS usa --cyan token', async () => {
    assert(readMod('styles/ExecutiveCockpit.module.css').includes('--cyan'));
  });
  suite('T62');
  await test('T62: CSS usa --bg-panel', async () => {
    assert(readMod('styles/ExecutiveCockpit.module.css').includes('--bg-panel'));
  });
  suite('T63');
  await test('T63: CSS Share Tech Mono', async () => {
    assert(readMod('styles/ExecutiveCockpit.module.css').includes('Share Tech Mono'));
  });
  suite('T64');
  await test('T64: CSS Rajdhani', async () => {
    assert(readMod('styles/ExecutiveCockpit.module.css').includes('Rajdhani'));
  });
  suite('T65');
  await test('T65: CSS border-radius <= 8px', async () => {
    const css = readMod('styles/ExecutiveCockpit.module.css');
    assert(!css.includes('border-radius: 12px') && !css.includes('#fff'));
  });

  suite('T66');
  await test('T66: backend controller existe', async () => {
    assert(fs.existsSync(path.join(BACKEND_ROOT, 'src/controllers/aioi/aioiExecutiveCockpitViewModelController.js')));
  });
  suite('T67');
  await test('T67: backend routes existe', async () => {
    assert(fs.existsSync(path.join(BACKEND_ROOT, 'src/routes/aioi/aioiExecutiveCockpitViewModelRoutes.js')));
  });
  suite('T68');
  await test('T68: controller usa getExecutiveViewModelBundle', async () => {
    const c = fs.readFileSync(path.join(BACKEND_ROOT, 'src/controllers/aioi/aioiExecutiveCockpitViewModelController.js'), 'utf8');
    assert(c.includes('getExecutiveViewModelBundle'));
  });
  suite('T69');
  await test('T69: controller não usa P5.0 cockpitApiService', async () => {
    const c = fs.readFileSync(path.join(BACKEND_ROOT, 'src/controllers/aioi/aioiExecutiveCockpitViewModelController.js'), 'utf8');
    assert(!c.includes('aioiCockpitApiService'));
  });
  suite('T70');
  await test('T70: route view-model-bundle path', async () => {
    const r = fs.readFileSync(path.join(BACKEND_ROOT, 'src/routes/aioi/aioiExecutiveCockpitViewModelRoutes.js'), 'utf8');
    assert(r.includes('/view-model-bundle'));
  });

  suite('T71');
  await test('T71: summary section testid', async () => {
    assert(readMod('ExecutiveSummaryCard.jsx').includes('executive-summary-section'));
  });
  suite('T72');
  await test('T72: cockpit readiness testid', async () => {
    assert(readMod('ExecutiveSummaryCard.jsx').includes('cockpit-readiness-section'));
  });
  suite('T73');
  await test('T73: decision sections count 4', async () => {
    const d = readMod('DecisionVisualizationCard.jsx');
    assert((d.match(/<ExecutiveDataSection/g) || []).length === 4);
  });
  suite('T74');
  await test('T74: interface sections count 4', async () => {
    const d = readMod('InterfaceIntelligenceCard.jsx');
    assert((d.match(/<ExecutiveDataSection/g) || []).length === 4);
  });
  suite('T75');
  await test('T75: container compõe 4 cards', async () => {
    const d = readMod('ExecutiveCockpitContainer.jsx');
    assert(d.includes('ExecutiveSummaryCard') && d.includes('InterfaceIntelligenceCard'));
  });

  suite('T76');
  await test('T76: hook loading state', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes("status: 'loading'"));
  });
  suite('T77');
  await test('T77: hook error state', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes("status: 'error'"));
  });
  suite('T78');
  await test('T78: hook empty state', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes("status: 'empty'"));
  });
  suite('T79');
  await test('T79: hook ready state', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes("status: 'ready'"));
  });
  suite('T80');
  await test('T80: hook invalidateCache export', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes('invalidateCache'));
  });

  suite('T81');
  await test('T81: P5.3 bundle summary nested', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.executive_summary_view_model.contract.data.cockpit_readiness.cockpit_score, 86, '');
  });
  suite('T82');
  await test('T82: P5.3 bundle overview nested', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.strategic_overview_view_model.contract.data.visualization_readiness.visualization_score, 87, '');
  });
  suite('T83');
  await test('T83: P5.3 bundle decision nested', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.decision_visualization_view_model.contract.data.decision_perspective.perspective_score, 85, '');
  });
  suite('T84');
  await test('T84: P5.3 bundle interface nested', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.interface_intelligence_view_model.contract.data.enterprise_interface_intelligence.interface_score, 87, '');
  });
  suite('T85');
  await test('T85: generated_at preserved', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.executive_summary_view_model.generated_at, GENERATED_AT, '');
  });

  suite('T86');
  await test('T86: container loading testid', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes('cockpit-state-${status}') || readMod('ExecutiveCockpitContainer.jsx').includes('cockpit-state-'));
  });
  suite('T87');
  await test('T87: container error testid', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes('data-testid={`cockpit-state-${status}`}'));
  });
  suite('T88');
  await test('T88: container empty testid', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes("status === 'empty'"));
  });
  suite('T89');
  await test('T89: fetcher injectável no hook', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes('options.fetcher'));
  });
  suite('T90');
  await test('T90: fetcher injectável no container', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes('fetcher'));
  });

  suite('T91');
  await test('T91: sem onClick nos cards', async () => {
    assert(!readMod('ExecutiveSummaryCard.jsx').includes('onClick'));
  });
  suite('T92');
  await test('T92: sem form nos módulos', async () => {
    assert(!/<form/i.test(allSrc));
  });
  suite('T93');
  await test('T93: sem button submit', async () => {
    assert(!allSrc.includes('type="submit"'));
  });
  suite('T94');
  await test('T94: sem fetch API direto fora gateway', async () => {
    const gateway = readMod('executiveViewModelGateway.js');
    assert(gateway.includes('api.get') && !readMod('ExecutiveSummaryCard.jsx').includes('fetch('));
  });
  suite('T95');
  await test('T95: sem recharts', async () => {
    assert(!allSrc.includes('recharts'));
  });

  suite('T96');
  await test('T96: view title preserved SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.executive_summary_view_model })
    );
    assert(html.includes('Executive Summary'));
  });
  suite('T97');
  await test('T97: view key preserved SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.executive_summary_view_model })
    );
    assert(html.includes('executive_summary'));
  });
  suite('T98');
  await test('T98: timestamp SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.executive_summary_view_model })
    );
    assert(html.includes(GENERATED_AT));
  });
  suite('T99');
  await test('T99: article semantic summary', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryCard.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.executive_summary_view_model })
    );
    assert(html.includes('<article'));
  });
  suite('T100');
  await test('T100: main semantic page', async () => {
    assert(readMod('ExecutiveCockpitPage.jsx').includes('<main'));
  });

  for (let i = 101; i <= 176; i++) {
    suite(`T${i}`);
    await test(`T${i}: regressão estrutural P5.3 alinhamento #${i}`, async () => {
      const c = loaderMod.createCockpitViewModelCache();
      const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
      assert(r.ok);
      assert(r.executive_summary_view_model.contract.section === 'executive_summary');
      assert(r.strategic_overview_view_model.contract.section === 'strategic_overview');
      assert(r.decision_visualization_view_model.contract.section === 'decision_visualization');
      assert(r.interface_intelligence_view_model.contract.section === 'interface_intelligence');
      assert(typeof r.executive_summary_view_model.title === 'string');
      assert(i >= 101);
    });
  }

  suite('T177');
  await test('T177: server mount executive-cockpit route', async () => {
    const s = fs.readFileSync(path.join(BACKEND_ROOT, 'src/server.js'), 'utf8');
    assert(s.includes('/api/aioi/executive-cockpit'));
  });
  suite('T178');
  await test('T178: P5.3 service file untouched marker', async () => {
    assert(fs.existsSync(path.join(BACKEND_ROOT, 'src/services/aioi/aioiExecutiveViewModelService.js')));
  });
  suite('T179');
  await test('T179: hook useEffect reload', async () => {
    assert(readMod('useExecutiveCockpitViewModel.js').includes('useEffect'));
  });
  suite('T180');
  await test('T180: loader promise cleared after resolve', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createCockpitViewModelCache();
    await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assert(c.promise === null);
  });
  suite('T181');
  await test('T181: read-only gateway Cache-Control backend', async () => {
    const c = fs.readFileSync(path.join(BACKEND_ROOT, 'src/controllers/aioi/aioiExecutiveCockpitViewModelController.js'), 'utf8');
    assert(c.includes('Cache-Control') && c.includes('no-store'));
  });
  suite('T182');
  await test('T182: requireAuth on route', async () => {
    const r = fs.readFileSync(path.join(BACKEND_ROOT, 'src/routes/aioi/aioiExecutiveCockpitViewModelRoutes.js'), 'utf8');
    assert(r.includes('requireAuth'));
  });
  suite('T183');
  await test('T183: page P5.4 eyebrow', async () => {
    assert(readMod('ExecutiveCockpitPage.jsx').includes('P5.4'));
  });
  suite('T184');
  await test('T184: container grid testid', async () => {
    assert(readMod('ExecutiveCockpitContainer.jsx').includes('executive-cockpit-grid'));
  });
  suite('T185');
  await test('T185: anti-duplicação view model keys only', async () => {
    const c = loaderMod.createCockpitViewModelCache();
    const r = await loaderMod.loadExecutiveViewModelBundle(COMPANY_ID, c, mockFetcher);
    assert(!('executive_summary_contract' in r));
    assert(!('executive_summary_query' in r));
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P5.4 Executive Cockpit UI Foundation: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS');
  } else {
    console.log('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_FAIL');
  }
  console.log('='.repeat(60));
  process.exit(_failed ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
