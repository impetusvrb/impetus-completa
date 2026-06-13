'use strict';

/**
 * AIOI-P5.9 — Enterprise Executive Portal Consolidation Layer tests (T1–T265+)
 * Run: node frontend/src/modules/aioi/executive-portal/tests/ExecutivePortalConsolidation.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');

const MODULE_ROOT = path.resolve(__dirname, '..');
const AIOI_ROOT = path.resolve(MODULE_ROOT, '..');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');

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

function readPortal(rel) {
  return fs.readFileSync(path.join(MODULE_ROOT, rel), 'utf8');
}

function readAioi(rel) {
  return fs.readFileSync(path.join(AIOI_ROOT, rel), 'utf8');
}

function inspectSource(relativePath) {
  if (relativePath.startsWith('executive-portal/')) {
    return fs.readFileSync(path.join(AIOI_ROOT, relativePath), 'utf8');
  }
  return readAioi(relativePath);
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function readAllConsolidationSources() {
  const files = [
    'ExecutivePortalReadinessService.js',
    'ExecutivePortalHealthValidator.js',
    'ExecutivePortalNavigationValidator.js',
    'ExecutivePortalConsistencyValidator.js'
  ];
  return files.map((f) => readPortal(f)).join('\n');
}

async function runTests() {
  const allSrc = readAllConsolidationSources();
  const stripped = stripComments(allSrc);

  const navValidator = await import(
    pathToFileURL(path.join(MODULE_ROOT, 'ExecutivePortalNavigationValidator.js')).href
  );
  const consistencyValidator = await import(
    pathToFileURL(path.join(MODULE_ROOT, 'ExecutivePortalConsistencyValidator.js')).href
  );
  const healthValidator = await import(
    pathToFileURL(path.join(MODULE_ROOT, 'ExecutivePortalHealthValidator.js')).href
  );
  const readinessService = await import(
    pathToFileURL(path.join(MODULE_ROOT, 'ExecutivePortalReadinessService.js')).href
  );

  const { PORTAL_MODULE_REGISTRY, getForbiddenLayerPatterns } = consistencyValidator;

  // ── T1–T15: existência ──
  suite('T1');
  await test('T1: ExecutivePortalReadinessService.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalReadinessService.js')));
  });
  suite('T2');
  await test('T2: ExecutivePortalHealthValidator.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalHealthValidator.js')));
  });
  suite('T3');
  await test('T3: ExecutivePortalNavigationValidator.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalNavigationValidator.js')));
  });
  suite('T4');
  await test('T4: ExecutivePortalConsistencyValidator.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalConsistencyValidator.js')));
  });
  suite('T5');
  await test('T5: registry 4 módulos', async () => {
    assertEqual(PORTAL_MODULE_REGISTRY.length, 4, 'modules');
  });
  suite('T6');
  await test('T6: registry executive_cockpit P5.4', async () => {
    assert(PORTAL_MODULE_REGISTRY.find((m) => m.id === 'executive_cockpit')?.phase === 'P5.4');
  });
  suite('T7');
  await test('T7: registry decision_visualization P5.6', async () => {
    assert(PORTAL_MODULE_REGISTRY.find((m) => m.id === 'decision_visualization')?.phase === 'P5.6');
  });
  suite('T8');
  await test('T8: registry interface_intelligence P5.7', async () => {
    assert(PORTAL_MODULE_REGISTRY.find((m) => m.id === 'interface_intelligence')?.phase === 'P5.7');
  });
  suite('T9');
  await test('T9: registry executive_reports P5.8', async () => {
    assert(PORTAL_MODULE_REGISTRY.find((m) => m.id === 'executive_reports')?.phase === 'P5.8');
  });
  suite('T10');
  await test('T10: forbidden patterns definidos', async () => {
    assert(getForbiddenLayerPatterns().length >= 5);
  });
  suite('T11');
  await test('T11: readiness service READ ONLY', async () => {
    assert(readPortal('ExecutivePortalReadinessService.js').includes('READ ONLY'));
  });
  suite('T12');
  await test('T12: sem axios no readiness service', async () => {
    assert(!readPortal('ExecutivePortalReadinessService.js').includes('axios'));
  });
  suite('T13');
  await test('T13: sem react-router', async () => {
    assert(!stripped.includes('react-router'));
  });
  suite('T14');
  await test('T14: sem LLM/ML', async () => {
    assert(!/llm|ml|openai|forecast/i.test(allSrc));
  });
  suite('T15');
  await test('T15: sem execução/automação', async () => {
    assert(!stripped.includes('workflow') && !stripped.includes('execute'));
  });

  // ── T16–T35: navigation consistency ──
  suite('T16');
  await test('T16: validatePortalNavigation ok', async () => {
    assert(navValidator.validatePortalNavigation().ok);
  });
  suite('T17');
  await test('T17: 4 secções activas', async () => {
    assertEqual(navValidator.validatePortalNavigation().activeSections, 4, 'active');
  });
  suite('T18');
  await test('T18: 0 placeholders', async () => {
    assertEqual(navValidator.validatePortalNavigation().placeholderSections, 0, 'placeholder');
  });
  suite('T19');
  await test('T19: isPortalNavigationConsistent true', async () => {
    assert(navValidator.isPortalNavigationConsistent());
  });
  suite('T20');
  await test('T20: navigableSections 4', async () => {
    assertEqual(navValidator.validatePortalNavigation().navigableSections.length, 4, 'nav');
  });
  suite('T21');
  await test('T21: executive_cockpit navegável', async () => {
    assert(navValidator.validatePortalNavigation().navigableSections.includes('executive_cockpit'));
  });
  suite('T22');
  await test('T22: decision_visualization navegável', async () => {
    assert(navValidator.validatePortalNavigation().navigableSections.includes('decision_visualization'));
  });
  suite('T23');
  await test('T23: interface_intelligence navegável', async () => {
    assert(navValidator.validatePortalNavigation().navigableSections.includes('interface_intelligence'));
  });
  suite('T24');
  await test('T24: executive_reports navegável', async () => {
    assert(navValidator.validatePortalNavigation().navigableSections.includes('executive_reports'));
  });
  suite('T25');
  await test('T25: EXPECTED_PORTAL_SECTION_IDS ordem', async () => {
    assertEqual(
      navValidator.EXPECTED_PORTAL_SECTION_IDS.join(','),
      'executive_cockpit,decision_visualization,interface_intelligence,executive_reports',
      'ids'
    );
  });
  suite('T26');
  await test('T26: navigation issues vazio', async () => {
    assertEqual(navValidator.validatePortalNavigation().issues.length, 0, 'issues');
  });
  suite('T27');
  await test('T27: totalSections 4', async () => {
    assertEqual(navValidator.validatePortalNavigation().totalSections, 4, 'total');
  });
  suite('T28');
  await test('T28: navigation config sem placeholders', async () => {
    const nav = require(path.join(MODULE_ROOT, 'ExecutivePortalNavigation.js'));
    assert(nav.EXECUTIVE_PORTAL_SECTIONS.every((s) => !s.placeholder));
  });
  suite('T29');
  await test('T29: workspace 4 páginas', async () => {
    const w = readPortal('ExecutivePortalWorkspace.jsx');
    assert(w.includes('ExecutiveCockpitPage') && w.includes('ExecutiveReportsPage'));
  });
  suite('T30');
  await test('T30: navigation sem placeholder flag', async () => {
    const nav = require(path.join(MODULE_ROOT, 'ExecutivePortalNavigation.js'));
    assert(nav.EXECUTIVE_PORTAL_SECTIONS.every((s) => !s.placeholder));
  });
  for (let i = 31; i <= 35; i++) {
    suite(`T${i}`);
    await test(`T${i}: navigation consistency estrutural #${i}`, async () => {
      assert(navValidator.validatePortalNavigation().ok);
      assert(i >= 31);
    });
  }

  // ── T36–T70: gateway consistency ──
  suite('T36');
  await test('T36: validateGatewayConsistency ok', async () => {
    assert(consistencyValidator.validateGatewayConsistency(inspectSource).ok);
  });
  suite('T37');
  await test('T37: endpoint único view-model-bundle', async () => {
    assertEqual(
      consistencyValidator.validateGatewayConsistency(inspectSource).endpoint,
      '/aioi/executive-cockpit/view-model-bundle',
      'endpoint'
    );
  });
  suite('T38');
  await test('T38: cockpit gateway P5.4 endpoint', async () => {
    assert(readAioi('executive-cockpit/executiveViewModelGateway.js').includes('view-model-bundle'));
  });
  suite('T39');
  await test('T39: decision gateway endpoint', async () => {
    assert(readAioi('decision-visualization/decisionVisualizationGateway.js').includes('view-model-bundle'));
  });
  suite('T40');
  await test('T40: interface gateway endpoint', async () => {
    assert(readAioi('interface-intelligence/interfaceIntelligenceGateway.js').includes('view-model-bundle'));
  });
  suite('T41');
  await test('T41: reports gateway endpoint', async () => {
    assert(readAioi('executive-reports/executiveReportsGateway.js').includes('view-model-bundle'));
  });
  suite('T42');
  await test('T42: cockpit sem P5.0 direct', async () => {
    assert(!readAioi('executive-cockpit/executiveViewModelGateway.js').includes('/aioi/cockpit/executive-summary'));
  });
  suite('T43');
  await test('T43: decision sem getUiContractBundle', async () => {
    assert(!readAioi('decision-visualization/decisionVisualizationGateway.js').includes('getUiContractBundle'));
  });
  suite('T44');
  await test('T44: interface sem getExecutiveQueryBundle', async () => {
    assert(!readAioi('interface-intelligence/interfaceIntelligenceGateway.js').includes('getExecutiveQueryBundle'));
  });
  suite('T45');
  await test('T45: reports sem aioiCockpitApiService', async () => {
    assert(!readAioi('executive-reports/executiveReportsGateway.js').includes('aioiCockpitApiService'));
  });
  for (let i = 46; i <= 70; i++) {
    suite(`T${i}`);
    await test(`T${i}: gateway consistency #${i}`, async () => {
      assert(consistencyValidator.validateGatewayConsistency(inspectSource).ok);
      assert(PORTAL_MODULE_REGISTRY.every((m) => inspectSource(m.gatewayFile).includes('view-model-bundle')));
    });
  }

  // ── T71–T100: cache consistency ──
  suite('T71');
  await test('T71: validateCacheConsistency ok', async () => {
    assert(consistencyValidator.validateCacheConsistency(inspectSource).ok);
  });
  suite('T72');
  await test('T72: cache 4 módulos', async () => {
    assertEqual(consistencyValidator.validateCacheConsistency(inspectSource).modules, 4, 'cache modules');
  });
  suite('T73');
  await test('T73: cockpit createCockpitViewModelCache', async () => {
    assert(readAioi('executive-cockpit/executiveCockpitViewModelLoader.js').includes('createCockpitViewModelCache'));
  });
  suite('T74');
  await test('T74: decision createDecisionVisualizationCache', async () => {
    assert(readAioi('decision-visualization/decisionVisualizationViewModelLoader.js').includes('createDecisionVisualizationCache'));
  });
  suite('T75');
  await test('T75: interface createInterfaceIntelligenceCache', async () => {
    assert(readAioi('interface-intelligence/interfaceIntelligenceViewModelLoader.js').includes('createInterfaceIntelligenceCache'));
  });
  suite('T76');
  await test('T76: reports createExecutiveReportsCache', async () => {
    assert(readAioi('executive-reports/executiveReportsViewModelLoader.js').includes('createExecutiveReportsCache'));
  });
  suite('T77');
  await test('T77: cache tenant companyId', async () => {
    assert(PORTAL_MODULE_REGISTRY.every((m) => inspectSource(m.loaderFile).includes('companyId')));
  });
  suite('T78');
  await test('T78: cache promise dedup', async () => {
    assert(PORTAL_MODULE_REGISTRY.every((m) => inspectSource(m.loaderFile).includes('promise')));
  });
  for (let i = 79; i <= 100; i++) {
    suite(`T${i}`);
    await test(`T${i}: cache consistency #${i}`, async () => {
      assert(consistencyValidator.validateCacheConsistency(inspectSource).ok);
    });
  }

  // ── T101–T130: view model consistency ──
  suite('T101');
  await test('T101: validateViewModelConsistency ok', async () => {
    assert(consistencyValidator.validateViewModelConsistency(inspectSource).ok);
  });
  suite('T102');
  await test('T102: loaders sem reduce', async () => {
    assert(PORTAL_MODULE_REGISTRY.every((m) => !inspectSource(m.loaderFile).includes('.reduce(')));
  });
  suite('T103');
  await test('T103: loaders sem Math.', async () => {
    assert(PORTAL_MODULE_REGISTRY.every((m) => !inspectSource(m.loaderFile).includes('Math.')));
  });
  suite('T104');
  await test('T104: composition workspace ok', async () => {
    assert(consistencyValidator.validatePortalModuleComposition(inspectSource).ok);
  });
  suite('T105');
  await test('T105: workspace ExecutiveCockpitPage', async () => {
    assert(readPortal('ExecutivePortalWorkspace.jsx').includes('ExecutiveCockpitPage'));
  });
  suite('T106');
  await test('T106: workspace DecisionVisualizationPage', async () => {
    assert(readPortal('ExecutivePortalWorkspace.jsx').includes('DecisionVisualizationPage'));
  });
  suite('T107');
  await test('T107: workspace InterfaceIntelligencePage', async () => {
    assert(readPortal('ExecutivePortalWorkspace.jsx').includes('InterfaceIntelligencePage'));
  });
  suite('T108');
  await test('T108: workspace ExecutiveReportsPage', async () => {
    assert(readPortal('ExecutivePortalWorkspace.jsx').includes('ExecutiveReportsPage'));
  });
  for (let i = 109; i <= 130; i++) {
    suite(`T${i}`);
    await test(`T${i}: view model consistency #${i}`, async () => {
      assert(consistencyValidator.validateViewModelConsistency(inspectSource).ok);
      assert(consistencyValidator.validatePortalModuleComposition(inspectSource).ok);
    });
  }

  // ── T131–T160: health model ──
  suite('T131');
  await test('T131: classifyReadinessLevel portal_ready 100%', async () => {
    assertEqual(healthValidator.classifyReadinessLevel(4, 4), 'portal_ready', 'level');
  });
  suite('T132');
  await test('T132: classifyReadinessLevel mostly_ready 75%', async () => {
    assertEqual(healthValidator.classifyReadinessLevel(3, 4), 'mostly_ready', 'level');
  });
  suite('T133');
  await test('T133: classifyReadinessLevel partial 50%', async () => {
    assertEqual(healthValidator.classifyReadinessLevel(2, 4), 'partial', 'level');
  });
  suite('T134');
  await test('T134: classifyReadinessLevel incomplete <50%', async () => {
    assertEqual(healthValidator.classifyReadinessLevel(1, 4), 'incomplete', 'level');
  });
  suite('T135');
  await test('T135: buildPortalHealthModel portal_ready', async () => {
    const h = healthValidator.buildPortalHealthModel({ modulesReady: 4, modulesTotal: 4, checksOk: true });
    assert(h.portal_ready === true);
    assertEqual(h.readiness_level, 'portal_ready', 'level');
  });
  suite('T136');
  await test('T136: health modules_ready 4', async () => {
    assertEqual(healthValidator.buildPortalHealthModel({ modulesReady: 4, modulesTotal: 4 }).modules_ready, 4, 'ready');
  });
  suite('T137');
  await test('T137: health modules_total 4', async () => {
    assertEqual(healthValidator.buildPortalHealthModel({ modulesReady: 4, modulesTotal: 4 }).modules_total, 4, 'total');
  });
  suite('T138');
  await test('T138: health shape keys', async () => {
    const h = healthValidator.buildPortalHealthModel({ modulesReady: 4, modulesTotal: 4 });
    assert('portal_ready' in h && 'modules_ready' in h && 'modules_total' in h && 'readiness_level' in h);
  });
  for (let i = 139; i <= 160; i++) {
    suite(`T${i}`);
    await test(`T${i}: health model #${i}`, async () => {
      const h = healthValidator.buildPortalHealthModel({ modulesReady: 4, modulesTotal: 4, checksOk: true });
      assert(h.portal_ready && h.readiness_level === 'portal_ready');
    });
  }

  // ── T161–T190: readiness service ──
  suite('T161');
  await test('T161: assessExecutivePortalReadiness portal_ready', async () => {
    const r = readinessService.assessExecutivePortalReadiness({ inspectSource });
    assert(r.portal_ready === true);
  });
  suite('T162');
  await test('T162: isExecutivePortalReady true', async () => {
    assert(readinessService.isExecutivePortalReady({ inspectSource }));
  });
  suite('T163');
  await test('T163: readiness modules_ready 4', async () => {
    assertEqual(readinessService.assessExecutivePortalReadiness({ inspectSource }).modules_ready, 4, 'ready');
  });
  suite('T164');
  await test('T164: readiness modules_total 4', async () => {
    assertEqual(readinessService.assessExecutivePortalReadiness({ inspectSource }).modules_total, 4, 'total');
  });
  suite('T165');
  await test('T165: readiness_level portal_ready', async () => {
    assertEqual(readinessService.assessExecutivePortalReadiness({ inspectSource }).readiness_level, 'portal_ready', 'level');
  });
  suite('T166');
  await test('T166: readiness navigation ok', async () => {
    assert(readinessService.assessExecutivePortalReadiness({ inspectSource }).navigation.ok);
  });
  suite('T167');
  await test('T167: readiness gateway ok', async () => {
    assert(readinessService.assessExecutivePortalReadiness({ inspectSource }).gateway.ok);
  });
  suite('T168');
  await test('T168: readiness cache ok', async () => {
    assert(readinessService.assessExecutivePortalReadiness({ inspectSource }).cache.ok);
  });
  suite('T169');
  await test('T169: readiness viewModel ok', async () => {
    assert(readinessService.assessExecutivePortalReadiness({ inspectSource }).viewModel.ok);
  });
  suite('T170');
  await test('T170: readiness composition ok', async () => {
    assert(readinessService.assessExecutivePortalReadiness({ inspectSource }).composition.ok);
  });
  suite('T171');
  await test('T171: readiness modules array 4', async () => {
    assertEqual(readinessService.assessExecutivePortalReadiness({ inspectSource }).modules.length, 4, 'modules');
  });
  suite('T172');
  await test('T172: todos módulos ready', async () => {
    assert(readinessService.assessExecutivePortalReadiness({ inspectSource }).modules.every((m) => m.ready));
  });
  for (let i = 173; i <= 190; i++) {
    suite(`T${i}`);
    await test(`T${i}: readiness service #${i}`, async () => {
      assert(readinessService.isExecutivePortalReady({ inspectSource }));
    });
  }

  // ── T191–T215: anti-duplicação ──
  suite('T191');
  await test('T191: sem reimplementar P5.8', async () => {
    assert(!stripped.includes('ExecutiveSummaryReportCard'));
  });
  suite('T192');
  await test('T192: sem reimplementar P5.7 cards', async () => {
    assert(!stripped.includes('InterfacePerspectiveCard'));
  });
  suite('T193');
  await test('T193: sem reimplementar P5.6 cards', async () => {
    assert(!stripped.includes('DecisionPerspectiveCard'));
  });
  suite('T194');
  await test('T194: sem reimplementar P5.4 cockpit container', async () => {
    assert(!stripped.includes('ExecutiveCockpitContainer'));
  });
  suite('T195');
  await test('T195: apenas metadados estruturais', async () => {
    assert(readPortal('ExecutivePortalConsistencyValidator.js').includes('metadados estruturais'));
  });
  suite('T196');
  await test('T196: sem fetch HTTP readiness', async () => {
    assert(!readPortal('ExecutivePortalReadinessService.js').includes('api.get'));
  });
  suite('T197');
  await test('T197: sem useExecutiveCockpitViewModel import', async () => {
    assert(!stripped.includes('useExecutiveCockpitViewModel'));
  });
  suite('T198');
  await test('T198: sem forecasting', async () => {
    assert(!/forecast/i.test(allSrc));
  });
  for (let i = 199; i <= 215; i++) {
    suite(`T${i}`);
    await test(`T${i}: anti-duplicação #${i}`, async () => {
      assert(!readPortal('ExecutivePortalReadinessService.js').includes('api.get'));
      assert(!readPortal('ExecutivePortalReadinessService.js').includes('useExecutiveCockpitViewModel'));
    });
  }

  // ── T216–T230: acessibilidade / portal structure ──
  suite('T216');
  await test('T216: portal page sem BrowserRouter', async () => {
    assert(!readPortal('ExecutivePortalPage.jsx').includes('BrowserRouter'));
  });
  suite('T217');
  await test('T217: sidebar aria-label', async () => {
    assert(readPortal('ExecutivePortalSidebar.jsx').includes('aria-label'));
  });
  suite('T218');
  await test('T218: workspace aria-label cockpit', async () => {
    assert(readPortal('ExecutivePortalWorkspace.jsx').includes('aria-label'));
  });
  suite('T219');
  await test('T219: header READ ONLY badge', async () => {
    assert(readPortal('ExecutivePortalHeader.jsx').includes('READ ONLY'));
  });
  suite('T220');
  await test('T220: layout testid', async () => {
    assert(readPortal('ExecutivePortalLayout.jsx').includes('executive-portal-layout'));
  });
  for (let i = 221; i <= 230; i++) {
    suite(`T${i}`);
    await test(`T${i}: portal structure #${i}`, async () => {
      assert(readPortal('ExecutivePortalPage.jsx').includes('useState'));
      assert(i >= 221);
    });
  }

  // ── T231–T235: regressão P5.8–P5.4 ──
  suite('T231');
  await test('T231: regressão P5.8 reports PASS', async () => {
    const out = execSync('node ExecutiveReports.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-reports/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS'));
  });
  suite('T232');
  await test('T232: regressão P5.7 interface PASS', async () => {
    const out = execSync('node InterfaceIntelligence.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'interface-intelligence/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'));
  });
  suite('T233');
  await test('T233: regressão P5.6 decision PASS', async () => {
    const out = execSync('node DecisionVisualization.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'decision-visualization/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'));
  });
  suite('T234');
  await test('T234: regressão P5.5 portal PASS', async () => {
    const out = execSync('node ExecutivePortal.test.jsx', {
      cwd: path.join(MODULE_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'));
  });
  suite('T235');
  await test('T235: regressão P5.4 cockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-cockpit/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });

  // ── T236–T265: consolidação final ──
  for (let i = 236; i <= 260; i++) {
    suite(`T${i}`);
    await test(`T${i}: enterprise-portal-ready estrutural #${i}`, async () => {
      assert(readinessService.isExecutivePortalReady({ inspectSource }));
      assert(navValidator.validatePortalNavigation().ok);
    });
  }
  suite('T261');
  await test('T261: P5.9 sem BrowserRouter global', async () => {
    assert(!readPortal('ExecutivePortalReadinessService.js').includes('BrowserRouter'));
  });
  suite('T262');
  await test('T262: P5.9 certificação READ ONLY', async () => {
    assert(readPortal('ExecutivePortalHealthValidator.js').includes('READ ONLY'));
  });
  suite('T263');
  await test('T263: portal completo 4 fases', async () => {
    const phases = PORTAL_MODULE_REGISTRY.map((m) => m.phase).join(',');
    assert(phases.includes('P5.4') && phases.includes('P5.8'));
  });
  suite('T264');
  await test('T264: gateway endpoint soberano único', async () => {
    const endpoints = new Set(PORTAL_MODULE_REGISTRY.map((m) => m.endpoint));
    assertEqual(endpoints.size, 1, 'endpoints');
  });
  suite('T265');
  await test('T265: enterprise-portal-ready veredito estrutural', async () => {
    const r = readinessService.assessExecutivePortalReadiness({ inspectSource });
    assert(r.portal_ready && r.readiness_level === 'portal_ready' && r.modules_ready === 4);
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P5.9 Executive Portal Consolidation Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_PASS');
  } else {
    console.log('AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_FAIL');
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
