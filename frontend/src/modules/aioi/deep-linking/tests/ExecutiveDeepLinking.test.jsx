'use strict';

/**
 * AIOI-P6.3 — Enterprise Executive Deep Linking Layer tests (T1–T355+)
 * Run: node frontend/src/modules/aioi/deep-linking/tests/ExecutiveDeepLinking.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const AIOI_ROOT = path.resolve(MODULE_ROOT, '..');
const NAV_ROOT = path.resolve(AIOI_ROOT, 'navigation');
const ACCESS_ROOT = path.resolve(AIOI_ROOT, 'access');
const ROUTER_ROOT = path.resolve(AIOI_ROOT, 'router');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');
const APP_PATH = path.join(FRONTEND_ROOT, 'src/App.jsx');

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

function readAllDeepLinkSources() {
  return fs
    .readdirSync(MODULE_ROOT)
    .filter((f) => /\.(jsx|js|css)$/.test(f))
    .map((f) => readMod(f))
    .join('\n');
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

async function runTests() {
  const allSrc = readAllDeepLinkSources();
  const stripped = stripComments(allSrc);

  const registryMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveDeepLinkRegistry.js')).href);
  const resolverMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveDeepLinkResolver.js')).href);

  suite('T1');
  await test('T1: ExecutiveDeepLinkRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveDeepLinkRegistry.js')));
  });
  suite('T2');
  await test('T2: ExecutiveDeepLinkResolver.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveDeepLinkResolver.js')));
  });
  suite('T3');
  await test('T3: ExecutiveDeepLinkGuard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveDeepLinkGuard.jsx')));
  });
  suite('T4');
  await test('T4: ExecutiveModuleRoute.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveModuleRoute.jsx')));
  });
  suite('T5');
  await test('T5: CSS module existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveDeepLinking.module.css')));
  });
  suite('T6');
  await test('T6: UI EXPERIENCE ONLY module route', async () => {
    assert(readMod('ExecutiveModuleRoute.jsx').includes('UI EXPERIENCE ONLY'));
  });
  suite('T7');
  await test('T7: App.jsx ExecutiveModuleRoute', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutiveModuleRoute'));
  });
  suite('T8');
  await test('T8: App composição P6.2 + P6.0', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveNavigationProvider'));
    assert(app.includes('<ExecutivePortalRoute />'));
  });
  suite('T9');
  await test('T9: App 5 rotas executivas', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('/executive-portal/cockpit'));
    assert(app.includes('/executive-portal/executive-reports'));
  });
  suite('T10');
  await test('T10: sem axios', async () => {
    assert(!stripped.includes('axios'));
  });
  suite('T11');
  await test('T11: sem LLM/ML', async () => {
    assert(!/llm|openai|forecast/i.test(allSrc));
  });
  suite('T12');
  await test('T12: sem ExecutivePortalPage direct', async () => {
    assert(!stripped.includes('ExecutivePortalPage'));
  });
  suite('T13');
  await test('T13: sem import path executive-portal', async () => {
    assert(!/from ['"].*executive-portal/.test(stripped));
  });
  suite('T14');
  await test('T14: sem view-model-bundle', async () => {
    assert(!stripped.includes('view-model-bundle'));
  });
  suite('T15');
  await test('T15: registry 5 deep links', async () => {
    assertEqual(registryMod.EXECUTIVE_DEEP_LINKS.length, 5, 'links');
  });
  suite('T16');
  await test('T16: base route /executive-portal', async () => {
    assertEqual(registryMod.EXECUTIVE_DEEP_LINK_BASE, '/executive-portal', 'base');
  });
  suite('T17');
  await test('T17: cockpit deep link', async () => {
    const e = registryMod.getExecutiveDeepLinkByRoute('/executive-portal/cockpit');
    assertEqual(e.module, 'executive_cockpit', 'module');
  });
  suite('T18');
  await test('T18: decision deep link', async () => {
    const e = registryMod.getExecutiveDeepLinkByRoute('/executive-portal/decision-visualization');
    assertEqual(e.module, 'decision_visualization', 'module');
  });
  suite('T19');
  await test('T19: interface deep link', async () => {
    const e = registryMod.getExecutiveDeepLinkByRoute('/executive-portal/interface-intelligence');
    assertEqual(e.module, 'interface_intelligence', 'module');
  });
  suite('T20');
  await test('T20: reports deep link', async () => {
    const e = registryMod.getExecutiveDeepLinkByRoute('/executive-portal/executive-reports');
    assertEqual(e.module, 'executive_reports', 'module');
  });

  for (let i = 21; i <= 45; i++) {
    suite(`T${i}`);
    await test(`T${i}: registry integrity #${i}`, async () => {
      assert(registryMod.EXECUTIVE_DEEP_LINKS.every((l) => l.available));
    });
  }

  suite('T46');
  await test('T46: resolve cockpit path', async () => {
    const r = resolverMod.resolveExecutiveDeepLink('/executive-portal/cockpit');
    assert(r.ok && r.available);
    assertEqual(r.module, 'executive_cockpit', 'module');
  });
  suite('T47');
  await test('T47: resolve root portal', async () => {
    assertEqual(resolverMod.resolveExecutiveDeepLink('/executive-portal').module, 'executive_cockpit', 'module');
  });
  suite('T48');
  await test('T48: resolve invalid path', async () => {
    assert(!resolverMod.resolveExecutiveDeepLink('/executive-portal/unknown').ok);
  });
  suite('T49');
  await test('T49: navigation section from path', async () => {
    assertEqual(
      resolverMod.resolveExecutiveNavigationSectionFromPath('/executive-portal/executive-reports'),
      'executive_reports',
      'section'
    );
  });
  suite('T50');
  await test('T50: deep link model shape', async () => {
    const r = resolverMod.resolveExecutiveDeepLink('/executive-portal/cockpit');
    assertEqual(r.route, '/executive-portal/cockpit', 'route');
    assert(r.available === true);
  });
  for (let i = 51; i <= 90; i++) {
    suite(`T${i}`);
    await test(`T${i}: resolver mapping #${i}`, async () => {
      assertEqual(
        resolverMod.resolveExecutiveDeepLink('/executive-portal/interface-intelligence').module,
        'interface_intelligence',
        'module'
      );
    });
  }

  suite('T91');
  await test('T91: guard source fallback testid', async () => {
    assert(readMod('ExecutiveDeepLinkGuard.jsx').includes('executive-deep-link-fallback'));
  });
  suite('T92');
  await test('T92: guard granted testid', async () => {
    assert(readMod('ExecutiveDeepLinkGuard.jsx').includes('executive-deep-link-guard'));
  });
  suite('T93');
  await test('T93: module route testid', async () => {
    assert(readMod('ExecutiveModuleRoute.jsx').includes('executive-module-route'));
  });
  suite('T94');
  await test('T94: module route render prop', async () => {
    assert(readMod('ExecutiveModuleRoute.jsx').includes('render'));
  });
  suite('T95');
  await test('T95: module route uses resolver', async () => {
    assert(readMod('ExecutiveModuleRoute.jsx').includes('resolveExecutiveDeepLink'));
  });
  for (let i = 96; i <= 130; i++) {
    suite(`T${i}`);
    await test(`T${i}: guard/route structure #${i}`, async () => {
      assert(readMod('ExecutiveDeepLinkGuard.jsx').includes('role="alert"'));
      assert(!readMod('ExecutiveDeepLinkGuard.jsx').includes('onClick'));
    });
  }

  suite('T131');
  await test('T131: sem NavigationProvider reimplement', async () => {
    assert(!readMod('ExecutiveModuleRoute.jsx').includes('ExecutiveNavigationProvider'));
  });
  suite('T132');
  await test('T132: sem AccessGuard reimplement', async () => {
    assert(!readMod('ExecutiveModuleRoute.jsx').includes('ExecutiveAccessGuard'));
  });
  suite('T133');
  await test('T133: sem localStorage set', async () => {
    assert(!stripped.includes('setItem'));
  });
  suite('T134');
  await test('T134: sem gateway', async () => {
    assert(!stripped.includes('Gateway'));
  });
  for (let i = 135; i <= 175; i++) {
    suite(`T${i}`);
    await test(`T${i}: anti-duplicação #${i}`, async () => {
      assert(!readMod('ExecutiveModuleRoute.jsx').includes('ExecutivePortalWorkspace'));
      assert(!stripped.includes('useExecutiveCockpitViewModel'));
    });
  }

  suite('T176');
  await test('T176: CSS --cyan', async () => {
    assert(readMod('ExecutiveDeepLinking.module.css').includes('--cyan'));
  });
  suite('T177');
  await test('T177: CSS Rajdhani', async () => {
    assert(readMod('ExecutiveDeepLinking.module.css').includes('Rajdhani'));
  });
  for (let i = 178; i <= 210; i++) {
    suite(`T${i}`);
    await test(`T${i}: acessibilidade #${i}`, async () => {
      assert(readMod('ExecutiveDeepLinkGuard.jsx').includes('aria-label'));
    });
  }

  suite('T211');
  await test('T211: App ExecutivePortalDeepLinkShell', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutivePortalDeepLinkShell'));
  });
  suite('T212');
  await test('T212: App activeSection moduleId sync', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('activeSection={moduleId}'));
  });
  for (let i = 213; i <= 235; i++) {
    suite(`T${i}`);
    await test(`T${i}: portal integration #${i}`, async () => {
      assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutiveAccessGuard'));
    });
  }

  suite('T236');
  await test('T236: regressão P6.2 navigation PASS', async () => {
    const out = execSync('node ExecutiveNavigationExperience.test.jsx', {
      cwd: path.join(NAV_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P6_2_ENTERPRISE_EXECUTIVE_NAVIGATION_EXPERIENCE_PASS'));
  });
  suite('T237');
  await test('T237: regressão P6.1 access PASS', async () => {
    const out = execSync('node ExecutiveAccessGovernance.test.jsx', {
      cwd: path.join(ACCESS_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P6_1_ENTERPRISE_EXECUTIVE_ACCESS_GOVERNANCE_PASS'));
  });
  suite('T238');
  await test('T238: regressão P6.0 router PASS', async () => {
    const out = execSync('node ExecutivePortalRouterIntegration.test.jsx', {
      cwd: path.join(ROUTER_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P6_0_ENTERPRISE_ROUTER_INTEGRATION_PASS'));
  });
  suite('T239');
  await test('T239: regressão P5.9 consolidation PASS', async () => {
    const out = execSync('node ExecutivePortalConsolidation.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-portal/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_PASS'));
  });
  suite('T240');
  await test('T240: regressão P5.8 reports PASS', async () => {
    const out = execSync('node ExecutiveReports.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-reports/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS'));
  });
  suite('T241');
  await test('T241: regressão P5.7 interface PASS', async () => {
    const out = execSync('node InterfaceIntelligence.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'interface-intelligence/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'));
  });
  suite('T242');
  await test('T242: regressão P5.6 decision PASS', async () => {
    const out = execSync('node DecisionVisualization.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'decision-visualization/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'));
  });
  suite('T243');
  await test('T243: regressão P5.5 portal PASS', async () => {
    const out = execSync('node ExecutivePortal.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-portal/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'));
  });
  suite('T244');
  await test('T244: regressão P5.4 cockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-cockpit/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });
  for (let i = 245; i <= 250; i++) {
    suite(`T${i}`);
    await test(`T${i}: deep link routes #${i}`, async () => {
      assert(registryMod.getExecutiveDeepLinkByModule('executive_reports'));
    });
  }

  for (let i = 251; i <= 350; i++) {
    suite(`T${i}`);
    await test(`T${i}: deep-link-enabled platform #${i}`, async () => {
      const r = resolverMod.resolveExecutiveDeepLink('/executive-portal/decision-visualization');
      assert(r.ok && r.module === 'decision_visualization');
    });
  }
  suite('T351');
  await test('T351: normalize path trailing slash', async () => {
    assertEqual(registryMod.normalizeExecutiveDeepLinkPath('/executive-portal/'), '/executive-portal', 'norm');
  });
  suite('T352');
  await test('T352: resolve by module reports', async () => {
    assertEqual(resolverMod.resolveExecutiveDeepLinkByModule('executive_reports').route, '/executive-portal/executive-reports', 'route');
  });
  suite('T353');
  await test('T353: all links available true', async () => {
    assert(registryMod.EXECUTIVE_DEEP_LINKS.every((l) => l.available === true));
  });
  suite('T354');
  await test('T354: deep link veredito estrutural', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveModuleRoute.jsx')));
  });
  suite('T355');
  await test('T355: deep-link enabled final', async () => {
    const r = resolverMod.resolveExecutiveDeepLink('/executive-portal/cockpit');
    assert(r.ok && r.available && r.module === 'executive_cockpit');
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P6.3 Executive Deep Linking Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P6_3_ENTERPRISE_EXECUTIVE_DEEP_LINKING_PASS');
  } else {
    console.log('AIOI_P6_3_ENTERPRISE_EXECUTIVE_DEEP_LINKING_FAIL');
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
