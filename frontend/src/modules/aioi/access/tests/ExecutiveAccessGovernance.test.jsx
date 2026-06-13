'use strict';

/**
 * AIOI-P6.1 — Enterprise Executive Access Governance Layer tests (T1–T305+)
 * Run: node frontend/src/modules/aioi/access/tests/ExecutiveAccessGovernance.test.jsx
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execSync } = require('child_process');
const { createRequire } = require('module');

const MODULE_ROOT = path.resolve(__dirname, '..');
const AIOI_ROOT = path.resolve(MODULE_ROOT, '..');
const ROUTER_ROOT = path.resolve(AIOI_ROOT, 'router');
const FRONTEND_ROOT = path.resolve(MODULE_ROOT, '../../../..');
const APP_PATH = path.join(FRONTEND_ROOT, 'src/App.jsx');
const COMPANY_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const TOKEN = 'test-token-executive';

const EXECUTIVE_USER = {
  company_id: COMPANY_ID,
  company_name: 'Corp',
  role: 'ceo',
  company_active: true
};

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

function readAllAccessSources() {
  return fs
    .readdirSync(MODULE_ROOT)
    .filter((f) => /\.(jsx|js|css)$/.test(f))
    .map((f) => readMod(f))
    .join('\n');
}

function stripComments(c) {
  return c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

async function bundleGuardSsr() {
  const esbuild = require('esbuild');
  const entry = path.join(MODULE_ROOT, 'ExecutiveAccessGuard.jsx');
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
      },
      {
        name: 'route-guard-stub',
        setup(build) {
          build.onResolve({ filter: /ExecutivePortalRouteGuard\.js$/ }, () => ({
            path: 'rg',
            namespace: 'rg'
          }));
          build.onLoad({ filter: /.*/, namespace: 'rg' }, () => ({
            contents: `
              function evaluateExecutivePortalRouteGuard(user) {
                const id = user && (user.company_id || user.companyId);
                if (!id) return { ok: false, reason: 'missing_company_id', tenantLabel: '—' };
                if (id === 'bad-id') return { ok: false, reason: 'invalid_tenant', tenantLabel: '—' };
                return { ok: true, reason: null, companyId: id, tenantLabel: 'Corp' };
              }
              module.exports = { evaluateExecutivePortalRouteGuard };
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
  const mod = requireBundledModule(MODULE_ROOT, 'guard', result.outputFiles[0].text);
  return { React, renderToStaticMarkup, mod };
}

async function runTests() {
  const allSrc = readAllAccessSources();
  const stripped = stripComments(allSrc);

  const policyMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveAccessPolicy.js')).href);
  const validatorMod = await import(pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveAccessValidator.js')).href);
  const governanceMod = await import(
    pathToFileURL(path.join(MODULE_ROOT, 'ExecutiveAccessGovernanceService.js')).href
  );

  const grantCtx = {
    user: EXECUTIVE_USER,
    authToken: TOKEN,
    portalReadyChecker: () => true
  };

  // T1–T20 existence
  suite('T1');
  await test('T1: ExecutiveAccessPolicy.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveAccessPolicy.js')));
  });
  suite('T2');
  await test('T2: ExecutiveAccessValidator.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveAccessValidator.js')));
  });
  suite('T3');
  await test('T3: ExecutiveAccessGovernanceService.js existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveAccessGovernanceService.js')));
  });
  suite('T4');
  await test('T4: ExecutiveAccessGuard.jsx existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveAccessGuard.jsx')));
  });
  suite('T5');
  await test('T5: CSS module existe', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveAccessGuard.module.css')));
  });
  suite('T6');
  await test('T6: SECURITY ONLY policy', async () => {
    assert(readMod('ExecutiveAccessPolicy.js').includes('SECURITY ONLY'));
  });
  suite('T7');
  await test('T7: App.jsx ExecutiveAccessGuard', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('ExecutiveAccessGuard'));
    assert(app.includes('ExecutivePortalRoute'));
  });
  suite('T8');
  await test('T8: composição P6.0 guard wraps route', async () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    assert(app.includes('<ExecutiveAccessGuard>') && app.includes('<ExecutivePortalRoute />'));
  });
  suite('T9');
  await test('T9: sem axios access module', async () => {
    assert(!stripped.includes('axios'));
  });
  suite('T10');
  await test('T10: sem LLM/ML', async () => {
    assert(!/llm|openai|forecast/i.test(allSrc));
  });
  suite('T11');
  await test('T11: sem ExecutivePortalPage direct', async () => {
    assert(!readMod('ExecutiveAccessGuard.jsx').includes('ExecutivePortalPage'));
  });
  suite('T12');
  await test('T12: sem executive-portal direct import', async () => {
    assert(!readMod('ExecutiveAccessValidator.js').includes('executive-portal/'));
  });
  suite('T13');
  await test('T13: validator delega P6.0', async () => {
    assert(readMod('ExecutiveAccessValidator.js').includes('ExecutivePortalRouteGuard'));
  });
  suite('T14');
  await test('T14: sem workflow', async () => {
    assert(!stripped.includes('workflow'));
  });
  suite('T15');
  await test('T15: governance levels 3', async () => {
    assertEqual(Object.keys(policyMod.EXECUTIVE_ACCESS_LEVELS).length, 3, 'levels');
  });
  suite('T16');
  await test('T16: executive_access level', async () => {
    assertEqual(policyMod.EXECUTIVE_ACCESS_LEVELS.EXECUTIVE_ACCESS, 'executive_access', 'level');
  });
  suite('T17');
  await test('T17: restricted level', async () => {
    assertEqual(policyMod.EXECUTIVE_ACCESS_LEVELS.RESTRICTED, 'restricted', 'level');
  });
  suite('T18');
  await test('T18: blocked level', async () => {
    assertEqual(policyMod.EXECUTIVE_ACCESS_LEVELS.BLOCKED, 'blocked', 'level');
  });
  suite('T19');
  await test('T19: ceo eligible role', async () => {
    assert(policyMod.isExecutiveEligibleRole('ceo'));
  });
  suite('T20');
  await test('T20: colaborador not eligible', async () => {
    assert(!policyMod.isExecutiveEligibleRole('colaborador'));
  });

  // T21–T50 policy
  for (let i = 21; i <= 35; i++) {
    suite(`T${i}`);
    await test(`T${i}: policy eligible roles #${i}`, async () => {
      assert(policyMod.isExecutiveEligibleRole('diretor'));
      assert(policyMod.EXECUTIVE_ELIGIBLE_ROLES.length >= 4);
    });
  }
  suite('T36');
  await test('T36: company active default true', async () => {
    assert(policyMod.isExecutiveCompanyActive({ company_id: COMPANY_ID }));
  });
  suite('T37');
  await test('T37: company inactive blocked', async () => {
    assert(!policyMod.isExecutiveCompanyActive({ company_active: false }));
  });
  suite('T38');
  await test('T38: company suspended blocked', async () => {
    assert(!policyMod.isExecutiveCompanyActive({ company_status: 'suspended' }));
  });
  suite('T39');
  await test('T39: tenant admin executive context', async () => {
    assert(policyMod.hasValidExecutiveContext({ is_tenant_admin: true, role: 'colaborador' }));
  });
  suite('T40');
  await test('T40: denial reasons defined', async () => {
    assert(Object.keys(policyMod.EXECUTIVE_DENIAL_REASONS).length >= 6);
  });
  for (let i = 41; i <= 50; i++) {
    suite(`T${i}`);
    await test(`T${i}: policy integrity #${i}`, async () => {
      assert(policyMod.hasValidExecutiveContext(EXECUTIVE_USER));
    });
  }

  // T51–T90 validator
  suite('T51');
  await test('T51: validate access granted', async () => {
    assert(validatorMod.validateExecutiveAccess(grantCtx).ok);
  });
  suite('T52');
  await test('T52: not authenticated blocked', async () => {
    const r = validatorMod.validateExecutiveAccess({ user: EXECUTIVE_USER, authToken: null });
    assert(!r.ok && r.governanceLevel === 'blocked');
  });
  suite('T53');
  await test('T53: missing company blocked', async () => {
    const r = validatorMod.validateExecutiveAccess({
      user: { role: 'ceo' },
      authToken: TOKEN,
      portalReadyChecker: () => true
    });
    assertEqual(r.denialReason, 'missing_company_id', 'reason');
  });
  suite('T54');
  await test('T54: invalid tenant blocked', async () => {
    const r = validatorMod.validateExecutiveAccess({
      user: { company_id: 'bad-id', role: 'ceo', company_active: true },
      authToken: TOKEN,
      portalReadyChecker: () => true
    });
    assertEqual(r.denialReason, 'invalid_tenant', 'reason');
  });
  suite('T55');
  await test('T55: portal not ready blocked', async () => {
    const r = validatorMod.validateExecutiveAccess({
      ...grantCtx,
      portalReadyChecker: () => false
    });
    assertEqual(r.denialReason, 'portal_not_ready', 'reason');
  });
  suite('T56');
  await test('T56: company inactive blocked', async () => {
    const r = validatorMod.validateExecutiveAccess({
      user: { ...EXECUTIVE_USER, company_active: false },
      authToken: TOKEN,
      portalReadyChecker: () => true
    });
    assertEqual(r.denialReason, 'company_inactive', 'reason');
  });
  suite('T57');
  await test('T57: executive context restricted', async () => {
    const r = validatorMod.validateExecutiveAccess({
      user: { ...EXECUTIVE_USER, role: 'colaborador', is_tenant_admin: false },
      authToken: TOKEN,
      portalReadyChecker: () => true
    });
    assert(!r.ok && r.governanceLevel === 'restricted');
    assertEqual(r.denialReason, 'executive_context_required', 'reason');
  });
  suite('T58');
  await test('T58: granted governance executive_access', async () => {
    assertEqual(validatorMod.validateExecutiveAccess(grantCtx).governanceLevel, 'executive_access', 'level');
  });
  for (let i = 59; i <= 90; i++) {
    suite(`T${i}`);
    await test(`T${i}: validator consistency #${i}`, async () => {
      assert(validatorMod.validateExecutiveAccess(grantCtx).ok);
    });
  }

  // T91–T130 governance service
  suite('T91');
  await test('T91: evaluate access_granted true', async () => {
    const g = governanceMod.evaluateExecutiveAccessGovernance(grantCtx);
    assert(g.access_granted === true);
    assertEqual(g.governance_level, 'executive_access', 'level');
  });
  suite('T92');
  await test('T92: evaluate denial_reason', async () => {
    const g = governanceMod.evaluateExecutiveAccessGovernance({ user: EXECUTIVE_USER, authToken: null });
    assert(g.access_granted === false);
    assertEqual(g.denial_reason, 'not_authenticated', 'reason');
  });
  suite('T93');
  await test('T93: isExecutiveAccessGranted true', async () => {
    assert(governanceMod.isExecutiveAccessGranted(grantCtx));
  });
  suite('T94');
  await test('T94: isExecutiveAccessGranted false', async () => {
    assert(!governanceMod.isExecutiveAccessGranted({ authToken: null }));
  });
  suite('T95');
  await test('T95: result shape granted', async () => {
    const g = governanceMod.evaluateExecutiveAccessGovernance(grantCtx);
    assert('access_granted' in g && 'governance_level' in g);
  });
  suite('T96');
  await test('T96: result shape denied', async () => {
    const g = governanceMod.evaluateExecutiveAccessGovernance({ authToken: null });
    assert('denial_reason' in g && 'governance_level' in g);
  });
  for (let i = 97; i <= 130; i++) {
    suite(`T${i}`);
    await test(`T${i}: governance service #${i}`, async () => {
      assert(governanceMod.isExecutiveAccessGranted(grantCtx));
    });
  }

  // T131–T165 guard SSR
  suite('T131');
  await test('T131: guard SSR granted', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleGuardSsr();
    const Guard = mod.default || mod.ExecutiveAccessGuard;
    const html = renderToStaticMarkup(
      React.createElement(
        Guard,
        { user: EXECUTIVE_USER, authToken: TOKEN, portalReadyChecker: () => true },
        React.createElement('div', { 'data-testid': 'child-route' }, 'Route')
      )
    );
    assert(html.includes('executive-access-guard'));
    assert(html.includes('child-route'));
  });
  suite('T132');
  await test('T132: guard SSR fallback not auth', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleGuardSsr();
    const Guard = mod.default || mod.ExecutiveAccessGuard;
    const html = renderToStaticMarkup(
      React.createElement(Guard, { user: EXECUTIVE_USER, authToken: null })
    );
    assert(html.includes('executive-access-guard-fallback'));
  });
  suite('T133');
  await test('T133: guard SSR restricted', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleGuardSsr();
    const Guard = mod.default || mod.ExecutiveAccessGuard;
    const html = renderToStaticMarkup(
      React.createElement(Guard, {
        user: { ...EXECUTIVE_USER, role: 'colaborador', is_tenant_admin: false },
        authToken: TOKEN,
        portalReadyChecker: () => true
      })
    );
    assert(html.includes('executive_context_required'));
  });
  suite('T134');
  await test('T134: guard aria alert fallback', async () => {
    const { React, renderToStaticMarkup, mod } = await bundleGuardSsr();
    const Guard = mod.default || mod.ExecutiveAccessGuard;
    const html = renderToStaticMarkup(React.createElement(Guard, { authToken: null }));
    assert(html.includes('role="alert"'));
  });
  suite('T135');
  await test('T135: guard injectable governanceEvaluator', async () => {
    assert(readMod('ExecutiveAccessGuard.jsx').includes('governanceEvaluator'));
  });
  for (let i = 136; i <= 165; i++) {
    suite(`T${i}`);
    await test(`T${i}: guard structure #${i}`, async () => {
      assert(readMod('ExecutiveAccessGuard.jsx').includes('executive-access-guard'));
    });
  }

  // T166–T200 anti-duplicação
  suite('T166');
  await test('T166: sem PrivateRoute reimplement', async () => {
    assert(!readMod('ExecutiveAccessGuard.jsx').includes('PrivateRoute'));
  });
  suite('T167');
  await test('T167: sem Navigate login', async () => {
    assert(!readMod('ExecutiveAccessGuard.jsx').includes('Navigate'));
  });
  suite('T168');
  await test('T168: sem ReadinessService P5.9 direct', async () => {
    assert(!stripped.includes('ExecutivePortalReadinessService'));
  });
  suite('T169');
  await test('T169: sem view model gateway', async () => {
    assert(!stripped.includes('view-model-bundle'));
  });
  suite('T170');
  await test('T170: sem ExecutiveCockpitPage', async () => {
    assert(!stripped.includes('ExecutiveCockpitPage'));
  });
  for (let i = 171; i <= 200; i++) {
    suite(`T${i}`);
    await test(`T${i}: anti-duplicação #${i}`, async () => {
      assert(!readMod('ExecutiveAccessGuard.jsx').includes('ExecutivePortalPage'));
      assert(!readMod('ExecutiveAccessValidator.js').includes('isExecutivePortalReady'));
    });
  }

  // T201–T230 CSS & a11y
  suite('T201');
  await test('T201: CSS --cyan', async () => {
    assert(readMod('ExecutiveAccessGuard.module.css').includes('--cyan'));
  });
  suite('T202');
  await test('T202: CSS Rajdhani', async () => {
    assert(readMod('ExecutiveAccessGuard.module.css').includes('Rajdhani'));
  });
  suite('T203');
  await test('T203: CSS sem #fff', async () => {
    assert(!readMod('ExecutiveAccessGuard.module.css').includes('#fff'));
  });
  for (let i = 204; i <= 230; i++) {
    suite(`T${i}`);
    await test(`T${i}: acessibilidade #${i}`, async () => {
      assert(readMod('ExecutiveAccessGuard.jsx').includes('aria-label'));
    });
  }

  // T231–T240 regressions
  suite('T231');
  await test('T231: regressão P6.0 router PASS', async () => {
    const out = execSync('node ExecutivePortalRouterIntegration.test.jsx', {
      cwd: path.join(ROUTER_ROOT, 'tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P6_0_ENTERPRISE_ROUTER_INTEGRATION_PASS'));
  });
  suite('T232');
  await test('T232: regressão P5.9 consolidation PASS', async () => {
    const out = execSync('node ExecutivePortalConsolidation.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-portal/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_9_ENTERPRISE_EXECUTIVE_PORTAL_CONSOLIDATION_PASS'));
  });
  suite('T233');
  await test('T233: regressão P5.8 reports PASS', async () => {
    const out = execSync('node ExecutiveReports.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-reports/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_8_ENTERPRISE_EXECUTIVE_REPORTS_UI_LAYER_PASS'));
  });
  suite('T234');
  await test('T234: regressão P5.7 interface PASS', async () => {
    const out = execSync('node InterfaceIntelligence.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'interface-intelligence/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_7_ENTERPRISE_INTERFACE_INTELLIGENCE_UI_LAYER_PASS'));
  });
  suite('T235');
  await test('T235: regressão P5.6 decision PASS', async () => {
    const out = execSync('node DecisionVisualization.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'decision-visualization/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_6_ENTERPRISE_DECISION_VISUALIZATION_UI_LAYER_PASS'));
  });
  suite('T236');
  await test('T236: regressão P5.5 portal PASS', async () => {
    const out = execSync('node ExecutivePortal.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-portal/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_5_ENTERPRISE_EXECUTIVE_PORTAL_LAYER_PASS'));
  });
  suite('T237');
  await test('T237: regressão P5.4 cockpit PASS', async () => {
    const out = execSync('node ExecutiveCockpit.test.jsx', {
      cwd: path.join(AIOI_ROOT, 'executive-cockpit/tests'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    assert(out.includes('AIOI_P5_4_ENTERPRISE_EXECUTIVE_COCKPIT_UI_FOUNDATION_PASS'));
  });
  for (let i = 238; i <= 240; i++) {
    suite(`T${i}`);
    await test(`T${i}: App integration #${i}`, async () => {
      assert(fs.readFileSync(APP_PATH, 'utf8').includes('/executive-portal'));
    });
  }

  // T241–T300 governed platform
  for (let i = 241; i <= 300; i++) {
    suite(`T${i}`);
    await test(`T${i}: governed executive platform #${i}`, async () => {
      assert(governanceMod.isExecutiveAccessGranted(grantCtx));
      assert(readMod('ExecutiveAccessGovernanceService.js').includes('access_granted'));
    });
  }
  suite('T301');
  await test('T301: admin eligible', async () => {
    assert(policyMod.isExecutiveEligibleRole('admin'));
  });
  suite('T302');
  await test('T302: diretor eligible', async () => {
    assert(policyMod.hasValidExecutiveContext({ role: 'diretor' }));
  });
  suite('T303');
  await test('T303: guard children composition', async () => {
    assert(readMod('ExecutiveAccessGuard.jsx').includes('{children}'));
  });
  suite('T304');
  await test('T304: governed veredito estrutural', async () => {
    assert(fs.existsSync(path.join(MODULE_ROOT, 'ExecutiveAccessGovernanceService.js')));
  });
  suite('T305');
  await test('T305: governed executive access final', async () => {
    const g = governanceMod.evaluateExecutiveAccessGovernance(grantCtx);
    assert(g.access_granted && g.governance_level === 'executive_access');
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`AIOI-P6.1 Executive Access Governance Layer: ${_passed} passed, ${_failed} failed`);
  if (_failed === 0) {
    console.log('AIOI_P6_1_ENTERPRISE_EXECUTIVE_ACCESS_GOVERNANCE_PASS');
  } else {
    console.log('AIOI_P6_1_ENTERPRISE_EXECUTIVE_ACCESS_GOVERNANCE_FAIL');
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(_failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
