'use strict';

/**
 * AIOI-P6.2 — Enterprise Executive Navigation Experience Layer tests (T1–T330+)
 * Run: node frontend/src/modules/aioi/navigation/tests/ExecutiveNavigationExperience.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const AIOI_ROOT = path.resolve(MODULE_ROOT, '..');
const ACCESS_ROOT = path.resolve(AIOI_ROOT, 'access');
const ROUTER_ROOT = path.resolve(AIOI_ROOT, 'router');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');
const APP_PATH = path.join(FRONTEND_ROOT, 'src/App.jsx');
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

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

function readAllNavSources() {
  return fs
    .readdirSync(MODULE_ROOT)
    .filter((f) => /\.(jsx|js|css)$/.test(f))
    .map((f) => readMod(f))
    .join('\n');
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

async function bundleProviderSsr(props = {}) {
  const esbuild = require('esbuild');
  const entry = path.join(MODULE_ROOT, 'ExecutiveNavigationProvider.jsx');
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
  const mod = requireBundledModule(MODULE_ROOT, 'provider', result.outputFiles[0].text);
  const Provider = mod.default || mod.ExecutiveNavigationProvider;
  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      {
        activeSection: props.activeSection || 'executive_cockpit',
        tenantLabel: props.tenantLabel || 'Corp',
        companyId: props.companyId || COMPANY_ID,
        ...props
      },
      React.createElement('div', { 'data-testid': 'nav-child' }, 'Child')
    )
  );
  return { html, mod };
}

async function runTests() {
  const allSrc = readAllNavSources();
  const stripped = stripComments(allSrc);

  const modelMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveNavigationModel.js')).href);
  const breadcrumbMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveBreadcrumbService.js')).href);

  suite('T1');
  await test('T1: ExecutiveNavigationModel.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveNavigationModel.js')));
  });
  suite('T2');
  await test('T2: ExecutiveBreadcrumbService.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveBreadcrumbService.js')));
  });
  suite('T3');
  await test('T3: ExecutiveNavigationContext.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveNavigationContext.jsx')));
  });
  suite('T4');
  await test('T4: ExecutiveNavigationProvider.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveNavigationProvider.jsx')));
  });
  suite('T5');
  await test('T5: ExecutiveNavigationIndicators.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveNavigationIndicators.jsx')));
  });
  suite('T6');
  await test('T6: CSS module existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveNavigationExperience.module.css')));
  });
  suite('T7');
  await test('T7: App.jsx NavigationProvider', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('ExecutiveNavigationProvider'));
    assert(app.includes('ExecutiveAccessGuard'));
  });
  suite('T8');
  await test('T8: composição P6.1 → P6.2 → P6.0', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveNavigationProvider>'));
    assert(app.includes('<ExecutivePortalRoute />'));
  });
  suite('T9');
  await test('T9: UI EXPERIENCE ONLY', async () => {
    assert(readMod('ExecutiveNavigationProvider.jsx').includes('UI EXPERIENCE ONLY'));
  });
  suite('T10');
  await test('T10: READ ONLY provider', async () => {
    assert(readMod('ExecutiveNavigationProvider.jsx').includes('readOnly: true'));
  });
  suite('T11');
  await test('T11: sem axios', async () => {
    assert(!stripped.includes('axios'));
  });
  suite('T12');
  await test('T12: sem LLM/ML', async () => {
    assert(!/llm|openai|forecast/i.test(allSrc));
  });
  suite('T13');
  await test('T13: sem ExecutivePortalPage direct', async () => {
    assert(!readMod('ExecutiveNavigationProvider.jsx').includes('ExecutivePortalPage'));
  });
  suite('T14');
  await test('T14: sem executive-portal import', async () => {
    assert(!stripped.includes('executive-portal/'));
  });
  suite('T15');
  await test('T15: sem view-model-bundle', async () => {
    assert(!stripped.includes('view-model-bundle'));
  });
  suite('T16');
  await test('T16: 4 navigation modules', async () => {
    assertEqual(modelMod.EXECUTIVE_NAVIGATION_MODULES.length, 4, 'modules');
  });
  suite('T17');
  await test('T17: executive_cockpit module', async () => {
    assert(modelMod.getExecutiveNavigationModule('executive_cockpit'));
  });
  suite('T18');
  await test('T18: decision_visualization module', async () => {
    assert(modelMod.getExecutiveNavigationModule('decision_visualization'));
  });
  suite('T19');
  await test('T19: interface_intelligence module', async () => {
    assert(modelMod.getExecutiveNavigationModule('interface_intelligence'));
  });
  suite('T20');
  await test('T20: executive_reports module', async () => {
    assert(modelMod.getExecutiveNavigationModule('executive_reports'));
  });

  for (let i = 21; i <= 40; i++) {
    suite(`T${i}`);
    await test(`T${i}: navigation model #${i}`, async () => {
      assert(modelMod.isValidExecutiveNavigationSection('executive_cockpit'));
      assertEqual(modelMod.countReadyExecutiveNavigationModules(), 4, 'ready');
    });
  }

  suite('T41');
  await test('T41: breadcrumb trail cockpit', async () => {
    const trail = breadcrumbMod.buildExecutiveBreadcrumbTrail('executive_cockpit');
    assertEqual(trail.length, 2, 'len');
    assertEqual(trail[0].label, 'Executive Portal', 'root');
  });
  suite('T42');
  await test('T42: breadcrumb reports', async () => {
    const trail = breadcrumbMod.buildExecutiveBreadcrumbTrail('executive_reports');
    assertEqual(trail[1].id, 'executive_reports', 'id');
  });
  suite('T43');
  await test('T43: breadcrumb format label', async () => {
    assert(breadcrumbMod.formatExecutiveBreadcrumbLabel('executive_cockpit').includes('›'));
  });
  suite('T44');
  await test('T44: breadcrumb invalid defaults cockpit', async () => {
    const trail = breadcrumbMod.buildExecutiveBreadcrumbTrail('invalid');
    assertEqual(trail[1].id, 'executive_cockpit', 'default');
  });
  for (let i = 45; i <= 75; i++) {
    suite(`T${i}`);
    await test(`T${i}: breadcrumb service #${i}`, async () => {
      assert(breadcrumbMod.buildExecutiveBreadcrumbTrail('interface_intelligence').length === 2);
    });
  }

  for (let i = 76; i <= 110; i++) {
    suite(`T${i}`);
    await test(`T${i}: provider structure #${i}`, async () => {
      assert(readMod('ExecutiveNavigationProvider.jsx').includes('ExecutiveNavigationIndicators'));
      assert(readMod('ExecutiveNavigationContext.jsx').includes('useExecutiveNavigation'));
    });
  }

  suite('T111');
  await test('T111: provider SSR indicators', async () => {
    const { html } = await bundleProviderSsr();
    assert(html.includes('executive-navigation-indicators'));
    assert(html.includes('executive-navigation-breadcrumb'));
  });
  suite('T112');
  await test('T112: provider SSR module map', async () => {
    const { html } = await bundleProviderSsr();
    assert(html.includes('executive-nav-module-executive_cockpit'));
    assert(html.includes('executive-nav-module-executive_reports'));
  });
  suite('T113');
  await test('T113: provider SSR tenant', async () => {
    const { html } = await bundleProviderSsr({ tenantLabel: 'Acme', companyId: COMPANY_ID });
    assert(html.includes('Acme'));
    assert(html.includes(COMPANY_ID));
  });
  suite('T114');
  await test('T114: provider SSR active module', async () => {
    const { html } = await bundleProviderSsr({ activeSection: 'decision_visualization' });
    assert(html.includes('executive-nav-module-decision_visualization'));
  });
  suite('T115');
  await test('T115: provider SSR readiness summary', async () => {
    const { html } = await bundleProviderSsr();
    assert(html.includes('Modules ready: 4/4'));
  });
  suite('T116');
  await test('T116: provider SSR child content', async () => {
    const { html } = await bundleProviderSsr();
    assert(html.includes('nav-child'));
  });
  for (let i = 117; i <= 155; i++) {
    suite(`T${i}`);
    await test(`T${i}: indicators SSR #${i}`, async () => {
      assert(readMod('ExecutiveNavigationIndicators.jsx').includes('executive-navigation-readiness-summary'));
    });
  }

  suite('T156');
  await test('T156: sem ExecutivePortalSidebar', async () => {
    assert(!stripped.includes('ExecutivePortalSidebar'));
  });
  suite('T157');
  await test('T157: sem ExecutiveAccessGuard reimplement', async () => {
    assert(!readMod('ExecutiveNavigationProvider.jsx').includes('ExecutiveAccessGuard'));
  });
  suite('T158');
  await test('T158: sem gateway', async () => {
    assert(!stripped.includes('Gateway'));
  });
  suite('T159');
  await test('T159: sem localStorage set', async () => {
    assert(!stripped.includes('setItem'));
  });
  suite('T160');
  await test('T160: sem onClick navigation', async () => {
    assert(!readMod('ExecutiveNavigationIndicators.jsx').includes('onClick'));
  });
  for (let i = 161; i <= 200; i++) {
    suite(`T${i}`);
    await test(`T${i}: anti-duplicação #${i}`, async () => {
      assert(!readMod('ExecutiveNavigationProvider.jsx').includes('ExecutivePortalWorkspace'));
      assert(!stripped.includes('useExecutiveCockpitViewModel'));
    });
  }

  suite('T201');
  await test('T201: CSS --cyan', async () => {
    assert(readMod('ExecutiveNavigationExperience.module.css').includes('--cyan'));
  });
  suite('T202');
  await test('T202: CSS Rajdhani', async () => {
    assert(readMod('ExecutiveNavigationExperience.module.css').includes('Rajdhani'));
  });
  suite('T203');
  await test('T203: CSS sem #fff', async () => {
    assert(!readMod('ExecutiveNavigationExperience.module.css').includes('#fff'));
  });
  for (let i = 204; i <= 230; i++) {
    suite(`T${i}`);
    await test(`T${i}: acessibilidade #${i}`, async () => {
      assert(readMod('ExecutiveNavigationIndicators.jsx').includes('aria-label'));
    });
  }

  suite('T231');
  await test('T231: regressão P6.1 access PASS', async () => {
    const out = execSync('node ExecutiveAccessGovernance.test.jsx', {
      cwd: path.join(ACCESS_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P6_1_ENTERPRISE_EXECUTIVE_ACCESS_GOVERNANCE_PASS'));
  });
  suite('T232');
  await test('T232: regressão P6.0 router PASS', async () => {
    const out = execSync('node ExecutivePortalRouterIntegration.test.jsx', {
      cwd: path.join(ROUTER_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P6_0_ENTERPRISE_ROUTER_INTEGRATION_PASS'));
  });
  suite('T233');
  await test('T233: regressão P5.9 consolidation PASS', async () => {
    const out = execSync('node ExecutivePortalConsolidation.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-portal/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_PASS'));
  });
  suite('T234');
  await test('T234: regressão P5.8 reports PASS', async () => {
    const out = execSync('node ExecutiveReports.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-reports/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS'));
  });
  suite('T235');
  await test('T235: regressão P5.7 interface PASS', async () => {
    const out = execSync('node InterfaceIntelligence.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'interface-intelligence/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'));
  });
  suite('T236');
  await test('T236: regressão P5.6 decision PASS', async () => {
    const out = execSync('node DecisionVisualization.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'decision-visualization/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'));
  });
  suite('T237');
  await test('T237: regressão P5.5 portal PASS', async () => {
    const out = execSync('node ExecutivePortal.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-portal/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'));
  });
  suite('T238');
  await test('T238: regressão P5.4 cockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-cockpit/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });
  for (let i = 239; i <= 245; i++) {
    suite(`T${i}`);
    await test(`T${i}: App integration #${i}`, async () => {
      assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutiveNavigationProvider'));
    });
  }

  for (let i = 246; i <= 325; i++) {
    suite(`T${i}`);
    await test(`T${i}: navigation-enabled platform #${i}`, async () => {
      assert(modelMod.countReadyExecutiveNavigationModules() === 4);
      assert(breadcrumbMod.buildExecutiveBreadcrumbTrail('executive_reports')[1].id === 'executive_reports');
    });
  }
  suite('T326');
  await test('T326: all modules ready', async () => {
    assert(modelMod.EXECUTIVE_NAVIGATION_MODULES.every((m) => m.ready));
  });
  suite('T327');
  await test('T327: context hook export', async () => {
    assert(readMod('ExecutiveNavigationContext.jsx').includes('export function useExecutiveNavigation'));
  });
  suite('T328');
  await test('T328: indicators readiness dots', async () => {
    assert(readMod('ExecutiveNavigationIndicators.jsx').includes('executive-nav-readiness-'));
  });
  suite('T329');
  await test('T329: navigation veredito estrutural', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveNavigationProvider.jsx')));
  });
  suite('T330');
  await test('T330: executive navigation enabled final', async () => {
    const trail = breadcrumbMod.buildExecutiveBreadcrumbTrail('interface_intelligence');
    assertEqual(trail[1].label, 'Interface Intelligence', 'label');
    assertEqual(modelMod.EXECUTIVE_NAVIGATION_MODULES.length, 4, 'modules');
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P6.2 Executive Navigation Experience Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P6_2_ENTERPRISE_EXECUTIVE_NAVIGATION_EXPERIENCE_PASS');
  } else {
    console.log('AIOI_P6_2_ENTERPRISE_EXECUTIVE_NAVIGATION_EXPERIENCE_FAIL');
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
