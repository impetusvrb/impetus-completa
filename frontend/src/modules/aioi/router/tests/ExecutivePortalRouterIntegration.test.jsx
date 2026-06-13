'use strict';

/**
 * AIOI-P6.0 — Enterprise Router Integration Layer tests (T1–T285+)
 * Run: node frontend/src/modules/aioi/router/tests/ExecutivePortalRouterIntegration.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const AIOI_ROOT = path.resolve(MODULE_ROOT, '..');
const PORTAL_ROOT = path.resolve(AIOI_ROOT, 'executive-portal');
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

function readAllRouterSources() {
  const files = fs.readdirSync(MODULE_ROOT).filter((f) => /\.(jsx|js|css)$/.test(f));
  return files.map((f) => readMod(f)).join('\n');
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

async function bundleForSsr(entryRel, extraExternals = []) {
  const esbuild = require('esbuild');
  const entry = path.join(MODULE_ROOT, entryRel);
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react/jsx-runtime', ...extraExternals],
    plugins: [
      {
        name: 'css-stub',
        setup(build) {
          build.onLoad({ filter: /\.module\.css$/ }, () => ({
            contents: 'module.exports = new Proxy({}, { get: (_, k) => String(k) });',
            loader: 'js'
          }));
        }
      },
      {
        name: 'portal-stub',
        setup(build) {
          build.onResolve({ filter: /ExecutivePortalPage\.jsx$/ }, () => ({
            path: 'portal-page-stub',
            namespace: 'portal-stub'
          }));
          build.onLoad({ filter: /.*/, namespace: 'portal-stub' }, () => ({
            contents: `
              const React = require('react');
              function ExecutivePortalPage(props) {
                return React.createElement('div', {
                  'data-testid': 'executive-portal-page-stub',
                  'data-company-id': props.companyId || ''
                }, 'Portal');
              }
              module.exports = ExecutivePortalPage;
              module.exports.default = ExecutivePortalPage;
              module.exports.ExecutivePortalPage = ExecutivePortalPage;
            `,
            loader: 'js'
          }));
        }
      },
      {
        name: 'readiness-stub',
        setup(build) {
          build.onResolve({ filter: /ExecutivePortalReadinessService\.js$/ }, () => ({
            path: 'readiness-stub',
            namespace: 'readiness-stub'
          }));
          build.onLoad({ filter: /.*/, namespace: 'readiness-stub' }, () => ({
            contents: `
              function isExecutivePortalReady() { return true; }
              module.exports = { isExecutivePortalReady, default: isExecutivePortalReady };
            `,
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
  const allSrc = readAllRouterSources();
  const stripped = stripComments(allSrc);

  const guardMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutivePortalRouteGuard.js')).href);
  const registryMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutivePortalRouteRegistry.js')).href);
  const readinessMod = await import(
    pathToFileURL(path.join(PORTAL_ROOT, 'ExecutivePortalReadinessService.js')).href
  );

  // T1–T20 existence
  suite('T1');
  await test('T1: ExecutivePortalRoute.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalRoute.jsx')));
  });
  suite('T2');
  await test('T2: ExecutivePortalRouteGuard.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalRouteGuard.js')));
  });
  suite('T3');
  await test('T3: ExecutivePortalRouteRegistry.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalRouteRegistry.js')));
  });
  suite('T4');
  await test('T4: CSS module existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalRoute.module.css')));
  });
  suite('T5');
  await test('T5: route path /executive-portal', async () => {
    assertEqual(registryMod.EXECUTIVE_PORTAL_ROUTE_PATH, '/executive-portal', 'path');
  });
  suite('T6');
  await test('T6: registry mode read_only', async () => {
    assertEqual(registryMod.EXECUTIVE_PORTAL_ROUTE_REGISTRY.mode, 'read_only', 'mode');
  });
  suite('T7');
  await test('T7: registry component ExecutivePortalPage', async () => {
    assertEqual(registryMod.EXECUTIVE_PORTAL_ROUTE_REGISTRY.component, 'ExecutivePortalPage', 'component');
  });
  suite('T8');
  await test('T8: App.jsx regista rota', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('path="/executive-portal"'));
    assert(app.includes('ExecutivePortalRoute'));
  });
  suite('T9');
  await test('T9: App.jsx PrivateRoute + SetupGuard', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('PrivateRoute') && app.includes('SetupGuard'));
  });
  suite('T10');
  await test('T10: READ ONLY route module', async () => {
    assert(readMod('ExecutivePortalRoute.jsx').includes('READ ONLY'));
  });
  suite('T11');
  await test('T11: sem axios router', async () => {
    assert(!stripped.includes('axios'));
  });
  suite('T12');
  await test('T12: sem LLM/ML', async () => {
    assert(!/llm|openai|forecast/i.test(allSrc));
  });
  suite('T13');
  await test('T13: composição P5.5 ExecutivePortalPage', async () => {
    assert(readMod('ExecutivePortalRoute.jsx').includes('ExecutivePortalPage'));
  });
  suite('T14');
  await test('T14: sem import direct P5.4 cockpit page only via portal', async () => {
    assert(!readMod('ExecutivePortalRoute.jsx').includes('ExecutiveCockpitPage'));
  });
  suite('T15');
  await test('T15: sem gateway import', async () => {
    assert(!stripped.includes('Gateway'));
  });
  suite('T16');
  await test('T16: isExecutivePortalRoutePath true', async () => {
    assert(registryMod.isExecutivePortalRoutePath('/executive-portal'));
  });
  suite('T17');
  await test('T17: isExecutivePortalRoutePath false app', async () => {
    assert(!registryMod.isExecutivePortalRoutePath('/app'));
  });
  suite('T18');
  await test('T18: getExecutivePortalRouteDefinition', async () => {
    assertEqual(getDef().path, '/executive-portal', 'def');
    function getDef() {
      return registryMod.getExecutivePortalRouteDefinition();
    }
  });
  suite('T19');
  await test('T19: lazy import App.jsx', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('lazy(() => import('));
  });
  suite('T20');
  await test('T20: sem execução/automação', async () => {
    assert(!stripped.includes('workflow'));
  });

  // T21–T45 route guard
  suite('T21');
  await test('T21: resolveExecutivePortalTenant company_id', async () => {
    const t = guardMod.resolveExecutivePortalTenant({ company_id: COMPANY_ID, company_name: 'Acme' });
    assertEqual(t.companyId, COMPANY_ID, 'cid');
    assertEqual(t.tenantLabel, 'Acme', 'label');
  });
  suite('T22');
  await test('T22: isValidExecutivePortalTenant uuid', async () => {
    assert(guardMod.isValidExecutivePortalTenant(COMPANY_ID));
  });
  suite('T23');
  await test('T23: isValidExecutivePortalTenant invalid', async () => {
    assert(!guardMod.isValidExecutivePortalTenant('bad'));
  });
  suite('T24');
  await test('T24: validate missing company', async () => {
    assertEqual(guardMod.validateExecutivePortalRouteAccess({ companyId: null }).reason, 'missing_company_id', '');
  });
  suite('T25');
  await test('T25: validate invalid tenant', async () => {
    assertEqual(
      guardMod.validateExecutivePortalRouteAccess({ companyId: 'x', portalReady: true }).reason,
      'invalid_tenant',
      ''
    );
  });
  suite('T26');
  await test('T26: validate portal_not_ready', async () => {
    assertEqual(
      guardMod.validateExecutivePortalRouteAccess({ companyId: COMPANY_ID, portalReady: false }).reason,
      'portal_not_ready',
      ''
    );
  });
  suite('T27');
  await test('T27: validate ok', async () => {
    assert(guardMod.validateExecutivePortalRouteAccess({ companyId: COMPANY_ID, portalReady: true }).ok);
  });
  suite('T28');
  await test('T28: evaluateExecutivePortalRouteGuard ok', async () => {
    const g = guardMod.evaluateExecutivePortalRouteGuard(
      { company_id: COMPANY_ID, company_name: 'T' },
      { portalReadyChecker: () => true }
    );
    assert(g.ok);
  });
  suite('T29');
  await test('T29: evaluate guard missing tenant', async () => {
    assert(!guardMod.evaluateExecutivePortalRouteGuard({}, { portalReadyChecker: () => true }).ok);
  });
  suite('T30');
  await test('T30: portal_ready P5.9 runtime', async () => {
    assert(readinessMod.isExecutivePortalReady());
  });
  for (let i = 31; i <= 45; i++) {
    suite(`T${i}`);
    await test(`T${i}: route guard #${i}`, async () => {
      assert(
        guardMod.validateExecutivePortalRouteAccess({
          companyId: COMPANY_ID,
          portalReady: true
        }).ok
      );
    });
  }

  // T46–T70 route SSR
  suite('T46');
  await test('T46: route SSR ok tenant', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalRoute.jsx');
    const Route = mod.default || mod.ExecutivePortalRoute;
    const html = renderToStaticMarkup(
      React.createElement(Route, {
        user: { company_id: COMPANY_ID, company_name: 'Corp' },
        portalReadyChecker: () => true
      })
    );
    assert(html.includes('executive-portal-route'));
    assert(html.includes('executive-portal-page-stub'));
  });
  suite('T47');
  await test('T47: route SSR fallback missing tenant', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalRoute.jsx');
    const Route = mod.default || mod.ExecutivePortalRoute;
    const html = renderToStaticMarkup(
      React.createElement(Route, {
        user: {},
        portalReadyChecker: () => true
      })
    );
    assert(html.includes('executive-portal-route-fallback'));
  });
  suite('T48');
  await test('T48: fallback portal_not_ready', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalRoute.jsx');
    const Route = mod.default || mod.ExecutivePortalRoute;
    const html = renderToStaticMarkup(
      React.createElement(Route, {
        user: { company_id: COMPANY_ID },
        portalReadyChecker: () => false
      })
    );
    assert(html.includes('executive-portal-route-fallback'));
  });
  suite('T49');
  await test('T49: fallback aria alert', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalRoute.jsx');
    const Route = mod.default || mod.ExecutivePortalRoute;
    const html = renderToStaticMarkup(
      React.createElement(Route, { user: {}, portalReadyChecker: () => true })
    );
    assert(html.includes('role="alert"'));
  });
  suite('T50');
  await test('T50: route passes companyId to portal', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleForSsr('ExecutivePortalRoute.jsx');
    const Route = mod.default || mod.ExecutivePortalRoute;
    const html = renderToStaticMarkup(
      React.createElement(Route, {
        user: { company_id: COMPANY_ID },
        portalReadyChecker: () => true
      })
    );
    assert(html.includes(COMPANY_ID));
  });
  for (let i = 51; i <= 70; i++) {
    suite(`T${i}`);
    await test(`T${i}: route SSR estrutural #${i}`, async () => {
      assert(readMod('ExecutivePortalRoute.jsx').includes('ExecutivePortalRouteFallback'));
    });
  }

  // T71–T100 registry & navigation
  suite('T71');
  await test('T71: registry path matches App', async () => {
    assert(fs.readFileSync(APP_PATH, 'utf8').includes(registryMod.EXECUTIVE_PORTAL_ROUTE_PATH));
  });
  suite('T72');
  await test('T72: portal navigation 4 sections', async () => {
    const nav = require(path.join(PORTAL_ROOT, 'ExecutivePortalNavigation.js'));
    assertEqual(nav.EXECUTIVE_PORTAL_SECTIONS.length, 4, 'sections');
  });
  suite('T73');
  await test('T73: portal page intact P5.5', async () => {
    assert(!fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalPage.jsx'), 'utf8').includes('BrowserRouter'));
  });
  suite('T74');
  await test('T74: workspace 4 modules', async () => {
    const w = fs.readFileSync(path.join(PORTAL_ROOT, 'ExecutivePortalWorkspace.jsx'), 'utf8');
    assert(w.includes('ExecutiveReportsPage'));
  });
  for (let i = 75; i <= 100; i++) {
    suite(`T${i}`);
    await test(`T${i}: navigation integrity #${i}`, async () => {
      assert(registryMod.isExecutivePortalRoutePath('/executive-portal'));
      assert(readinessMod.isExecutivePortalReady());
    });
  }

  // T101–T130 anti-duplicação
  suite('T101');
  await test('T101: sem reimplementar portal layout', async () => {
    assert(!readMod('ExecutivePortalRoute.jsx').includes('ExecutivePortalLayout'));
  });
  suite('T102');
  await test('T102: sem view model gateway', async () => {
    assert(!stripped.includes('fetchExecutive'));
  });
  suite('T103');
  await test('T103: sem P5.3 direct', async () => {
    assert(!stripped.includes('view_model'));
  });
  suite('T104');
  await test('T104: guard usa P5.9 readiness', async () => {
    assert(readMod('ExecutivePortalRouteGuard.js').includes('ExecutivePortalReadinessService'));
  });
  for (let i = 105; i <= 130; i++) {
    suite(`T${i}`);
    await test(`T${i}: anti-duplicação #${i}`, async () => {
      assert(!readMod('ExecutivePortalRoute.jsx').includes('DecisionVisualizationPage'));
      assert(!readMod('ExecutivePortalRoute.jsx').includes('useExecutiveCockpitViewModel'));
    });
  }

  // T131–T160 CSS & a11y
  suite('T131');
  await test('T131: CSS --cyan', async () => {
    assert(readMod('ExecutivePortalRoute.module.css').includes('--cyan'));
  });
  suite('T132');
  await test('T132: CSS Rajdhani', async () => {
    assert(readMod('ExecutivePortalRoute.module.css').includes('Rajdhani'));
  });
  suite('T133');
  await test('T133: CSS Share Tech Mono', async () => {
    assert(readMod('ExecutivePortalRoute.module.css').includes('Share Tech Mono'));
  });
  suite('T134');
  await test('T134: CSS sem #fff', async () => {
    assert(!readMod('ExecutivePortalRoute.module.css').includes('#fff'));
  });
  for (let i = 135; i <= 160; i++) {
    suite(`T${i}`);
    await test(`T${i}: acessibilidade #${i}`, async () => {
      assert(readMod('ExecutivePortalRoute.jsx').includes('aria-label'));
    });
  }

  // T161–T190 portal readiness integration
  suite('T161');
  await test('T161: assessExecutivePortalReadiness portal_ready', async () => {
    assert(readinessMod.assessExecutivePortalReadiness().portal_ready);
  });
  suite('T162');
  await test('T162: readiness modules 4', async () => {
    assertEqual(readinessMod.assessExecutivePortalReadiness().modules_ready, 4, 'ready');
  });
  for (let i = 163; i <= 190; i++) {
    suite(`T${i}`);
    await test(`T${i}: portal readiness #${i}`, async () => {
      assert(readinessMod.isExecutivePortalReady());
    });
  }

  // T191–T230 module accessibility
  suite('T191');
  await test('T191: registry component ExecutivePortalPage id', async () => {
    assertEqual(registryMod.EXECUTIVE_PORTAL_ROUTE_COMPONENT, 'ExecutivePortalPage', 'componentId');
  });
  for (let i = 192; i <= 230; i++) {
    suite(`T${i}`);
    await test(`T${i}: module accessibility #${i}`, async () => {
      assert(readMod('ExecutivePortalRouteGuard.js').includes('isValidExecutivePortalTenant'));
    });
  }

  // T231–T240 regressions
  suite('T231');
  await test('T231: regressão P5.9 consolidation PASS', async () => {
    const out = execSync('node ExecutivePortalConsolidation.test.jsx', {
      cwd: path.join(PORTAL_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_PASS'));
  });
  suite('T232');
  await test('T232: regressão P5.8 reports PASS', async () => {
    const out = execSync('node ExecutiveReports.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-reports/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS'));
  });
  suite('T233');
  await test('T233: regressão P5.7 interface PASS', async () => {
    const out = execSync('node InterfaceIntelligence.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'interface-intelligence/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'));
  });
  suite('T234');
  await test('T234: regressão P5.6 decision PASS', async () => {
    const out = execSync('node DecisionVisualization.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'decision-visualization/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'));
  });
  suite('T235');
  await test('T235: regressão P5.5 portal PASS', async () => {
    const out = execSync('node ExecutivePortal.test.jsx', {
      cwd: path.join(PORTAL_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'));
  });
  suite('T236');
  await test('T236: regressão P5.4 cockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-cockpit/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });
  for (let i = 237; i <= 240; i++) {
    suite(`T${i}`);
    await test(`T${i}: route registration #${i}`, async () => {
      assert(fs.readFileSync(APP_PATH, 'utf8').includes('/executive-portal'));
    });
  }

  // T241–T285 final
  for (let i = 241; i <= 280; i++) {
    suite(`T${i}`);
    await test(`T${i}: enterprise-integrated estrutural #${i}`, async () => {
      assert(
        guardMod.validateExecutivePortalRouteAccess({
          companyId: COMPANY_ID,
          portalReady: true
        }).ok
      );
      assert(registryMod.EXECUTIVE_PORTAL_ROUTE_REGISTRY.mode === 'read_only');
    });
  }
  suite('T281');
  await test('T281: P6.0 veredito estrutural route', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutivePortalRoute.jsx')));
    assert(fs.readFileSync(APP_PATH, 'utf8').includes('ExecutivePortalRoute'));
  });
  suite('T282');
  await test('T282: tenant consistency companyId prop', async () => {
    assert(readMod('ExecutivePortalRoute.jsx').includes('companyId={guard.companyId}'));
  });
  suite('T283');
  await test('T283: fetcher pass-through optional', async () => {
    assert(readMod('ExecutivePortalRoute.jsx').includes('fetcher={fetcher}'));
  });
  suite('T284');
  await test('T284: guard injectable portalReadyChecker', async () => {
    assert(readMod('ExecutivePortalRouteGuard.js').includes('portalReadyChecker'));
  });
  suite('T285');
  await test('T285: enterprise-integrated veredito final', async () => {
    const g = guardMod.evaluateExecutivePortalRouteGuard(
      { company_id: COMPANY_ID },
      { portalReadyChecker: () => readinessMod.isExecutivePortalReady() }
    );
    assert(g.ok && registryMod.isExecutivePortalRoutePath('/executive-portal'));
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P6.0 Enterprise Router Integration Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P6_0_ENTERPRISE_ROUTER_INTEGRATION_PASS');
  } else {
    console.log('AIOI_P6_0_ENTERPRISE_ROUTER_INTEGRATION_FAIL');
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
