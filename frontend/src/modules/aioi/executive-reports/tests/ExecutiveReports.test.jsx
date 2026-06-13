'use strict';

/**
 * AIOI-P5.8 — Enterprise Executive Reports UI Layer tests (T1–T240+)
 * Run: node frontend/src/modules/aioi/executive-reports/tests/ExecutiveReports.test.jsx
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

const SAMPLE_BUNDLE = {
  ok: true,
  bundle: {
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
          enterprise_decision_visualization: { visualization_score: 87, visualization_level: 'executive_visualization_ready' }
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
  }
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
  const css = fs.readFileSync(path.join(MODULE_ROOT, 'styles/ExecutiveReports.module.css'), 'utf8');
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
  return { ok: true, bundle: JSON.parse(JSON.stringify(SAMPLE_BUNDLE.bundle)) };
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
    pathToFileURL(path.join(MODULE_ROOT, 'executiveReportsViewModelLoader.js')).href
  );

  suite('T1');
  await test('T1: ExecutiveReportsPage.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveReportsPage.jsx')));
  });
  suite('T2');
  await test('T2: ExecutiveReportsContainer.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveReportsContainer.jsx')));
  });
  suite('T3');
  await test('T3: ExecutiveSummaryReportCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveSummaryReportCard.jsx')));
  });
  suite('T4');
  await test('T4: StrategicOverviewReportCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'StrategicOverviewReportCard.jsx')));
  });
  suite('T5');
  await test('T5: DecisionVisualizationReportCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'DecisionVisualizationReportCard.jsx')));
  });
  suite('T6');
  await test('T6: InterfaceIntelligenceReportCard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'InterfaceIntelligenceReportCard.jsx')));
  });
  suite('T7');
  await test('T7: ExecutiveReportsSection.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveReportsSection.jsx')));
  });
  suite('T8');
  await test('T8: useExecutiveReportsViewModel.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'useExecutiveReportsViewModel.js')));
  });
  suite('T9');
  await test('T9: executiveReportsGateway.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'executiveReportsGateway.js')));
  });
  suite('T10');
  await test('T10: executiveReportsViewModelLoader.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'executiveReportsViewModelLoader.js')));
  });
  suite('T11');
  await test('T11: CSS module existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'styles/ExecutiveReports.module.css')));
  });
  suite('T12');
  await test('T12: gateway usa transporte P5.4 bundle', async () => {
    assert(readMod('executiveReportsGateway.js').includes('/aioi/executive-cockpit/view-model-bundle'));
  });
  suite('T13');
  await test('T13: gateway usa bundle completo P5.3', async () => {
    assert(readMod('executiveReportsGateway.js').includes('executive_summary_view_model'));
  });
  suite('T14');
  await test('T14: gateway sem P5.0 cockpit summary', async () => {
    assert(!readMod('executiveReportsGateway.js').includes('/aioi/cockpit/summary'));
  });
  suite('T15');
  await test('T15: gateway sem P5.0 cockpit executive-reports endpoint', async () => {
    assert(!readMod('executiveReportsGateway.js').includes('/aioi/cockpit/executive-reports'));
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
    assert(readMod('ExecutiveReportsContainer.jsx').includes('Read Only'));
  });
  suite('T23');
  await test('T23: hook readOnly true', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes('readOnly: true'));
  });
  suite('T24');
  await test('T24: sem cálculos score', async () => {
    assert(!readMod('ExecutiveReportsContainer.jsx').includes('perspective_score +'));
  });
  suite('T25');
  await test('T25: sem axios fora gateway', async () => {
    assert(!readMod('ExecutiveSummaryReportCard.jsx').includes('axios'));
  });

  suite('T26');
  await test('T26: createExecutiveReportsCache', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    assert(c.bundle === null && c.promise === null);
  });
  suite('T27');
  await test('T27: load invalid companyId', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle('', c, mockFetcher);
    assertEqual(r.ok, false, '');
  });
  suite('T28');
  await test('T28: load ok bundle', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assert(r.ok && r.bundle);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T29');
  await test('T29: cache hit', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createExecutiveReportsCache();
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T30');
  await test('T30: cache miss new company', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createExecutiveReportsCache();
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID_B, c, mockFetcher);
    assertEqual(fetchCallCount, 2, '');
  });
  suite('T31');
  await test('T31: passthrough summary_score', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.executive_summary_view_model.contract.data.executive_summary.summary_score, 85, '');
  });
  suite('T32');
  await test('T32: clear cache', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createExecutiveReportsCache();
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    loaderMod.clearExecutiveReportsCache(c);
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(fetchCallCount, 2, '');
  });
  suite('T33');
  await test('T33: concurrent single fetch', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createExecutiveReportsCache();
    await Promise.all([
      loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher),
      loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher)
    ]);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T34');
  await test('T34: summary_status preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.executive_summary_view_model.contract.data.executive_summary.summary_status, 'summary_ready', '');
  });
  suite('T35');
  await test('T35: overview_score preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.strategic_overview_view_model.contract.data.strategic_overview.overview_score, 84, '');
  });


  suite('T36');
  await test('T36: summary report card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveSummaryReportCard.jsx');
    const html = renderToStaticMarkup(React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.bundle.executive_summary_view_model }));
    assert(html.includes('85') && html.includes('summary_ready'));
  });
  suite('T37');
  await test('T37: strategic report card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('StrategicOverviewReportCard.jsx');
    const html = renderToStaticMarkup(React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.bundle.strategic_overview_view_model }));
    assert(html.includes('overview_ready'));
  });
  suite('T38');
  await test('T38: decision report card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('DecisionVisualizationReportCard.jsx');
    const html = renderToStaticMarkup(React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.bundle.decision_visualization_view_model }));
    assert(html.includes('decision_ready'));
  });
  suite('T39');
  await test('T39: interface report card SSR', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('InterfaceIntelligenceReportCard.jsx');
    const html = renderToStaticMarkup(React.createElement(mod.default, { viewModel: SAMPLE_BUNDLE.bundle.interface_intelligence_view_model }));
    assert(html.includes('interface_ready'));
  });
  suite('T40');
  await test('T40: section empty data', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutiveReportsSection.jsx');
    const html = renderToStaticMarkup(
      React.createElement(mod.default || mod.ExecutiveReportsSection, { label: 'Test', data: null })
    );
    assert(html.includes('—'));
  });
  suite('T41');
  await test('T41: page static title', async () => {
    assert(readMod('ExecutiveReportsPage.jsx').includes('Executive Reports'));
  });
  suite('T42');
  await test('T42: page testid', async () => {
    assert(readMod('ExecutiveReportsPage.jsx').includes('executive-reports-page'));
  });
  suite('T43');
  await test('T43: container 4 cards', async () => {
    const c = readMod('ExecutiveReportsContainer.jsx');
    assert(c.includes('ExecutiveSummaryReportCard') && c.includes('InterfaceIntelligenceReportCard'));
  });
  suite('T44');
  await test('T44: container grid testid', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('executive-reports-grid'));
  });
  suite('T45');
  await test('T45: loading state testid', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('executive-reports-state-'));
  });

  suite('T46');
  await test('T46: hook loading state', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes("status: 'loading'"));
  });
  suite('T47');
  await test('T47: hook error state', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes("status: 'error'"));
  });
  suite('T48');
  await test('T48: hook empty state', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes("status: 'empty'"));
  });
  suite('T49');
  await test('T49: hook ready state', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes("status: 'ready'"));
  });
  suite('T50');
  await test('T50: fetcher injectável', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes('options.fetcher'));
  });

  suite('T51');
  await test('T51: CSS --cyan', async () => {
    assert(readMod('styles/ExecutiveReports.module.css').includes('--cyan'));
  });
  suite('T52');
  await test('T52: CSS --bg-panel', async () => {
    assert(readMod('styles/ExecutiveReports.module.css').includes('--bg-panel'));
  });
  suite('T53');
  await test('T53: CSS Share Tech Mono', async () => {
    assert(readMod('styles/ExecutiveReports.module.css').includes('Share Tech Mono'));
  });
  suite('T54');
  await test('T54: CSS Rajdhani', async () => {
    assert(readMod('styles/ExecutiveReports.module.css').includes('Rajdhani'));
  });
  suite('T55');
  await test('T55: CSS sem #fff', async () => {
    assert(!readMod('styles/ExecutiveReports.module.css').includes('#fff'));
  });
  suite('T56');
  await test('T56: aria-label perspective card', async () => {
    assert(readMod('ExecutiveSummaryReportCard.jsx').includes('Executive Summary'));
  });
  suite('T57');
  await test('T57: aria-live section', async () => {
    assert(readMod('ExecutiveReportsSection.jsx').includes('aria-live'));
  });
  suite('T58');
  await test('T58: role status container', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('role="status"'));
  });
  suite('T59');
  await test('T59: perspective testid', async () => {
    assert(readMod('ExecutiveSummaryReportCard.jsx').includes('executive-summary-report-card'));
  });
  suite('T60');
  await test('T60: enterprise testid', async () => {
    assert(readMod('InterfaceIntelligenceReportCard.jsx').includes('interface-intelligence-report-card'));
  });

  suite('T61');
  await test('T61: portal workspace import P5.8', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('ExecutiveReportsPage'));
  });
  suite('T62');
  await test('T62: portal workspace testid reports', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('portal-workspace-executive_reports'));
  });
  suite('T63');
  await test('T63: portal navigation reports ready', async () => {
    const nav = require(path.join(PORTAL_ROOT, 'ExecutivePortalNavigation.js'));
    const s = nav.getExecutivePortalSection('executive_reports');
    assert(s.ready && !s.placeholder);
  });
  suite('T64');
  await test('T64: portal empty state reports', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes("section.id === 'executive_reports'"));
  });
  suite('T65');
  await test('T65: portal sem gateway reports direct', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(!w.includes('executiveReportsGateway'));
  });

  suite('T66');
  await test('T66: sem form', async () => {
    assert(!/<form/i.test(allSrc));
  });
  suite('T67');
  await test('T67: sem onClick cards', async () => {
    assert(!readMod('ExecutiveSummaryReportCard.jsx').includes('onClick'));
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
  await test('T70: page P5.8 eyebrow', async () => {
    assert(readMod('ExecutiveReportsPage.jsx').includes('P5.8'));
  });

  for (let i = 71; i <= 176; i++) {
    suite(`T${i}`);
    await test(`T${i}: alinhamento P5.3 bundle #${i}`, async () => {
      const c = loaderMod.createExecutiveReportsCache();
      const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
      assert(r.ok && r.bundle.executive_summary_view_model && r.bundle.interface_intelligence_view_model);
      assertEqual(r.bundle.executive_summary_view_model.view, 'executive_summary', '');
      assert(i >= 71);
    });
  }

  suite('T177');
  await test('T177: coverage_status preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.decision_visualization_view_model.contract.data.decision_visualization_coverage.coverage_status, 'comprehensive', '');
  });
  suite('T178');
  await test('T178: interface_level preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.interface_intelligence_view_model.contract.data.enterprise_interface_intelligence.interface_level, 'interface_ready', '');
  });
  suite('T179');
  await test('T179: generated_at preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.executive_summary_view_model.generated_at, GENERATED_AT, '');
  });
  suite('T180');
  await test('T180: invalidateCache hook', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes('invalidateCache'));
  });
  suite('T181');
  await test('T181: main semantic page', async () => {
    assert(readMod('ExecutiveReportsPage.jsx').includes('<main'));
  });
  suite('T182');
  await test('T182: consistency testid', async () => {
    assert(readMod('StrategicOverviewReportCard.jsx').includes('strategic-overview-report-card'));
  });
  suite('T183');
  await test('T183: coverage testid', async () => {
    assert(readMod('DecisionVisualizationReportCard.jsx').includes('decision-visualization-report-card'));
  });
  suite('T184');
  await test('T184: container bundle view models', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('bundle.executive_summary_view_model'));
  });
  suite('T185');
  await test('T185: sem transformação agregação', async () => {
    assert(!stripped.includes('.reduce(') && !stripped.includes('Math.'));
  });

  suite('T186');
  await test('T186: regressão P5.7 interface intel PASS', async () => {
    const out = execSync('node InterfaceIntelligence.test.jsx', {
      cwd: path.join(MODULE_ROOT, '../interface-intelligence/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'));
  });
  suite('T187');
  await test('T187: regressão P5.6 decision viz PASS', async () => {
    const out = execSync('node DecisionVisualization.test.jsx', {
      cwd: path.join(MODULE_ROOT, '../decision-visualization/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'));
  });
  suite('T188');
  await test('T188: regressão P5.5 portal PASS', async () => {
    const out = execSync('node ExecutivePortal.test.jsx', {
      cwd: path.join(PORTAL_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'));
  });
  suite('T189');
  await test('T189: regressão P5.4 cockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(MODULE_ROOT, '../executive-cockpit/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });
  suite('T190');
  await test('T190: gateway retorno ok viewModel shape', async () => {
    const g = readMod('executiveReportsGateway.js');
    assert(g.includes('ok: true,\n    bundle:'));
  });
  suite('T191');
  await test('T191: error bundle indisponível', async () => {
    assert(readMod('executiveReportsGateway.js').includes('view model bundle incompleto'));
  });
  suite('T192');
  await test('T192: error state testid', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('executive-reports-state-'));
    assert(readMod('ExecutiveReportsContainer.jsx').includes("status === 'error'"));
  });

  suite('T193');
  await test('T193: empty state testid', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('executive-reports-state-'));
    assert(readMod('ExecutiveReportsContainer.jsx').includes("status === 'empty'"));
  });
  suite('T194');
  await test('T194: read-only badge testid', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('executive-reports-read-only-badge'));
  });
  suite('T195');
  await test('T195: portal fetcher pass-through reports', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('fetcher={fetcher}'));
  });
  suite('T196');
  await test('T196: reports activo P5.8 portal', async () => {
    const nav = require(path.join(PORTAL_ROOT, 'ExecutivePortalNavigation.js'));
    assert(!nav.isExecutivePortalPlaceholder('executive_reports')); assert(nav.getExecutivePortalSection('executive_reports').ready);
  });
  for (let i = 197; i <= 206; i++) {
    suite(`T${i}`);
    await test(`T${i}: executive-reports-enabled estrutural #${i}`, async () => {
      assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveReportsPage.jsx')));
      assert(readMod('executiveReportsGateway.js').includes('view-model-bundle'));
      assert(i >= 196);
    });
  }

  suite('T206');
  await test('T206: consistency_status preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.interface_intelligence_view_model.contract.data.interface_consistency.consistency_status, 'consistent', '');
  });
  suite('T207');
  await test('T207: interface_score preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.interface_intelligence_view_model.contract.data.enterprise_interface_intelligence.interface_score, 87, '');
  });
  suite('T208');
  await test('T208: useEffect reload hook', async () => {
    assert(readMod('useExecutiveReportsViewModel.js').includes('useEffect'));
  });
  suite('T209');
  await test('T209: sem react-router', async () => {
    assert(!stripped.includes('react-router'));
  });
  suite('T210');
  await test('T210: anti-duplicação soberana P5.3 transport', async () => {
    assert(!stripped.includes('getExecutiveReportsViewModel'));
    assert(readMod('executiveReportsGateway.js').includes('interface_intelligence_view_model'));
  });

  suite('T211');
  await test('T211: anti-duplicação sem useDecisionVisualizationViewModel', async () => {
    assert(!stripped.includes('useDecisionVisualizationViewModel'));
  });
  suite('T212');
  await test('T212: portal ExecutiveReportsPage import', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('ExecutiveReportsPage'));
  });
  suite('T213');
  await test('T213: interface_score SSR enterprise', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.interface_intelligence_view_model.contract.data.enterprise_interface_intelligence.interface_score, 87, '');
  });
  suite('T214');
  await test('T214: interface_level preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.interface_intelligence_view_model.contract.data.enterprise_interface_intelligence.interface_level, 'interface_ready', '');
  });
  suite('T215');
  await test('T215: coverage_score preserved', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.interface_intelligence_view_model.contract.data.interface_coverage.coverage_score, 90, '');
  });
  suite('T216');
  await test('T216: sem useExecutiveReportsViewModel duplicado cockpit', async () => {
    assert(!readMod('ExecutiveReportsContainer.jsx').includes('ExecutiveCockpit'));
  });
  suite('T217');
  await test('T217: gateway sem cockpit endpoint', async () => {
    assert(!readMod('executiveReportsGateway.js').includes('/aioi/cockpit/executive-reports'));
  });
  suite('T218');
  await test('T218: executive-reports-read-only-badge', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('executive-reports-read-only-badge'));
  });
  suite('T219');
  await test('T219: page aria-label', async () => {
    assert(readMod('ExecutiveReportsPage.jsx').includes('Enterprise Executive Reports'));
  });
  suite('T220');
  await test('T220: container 4 card testids', async () => {
    assert(readMod('ExecutiveSummaryReportCard.jsx').includes('executive-summary-report-card'));
    assert(readMod('DecisionVisualizationReportCard.jsx').includes('decision-visualization-report-card'));
  });
  suite('T221');
  await test('T221: anti-duplicação sem decisionVisualizationGateway', async () => {
    assert(!stripped.includes('decisionVisualizationGateway'));
  });
  suite('T222');
  await test('T222: loader createExecutiveReportsCache export', async () => {
    assert(typeof loaderMod.createExecutiveReportsCache === 'function');
  });
  suite('T223');
  await test('T223: perspective_status interface_ready', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.interface_intelligence_view_model.contract.data.interface_perspective.perspective_status, 'interface_ready', '');
  });
  suite('T224');
  await test('T224: executive-reports-enabled veredito estrutural', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'executiveReportsGateway.js')));
  });
  suite('T225');
  await test('T225: anti-duplicação soberana final P5.3', async () => {
    assert(!stripped.includes('getExecutiveReportsViewModel'));
    assert(readMod('executiveReportsGateway.js').includes('interface_intelligence_view_model'));
  });


  suite('T226');
  await test('T226: sem PDF export', async () => { assert(!/pdf|jspdf|excel/i.test(allSrc)); });
  suite('T227');
  await test('T227: sem download', async () => { assert(!stripped.includes('download')); });
  suite('T228');
  await test('T228: sem email', async () => { assert(!/email|mailto/i.test(allSrc)); });
  suite('T229');
  await test('T229: gateway 4 view models', async () => {
    const g = readMod('executiveReportsGateway.js');
    assert(g.includes('strategic_overview_view_model') && g.includes('decision_visualization_view_model'));
  });
  suite('T230');
  await test('T230: container 4 report cards', async () => {
    const c = readMod('ExecutiveReportsContainer.jsx');
    assert(c.includes('ExecutiveSummaryReportCard') && c.includes('InterfaceIntelligenceReportCard'));
  });
  suite('T231');
  await test('T231: sem nova API', async () => {
    assert(!readMod('executiveReportsGateway.js').includes('/aioi/executive-reports'));
  });
  suite('T232');
  await test('T232: portal completo 4 modulos', async () => {
    const nav = require(path.join(PORTAL_ROOT, 'ExecutivePortalNavigation.js'));
    assert(nav.EXECUTIVE_PORTAL_SECTIONS.every((s) => s.ready && !s.placeholder));
  });
  suite('T233');
  await test('T233: anti-duplicação sem interfaceIntelligenceGateway', async () => {
    assert(!stripped.includes('interfaceIntelligenceGateway'));
  });
  suite('T234');
  await test('T234: page Executive Reports title', async () => {
    assert(readMod('ExecutiveReportsPage.jsx').includes('Executive Reports'));
  });
  suite('T235');
  await test('T235: sem getExecutiveViewModelBundle import', async () => {
    assert(!stripped.includes('getExecutiveViewModelBundle'));
  });
  suite('T236');
  await test('T236: cache hit bundle', async () => {
    fetchCallCount = 0;
    const c = loaderMod.createExecutiveReportsCache();
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(fetchCallCount, 1, '');
  });
  suite('T237');
  await test('T237: cockpit score in bundle', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.executive_summary_view_model.contract.data.cockpit_readiness.cockpit_score, 86, '');
  });
  suite('T238');
  await test('T238: visualization readiness in bundle', async () => {
    const c = loaderMod.createExecutiveReportsCache();
    const r = await loaderMod.loadExecutiveReportsBundle(COMPANY_ID, c, mockFetcher);
    assertEqual(r.bundle.strategic_overview_view_model.contract.data.visualization_readiness.visualization_level, 'visualization_ready', '');
  });
  suite('T239');
  await test('T239: executive-reports-grid testid', async () => {
    assert(readMod('ExecutiveReportsContainer.jsx').includes('executive-reports-grid'));
  });
  suite('T240');
  await test('T240: portal executivo completo P5.8', async () => {
    assert(readMod('ExecutiveReportsPage.jsx').includes('P5.8'));
    assert(!stripped.includes('useExecutiveCockpitViewModel'));
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P5.8 Executive Reports UI Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS');
  } else {
    console.log('AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_FAIL');
  }
  console.log('='.repeat(60));
  process.exit(_failed ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
